// Pure-sync Decision Intelligence engine.
// All functions operate on already-fetched data — zero additional DB calls.
// Designed to run inside mapToScored() with negligible latency.

// ─── Types ────────────────────────────────────────────────────────────────────

export type IntelligenceStatus = 'Verified' | 'Estimated' | 'Unavailable'

export interface DecisionDimension {
  key: string
  label: string
  score: number        // 0–100
  stars: number        // 1–5
  description: string  // Excellent / Strong / Good / Fair / Weak
  basis: string        // one-line human reason
  status: IntelligenceStatus
}

export interface DecisionIntelligence {
  overallScore: number         // 0–100 weighted
  confidence: 'High' | 'Medium' | 'Low'
  tier: string                 // STRONG_BUY | BUY | HOLD | WATCH | AVOID
  dimensions: DecisionDimension[]
  topStrengths: string[]       // max 3
  tradeoffs: string[]          // max 3
  bottomLine: string           // 1 sentence, decision-focused
}

export interface WhyNot {
  reasons: Array<{
    rank: number
    label: string
    detail: string
  }>
}

export interface IntelligenceCompleteness {
  builderTrust: IntelligenceStatus
  deliveryConfidence: IntelligenceStatus
  locationQuality: IntelligenceStatus
  valuePositioning: IntelligenceStatus
  lifestyleDepth: IntelligenceStatus
  legalStanding: IntelligenceStatus
  overallCoverage: 'Full' | 'Partial' | 'Limited'
  missingFields: string[]
}

export interface BuyerPersona {
  type: 'Families' | 'Investors' | 'Luxury' | 'NRIs' | 'End Users'
  stars: number       // 1–5
  headline: string    // one phrase
  reasons: string[]   // exactly 3 bullets
}

export interface DealBreaker {
  label: string
  detail: string
  severity: 'Caution' | 'Consider' | 'Dealbreaker'
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n))
}

const NEUTRAL = 50

function toStars(score: number): number {
  if (score >= 80) return 5
  if (score >= 65) return 4
  if (score >= 50) return 3
  if (score >= 35) return 2
  return 1
}

function describe(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 65) return 'Strong'
  if (score >= 50) return 'Good'
  if (score >= 35) return 'Fair'
  return 'Weak'
}

function tierFromScore(
  score: number,
  riskFlag: string | null | undefined,
  legalFlag: string | null | undefined,
): string {
  if (legalFlag) return 'AVOID'
  if (riskFlag && score >= 63) return 'WATCH'
  if (score >= 78) return 'STRONG_BUY'
  if (score >= 63) return 'BUY'
  if (score >= 48) return 'HOLD'
  if (score >= 33) return 'WATCH'
  return 'AVOID'
}

// Input shape — subset of ScoredProject (all available after mapToScored fetch)
interface IntelligenceInput {
  dna?: {
    builder_track_record_score?: number | null
    rera_compliance_score?: number | null
    possession_certainty_score?: number | null
    price_position_score?: number | null
    locality_score?: number | null
    amenity_depth_score?: number | null
    builder_track_record_label?: string | null
    rera_compliance_label?: string | null
    possession_certainty_label?: string | null
    price_position_label?: string | null
    locality_label?: string | null
    amenity_depth_label?: string | null
  } | null
  project_risk_flag?: string | null
  rera_number?: string | null
  status?: string | null
  possession_date?: string | null
  builder?: {
    name?: string | null
    legal_flag?: string | null
    credai_member?: boolean | null
    delivered_units?: number | null
    awards_count?: number | null
  }
  decision_profile?: {
    why_buy?: string[] | null
    why_avoid?: string[] | null
    decision_thesis?: string | null
    best_for?: string | null
  } | null
  recommendation_profile?: {
    tier?: string | null
  } | null
  persona_profile?: {
    primary_persona?: string | null
    risk_appetite?: string | null
    timeline_horizon?: string | null
  } | null
  sector?: string | null
  amenities?: Array<{ name: string }> | null
  connectivity?: Array<{ name: string; type?: string }> | null
}

// ─── Decision Intelligence ────────────────────────────────────────────────────

