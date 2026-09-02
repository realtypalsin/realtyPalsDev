// backend/src/lib/ai/prompts/playbooks.ts
//
// The six advisory playbooks, selected rather than all sent.
//
// They lived inline in `base.ts` and every turn carried all of them: 5,569
// characters of which at most one applies. A yield-investor's asset-class
// comparison is noise for a first-time buyer stretching a budget, and the
// luxury hierarchy is noise for both.
//
// That matters because time-to-first-token tracks input size. Measured on a
// six-project Sector 150 search: 72,009 characters of prompt produced its first
// token after 11,093ms on gemini-3.6-flash while emitting 262 characters of
// answer. The same prompt on the lite model with no thinking answered in
// 3,422ms. Input is where discovery latency lives, and this is the largest
// block in `base.ts` that is knowably irrelevant most of the time.
//
// Selection is regex over the message plus the intent the router already
// resolved — no extra model call, and a miss falls back to sending the two that
// suit an unclassified buyer rather than none.

import type { Intent } from '../../discovery/types'

export type PlaybookId = 'relocation' | 'firstTime' | 'yield' | 'nri' | 'luxury' | 'pricing'

interface Playbook {
  /** Fires when the buyer's words or resolved intent match. */
  matches: (message: string, intent?: Partial<Intent>) => boolean
  text: string
}

const PLAYBOOKS: Record<PlaybookId, Playbook> = {
  relocation: {
    matches: (m, i) =>
      // `relocat\w*` because `\brelocat\b` never matches "relocating", which is
      // how people write it — the same miss `\brefund\b` made on "refunded".
      /\b(relocat\w*|moving to|new to (the )?(city|noida)|shifting to|which (areas?|sectors?|part)\b|where should i (live|buy|look)|good areas?|best (area|locality|micro))\b/i.test(m) ||
      i?.journeyStage === 'relocation',
    text: `### RELOCATION & AREA DISCOVERY PLAYBOOK
When the user is relocating, new to the city, or asking for good areas to live in:
- **Step 1 (Orientation)**: Outline the 3 core micro-market hubs concisely (Noida Expressway for low-density green living & IT parks; Central Noida 7X for established family life, top schools & metro; Greater Noida West for maximum space per Rupee).
- **Step 2 (Progressive Inquire)**: Ask: *"Where is your primary daily commute (e.g. South Delhi, Gurgaon, Expressway IT hubs, or WFH), and what is your family's top lifestyle priority (school proximity, low-density green living, or immediate ready-to-move peace of mind)?"*`,
  },

  firstTime: {
    matches: (m, i) =>
      /\b(first[- ]time|first home|rent vs buy|rent or buy|should i (buy|rent)|young family|stretch(ing)? (my|the)? ?budget|afford)\b/i.test(m) ||
      i?.riskProfile === 'first_time_buyer' ||
      i?.journeyStage === 'first_time_buyer',
    text: `### YOUNG FAMILY & FIRST-TIME PURCHASER PLAYBOOK
When a young buyer or family is stretching budget or asking about rent vs buy:
- **Challenge parameters mathematically**: Show the space-to-budget reality using the rates in the verified block you were given — a budget at one sector's rate buys a smaller unit than the same budget one sector over, and naming both rates makes the trade-off concrete. Use only rates present in your context. If none were injected you do not hold them this turn — describe the trade-off in words and offer to look at named projects, rather than supplying a rate from memory.
- **Ground-level livability**: Highlight municipal water (e.g. 40 MLD Ganga water pipeline in Sector 76 vs groundwater TDS reaching 3,000 ppm) and daily OpEx (maintenance ₹4–6/sqft, PVVNL grid @ ₹6.00/unit vs DG backup @ ₹17.00/unit).`,
  },

  yield: {
    matches: (m, i) =>
      /\b(rental yield|yield|roi|rental income|return on investment|pre[- ]leased|commercial|appreciation|capital gains?)\b/i.test(m) ||
      i?.purpose === 'investment' ||
      i?.journeyStage === 'yield_investor',
    text: `### YIELD INVESTOR PLAYBOOK
When an investor seeks rental income or ROI:
- **Asset class comparison**: Compare residential rental yields (2.5%–3.5%) against commercial pre-leased high-street retail (6%–8%).
- **Macro Catalysts**: Reference UP FAR policy reforms (up to 4.0 FAR, no ground coverage cap) and Jewar International Airport commercial flight operations (commencing 2026).
- **Taxation & Costs**: Note commercial stamp duty (7% male + 1% registry), commercial circle rates (up to ₹2,50,000/sqm), and 18% GST on under-construction commercial.`,
  },

  nri: {
    matches: (m, i) =>
      /\b(nri|overseas|abroad|from (dubai|singapore|usa|uk|canada|australia)|remote(ly)? (buy|purchase|register)|fema|repatriat|power of attorney|fraud protection|is it safe to buy)\b/i.test(m) ||
      i?.riskProfile === 'nri' ||
      i?.journeyStage === 'nri_investor',
    text: `### OVERSEAS / NRI CAPITAL ALLOCATOR PLAYBOOK
When an NRI or buyer asks about safety, delays, or fraud protection:
- **Regulatory Security**: Highlight UP RERA Form-7 mandatory CA audits (ensuring 70% of all buyer funds remain locked in escrow for construction).
- **Title & Price Protection**: Explain the mandatory Tripartite Sale Agreement executed with the Authority at 10% booking to prevent double-allotment and price escalation.
- **Remote Mechanics**: Explain Special Power of Attorney (SPA) protocol for remote registration.`,
  },

  luxury: {
    matches: (m, i) =>
      /\b(richest|wealthy|wealthiest|affluent|posh|poshest|elite|upscale|prestigious|billionaire|industrialist|cxo|ceo|ultra[- ]luxury|luxury|mansion|penthouse|villa|bungalow|sky ?mansion)\b/i.test(m) ||
      (typeof i?.budgetMin === 'number' && i.budgetMin >= 5) ||
      (typeof i?.budgetMax === 'number' && i.budgetMax >= 6),
    text: `### NOIDA LUXURY & WEALTH RESIDENTIAL HIERARCHY
When asked where the richest people, industrialists, or CXOs live in Noida, or regarding the most prestigious, upscale, or expensive neighborhoods in Noida, ALWAYS structure the answer across BOTH core wealth archetypes:

1. **Legacy Plotted Bungalow Enclaves (Generational, Industrialist & Bureaucratic Wealth)**:
   - **Sector 15A**: Widely recognized as the "Lutyens of Noida" or "Billionaires' Row". Characterized by sprawling 500–1,000+ sqm independent mansions, extreme security, quiet tree-lined avenues, and immediate DND proximity to South/Central Delhi. Home to legacy industrialists, senior judges, advocates, and business leaders.
   - **Sector 14 & Sector 44**: Ultra-prime plotted residential sectors commanding Noida's highest per-sq.yd land valuations, favored by high-net-worth business families.
   - **Sector 26 & Sector 47**: Established posh plotted residential neighborhoods known for high privacy, green density, and independent villas.

2. **Modern High-Rise Luxury Hubs & Golf Townships (Corporate CXO, Tech Founder & NRI Wealth)**:
   - **Sector 128 (Jaypee Greens Wish Town)**: Integrated golf township featuring custom golf-facing villas, private estates, and luxury penthouses. Preferred by corporate CEOs and modern wealth. Quote its rate only from the verified block or a named project's own rows.
   - **Sector 94 (Expressway Gateway)**: Super-tall luxury towers with 6,000–10,000 sq.ft sky mansions (e.g. ATS Knightsbridge, Supertech Supernova penthouses) right on the Delhi-Noida border.
   - **Sector 150**: Low-density green sports city corridor with 80% green buffers and branded luxury developments.
   - **Sector 93A & 93B**: Established secure luxury gated communities (ATS Greens Village, Eldeco Utopia).`,
  },

  pricing: {
    matches: (m, i) =>
      /\b(too much|worth it|price viability|what can i get|rates? in|compare rates|per sq\.?\s?ft|psf|circle rate|overpriced|value for money|fair price)\b/i.test(m) ||
      i?.journeyStage === 'market_evaluator',
    text: `### MARKET EVALUATOR, PRICING & BUDGET FEASIBILITY PLAYBOOK
When a user asks about price viability (e.g. "Is 2 crore too much for a 3 BHK in Noida?", "What can I get in ₹1.5 Cr?", "Compare rates in Sector 75 vs 150"):
- **Direct Verdict First**: Give an immediate, clear fiduciary answer in 1–2 sentences, then justify it.
- **Every figure comes from the rows you were given.** A verified micro-market
  block is injected above when the question is about rates or places; quote it.
  When it is absent, you do not hold market rates for this turn — say so and
  offer to look at named projects instead. Never supply a rate from memory.
- **Key Valuation Checklist**: 2–3 sharp bullets after the verdict:
  - **RERA Usable Carpet Area**: price per sq.ft of net usable carpet, not super built-up.
  - **GST & Possession**: under-construction attracts 5% GST; ready-to-move with OC carries 0%.
  - **Builder Score**: delivery record and UP-RERA escrow compliance before committing.`,
  },
}

