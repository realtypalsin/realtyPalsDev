/**
 * Phase 0: Query Classification Taxonomy
 *
 * Deterministic + LLM fallback approach to classify user queries into:
 * - DISCOVERY: User wants recommendations (default fallback)
 * - DRILLDOWN: User wants details on specific project/attribute
 * - RANKING: User wants comparison/ranking of options
 * - COMPARISON: User wants to compare 2+ named projects
 * - SUMMARY: User wants overview/summary
 * - ADVISORY: User wants advice/opinion
 * - CLARIFY: Bot needs clarification before proceeding
 *
 * Deterministic pre-pass evaluates before LLM fallback.
 * LLM fallback folds queryKind into intent extraction (no extra round-trip).
 */

import type { Intent } from './types'
import { inferRankingProfile, type RankingProfile } from './rankingProfiles'
import { detectOpenQuery, hasPropertySearchSignal } from './openQuery'

export type QueryKind =
  | 'DISCOVERY'   // User searching for properties
  | 'DRILLDOWN'   // Detail-focused on specific project
  | 'RANKING'     // Comparative/ranking query
  | 'COMPARISON'  // Compare 2+ projects
  | 'SUMMARY'     // High-level overview
  | 'ADVISORY'    // Ask for advice/opinion
  | 'CLARIFY'     // Need clarification
  | 'OPEN'        // General real-estate question, not a property search

export type RenderTarget = 'cards' | 'text' | 'both'

export interface QueryClassification {
  queryKind: QueryKind
  renderTarget: RenderTarget
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  reason: string
  rankingProfile?: RankingProfile // Phase 5: inferred from phrasing when queryKind=RANKING
}

/**
 * Render target mapping from queryKind.
 * Tells frontend how to render the response.
 */
function getRenderTarget(queryKind: QueryKind): RenderTarget {
  switch (queryKind) {
    case 'DISCOVERY':
      return 'cards'
    case 'DRILLDOWN':
    case 'SUMMARY':
    case 'ADVISORY':
    case 'CLARIFY':
    case 'OPEN':
      return 'text'
    case 'COMPARISON':
    case 'RANKING':
      return 'both'
    default:
      return 'text'
  }
}

/**
 * Deterministic pre-pass: keyword + pattern matching.
 * Returns classification if pattern is clear, otherwise returns null for LLM fallback.
 */
export function classifyQueryDeterministic(
  userMessage: string,
  intent: Record<string, unknown>,
): QueryClassification | null {
  const msg = userMessage.toLowerCase().trim()
  const intentObj = intent as Partial<Intent>

  // COMPARISON: User explicitly asks to compare 2+ named projects
  // "Compare X vs Y", "Compare X and Y", "Compare X with Y"
  const comparePattern = /(?:compare|vs|versus|which.*better|which.*more suitable)\s+([^?]+)\s+(?:vs|versus|with|and|or)\s+([^?]+)/i
  const compareMatch = userMessage.match(comparePattern)
  if (compareMatch && intentObj.projectNames?.length && intentObj.projectNames.length >= 2) {
    return {
      queryKind: 'COMPARISON',
      renderTarget: 'both',
      confidence: 'HIGH',
      reason: 'Explicit comparison request with 2+ project names',
    }
  }

  // OPEN: general real-estate question with no property-search shape.
  // Runs before the attribute/DRILLDOWN checks because those match on words like
  // "reputation" and "details" that also appear in "what is X's track record" —
  // and DRILLDOWN routes into the project pipeline, which has no row to answer from.
  const openDetection = detectOpenQuery(userMessage, (intentObj.projectNames?.length ?? 0) > 0)
  if (openDetection) {
    return {
      queryKind: 'OPEN',
      renderTarget: 'text',
      confidence: 'HIGH',
      reason: openDetection.reason,
    }
  }

  // 1. Property SEARCH Action: "show me", "find", "search", "list", "looking for", "available", "2 BHK in Sector 76"
  const isSearchAction = /\b(show|find|search|list|get|looking for|available|flats|apartments|homes)\b/i.test(msg) ||
    (/\b(\d\s*bhk)\b/i.test(msg) && /\b(sector|in|under|budget|crore|lakh)\b/i.test(msg))
  const isSpecificAttributeQuestion = /\b(what is|where is|give me|explain|how many|what are|details of|about)\b/i.test(msg)

  if (isSearchAction && !isSpecificAttributeQuestion) {
    const superlativePattern = /\b(best|top|most|least|cheapest|fastest|largest|highest|lowest|fewest|value|budget-friendly|affordable|safest|trusted|premium|luxury|rank)\b/i
    if (superlativePattern.test(msg)) {
      return {
        queryKind: 'RANKING',
        renderTarget: 'both',
        confidence: 'HIGH',
        reason: 'Property search with ranking terms -> RANKING (both)',
      }
    }
    return {
      queryKind: 'DISCOVERY',
      renderTarget: 'both',
      confidence: 'HIGH',
      reason: 'Property search query -> DISCOVERY (both)',
    }
  }

  // 2. DRILLDOWN: User asks specific property attributes of a project (floor, address, payment plan, vastu, security, amenities, etc.)
  const attributeKeywords = /\b(payment\s+plan|cost|price|carpet|carpet\s+area|super\s+area|emi|maintenance|parking|amenities|facilities|layout|configuration|timeline|possession|construction|status|builder|reputation|trust|verification|rera|floor|floors|top\s+floor|height|tower|towers|address|full\s+address|complete\s+address|location|where|vastu|facing|orientation|security|safety|cctv|aqi|green|architect|designer|theme|tagline|description|details|overview|specs)\b/i
  if (attributeKeywords.test(msg)) {
    return {
      queryKind: 'DRILLDOWN',
      renderTarget: 'text',
      confidence: 'HIGH',
      reason: 'Attribute question -> DRILLDOWN (text)',
    }
  }

  // BUILDER / GENERAL ADVISORY: User asks about builders or general market
  const builderGeneralPattern = /\b(which builders|famous builders|top builders|reputed builders|builder list|builder track record|builder reputation|about builder)\b/i
  if (builderGeneralPattern.test(msg)) {
    return {
      queryKind: 'ADVISORY',
      renderTarget: 'text',
      confidence: 'HIGH',
      reason: 'General builder query -> render text only',
    }
  }

  // RANKING: Superlative + scope (Phase 5: extended with value/trust/speed/family phrasing)
  // "best projects under 1.5cr", "top 3 options in sector 62", "which is cheapest"
  // "best value", "safest builders", "fastest possession", "best for families"
  const superlativePattern = /\b(best|top|most|least|cheapest|fastest|largest|highest|lowest|fewest|which.*best|which.*most|which.*least|value|budget-friendly|affordable|safest|trusted|quick|families|family|premium|luxury|rank)\b/i
  const scopePattern = /\b(in|near|under|over|within|around|sector|area|range)\b/i
  if (superlativePattern.test(msg) && scopePattern.test(msg)) {
    const rankingProfile = inferRankingProfile(msg)
    return {
      queryKind: 'RANKING',
      renderTarget: 'both',
      confidence: 'HIGH',
      reason: 'Superlative + scope pattern (best, top, etc.)',
      rankingProfile: rankingProfile ?? undefined,
    }
  }

  // SUMMARY: User asks for overview/summary
  // "Summary of", "overview of", "quick summary", "what's available"
  const summaryPattern = /\b(summary|overview|quick summary|brief overview|gist|summary of|overview of)\b/i
  if (summaryPattern.test(msg)) {
    return {
      queryKind: 'SUMMARY',
      renderTarget: 'text',
      confidence: 'HIGH',
      reason: 'Summary/overview keywords',
    }
  }

  // ADVISORY: Asking for advice/opinion without comparison
  // "Should I buy X?", "Is X good for investment?", "What do you think of X?"
  const advisoryPattern = /\b(should|should i|would you|is.*good|is.*worth|is.*right|do you think|what do you think|recommendation|advice|your opinion|opinion on)\b/i
  const projectRef = /\b(for|about|on|of)\s+\w+$/
  if (advisoryPattern.test(msg) && projectRef.test(msg)) {
    return {
      queryKind: 'ADVISORY',
      renderTarget: 'text',
      confidence: 'MEDIUM',
      reason: 'Advisory keywords + project reference',
    }
  }

  // Fallback: return null to signal LLM fallback
  return null
}

