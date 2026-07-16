/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/db'
import { getCached, setCached, makeKey } from '@/lib/redis'
import type { ProjectCard, ProjectDetail, AmenitySummary, ConnSummary } from '@/types/project'

import type { Prisma } from '@prisma/client'

type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: {
    builder: { select: { name: true; slug: true } }
    unit_types: true
    amenities: true
    connectivity: true
    images: true
  }
}>

const CATEGORY_ORDER = ['sports', 'lifestyle', 'wellness', 'kids', 'security', 'parking'] as const
const CONN_PRIORITY = ['metro', 'airport', 'road'] as const

export interface SearchFilters {
  sector?: string
  city?: string
  bhk?: number
  budget_min_cr?: number
  budget_max_cr?: number
  possession_year_max?: number
}

/**
 * Deterministic scoring — replaces external Jina/Cohere rerankers.
 * Scores each property 0–100 based on match quality. No latency, no external deps.
 *
 * Scoring factors:
 *   BHK exact match         +25
 *   Budget fit              +0–25 (inversely proportional to distance from budget midpoint)
 *   Ready-to-move bonus     +15 (availability now > waiting)
 *   Early possession        +0–10 (sooner possession = higher score)
 *   Has verified price      +10 (price_is_estimated = false)
 *   Has hero image          +8
 *   Has RERA number         +7
 *   Has connectivity data   +5
 *   Has amenities           +5
 */
function scoreProject(p: ProjectCard, filters: SearchFilters): number {
  let score = 0

  // BHK match
  if (filters.bhk && p.unit_types.some((u) => u.bhk === filters.bhk)) {
    score += 25
  }

  // Budget fit — score based on how well price fits the target range
  if (p.price_min_cr != null && p.price_max_cr != null) {
    const budgetMax = filters.budget_max_cr
    const budgetMin = filters.budget_min_cr

    if (budgetMax != null) {
      // Ideal: cheapest option is well under budget, leaving headroom
      const headroomRatio = (budgetMax - p.price_min_cr) / budgetMax
      score += Math.max(0, Math.min(25, Math.round(headroomRatio * 25)))
    } else if (budgetMin != null) {
      score += 15 // has price data, partial match
    }
  }

  // Possession status
  if (p.status === 'ready_to_move') {
    score += 15
  } else if (p.possession_date) {
    // Earlier possession = higher score. Full 10 for <12 months, scaling down to 0 for 48+ months
    const monthsToPos = (new Date(p.possession_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
    if (monthsToPos > 0) {
      score += Math.max(0, Math.round(10 * (1 - monthsToPos / 48)))
    }
  }

  // Data quality signals — projects with complete data rank higher
  const unitTypes = p.unit_types ?? []
  const hasVerifiedPrice = unitTypes.length > 0 && unitTypes.some((u) => u.price_min_cr != null)
  if (hasVerifiedPrice) score += 10
  if (p.hero_image_url) score += 8
  if (p.rera_number) score += 7
  if (p.top_connectivity.length > 0) score += 5
  if (p.top_amenities.length > 0) score += 5

  return score
}

export function scoreAndRankProjects(
  cards: ProjectCard[],
  filters: SearchFilters,
  _query?: string,
  topN = 6,
): ProjectCard[] {
  if (cards.length <= 1) return cards

  const scored = cards.map((p) => ({ project: p, score: scoreProject(p, filters) }))
  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, topN).map((s) => s.project)
}

function buildCacheKey(filters: SearchFilters, userQuery?: string): string {
  return makeKey(
    'search',
    filters.city ?? 'noida',
    filters.sector ?? '',
    String(filters.bhk ?? ''),
    String(filters.budget_min_cr ?? ''),
    String(filters.budget_max_cr ?? ''),
    String(filters.possession_year_max ?? ''),
    (userQuery ?? '').toLowerCase().slice(0, 60).replace(/\s+/g, '-'),
  )
}

/**
 * Fast DB query with Redis cache. Returns up to 15 raw results for scoring.
 */
export async function searchProjects(
  filters: SearchFilters,
  userQuery?: string,
): Promise<ProjectCard[]> {
  const cacheKey = buildCacheKey(filters, userQuery)
  const cached = await getCached<ProjectCard[]>(cacheKey)
  if (cached) {
    console.log(`[repo] cache hit key=${cacheKey.slice(0, 80)}`)
    return cached
  }

  const unitConditions: object[] = []
  if (filters.bhk) unitConditions.push({ bhk: filters.bhk })
  if (filters.budget_max_cr != null) unitConditions.push({ price_min_cr: { lte: filters.budget_max_cr } })
  if (filters.budget_min_cr != null) unitConditions.push({ price_max_cr: { gte: filters.budget_min_cr } })

  const rows = await prisma.project.findMany({
    where: {
      ...(filters.city && { city: filters.city }),
      ...(filters.sector && { sector: filters.sector }),
      ...(filters.possession_year_max != null && {
        possession_date: { lte: new Date(filters.possession_year_max, 11, 31) },
      }),
      ...(unitConditions.length > 0 && {
        unit_types: {
          some: unitConditions.length === 1 ? unitConditions[0] : { AND: unitConditions },
        },
      }),
    },
    include: {
      builder: { select: { name: true, slug: true } },
      unit_types: { orderBy: { bhk: 'asc' } },
      amenities: true,
      connectivity: true,
      images: { orderBy: { sort_order: 'asc' }, take: 5 },
    },
    orderBy: { created_at: 'desc' },
    take: 15,
  })

  const cards = rows.map((row) => toProjectCard(row as ProjectWithRelations))

  await setCached(cacheKey, cards.length > 0 ? cards : [], 60 * 30)
  return cards
}

export async function getProjectBySlug(slug: string): Promise<ProjectCard | null> {
  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      builder: { select: { name: true, slug: true } },
      unit_types: { orderBy: { bhk: 'asc' } },
      amenities: true,
      connectivity: true,
      images: { orderBy: { sort_order: 'asc' }, take: 5 },
    },
  })
  return project ? toProjectCard(project as any) : null
}