/** At most this many, so a message hitting four does not undo the saving. */
const MAX_PLAYBOOKS = 2

/**
 * The playbooks worth sending this turn.
 *
 * Returns '' when none match and the turn carries no buyer signal — an early
 * "hi" needs no advisory framework, and sending six is how the block became the
 * largest avoidable thing in the prompt.
 */
export function selectPlaybooks(message: string, intent?: Partial<Intent>): string {
  const m = message ?? ''
  const hits = (Object.keys(PLAYBOOKS) as PlaybookId[]).filter(id => {
    try {
      return PLAYBOOKS[id].matches(m, intent)
    } catch {
      return false
    }
  })

  if (hits.length === 0) return ''

  const chosen = hits.slice(0, MAX_PLAYBOOKS).map(id => PLAYBOOKS[id].text)
  return [
    '',
    '---',
    '',
    '## CONSULTATIVE ADVISORY PLAYBOOK',
    '',
    'This buyer matches the framework below. Apply it.',
    '',
    ...chosen,
  ].join('\n')
}

/** Exposed for the test that pins which situations select which framework. */
export const PLAYBOOK_IDS = Object.keys(PLAYBOOKS) as PlaybookId[]
export function matchedPlaybooks(message: string, intent?: Partial<Intent>): PlaybookId[] {
  return (Object.keys(PLAYBOOKS) as PlaybookId[])
    .filter(id => PLAYBOOKS[id].matches(message ?? '', intent))
    .slice(0, MAX_PLAYBOOKS)
}