export function buildDecisionIntelligence(p: IntelligenceInput): DecisionIntelligence {
  const dna = p.dna
  const legalFlag = p.builder?.legal_flag ?? null
  const riskFlag  = p.project_risk_flag ?? null

  // Raw scores (0–100)
  const builderScore   = dna?.builder_track_record_score ?? NEUTRAL
  const reraScore      = dna?.rera_compliance_score      ?? NEUTRAL
  const possessionScore = dna?.possession_certainty_score ?? NEUTRAL
  const valueScore     = dna?.price_position_score       ?? NEUTRAL
  const locationScore  = dna?.locality_score             ?? NEUTRAL
  const lifestyleScore = dna?.amenity_depth_score        ?? NEUTRAL

  // Risk score: composite of RERA + delivery, hard-capped by flags
  let riskScore = clamp(reraScore * 0.5 + possessionScore * 0.5)
  if (riskFlag)  riskScore = Math.min(riskScore, 30)
  if (legalFlag) riskScore = Math.min(riskScore, 10)

  // Weighted overall (mirrors recommendation/score.ts weights)
  const overallScore = clamp(
    builderScore   * 0.20 +
    valueScore     * 0.20 +
    locationScore  * 0.15 +
    riskScore      * 0.15 +
    lifestyleScore * 0.10 +
    possessionScore * 0.10 +
    reraScore      * 0.10,
  )
  const overall = Math.round(overallScore)

  const tier = tierFromScore(overall, riskFlag, legalFlag)

  // Confidence: how many DNA fields are present
  const dnaFields = [
    dna?.builder_track_record_score,
    dna?.rera_compliance_score,
    dna?.possession_certainty_score,
    dna?.price_position_score,
    dna?.locality_score,
    dna?.amenity_depth_score,
  ]
  const presentCount = dnaFields.filter((f) => f != null).length
  const confidence: 'High' | 'Medium' | 'Low' =
    presentCount >= 5 ? 'High' : presentCount >= 3 ? 'Medium' : 'Low'

  // Builder trust dimension
  const builderBasis = (() => {
    const b = p.builder
    if (legalFlag) return 'Legal dispute flag present — verify before proceeding'
    if (b?.credai_member && (b.delivered_units ?? 0) > 1000) return 'CREDAI member with large delivery portfolio'
    if (b?.delivered_units && b.delivered_units > 500) return 'Established builder with significant delivery track record'
    if (b?.awards_count && b.awards_count > 0) return 'Award-winning builder'
    if (builderScore >= 65) return 'Strong builder credentials in this market'
    return 'Builder credentials at market average'
  })()

  // RERA dimension basis
  const reraBasis = (() => {
    if (!p.rera_number) return 'RERA registration not verified'
    if (reraScore >= 70) return 'Project has active RERA registration'
    return 'RERA registered — verify completion status'
  })()

  // Possession dimension basis
  const possessionBasis = (() => {
    if (p.status === 'ready_to_move') return 'Ready to move in — no delivery risk'
    if (possessionScore >= 70) return 'Builder has strong on-time delivery record'
    if (possessionScore >= 50) return 'Possession timeline has moderate certainty'
    return 'Delivery certainty is limited — review builder track record'
  })()

  // Value dimension basis
  const valueBasis = (() => {
    if (valueScore >= 70) return 'Priced below sector average — good value headroom'
    if (valueScore >= 50) return 'Market-rate pricing for this sector'
    return 'Premium priced — verify amenity and location justification'
  })()

  // Location dimension basis
  const locationBasis = (() => {
    const sector = p.sector ?? 'this sector'
    if (locationScore >= 70) return `Well-connected location in ${sector}`
    if (locationScore >= 50) return `Average connectivity for ${sector}`
    return `Location scores below sector average — review commute`
  })()

  // Lifestyle dimension basis
  const lifestyleBasis = (() => {
    const amenityCount = p.amenities?.length ?? 0
    if (amenityCount >= 8) return `${amenityCount}+ amenities including premium facilities`
    if (amenityCount >= 4) return `${amenityCount} standard amenities`
    if (lifestyleScore >= 65) return 'Strong lifestyle offering for the segment'
    return 'Basic amenity set — verify project features'
  })()

  const dimensions: DecisionDimension[] = [
    {
      key: 'builderTrust',
      label: 'Builder Trust',
      score: Math.round(builderScore),
      stars: legalFlag ? 1 : toStars(builderScore),
      description: legalFlag ? 'Weak' : describe(builderScore),
      basis: builderBasis,
      status: dna?.builder_track_record_score != null ? 'Verified' : 'Estimated',
    },
    {
      key: 'deliveryConfidence',
      label: 'Delivery Confidence',
      score: Math.round(possessionScore),
      stars: riskFlag ? Math.min(toStars(possessionScore), 2) : toStars(possessionScore),
      description: riskFlag ? 'Fair' : describe(possessionScore),
      basis: possessionBasis,
      status: dna?.possession_certainty_score != null ? 'Verified' : 'Estimated',
    },
    {
      key: 'locationQuality',
      label: 'Location Quality',
      score: Math.round(locationScore),
      stars: toStars(locationScore),
      description: describe(locationScore),
      basis: locationBasis,
      status: dna?.locality_score != null ? 'Verified' : 'Estimated',
    },
    {
      key: 'valuePositioning',
      label: 'Value',
      score: Math.round(valueScore),
      stars: toStars(valueScore),
      description: describe(valueScore),
      basis: valueBasis,
      status: dna?.price_position_score != null ? 'Verified' : 'Estimated',
    },
    {
      key: 'lifestyleDepth',
      label: 'Lifestyle',
      score: Math.round(lifestyleScore),
      stars: toStars(lifestyleScore),
      description: describe(lifestyleScore),
      basis: lifestyleBasis,
      status: dna?.amenity_depth_score != null ? 'Verified' : 'Estimated',
    },
    {
      key: 'legalStanding',
      label: 'Legal Standing',
      score: Math.round(riskScore),
      stars: legalFlag ? 1 : riskFlag ? Math.min(toStars(riskScore), 2) : toStars(riskScore),
      description: legalFlag ? 'Weak' : riskFlag ? 'Fair' : describe(riskScore),
      basis: legalFlag
        ? 'Legal dispute flag — admin verification required'
        : riskFlag
          ? 'Risk flag raised — verify RERA status and builder disputes'
          : reraBasis,
      status: p.rera_number ? 'Verified' : 'Estimated',
    },
  ]

  // Top strengths (from best dimensions)
  const sorted = [...dimensions].sort((a, b) => b.score - a.score)
  const topStrengths = sorted
    .filter((d) => d.score >= 65)
    .slice(0, 3)
    .map((d) => d.basis)

  // If no strong dims, fall through to admin-filled decision_profile
  const whyBuy = p.decision_profile?.why_buy ?? []
  const finalStrengths = topStrengths.length >= 1 ? topStrengths : whyBuy.slice(0, 3)

  // Trade-offs (from weakest dimensions + risk signals)
  const tradeoffs: string[] = []
  if (legalFlag) tradeoffs.push('Legal dispute flag: admin verification required before proceeding')
  if (riskFlag && !legalFlag) tradeoffs.push('Risk flag raised: independently verify builder track record and RERA status')
  sorted
    .filter((d) => d.score < 50 && !tradeoffs.some((t) => t.includes(d.label)))
    .slice(0, 3 - tradeoffs.length)
    .forEach((d) => tradeoffs.push(d.basis))

  // Bottom line from decision_profile thesis, or derive from tier
  const bottomLine = (() => {
    const thesis = p.decision_profile?.decision_thesis
    if (thesis && thesis.length < 160) return thesis
    if (tier === 'STRONG_BUY') return 'Strong all-round score — this project stands out in its segment.'
    if (tier === 'BUY')        return 'Good fundamentals — worth serious consideration.'
    if (tier === 'HOLD')       return 'Acceptable option — verify specific concerns before committing.'
    if (tier === 'WATCH')      return 'Below-average signals — compare with alternatives carefully.'
    return 'Significant concerns present — do thorough due diligence.'
  })()

  return {
    overallScore: overall,
    confidence,
    tier,
    dimensions,
    topStrengths: finalStrengths,
    tradeoffs: tradeoffs.slice(0, 3),
    bottomLine,
  }
}