/**
 * Determine if a query needs explicit LLM classification.
 * Returns true if deterministic pre-pass couldn't classify.
 */
export function needsLLMFallback(classification: QueryClassification | null): boolean {
  return classification === null
}

/**
 * Parse queryKind from LLM intent extraction.
 * Called INSIDE extractIntent to fold queryKind into the response schema.
 * The LLM includes queryKind in its intent JSON output.
 *
 * Default to DISCOVERY if not specified (fail-open).
 */
export function parseQueryKindFromIntent(rawIntent: Record<string, unknown>): QueryKind {
  const queryKind = rawIntent.queryKind as string | undefined

  const valid: QueryKind[] = ['DISCOVERY', 'DRILLDOWN', 'RANKING', 'COMPARISON', 'SUMMARY', 'ADVISORY', 'CLARIFY', 'OPEN']

  if (queryKind && valid.includes(queryKind as QueryKind)) {
    return queryKind as QueryKind
  }

  // Fail-open: unknown → DISCOVERY
  return 'DISCOVERY'
}

/**
 * Complete classification: combine deterministic + LLM fallback.
 * Called from chat.ts after intent extraction.
 */
export function classifyQuery(
  userMessage: string,
  intent: Record<string, unknown>,
): QueryClassification {
  // Try deterministic first
  const deterministic = classifyQueryDeterministic(userMessage, intent)
  if (deterministic) {
    return deterministic
  }

  // Fallback to LLM-provided queryKind (already in intent from extractIntent)
  let queryKind = parseQueryKindFromIntent(intent)
  let reason = 'LLM classification'

  // parseQueryKindFromIntent fails open to DISCOVERY. That is right when the user
  // is shopping and wrong when they are asking — an unclassifiable question with no
  // BHK, budget, sector or project name in it used to come back as property cards.
  // With no search signal, OPEN is the safer default: it answers or admits a gap,
  // where DISCOVERY answers a question the user did not ask.
  if (queryKind === 'DISCOVERY' && !hasPropertySearchSignal(intent) && /\?|^(who|what|where|why|how|which|when|is|are|does|do|tell)\b/i.test(userMessage.trim())) {
    queryKind = 'OPEN'
    reason = 'Question with no property-search signal — fail open to OPEN, not DISCOVERY'
  }

  return {
    queryKind,
    renderTarget: getRenderTarget(queryKind),
    confidence: 'MEDIUM', // LLM-derived, less confident than deterministic
    reason,
  }
}

/**
 * Export render target resolver for use in chat.ts
 */
export { getRenderTarget }
