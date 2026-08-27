/**
 * Field exposure policy for Project data leaving the server.
 *
 * Every handler that reads a project and puts any part of it into an LLM prompt
 * or an SSE frame must go through here. Two problems this exists to stop:
 *
 * 1. PII / cross-tenant leaks. `Project` has relations to other people's data —
 *    `saved_by` (SavedProperty), `chat_sessions` (ChatSession) and
 *    `property_feedback` (PropertyFeedback). A single `include: { saved_by: true }`
 *    in a future handler would put other users' records into a prompt. Nothing
 *    prevented that before; FORBIDDEN_RELATIONS + assertNoForbiddenRelations do.
 *
 * 2. Internal mechanics leaking. `embedding` is a pgvector column (enormous, and
 *    it would be shredded into tokens), `ai_search_keywords` exposes how ranking
 *    and matching work, and `builder_theme` carries a commercial branding
 *    arrangement including `active_until`. None of these belong in an answer.
 *
 * The allowlist is a Prisma `select`, so enforcement happens at query time and
 * the forbidden columns are never read at all. `redactProject` is defence in
 * depth for rows that arrive from somewhere else.
 *
 * Adding a column to schema.prisma does NOT automatically expose it: it is
 * absent from PROJECT_PUBLIC_SELECT until someone classifies it here, and
 * projectExposure.test.ts fails on any unclassified column so that decision
 * cannot be skipped.
 */

/**
 * Project relations that point at other users' data. Never selectable in any
 * query whose result reaches a prompt or a response body.
 */
export const FORBIDDEN_RELATIONS = ['saved_by', 'chat_sessions', 'property_feedback'] as const

/**
 * Scalar columns that must never leave the server, with the reason. Kept as a
 * map rather than a list so the test can report *why* when one is exposed.
 */
export const INTERNAL_ONLY_FIELDS: Record<string, string> = {
  embedding: 'pgvector column — enormous, and meaningless as prompt text',
  ai_search_keywords: 'internal retrieval keywords — reveals how matching works',
  builder_theme: 'commercial branding arrangement, includes active_until',
  builder_id: 'raw foreign key — the builder relation carries the usable data',
  created_at: 'row bookkeeping, not a project fact',
  updated_at: 'row bookkeeping, not a project fact',
  market_demand_score: 'internal analyst score; V1 scope excludes investment analysis',
  appreciation_potential_5yr: 'forward-looking estimate — the prompt forbids presenting projections as fact',
  rental_yield_annual_percent: 'forward-looking estimate — same rule',
  competing_projects_nearby: 'internal ranking input',
}

/**
 * Every Project scalar the buyer may see. Passed straight to Prisma as a
 * `select`, so anything absent is never fetched.
 */
