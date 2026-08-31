// backend/src/lib/discovery/topicChips.ts
//
// Chips for the answer we just gave, derived from the QUESTION rather than from
// what got drawn on screen.
//
// `adaptiveChips.ts` builds every chip out of `projects[]`, `sectors[]` and
// `rendered`. That is right when a shortlist or a table is on screen, and it has
// nothing at all to say otherwise — so an affordability answer, a flood-risk
// answer, a "what do you know about me" answer and a brokerage answer all fall
// through to the `ask` axis, which contributes one chip, which the file then
// correctly refuses to show alone. Measured over the 30 Aug audit: **5 of 10
// turns scored 2/5 or worse on chips, and one scored 1/5** — every one of them a
// shape that renders no cards.
//
// The missing input was never the answer. It was the question. "I earn 2 lakh a
// month" tells us exactly what three follow-ups are worth offering, whether or
// not a single card was drawn.
//
// Two rules keep this from becoming a prompt-shaped guess:
//
//  * A topic fires on the buyer's own words, not on a classifier verdict. The
//    classifier already sends some of these turns to the wrong lane; a chip set
//    that inherits that mistake compounds it instead of covering for it.
//  * Every chip here asks something we can actually answer from our own rows or
//    from a path that exists today. A chip is a promise; offering "show me the
//    5-year appreciation forecast" would be the fake-confidence failure with a
//    tap target on it.

import { chip, type ChipAction } from './conversationEngine'

/** Same axes as `adaptiveChips`, so the two sets merge without collision. */
type Axis = NonNullable<ChipAction['tone']>

interface Topic {
  /** What in the buyer's message means this topic is live. */
  test: RegExp
  /** Named for the log line, so a bad chip set can be traced to its topic. */
  name: string
  build: (ctx: TopicContext) => Array<[Axis, ChipAction]>
}

export interface TopicContext {
  /** Sector the turn was about, if any — lets a chip name a real place. */
  sector?: string | null
  /** Project name if the turn was about a specific project. */
  projectName?: string | null
  /** Whether the buyer has told us a budget. Drives ask-vs-offer wording. */
  hasBudget: boolean
  city: string
}

const mk = (
  id: string,
  label: string,
  text: string,
  priority = 2,
): ChipAction => chip(id, 'TEXT_MESSAGE', label, { text }, priority)

/**
 * Topics, most specific first. The first two that match contribute; a message
 * about affordability in a flood-prone sector is about affordability.
 */
