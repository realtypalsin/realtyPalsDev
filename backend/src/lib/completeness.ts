// Phase 5: Validate intelligence completeness
import { Prisma } from '@prisma/client'

export interface CompletenessReport {
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

export function checkDecisionProfileCompleteness(
  profile: Record<string, any>
): CompletenessReport {
  const checks = {
    financial: !!profile.financial_intelligence,
    market: !!profile.market_intelligence,
    builder: !!profile.builder_intelligence,
    property: !!profile.property_intelligence,
    comparative: !!profile.comparative_analysis,
    resources: !!profile.resources_documents,
    decision_thesis: !!profile.decision_thesis && profile.decision_thesis.length > 10,
    why_buy: Array.isArray(profile.why_buy) && profile.why_buy.length > 0
  }

  const completed = Object.values(checks).filter(Boolean).length
  const total = Object.values(checks).length
  const missing = Object.entries(checks)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  return {
    project_id: profile.project_id,
    overall_percent: Math.round((completed / total) * 100),
    ...checks,
    missing_fields: missing
  }
}

export async function validateIntelligenceData(
  data: Record<string, any>
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = []

  // Financial intelligence checks
  if (data.financial_intelligence) {
    const fi = data.financial_intelligence
    if (!fi.price_range_cr) errors.push('Financial: missing price_range_cr')
    if (!fi.emi_monthly_5pct_20yr) errors.push('Financial: missing EMI calculation')
  }

  // Market intelligence checks
  if (data.market_intelligence) {
    const mi = data.market_intelligence
    if (!mi.supply_demand) errors.push('Market: missing supply_demand')
    if (!mi.price_appreciation_estimate)
      errors.push('Market: missing price_appreciation_estimate')
  }

  // Builder intelligence checks
  if (data.builder_intelligence) {
    const bi = data.builder_intelligence
    if (!bi.builder_name) errors.push('Builder: missing builder_name')
    if (!bi.track_record) errors.push('Builder: missing track_record')
  }

  // Property intelligence checks
  if (data.property_intelligence) {
    const pi = data.property_intelligence
    if (!pi.bhk_configurations) errors.push('Property: missing BHK configurations')
    if (!pi.space_utilization) errors.push('Property: missing space_utilization')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
