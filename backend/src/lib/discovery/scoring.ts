// backend/src/lib/discovery/scoring.ts
import { Intent, BudgetStatus } from './types'
import { BUDGET_TOLERANCE_WARN, HEADROOM_CAP } from './constants'

export function buildPriceRangeLabel(minP: number | null, maxP: number | null): string {
  if (minP != null) {
    return maxP != null && maxP > minP
      ? `₹${minP.toFixed(2)}–${maxP.toFixed(2)}Cr`
      : `₹${minP.toFixed(2)}Cr+`
  }
  return 'Price on request'
}

/**
 * Derive budget status for a project against the intent ceiling.
 * Uses the lowest price_min_cr across the provided unit types.
 * Returns undefined when no budget intent or no price data.
 */
export function computeBudgetStatus(
  unitTypes: Array<{ price_min_cr: number | null }>,
  intent: Intent
): BudgetStatus | undefined {
  if (!intent.budgetMax) return undefined

  const prices = unitTypes
    .map((u) => u.price_min_cr)
    .filter((p): p is number => p != null)

  if (prices.length === 0) return undefined

  const lowestPrice = Math.min(...prices)

  if (lowestPrice <= intent.budgetMax) return 'within'
  if (lowestPrice <= intent.budgetMax * BUDGET_TOLERANCE_WARN) return 'slightly_over'
  return 'over'
}

/**
 * Score a project candidate against soft preference signals only.
 * Hard filters (sector, BHK, builder, project name) have already been applied
 * at the DB query level — they do not participate in scoring.
 *
 * Maximum score: 60 points.
 *
 * Signals:
 *   Possession fit      0–20 pts
 *   Value headroom      0–15 pts  (rewards within-budget projects with price room)
 *   Area fit            0–10 pts
 *   Lifestyle match     0–8  pts
 *   Builder quality     0–4  pts
 *   Data quality        0–3  pts
 *
 * Budget penalty (applied last, never takes score below 0):
 *   slightly_over       −5 pts
 *   over                −10 pts
 */