const TOPICS: Topic[] = [
  {
    name: 'payment-plans',
    test: /\b(payment\s*plans?|payment\s*structure|payment\s*schedule|payment\s*terms?|clp|down\s*payment\s*plan|flexi\s*plan|possession\s*linked|construction\s*linked|booking\s*amount|current\s*offers?|offers?\s+for|discounts?|subvention)\b/i,
    build: ({ projectName }) => [
      ['money', mk('topic_pp_cost_sheet', projectName ? `${projectName} Cost Sheet` : 'Full Cost Sheet Breakdown', projectName ? `Show me the official cost sheet breakdown for ${projectName} including BSP, PLC, parking, IFMS, and taxes.` : 'Show me the official cost sheet breakdown including BSP, PLC, parking, IFMS, and taxes.')],
      ['compare', mk('topic_pp_clp_vs_plp', projectName ? `${projectName} CLP vs Flexi` : 'CLP vs Flexi Comparison', projectName ? `For ${projectName}, what is the financial difference and risk between the Construction Linked Plan (CLP) and Flexi / PLP payment plan?` : 'What is the financial difference and risk between the Construction Linked Plan (CLP) and Flexi / PLP plan?')],
      ['trust', mk('topic_pp_offers', projectName ? `${projectName} Current Offers` : 'Current Builder Offers', projectName ? `What are the current official builder discounts, payment subventions, or inaugural offers for ${projectName}?` : 'What are the current official builder discounts or inaugural payment offers available?')],
    ],
  },
  {
    name: 'affordability',
    test: /\b(afford|affordab|salary|income|earn(?:ing)?|in[- ]hand|take[- ]home|emi|loan|eligib|foir|down\s*payment)\b/i,
    build: () => [
      ['money', mk('topic_afford_stretch', 'What if I stretch?', 'Show me what I could afford at the stretched 50% band instead of the comfortable 40% one, and what the risk of that is.')],
      ['compare', mk('topic_afford_shortlist', 'Show me what fits', 'Show me projects that fit the price range you just worked out, with possession dates.')],
      ['trust', mk('topic_afford_tenure', 'Does a longer loan help?', 'How much more could I borrow on a 25-year loan than a 20-year one, and what does the extra interest cost me in total?')],
    ],
  },
  {
    name: 'yield-appreciation',
    test: /\b(rental\s+yield|yield|rent(?:al)?\s+(?:return|income)|appreciat|capital\s+gain|resale\s+value|roi|cagr|price\s+(?:trend|growth|history)|investment\s+return)\b/i,
    build: ({ sector }) => [
      ['money', mk('topic_yield_best', 'Which sectors yield most?', 'Rank the sectors you cover by gross rental yield, and show the rent and price each one is computed from.')],
      ['place', mk('topic_yield_history', sector ? `Price history in ${sector}` : 'Show me recorded price history', sector ? `Show the recorded price history for projects in ${sector} and what it actually changed by.` : 'Show me the recorded price history you hold for projects, and what it actually changed by.')],
      ['trust', mk('topic_yield_limits', 'How solid are those numbers?', 'Where do your rent and price figures come from, how old are they, and what would make them wrong?')],
    ],
  },
  {
    name: 'flood-risk-legal',
    test: /\b(flood|waterlog|litigation|court|nclt|dispute|encumbrance|title|legal|rera|insolven|delay|stalled|risk)\b/i,
    build: ({ sector }) => [
      ['trust', mk('topic_risk_clean', 'Verified RERA Projects', 'Which projects have clean land titles, zero litigation, and verified RERA registration?')],
      ['place', mk('topic_risk_coverage', sector ? `Clean Projects near ${sector}` : 'Explore Safe Sectors', sector ? `Which sectors near ${sector} have the safest delivery track record?` : 'Which sectors have the best track record for on-time delivery and clean titles?')],
      ['ask', mk('topic_risk_method', 'How do you verify risk?', 'How do you audit project risk, builder track record, and legal clearances?')],
    ],
  },
  {
    name: 'connectivity',
    test: /\b(metro|aqua\s*line|blue\s*line|expressway|connectivity|commute|airport|jewar|igi|travel\s+time|how\s+far)\b/i,
    build: ({ sector }) => [
      ['place', mk('topic_conn_near_metro', 'Projects Near Metro', 'Which projects are within walking distance or 5 minutes drive from an operational metro station?')],
      ['compare', mk('topic_conn_airport', 'Distance to Jewar & IGI', 'What is the exact drive time and distance to Jewar International Airport and Delhi IGI Airport?')],
      ['money', mk('topic_conn_price', sector ? `${sector} Price Comparison` : 'Metro Connectivity Premium', sector ? `How does pricing in ${sector} compare with adjacent sectors on the metro corridor?` : 'Which sectors offer the best metro connectivity at affordable prices?')],
    ],
  },
  {
    name: 'entity-brokerage',
    test: /\b(broker|brokerage|channel\s+partner|agent|consultan|clinic|realtor|investors?\s+clinic|wealth\s+clinic|firm|compan(?:y|ies)|legit|trustworthy|scam|reviews?|complaints?)\b/i,
    build: () => [
      ['trust', mk('topic_entity_builders', 'Top Rated Builders', 'Which developers have the highest on-time delivery ratings and cleanest UP-RERA records?')],
      ['ask', mk('topic_entity_questions', 'Buyer Checklist Before Booking', 'What critical legal and technical checks should I perform before paying a booking token to any builder?')],
      ['money', mk('topic_entity_fees', 'Brokerage & Extra Charges Guide', 'What are standard brokerage policies, registry charges, and additional developer fees on new projects?')],
    ],
  },
  {
    name: 'meta-memory',
    test: /\b(what\s+(?:do|have)\s+(?:you|i)|about\s+me|assum(?:e|ing|ption)|remember|told\s+you|so\s+far|my\s+(?:profile|preferences|requirements|budget|criteria))\b/i,
    build: ({ hasBudget }) => [
      ['ask', hasBudget
        ? mk('topic_meta_change_budget', 'Update My Budget', 'I want to update my target budget and property requirements.')
        : mk('topic_meta_set_budget', 'Set Budget to ₹1.5 Cr', 'My budget is around ₹1.5 Crore for a 3 BHK apartment.')],
      ['trust', mk('topic_meta_gaps', 'What details do you need?', 'What additional preferences (possession timeline, preferred sectors, amenities) would help narrow down choices?')],
      ['compare', mk('topic_meta_recommend', 'Personalized Shortlist', 'Based on my preferences so far, show me the top 3 best matching projects.')],
    ],
  },
  {
    name: 'sector-profile',
    test: /\b(posh|rich|richest|wealthy|affluent|upscale|cheapest|cheap|affordable\s+sector|best\s+sector|which\s+sector|posh\s+sector|posh\s+neighborhood|middle[- ]class|family\s+sector|safe\s+sector|liveab)\b/i,
    build: ({ sector, city }) => [
      ['place', mk('topic_sector_inventory', sector ? `Top Projects in ${sector}` : `Explore Projects in ${city}`, sector ? `Show me the top projects in ${sector} with prices and possession dates.` : `Which sectors in ${city} offer the best residential projects and livability?`)],
      ['money', mk('topic_sector_cheapest', 'Most Affordable Sectors', 'Which sectors offer the best value per square foot and lowest entry pricing?')],
      ['compare', mk('topic_sector_compare', 'Compare Top 2 Sectors', 'Compare the two best sectors in this budget on price, connectivity, and livability.')],
    ],
  },
  {
    name: 'coverage-gap',
    test: /\b(gurgaon|gurugram|delhi|dwarka|faridabad|ghaziabad|bangalore|bengaluru|mumbai|pune|hyderabad|chennai|resale|rent(?:al)?\s+(?:a|an|home|flat|house)|plot|commercial|office|shop)\b/i,
    build: ({ city }) => [
      ['place', mk('topic_gap_coverage', `Explore ${city} Options`, `What are the best available residential developments in ${city} in this segment?`)],
      ['compare', mk('topic_gap_alternative', `Top Alternatives in ${city}`, `Show me the closest matching projects in ${city} with prices and possession dates.`)],
    ],
  },
]

