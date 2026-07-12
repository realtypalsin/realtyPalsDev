<<<<<<< HEAD
=======
// ── Decision Intelligence (from backend intelligence.ts) ─────────────────────

export interface DecisionDimension {
  key: string
  label: string
  score: number
  stars: number
  description: string
  basis: string
  status: 'Verified' | 'Estimated' | 'Unavailable'
}

export interface DecisionIntelligence {
  overallScore: number
  confidence: 'High' | 'Medium' | 'Low'
  tier: string
  dimensions: DecisionDimension[]
  topStrengths: string[]
  tradeoffs: string[]
  bottomLine: string
}

export interface WhyNot {
  reasons: Array<{ rank: number; label: string; detail: string }>
}

export interface IntelligenceCompleteness {
  builderTrust: 'Verified' | 'Estimated' | 'Unavailable'
  deliveryConfidence: 'Verified' | 'Estimated' | 'Unavailable'
  locationQuality: 'Verified' | 'Estimated' | 'Unavailable'
  valuePositioning: 'Verified' | 'Estimated' | 'Unavailable'
  lifestyleDepth: 'Verified' | 'Estimated' | 'Unavailable'
  legalStanding: 'Verified' | 'Estimated' | 'Unavailable'
  overallCoverage: 'Full' | 'Partial' | 'Limited'
  missingFields: string[]
}

export interface BuyerPersonaScore {
  type: 'Families' | 'Investors' | 'Luxury' | 'NRIs' | 'End Users'
  stars: number
  headline: string
  reasons: string[]
}

export interface DealBreaker {
  label: string
  detail: string
  severity: 'Caution' | 'Consider' | 'Dealbreaker'
}

>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
export interface ProjectCard {
  id: string
  slug: string
  name: string
  tagline?: string | null
<<<<<<< HEAD
=======
  matchScore?: number
  matchReason?: string
  matchReasons?: string[]
  concerns?: string[]
  budgetStatus?: 'within' | 'slightly_over' | 'over'
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
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
<<<<<<< HEAD
  status: 'under_construction' | 'ready_to_move' | 'new_launch'
=======
  best_for?: string | null
  status: 'under_construction' | 'ready_to_move' | 'new_launch'
  launch_date?: string | null
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
  possession_label?: string | null
  possession_date: string | null
  architect?: string | null
  interior_designer?: string | null
<<<<<<< HEAD
=======
  floors?: string | null
  open_space_pct?: number | null
  green_rating?: string | null
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
  design_theme?: string | null
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
<<<<<<< HEAD
    sort_order: number
  }>
}

export interface UnitTypeSummary {
=======
    bhk: number | null
    size_sqft: number | null
    sort_order: number
  }>
  // Eager intelligence — computed server-side, included in discovery response
  decisionIntelligence?: DecisionIntelligence | null
  whyNot?: WhyNot | null
  intelligenceCompleteness?: IntelligenceCompleteness | null
  buyerPersonas?: BuyerPersonaScore[] | null
  dealBreakers?: DealBreaker[] | null
}

export interface UnitTypeSummary {
  id: string
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
  name: string
  bhk: number
  bathrooms: number | null
  super_area_sqft?: number | null
  carpet_area_sqft?: number | null
<<<<<<< HEAD
  price_min_cr?: number | null
  price_max_cr?: number | null
  price_label?: string | null
  price_is_estimated?: boolean | null
=======
  balcony_area_sqft?: number | null
  price_min_cr?: number | null
  price_max_cr?: number | null
  price_label?: string | null
  subtitle?: string | null
  description?: string | null
  category_badge?: string | null
  inventory_left?: number | null
  perfect_for?: string[]
  key_highlights?: any
  whats_included?: any
  views?: any
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
}

export interface AmenitySummary {
  name: string
  category: 'sports' | 'lifestyle' | 'wellness' | 'kids' | 'security' | 'parking'
}

export interface ConnSummary {
<<<<<<< HEAD
  type: 'metro' | 'road' | 'school' | 'hospital' | 'mall' | 'landmark' | 'airport' | 'university'
=======
  type: 'metro' | 'road' | 'expressway' | 'school' | 'hospital' | 'mall' | 'landmark' | 'airport' | 'university'
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
  name: string
  distance_km?: number | null
}

