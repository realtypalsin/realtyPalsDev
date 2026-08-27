/**
 * Builds the "verified facts" block handed to the model for a project question.
 *
 * The chat handler used to hand-pick eleven fields — name, builder, location,
 * status, rera_number, price_range, launch_date, possession_date, description,
 * payment plan names, unit types, and the first ten amenities. Project has
 * around 150 columns, and the row was already fetched with all of them, so
 * everything else was invisible to the model purely because nobody projected it:
 * maintenance per sq.ft, pet policy, airport and school distances, flood risk,
 * AQI, walkability, lift count, water source, ceiling height, land tenure, OC
 * status, litigation counts, escrow and registry standing, NRI eligibility,
 * resale lock-in. Asked about any of them the model had nothing and either
 * deflected or guessed.
 *
 * This module projects the whole public allowlist instead, so a field becomes
 * answerable the moment it is populated — no new branch, no new tool.
 *
 * Two rules make that affordable and safe:
 *   - Empty values are omitted entirely. Most columns are null for most
 *     projects, so a full block stays small in practice, and an absent key is
 *     an honest signal to the model that we do not hold the fact.
 *   - The field set comes from projectExposure, so nothing internal can leak in
 *     by being added to the schema later.
 */

import { redactProject, isPublicField } from './projectExposure'

/** Columns rendered as "yes"/"no" rather than true/false. */
const BOOLEAN_LABELS: Record<string, [string, string]> = {
  oc_obtained: ['obtained', 'not obtained'],
  nri_eligible: ['eligible', 'not eligible'],
  rental_income_allowed: ['allowed', 'not allowed'],
  foreign_currency_payment_allowed: ['allowed', 'not allowed'],
  pet_friendly: ['pet friendly', 'pets not allowed'],
  bachelor_tenants_allowed: ['allowed', 'not allowed'],
  vastu_compliant: ['vastu compliant', 'not vastu compliant'],
  has_security_24x7: ['24x7 security', 'no 24x7 security'],
  has_cctv: ['CCTV', 'no CCTV'],
  street_lights: ['street lighting', 'no street lighting'],
  has_png_gas_pipeline: ['piped gas', 'no piped gas'],
  has_service_lift: ['service lift', 'no service lift'],
  land_title_clear: ['clear', 'not clear'],
  fir_against_project: ['FIR on record', 'no FIR on record'],
  escrow_verified: ['escrow verified', 'escrow not verified'],
  nclt_moratorium_active: ['NCLT moratorium ACTIVE', 'no NCLT moratorium'],
  authority_dues_cleared: ['cleared', 'not cleared'],
  gst_pass_through: ['passed through', 'not passed through'],
  price_includes_plc: ['included', 'not included'],
  price_includes_club: ['included', 'not included'],
  price_includes_taxes: ['included', 'not included'],
  has_duplex: ['available', 'not available'],
  has_penthouse: ['available', 'not available'],
  north_facing_units: ['available', 'not available'],
  east_facing_preferred: ['yes', 'no'],
}

/** Units appended to numeric columns so the model does not have to guess. */
const UNITS: Record<string, string> = {
  land_area_acres: ' acres',
  open_space_pct: '%',
  green_cover_percent: '%',
  walkability_score: '/100',
  women_safety_score: '/100',
  rera_compliance_score: '/100',
  construction_quality_rating: '/5',
  buyer_satisfaction_rating: '/5',
  handover_defect_rate: '%',
  noise_level_db: ' dB',
  ceiling_height_ft: ' ft',
  mobile_network_rating: '/5',
  top_school_distance_km: ' km',
  college_distance_km: ' km',
  hospital_distance_km: ' km',
  airport_distance_km: ' km',
  police_station_distance_km: ' km',
  maintenance_per_sqft_monthly: ' per sq.ft per month',
  dg_power_rate_per_unit: ' per unit',
  resale_lock_in_months: ' months',
  occupancy_restriction_months: ' months',
  nri_approval_months: ' months',
  average_builder_delay_months: ' months',
  price_min_cr: ' Cr',
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
    return Object.keys(value as object).length === 0
  }
  return false
}

