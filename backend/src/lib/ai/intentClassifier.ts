/**
 * Classify user intent into categories for routing and handling.
 *
 * SEARCH: User is searching for properties (legacy flow)
 *
 * PROJECT_DETAIL: User asking about a specific project
 *   Examples: "How much EMI for ATS?", "Tell me about Godrej"
 *   Routes to: Query Planner → Project Data Gateway → LLM
 *
 * FACTUAL: Factual queries (what, when, where)
 *   Routes to: Gemini 3.5 Flash Lite (cheap tier)
 *
 * ADVISORY: Reasoning queries (should, why, is this good)
 *   Routes to: Gemini 3.6 Flash (default/smart tier)
 */

import type { Intent } from '../discovery';

export type IntentCategory = 'search' | 'project_detail' | 'factual' | 'advisory';

export type ProjectDetailType = 'payment' | 'investment' | 'location' | 'timeline' | 'builder' | 'overview' | 'general';

export interface ProjectDetailIntent {
  type: 'project_detail'
  detailType: ProjectDetailType
  projectIdentifier?: string // User mentioned project name or reference
  confidence: number // 0-1: how sure are we this is what they're asking
  reason: string
}

export interface IntentClassification {
  category: IntentCategory
  projectDetail?: ProjectDetailIntent
  factualAdvisoryCategory?: 'factual' | 'advisory' // For backward compatibility
}

const FACTUAL_KEYWORDS = new Set([
  'amenities', 'facilities', 'what', 'list', 'price', 'cost', 'possession',
  'possession date', 'timeline', 'handover', 'bhk', 'bedroom', 'square feet',
  'carpet area', 'size', 'compare', 'difference', 'builder', 'developer',
  'nearby', 'distance', 'metro', 'school', 'hospital', 'connectivity',
  'location', 'area', 'sector', 'when', 'dates', 'possession schedule',
  'emi', 'calculator', 'price range', 'how much', 'cost breakdown',
]);

const ADVISORY_KEYWORDS = new Set([
  'should', 'worth', 'good', 'bad', 'concern', 'risk', 'problem', 'issue',
  'avoid', 'recommend', 'advice', 'opinion', 'why', 'reason', 'wait', 'delay',
  'invest', 'investment', 'trust', 'reliable', 'safe', 'reputation', 'complaint',
  'quality', 'decision', 'choose', 'best', 'better', 'vs', 'versus',
  'comparison advice', 'trade-off', 'tradeoff', 'pros', 'cons', 'negative',
  'positive', 'feel',
]);

// Unambiguous requests for a judgement. Plain keyword counting misroutes these:
// "should I invest in Sector 150 at current prices" scores factual 2 ("price",
// "sector") vs advisory 1 ("should") and lands on the cheap lite model — but the
// system prompt allocates 100–250 words of reasoning to exactly this question type.
// Location and price nouns appear in nearly every advisory question, so they must
// not be able to outvote an explicit ask for a recommendation.
const ADVISORY_HARD_SIGNALS = [
  /\bshould i\b/, /\bshould we\b/, /\bis it worth\b/, /\bworth (it|buying|investing)\b/,
  /\bwould you recommend\b/, /\bwhat do you (think|recommend|advise)\b/,
  /\brent vs buy\b/, /\bpros and cons\b/, /\bgood time to (buy|invest)\b/,
  /\bis this a good\b/, /\bany risks?\b/, /\bshould i avoid\b/,
];

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT_DETAIL Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect if user is asking about a specific project detail.
 *
 * Examples:
 *   "How much EMI for ATS?" → project_detail (payment)
 *   "Tell me about Godrej" → project_detail (overview)
 *   "Is Pristine good for investment?" → project_detail (investment)
 */
