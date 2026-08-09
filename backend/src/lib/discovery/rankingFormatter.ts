/**
 * Phase 4: Ranking & Explanation Generator
 *
 * Takes Phase 3 scored projects + intent, generates ranked list with:
 * - Human-readable explanations per dimension
 * - Trade-off analysis
 * - Deal-breaker flagging
 * - Next steps & comparison matrix
 */

import { Intent } from './types'
import { RankingResult, ProjectWithMetadata, DimensionScore } from './scoringEngine'

/**
 * Single dimension explanation with emoji indicator.
 */
export interface DimensionExplanation {
  emoji: string // ✅, ⚠️, ❌
  label: string // "Budget fit", "Location", etc.
  explanation: string // "₹1.35Cr within ₹1-1.5Cr range"
  score: number
  weight: number // e.g., 0.15 for 15%
}

/**
 * Trade-off between two dimensions.
 */
export interface TradeOff {
  positive: string // "Strong builder track record (85% on-time)"
  negative: string // "Long 2.5-year possession timeline"
  reasoning?: string
}

/**
 * Deal-breaker with context and alternative suggestion.
 */
export interface DealBreakerInfo {
  reason: string // "Project has pending litigation"
  severity: 'critical' | 'high' | 'medium'
  suggestedAlternative?: {
    projectName: string
    reason: string
  }
}

/**
 * Comparison row for multi-project matrix view.
 */
export interface ComparisonRow {
  dimensionName: string
  dimensionLabel: string
  weight: number // e.g., 0.15 for 15%
  projectScores: Array<{
    projectId: string
    projectName: string
    score: number
    emoji: string
  }>
}

/**
 * Fully formatted recommendation ready for display.
 */
export interface FormattedRecommendation {
  projectId: string
  projectName: string
  builderName?: string
  finalScore: number
  scorePercentile: string // "Top 3% match", "Top 25% match"

  // Summary section
  summary: string // "Why we recommend this"
  whyMatch: string[] // ["✅ Budget fit", "✅ Location", ...]
  tradeOffs: TradeOff[]
  dealBreakers: DealBreakerInfo[]

  // Dimension breakdowns
  dimensionExplanations: DimensionExplanation[]

  // Action section
  nextSteps: string[] // Suggested follow-up actions

  // Multi-project view
  comparisonMatrix?: ComparisonRow[]
}

// ============================================================================
// EMOJI MAPPING
// ============================================================================

/**
 * Map score to emoji indicator.
 * ✅ >= 80 (green)
 * ⚠️  50-79 (yellow)
 * ❌ < 50 (red)
 */
function scoreToEmoji(score: number): string {
  if (score >= 80) return '✅'
  if (score >= 50) return '⚠️'
  return '❌'
}

// ============================================================================
// DIMENSION EXPLANATION GENERATORS
// ============================================================================

/**
 * Convert 11 dimension scores to human-readable explanations.
 * Each dimension gets label + emoji + 1-line explanation + score.
 */
function generateDimensionExplanations(
  dimensionScores: RankingResult['dimensionScores'],
  weights: Record<string, number>
): DimensionExplanation[] {
  const dimensions = [
    {
      key: 'budget',
      label: 'Budget fit'
    },
    {
      key: 'location',
      label: 'Location'
    },
    {
      key: 'timeline',
      label: 'Possession timeline'
    },
    {
      key: 'specs',
      label: 'Property specs'
    },
    {
      key: 'builder',
      label: 'Builder track record'
    },
    {
      key: 'legal',
      label: 'Legal & compliance'
    },
    {
      key: 'amenities',
      label: 'Amenities'
    },
    {
      key: 'pricing',
      label: 'Price position'
    },
    {
      key: 'personal',
      label: 'Personal fit'
    },
    {
      key: 'drivers',
      label: 'Decision drivers'
    },
    {
      key: 'gaps',
      label: 'Critical gaps'
    }
  ]

  return dimensions.map(({ key, label }) => {
    const dimension = dimensionScores[key as keyof typeof dimensionScores]
    const score = dimension?.score ?? 0
    const explanation = dimension?.explanation ?? ''
    const weight = weights[key] ?? 0

    return {
      emoji: scoreToEmoji(score),
      label,
      explanation,
      score,
      weight
    }
  })
}

// ============================================================================
// TRADE-OFF DETECTOR
// ============================================================================