function formatValue(key: string, value: unknown): string | null {
  if (isEmpty(value)) return null

  if (typeof value === 'boolean') {
    const labels = BOOLEAN_LABELS[key]
    return labels ? (value ? labels[0] : labels[1]) : value ? 'yes' : 'no'
  }
  if (value instanceof Date) return value.toISOString().split('T')[0]
  if (typeof value === 'number') return `${value}${UNITS[key] ?? ''}`
  if (Array.isArray(value)) {
    const items = value.filter(v => !isEmpty(v)).slice(0, 12)
    return items.length ? items.map(v => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join('; ') : null
  }
  if (typeof value === 'object') return JSON.stringify(value)

  const text = String(value).trim()
  return text.length ? text : null
}

export interface ProjectFactsOptions {
  /** Cap on the long prose columns, which dominate the token cost. */
  maxDescriptionChars?: number
  /** Cap on list relations such as amenities. */
  maxListItems?: number
}

/**
 * Flattens one project row into `key: value` lines, omitting everything empty.
 *
 * Accepts a row fetched with any include: redactProject drops the internal
 * columns, and relation shapes are summarised by the caller (see
 * buildProjectFacts) rather than dumped raw.
 */
export function projectScalarFacts(
  row: Record<string, unknown>,
  options: ProjectFactsOptions = {},
): Record<string, string> {
  const maxDescription = options.maxDescriptionChars ?? 400
  const safe = redactProject(row) as Record<string, unknown>
  const out: Record<string, string> = {}

  for (const [key, value] of Object.entries(safe)) {
    if (!isPublicField(key)) continue // relations are handled separately
    let formatted = formatValue(key, value)
    if (formatted === null) continue
    if ((key === 'description' || key === 'long_description') && formatted.length > maxDescription) {
      formatted = `${formatted.slice(0, maxDescription)}…`
    }
    out[key] = formatted
  }
  return out
}

interface RelationShapes {
  builder?: { name?: string | null } | null
  unit_types?: Array<Record<string, unknown>> | null
  amenities?: Array<{ name?: string | null; category?: string | null }> | null
  connectivity?: Array<{ name?: string | null; type?: string | null; distance_km?: number | null; travel_time_min?: number | null }> | null
  payment_plans?: Array<{ plan_name?: string | null; description?: string | null }> | null
  cost_sheet?: Record<string, unknown> | null
}

/**
 * The full fact set for one project: every populated public scalar, plus the
 * relations summarised in a form the model can quote.
 *
 * Returns a plain object so the caller can JSON.stringify it into the prompt.
 */
export function buildProjectFacts(
  row: Record<string, unknown> & RelationShapes,
  options: ProjectFactsOptions = {},
): Record<string, unknown> {
  const maxItems = options.maxListItems ?? 15
  const facts: Record<string, unknown> = projectScalarFacts(row, options)

  if (row.builder?.name) facts.builder = row.builder.name

  if (row.unit_types?.length) {
    facts.unit_types = row.unit_types.slice(0, maxItems).map(u => {
      const bhk = u.bhk ?? '?'
      const area = u.super_area_sqft ?? u.carpet_area_sqft
      const price = u.price_min_cr ? ` from ₹${u.price_min_cr} Cr` : ''
      return `${bhk} BHK${area ? ` (${area} sq ft)` : ''}${price}`
    })
  }

  if (row.amenities?.length) {
    facts.amenities = row.amenities.slice(0, 40).map(a => a.name).filter(Boolean)
  }

  if (row.connectivity?.length) {
    facts.connectivity = row.connectivity.slice(0, maxItems).map(c => {
      const distance = c.distance_km != null ? `${c.distance_km} km` : ''
      const time = c.travel_time_min != null ? `, ${c.travel_time_min} min` : ''
      return `${c.name ?? c.type ?? 'nearby'}${distance ? ` — ${distance}${time}` : ''}`
    })
  }

  if (row.payment_plans?.length) {
    facts.payment_plans = row.payment_plans.slice(0, maxItems).map(p =>
      p.description ? `${p.plan_name}: ${p.description}` : p.plan_name,
    )
  }

  if (row.cost_sheet && !isEmpty(row.cost_sheet)) {
    const sheet: Record<string, string> = {}
    for (const [key, value] of Object.entries(row.cost_sheet)) {
      if (key === 'id' || key === 'project_id' || key.endsWith('_at')) continue
      const formatted = formatValue(key, value)
      if (formatted !== null) sheet[key] = formatted
    }
    if (Object.keys(sheet).length) facts.cost_sheet = sheet
  }

  return facts
}