export interface BuilderDetail {
<<<<<<< HEAD
  name: string
  slug: string
  tagline: string | null
  description: string | null
  founded_year: number | null
  headquarters: string | null
  website: string | null
  credai_member: boolean
  delivered_units: number | null
  delivered_projects: string[]
  ongoing_projects: string[]
  awards: string[]
=======
  // Identity
  name: string
  slug: string
  tagline: string | null
  founder: string | null
  company_overview: string | null
  logo_url: string | null
  parent_group: string | null
  founded_year: number | null
  headquarters: string | null
  website: string | null
  email: string | null
  phone: string | null
  description: string | null
  // Track Record
  total_projects_count: number | null
  delivered_units: number | null
  delivered_projects: string[]
  ongoing_projects: string[]
  delayed_projects_count: number | null
  average_delay_months: number | null
  delivery_score: number | null
  // Quality
  construction_quality_score: number | null
  after_sales_score: number | null
  buyer_satisfaction_score: number | null
  // Compliance
  rera_compliance_score: number | null
  litigation_count: number | null
  insolvency_history: boolean
  legal_flag: string | null
  cin: string | null
  rera_promoter_id: string | null
  financial_hygiene_score: number | null
  outstanding_dues_cr: number | null
  legal_entities: { name: string; cin: string; role: string }[] | null
  executives: { name: string; designation: string }[] | null
  funding_banks: string[]
  audit_flags_log: string | null
  // Market Position
  luxury_specialization: boolean
  township_specialization: boolean
  affordable_specialization: boolean
  average_project_size: number | null
  // Recognition
  awards: string[]
  awards_count: number | null
  certifications: string[]
  credai_member: boolean
  iso_certified: boolean
  // Confidence
  verification_level: string | null
  last_verified_at: string | null
  data_source: string | null
  intelligence_completeness: number | null
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
}

export interface ProjectDetail extends ProjectCard {
  long_description: string | null
  design_theme: string | null
  total_units: number | null
  marketing_claims: string[]
<<<<<<< HEAD
  ai_search_keywords?: string[]
  all_amenities: { name: string; category: string }[]
  all_connectivity: { type: string; name: string; distance_km: number | null }[]
  builder_detail: BuilderDetail
=======
  all_amenities: { name: string; category: string }[]
  all_connectivity: { type: string; name: string; distance_km: number | null }[]
  builder_detail: BuilderDetail
  dna:                    ProjectDnaPublic | null
  decision_profile:       DecisionProfilePublic | null
  persona_profile:        PersonaProfile | null
  recommendation_profile: RecommendationProfilePublic | null
  competitors:            CompetitorSummary[]
  recommendation_score:   RecommendationScore | null
}

// ── Intelligence Engine Types ─────────────────────────────────────────

export type IntelligenceStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED'
export type RecommendationTier = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'WATCH' | 'AVOID'
export type BuyerPersona = 'FAMILY' | 'PROFESSIONAL' | 'INVESTOR' | 'NRI' | 'UPGRADER' | 'RETIREE'
export type RiskAppetite = 'LOW' | 'MEDIUM' | 'HIGH'
export type ConfidenceSource = 'RERA' | 'Project Documents' | 'Site Visit' | 'Builder Claim' | 'Estimated'

export interface ProjectDnaPublic {
  builder_track_record_label: string | null
  price_position_label:       string | null
  locality_label:             string | null
  rera_compliance_label:      string | null
  amenity_depth_label:        string | null
  possession_certainty_label: string | null
  last_verified_at:           string | null
}

export interface DecisionProfilePublic {
  status:             IntelligenceStatus
  decision_thesis:    string | null
  why_buy:            string[]
  why_avoid:          string[]
  best_for:           string | null
  not_ideal_for:      string | null
  confidence_sources: ConfidenceSource[]
  intelligence_data?: any
  last_verified_at:   string | null
}

export interface PersonaProfile {
  primary_persona:    BuyerPersona | null
  secondary_personas: BuyerPersona[]
  persona_descriptions: Record<string, string> | null
  income_range:       string | null
  family_stage:       string | null
  work_location:      string | null
  risk_appetite:      RiskAppetite | null
  timeline_horizon:   string | null
  motivation_note:    string | null
}

export interface RecommendationProfilePublic {
  status:               IntelligenceStatus
  tier:                 RecommendationTier | null
  primary_thesis:       string | null
  end_use_thesis:       string | null
  investment_thesis:    string | null
  family_thesis:        string | null
  investor_thesis:      string | null
  luxury_thesis:        string | null
  risk_thesis:          string | null
  walk_away_conditions: string[]
  timeline_advice:      string | null
  negotiation_leverage: string[]
  last_verified_at:     string | null
}

export interface ScoreDimension {
  key:         string
  label:       string
  weight:      number
  raw:         number
  weighted:    number
  description: string
}

export interface RecommendationScore {
  total:      number
  tier:       string
  dimensions: ScoreDimension[]
}

export interface CompetitorSummary {
  id:                     string
  competitor_name:        string
  competitor_slug:        string | null
  this_project_advantage: string | null
  competitor_advantage:   string | null
  verdict:                string | null
  price_delta_note:       string | null
  sort_order:             number
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
}