// ─── Why Not (vs top project) ─────────────────────────────────────────────────

export function buildWhyNot(
  project: IntelligenceInput & { matchScore?: number; name?: string },
  topProject: IntelligenceInput & { matchScore?: number; name?: string },
): WhyNot {
  const reasons: Array<{ rank: number; label: string; detail: string }> = []

  const pDna = project.dna
  const tDna = topProject.dna

  // Score gap
  const pScore = project.matchScore ?? 0
  const tScore = topProject.matchScore ?? 0
  if (tScore - pScore > 5) {
    reasons.push({
      rank: 1,
      label: 'Overall match score',
      detail: `Ranked lower on combined criteria — scored ${Math.round(pScore)} vs ${Math.round(tScore)} for the top pick`,
    })
  }

  // Builder track record gap
  const pBuilder = pDna?.builder_track_record_score ?? NEUTRAL
  const tBuilder = tDna?.builder_track_record_score ?? NEUTRAL
  if (tBuilder - pBuilder >= 15) {
    reasons.push({
      rank: reasons.length + 1,
      label: 'Builder confidence',
      detail: `${topProject.name ?? 'Top pick'}'s builder has a stronger verified delivery track record`,
    })
  }

  // Value gap
  const pValue = pDna?.price_position_score ?? NEUTRAL
  const tValue = tDna?.price_position_score ?? NEUTRAL
  if (tValue - pValue >= 15) {
    reasons.push({
      rank: reasons.length + 1,
      label: 'Value positioning',
      detail: `${topProject.name ?? 'Top pick'} offers better value relative to sector pricing`,
    })
  }

  // Location gap
  const pLoc = pDna?.locality_score ?? NEUTRAL
  const tLoc = tDna?.locality_score ?? NEUTRAL
  if (tLoc - pLoc >= 15) {
    reasons.push({
      rank: reasons.length + 1,
      label: 'Location quality',
      detail: `${topProject.name ?? 'Top pick'} is in a better-connected location`,
    })
  }

  // Possession gap
  const pPoss = pDna?.possession_certainty_score ?? NEUTRAL
  const tPoss = tDna?.possession_certainty_score ?? NEUTRAL
  if (tPoss - pPoss >= 15) {
    reasons.push({
      rank: reasons.length + 1,
      label: 'Delivery confidence',
      detail: `${topProject.name ?? 'Top pick'} has higher possession certainty`,
    })
  }

  // Risk flag penalty
  if (project.project_risk_flag && !topProject.project_risk_flag) {
    reasons.push({
      rank: reasons.length + 1,
      label: 'Risk flag',
      detail: 'This project carries a risk flag not present in the top recommendation',
    })
  }

  // Lifestyle gap
  const pLife = pDna?.amenity_depth_score ?? NEUTRAL
  const tLife = tDna?.amenity_depth_score ?? NEUTRAL
  if (tLife - pLife >= 15) {
    reasons.push({
      rank: reasons.length + 1,
      label: 'Lifestyle offering',
      detail: `${topProject.name ?? 'Top pick'} has a deeper amenity set`,
    })
  }

  // Ensure at least 1 reason even if no gap is dominant
  if (reasons.length === 0) {
    reasons.push({
      rank: 1,
      label: 'Marginal score difference',
      detail: 'Both projects score similarly — the top pick edged ahead on combined weighted criteria',
    })
  }

  return { reasons: reasons.slice(0, 3).map((r, i) => ({ ...r, rank: i + 1 })) }
}