/**
 * Identify trade-offs by pairing high scores with low scores.
 * Examples:
 * - "Long possession timeline vs. strong builder track record"
 * - "Premium price point vs. 5-minute metro walk"
 */
function detectTradeOffs(dimensionExplanations: DimensionExplanation[]): TradeOff[] {
  const tradeOffs: TradeOff[] = []

  // Find high-scoring and low-scoring dimensions
  const highScores = dimensionExplanations.filter((d) => d.score >= 80)
  const lowScores = dimensionExplanations.filter((d) => d.score < 70)

  // Pair them up logically (max 3 trade-offs)
  for (let i = 0; i < Math.min(lowScores.length, 2); i++) {
    const low = lowScores[i]
    let high: DimensionExplanation | null = null

    // Try to pair with a complementary high-score
    // (timeline trade-off pairs well with builder, etc.)
    if (low.label.includes('timeline') && highScores.find((h) => h.label.includes('builder'))) {
      high = highScores.find((h) => h.label.includes('builder')) || null
    } else if (low.label.includes('Price') && highScores.find((h) => h.label.includes('Location'))) {
      high = highScores.find((h) => h.label.includes('Location')) || null
    } else {
      // Default: pair with any high score
      high = highScores.find((h) => !tradeOffs.some((t) => t.positive.includes(h.label))) || null
    }

    if (high) {
      tradeOffs.push({
        positive: `${high.emoji} ${high.label}: ${high.explanation}`,
        negative: `${low.emoji} ${low.label}: ${low.explanation}`,
        reasoning: `Strong ${high.label.toLowerCase()} vs. ${low.label.toLowerCase()} — evaluate fit for your timeline`
      })
    }
  }

  return tradeOffs
}

// ============================================================================
// DEAL-BREAKER HANDLER
// ============================================================================

/**
 * Format deal-breakers with severity and context.
 * Severity: critical (litigation, no RERA), high (major gaps), medium (minor issues)
 */
function handleDealBreakers(
  dealBreakers: DimensionScore[],
  dimensionExplanations: DimensionExplanation[],
  alternativeProjects?: Array<{ projectId: string; projectName: string }>
): DealBreakerInfo[] {
  return dealBreakers.map((db) => {
    let severity: 'critical' | 'high' | 'medium' = 'high'

    // Classify severity
    if (
      db.explanation?.toLowerCase().includes('litigation') ||
      db.explanation?.toLowerCase().includes('no rera')
    ) {
      severity = 'critical'
    } else if (db.explanation?.toLowerCase().includes('insolvency')) {
      severity = 'critical'
    } else {
      severity = 'high'
    }

    return {
      reason: db.explanation,
      severity,
      suggestedAlternative: alternativeProjects
        ? {
            projectName: alternativeProjects[0]?.projectName || 'Similar project',
            reason:
              severity === 'critical'
                ? 'No legal issues, similar budget and location'
                : 'Fewer compliance gaps'
          }
        : undefined
    }
  })
}

// ============================================================================
// SUMMARY & NEXT STEPS GENERATORS
// ============================================================================

/**
 * Generate "Why we recommend this" summary.
 * Focus on top 3 high-scoring dimensions.
 */
function generateSummary(dimensionExplanations: DimensionExplanation[], finalScore: number): string {
  const topDims = dimensionExplanations.filter((d) => d.score >= 80).slice(0, 3)

  if (topDims.length === 0) {
    return 'Matches your core requirements'
  }

  const reasons = topDims
    .map((d) => d.label.toLowerCase())
    .map((label) => {
      if (label.includes('budget')) return 'budget and affordability'
      if (label.includes('location')) return 'location preferences'
      if (label.includes('builder')) return 'builder reputation'
      if (label.includes('timeline')) return 'possession timeline'
      if (label.includes('specs')) return 'property specifications'
      return label
    })

  return `Matches your ${reasons.join(', ')}`
}

/**
 * Generate next steps based on dimension scores and deal-breakers.
 */
