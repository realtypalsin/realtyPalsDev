export interface ProjectCard {
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
  status: 'under_construction' | 'ready_to_move' | 'new_launch'
  possession_label?: string | null
  possession_date: string | null
  architect?: string | null
  interior_designer?: string | null
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
    sort_order: number
  }>
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
  price_is_estimated?: boolean | null
}

export interface AmenitySummary {
  name: string
  category: 'sports' | 'lifestyle' | 'wellness' | 'kids' | 'security' | 'parking'
}

export interface ConnSummary {
  type: 'metro' | 'road' | 'school' | 'hospital' | 'mall' | 'landmark' | 'airport' | 'university'
  name: string
  distance_km?: number | null
}

export interface BuilderDetail {
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
}

export interface ProjectDetail extends ProjectCard {
  long_description: string | null
  design_theme: string | null
  total_units: number | null
  marketing_claims: string[]
  ai_search_keywords?: string[]
  all_amenities: { name: string; category: string }[]
  all_connectivity: { type: string; name: string; distance_km: number | null }[]
  builder_detail: BuilderDetail
}
