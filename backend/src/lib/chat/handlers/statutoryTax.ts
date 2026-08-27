import type { ChatTopicHandler } from '../handlerContext'
import { UP_STATUTORY, NOIDA_MARKET_RANGES, MARKET_QUALIFIER } from '../../factPresentation'

/** ₹ with Indian digit grouping. */
const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`

/** ₹50,00,000 reads better as "₹50 Lakh" in a rate table. */
const lakh = (n: number) => `₹${(n / 100_000).toLocaleString('en-IN')} Lakh`

/**
 * "What stamp duty / registration / GST do I pay in UP?"
 *
 * Every rate here is fixed by law and identical for every project, so this is
 * the one branch that may state figures without a project lookup — the
 * `statutory` tier in lib/factPresentation.ts.
 *
 * The rates were previously typed into the response as literals. They now come
 * from UP_STATUTORY, which is the single documented place to update them when a
 * state budget changes; a table in a route handler is where a stale rate hides.
 * The budgeting percentages are market-typical rather than statutory, so they
 * carry the qualifier.
 */
export const statutoryTaxHandler: ChatTopicHandler = {
  id: 'statutory_tax',
  description: 'UP stamp duty, registration, GST and TDS rates',

  matches: ctx => ctx.flags.isStatutoryTaxQuery === true,

  handle: async ctx => {
    const text = `### Statutory taxes & registration charges (Uttar Pradesh)

These are set by law and are the same for every project.

| Component | Rate | Nature | Paid when & to whom |
| :--- | :--- | :--- | :--- |
| **Stamp duty** | ${UP_STATUTORY.stampDutyPct}% of agreement or circle value, whichever is higher | Mandatory | At registry, to the UP Stamp & Registration Department |
| **Stamp duty — female primary owner** | ${UP_STATUTORY.stampDutyFemalePct}% (concession capped at ${inr(UP_STATUTORY.stampDutyFemaleConcessionCapInr)}) | Concession | At registry |
| **Registration fee** | ${UP_STATUTORY.registrationPct}% of value, capped at ${inr(UP_STATUTORY.registrationCapInr)} | Mandatory | At deed execution, to the Sub-Registrar |
| **GST — under construction** | ${UP_STATUTORY.gstUnderConstructionPct}% (without input tax credit) | Statutory | Billed across construction milestones |
| **GST — ready to move with OC** | ${UP_STATUTORY.gstReadyToMovePct}% | Exempt | Not applicable once the Occupancy Certificate is granted |
| **TDS (Section 194-IA)** | ${UP_STATUTORY.tdsPct}% of sale consideration | Mandatory | Deducted by the buyer when value exceeds ${lakh(UP_STATUTORY.tdsThresholdInr)} (Form 26QB) |

### Budgeting
Allow ${NOIDA_MARKET_RANGES.allInclusiveLoadUnderConstructionPct} for an under-construction home, or ${NOIDA_MARKET_RANGES.allInclusiveLoadReadyToMovePct} for ready-to-move with OC, to cover statutory and possession charges — ${MARKET_QUALIFIER}.

Name a project and I'll use whichever of its own charges we hold verified.`

    const chips = [
      { id: `chip_cost_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'View cost sheet', icon: 'file-text', analyticsId: 'chip_cost', priority: 1, payload: { text: 'Show cost sheet and price breakdown' } },
      { id: `chip_emi_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Calculate monthly EMI', icon: 'calculator', analyticsId: 'chip_emi', priority: 2, payload: { text: 'Calculate EMI' } },
      { id: `chip_rtm_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: `Ready to move (${UP_STATUTORY.gstReadyToMovePct}% GST)`, icon: 'check-circle', analyticsId: 'chip_rtm_tax', priority: 3, payload: { text: 'Show ready to move flats in Noida' } },
    ]

    ctx.send('token', { token: text })
    ctx.emitUiState({
      stage: 'RESEARCH',
      thinking: 'Uttar Pradesh statutory rates:',
      chips,
      missingFields: [],
      // Statutory rates are verified; the budgeting band is market-typical and
      // is labelled as such in the body.
      confidence: 'MEDIUM',
    })
    ctx.send('done', {
      sessionId: ctx.sessionId,
      intentState: 'SHORTLISTED',
      intent: ctx.intent,
      responseMode: 'chat',
    })
    ctx.res.end()
  },
}