// ─── Intelligence Completeness ────────────────────────────────────────────────

export function buildIntelligenceCompleteness(p: IntelligenceInput): IntelligenceCompleteness {
  const dna = p.dna
  const missing: string[] = []

  const builderTrust: IntelligenceStatus    = dna?.builder_track_record_score != null ? 'Verified' : (missing.push('Builder track record score'), 'Unavailable')
  const deliveryConf: IntelligenceStatus    = dna?.possession_certainty_score != null ? 'Verified' : (missing.push('Possession certainty'), 'Unavailable')
  const locationQuality: IntelligenceStatus = dna?.locality_score != null ? 'Verified' : (missing.push('Locality score'), 'Unavailable')
  const valuePositioning: IntelligenceStatus = dna?.price_position_score != null ? 'Verified' : (missing.push('Price positioning'), 'Unavailable')
  const lifestyleDepth: IntelligenceStatus  = dna?.amenity_depth_score != null ? 'Verified' : (missing.push('Amenity depth'), 'Unavailable')
  const legalStanding: IntelligenceStatus   = p.rera_number ? 'Verified' : (missing.push('RERA registration'), 'Estimated')

  const verifiedCount = [builderTrust, deliveryConf, locationQuality, valuePositioning, lifestyleDepth, legalStanding]
    .filter((s) => s === 'Verified').length

  const overallCoverage: 'Full' | 'Partial' | 'Limited' =
    verifiedCount >= 5 ? 'Full' : verifiedCount >= 3 ? 'Partial' : 'Limited'

  return {
    builderTrust,
    deliveryConfidence: deliveryConf,
    locationQuality,
    valuePositioning,
    lifestyleDepth,
    legalStanding,
    overallCoverage,
    missingFields: missing,
  }
}

// ─── Buyer Personas ───────────────────────────────────────────────────────────

