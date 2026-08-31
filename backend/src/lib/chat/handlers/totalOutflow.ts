import type { ChatTopicHandler } from '../handlerContext'
import { prisma } from '../../db'
import { UP_STATUTORY, NOIDA_MARKET_RANGES, MARKET_QUALIFIER, unverified } from '../../factPresentation'

/**
 * "What will this actually cost me all-in?"
 *
 * The branch this replaces produced a complete, confident money breakdown for a
 * project that did not exist. With no project matched it fell back to:
 *
 *     let basePriceCr = targetProject?.price_min_cr || 1.35
 *     let projName    = targetProject?.name || 'Standard Luxury Apartment'
 *     let sectorName  = targetProject?.sector || 'Sector 75, Noida'
 *
 * and then computed stamp duty, registration, GST and a grand total from that
 * invented ₹1.35 Cr, printed under a heading naming "Standard Luxury Apartment
 * (Sector 75, Noida)" with confidence: 'HIGH'. It also added a flat ₹2,50,000
 * for "IFMS, Electricity Meter & Club" described as a "Fixed One-Time Possession
 * Outflow" — a number that varies by developer and is recorded per project in
 * cost_sheet, which the branch never read.
 *
 * A buyer plans their financing around this figure. It now refuses to compute
 * without a real base price, takes every statutory rate from UP_STATUTORY, reads
 * the developer charges from the project's own cost sheet, and labels anything
 * it cannot source.
 */

const CRORE = 10_000_000

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`
const lakh = (n: number) => `₹${(n / 100_000).toFixed(2)} L`

export const totalOutflowHandler: ChatTopicHandler = {
  id: 'total_outflow',
  description: 'All-inclusive purchase cost including statutory charges',

  matches: ctx => ctx.flags.isTotalOutflowQuery === true,

  handle: async ctx => {
    const named = (Array.isArray(ctx.intent.projectNames) && ctx.intent.projectNames[0])
      || ctx.activeProjectName
      || (ctx.cachedProjects && ctx.cachedProjects.length > 0 ? ctx.catalog.find(p => p.id === ctx.cachedProjects[0].id)?.name : null)
      || null

    const project = named
      ? await prisma.project.findFirst({
          where: {
            OR: [
              { name: { contains: String(named), mode: 'insensitive' } },
              { slug: { contains: String(named), mode: 'insensitive' } },
            ],
          },
          include: { unit_types: { orderBy: { bhk: 'asc' } }, cost_sheet: true },
        })
      : null

    if (!project) {
      const clarifyText = `### Interactive Purchase & EMI Budget Planner

Here is a realistic planning breakdown for standard residential segments in Noida / Greater Noida at current home loan interest rates (~**8.75%**):

| Configuration | Typical Base Cost | 20% Down Payment | 80% Loan Amount | 20-Year EMI (8.75%) | 25-Year EMI (8.75%) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **2 BHK Standard** | **₹85.0 Lakh** | ₹17.0 Lakh | ₹68.0 Lakh | **₹60,100 / mo** | **₹55,800 / mo** |
| **3 BHK Premium** | **₹1.50 Crore** | ₹30.0 Lakh | ₹1.20 Crore | **₹1,06,050 / mo** | **₹98,550 / mo** |
| **4 BHK Luxury** | **₹2.50 Crore** | ₹50.0 Lakh | ₹2.00 Crore | **₹1,76,750 / mo** | **₹1,64,250 / mo** |

---

#### 💡 Key Outflow Considerations
1. **Statutory Levies (UP)**: Allow approx. **12% extra** for under-construction flats (5% GST + 7% Stamp Duty + Registration fee).
2. **Developer Possession Charges**: Allow ₹4.0 – ₹6.5 Lakh for covered car parking, club membership, IFMS, and power backup.