export function scoreProject(
  p: {
    unit_types: Array<{
      bhk: number
      price_min_cr: number | null
      price_max_cr: number | null
      carpet_area_sqft: number | null
    }>
    possession_date: Date | null
    amenities: Array<{ name: string }>
    ai_search_keywords: string[]
    builder: {
      credai_member?: boolean | null
      delivered_units?: number | null
      awards_count?: number | null
      legal_flag?: string | null
    }
    hero_image_url: string | null
    images: Array<{ type: string }>
    rera_number: string | null
    recommendation_profile?: { tier?: string | null } | null
    project_risk_flag?: string | null
    persona_profile?: {
      primary_persona?: string | null
      secondary_personas?: string[]
    } | null
  },
  intent: Intent,
  budgetStatus?: BudgetStatus
): number {
  if (!p) return 0
  let score = 0

  // ── Possession fit (max 20) ─────────────────────────────────────────
  if (intent.possession && p.possession_date) {
    const months = (p.possession_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
    if      (intent.possession === 'immediate' && months <= 3)  score += 20
    else if (intent.possession === '1year'     && months <= 12) score += 20
    else if (intent.possession === '1year'     && months <= 18) score += 14
    else if (intent.possession === '2year'     && months <= 24) score += 20
    else if (intent.possession === '2year'     && months <= 30) score += 14
    else if (intent.possession === '3year+')                    score += 20
    else                                                        score += 3
  } else if (!intent.possession) {
    score += 10 // neutral when no timeline specified
  } else {
    score += 5  // possession intent set but no date on project
  }

  // ── Value headroom (max 15) ─────────────────────────────────────────
  // Only applies to within-budget projects — rewards better value relative
  // to the ceiling. Over-budget projects get 0 here (penalty applied later).
  if (intent.budgetMax && budgetStatus === 'within') {
    const prices = p.unit_types
      .map((u) => u.price_min_cr)
      .filter((x): x is number => x != null)
    if (prices.length) {
      const lowestPrice = Math.min(...prices)
      const headroom = (intent.budgetMax - lowestPrice) / intent.budgetMax
      score += Math.round(Math.min(headroom, HEADROOM_CAP) * 15)
    } else {
      score += 5 // no price data but passed hard filter — neutral
    }
  } else if (!intent.budgetMax) {
    score += 8 // no budget intent — neutral
  }
  // slightly_over / over → 0 headroom points (penalty applied below)

  // ── Area fit (max 10) ───────────────────────────────────────────────
  if (intent.areaMin || intent.areaMax) {
    const fits = p.unit_types.some(
      (u) =>
        u.carpet_area_sqft != null &&
        (!intent.areaMin || u.carpet_area_sqft >= intent.areaMin) &&
        (!intent.areaMax || u.carpet_area_sqft <= intent.areaMax)
    )
    score += fits ? 10 : 0
  } else {
    score += 5 // no area intent — neutral
  }

  // ── Lifestyle keyword match (max 8) ─────────────────────────────────
  // Checks amenity names AND project-level ai_search_keywords.
  if (intent.lifestyleKeywords?.length) {
    const searchText = [
      ...p.amenities.map((a) => a.name.toLowerCase()),
      ...p.ai_search_keywords.map((k) => k.toLowerCase()),
    ].join(' ')
    const matchCount = intent.lifestyleKeywords.filter((kw) =>
      searchText.includes(kw.toLowerCase())
    ).length
    score += Math.round((matchCount / intent.lifestyleKeywords.length) * 8)
  } else {
    score += 4 // no lifestyle intent — neutral
  }

  // ── Builder quality (max 4) ─────────────────────────────────────────
  if (p.builder.credai_member)               score += 2
  if ((p.builder.delivered_units ?? 0) > 0)  score += 1
  if ((p.builder.awards_count ?? 0) > 0)     score += 1

  // ── Data quality (max 3) ────────────────────────────────────────────
  if (p.hero_image_url || p.images.some((i) => i.type === 'exterior' || i.type === 'hero')) score += 2
  if (p.rera_number)    score += 1

  // ── Recommendation tier ──────────────────────────────────────────────
  const tier = p.recommendation_profile?.tier
  if      (tier === 'STRONG_BUY') score += 8
  else if (tier === 'BUY')        score += 4
  else if (tier === 'WATCH')      score -= 4
  else if (tier === 'AVOID')      score -= 25
  // HOLD: ±0

  // ── Persona match (max +5) ───────────────────────────────────────────
  if (p.persona_profile && intent.purpose) {
    const primary   = p.persona_profile.primary_persona ?? ''
    const secondary = p.persona_profile.secondary_personas ?? []
    if (intent.purpose === 'investment') {
      if (primary === 'INVESTOR')              score += 5
      else if (secondary.includes('INVESTOR')) score += 2
    } else {
      const END_USE = new Set(['FAMILY', 'PROFESSIONAL', 'UPGRADER', 'RETIREE', 'NRI'])
      if (END_USE.has(primary))                         score += 5
      else if (secondary.some((s) => END_USE.has(s)))   score += 2
    }
  }

  // ── Risk penalties ───────────────────────────────────────────────────
  if (p.project_risk_flag)    score -= 20
  if (p.builder.legal_flag)   score -= 15

  // ── Budget penalty ───────────────────────────────────────────────────
  // Applied last so within-budget results always outrank over-budget
  // results with otherwise identical soft signals.
  if (budgetStatus === 'slightly_over') score -= 5
  if (budgetStatus === 'over')          score -= 10

  // ── Risk-averse buyer disqualification ──────────────────────────────
  // NRI / retiree / risk_averse / first_time_buyer: projects with NCLT or
  // insolvency exposure are disqualified. -100 drives score to 0 so the
  // SCORE_THRESHOLD filter removes them. They may appear as "not recommended"
  // in the LLM response but must not rank in the results list.
  if (intent.riskProfile) {
    const legalText = (p.builder.legal_flag ?? '').toLowerCase()
    const riskText  = (p.project_risk_flag   ?? '').toLowerCase()
    const hasInsolvencyRisk =
      legalText.includes('nclt') || legalText.includes('insolvency') ||
      riskText.includes('nclt')  || riskText.includes('insolvency')
    if (hasInsolvencyRisk) score -= 100
  }

  return Math.max(score, 0)
}

export function buildMatchReason(
  p: {
    unit_types: Array<{ bhk: number; price_min_cr: number | null }>
    sector: string
  },
  intent: Intent,
  budgetStatus?: BudgetStatus
): string {
  const { matchReasons } = buildMatchSignals(p, intent, budgetStatus)
  return matchReasons.length > 0 ? matchReasons.join(', ') : 'matches your search'
}

/**
 * Derive rich match reasons and concerns for a project candidate.
 * Called from mapToScored — inputs already have full project shape.
 */
export function buildMatchSignals(
  p: {
    unit_types: Array<{ bhk: number; price_min_cr: number | null }>
    sector: string
    rera_number?: string | null
    possession_date?: Date | null
    possession_label?: string | null
    status?: string
    project_risk_flag?: string | null
    builder?: {
      credai_member?: boolean | null
      delivered_units?: number | null
      legal_flag?: string | null
    }
    decision_profile?: {
      why_avoid?: string[]
    } | null
    recommendation_profile?: {
      tier?: string | null
    } | null
    amenities?: Array<{ name: string }>
    ai_search_keywords?: string[]
  },
  intent: Intent,
  budgetStatus?: BudgetStatus
): { matchReasons: string[]; concerns: string[] } {
  const matchReasons: string[] = []
  const concerns:     string[] = []

  // ── Match reasons ──────────────────────────────────────────────────────────

  // BHK config
  if (intent.bhk?.length) {
    const matchingBhks = p.unit_types
      .filter((u) => intent.bhk!.includes(u.bhk))
      .map((u) => u.bhk)
    if (matchingBhks.length > 0) {
      const label = [...new Set(matchingBhks)].sort().map(b => `${b} BHK`).join(' & ')
      matchReasons.push(`${label} available`)
    }
  }

  // Budget
  if (budgetStatus === 'within' && intent.budgetMax) {
    const prices = p.unit_types.map(u => u.price_min_cr).filter((x): x is number => x != null)
    if (prices.length) {
      const lowest = Math.min(...prices)
      const headroomPct = Math.round(((intent.budgetMax - lowest) / intent.budgetMax) * 100)
      if (headroomPct >= 15) matchReasons.push(`₹${lowest.toFixed(2)}Cr — good value vs your budget`)
      else                   matchReasons.push('within your budget')
    } else {
      matchReasons.push('within your budget')
    }
  }

  // Sector
  if (intent.sector && p.sector.toLowerCase().includes(intent.sector.toLowerCase())) {
    matchReasons.push(`in ${p.sector}`)
  }

  // Lifestyle keyword matches
  if (intent.lifestyleKeywords?.length && (p.amenities?.length || p.ai_search_keywords?.length)) {
    const searchText = [
      ...(p.amenities ?? []).map(a => a.name.toLowerCase()),
      ...(p.ai_search_keywords ?? []).map(k => k.toLowerCase()),
    ].join(' ')
    const matched = intent.lifestyleKeywords.filter(kw => searchText.includes(kw.toLowerCase()))
    if (matched.length > 0) {
      matchReasons.push(`has ${matched.slice(0, 2).join(', ')}`)
    }
  }

  // RERA registered
  if (p.rera_number) matchReasons.push('RERA registered')

  // Possession / ready to move
  if (p.status === 'ready_to_move') {
    matchReasons.push('ready to move')
  } else if (p.possession_date) {
    const months = (p.possession_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
    if (months <= 6)  matchReasons.push('possession in 6 months')
    else if (months <= 12) matchReasons.push('possession within a year')
  } else if (p.possession_label) {
    matchReasons.push(`possession ${p.possession_label}`)
  }

  // Builder track record
  if (p.builder?.credai_member)                    matchReasons.push('CREDAI member builder')
  else if ((p.builder?.delivered_units ?? 0) > 0)  matchReasons.push('established builder')

  // Recommendation tier
  if (p.recommendation_profile?.tier === 'STRONG_BUY') matchReasons.push('strong buy')
  else if (p.recommendation_profile?.tier === 'BUY')   matchReasons.push('recommended')

  // ── Concerns ──────────────────────────────────────────────────────────────

  // Budget over
  if (budgetStatus === 'slightly_over' && intent.budgetMax) {
    const prices = p.unit_types.map(u => u.price_min_cr).filter((x): x is number => x != null)
    if (prices.length) {
      const lowest = Math.min(...prices)
      const overAmt = (lowest - intent.budgetMax).toFixed(2)
      concerns.push(`₹${overAmt}Cr above your budget`)
    } else {
      concerns.push('slightly above your budget')
    }
  } else if (budgetStatus === 'over') {
    concerns.push('above your budget')
  }

  // Risk flags
  if (p.project_risk_flag) concerns.push(p.project_risk_flag)
  if (p.builder?.legal_flag) concerns.push(p.builder.legal_flag)

  // why_avoid signals (first entry only to keep cards clean)
  if (p.decision_profile?.why_avoid?.length) {
    const top = p.decision_profile.why_avoid[0]
    if (top && top.trim().length > 0) concerns.push(top)
  }

  // No price data
  const hasPrices = p.unit_types.some(u => u.price_min_cr != null)
  if (!hasPrices) concerns.push('pricing not disclosed')

  return { matchReasons, concerns }
}
