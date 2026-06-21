// backend/src/lib/projectRepository.ts
// Port of frontend/lib/repositories/projectRepository.ts — toProjectCard only.
// No Prisma imports here — callers pass raw DB rows from their own queries.

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
  category: 'sports' | 'lifestyle' | 'wellness' | 'kids' | 'security' | 'parking'
}

export interface ConnSummary {
  type: 'metro' | 'road' | 'school' | 'hospital' | 'mall' | 'landmark' | 'airport' | 'university'
  name: string
  distance_km?: number | null
}

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

const CATEGORY_ORDER = ['sports', 'lifestyle', 'wellness', 'kids', 'security', 'parking'] as const
const CONN_PRIORITY = ['metro', 'airport', 'road'] as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toProjectCard(p: any): ProjectCard {
  const allPrices = p.unit_types
    .flatMap((u: any) => [u.price_min_cr, u.price_max_cr])
    .filter((v: any): v is number => v != null)

  const price_min_cr = allPrices.length ? Math.min(...allPrices) : null
  const price_max_cr = allPrices.length ? Math.max(...allPrices) : null

  const fmt = (n: number) => n.toFixed(2)

  const price_range_label =
    price_min_cr != null && price_max_cr != null
      ? price_min_cr === price_max_cr
        ? `₹${fmt(price_min_cr)} Cr`
        : `₹${fmt(price_min_cr)} – ${fmt(price_max_cr)} Cr`
      : 'Price on request'

  const sortedAmenities = [...p.amenities].sort(
    (a: any, b: any) =>
      CATEGORY_ORDER.indexOf(a.category as any) - CATEGORY_ORDER.indexOf(b.category as any),
  )
  const top_amenities: AmenitySummary[] = sortedAmenities.slice(0, 6).map((a: any) => ({
    name: a.name,
    category: a.category,
  }))

  const top_connectivity: ConnSummary[] = []
  for (const type of CONN_PRIORITY) {
    const found = p.connectivity.find((c: any) => c.type === type)
    if (found) top_connectivity.push({ type: found.type, name: found.name, distance_km: found.distance_km })
  }

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    tagline: p.tagline,
    builder: p.builder,
    rera_number: p.rera_number,
    rera_url: p.rera_url ?? null,
    lat: p.lat ?? null,
    lng: p.lng ?? null,
    sector: p.sector,
    city: p.city,
    address: p.address,
    land_area_acres: p.land_area_acres,
    total_towers: p.total_towers,
    status: p.status,
    possession_label: p.possession_label,
    possession_date: p.possession_date?.toISOString() ?? null,
    architect: p.architect,
    interior_designer: p.interior_designer,
    design_theme: p.design_theme,
    marketing_claims: p.marketing_claims,
    hero_image_url: p.hero_image_url,
    price_min_cr,
    price_max_cr,
    price_range_label,
    unit_types: p.unit_types.map(
      (u: any): UnitTypeSummary => ({
        name: u.name,
        bhk: u.bhk,
        bathrooms: u.bathrooms ?? null,
        super_area_sqft: u.super_area_sqft,
        carpet_area_sqft: u.carpet_area_sqft,
        price_min_cr: u.price_min_cr,
        price_max_cr: u.price_max_cr,
        price_label: u.price_label,
      }),
    ),
    top_amenities,
    top_connectivity,
    images: p.images?.map((img: any) => ({
      id: img.id,
      url: img.url,
      type: img.type as string,
      caption: img.caption,
      sort_order: img.sort_order,
    })) ?? [],
  }
}