function detectProjectDetail(userMessage: string, activeProjectName?: string): ProjectDetailIntent | null {
  const msg = userMessage.toLowerCase().trim()

  // Keyword patterns for different detail types
  const paymentKeywords = /\b(emi|loan|cost|price|payment|payments|plan|plans|charge|fee|stamp duty|gst|affordability|mortgage|down payment|flow|flows|cashflow|schedule|milestone|milestones|clp|flexi)\b/i
  const investmentKeywords = /\b(invest|return|yield|appreciation|cagr|roi|bullish|bearish|buy|hold|strong buy|exit|sell|liquidity|resale)\b/i
  const locationKeywords = /\b(address|full address|complete address|location|where|plot|coordinates|pincode|metro|school|hospital|mall|nearby|distance|commute|connectivity|how far|how long)\b/i
  const timelineKeywords = /\b(possession|ready|completion|delivery|delay|when|timeline|move in)\b/i
  const builderKeywords = /\b(builder|developer|track|reputation|credibility|delivery|rera|complaint)\b/i
  const overviewKeywords = /\b(tell me|about|details|configuration|layout|layouts|amenities|features|highlights|floor|floors|top floor|height|tower|towers|units|structure)\b/i

  // Check for project mention (words after "for", "about", "in", "at")
  const projectMention = msg.match(/\b(?:for|about|in|at)\s+([a-z0-9\s]+?)(?:\?|$)/i)
  let projectIdentifier = projectMention ? projectMention[1].trim() : undefined

  // Fallback to implicit references ("this project", "here", or active project context)
  if (!projectIdentifier && (/\b(this project|the project|here|this property|the property)\b/i.test(msg) || activeProjectName)) {
    projectIdentifier = activeProjectName || 'active_project'
  }

  // Detect detail type
  let detailType: ProjectDetailType | null = null
  let confidence = 0
  let reason = ''

  if (paymentKeywords.test(msg)) {
    detailType = 'payment'
    confidence = 0.95
    reason = 'Keywords: EMI, cost, payment plans, flows, charges'
  } else if (investmentKeywords.test(msg)) {
    detailType = 'investment'
    confidence = 0.92
    reason = 'Keywords: investment, returns, appreciation'
  } else if (locationKeywords.test(msg)) {
    detailType = 'location'
    confidence = 0.93
    reason = 'Keywords: location, distance, connectivity'
  } else if (timelineKeywords.test(msg)) {
    detailType = 'timeline'
    confidence = 0.94
    reason = 'Keywords: possession, timeline, delivery'
  } else if (builderKeywords.test(msg)) {
    detailType = 'builder'
    confidence = 0.91
    reason = 'Keywords: builder, track record, reputation'
  } else if (overviewKeywords.test(msg)) {
    detailType = 'overview'
    confidence = 0.85
    reason = 'Keywords: tell me, details, features, amenities, floors, structure'
  }

  // Return project detail intent if detailType and projectIdentifier (explicit or context) exist
  if (!detailType || !projectIdentifier) return null

  return {
    type: 'project_detail',
    detailType,
    projectIdentifier,
    confidence,
    reason,
  }
}

/**
 * Classify intent: check for PROJECT_DETAIL first, then factual/advisory.
 *
 * Returns full IntentClassification object with routing hints.
 */
export function classifyIntent(userMessage: string, intent?: Intent): IntentClassification {
  const msg = userMessage.toLowerCase().trim()
  const isDiscoverySearch =
    /\b(looking to invest|looking for|options in|show me|find|suggest|properties in|flats in|projects in|recommend|in sector \d+|in noida|in greater noida|invest \d+)\b/i.test(msg) ||
    (Boolean(intent?.sector || intent?.bhk?.length || intent?.budgetMax) && (!intent?.projectNames || intent.projectNames.length === 0))

  // 1. Check for PROJECT_DETAIL intent only if NOT an open discovery search
  if (!isDiscoverySearch) {
    const activeProject = intent?.projectNames && intent.projectNames.length > 0 ? intent.projectNames[0] : undefined
    const projectDetail = detectProjectDetail(userMessage, activeProject)
    if (projectDetail) {
      return {
        category: 'project_detail',
        projectDetail,
      }
    }
  }

  // 2. Legacy path: classify as factual or advisory
  const lower = userMessage.toLowerCase()
  let factualAdvisoryCategory: 'factual' | 'advisory' = 'advisory'

  // Hard signal: an explicit request for a judgement is always advisory, and
  // outranks the comparison flag — "which of these should I buy" is a decision,
  // not a spec table.
  if (ADVISORY_HARD_SIGNALS.some(re => re.test(lower))) {
    factualAdvisoryCategory = 'advisory'
  } else if (intent?.is_comparison_query) {
    // Hard signal: explicit comparison query is factual
    factualAdvisoryCategory = 'factual'
  } else {
    // Count keyword signals
    let factualScore = 0
    let advisoryScore = 0

    for (const word of FACTUAL_KEYWORDS) {
      if (lower.includes(word)) factualScore++
    }

    for (const word of ADVISORY_KEYWORDS) {
      if (lower.includes(word)) advisoryScore++
    }

    // Factual wins only with clear signal; advisory wins by default
    if (factualScore > advisoryScore && factualScore >= 2) {
      factualAdvisoryCategory = 'factual'
    }
  }

  return {
    category: factualAdvisoryCategory,
    factualAdvisoryCategory,
  }
}

/**
 * Route intent to handler based on category.
 * - project_detail: Query Planner → Project Data Gateway (structured flow)
 * - factual: cheap model (Gemini 3.5 Flash Lite, cost optimized) — wired in chat-router.ts
 * - advisory: smart model (Gemini 3.6 Flash default, reasoning required)
 *
 * Returns routing hint: 'query_planner' | 'cheap' | 'smart'
 */
export function routeToModel(classification: IntentClassification): 'query_planner' | 'cheap' | 'smart' {
  if (classification.category === 'project_detail') {
    return 'query_planner'
  }
  if (classification.category === 'factual') {
    return 'cheap'
  }
  return 'smart'
}

/**
 * Get actual model name for routing.
 * Use with routeToModel output to get the model name.
 */
export function getModelName(route: 'query_planner' | 'cheap' | 'smart'): string {
  switch (route) {
    case 'query_planner':
      return 'planner' // Not a model, triggers plan-driven flow
    case 'cheap':
      return 'gemini-3.5-flash-lite'
    case 'smart':
      return 'gemini-3.6-flash'
  }
}