export function buildBuyerPersonas(p: IntelligenceInput): BuyerPersona[] {
  const dna = p.dna
  const locationScore  = dna?.locality_score ?? NEUTRAL
  const lifestyleScore = dna?.amenity_depth_score ?? NEUTRAL
  const valueScore     = dna?.price_position_score ?? NEUTRAL
  const builderScore   = dna?.builder_track_record_score ?? NEUTRAL
  const reraScore      = dna?.rera_compliance_score ?? NEUTRAL
  const possessionScore = dna?.possession_certainty_score ?? NEUTRAL
  const riskFlag       = p.project_risk_flag
  const isRTM          = p.status === 'ready_to_move'
  const persona        = p.persona_profile?.primary_persona?.toLowerCase() ?? ''

  const familyScore = Math.round(
    lifestyleScore * 0.35 + locationScore * 0.30 + builderScore * 0.20 + valueScore * 0.15,
  )
  const investorScore = Math.round(
    valueScore * 0.30 + locationScore * 0.25 + builderScore * 0.20 + reraScore * 0.15 + possessionScore * 0.10,
  )
  const luxuryScore = Math.round(
    lifestyleScore * 0.40 + builderScore * 0.30 + locationScore * 0.20 + valueScore * 0.10,
  )
  const nriScore = Math.round(
    builderScore * 0.30 + reraScore * 0.25 + locationScore * 0.25 + possessionScore * 0.20,
  )
  const endUserScore = Math.round(
    locationScore * 0.30 + possessionScore * 0.25 + valueScore * 0.25 + builderScore * 0.20,
  )

  function familyReasons(): string[] {
    const r: string[] = []
    if (lifestyleScore >= 65) r.push('Strong amenity set suitable for children and family recreation')
    else r.push('Amenity depth is average for family needs')
    if (locationScore >= 60) r.push('Good school and hospital connectivity')
    else r.push('School connectivity requires verification')
    if (valueScore >= 55) r.push('Competitive pricing makes it accessible for families upgrading')
    else r.push('Premium pricing limits affordability for mid-segment families')
    return r.slice(0, 3)
  }

  function investorReasons(): string[] {
    const r: string[] = []
    if (valueScore >= 65) r.push('Below-market pricing offers potential appreciation headroom')
    else if (valueScore >= 50) r.push('Market-rate pricing — rental yields will drive returns')
    else r.push('Premium pricing compresses near-term appreciation potential')
    if (locationScore >= 65) r.push('Well-connected location supports consistent rental demand')
    else r.push('Rental demand will depend on sector employment corridor development')
    if (riskFlag) r.push('Risk flag present — conduct independent RERA verification before investing')
    else if (builderScore >= 65) r.push('Builder reputation reduces execution risk on the investment thesis')
    else r.push('Builder track record is average — review past project timelines')
    return r.slice(0, 3)
  }

  function luxuryReasons(): string[] {
    const r: string[] = []
    if (lifestyleScore >= 70) r.push('Premium amenity set aligned with luxury buyer expectations')
    else r.push('Amenity set is standard — may not meet ultra-luxury benchmarks')
    if (builderScore >= 70) r.push('Established builder with credibility in the premium segment')
    else r.push('Builder positioning is mid-market rather than luxury-focused')
    if (locationScore >= 65) r.push('Location confers address value for the target segment')
    else r.push('Sector is still developing its premium identity')
    return r.slice(0, 3)
  }

  function nriReasons(): string[] {
    const r: string[] = []
    if (reraScore >= 65) r.push('Active RERA compliance reduces long-distance ownership risk')
    else r.push('Verify RERA completion certificate status before purchase')
    if (builderScore >= 65) r.push('Builder has reliable domestic track record for remote buyers')
    else r.push('Builder reputation warrants independent reference checks from abroad')
    if (isRTM) r.push('Ready-to-move eliminates construction and delivery risk')
    else if (possessionScore >= 65) r.push('High possession certainty reduces timeline risk for overseas buyers')
    else r.push('Delivery timeline carries uncertainty — factor into NRI investment decision')
    return r.slice(0, 3)
  }

  function endUserReasons(): string[] {
    const r: string[] = []
    if (locationScore >= 65) r.push('Good connectivity to employment hubs and daily needs')
    else r.push('Connectivity meets basic needs but verify commute routes')
    if (isRTM) r.push('Ready to move — no waiting, no rental overlap cost')
    else if (possessionScore >= 65) r.push('High delivery confidence reduces move-in timeline risk')
    else r.push('Possession timeline is uncertain — plan for rental cost overlap')
    if (valueScore >= 55) r.push('Value positioning works in favour of a long-term end-use decision')
    else r.push('Premium pricing means lower scope for future price appreciation')
    return r.slice(0, 3)
  }

  const personas: BuyerPersona[] = [
    {
      type: 'Families',
      stars: toStars(familyScore),
      headline: familyScore >= 65 ? 'Well-suited for families' : familyScore >= 45 ? 'Suitable with trade-offs' : 'Limited family appeal',
      reasons: familyReasons(),
    },
    {
      type: 'Investors',
      stars: riskFlag ? Math.min(toStars(investorScore), 2) : toStars(investorScore),
      headline: investorScore >= 65 ? 'Good investment potential' : investorScore >= 45 ? 'Moderate investment case' : 'Weak investment thesis',
      reasons: investorReasons(),
    },
    {
      type: 'Luxury',
      stars: toStars(luxuryScore),
      headline: luxuryScore >= 65 ? 'Meets luxury standards' : luxuryScore >= 45 ? 'Aspirational but not premium' : 'Not a luxury product',
      reasons: luxuryReasons(),
    },
    {
      type: 'NRIs',
      stars: riskFlag ? Math.min(toStars(nriScore), 2) : toStars(nriScore),
      headline: nriScore >= 65 ? 'NRI-friendly with low remote risk' : nriScore >= 45 ? 'Manageable for NRI buyers' : 'High caution for NRI buyers',
      reasons: nriReasons(),
    },
    {
      type: 'End Users',
      stars: toStars(endUserScore),
      headline: endUserScore >= 65 ? 'Strong end-use case' : endUserScore >= 45 ? 'Reasonable end-use choice' : 'End-use case needs scrutiny',
      reasons: endUserReasons(),
    },
  ]

  // Boost primary persona star rating by 1 if it has a match
  if (persona) {
    const match = personas.find((p2) => p2.type.toLowerCase().includes(persona.split(' ')[0]))
    if (match) match.stars = Math.min(5, match.stars + 1)
  }

  return personas
}

