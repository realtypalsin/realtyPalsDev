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
 *   Routes to: cheap model (llama-3.1-8b-instant)
 *
 * ADVISORY: Reasoning queries (should, why, is this good)
 *   Routes to: smart model (claude-opus)
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
  'investment', 'trust', 'reliable', 'safe', 'reputation', 'complaint', 'quality',
  'decision', 'choose', 'best', 'better', 'vs', 'versus', 'comparison advice',
  'trade-off', 'tradeoff', 'pros', 'cons', 'negative', 'positive', 'feel',
]);

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
function detectProjectDetail(userMessage: string): ProjectDetailIntent | null {
  const msg = userMessage.toLowerCase().trim()

  // Keyword patterns for different detail types
  const paymentKeywords = /\b(emi|loan|cost|price|payment|charge|fee|stamp duty|gst|affordability|mortgage|down payment)\b/i
  const investmentKeywords = /\b(invest|return|yield|appreciation|cagr|roi|bullish|bearish|buy|hold|strong buy)\b/i
  const locationKeywords = /\b(metro|school|hospital|mall|nearby|distance|commute|connectivity|how far|how long)\b/i
  const timelineKeywords = /\b(possession|ready|completion|delivery|delay|when|timeline|move in)\b/i
  const builderKeywords = /\b(builder|developer|track|reputation|credibility|delivery|rera|complaint)\b/i
  const overviewKeywords = /\b(tell me|about|details|configuration|layout|bhk|amenities|features|highlights)\b/i

  // Check for project mention (words after "for", "about", "in", "at")
  const projectMention = msg.match(/(?:for|about|in|at)\s+([a-z\s]+?)(?:\?|$)/i)
  const projectIdentifier = projectMention ? projectMention[1].trim() : undefined

  // Detect detail type
  let detailType: ProjectDetailType | null = null
  let confidence = 0
  let reason = ''

  if (paymentKeywords.test(msg)) {
    detailType = 'payment'
    confidence = 0.95
    reason = 'Keywords: EMI, cost, charges, affordability'
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
    reason = 'Keywords: tell me, details, features, amenities'
  }

  // Only return if we detected a detail type
  if (!detailType) return null

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
  // 1. Check for PROJECT_DETAIL intent (highest priority)
  const projectDetail = detectProjectDetail(userMessage)
  if (projectDetail) {
    return {
      category: 'project_detail',
      projectDetail,
    }
  }

  // 2. Legacy path: classify as factual or advisory
  const lower = userMessage.toLowerCase()
  let factualAdvisoryCategory: 'factual' | 'advisory' = 'advisory'

  // Hard signal: explicit comparison query is factual
  if (intent?.is_comparison_query) {
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
 * - factual: cheap model (llama-3.1-8b-instant, cost optimized)
 * - advisory: smart model (claude-opus or gpt-4o, reasoning required)
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
      return 'llama-3.1-8b-instant' // ~$0.002 per 1K tokens
    case 'smart':
      return 'gpt-4o' // Reasoning model
  }
}
