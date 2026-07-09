// backend/src/lib/ai/prompts/index.ts
import type { Intent, ScoredProject, SectorContext, SectorOverview, NearbyExpansion } from '../../discovery'
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
  blockedBuilders?: Array<{ name: string; legal_flag?: string }>
): string {
  const hasExactResults = exactResults.length > 0
  const hasNearbyResults = (nearbyResults?.length ?? 0) > 0
  const hasProperties = hasExactResults || hasNearbyResults
  const hasSectorsOverview = (sectorsOverview?.length ?? 0) > 0
  const isComparison = intent.is_comparison_query === true

  // Inject format blocks only when the query type warrants them.
  // Saves ~770–1,200 tokens on cold, process, and builder queries.
  const propertyResultsFormat = hasProperties ? buildPropertyResultsFormatBlock() : ''
  const sectorAdvisoryFormat  = hasSectorsOverview ? buildSectorAdvisoryFormatBlock() : ''
  const comparisonFormat      = isComparison ? buildComparisonFormatBlock() : ''

  const intentSummary = buildIntentSummary(intent)
  const memorySummary = memory ? buildMemorySummary(memory) : ''
  const contextSuffix = intentSummary || memorySummary
    ? `\n\n## Current Session Context\n${intentSummary}${memorySummary}`
    : ''

  const sectorBlock          = sectorCtx ? buildSectorBlock(sectorCtx, intent) : ''
  const sectorsOverviewBlock = hasSectorsOverview ? buildSectorsOverviewBlock(sectorsOverview!, intent) : ''
  const expansionBlock       = expansion ? buildExpansionBlock(expansion) : ''
  const projectsBlock        = buildProjectsBlock(exactResults, sectorCtx, expansion, nearbyResults, notFoundNames)

  const finalPrompt = getBaseSystemPrompt(intent as Record<string, unknown>, blockedBuilders) + propertyResultsFormat + sectorAdvisoryFormat + comparisonFormat + contextSuffix + sectorBlock + sectorsOverviewBlock + expansionBlock + projectsBlock
  return finalPrompt
}