function generateNextSteps(
  dimensionExplanations: DimensionExplanation[],
  dealBreakers: DealBreakerInfo[],
  finalScore: number
): string[] {
  const steps: string[] = []

  // Always include site visit
  if (finalScore >= 70) {
    steps.push('Schedule site visit to validate construction quality and on-ground situation')
  }

  // Legal checks
  const legalDim = dimensionExplanations.find((d) => d.label.includes('Legal'))
  if (legalDim && legalDim.score < 80) {
    steps.push('Verify RERA registration and check for pending litigation online')
  }

  // Financial/Timeline checks
  const timelineDim = dimensionExplanations.find((d) => d.label.includes('timeline'))
  if (timelineDim && timelineDim.score < 70) {
    steps.push("Clarify possession timeline and builder's historical delay patterns")
  }

  // Resale restrictions
  if (dimensionExplanations.some((d) => d.label.includes('gaps') && d.score < 80)) {
    steps.push('Check resale restrictions and lock-in terms in agreement')
  }

  // Budget confirmations
  const budgetDim = dimensionExplanations.find((d) => d.label.includes('Budget'))
  if (budgetDim && budgetDim.score >= 80) {
    steps.push('Confirm all additional costs (registration, stamp duty, maintenance)')
  }

  // NRI-specific
  if (dimensionExplanations.some((d) => d.label.includes('gaps'))) {
    steps.push('For NRI buyers: confirm FEMA compliance and repatriation terms')
  }

  // Limit to 4-5 next steps
  return steps.slice(0, 5)
}

// ============================================================================
// SCORE PERCENTILE CALCULATOR
// ============================================================================

/**
 * Calculate score percentile based on final score.
 * 90-100 → "Top 5%"
 * 80-89 → "Top 15%"
 * 70-79 → "Top 30%"
 * etc.
 */
function scorePercentile(score: number): string {
  if (score >= 90) return 'Top 5% match'
  if (score >= 85) return 'Top 10% match'
  if (score >= 80) return 'Top 15% match'
  if (score >= 75) return 'Top 20% match'
  if (score >= 70) return 'Top 30% match'
  if (score >= 65) return 'Top 40% match'
  return 'Moderate match'
}

// ============================================================================
// COMPARISON MATRIX GENERATOR
// ============================================================================

/**
 * Generate comparison matrix across multiple projects.
 * Shows score per dimension per project, with weights.
 */