// ─── Deal Breakers / Things to Know ──────────────────────────────────────────

export function buildDealBreakers(p: IntelligenceInput): DealBreaker[] {
  const dna = p.dna
  const items: DealBreaker[] = []

  if (p.builder?.legal_flag) {
    items.push({
      label: 'Builder legal dispute on record',
      detail: 'A legal flag is present against the builder. Independently verify the nature and status of the dispute before proceeding.',
      severity: 'Dealbreaker',
    })
  }

  if (p.project_risk_flag) {
    items.push({
      label: 'Project risk flag raised',
      detail: 'This project has been flagged for elevated risk. Verify RERA status, builder disputes, and construction progress before committing.',
      severity: 'Dealbreaker',
    })
  }

  if (!p.rera_number) {
    items.push({
      label: 'RERA registration not verified',
      detail: 'RERA number is not confirmed in our database. Independently verify registration on the UP-RERA portal before any payment.',
      severity: 'Caution',
    })
  }

  if (p.status === 'under_construction' && (dna?.possession_certainty_score ?? NEUTRAL) < 45) {
    items.push({
      label: 'Possession date certainty is low',
      detail: 'Delivery timeline carries significant uncertainty. Budget for potential rental overlap and ask the builder for a revised possession schedule.',
      severity: 'Consider',
    })
  }

  const valueScore = dna?.price_position_score ?? NEUTRAL
  if (valueScore < 35) {
    items.push({
      label: 'Priced above sector average',
      detail: 'This project is priced at a premium relative to the sector. Verify that amenities, location, or builder brand justify the markup before committing.',
      severity: 'Consider',
    })
  }

  const locationScore = dna?.locality_score ?? NEUTRAL
  if (locationScore < 40) {
    items.push({
      label: 'Below-average location connectivity',
      detail: 'The locality score is below sector average. Do a personal commute test to your workplace and daily destinations before finalising.',
      severity: 'Consider',
    })
  }

  const builderScore = dna?.builder_track_record_score ?? NEUTRAL
  if (builderScore < 40 && !p.builder?.legal_flag) {
    items.push({
      label: 'Builder track record is limited',
      detail: 'The builder has a limited verified delivery history. Ask for references from past buyers and visit a completed project before deciding.',
      severity: 'Caution',
    })
  }

  return items
}
