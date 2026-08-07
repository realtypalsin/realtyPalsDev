// ---------------------------------------------------------------------------
// Project Completeness Engine
//
// Scoring:
//   Foundational (8 checks) — gates canPublish
//   Enrichment   (18 checks) — quality signal only
//   totalScore   = round(foundationalScore * 0.6 + enrichmentScore * 0.4)
// ---------------------------------------------------------------------------

// ── Input types ─────────────────────────────────────────────────────────────

export interface UnitSnapshot {
  id: string
  price_min_cr:      number | null
  super_area_sqft:   number | null
  carpet_area_sqft:  number | null
}

export interface ImageSnapshot {
  type: string // ImageType enum values
}

export interface DocumentSnapshot {
  doc_type: string
}

export interface DnaSnapshot {
  builder_track_record_score: number | null
  price_position_score:       number | null
  locality_score:             number | null
  rera_compliance_score:      number | null
  amenity_depth_score:        number | null
  possession_certainty_score: number | null
}

export interface DecisionProfileSnapshot {
  decision_thesis: string | null
  why_buy:         string[]
  why_avoid:       string[]
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
  // Scalar fields
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

  // Relations (always populated via GET /projects/:id)
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

  // Optional — queried separately (ProjectDocument has no @relation on Project)
  documents?: DocumentSnapshot[]
}

// ── Output types ─────────────────────────────────────────────────────────────

export interface MissingBySection {
  overview:     string[]
  units:        string[]
  builder:      string[]
  images:       string[]
  brochures:    string[]
  intelligence: string[]
  competitors:  string[]
}

export interface TabScores {
  core: number          // 0-100 (Core Info & Units)
  pricing: number       // 0-100 (Pricing & Location)
  media: number         // 0-100 (Images & Brochures)
  intelligence: number  // 0-100 (DNA & Intelligence)
  updates: number       // 0-100 (Updates & Timeline)
  partners: number      // 0-100 (Channel Partners)
}

export interface CompletenessResult {
  foundationalScore: number  // 0-100
  enrichmentScore:   number  // 0-100
  totalScore:        number  // 0-100, weighted average
  canPublish:        boolean // true only if all 8 foundational checks pass
  tabScores:         TabScores
  missing:           MissingBySection