function generateComparisonMatrix(
  recommendations: Array<{
    projectId: string
    projectName: string
    dimensionExplanations: DimensionExplanation[]
  }>
): ComparisonRow[] {
  if (recommendations.length < 2) return []

  const dimensionLabels = [
    'Budget fit',
    'Location',
    'Possession timeline',
    'Property specs',
    'Builder track record',
    'Legal & compliance',
    'Amenities',
    'Price position',
    'Personal fit',
    'Decision drivers',
    'Critical gaps'
  ]

  return dimensionLabels.map((label, idx) => {
    const projectScores = recommendations.map((rec) => {
      const dim = rec.dimensionExplanations.find((d) => d.label === label)
      return {
        projectId: rec.projectId,
        projectName: rec.projectName,
        score: dim?.score ?? 0,
        emoji: dim ? scoreToEmoji(dim.score) : '❓'
      }
    })

    return {
      dimensionName: label.toLowerCase().replace(/\s+/g, '_'),
      dimensionLabel: label,
      weight: 0.09, // Average weight per dimension
      projectScores
    }
  })
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Format ranked projects into human-readable recommendations.
 *
 * @param rankedResults - Array of RankingResult with projectId/projectName
 * @param projects - Original ProjectWithMetadata objects (for builder names, etc.)
 * @param intent - User intent (for context)
 * @param topN - Return top N recommendations (default 3, max 10)
 * @param includeComparison - Include comparison matrix (true if topN > 1)
 * @returns Array of FormattedRecommendation objects
 */
export function formatRankedResults(
  rankedResults: Array<RankingResult & { projectId: string; projectName: string }>,
  projects: ProjectWithMetadata[],
  intent: Intent,
  topN: number = 3,
  includeComparison: boolean = true
): FormattedRecommendation[] {
  // Validate inputs
  if (!rankedResults || rankedResults.length === 0) {
    return []
  }

  const maxN = Math.min(topN, 10)

  // Filter out deal-breakers unless user explicitly accepts risk
  let filtered = rankedResults
  if (intent.riskProfile === 'risk_averse') {
    // For risk-averse users, filter out deal-breakers
    filtered = rankedResults.filter((r) => r.dealBreakers.length === 0)
  }
  // For other users, show deal-breakers but flag them prominently

  // Sort by final score (descending) and take top N
  const sorted = filtered.sort((a, b) => b.finalScore - a.finalScore).slice(0, maxN)

  // Compute weights for all dimensions
  const weights = computeWeights(intent)

  // Format each result
  const formatted: FormattedRecommendation[] = sorted.map((result) => {
    const project = projects.find((p) => p.id === result.projectId)

    // Generate dimension explanations
    const dimensionExplanations = generateDimensionExplanations(result.dimensionScores, weights)

    // Get "why match" (top 3 scoring dimensions)
    const whyMatch = dimensionExplanations
      .filter((d) => d.score >= 75)
      .slice(0, 3)
      .map((d) => `${d.emoji} ${d.label}: ${d.explanation}`)

    // Detect trade-offs
    const tradeOffs = detectTradeOffs(dimensionExplanations)

    // Handle deal-breakers with alternatives
    const dealBreakerInfos = handleDealBreakers(result.dealBreakers, dimensionExplanations, [
      ...sorted.filter((r) => r.projectId !== result.projectId).slice(0, 1)
    ])

    // Generate summary
    const summary = generateSummary(dimensionExplanations, result.finalScore)

    // Generate next steps
    const nextSteps = generateNextSteps(dimensionExplanations, dealBreakerInfos, result.finalScore)

    const recommendation: FormattedRecommendation = {
      projectId: result.projectId,
      projectName: result.projectName,
      builderName: project?.builder?.name || undefined,
      finalScore: result.finalScore,
      scorePercentile: scorePercentile(result.finalScore),
      summary,
      whyMatch,
      tradeOffs,
      dealBreakers: dealBreakerInfos,
      dimensionExplanations,
      nextSteps
    }

    return recommendation
  })

  // Add comparison matrix if requested and multiple projects
  if (includeComparison && formatted.length > 1) {
    const comparisonMatrix = generateComparisonMatrix(
      formatted.map((f) => ({
        projectId: f.projectId,
        projectName: f.projectName,
        dimensionExplanations: f.dimensionExplanations
      }))
    )

    formatted.forEach((f) => {
      f.comparisonMatrix = comparisonMatrix
    })
  }

  return formatted
}

// ============================================================================
// HELPER: WEIGHT COMPUTER (matches scoringEngine)
// ============================================================================

/**
 * Compute dimension weights based on intent priorities.
 * Must match the weights used in Phase 3 (scoringEngine).
 */
function computeWeights(intent: Intent): Record<string, number> {
  const weights = {
    budget: 0.12,
    location: 0.12,
    timeline: 0.1,
    specs: 0.09,
    builder: 0.09,
    legal: 0.1,
    amenities: 0.07,
    pricing: 0.08,
    personal: 0.08,
    drivers: 0.07,
    gaps: 0.06
  }

  // Adjust based on intent
  if (intent.purpose === 'investment') {
    weights.builder += 0.05
    weights.pricing -= 0.02
    weights.personal -= 0.03
  }

  if (intent.riskProfile === 'risk_averse' || intent.riskProfile === 'nri') {
    weights.legal += 0.03
    weights.builder += 0.02
    weights.gaps += 0.02
    weights.personal -= 0.02
  }

  // Normalize
  const sum = Object.values(weights).reduce((a, b) => a + b, 0)
  Object.keys(weights).forEach((k) => {
    weights[k as keyof typeof weights] /= sum
  })

  return weights
}

// ============================================================================
// EXPORT SUMMARY FUNCTION (for chat integration)
// ============================================================================

/**
 * Generate a concise summary of recommendations for chat display.
 * Returns 1-2 paragraphs suitable for real-time chat.
 */
export function generateRecommendationSummary(recommendations: FormattedRecommendation[]): string {
  if (recommendations.length === 0) {
    return "No projects match your criteria. Let's refine your search."
  }

  const top = recommendations[0]
  const otherCount = recommendations.length - 1

  let summary = `🏆 **${top.projectName}** is our top match (${top.finalScore}/100). ${top.summary.charAt(0).toUpperCase() + top.summary.slice(1)}.`

  if (top.tradeOffs.length > 0) {
    summary += ` Key trade-off: ${top.tradeOffs[0].positive.replace(/✅|⚠️|❌/g, '').trim()} but ${top.tradeOffs[0].negative.replace(/✅|⚠️|❌/g, '').trim().toLowerCase()}.`
  }

  if (otherCount > 0) {
    summary += ` We also found ${otherCount} other strong option${otherCount > 1 ? 's' : ''}.`
  }

  return summary
}