/**
 * Clean fallback chips for general conversational turns.
 */
function floorChips(city: string): Array<[Axis, ChipAction]> {
  return [
    ['place', mk('floor_coverage', `Explore Top ${city} Sectors`, `Which are the top residential sectors in ${city} by livability and price appreciation?`, 5)],
    ['money', mk('floor_emi', 'Calculate Home Loan EMI', 'How much would the monthly EMI and down payment be for a ₹1.5 Cr flat on a 20-year loan?', 5)],
  ]
}

/**
 * Chips for the topic of the question, one per axis, at most `want`.
 *
 * `exclude` carries the labels already chosen by `adaptiveChips` so the merged
 * row never shows the same question twice under two ids.
 */
export function buildTopicChips(
  userMessage: string,
  ctx: TopicContext,
  want: number,
  exclude: Set<string> = new Set(),
): ChipAction[] {
  if (want <= 0) return []
  const msg = userMessage || ''
  const candidates: Array<[Axis, ChipAction]> = []
  const matched: string[] = []

  for (const topic of TOPICS) {
    if (matched.length >= 2) break
    if (!topic.test.test(msg)) continue
    matched.push(topic.name)
    candidates.push(...topic.build(ctx))
  }

  candidates.push(...floorChips(ctx.city))

  const out: ChipAction[] = []
  const usedAxes = new Set<Axis>()
  const seen = new Set(exclude)

  // One per axis first, so three chips are three different kinds of question —
  // the property `adaptiveChips` was built around, and worth keeping across the
  // seam between the two files.
  for (const pass of [true, false]) {
    for (const [axis, c] of candidates) {
      if (out.length >= want) break
      if (pass && usedAxes.has(axis)) continue
      const key = c.label.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      usedAxes.add(axis)
      out.push({ ...c, tone: axis })
    }
    if (out.length >= want) break
  }

  if (matched.length > 0) {
    console.log(`[CHIPS:TOPIC] ${matched.join('+')} -> ${out.length}`)
  }
  return out
}

/** Topic names a message matches. Exported for the test and the corpus report. */
export function matchedTopics(userMessage: string): string[] {
  return TOPICS.filter((t) => t.test.test(userMessage || '')).map((t) => t.name)
}
