// backend/src/lib/discovery/types.ts
export type { DecisionIntelligence, WhyNot, IntelligenceCompleteness, BuyerPersona, DealBreaker } from '../ai/intelligence'

export interface Intent {
  bhk?: number[]
  budgetMin?: number
  budgetMax?: number
  possession?: 'immediate' | '1year' | '2year' | '3year+'
  sector?: string
  areaMin?: number
  areaMax?: number
  purpose?: 'endUse' | 'investment'
  builderName?: string
  lifestyleKeywords?: string[]
  projectNames?: string[]
  riskProfile?: 'nri' | 'retiree' | 'risk_averse' | 'first_time_buyer'
  is_comparison_query?: boolean   // explicit: user asked to compare named projects
  gathering_loop_count?: number
  legal_check?: boolean
}

export type IntentState = 'COLD' | 'GATHERING' | 'READY_TO_SEARCH' | 'SHORTLISTED'

export type BudgetStatus = 'within' | 'slightly_over' | 'over'

export interface NearbyExpansion {
  requestedSector: string
  searchedSectors: string[]
  reason: 'no_results_in_requested_sector'
}

export interface UnitTypeSummary {
  name: string
  bhk: number
  bathrooms: number | null
  super_area_sqft?: number | null
  carpet_area_sqft?: number | null
  price_min_cr?: number | null
  price_max_cr?: number | null
  price_label?: string | null
}

export interface AmenitySummary {
  name: string
  category: string
}

export interface ConnSummary {
  type: string
  name: string
  distance_km?: number | null
}

export interface ScoredProject {
  id: string
  slug: string
  name: string
  tagline?: string | null
  builder: { name: string; slug: string }
  rera_number?: string | null
  rera_url?: string | null
  lat?: number | null
  lng?: number | null
  sector: string
  city: string
  address?: string | null
  land_area_acres?: number | null
  total_towers?: number | null
  status: string
  launch_date?: string | null
  possession_label?: string | null
  possession_date: string | null
  architect?: string | null
  interior_designer?: string | null
  design_theme?: string | null
  project_risk_flag?: string | null
  nclt_moratorium_active?: boolean | null
  registry_status?: string | null
  marketing_claims: string[]
  hero_image_url?: string | null
  price_min_cr?: number | null
  price_max_cr?: number | null
  price_range_label: string
  unit_types: UnitTypeSummary[]
  top_amenities: AmenitySummary[]
  top_connectivity: ConnSummary[]
  images: Array<{
    id: string
    url: string
    type: string
    caption: string | null
    bhk: number | null
    size_sqft: number | null
    sort_order: number
  }>
  matchScore: number
  matchReason: string
  matchReasons: string[]
  concerns: string[]
  budgetStatus?: BudgetStatus
  /** Fix 6: set when persisted via last_projects — distinguishes exact vs nearby results on cache restore */
  cacheSource?: 'exact' | 'nearby'
  best_for?: string | null
  recommendation_profile?: {
    tier?: string | null
    primary_thesis?: string | null
    family_thesis?: string | null
    investment_thesis?: string | null
    luxury_thesis?: string | null
    walk_away_conditions?: string[]
    end_use_thesis?: string | null
    investor_thesis?: string | null
    risk_thesis?: string | null
    timeline_advice?: string | null
  } | null
  decision_profile?: {
    decision_thesis?: string | null
    why_buy?: string[]
    why_avoid?: string[]
    best_for?: string | null
    confidence_sources?: string[]
    not_ideal_for?: string | null
  } | null
  persona_profile?: {
    primary_persona?: string | null
    secondary_personas?: string[]
    income_range?: string | null
    family_stage?: string | null
    risk_appetite?: string | null
    timeline_horizon?: string | null
  } | null
  competitors?: Array<{
    competitor_name: string
    this_project_advantage?: string | null
    competitor_advantage?: string | null
    verdict?: string | null
  }>
  dna?: {
    builder_track_record_score?: number | null
    builder_track_record_label?: string | null
    rera_compliance_score?: number | null
    rera_compliance_label?: string | null
    possession_certainty_score?: number | null
    possession_certainty_label?: string | null
    price_position_score?: number | null
    price_position_label?: string | null
    locality_score?: number | null
    locality_label?: string | null
    amenity_depth_score?: number | null
    amenity_depth_label?: string | null
  } | null
  // Eager intelligence — computed sync in mapToScored(), zero extra DB cost
  decisionIntelligence?: import('../ai/intelligence').DecisionIntelligence | null
  whyNot?: import('../ai/intelligence').WhyNot | null
  intelligenceCompleteness?: import('../ai/intelligence').IntelligenceCompleteness | null
  buyerPersonas?: import('../ai/intelligence').BuyerPersona[] | null
  dealBreakers?: import('../ai/intelligence').DealBreaker[] | null
}

export interface DiscoveryResult {
  exactResults: ScoredProject[]
  nearbyResults: ScoredProject[]
  expansion?: NearbyExpansion
  /** Names from intent.projectNames that had no match in the DB. */
  notFoundNames?: string[]
  /** Single search term matched multiple distinct projects — ask the user which one. */
  disambiguation?: {
    query: string
    candidates: Array<{ name: string; sector: string; builder: string }>
  }
  /** Sector term matched multiple distinct sectors (e.g., Sector 10 Noida vs Sector 10 Greater Noida). */
  sectorDisambiguation?: {
    query: string
    candidates: string[]
  }
}

export interface SectorContext {
  sector: string
  projectCount: number
  priceMinCr: number | null
  priceMaxCr: number | null
  rtmCount: number
  ucCount: number
  metroStations: string[]
  keyRoads: string[]
  nearbyLandmarks: string[]
}

export interface SectorOverview {
  sector: string
  projectCount: number
  priceMinCr: number | null
  priceMaxCr: number | null
  rtmCount: number
  ucCount: number
  topAmenities: string[]
  metroStations: string[]
}