  foundationalPassed: number // count of passing foundational checks
  foundationalTotal:  number // always 8
  enrichmentPassed:   number // count of passing enrichment checks
  enrichmentTotal:    number // always 18
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function present(v: string | null | undefined): boolean {
  return typeof v === 'string' && v.trim().length > 0
}

// ── Core function ────────────────────────────────────────────────────────────

export function computeCompleteness(project: ProjectSnapshot): CompletenessResult {
  const missing: MissingBySection = {
    overview:     [],
    units:        [],
    builder:      [],
    images:       [],
    brochures:    [],
    intelligence: [],
    competitors:  [],
  }

  // ── Foundational checks ──────────────────────────────────────────────────
  // Each check is binary. All 8 must pass for canPublish.

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
  const hasPricedUnit = project.unit_types.some(u => u.price_min_cr != null)
  foundational.push(hasPricedUnit)
  if (!hasPricedUnit) {
    if (project.unit_types.length === 0) {
      missing.units.push('No unit types added')
    } else {
      missing.units.push(`${project.unit_types.length} unit type(s) exist but none have price_min_cr set`)
    }
  }

  const foundationalPassed = foundational.filter(Boolean).length
  const foundationalTotal  = foundational.length // 8

  // ── Enrichment checks ────────────────────────────────────────────────────
  // These improve score but never block publishing.

  const enrichment: boolean[] = []

  // Overview (5)
  const hasTagline = present(project.tagline)
  enrichment.push(hasTagline)
  if (!hasTagline) missing.overview.push('Tagline missing')

  const hasLongDesc = present(project.long_description)
  enrichment.push(hasLongDesc)
  if (!hasLongDesc) missing.overview.push('Long description missing')

  const hasAddress = present(project.address)
  enrichment.push(hasAddress)
  if (!hasAddress) missing.overview.push('Address missing')

  const hasCoords = project.lat != null && project.lng != null
  enrichment.push(hasCoords)
  if (!hasCoords) missing.overview.push('Map coordinates (lat/lng) missing')

  const hasReraUrl = present(project.rera_url)
  enrichment.push(hasReraUrl)
  if (!hasReraUrl) missing.overview.push('RERA URL missing')

  // Units (2)
  const hasSuperArea = project.unit_types.length > 0 &&
    project.unit_types.every(u => u.super_area_sqft != null)
  enrichment.push(hasSuperArea)
  if (!hasSuperArea) {
    const missing_count = project.unit_types.filter(u => u.super_area_sqft == null).length
    if (missing_count > 0) missing.units.push(`${missing_count} unit type(s) missing super area (sqft)`)
  }

  const hasCarpetArea = project.unit_types.length > 0 &&
    project.unit_types.every(u => u.carpet_area_sqft != null)
  enrichment.push(hasCarpetArea)
  if (!hasCarpetArea) {
    const missing_count = project.unit_types.filter(u => u.carpet_area_sqft == null).length
    if (missing_count > 0) missing.units.push(`${missing_count} unit type(s) missing carpet area (sqft)`)
  }

  // Images (3)
  const galleryImages = project.images.filter(i => i.type !== 'hero')
  const hasGallery = galleryImages.length >= 3
  enrichment.push(hasGallery)
  if (!hasGallery) missing.images.push(`Gallery needs 3+ images (has ${galleryImages.length})`)

  const hasFloorPlan = project.images.some(i => i.type === 'floor_plan')
  enrichment.push(hasFloorPlan)
  if (!hasFloorPlan) missing.images.push('No floor plan images uploaded')

  const hasFiveImages = project.images.length >= 5
  enrichment.push(hasFiveImages)
  if (!hasFiveImages) missing.images.push(`At least 5 total images recommended (has ${project.images.length})`)

  // Brochures (1)
  const hasBrochure = project.documents != null &&
    project.documents.some(d => d.doc_type === 'brochure')
  enrichment.push(hasBrochure)
  if (!hasBrochure) missing.brochures.push('No brochure uploaded')

  // Amenities (1)
  const hasAmenities = project.amenities.length >= 3
  enrichment.push(hasAmenities)
  if (!hasAmenities) missing.overview.push(`Amenities need 3+ entries (has ${project.amenities.length})`)

  // Connectivity (1)
  const hasConnectivity = project.connectivity.length >= 3
  enrichment.push(hasConnectivity)
  if (!hasConnectivity) missing.overview.push(`Connectivity needs 3+ entries (has ${project.connectivity.length})`)

  // Intelligence (4)
  const hasDecisionThesis = present(project.decision_profile?.decision_thesis ?? null) ||
    (Array.isArray(project.decision_profile?.why_buy) && project.decision_profile!.why_buy.length > 0)
  enrichment.push(hasDecisionThesis)
  if (!hasDecisionThesis) missing.intelligence.push('Decision thesis missing')

  const hasPersona = present(project.persona_profile?.primary_persona ?? null) ||
    (Array.isArray(project.persona_profile?.secondary_personas) && project.persona_profile!.secondary_personas.length > 0)
  enrichment.push(hasPersona)
  if (!hasPersona) missing.intelligence.push('Primary buyer persona not set')

  const hasRecommendationTier = present(project.recommendation_profile?.tier ?? null) ||
    present(project.recommendation_profile?.primary_thesis ?? null)
  enrichment.push(hasRecommendationTier)
  if (!hasRecommendationTier) missing.intelligence.push('Recommendation tier not set (STRONG_BUY / BUY / HOLD / etc.)')

  const dna = project.dna as any
  const dnaScoresFilled = dna == null ? 0 : [
    dna.builder_score ?? dna.builder_track_record_score,
    dna.price_score ?? dna.price_position_score,
    dna.location_score ?? dna.locality_score,
    dna.legal_score ?? dna.rera_compliance_score,
    dna.amenity_score ?? dna.amenity_depth_score,
    dna.possession_score ?? dna.possession_certainty_score,
  ].filter(s => s != null && s !== '').length
  const hasDna = dnaScoresFilled >= 3
  enrichment.push(hasDna)
  if (!hasDna) missing.intelligence.push(`DNA scores incomplete (${dnaScoresFilled}/6 filled, need 3+)`)

  // Competitors (1)
  const hasCompetitors = (project.competitors?.length ?? 0) >= 1
  enrichment.push(hasCompetitors)
  if (!hasCompetitors) missing.competitors.push('No competitor projects added')

  const enrichmentPassed = enrichment.filter(Boolean).length
  const enrichmentTotal  = enrichment.length // 18

  // ── Score calculation ────────────────────────────────────────────────────

  const coreScore = Math.min(100, Math.round(
    (hasName ? 15 : 0) +
    (hasStatus ? 15 : 0) +
    (hasRera ? 15 : 0) +
    (hasDescription ? 15 : 0) +
    (hasHero ? 15 : 0) +
    (project.unit_types.length >= 1 ? 15 : 0) +
    (hasAmenities ? 10 : 0)
  ))

  const pricingScore = Math.min(100, Math.round(
    (hasPricedUnit ? 30 : 0) +
    (hasConnectivity ? 30 : 0) +
    (project.unit_types.length > 0 ? 20 : 0) +
    (hasRera ? 20 : 0)
  ))

  const mediaScore = Math.min(100, Math.round(
    (hasHero ? 30 : 0) +
    (hasGallery ? 40 : (project.images.length > 0 ? 20 : 0)) +
    (hasBrochure ? 30 : 0)
  ))

  const intelligenceScore = Math.min(100, Math.round(
    (hasDecisionThesis ? 20 : 0) +
    (hasPersona ? 20 : 0) +
    (hasRecommendationTier ? 20 : 0) +
    (hasDna ? 20 : 0) +
    (hasCompetitors ? 20 : 0)
  ))

  const updatesScore = 100
  const partnersScore = 100

  const tabScores: TabScores = {
    core: coreScore,
    pricing: pricingScore,
    media: mediaScore,
    intelligence: intelligenceScore,
    updates: updatesScore,
    partners: partnersScore,
  }

  const foundationalScore = Math.round((foundationalPassed / foundationalTotal) * 100)
  const enrichmentScore   = Math.round((enrichmentPassed   / enrichmentTotal)   * 100)
  const totalScore        = Math.round((coreScore * 0.25) + (pricingScore * 0.20) + (mediaScore * 0.15) + (intelligenceScore * 0.20) + (updatesScore * 0.10) + (partnersScore * 0.10))
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

// ---------------------------------------------------------------------------
// Intelligence-block completeness (Phase 5)
// Separate from computeCompleteness above, which scores the whole project
// snapshot. These two only look at the six DecisionProfile intelligence blocks.
// ---------------------------------------------------------------------------

export interface IntelligenceCompletenessReport {
  project_id: string
  overall_percent: number
  financial: boolean
  market: boolean
  builder: boolean
  property: boolean
  comparative: boolean
  resources: boolean
  decision_thesis: boolean
  why_buy: boolean
  missing_fields: string[]
}

interface DecisionProfileData {
  project_id?: string
  financial_intelligence?: Record<string, any>
  market_intelligence?: Record<string, any>
  builder_intelligence?: Record<string, any>
  property_intelligence?: Record<string, any>
  comparative_analysis?: Record<string, any>
  resources_documents?: Record<string, any>
  decision_thesis?: string | null
  why_buy?: string[]
}

export function checkDecisionProfileCompleteness(
  profile: DecisionProfileData
): IntelligenceCompletenessReport {
  const checks = {
    financial: !!profile.financial_intelligence,
    market: !!profile.market_intelligence,
    builder: !!profile.builder_intelligence,
    property: !!profile.property_intelligence,
    comparative: !!profile.comparative_analysis,
    resources: !!profile.resources_documents,
    decision_thesis: !!profile.decision_thesis && profile.decision_thesis.length > 10,
    why_buy: Array.isArray(profile.why_buy) && profile.why_buy.length > 0,
  }

  const completed = Object.values(checks).filter(Boolean).length
  const total = Object.values(checks).length
  const missing = Object.entries(checks)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  return {
    project_id: profile.project_id ?? '',
    overall_percent: Math.round((completed / total) * 100),
    ...checks,
    missing_fields: missing,
  }
}

export function validateIntelligenceData(
  data: DecisionProfileData
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (data.financial_intelligence) {
    const fi = data.financial_intelligence
    if (!fi.price_range_cr) errors.push('Financial: missing price_range_cr')
    if (!fi.emi_monthly_5pct_20yr) errors.push('Financial: missing EMI calculation')
  }

  if (data.market_intelligence) {
    const mi = data.market_intelligence
    if (!mi.supply_demand) errors.push('Market: missing supply_demand')
    if (!mi.price_appreciation_estimate) errors.push('Market: missing price_appreciation_estimate')
  }

  if (data.builder_intelligence) {
    const bi = data.builder_intelligence
    if (!bi.builder_name) errors.push('Builder: missing builder_name')
    if (!bi.track_record) errors.push('Builder: missing track_record')
  }

  if (data.property_intelligence) {
    const pi = data.property_intelligence
    if (!pi.bhk_configurations) errors.push('Property: missing BHK configurations')
    if (!pi.space_utilization) errors.push('Property: missing space_utilization')
  }

  return { valid: errors.length === 0, errors }
}
