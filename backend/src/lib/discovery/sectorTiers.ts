/**
 * Phase 5: Sector Tiers
 *
 * Data-driven tier computation from sector_intelligence:
 * - Tier 1 (Premium): Established + high CAGR
 * - Tier 2 (Growth): Developing + mid CAGR
 * - Tier 3 (Budget): Everything else
 *
 * Tier boost applied in scoreProject():
 * - T1: +10 pts
 * - T2: +5 pts
 * - T3: 0 pts
 */

export type SectorTier = 'tier1' | 'tier2' | 'tier3'

export interface ComputedSectorTier {
  city: string
  sector: string
  tier: SectorTier
  label: string
  reasons: string[]
  avg_price_per_sqft?: number | null
  sector_stage?: string | null
  price_5yr_cagr_pct?: number | null
  computed_at: Date
}

/**
 * Compute sector tier from sector_intelligence data.
 *
 * Tier logic:
 * - Tier 1 (Premium): sector_stage === 'established' AND price_5yr_cagr_pct >= 5
 * - Tier 2 (Growth):  sector_stage === 'developing' AND price_5yr_cagr_pct >= 3
 * - Tier 3 (Budget):  everything else
 */
export function computeSectorTier(sectorIntelligence: {
  city: string
  sector: string
  sector_stage?: string | null
  avg_price_per_sqft?: number | null
  price_5yr_cagr_pct?: number | null
}): ComputedSectorTier {
  const { city, sector, sector_stage, avg_price_per_sqft, price_5yr_cagr_pct } = sectorIntelligence

  let tier: SectorTier = 'tier3'
  const reasons: string[] = []

  // Tier 1: Established + high CAGR
  if (sector_stage === 'established' && (price_5yr_cagr_pct ?? 0) >= 5) {
    tier = 'tier1'
    reasons.push('Established sector with strong price appreciation (≥5% CAGR)')
  }
  // Tier 2: Developing + mid CAGR
  else if (sector_stage === 'developing' && (price_5yr_cagr_pct ?? 0) >= 3) {
    tier = 'tier2'
    reasons.push('Developing sector with moderate price appreciation (≥3% CAGR)')
  }
  // Tier 3: Everything else
  else {
    tier = 'tier3'
    if (sector_stage) {
      reasons.push(`${sector_stage} sector`)
    }
    if (price_5yr_cagr_pct !== null && price_5yr_cagr_pct !== undefined) {
      if (price_5yr_cagr_pct < 0) {
        reasons.push('Negative price trend')
      } else {
        reasons.push(`${price_5yr_cagr_pct.toFixed(1)}% CAGR`)
      }
    }
    if (reasons.length === 0) {
      reasons.push('Standard market tier')
    }
  }

  const labels: Record<SectorTier, string> = {
    tier1: 'Premium',
    tier2: 'Growth',
    tier3: 'Budget',
  }

  return {
    city,
    sector,
    tier,
    label: labels[tier],
    reasons,
    avg_price_per_sqft,
    sector_stage,
    price_5yr_cagr_pct,
    computed_at: new Date(),
  }
}

/**
 * Get boost points for a sector tier.
 * Applied in scoreProject() after base score.
 */
export function getTierBoost(tier: SectorTier): number {
  switch (tier) {
    case 'tier1':
      return 10
    case 'tier2':
      return 5
    case 'tier3':
      return 0
    default:
      return 0
  }
}