export async function getProjectDetail(slug: string): Promise<ProjectDetail | null> {
  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      builder: true,
      unit_types: { orderBy: { bhk: 'asc' } },
      amenities: true,
      connectivity: true,
      images: { orderBy: { sort_order: 'asc' }, take: 10 },
    },
  })
  if (!project) return null

  const card = toProjectCard(project as any)
  const b = project.builder

  return {
    ...card,
    long_description: project.long_description ?? null,
    design_theme: project.design_theme ?? null,
    total_units: project.total_units ?? null,
    marketing_claims: project.marketing_claims ?? [],
    all_amenities: project.amenities.map((a: { name: string; category: string }) => ({ name: a.name, category: a.category })),
    all_connectivity: project.connectivity.map((c: { type: string; name: string; distance_km: number | null }) => ({ type: c.type, name: c.name, distance_km: c.distance_km })),
    builder_detail: {
      name: b.name,
      slug: b.slug,
      tagline: b.tagline ?? null,
      description: b.description ?? null,
      founded_year: b.founded_year ?? null,
      headquarters: b.headquarters ?? null,
      website: b.website ?? null,
      credai_member: b.credai_member ?? false,
      delivered_units: b.delivered_units ?? null,
      delivered_projects: b.delivered_projects ?? [],
      ongoing_projects: b.ongoing_projects ?? [],
      awards: b.awards ?? [],
      company_overview: b.company_overview ?? null,
      rera_compliance_score: b.rera_compliance_score ?? null,
      iso_certified: b.iso_certified ?? false,
      logo_url: b.logo_url ?? null,
    } as any,
  } as any
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toProjectCard(p: {
  id: string
  name: string
  builder: { slug: string; name: string }
  rera_number?: string | null
  rera_url?: string | null
  slug: string
  sector: string
  city: string
  address?: string | null
  lat?: number | null
  lng?: number | null
  land_area_acres?: number | null
  total_towers?: number | null
  status: string
  possession_label?: string | null
  possession_date: string | Date | null
  architect?: string | null
  interior_designer?: string | null
  design_theme?: string | null
  marketing_claims: string[]
  hero_image_url?: string | null
  unit_types: Array<{
    bhk: number
    bathrooms?: number | null
    super_area_sqft?: number | null
    carpet_area_sqft?: number | null
    price_min_cr?: number | null
    price_max_cr?: number | null
    price_label?: string | null
    price_is_estimated?: boolean | null
  }>
  amenities: Array<{ name: string; category: string }>
  connectivity: Array<{ type: string; name: string; distance_km: number | null }>
  images: Array<{
    id: string
    url: string
    type: string
    caption: string | null
    sort_order: number
  }>
  tagline?: string | null
}): ProjectCard {
  const allPrices = p.unit_types
    .flatMap((u) => [u.price_min_cr, u.price_max_cr])
    .filter((v): v is number => v != null)

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
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category as any) - CATEGORY_ORDER.indexOf(b.category as any),
  )
  const top_amenities: AmenitySummary[] = sortedAmenities.slice(0, 6).map((a) => ({
    name: a.name,
    category: a.category as any,
  }))

  const top_connectivity: ConnSummary[] = []
  for (const type of CONN_PRIORITY) {
    const found = p.connectivity.find((c: { type: string; name: string; distance_km: number | null }) => c.type === type)
    if (found) top_connectivity.push({ type: found.type as any, name: found.name, distance_km: found.distance_km })
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
    status: p.status as any,
    possession_label: p.possession_label,
    possession_date: p.possession_date ? new Date(p.possession_date).toISOString() : null,
    architect: p.architect,
    interior_designer: p.interior_designer,
    design_theme: p.design_theme,
    marketing_claims: p.marketing_claims,
    hero_image_url: p.hero_image_url,
    price_min_cr,
    price_max_cr,
    price_range_label,
    unit_types: p.unit_types.map(
      (u: any): any => ({
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
    images: p.images?.map((img: { id: string; url: string; type: string; caption: string | null; sort_order: number }) => ({
      id: img.id,
      url: img.url,
      type: img.type,
      caption: img.caption,
      sort_order: img.sort_order,
    })) as any ?? [],
  }
}

// Keep for backward compatibility — callers that import rerankProjects directly
export { scoreAndRankProjects as rerankProjects }
