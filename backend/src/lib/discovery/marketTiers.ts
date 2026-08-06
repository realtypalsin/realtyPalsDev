/**
 * Phase 5: Market Tiers
 *
 * Tag projects by price range into market tiers:
 * - Budget:   ₹0–50L
 * - Mid:      ₹50L–1.5Cr
 * - Premium:  ₹1.5–4Cr
 * - Luxury:   ₹4Cr+
 *
 * Applied in ScoredProject for visibility.
 * Used for tier-based bias in scoring:
 * - No budget: return 1 per tier (diverse)
 * - Budget given: bias to matching tier (+20pts exact, +5pts adjacent)
 */

export type MarketTier = 'budget' | 'mid' | 'premium' | 'luxury'

export interface MarketTierRange {
  tier: MarketTier
  label: string
  minCr: number
  maxCr: number
}

export const MARKET_TIERS: MarketTierRange[] = [
  { tier: 'budget', label: 'Budget', minCr: 0, maxCr: 0.5 },
  { tier: 'mid', label: 'Mid', minCr: 0.5, maxCr: 1.5 },
  { tier: 'premium', label: 'Premium', minCr: 1.5, maxCr: 4 },
  { tier: 'luxury', label: 'Luxury', minCr: 4, maxCr: Infinity },
]

/**
 * Determine market tier from lowest price in a project.
 */
export function getMarketTier(lowestPriceCr: number | null | undefined): MarketTier {
  if (lowestPriceCr === null || lowestPriceCr === undefined) {
    return 'mid' // default when price unknown
  }

  const tier = MARKET_TIERS.find((t) => lowestPriceCr >= t.minCr && lowestPriceCr <= t.maxCr)
  return tier?.tier ?? 'luxury'
}

/**
 * Get market tier boost points.
 * Applied in scoreProject() when budget intent exists.
 *
 * - Exact match: +20 pts
 * - Adjacent tier (±1): +5 pts
 * - Far (>1 tier away): 0 pts
 */
export function getMarketTierBias(
  projectTier: MarketTier,
  budgetMax: number | undefined,
): number {
  if (!budgetMax) return 0

  const budgetTier = getMarketTier(budgetMax)

  // Map tiers to indices for distance calculation
  const tierIndex: Record<MarketTier, number> = {
    budget: 0,
    mid: 1,
    premium: 2,
    luxury: 3,
  }

  const projectIdx = tierIndex[projectTier]
  const budgetIdx = tierIndex[budgetTier]
  const distance = Math.abs(projectIdx - budgetIdx)

  if (distance === 0) return 20 // exact match
  if (distance === 1) return 5 // adjacent
  return 0 // too far
}

/**
 * Get human-readable label for market tier.
 */
export function getMarketTierLabel(tier: MarketTier): string {
  const labels: Record<MarketTier, string> = {
    budget: 'Budget',
    mid: 'Mid-range',
    premium: 'Premium',
    luxury: 'Luxury',
  }
  return labels[tier]
}

/**
 * Get price range string for market tier.
 */
export function getMarketTierRange(tier: MarketTier): string {
  const ranges: Record<MarketTier, string> = {
    budget: '₹0–50L',
    mid: '₹50L–1.5Cr',
    premium: '₹1.5–4Cr',
    luxury: '₹4Cr+',
  }
  return ranges[tier]
}
