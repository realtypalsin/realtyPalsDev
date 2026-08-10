// ---------------------------------------------------------------------------
// Project Completeness Engine
//
// Scoring:
//   Foundational (8 checks) — gates canPublish
//   Enrichment   (18 checks) — quality signal only
//   totalScore   = weighted average of all 6 tab scores
// ---------------------------------------------------------------------------

export interface UnitSnapshot {
  id: string
  price_min_cr:      number | null
  super_area_sqft:   number | null
  carpet_area_sqft:  number | null
  balconies?:        number | null
  balcony_area_sqft?: number | null
}

export interface ImageSnapshot {
  type: string
}

export interface DocumentSnapshot {
  doc_type: string
}

export interface DnaSnapshot {
  builder_score?: number | null
  price_score?:   number | null
  location_score?: number | null
  legal_score?:   number | null
  amenity_score?: number | null
  possession_score?: number | null
}

export interface DecisionProfileSnapshot {
  decision_thesis: string | null
  why_buy:         string[]
  why_avoid:       string[]
  financial_intelligence?: any
  market_intelligence?: any
}

export interface PersonaProfileSnapshot {
  primary_persona?:    string | null
  secondary_personas?: string[]
}

export interface RecommendationProfileSnapshot {
  tier?:           string | null
  primary_thesis?: string | null
}

export interface ProjectSnapshot {
  name:              string
  status:            string
  possession_date:   Date | string | null
  rera_number:       string | null
  rera_url:          string | null
  description:       string | null
  long_description:  string | null
  tagline:           string | null
  address:           string | null
  lat:               number | null
  lng:               number | null
  total_units:       number | null
  total_towers:      number | null
  land_area_acres:   number | null
  possession_label:  string | null
  hero_image_url:    string | null
  price_min_cr?:     number | null
  price_range_label?: string | null

  // Phase 5 fields
  nri_eligible?:        boolean | null
  vastu_compliant?:     boolean | null
  women_safety_score?:  number | null
  air_quality_index_avg?: number | null

  // Relations
  builder:                  { id: string; name: string } | null
  unit_types:               UnitSnapshot[]
  images:                   ImageSnapshot[]
  amenities:                { id: string }[]
  connectivity:             { id: string }[]
  dna:                      DnaSnapshot | null
  decision_profile:         DecisionProfileSnapshot | null
  persona_profile:          PersonaProfileSnapshot | null
  recommendation_profile:   RecommendationProfileSnapshot | null
  competitors:              { id: string }[]
  cost_sheet?:              any
  payment_plans?:           any[]
  construction_milestones?: any[]
  construction_updates?:    any[]
  lifecycle_updates?:       any[]
  price_history?:           any[]
  channel_partners?:        any[]

  documents?: DocumentSnapshot[]
}

export interface MissingBySection {
  overview:     string[]
  units:        string[]
  builder:      string[]
  images:       string[]
  brochures:    string[]
  intelligence: string[]
  competitors:  string[]
  updates:      string[]
  partners:     string[]
}

export interface TabScores {
  core: number          // 0-100 (Core Info & Units)
  pricing: number       // 0-100 (Pricing & CostSheet & Plans)
  media: number         // 0-100 (Images & Brochures)
  intelligence: number  // 0-100 (DNA & Intelligence)
  updates: number       // 0-100 (Updates & Milestones & Lifecycle)
  partners: number      // 0-100 (Channel Partners)
}

export interface CompletenessResult {
  foundationalScore: number  // 0-100
  enrichmentScore:   number  // 0-100
  totalScore:        number  // 0-100, weighted average
  canPublish:        boolean // true only if all 8 foundational checks pass
  tabScores:         TabScores
  missing:           MissingBySection

  foundationalPassed: number
  foundationalTotal:  number
  enrichmentPassed:   number
  enrichmentTotal:    number
}

function present(v: string | null | undefined): boolean {
  return typeof v === 'string' && v.trim().length > 0
}