export const PROJECT_PUBLIC_SELECT = {
  // Identity & location
  id: true,
  slug: true,
  name: true,
  tagline: true,
  city: true,
  state: true,
  country: true,
  sector: true,
  address: true,
  lat: true,
  lng: true,

  // Physical description
  land_area_acres: true,
  total_units: true,
  total_towers: true,
  floors: true,
  open_space_pct: true,
  green_rating: true,
  has_duplex: true,
  has_penthouse: true,
  project_type: true,
  design_theme: true,
  architect: true,
  interior_designer: true,
  description: true,
  long_description: true,
  hero_image_url: true,
  marketing_claims: true,

  // Nearby counts
  schools_nearby_count: true,
  hospitals_nearby_count: true,
  shopping_nearby_count: true,
  it_parks_nearby_count: true,
  banks_nearby_count: true,
  restaurants_nearby_count: true,

  // Status & possession
  status: true,
  launch_date: true,
  possession_date: true,
  possession_label: true,
  possession_confidence: true,
  possession_confidence_note: true,
  expected_handover_quarter: true,
  foundation_stone_date: true,
  average_builder_delay_months: true,

  // Legal, compliance, disclosure — buyers are entitled to all of this
  rera_number: true,
  rera_url: true,
  rera_valid_until: true,
  rera_compliance_score: true,
  oc_obtained: true,
  oc_obtained_date: true,
  oc_valid_until: true,
  oc_restrictions: true,
  occupancy_certificate_status: true,
  occupancy_expected_date: true,
  legal_flag: true,
  legal_flag_detail: true,
  litigation_count: true,
  ongoing_litigation_count: true,
  litigation_types: true,
  nclt_status: true,
  nclt_moratorium_active: true,
  project_risk_flag: true,
  escrow_verified: true,
  escrow_bank_name: true,
  registry_status: true,
  registry_embargo_reasons: true,
  land_title_clear: true,
  fir_against_project: true,
  approvals_status: true,
  authority_dues_cleared: true,
  land_tenure: true,
  gst_pass_through: true,

  // Location intelligence
  location_advantages: true,
  location_concerns: true,
  location_verdict: true,
  walkability_score: true,
  commute_matrix: true,
  top_school_distance_km: true,
  college_distance_km: true,
  hospital_distance_km: true,
  airport_distance_km: true,
  police_station_distance_km: true,

  // Environment & safety
  flood_waterlogging_risk: true,
  flood_zone: true,
  aqi_annual_avg: true,
  air_quality_index_avg: true,
  noise_level_db: true,
  proximity_to_industrial: true,
  green_cover_percent: true,
  women_safety_score: true,
  has_security_24x7: true,
  has_cctv: true,
  street_lights: true,

  // Pricing (headline only — the cost sheet relation carries the breakdown)
  price_min_cr: true,
  price_range_label: true,
  price_includes_plc: true,
  price_includes_club: true,
  price_includes_taxes: true,

  // Ownership & eligibility terms
  resale_lock_in_months: true,
  rental_income_allowed: true,
  occupancy_restriction_months: true,
  nri_eligible: true,
  nri_approval_months: true,
  foreign_currency_payment_allowed: true,
  pet_friendly: true,
  bachelor_tenants_allowed: true,

  // Build quality
  construction_quality_rating: true,
  buyer_satisfaction_rating: true,
  handover_defect_rate: true,

  // Vastu & orientation
  vastu_compliant: true,
  north_facing_units: true,
  east_facing_preferred: true,

  // Utilities & living standards
  water_source: true,
  dg_power_rate_per_unit: true,
  maintenance_per_sqft_monthly: true,
  has_png_gas_pipeline: true,
  mobile_network_rating: true,
  ceiling_height_ft: true,
  lifts_per_tower: true,
  has_service_lift: true,
  shared_walls_type: true,
} as const

export type PublicProjectField = keyof typeof PROJECT_PUBLIC_SELECT

const PUBLIC_FIELD_SET: ReadonlySet<string> = new Set(Object.keys(PROJECT_PUBLIC_SELECT))

/**
 * Relations that are safe to include alongside the public select. Listed
 * explicitly so `assertNoForbiddenRelations` can tell "not allowed" from
 * "not yet classified".
 */
export const ALLOWED_RELATIONS = [
  'builder',
  'amenities',
  'connectivity',
  'unit_types',
  'payment_plans',
  'cost_sheet',
  'price_history',
  'construction_milestones',
  'construction_updates',
  'lifecycle_updates',
  'unit_inventory',
  'images',
  'spec_items',
  'channel_partners',
  'competitors',
  'referenced_as_competitor',
  'decision_profile',
  'persona_profile',
  'recommendation_profile',
  'dna',
] as const

/**
 * Throws if a Prisma include/select object asks for a relation carrying other
 * users' data. Call it on any dynamically-built include.
 */
export function assertNoForbiddenRelations(shape: Record<string, unknown>): void {
  for (const relation of FORBIDDEN_RELATIONS) {
    if (shape[relation]) {
      throw new Error(
        `projectExposure: relation "${relation}" holds other users' data and must never be selected into a prompt or response.`,
      )
    }
  }
}

/**
 * Strips every key that is not on the public allowlist.
 *
 * Defence in depth: use the select at query time wherever possible, and run
 * this on any project row that arrived from a wider query, a cache, or JSON
 * persisted on a previous turn.
 *
 * Relation keys on ALLOWED_RELATIONS are preserved untouched — they carry their
 * own shapes and are filtered by their own resolvers.
 */
export function redactProject<T extends Record<string, unknown>>(row: T): Partial<T> {
  const allowedRelations: ReadonlySet<string> = new Set(ALLOWED_RELATIONS)
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (PUBLIC_FIELD_SET.has(key) || allowedRelations.has(key)) {
      out[key] = value
    }
  }
  return out as Partial<T>
}

/** True when the column may be shown to a buyer. */
export function isPublicField(field: string): boolean {
  return PUBLIC_FIELD_SET.has(field)
}
