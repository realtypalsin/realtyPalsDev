/**
 * Phase 5: Ranking Profiles
 *
 * Deterministic mappings from queryKind=RANKING + phrasing to sorting profiles.
 * Each profile defines:
 * - Sort order and weights
 * - Which project_dna scores dominate the ranking
 * - Applicable filters
 */

export type RankingProfile =
  | 'overall'      // Balanced overall score
  | 'value'        // Price + amenities
  | 'trust'        // Builder + legal
  | 'speed'        // Possession timeline
  | 'premium'      // Price descending (luxury)
  | 'family'       // Family amenities

export interface ProfileDefinition {
  name: RankingProfile
  description: string
  // How to interpret project_dna scores
  scoreWeights: {
    overall?: number
    price?: number
    builder?: number
    legal?: number
    amenity?: number
    location?: number
    possession?: number
  }
  // Sort key and direction
  sortBy: 'score' | 'possession_date' | 'price_min'
  sortDirection: 'asc' | 'desc'
  // Apply post-sort filters?
  filterMinScore?: number
  filterMaxPossessionMonths?: number
}

export const RANKING_PROFILES: Record<RankingProfile, ProfileDefinition> = {
  overall: {
    name: 'overall',
    description: 'Overall project score (balanced)',
    scoreWeights: {
      overall: 1,
    },
    sortBy: 'score',
    sortDirection: 'desc',
  },
  value: {
    name: 'value',
    description: 'Best value — price position + amenities',
    scoreWeights: {
      price: 0.5,
      amenity: 0.5,
    },
    sortBy: 'score',
    sortDirection: 'desc',
  },
  trust: {
    name: 'trust',
    description: 'Trust — builder reputation + legal standing',
    scoreWeights: {
      builder: 0.6,
      legal: 0.4,
    },
    sortBy: 'score',
    sortDirection: 'desc',
  },
  speed: {
    name: 'speed',
    description: 'Fastest possession',
    scoreWeights: {
      possession: 1,
    },
    sortBy: 'possession_date',
    sortDirection: 'asc',
    filterMaxPossessionMonths: 36, // Filter out anything >3yr
  },
  premium: {
    name: 'premium',
    description: 'Premium / luxury (highest price)',
    scoreWeights: {
      price: 1,
    },
    sortBy: 'price_min',
    sortDirection: 'desc',
  },
  family: {
    name: 'family',
    description: 'Best for families — schools, amenities',
    scoreWeights: {
      amenity: 0.6,
      location: 0.4,
    },
    sortBy: 'score',
    sortDirection: 'desc',
  },
}

/**
 * Parse ranking phrasing to infer the ranking profile.
 * Called from queryClassifier deterministic pass.
 *
 * Examples:
 * - "best value" / "best bang for buck" / "value for money" → value
 * - "fastest" / "quickest possession" / "ready soon" → speed
 * - "safest" / "most trusted" / "best builder" → trust
 * - "top" / "best" / "highest rated" → overall
 * - "luxury" / "premium" / "most expensive" → premium
 * - "best for families" / "schools nearby" → family
 */
export function inferRankingProfile(userMessage: string): RankingProfile | null {
  const msg = userMessage.toLowerCase()

  // Value patterns
  if (/\b(best\s+value|value\s+for\s+money|best\s+bang|best\s+deal|cheap|affordab|budget|cost-effect|headroom|price\s+position|lowest\s+price|friendly)/i.test(msg)) {
    return 'value'
  }

  // Speed patterns
  if (/\b(fastest|quickest|soonest|immediate|ready\s+soon|ready\s+to\s+move|quick\s+possess|earliest\s+posses|urgent|asap)/i.test(msg)) {
    return 'speed'
  }

  // Trust patterns
  if (/\b(safest|safe|trusted|trust|credai|reputable|established|builder\s+track|safe\s+builder|legal|rera)/i.test(msg)) {
    return 'trust'
  }

  // Family patterns
  if (/\b(families|family|schools|school\s+nearby|education|kids|children|family-oriented|family\s+friendly)/i.test(msg)) {
    return 'family'
  }

  // Premium patterns
  if (/\b(luxury|premium|high-end|most\s+expensive|expensive|top-end|upmarket|pricey|luxury\s+living)/i.test(msg)) {
    return 'premium'
  }

  // Overall/top patterns (default)
  if (/\b(best|top|highest|highest\s+rated|best\s+overall|overall\s+best|top\s+picks)/i.test(msg)) {
    return 'overall'
  }

  return null
}

/**
 * Get the ranking basis explanation for a given profile.
 * Always included in the AI response to explain how results are ranked.
 */
export function getRankingBasis(profile: RankingProfile): string {
  switch (profile) {
    case 'overall':
      return '⭐ Top verified matches ranked by RealtyScore™ (builder track record, location & construction quality)'
    case 'value':
      return '💰 Best value projects ranked by entry price & amenity weighting'
    case 'trust':
      return '🛡️ Top trusted developers with proven track records & clean legal standing'
    case 'speed':
      return '🔑 Ready to move & fastest possession projects'
    case 'premium':
      return '✨ Premium luxury residences'
    case 'family':
      return '🏡 Top family-friendly communities near schools & parks'
    default:
      return 'Top verified matches ranked by fit'
  }
}