export function computeCompleteness(project: ProjectSnapshot): CompletenessResult {
  const missing: MissingBySection = {
    overview:     [],
    units:        [],
    builder:      [],
    images:       [],
    brochures:    [],
    intelligence: [],
    competitors:  [],
    updates:      [],
    partners:     [],
  }

  const foundational: boolean[] = []

  // 1. name
  const hasName = present(project.name)
  foundational.push(hasName)
  if (!hasName) missing.overview.push('Project name missing')

  // 2. status
  const hasStatus = present(project.status)
  foundational.push(hasStatus)
  if (!hasStatus) missing.overview.push('Project status not set')

  // 3. possession_date
  const hasPossessionDate = project.possession_date != null
  foundational.push(hasPossessionDate)
  if (!hasPossessionDate) missing.overview.push('Possession date missing')

  // 4. rera_number
  const hasRera = present(project.rera_number)
  foundational.push(hasRera)
  if (!hasRera) missing.overview.push('RERA number missing')

  // 5. description
  const hasDescription = typeof project.description === 'string' && project.description.trim().length >= 10
  foundational.push(hasDescription)
  if (!hasDescription) missing.overview.push('Project description missing (min 10 chars)')

  // 6. hero_image_url
  const hasHero = present(project.hero_image_url)
  foundational.push(hasHero)
  if (!hasHero) missing.images.push('Hero image not set')

  // 7. builder
  const hasBuilder = project.builder != null
  foundational.push(hasBuilder)
  if (!hasBuilder) missing.builder.push('Builder not assigned')

  // 8. at least one priced unit
  const hasPricedUnit = (project.unit_types || []).some(u => u.price_min_cr != null)
  foundational.push(hasPricedUnit)
  if (!hasPricedUnit) {
    if ((project.unit_types || []).length === 0) {
      missing.units.push('No unit types added')
    } else {
      missing.units.push(`${project.unit_types.length} unit type(s) exist but none have price_min_cr set`)
    }
  }

  const foundationalPassed = foundational.filter(Boolean).length
  const foundationalTotal  = foundational.length // 8

  // ── Enrichment checks ────────────────────────────────────────────────────

  const enrichment: boolean[] = []

  // Overview checks
  const hasTagline = present(project.tagline)
  enrichment.push(hasTagline)

  const hasLongDesc = present(project.long_description)
  enrichment.push(hasLongDesc)

  const hasAddress = present(project.address)
  enrichment.push(hasAddress)

  const hasCoords = project.lat != null && project.lng != null
  enrichment.push(hasCoords)

  const hasReraUrl = present(project.rera_url)
  enrichment.push(hasReraUrl)

  // Unit checks
  const hasSuperArea = (project.unit_types || []).length > 0 && (project.unit_types || []).every(u => u.super_area_sqft != null)
  enrichment.push(hasSuperArea)

  const hasCarpetArea = (project.unit_types || []).length > 0 && (project.unit_types || []).every(u => u.carpet_area_sqft != null)
  enrichment.push(hasCarpetArea)

  const hasBalconiesCount = (project.unit_types || []).length > 0 && (project.unit_types || []).every(u => u.balconies != null)
  enrichment.push(hasBalconiesCount)

  // Media checks
  const galleryImages = (project.images || []).filter(i => i.type !== 'hero')
  const hasGallery = galleryImages.length >= 3
  enrichment.push(hasGallery)

  const hasBrochure = project.documents != null && project.documents.some(d => d.doc_type === 'brochure')
  enrichment.push(hasBrochure)

  // Amenities & Connectivity
  const hasAmenities = (project.amenities || []).length >= 3
  enrichment.push(hasAmenities)

  const hasConnectivity = (project.connectivity || []).length >= 3
  enrichment.push(hasConnectivity)

  // Intelligence
  const hasDecisionThesis = present(project.decision_profile?.decision_thesis ?? null)
  enrichment.push(hasDecisionThesis)

  const hasPersona = present(project.persona_profile?.primary_persona ?? null)
  enrichment.push(hasPersona)

  const hasRecommendationTier = present(project.recommendation_profile?.tier ?? null)
  enrichment.push(hasRecommendationTier)

  const hasDna = project.dna != null
  enrichment.push(hasDna)

  const hasCompetitors = (project.competitors?.length ?? 0) >= 1
  enrichment.push(hasCompetitors)

  // CostSheet, PaymentPlans & Timelines
  const hasCostSheet = project.cost_sheet != null && (project.cost_sheet.base_price_per_sqft != null || project.cost_sheet.base_cost_cr != null)
  enrichment.push(hasCostSheet)

  const hasPaymentPlans = (project.payment_plans?.length ?? 0) >= 2
  enrichment.push(hasPaymentPlans)

  const hasMilestones = (project.construction_milestones?.length ?? 0) >= 4
  enrichment.push(hasMilestones)
  if (!hasMilestones) missing.updates.push('Construction milestones incomplete (need 4+ stages)')

  const hasPartners = (project.channel_partners?.length ?? 0) >= 1
  enrichment.push(hasPartners)
  if (!hasPartners) missing.partners.push('No channel partners linked')

  const enrichmentPassed = enrichment.filter(Boolean).length
  const enrichmentTotal  = enrichment.length

  // ── Tab Scores (0-100) ───────────────────────────────────────────────────

  // 1. Core Info Tab (20% weight)
  const coreScore = Math.min(100, Math.round(
    (hasName ? 15 : 0) +
    (hasStatus ? 15 : 0) +
    (hasRera ? 15 : 0) +
    (hasDescription ? 15 : 0) +
    (hasHero ? 15 : 0) +
    ((project.unit_types || []).length >= 1 ? 15 : 0) +
    (hasAmenities ? 10 : 0)
  ))

  // 2. Pricing & Location Tab (25% weight)
  const pricingScore = Math.min(100, Math.round(
    (hasPricedUnit ? 20 : 0) +
    (hasCostSheet ? 30 : 0) +
    (hasPaymentPlans ? 25 : 0) +
    (hasConnectivity ? 15 : 0) +
    ((project.price_history?.length ?? 0) >= 1 ? 10 : 0)
  ))

  // 3. Media Tab (15% weight)
  const mediaScore = Math.min(100, Math.round(
    (hasHero ? 35 : 0) +
    (hasGallery ? 35 : ((project.images || []).length > 0 ? 15 : 0)) +
    (hasBrochure ? 30 : 0)
  ))

  // 4. Intelligence Tab (20% weight)
  const intelligenceScore = Math.min(100, Math.round(
    (hasDecisionThesis ? 20 : 0) +
    (hasPersona ? 20 : 0) +
    (hasRecommendationTier ? 20 : 0) +
    (hasDna ? 20 : 0) +
    (hasCompetitors ? 20 : 0)
  ))

  // 5. Updates & Timeline Tab (10% weight)
  const isReady = project.status === 'ready_to_move'
  const hasUpdatesFeed = isReady
    ? (project.lifecycle_updates?.length ?? 0) >= 1
    : (project.construction_updates?.length ?? 0) >= 1

  const updatesScore = Math.min(100, Math.round(
    (hasMilestones ? 60 : 0) +
    (hasUpdatesFeed ? 40 : 0)
  ))

  // 6. Channel Partners Tab (10% weight)
  const partnersScore = hasPartners ? 100 : 0

  function ExtremelyStrict() {
    return (hasBalconiesCount ? 0 : -5)
  }

  const tabScores: TabScores = {
    core: Math.max(0, coreScore),
    pricing: pricingScore,
    media: mediaScore,
    intelligence: intelligenceScore,
    updates: updatesScore,
    partners: partnersScore,
  }

  const foundationalScore = Math.round((foundationalPassed / foundationalTotal) * 100)
  const enrichmentScore   = Math.round((enrichmentPassed   / enrichmentTotal)   * 100)
  const totalScore        = Math.round(
    (tabScores.core * 0.20) +
    (tabScores.pricing * 0.25) +
    (tabScores.media * 0.15) +
    (tabScores.intelligence * 0.20) +
    (tabScores.updates * 0.10) +
    (tabScores.partners * 0.10)
  )
  const canPublish        = foundationalPassed === foundationalTotal

  return {
    foundationalScore,
    enrichmentScore,
    totalScore,
    canPublish,
    tabScores,
    foundationalPassed,
    foundationalTotal,
    enrichmentPassed,
    enrichmentTotal,
    missing,
  }
}