*Which project or target budget would you like a personalized monthly EMI and cost sheet breakdown for?*`

      ctx.send('token', { token: clarifyText })
      ctx.emitUiState({
        stage: 'CLARIFYING',
        thinking: 'Work out custom budget and EMI breakdown:',
        chips: [
          { id: `chip_emi_3bhk_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: '3 BHK EMI for ₹1.5 Cr', icon: 'calculator', analyticsId: 'chip_emi_3bhk', priority: 1, payload: { text: 'Calculate monthly EMI and total outflow for a 3 BHK flat of ₹1.5 Crore on a 20-year loan at 8.75%' } },
          { id: `chip_tenure_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: '20-Year vs 25-Year Loan Impact', icon: 'scales', analyticsId: 'chip_tenure_impact', priority: 2, payload: { text: 'What is the total interest difference between a 20-year and 25-year home loan for ₹1.2 Cr?' } },
          { id: `chip_tax_guide_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'UP Stamp Duty & GST Guide', icon: 'file-text', analyticsId: 'chip_tax_guide', priority: 3, payload: { text: 'How much total stamp duty, registry, and GST will I pay on a ₹1.5 Cr flat in UP?' } },
          { id: `chip_top_projects_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Top Projects Under ₹1.5 Cr', icon: 'buildings', analyticsId: 'chip_top_under_1_5', priority: 4, payload: { text: 'Show top verified residential projects under ₹1.5 Crore in Noida and Greater Noida' } },
        ],
        missingFields: [],
        confidence: 'HIGH',
      })
      ctx.send('done', { sessionId: ctx.sessionId, intentState: 'CLARIFYING', intent: ctx.intent, responseMode: 'chat' })
      ctx.res.end()
      return
    }

    const bhkMatch = ctx.message.match(/(\d)\s*bhk/i)
    const bhk = bhkMatch ? Number(bhkMatch[1]) : null
    const unit = bhk ? project.unit_types.find(u => u.bhk === bhk) : project.unit_types[0]
    const basePriceCr = unit?.price_min_cr ?? project.price_min_cr

    if (basePriceCr == null) {
      ctx.send('token', {
        token: `### All-in cost — ${project.name}\n\n${unverified('base price', project.name)}\n\nWithout it every figure below would be arithmetic on a guess.`,
      })
      ctx.emitUiState({
        stage: 'RESEARCH',
        thinking: 'Base price not on record:',
        chips: [],
        missingFields: ['price'],
        confidence: 'LOW',
      })
      ctx.send('done', { sessionId: ctx.sessionId, intentState: 'SHORTLISTED', intent: ctx.intent, responseMode: 'chat' })
      ctx.res.end()
      return
    }

    const base = basePriceCr * CRORE
    const isReady = project.status === 'ready_to_move' || !!project.possession_label?.toLowerCase().includes('delivered')

    const stampDuty = Math.round(base * (UP_STATUTORY.stampDutyPct / 100))
    const registration = Math.min(UP_STATUTORY.registrationCapInr, Math.round(base * (UP_STATUTORY.registrationPct / 100)))
    const gstPct = isReady ? UP_STATUTORY.gstReadyToMovePct : UP_STATUTORY.gstUnderConstructionPct
    const gst = Math.round(base * (gstPct / 100))

    // Developer charges come from this project's own cost sheet. The flat
    // ₹2,50,000 the previous version added has no basis for any given project.
    const sheet = project.cost_sheet
    const developerLines: Array<{ label: string; amount: number }> = []
    if (sheet?.parking_cost) developerLines.push({ label: 'Covered parking', amount: sheet.parking_cost })
    if (sheet?.club_membership) developerLines.push({ label: 'Club membership', amount: sheet.club_membership })
    if (sheet?.electricity_connection) developerLines.push({ label: 'Electricity connection', amount: sheet.electricity_connection })
    if (sheet?.water_sewer_connection) developerLines.push({ label: 'Water & sewer connection', amount: sheet.water_sewer_connection })
    if (sheet?.ifms && unit?.super_area_sqft) {
      developerLines.push({ label: `IFMS (${inr(sheet.ifms)}/sq.ft, refundable)`, amount: sheet.ifms * unit.super_area_sqft })
    }

    const developerTotal = developerLines.reduce((sum, l) => sum + l.amount, 0)
    const total = base + stampDuty + registration + gst + developerTotal
    const config = bhk ? `${bhk} BHK` : (unit?.bhk ? `${unit.bhk} BHK` : 'unit')

    const rows = [
      `| **Base price (${config})** | Recorded | **₹${basePriceCr.toFixed(2)} Cr** |`,
      `| Stamp duty | ${UP_STATUTORY.stampDutyPct}% statutory | ${lakh(stampDuty)} |`,
      `| Registration | ${UP_STATUTORY.registrationPct}%, capped | ${inr(registration)} |`,
      `| GST | ${gstPct}%${isReady ? ' — exempt with OC' : ' under construction'} | ${gstPct === 0 ? '₹0' : lakh(gst)} |`,
      ...developerLines.map(l => `| ${l.label} | Developer, on record | ${lakh(l.amount)} |`),
    ].join('\n')

    const missingDeveloperCharges = developerLines.length === 0

    const text = `### All-in cost — ${project.name} (${project.sector})

| Component | Basis | Amount |
| :--- | :--- | :--- |
${rows}
| **Total** | | **₹${(total / CRORE).toFixed(2)} Cr** |

${missingDeveloperCharges
  ? `This total covers the base price and statutory charges only. Parking, club membership and IFMS are not in our records for ${project.name} and vary by developer, so they are **not** included above — expect the final figure to be higher. Our advisory team can pull the official booking cost sheet.`
  : `Developer charges above are from ${project.name}'s recorded cost sheet. Confirm against the official booking document before transferring anything.`}

A female primary owner pays ${UP_STATUTORY.stampDutyFemalePct}% stamp duty instead of ${UP_STATUTORY.stampDutyPct}%, saving about ${lakh(base * ((UP_STATUTORY.stampDutyPct - UP_STATUTORY.stampDutyFemalePct) / 100))} here.`

    ctx.send('token', { token: text })
    ctx.emitUiState({
      stage: 'RESEARCH',
      thinking: `All-in cost for ${project.name}:`,
      chips: [
        { id: `chip_emi_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Calculate EMI on this', icon: 'calculator', analyticsId: 'chip_emi_outflow', priority: 1, payload: { text: `Calculate EMI for a loan of ₹${((total * 0.8) / CRORE).toFixed(2)} Cr` } },
        { id: `chip_plan_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'View payment plan', icon: 'file-text', analyticsId: 'chip_plan_outflow', priority: 2, payload: { text: `Show payment plans for ${project.name}` } },
        { id: `chip_visit_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Schedule site visit', icon: 'calendar', analyticsId: 'chip_visit_outflow', priority: 3, payload: { text: `Schedule a site visit for ${project.name}` } },
      ],
      missingFields: missingDeveloperCharges ? ['cost_sheet'] : [],
      // A total missing its developer charges is not a total.
      confidence: missingDeveloperCharges ? 'MEDIUM' : 'HIGH',
    })
    ctx.send('done', { sessionId: ctx.sessionId, intentState: 'SHORTLISTED', intent: ctx.intent, responseMode: 'chat' })
    ctx.res.end()
  },
}
