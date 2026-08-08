// backend/src/lib/ai/prompts/index.ts
import type { Intent, ScoredProject, SectorContext, SectorOverview, NearbyExpansion } from '../../discovery'
import type { SupportedCity } from '../../config/cities'
import { DEFAULT_CITY } from '../../config/cities'
import { getBaseSystemPrompt } from './base'
import {
  buildProjectsBlock,
  buildSectorBlock,
  buildSectorsOverviewBlock,
  buildIntentSummary,
  buildMemorySummary,
  buildExpansionBlock,
  buildPropertyResultsFormatBlock,
  buildSectorAdvisoryFormatBlock,
  buildComparisonFormatBlock,
} from './blocks'
import { filterToolsByIntent, type QueryKind } from '../toolRegistry'
import { truncateByTiers, estimateTokens, injectPersonaContext } from '../contextBuilder'

export { INTENT_EXTRACTION_PROMPT } from './intent-extraction'
export { getBaseSystemPrompt } from './base'
export { buildProjectsBlock, buildSectorBlock, buildSectorsOverviewBlock, buildIntentSummary, buildMemorySummary, buildExpansionBlock } from './blocks'

export function buildAdvisorSystemPrompt(
  intent: Intent,
  exactResults: ScoredProject[],
  memory?: {
    bhk_preference?: number | null
    budget_max_cr?: number | null
    sector_preference?: string | null
    purpose?: string | null
    viewed_slugs?: string[]
    current_session_viewed?: string[] // Track C
  } | null,
  sectorCtx?: SectorContext,
  sectorsOverview?: SectorOverview[],
  expansion?: NearbyExpansion,
  nearbyResults?: ScoredProject[],
  notFoundNames?: string[],
  blockedBuilders?: Array<{ name: string; legal_flag?: string }>,
  intentState?: string, // GATHERING, READY_TO_SEARCH, SHORTLISTED, COMPARING, DECIDING
  city?: SupportedCity,
  userMessage?: string
): string {
  const hasExactResults = exactResults.length > 0
  const hasNearbyResults = (nearbyResults?.length ?? 0) > 0
  const hasProperties = hasExactResults || hasNearbyResults
  const hasSectorsOverview = (sectorsOverview?.length ?? 0) > 0
  const isComparison = intent.is_comparison_query === true

  // Inject format blocks only when the query type warrants them.
  // In SHORTLISTED state, skip sector overview (already have results) to reduce tokens.
  // Saves ~770–1,200 tokens on cold, process, and builder queries.
  const isShortlisted = intentState === 'SHORTLISTED' || intentState === 'COMPARING'
  const propertyResultsFormat = hasProperties ? buildPropertyResultsFormatBlock(intentState) : ''
  const sectorAdvisoryFormat  = (hasSectorsOverview && !isShortlisted) ? buildSectorAdvisoryFormatBlock() : ''
  const comparisonFormat      = isComparison ? buildComparisonFormatBlock() : ''

  const intentSummary = buildIntentSummary(intent)
  const memorySummary = memory ? buildMemorySummary(memory) : ''
  const contextSuffix = intentSummary || memorySummary
    ? `\n\n## Current Session Context\n${intentSummary}${memorySummary}`
    : ''

  const sectorBlock          = sectorCtx ? buildSectorBlock(sectorCtx, intent) : ''
  const sectorsOverviewBlock = hasSectorsOverview ? buildSectorsOverviewBlock(sectorsOverview!, intent) : ''
  const expansionBlock       = expansion ? buildExpansionBlock(expansion) : ''

  // Phase 2: Apply tiered truncation if token budget gets tight
  // Step 1: Build base prompt to measure token footprint (with dynamic tools based on queryKind)
  const queryKind = (intent.queryKind ?? 'DISCOVERY') as QueryKind
  const basePrompt = getBaseSystemPrompt(intent, blockedBuilders, city ?? DEFAULT_CITY, intentState, queryKind, userMessage)
  const baseTokens = estimateTokens(basePrompt)
  const extraBlocksTokens = estimateTokens(propertyResultsFormat + sectorAdvisoryFormat + comparisonFormat + contextSuffix + sectorBlock + sectorsOverviewBlock + expansionBlock)
  const systemPromptEstimate = baseTokens + extraBlocksTokens

  // Step 2: Apply tiered truncation to properties
  let truncatedExact = exactResults
  let truncatedNearby = nearbyResults
  if (hasExactResults && systemPromptEstimate > 85_000) {
    // Only truncate if we're already consuming a lot of tokens
    truncatedExact = truncateByTiers(exactResults, systemPromptEstimate, 100_000)
    if (nearbyResults && nearbyResults.length > 0) {
      truncatedNearby = truncateByTiers(nearbyResults, systemPromptEstimate + estimateTokens(JSON.stringify(truncatedExact)), 100_000)
    }
  }

  const projectsBlock = buildProjectsBlock(truncatedExact, sectorCtx, expansion, truncatedNearby, notFoundNames)

  const finalPrompt = basePrompt + propertyResultsFormat + sectorAdvisoryFormat + comparisonFormat + contextSuffix + sectorBlock + sectorsOverviewBlock + expansionBlock + projectsBlock
  return finalPrompt
}
