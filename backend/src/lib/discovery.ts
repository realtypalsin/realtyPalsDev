// backend/src/lib/discovery.ts
import { prisma } from './db'

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
}

export type IntentState = 'COLD' | 'GATHERING' | 'READY_TO_SEARCH' | 'SHORTLISTED'

export function getIntentState(intent: Intent): IntentState {
  const hasBhk = (intent.bhk?.length ?? 0) > 0
  const hasBudget = !!intent.budgetMax
  if (!hasBhk && !hasBudget) return 'COLD'
  if (!hasBhk || !hasBudget) return 'GATHERING'
  return 'READY_TO_SEARCH'
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
  matchScore: number
  matchReason: string
}

export async function discoverProjects(intent: Intent): Promise<ScoredProject[]> {
  const projects = await prisma.project.findMany({
    where: intent.builderName
      ? { builder: { name: { contains: intent.builderName, mode: 'insensitive' } } }
      : undefined,
    include: {
      builder: { select: { name: true, slug: true } },
      unit_types: true,
      images: true,
      amenities: { take: 5 },
      connectivity: { take: 5, orderBy: { distance_km: 'asc' } },
    },
  })

  const threshold = intent.builderName && !intent.bhk?.length && !intent.budgetMax ? 0 : 30

  const scored = projects
    .map((p) => {
      const score = scoreProject(p, intent)
      if (score < threshold) return null

      const prices = p.unit_types.filter((u) => u.price_min_cr).map((u) => u.price_min_cr!)
      const maxPrices = p.unit_types.filter((u) => u.price_max_cr).map((u) => u.price_max_cr!)
      const minP = prices.length ? Math.min(...prices) : null
      const maxP = maxPrices.length ? Math.max(...maxPrices) : null
      const price_range_label = minP != null
        ? maxP != null && maxP > minP
          ? `₹${minP.toFixed(2)}–${maxP.toFixed(2)}Cr`
          : `₹${minP.toFixed(2)}Cr+`
        : 'Price on request'

      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline ?? null,
        builder: { name: p.builder.name, slug: p.builder.slug },
        rera_number: p.rera_number ?? null,
        rera_url: p.rera_url ?? null,
        lat: p.lat ?? null,
        lng: p.lng ?? null,
        sector: p.sector,
        city: p.city,
        address: p.address ?? null,
        land_area_acres: p.land_area_acres ?? null,
        total_towers: p.total_towers ?? null,
        status: p.status as string,
        possession_label: p.possession_label ?? null,
        possession_date: p.possession_date ? p.possession_date.toISOString() : null,
        architect: p.architect ?? null,
        interior_designer: p.interior_designer ?? null,
        design_theme: p.design_theme ?? null,
        marketing_claims: p.marketing_claims,
        hero_image_url: p.hero_image_url ?? null,
        price_min_cr: minP,
        price_max_cr: maxP,
        price_range_label,
        unit_types: p.unit_types.map((u) => ({
          name: u.name,
          bhk: u.bhk,
          bathrooms: u.bathrooms ?? null,
          super_area_sqft: u.super_area_sqft ?? null,
          carpet_area_sqft: u.carpet_area_sqft ?? null,
          price_min_cr: u.price_min_cr ?? null,
          price_max_cr: u.price_max_cr ?? null,
          price_label: u.price_label ?? null,
        })),
        top_amenities: p.amenities.map((a) => ({
          name: a.name,
          category: a.category as string,
        })),
        top_connectivity: p.connectivity.map((c) => ({
          type: c.type as string,
          name: c.name,
          distance_km: c.distance_km ?? null,
        })),
        images: p.images.map((img) => ({
          id: img.id,
          url: img.url,
          type: img.type as string,
          caption: img.caption ?? null,
          sort_order: img.sort_order,
        })),
        matchScore: Math.round(score),
        matchReason: buildMatchReason(p, intent),
      } as ScoredProject
    })
    .filter((p): p is ScoredProject => p !== null)

  scored.sort((a, b) => b.matchScore - a.matchScore)
  return scored.slice(0, 6)
}

function scoreProject(
  p: {
    unit_types: Array<{ bhk: number; price_min_cr: number | null; price_max_cr: number | null; carpet_area_sqft: number | null }>
    possession_date: Date | null
    sector: string
    hero_image_url: string | null
    rera_number: string | null
  },
  intent: Intent
): number {
  let score = 0

  // Budget (max 30)
  if (intent.budgetMax) {
    const prices = p.unit_types.filter((u) => u.price_min_cr).map((u) => u.price_min_cr!)
    const minP = prices.length ? Math.min(...prices) : null
    if (minP != null) {
      const over = (minP - intent.budgetMax) / intent.budgetMax
      if (over <= 0) score += 30
      else if (over <= 0.05) score += 24
      else if (over <= 0.10) score += 18
      else if (over <= 0.20) score += 10
    }
  } else {
    score += 15
  }

  // BHK (max 25)
  if (intent.bhk?.length) {
    const bhks = p.unit_types.map((u) => u.bhk)
    score += intent.bhk.some((b) => bhks.includes(b)) ? 25 : 0
  } else {
    score += 12
  }

  // Possession (max 20)
  if (intent.possession && p.possession_date) {
    const months = (p.possession_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
    if (intent.possession === 'immediate' && months <= 3) score += 20
    else if (intent.possession === '1year' && months <= 12) score += 20
    else if (intent.possession === '1year' && months <= 18) score += 14
    else if (intent.possession === '2year' && months <= 24) score += 20
    else if (intent.possession === '2year' && months <= 30) score += 14
    else if (intent.possession === '3year+') score += 20
    else score += 3
  } else if (!intent.possession) {
    score += 10
  } else {
    score += 5
  }

  // Sector (max 15)
  if (intent.sector) {
    const match = p.sector.toLowerCase().includes(intent.sector.toLowerCase())
      || intent.sector.toLowerCase().includes(p.sector.toLowerCase())
    score += match ? 15 : 3
  } else {
    score += 8
  }

  // Area (max 5)
  if (intent.areaMin || intent.areaMax) {
    const fits = p.unit_types.some((u) =>
      u.carpet_area_sqft &&
      (!intent.areaMin || u.carpet_area_sqft >= intent.areaMin) &&
      (!intent.areaMax || u.carpet_area_sqft <= intent.areaMax)
    )
    score += fits ? 5 : 0
  } else {
    score += 3
  }

  // Data quality (max 5)
  if (p.hero_image_url) score += 3
  if (p.rera_number) score += 2

  return score
}

function buildMatchReason(
  p: { unit_types: Array<{ bhk: number; price_min_cr: number | null }>; sector: string },
  intent: Intent
): string {
  const parts: string[] = []
  if (intent.bhk?.length) {
    const match = p.unit_types.find((u) => intent.bhk!.includes(u.bhk))
    if (match) parts.push(`${match.bhk}BHK available`)
  }
  if (intent.budgetMax) {
    const prices = p.unit_types.filter((u) => u.price_min_cr).map((u) => u.price_min_cr!)
    const min = prices.length ? Math.min(...prices) : null
    if (min != null && min <= intent.budgetMax) parts.push('within budget')
  }
  if (intent.sector && p.sector.toLowerCase().includes(intent.sector.toLowerCase())) {
    parts.push(`in ${p.sector}`)
  }
  return parts.join(', ') || 'matches your search'
}
