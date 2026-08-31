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
      ['trust', mk('topic_risk_clean', 'Which of these are clean?', 'Which projects do you hold with zero recorded litigation and a RERA registration you can show me?')],
      ['place', mk('topic_risk_coverage', sector ? `What do you cover near ${sector}?` : 'Which areas do you cover?', sector ? `Which sectors near ${sector} do you actually hold projects in?` : `Which sectors do you actually hold projects in?`)],
      ['ask', mk('topic_risk_method', 'How do you assess that?', 'How do you decide a project is risky — which fields is that judgement built from, and which of them are measured rather than assumed?')],
    ],
  },
  {
    name: 'connectivity',
    test: /\b(metro|aqua\s*line|blue\s*line|expressway|connectivity|commute|airport|jewar|igi|travel\s+time|how\s+far)\b/i,
    build: ({ sector }) => [
      ['place', mk('topic_conn_near_metro', 'Projects nearest a metro', 'Which projects do you hold that are closest to a working metro station, and how far is each one?')],
      ['compare', mk('topic_conn_airport', 'Distance to both airports', 'For the projects you just mentioned, how far is Jewar and how far is Delhi IGI — and say which one you are measuring.')],
      ['money', mk('topic_conn_price', sector ? `Does ${sector} cost more for it?` : 'Do the connected sectors cost more?', sector ? `Does ${sector} carry a price premium for its connectivity compared with the sectors around it?` : 'Which of the sectors you cover charge a premium for metro access, and how much?')],
    ],
  },
  {
    name: 'entity-brokerage',
    test: /\b(broker|brokerage|channel\s+partner|agent|consultan|clinic|realtor|investors?\s+clinic|wealth\s+clinic|firm|compan(?:y|ies)|legit|trustworthy|scam|reviews?|complaints?)\b/i,
    build: () => [
      ['trust', mk('topic_entity_builders', 'Which builders do you verify?', 'Which builders do you hold verified records for, and what exactly is verified about them?')],
      ['ask', mk('topic_entity_questions', 'What should I ask them?', 'What should I ask a broker or channel partner before I pay them anything, and what answers should make me walk away?')],
      ['money', mk('topic_entity_fees', 'What do fees normally look like?', 'What does a buyer normally pay in brokerage and other charges on a new-build purchase in this market?')],
    ],
  },
  {
    name: 'meta-memory',
    test: /\b(what\s+(?:do|have)\s+(?:you|i)|about\s+me|assum(?:e|ing|ption)|remember|told\s+you|so\s+far|my\s+(?:profile|preferences|requirements|budget|criteria))\b/i,
    build: ({ hasBudget }) => [
      ['ask', hasBudget
        ? mk('topic_meta_change_budget', 'Change my budget', 'Change my budget — I want to look at a different range.')
        : mk('topic_meta_set_budget', 'Set my budget', 'My budget is around 1.5 crore.')],
      ['trust', mk('topic_meta_gaps', "What don't you know?", 'What are you still missing about me that would change what you recommend?')],
      ['compare', mk('topic_meta_recommend', 'Recommend on what you have', 'Based on everything I have told you so far, recommend projects and say which of my requirements each one fails.')],
    ],
  },
  {
    name: 'sector-profile',
    test: /\b(posh|rich|richest|wealthy|affluent|upscale|cheapest|cheap|affordable\s+sector|best\s+sector|which\s+sector|posh\s+sector|posh\s+neighborhood|middle[- ]class|family\s+sector|safe\s+sector|liveab)\b/i,
    build: ({ sector, city }) => [
      ['place', mk('topic_sector_inventory', sector ? `What's for sale in ${sector}` : `Where do you actually hold stock?`, sector ? `Show me the projects you hold in ${sector} with prices and possession dates.` : `Which sectors in ${city} do you hold the most projects in, and what do they cost?`)],
      ['money', mk('topic_sector_cheapest', 'Cheapest sector you cover', 'Which of the sectors you cover has the lowest price per square foot, and what is the trade-off for buying there?')],
      ['compare', mk('topic_sector_compare', 'Compare two sectors', 'Compare the two sectors you just mentioned on price, connectivity and what kind of buyer each suits.')],
    ],
  },
  {
    name: 'coverage-gap',
    test: /\b(gurgaon|gurugram|delhi|dwarka|faridabad|ghaziabad|bangalore|bengaluru|mumbai|pune|hyderabad|chennai|resale|rent(?:al)?\s+(?:a|an|home|flat|house)|plot|commercial|office|shop)\b/i,
    build: ({ city }) => [
      ['place', mk('topic_gap_coverage', 'What do you cover?', `Exactly which cities, sectors and property types do you cover, and what are you not able to help with?`)],
      ['compare', mk('topic_gap_alternative', `Show me ${city} instead`, `Show me what you do hold in ${city} that comes closest to what I asked about.`)],
    ],
  },
]

/**
 * The two chips that are honest after any answer at all.
 *
 * The floor, not the ambition. They exist because a row of one chip reads as the
 * product having run out of ideas, and because a floor asserted in a rubric that
 * nothing enforces is not a floor. Both of these are answerable from our own
 * rows on every turn, so neither can become a promise we cannot keep.
 */
function floorChips(city: string): Array<[Axis, ChipAction]> {
  return [
    ['place', mk('floor_coverage', 'What do you cover?', `Which sectors in ${city} do you hold projects in, and how many in each?`, 5)],
    ['ask', mk('floor_reasoning', 'How do you decide?', 'How do you decide what to recommend to me — what do you rank on, and what do you refuse to guess at?', 5)],
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
