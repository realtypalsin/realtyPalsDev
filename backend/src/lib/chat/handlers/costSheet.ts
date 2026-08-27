import { prisma } from '../../db'
import { executeWithFallbackChain } from '../../ai/fallbackChain'
import { confidenceFor, MARKET_QUALIFIER, NOIDA_MARKET_RANGES, UP_STATUTORY } from '../../factPresentation'
import type { ChatTopicHandler } from '../handlerContext'

/**
 * cost-sheet
 *
 * Lifted verbatim from the inline branch in chat-router.ts; only the router
 * locals were rebound to the handler context. The logic is untouched so the
 * extraction can be verified by comparing output against the previous build.
 */
export const costSheetHandler: ChatTopicHandler = {
  id: 'cost-sheet',
  description: 'All-in cost sheet: base price, charges, statutory dues',

  matches: ctx => ctx.flags.isCostSheetRequest === true,

  handle: async ctx => {
    const matchedTarget = ctx.catalog.find(p => p.name.toLowerCase() === ctx.activeProjectName?.toLowerCase() || p.id === ctx.activeProjectName) ||
      ctx.catalog.find(p => ctx.message.toLowerCase().includes(p.name.toLowerCase()))

    let costProject = null
    if (matchedTarget) {
      costProject = await prisma.project.findUnique({
        where: { id: matchedTarget.id },
        include: { builder: true, cost_sheet: true, unit_types: true }
      })
    }

    if (!costProject) {
      // No specific project was identified, so this is the general "what does
      // buying in Noida cost" question and market-wide ranges are the right
      // answer. The two halves are separated and labelled: statutory rates are
      // fixed by law, developer charges vary and are NOT verified for any
      // particular project. Previously both sat under "Standard Rate" together.
      const clarifyText = `### What buying in Noida costs

**Statutory — fixed by UP law, identical for every project:**

| Component | Rate | Stage | Note |
| :--- | :--- | :--- | :--- |
| **UP Stamp Duty** | ${UP_STATUTORY.stampDutyPct}% of agreement value | At registration | ${UP_STATUTORY.stampDutyFemalePct}% for single/joint women owners |
| **Registration Fee** | ${UP_STATUTORY.registrationPct}% (capped ₹${UP_STATUTORY.registrationCapInr.toLocaleString('en-IN')}) | At registration | Sub-registrar fee |
| **GST** | ${UP_STATUTORY.gstUnderConstructionPct}% (without ITC) | With construction milestones | ${UP_STATUTORY.gstReadyToMovePct}% on ready-to-move with OC |

**Developer charges — ${MARKET_QUALIFIER}.** These vary by developer, so treat them as a planning band, not a quote:

| Component | Typical range | Stage |
| :--- | :--- | :--- |
| **Covered car parking** | ${NOIDA_MARKET_RANGES.coveredParkingInr} | Initial installments |
| **Club membership** | ${NOIDA_MARKET_RANGES.clubMembershipInr} | On possession |
| **IFMS (refundable)** | ${NOIDA_MARKET_RANGES.ifmsPerSqft} | On possession |
| **Power backup & metering** | ${NOIDA_MARKET_RANGES.powerBackupInr} | On possession |

> **Budgeting:** under-construction, allow ${NOIDA_MARKET_RANGES.allInclusiveLoadUnderConstructionPct}; ready-to-move with OC, ${NOIDA_MARKET_RANGES.allInclusiveLoadReadyToMovePct} (no GST).

Name a project and I'll pull whichever of these we hold verified for it.`

      ctx.send('token', { token: clarifyText })
      ctx.emitUiState({
        stage: 'RESEARCH',
        thinking: 'Statutory rates verified; developer charges are market-typical:',
        chips: [
          { id: `chip_tax_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'View UP Stamp Duty & Tax Rates', icon: 'file-text', analyticsId: 'chip_tax_cs', priority: 1, payload: { text: 'How much stamp duty and GST do I pay in UP?' } },
          { id: `chip_rtm_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Show Ready-to-Move (0% GST)', icon: 'check-circle', analyticsId: 'chip_rtm_cs', priority: 2, payload: { text: 'Show ready to move flats in Noida' } },
          { id: `chip_emi_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Calculate Monthly EMI', icon: 'calculator', analyticsId: 'chip_emi_cs', priority: 3, payload: { text: 'Calculate EMI' } }
        ],
        missingFields: [],
        // Statutory half is verified; the developer-charge half is market-tier.
        confidence: confidenceFor(['statutory', 'market'])
      })
      ctx.send('done', { sessionId: ctx.sessionId, intentState: 'SHORTLISTED', intent: ctx.intent, responseMode: 'chat' })
      ctx.res.end()
      return true
    }

    const costFactsJson = JSON.stringify({
      projectName: costProject?.name,
      developer: costProject?.builder?.name,
      bsp_range: costProject?.price_range_label,
      cost_sheet: costProject?.cost_sheet,
      unit_types: costProject?.unit_types.map(u => `${u.bhk} BHK (${u.super_area_sqft} sq ft): ₹${u.price_min_cr}–${u.price_max_cr} Cr`)
    }, null, 2)

    const systemPrompt = `You are RealtyPal, a professional real estate advisor for Noida and Greater Noida.
Verified Pricing & Cost Sheet Facts: ${costFactsJson}

CRITICAL FORMATTING MANDATE:
- Maintain a clean, executive tone. Do NOT use decorative emojis or icons in headings or text.
- Present the price breakdown primarily in a clean, high-contrast Markdown Table based ONLY on available verified facts.
- For statutory taxes, always state 7% UP Stamp Duty, 1% Registration, and 5% GST on under-construction.
- For non-statutory developer charges (parking, club, EDC), state that they are detailed in the project's official booking cost sheet.
- Keep every data point super-summarized, concise, and scannable.

OUTPUT STRUCTURE:

GROUNDING RULE — this overrides the formatting mandate:
Developer charges (parking, club, IFMS, EDC, power backup) may only appear with a
figure if that figure is present in the facts above. If it is absent, write the
row as "In the developer's booking cost sheet" — never a typical range, never an
illustrative number. Statutory rates are the only figures you may state without
support in the data, because they are fixed by UP law.

OUTPUT STRUCTURE:

### Verdict
1-2 direct sentences explaining the all-inclusive pricing structure versus base rate for ${costProject?.name || 'this property'}.

| Parameter | Rate / Amount | Stage | Note |
| :--- | :--- | :--- | :--- |
| (rows built from the facts above, plus the three statutory rates) | | | |

### Recommendation
1 actionable sentence advising buyers to budget roughly 12–14% above BSP for all-inclusive handover.`

    const systemMsgHistory = [{ role: 'user' as const, content: ctx.message }]
    const fallbackResult = await executeWithFallbackChain({
      systemPrompt,
      messages: systemMsgHistory,
      send: ctx.send,
      onToolCall: async () => ({}),
      groqFallbackSuffix: '',
      userMessage: ctx.message,
    })

    const costChips = [
      { id: `chip_plans_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'View Payment Plans', icon: 'file-text', analyticsId: 'chip_plans', priority: 1, payload: { text: 'Show payment plans' } },
      { id: `chip_emi_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Calculate Monthly EMI', icon: 'calculator', analyticsId: 'chip_emi', priority: 2, payload: { text: 'Calculate EMI' } },
      { id: `chip_visit_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Schedule Site Visit', icon: 'calendar', analyticsId: 'chip_site_visit', priority: 3, payload: { text: 'Schedule a site visit' } },
    ]

    ctx.emitUiState({
      stage: 'RESEARCH',
      thinking: `Calculating all-inclusive cost breakdown for ${costProject?.name}:`,
      chips: costChips,
      missingFields: [],
      confidence: 'HIGH'
    })

    ctx.send('done', {
      sessionId: ctx.sessionId,
      intentState: 'SHORTLISTED',
      intent: ctx.intent,
      responseMode: 'chat',
    })
    ctx.res.end()
    return true
  },
}
