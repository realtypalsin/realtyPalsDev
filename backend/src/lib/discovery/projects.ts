import { Prisma } from '@prisma/client'
import crypto from 'crypto'
import { prisma } from '../db'
import { getCached, setCached } from '../cache'
import { gatePublished } from '../intelligenceGate'
import { DISCOVERY } from '../config'
import { Intent, ScoredProject, DiscoveryResult } from './types'
import {
  buildDecisionIntelligence,
  buildIntelligenceCompleteness,
  buildBuyerPersonas,
  buildDealBreakers,
  buildWhyNot,
} from '../ai/intelligence'
import {
  SCORE_THRESHOLD,
  BUILDER_ONLY_THRESHOLD,
  MAX_RESULTS,
  BUDGET_TOLERANCE_MAX,
} from './constants'
import {
  scoreProject,
  buildMatchReason,
  buildMatchSignals,
  buildPriceRangeLabel,
  computeBudgetStatus,
} from './scoring'
import { getNearbySectors } from './sectors'
import { isCityLevel } from './intent'
import { CITY_LEVEL_ALIASES } from './constants'
import { SUPPORTED_CITIES } from '../config/cities'

/** Bidirectional substring match — mirrors SQL ILIKE fallback used in discovery Branch 1. Safe against null/undefined. */
export function matchesProjectName(term?: string | null, projectName?: string | null): boolean {
  if (!term || !projectName || typeof term !== 'string' || typeof projectName !== 'string') return false
  const t = term.toLowerCase().trim()
  const n = projectName.toLowerCase().trim()
  return n.includes(t) || t.includes(n)
}

// ─── Shared include ───────────────────────────────────────────────────────────
// Defined once so the main query and expansion query use identical shapes.
// Results per page for pagination (configurable constant).
const RESULTS_PER_PAGE = 20

const PROJECT_INCLUDE = {
  builder: {
    select: {
      id: true,
      name: true,
      slug: true,
      credai_member: true,
      delivered_units: true,
      litigation_count: true,
      legal_flag: true,
    },
  },
  unit_types: {
    select: {
      name: true,
      bhk: true,
      bathrooms: true,
      super_area_sqft: true,
      carpet_area_sqft: true,
      price_min_cr: true,
      price_max_cr: true,
      price_label: true,
      inventory_left: true,
    },
  },
  images: { take: 3, orderBy: { sort_order: 'asc' as const } },
  amenities: { take: 10 },
  connectivity: { take: 5, orderBy: { distance_km: 'asc' as const } },
  // `status` is selected purely so gatePublished() can drop DRAFT profiles —
  // it is stripped again before the project leaves mapToScored().
  recommendation_profile: {
    select: {
      status: true,
      tier: true,
      primary_thesis: true,
      walk_away_conditions: true,
      timeline_advice: true,
    },
  },
  decision_profile: {
    select: {
      status: true,
      decision_thesis: true,
      why_buy: true,
      why_avoid: true,
      best_for: true,
      confidence_sources: true,
      not_ideal_for: true,
    },
  },
  persona_profile: {
    select: {
      primary_persona: true,
      secondary_personas: true,
      income_range: true,
      family_stage: true,
      risk_appetite: true,
      timeline_horizon: true,
    },
  },
  competitors: {
    select: {
      competitor_name: true,
      this_project_advantage: true,
      competitor_advantage: true,
      verdict: true,
      sort_order: true,
    },
    orderBy: { sort_order: 'asc' as const },
  },
  dna: {
    select: {
      overall_score:    true,
      builder_score:    true,
      price_score:      true,
      location_score:   true,
      legal_score:      true,
      amenity_score:    true,
      possession_score: true,
    },
  },
  payment_plans: {
    select: {
      plan_type: true,
      plan_name: true,
      milestones: true,
      notes: true,
    },
    orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
  },
  cost_sheet: {
    select: {
      base_price_per_sqft: true,
      gst_rate_pct: true,
      stamp_duty_pct: true,
      registration_pct: true,
    },
  },
} satisfies Prisma.ProjectInclude

type RawProject = Prisma.ProjectGetPayload<{ include: typeof PROJECT_INCLUDE }>

// ─── Hard filter builder ──────────────────────────────────────────────────────

/**
 * Build Prisma WHERE conditions from hard-filter intent fields.
 * Sector, BHK, budget ceiling, and builder are mandatory — projects failing
 * any of these never enter the candidate pool.
 *
 * BHK and budget are combined into a single unit_types.some({ AND: [...] })
 * to ensure both constraints apply to the SAME unit type. Without this, a
 * project with "3BHK @ 2.5Cr + 1BHK @ 1.2Cr" would falsely match
 * "3BHK under 1.5Cr".
 */
// Region filter for a city-level query ("Noida", "Greater Noida",
// "Greater Noida West" / "Noida Extension"). Sector text wins when it explicitly
// mentions a region ("Sector 10 Greater Noida West"); when the sector text is
// silent about it (e.g. plain "Sector 10"), falls back to the `city` column —
// which we know is inconsistently tagged, so it's only trusted as a tiebreaker,
// never as the primary signal.
function regionFilter(region: 'noida' | 'greater_noida' | 'greater_noida_west'): Prisma.ProjectWhereInput {
  const containsWest: Prisma.ProjectWhereInput = { sector: { contains: 'greater noida west', mode: 'insensitive' } }
  const containsGreaterNoida: Prisma.ProjectWhereInput = { sector: { contains: 'greater noida', mode: 'insensitive' } }
  const sectorSilent: Prisma.ProjectWhereInput = { NOT: containsGreaterNoida }

  if (region === 'greater_noida_west') {
    return { OR: [containsWest, { AND: [sectorSilent, { city: { equals: 'Greater Noida West', mode: 'insensitive' } }] }] }
  }
  if (region === 'greater_noida') {
    return {
      OR: [
        { AND: [containsGreaterNoida, { NOT: containsWest }] },
        { AND: [sectorSilent, { city: { equals: 'Greater Noida', mode: 'insensitive' } }] },
      ],
    }
  }
  // 'noida' — sector text carries no Greater Noida marker, and city (when sector is
  // silent) isn't one of the Greater Noida variants either.
  return {
    AND: [
      sectorSilent,
      { NOT: { city: { equals: 'Greater Noida West', mode: 'insensitive' } } },
      { NOT: { city: { equals: 'Greater Noida', mode: 'insensitive' } } },
    ],
  }
}

export function buildHardFilters(intent: Intent, overrideSectors?: string[]): Prisma.ProjectWhereInput {
  const where: Prisma.ProjectWhereInput = {}

  if (!overrideSectors && intent.sector && isCityLevel(intent.sector)) {
    const region = CITY_LEVEL_ALIASES[intent.sector.toLowerCase().trim()]
    if (region) where.AND = [regionFilter(region)]
  }

  // Sector — whole-word match (case-insensitive).
  // This ensures 'Sector 10' matches 'Sector 10 Greater Noida West' but NOT 'Sector 107'.
  const sectorsToSearch = overrideSectors || (intent.sector && !isCityLevel(intent.sector) ? [intent.sector] : [])

  if (sectorsToSearch.length > 0) {
    where.OR = sectorsToSearch.flatMap((sectorStr) => {
      // Sanitize sector by removing common city suffixes that LLM might append
      let cleanSector = sectorStr
      const cityTerms = [
        ...SUPPORTED_CITIES.map((c) => ` ${c.toLowerCase()}`),
        ' gurgaon', ' gurugram', ' delhi', ' mumbai', ' bangalore', ' hyderabad', ' pune', ' chennai',
        ' noida extension', ' gn west', ' gnw'
      ]
      // Strip trailing commas and regional terms
      cleanSector = cleanSector.replace(/,\s*(greater noida west|greater noida|noida extension|noida|up|uttar pradesh)$/i, '').trim()
      for (const city of cityTerms) {
        if (cleanSector.toLowerCase().endsWith(city)) {
          cleanSector = cleanSector.slice(0, -city.length).trim()
        }
      }
      cleanSector = cleanSector.replace(/^[,\s]+|[,\s]+$/g, '').trim()
      return [
        { sector: { equals: cleanSector, mode: 'insensitive' } },
        { sector: { startsWith: `${cleanSector} `, mode: 'insensitive' } },
        { sector: { endsWith: ` ${cleanSector}`, mode: 'insensitive' } },
        { sector: { contains: ` ${cleanSector} `, mode: 'insensitive' } }
      ]
    })
  }

  // BHK + budget — single AND condition on the same unit type
  const unitConditions: Prisma.UnitTypeWhereInput[] = []
  if (intent.bhk?.length) {
    unitConditions.push({ bhk: { in: intent.bhk } })
  }
  if (intent.budgetMax) {
    // Include both priced units within budget AND unpriced units (price_min_cr: null)
    // This ensures projects with incomplete pricing still appear (AI already handles "pricing not disclosed")
    unitConditions.push({
      OR: [
        { price_min_cr: { lte: intent.budgetMax * BUDGET_TOLERANCE_MAX } },
        { price_min_cr: null }  // Include unpriced units
      ]
    })
  }
  if (unitConditions.length === 1) {
    where.unit_types = { some: unitConditions[0] }
  } else if (unitConditions.length > 1) {
    where.unit_types = { some: { AND: unitConditions } }
  } else if (!intent.budgetMax && !intent.bhk) {
    // No budget or BHK filter: include all projects regardless of pricing
    // (unit_types could be empty or all null-priced)
  }

  // Builder
  if (intent.builderName) {
    where.builder = { name: { contains: intent.builderName, mode: 'insensitive' } }
  }

  // Possession — hard-filter status when buyer explicitly wants RTM.
  // Other possession values ('1year', '2year', '3year+') are soft signals only
  // (handled in scoring) because UC projects with distant possession still apply.
  if (intent.possession === 'immediate') {
    where.status = { in: ['ready_to_move' as any] }
  }

  return where
}

// ─── Builder reputation aggregation (no N+1) ────────────────────────────────

interface BuilderReputation {
  delivered_units: number | null
  litigation_count: number | null
  credai_member: boolean | null
  legal_flag: string | null
}

/**
 * Batch fetch builder reputation metrics for all builders in a result set.
 * Returns a map keyed by builder ID with pre-aggregated metrics.
 * Cached for 1h to avoid repeated DB hits across multiple discovery queries.
 */
async function aggregateBuilderReputation(builderIds: string[]): Promise<Map<string, BuilderReputation>> {
  if (builderIds.length === 0) return new Map()

  const uniqueIds = [...new Set(builderIds)]
  const cacheKey = `builder:reputation:${crypto.createHash('sha256').update(JSON.stringify([...uniqueIds].sort())).digest('hex')}`

  const cached = await getCached<Record<string, BuilderReputation>>(cacheKey)
  if (cached) {
    console.log('[DISCOVERY:BUILDER-CACHE] HIT', cacheKey)
    return new Map(Object.entries(cached))
  }

  const builders = await prisma.builder.findMany({
    where: { id: { in: uniqueIds } },
    select: {
      id: true,
      delivered_units: true,
      litigation_count: true,
      credai_member: true,
      legal_flag: true,
    },
  })

  const reputationMap = new Map<string, BuilderReputation>()
  const reputationRecord: Record<string, BuilderReputation> = {}

  for (const builder of builders) {
    const rep: BuilderReputation = {
      delivered_units: builder.delivered_units,
      litigation_count: builder.litigation_count,
      credai_member: builder.credai_member,
      legal_flag: builder.legal_flag,
    }
    reputationMap.set(builder.id, rep)
    reputationRecord[builder.id] = rep
  }

  await setCached(cacheKey, reputationRecord, 3600) // 1h TTL
  return reputationMap
}

// ─── Raw project → ScoredProject mapper ──────────────────────────────────────

function mapToScored(raw: RawProject, intent: Intent): ScoredProject {
  // Single choke point for every discovery query. Unpublished analysis is nulled
  // here so scoring, match signals, decisionIntelligence and the chat prompt all
  // see the same verified-only view — none of them need their own gate.
  const p = {
    ...raw,
    decision_profile: gatePublished(raw.decision_profile),
    recommendation_profile: gatePublished(raw.recommendation_profile),
  }

  const allPrices    = p.unit_types.filter((u) => u.price_min_cr != null).map((u) => u.price_min_cr!)
  const allMaxPrices = p.unit_types.filter((u) => u.price_max_cr != null).map((u) => u.price_max_cr!)
  const minP = allPrices.length    ? Math.min(...allPrices)    : null
  const maxP = allMaxPrices.length ? Math.max(...allMaxPrices) : null

  // For budget status: use only units matching the BHK filter (if set) to get
  // the most relevant price signal for the user's actual configuration.
  const relevantUnits = intent.bhk?.length
    ? p.unit_types.filter((u) => intent.bhk!.includes(u.bhk))
    : p.unit_types

  const budgetStatus = computeBudgetStatus(
    relevantUnits.length ? relevantUnits : p.unit_types,
    intent
  )

  // Phase 5: Compute sector tier for boost
  // Import here to avoid circular dependency
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { computeSectorTier } = require('./sectorTiers')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getMarketTier } = require('./marketTiers')

  const sectorIntelligence = (p as any).sector_intelligence // populated via dynamic SQL join if available
  let sectorTier: any = undefined
  if (sectorIntelligence) {
    const tierInfo = computeSectorTier({
      city: p.city,
      sector: p.sector,
      sector_stage: sectorIntelligence.sector_stage,
      avg_price_per_sqft: sectorIntelligence.avg_price_per_sqft,
      price_5yr_cagr_pct: sectorIntelligence.price_5yr_cagr_pct,
    })
    sectorTier = tierInfo.tier
  }

  // Get market tier from lowest price
  const marketTierValue = getMarketTier(minP)

  const matchScore = Math.max(
    scoreProject(
      {
        unit_types: p.unit_types,
        possession_date: p.possession_date,
        amenities: p.amenities,
        ai_search_keywords: p.ai_search_keywords,
        builder: p.builder,
        hero_image_url: p.hero_image_url,
        images: p.images,
        rera_number: p.rera_number,
        recommendation_profile: p.recommendation_profile,
        project_risk_flag: p.project_risk_flag,
        persona_profile: p.persona_profile,
      },
      intent,
      budgetStatus,
      sectorTier // Phase 5: pass sector tier for boost
    ),
    0
  )

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
    status: String(p.status),
    launch_date: p.launch_date ? p.launch_date.toISOString() : null,
    possession_label: p.possession_label ?? null,
    possession_date: p.possession_date ? p.possession_date.toISOString() : null,
    architect: p.architect ?? null,
    interior_designer: p.interior_designer ?? null,
    design_theme: p.design_theme ?? null,
    project_risk_flag: (p as any).project_risk_flag ?? null,
    nclt_moratorium_active: (p as any).nclt_moratorium_active ?? null,
    registry_status: (p as any).registry_status ?? null,
    marketing_claims: p.marketing_claims,
    hero_image_url: p.hero_image_url ?? null,
    price_min_cr: minP,
    price_max_cr: maxP,
    price_range_label: buildPriceRangeLabel(minP, maxP),
    floor_plan_count: p.unit_types.length,
    project_status: String(p.status),
    amenity_count: p.amenities.length,
    construction_progress_pct: (p as any).construction_milestones?.find((m: any) => m.critical_path)?.completion_pct ?? 0,
    unit_types: p.unit_types.map((u) => ({
      name: u.name,
      bhk: u.bhk,
      bathrooms: u.bathrooms ?? null,
      super_area_sqft: u.super_area_sqft ?? null,
      carpet_area_sqft: u.carpet_area_sqft ?? null,
      price_min_cr: u.price_min_cr ?? null,
      price_max_cr: u.price_max_cr ?? null,
      price_label: u.price_label ?? null,
      inventory_left: u.inventory_left ?? null,
    })),
    top_amenities: p.amenities.map((a) => ({
      name: a.name,
      category: String(a.category),
    })),
    top_connectivity: p.connectivity.map((c) => ({
      type: String(c.type),
      name: c.name,
      distance_km: c.distance_km ?? null,
    })),
    images: p.images.map((img) => ({
      id: img.id,
      url: img.url,
      type: String(img.type),
      caption: img.caption ?? null,
      bhk: img.bhk ?? null,
      size_sqft: img.size_sqft ?? null,
      sort_order: img.sort_order,
    })),
    matchScore,
    matchReason: buildMatchReason(p, intent, budgetStatus),
    distance_km: (p as any).distance_km ?? null,
    market_tier: marketTierValue, // Phase 5: market tier tag
    ...buildMatchSignals(
      {
        unit_types: p.unit_types,
        sector: p.sector,
        rera_number: p.rera_number,
        possession_date: p.possession_date,
        possession_label: p.possession_label,
        status: String(p.status),
        project_risk_flag: (p as any).project_risk_flag ?? null,
        builder: p.builder,
        decision_profile: p.decision_profile,
        recommendation_profile: p.recommendation_profile,
        amenities: p.amenities,
        ai_search_keywords: p.ai_search_keywords,
      },
      intent,
      budgetStatus
    ),
    budgetStatus,
    best_for: p.decision_profile?.best_for ?? null,
    recommendation_profile: p.recommendation_profile ?? null,
    decision_profile: p.decision_profile ?? null,
    persona_profile: p.persona_profile ?? null,
    competitors: p.competitors ?? [],
    dna: (p.dna ?? null) as any,
    // Eager intelligence — pure sync, no DB cost
    decisionIntelligence: buildDecisionIntelligence({
      dna: p.dna ?? null,
      project_risk_flag: (p as any).project_risk_flag ?? null,
      rera_number: p.rera_number ?? null,
      status: String(p.status),
      possession_date: p.possession_date ? p.possession_date.toISOString() : null,
      builder: p.builder,
      decision_profile: p.decision_profile ?? null,
      recommendation_profile: p.recommendation_profile ?? null,
      persona_profile: p.persona_profile ?? null,
      sector: p.sector,
      amenities: p.amenities,
    }),
    intelligenceCompleteness: buildIntelligenceCompleteness({
      dna: p.dna ?? null,
      rera_number: p.rera_number ?? null,
    }),
    buyerPersonas: buildBuyerPersonas({
      dna: p.dna ?? null,
      status: String(p.status),
      project_risk_flag: (p as any).project_risk_flag ?? null,
      persona_profile: p.persona_profile ?? null,
      amenities: p.amenities,
    }),
    dealBreakers: buildDealBreakers({
      dna: p.dna ?? null,
      builder: p.builder,
      rera_number: p.rera_number ?? null,
      project_risk_flag: (p as any).project_risk_flag ?? null,
      status: String(p.status),
    }),
    whyNot: null, // populated post-sort by scoreAndSort()
  }
}

function scoreAndSort(
  rawProjects: RawProject[],
  intent: Intent,
  threshold: number
): ScoredProject[] {
  const scored = rawProjects.map((p) => mapToScored(p, intent))
  let passed = scored.filter((p) => p.matchScore >= threshold)
  
  // Fallback: If no projects pass the strict threshold, but we have valid projects (score ≥ 10),
  // return the best ones rather than falsely claiming no inventory.
  // Minimum score floor of 10 prevents returning near-zero-relevance results.
  if (passed.length === 0) {
    const MIN_SCORE_FLOOR = 10
    const valid = scored.filter((p) => p.matchScore >= MIN_SCORE_FLOOR)
    if (valid.length > 0) {
      console.log('[DISCOVERY:FALLBACK] No projects met threshold. Falling back to best available (floor: ' + MIN_SCORE_FLOOR + ').')
      passed = valid
    }
  }

  const excluded = scored.filter((p) => !passed.includes(p))
  if (excluded.length > 0) {
    console.log('[DISCOVERY:EXCLUDED]', excluded.map((p) => ({
      name:  p.name,
      score: p.matchScore,
      threshold,
    })))
  }
  const sorted = passed.sort((a, b) => b.matchScore - a.matchScore)

  // Populate whyNot for non-top results now that ranking is known
  if (sorted.length > 1) {
    const top = sorted[0]
    for (let i = 1; i < sorted.length; i++) {
      sorted[i] = {
        ...sorted[i],
        whyNot: buildWhyNot(sorted[i], top),
      }
    }
  }

  console.log('[DISCOVERY:SCORED]', {
    raw:      rawProjects.length,
    passed:   passed.length,
    excluded: excluded.length,
    threshold,
    results:  sorted.map((p) => ({ name: p.name, score: p.matchScore })),
    returned: sorted.length,
  })
  return sorted
}

// ─── Main discovery function ──────────────────────────────────────────────────

// Generic descriptors that are NOT real project names. If the LLM
// incorrectly puts these into projectNames, we skip Branch 1 so the
// budget/sector hard-filter path (Branch 2) runs instead.
// Generic words that cannot be part of a real branded project name.
const GENERIC_NAME_WORDS = new Set([
  'best', 'good', 'top', 'affordable', 'cheap', 'budget', 'luxury',
  'premium', 'nice', 'great', 'better', 'worst', 'project', 'flat',
  'apartment', 'property', 'house', 'home', 'option', 'choice',
])

// Markers that indicate the LLM dumped a search query into projectNames
// rather than extracting a real brand name.
const QUERY_MARKERS = /\b(under|above|below|crore|cr|lakh|bhk|sector|budget|under\s*\d|in\s+sector)\b/i

function isGenericName(name: string): boolean {
  // A name containing query-language markers is a search phrase, not a brand.
  if (QUERY_MARKERS.test(name)) return true
  const words = name.toLowerCase().split(/\s+/)
  return words.every((w) => GENERIC_NAME_WORDS.has(w))
}

export async function discoverProjects(intent: Intent, offset: number = 0): Promise<DiscoveryResult> {
  // Include offset in cache key so different pages don't collide
  const cacheKey = `discovery:${crypto.createHash('sha256').update(JSON.stringify({ ...intent, offset })).digest('hex')}`
  const cached = await getCached<DiscoveryResult>(cacheKey)
  if (cached) {
    console.log('[DISCOVERY:CACHE] HIT', cacheKey)
    return cached
  }

  // Validate offset
  if (offset < 0) {
    throw new Error('offset must be >= 0')
  }

  // ── Branch 1: explicit project names → direct fetch, skip all filters ──
  // Filter out generic descriptors that the LLM may have incorrectly placed
  // in projectNames (e.g. "Best project", "affordable flat").
  const realProjectNames = (intent.projectNames ?? []).filter((n) => !isGenericName(n))
  if (realProjectNames.length !== (intent.projectNames?.length ?? 0)) {
    console.log('[DISCOVERY:B1] filtered generic names:', JSON.stringify(intent.projectNames), '→', JSON.stringify(realProjectNames))
  }
  const effectiveIntent = realProjectNames.length !== (intent.projectNames?.length ?? 0)
    ? { ...intent, projectNames: realProjectNames.length > 0 ? realProjectNames : undefined }
    : intent

  if ((effectiveIntent.projectNames?.length ?? 0) > 0) {
    console.log('[DISCOVERY:B1] requested:', JSON.stringify(effectiveIntent.projectNames))
    // Prisma `contains` = SQL ILIKE '%term%' — checks if DB name contains the search term.
    // Fails when the LLM appends extra words to the project name (e.g. "Godrej Palm Retreat Sector 150")
    // because the DB name "Godrej Palm Retreat" does NOT contain the longer string.
    for (const n of effectiveIntent.projectNames!) {
      console.log(`[DISCOVERY:B1]   term="${n}"  SQL: name ILIKE '%${n}%'`)
    }
    let byName = await prisma.project.findMany({
      where: {
        OR: effectiveIntent.projectNames!.flatMap((n) => {
          const words = n.trim().split(/\s+/).filter((w) => w.length >= 3)
          const conditions: Prisma.ProjectWhereInput[] = [
            { name: { contains: n, mode: 'insensitive' as const } },
            { slug: { contains: n.toLowerCase().replace(/\s+/g, '-'), mode: 'insensitive' as const } },
          ]
          if (words.length > 0) {
            conditions.push({
              AND: words.map((w) => ({
                OR: [
                  { name: { contains: w, mode: 'insensitive' as const } },
                  { slug: { contains: w, mode: 'insensitive' as const } },
                ],
              })),
            })
          }
          return conditions
        }),
      },
      include: PROJECT_INCLUDE,
      take: 50,
    })
    const foundNames = byName.map((p) => p.name)
    console.log(`[DISCOVERY:B1] matched ${byName.length}/${effectiveIntent.projectNames!.length}:`, JSON.stringify(foundNames))
    for (const n of effectiveIntent.projectNames!) {
      const hit = byName.find((p) => matchesProjectName(n, p.name))
      if (!hit) {
        console.log(`[DISCOVERY:B1]   MISS: "${n}" — no DB project name satisfies ILIKE '%${n}%'`)
        if (byName.length === 0 && effectiveIntent.projectNames!.length === 1) {
          console.log(`[DISCOVERY:B1]   MISS REASON: project may not exist in database (check seed data)`)
        } else {
          console.log(`[DISCOVERY:B1]   MISS REASON: likely intent extracted extra words (e.g. sector/city suffix) making search term longer than DB name`)
        }
      }
    }
    // Detect which requested names had no DB match — used to inject
    // PROJECT_NOT_FOUND signals into the system prompt so the AI cannot fabricate.
    // Single search term → multiple distinct projects: return disambiguation signal.
    // The chat route will short-circuit and ask "which one?" instead of silently picking.
    if (effectiveIntent.projectNames!.length === 1 && byName.length > 1) {
      const query = effectiveIntent.projectNames![0]
      const exactMatch = byName.find((p) => p.name.toLowerCase() === query.trim().toLowerCase() || p.slug.toLowerCase() === query.trim().toLowerCase())
      if (exactMatch) {
        console.log(`[DISCOVERY:B1] EXACT-MATCH found for "${query}": ${exactMatch.name} (${exactMatch.sector}) — bypassing disambiguation`)
        byName = [exactMatch]
      } else {
        console.log(`[DISCOVERY:B1] MULTI-MATCH: "${query}" matched ${byName.length} projects — disambiguation required`)
        const res: DiscoveryResult = {
          exactResults: [],
          nearbyResults: [],
          disambiguation: {
            query,
            candidates: byName.map((p) => ({ name: p.name, sector: p.sector, builder: (p as any).builder?.name || '' })),
          },
        }
        await setCached(cacheKey, res, 300)
        return res
      }
    }

    const notFoundNames = effectiveIntent.projectNames!.filter(
      (n) => !byName.some(
        (p) =>
          p.name.toLowerCase().includes(n.toLowerCase()) ||
          n.toLowerCase().includes(p.name.toLowerCase())
      )
    )

    const res: DiscoveryResult = {
      exactResults: byName.map((p) => ({
        ...mapToScored(p, {}),
        matchScore: 100,
        matchReason: 'Directly requested',
        matchReasons: ['Directly requested'],
        concerns: [],
        budgetStatus: undefined,
      })),
      nearbyResults: [],
      ...(notFoundNames.length > 0 ? { notFoundNames } : {}),
    }
    await setCached(cacheKey, res, 300)
    return res
  }

  // ── Branch 2: Spatial scope handling (EXACT vs PROXIMITY vs BROAD) ──────
  // Import geospatial utilities
  const { getSectorCentroid, getProjectsWithinRadius } = await import('./geo')

  interface SpatialCtx {
    anchorSector?: string
    anchorCoords?: { lat: number; lng: number }
    radiusKm?: number
    spatialScope?: 'EXACT' | 'PROXIMITY' | 'BROAD'
  }

  let spatialContext: SpatialCtx = {}
  let rawProjectsFromSpatial: Array<{ id: string; name: string; lat: number; lng: number; sector: string; distance_km: number }> = []
  let spatialScope: 'EXACT' | 'PROXIMITY' | 'BROAD' = effectiveIntent.spatialScope || (effectiveIntent.sector ? 'EXACT' : 'BROAD')

  if (spatialScope === 'PROXIMITY' && effectiveIntent.sector) {
    // PROXIMITY mode: radial search within radiusKm (default 3.5 km)
    console.log(`[DISCOVERY:SPATIAL] PROXIMITY mode for "${effectiveIntent.sector}"`)
    const centroid = await getSectorCentroid(effectiveIntent.sector, effectiveIntent.city)

    if (centroid) {
      spatialContext = {
        anchorSector: effectiveIntent.sector,
        anchorCoords: centroid,
        radiusKm: effectiveIntent.radiusKm || 3.5,
        spatialScope: 'PROXIMITY',
      }

      const baseWhereClause = buildHardFilters({ ...effectiveIntent, sector: undefined }, undefined)
      rawProjectsFromSpatial = await getProjectsWithinRadius(
        centroid.lat,
        centroid.lng,
        effectiveIntent.radiusKm || 3.5,
        baseWhereClause
      )
      console.log(`[DISCOVERY:SPATIAL] Found ${rawProjectsFromSpatial.length} projects within ${effectiveIntent.radiusKm || 3.5}km of ${effectiveIntent.sector}`)

      // Process PROXIMITY results: fetch full project data, partition into exact + nearby, return early
      if (rawProjectsFromSpatial.length > 0) {
        const projectIds = rawProjectsFromSpatial.map((p) => p.id)
        const fullProjects = await prisma.project.findMany({
          where: { id: { in: projectIds } },
          include: PROJECT_INCLUDE,
          take: RESULTS_PER_PAGE,
        })

        if (fullProjects.length > 0) {
          // Build distance map for O(1) lookup (avoid O(n²) with find())
          const distanceMap = new Map(rawProjectsFromSpatial.map((r) => [r.id, r.distance_km]))

          const projectsWithDistance = fullProjects.map((p) => ({
            ...p,
            distance_km: distanceMap.get(p.id) || null,
          }))

          // Partition: exact sector vs nearby sectors
          const exactSector = projectsWithDistance.filter((p) => p.sector === effectiveIntent.sector)
          const nearbySectors = projectsWithDistance.filter((p) => p.sector !== effectiveIntent.sector)

          const scoredExact = scoreAndSort(exactSector as RawProject[], effectiveIntent, SCORE_THRESHOLD)
          const scoredNearby = scoreAndSort(nearbySectors as RawProject[], effectiveIntent, SCORE_THRESHOLD)

          const hasMore = projectsWithDistance.length >= RESULTS_PER_PAGE
          const res: DiscoveryResult = {
            exactResults: scoredExact,
            nearbyResults: scoredNearby,
            spatialContext,
            pageIndex: 0,
            totalCount: projectsWithDistance.length,
            hasMore,
          }
          await setCached(cacheKey, res, 300)
          return res
        }
      }
    } else {
      console.warn(`[DISCOVERY:SPATIAL] Failed to get centroid for "${effectiveIntent.sector}" — falling back to EXACT`)
      spatialScope = 'EXACT'
    }
  }

  // ── Branch 3: primary hard-filter query ────────────────────────────────
  // Use effectiveIntent so budget/sector signals still apply even when
  // generic names were stripped from projectNames above.
  const where = buildHardFilters(effectiveIntent)

  // Get total count and paginated results
  let totalCount = 0
  let rawProjectsUnpaginated: any[] = []
  try {
    const [count, list] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        include: PROJECT_INCLUDE,
        skip: offset,
        take: RESULTS_PER_PAGE,
      }),
    ])
    totalCount = count
    rawProjectsUnpaginated = list
  } catch (dbErr) {
    console.warn('[DISCOVERY:DB_WARN] Connection pool exhausted or query failed:', (dbErr as Error).message)
  }

  let rawProjects = rawProjectsUnpaginated

  // Fallback: if sector-only query returned 0 results, try simplified sector-only search
  // Only applies when spatialScope is NOT EXACT or when query had no hard constraints (BHK/budget)
  if (
    rawProjects.length === 0 &&
    effectiveIntent.sector &&
    !isCityLevel(effectiveIntent.sector) &&
    !effectiveIntent.projectNames?.length &&
    (spatialScope !== 'EXACT' || (!effectiveIntent.bhk?.length && !effectiveIntent.budgetMax))
  ) {
    console.log(`[DISCOVERY:B2-FALLBACK] No results with full filters. Trying sector-only query for "${effectiveIntent.sector}"`)
    try {
      rawProjects = await prisma.project.findMany({
        where: {
          OR: [
            { sector: { equals: effectiveIntent.sector, mode: 'insensitive' } },
            { sector: { startsWith: `${effectiveIntent.sector} `, mode: 'insensitive' } },
          ],
        },
        include: PROJECT_INCLUDE,
        take: 50,
      })
    } catch {
      rawProjects = []
    }
    if (rawProjects.length > 0) {
      console.log(`[DISCOVERY:B2-FALLBACK] Found ${rawProjects.length} projects in sector-only fallback`)
    }
  }

  if (rawProjects.length > 0) {
    if (effectiveIntent.sector && !isCityLevel(effectiveIntent.sector)) {
      // ── Check for CITY-LEVEL disambiguation first ──
      // If user provided only a sector (no BHK/budget/etc) and it exists in multiple cities, ask which city
      const isSectorOnly = !effectiveIntent.bhk?.length && !effectiveIntent.budgetMax && !effectiveIntent.builderName && !effectiveIntent.lifestyleKeywords?.length && !effectiveIntent.projectNames?.length

      if (isSectorOnly) {
        const projectsByCity = new Map<string, typeof rawProjects[0][]>()
        for (const p of rawProjects) {
          if (!projectsByCity.has(p.city)) {
            projectsByCity.set(p.city, [])
          }
          projectsByCity.get(p.city)!.push(p)
        }

        if (projectsByCity.size > 1) {
          console.log(`[DISCOVERY:B2] CITY MULTI-MATCH: "${effectiveIntent.sector}" exists in ${projectsByCity.size} cities:`, Array.from(projectsByCity.keys()))
          const res: DiscoveryResult = {
            exactResults: [],
            nearbyResults: [],
            cityDisambiguation: {
              query: effectiveIntent.sector,
              candidates: Array.from(projectsByCity.keys()).map(city => ({
                city,
                label: city
              }))
            }
          }
          await setCached(cacheKey, res, 300)
          return res
        }
      }

      // ── Check for SECTOR-LEVEL disambiguation ──
      let distinctSectors = [...new Set(rawProjects.map((p) => p.sector))]

      // Auto-resolve ambiguity if user's intent exactly matches one of the distinct sectors (ignoring punctuation/case)
      const exactMatch = distinctSectors.find(s =>
        s.replace(/[,.-]/g, '').toLowerCase().trim() === effectiveIntent.sector!.replace(/[,.-]/g, '').toLowerCase().trim()
      )

      if (exactMatch) {
        distinctSectors = [exactMatch]
        rawProjects = rawProjects.filter(p => p.sector === exactMatch)
      }

      if (distinctSectors.length > 1) {
        console.log(`[DISCOVERY:B2] SECTOR MULTI-MATCH: "${effectiveIntent.sector}" matched ${distinctSectors.length} distinct sectors:`, distinctSectors)
        const res: DiscoveryResult = {
          exactResults: [],
          nearbyResults: [],
          sectorDisambiguation: {
            query: effectiveIntent.sector,
            candidates: distinctSectors
          }
        }
        await setCached(cacheKey, res, 300)
        return res
      }
    }

    // Builder-only queries (no BHK/budget/sector) bypass score threshold
    // so every builder project surfaces regardless of soft-signal richness.
    const isBuilderOnly =
      !!effectiveIntent.builderName &&
      !effectiveIntent.bhk?.length &&
      !effectiveIntent.budgetMax &&
      (!effectiveIntent.sector || isCityLevel(effectiveIntent.sector))

    const threshold = isBuilderOnly ? BUILDER_ONLY_THRESHOLD : SCORE_THRESHOLD
    const scored = scoreAndSort(rawProjects, effectiveIntent, threshold)
    const hasMore = offset + RESULTS_PER_PAGE < totalCount
    const pageIndex = Math.floor(offset / RESULTS_PER_PAGE)
    const res: DiscoveryResult = {
      exactResults: scored,
      nearbyResults: [],
      pageIndex,
      totalCount,
      hasMore,
      spatialContext: {
        ...spatialContext,
        spatialScope: spatialScope || 'BROAD',
      },
    }
    await setCached(cacheKey, res, 300)
    return res
  }

  // ── Branch 3: nearby sector expansion (parallel) ─────────────────────
  // Only fires when:
  // 1. spatialScope !== 'EXACT' (user didn't strictly request "in Sector X")
  // 2. spatialScope !== 'PROXIMITY' (handled above with radial search)
  // 3. An explicit (non-city-level) sector was in the intent
  // Queries all adjacent sectors in parallel → collects all candidates →
  // scores and returns the best across the entire neighbourhood.
  if (
    effectiveIntent.sector &&
    !isCityLevel(effectiveIntent.sector) &&
    spatialScope !== 'EXACT' &&
    spatialScope !== 'PROXIMITY'
  ) {
    const nearbySectors = getNearbySectors(effectiveIntent.sector)
    if (nearbySectors.length > 0) {
      const nearbyWhere = buildHardFilters({ ...effectiveIntent, sector: undefined }, nearbySectors)
      const [nearbyTotalCount, allExpandedRaw] = await Promise.all([
        prisma.project.count({ where: nearbyWhere }),
        prisma.project.findMany({
          where: nearbyWhere,
          include: PROJECT_INCLUDE,
          skip: offset,
          take: RESULTS_PER_PAGE,
        }),
      ])

      if (allExpandedRaw.length > 0) {
        const scored = scoreAndSort(allExpandedRaw, effectiveIntent, SCORE_THRESHOLD)
        if (scored.length > 0) {
          const searchedSectors = [...new Set(allExpandedRaw.map(p => p.sector))]
          const hasMore = offset + RESULTS_PER_PAGE < nearbyTotalCount
          const pageIndex = Math.floor(offset / RESULTS_PER_PAGE)
          const res: DiscoveryResult = {
            exactResults: [],
            nearbyResults: scored,
            expansion: {
              requestedSector: effectiveIntent.sector,
              searchedSectors,
              reason: 'no_results_in_requested_sector',
            },
            pageIndex,
            totalCount: nearbyTotalCount,
            hasMore,
            spatialContext,
          }
          await setCached(cacheKey, res, 300)
          return res
        }
      }
    }
  }

  // ── Branch 4: NO-FALLBACK enforcement for EXACT spatial scope ──────────
  // If user explicitly asked for "in Sector X" (EXACT scope) and we have zero results,
  // DO NOT fall back to city-wide recommendations. This prevents false positives and
  // maintains trust. Show empty state with error messaging in frontend.
  if (effectiveIntent.sector && spatialScope === 'EXACT') {
    console.warn(
      `[DISCOVERY:NOFALLBACK] EXACT scope query for "${effectiveIntent.sector}" yielded no results — refusing fallback per trust policy`
    )
    const res: DiscoveryResult = {
      exactResults: [],
      nearbyResults: [],
      expansion: {
        requestedSector: effectiveIntent.sector,
        searchedSectors: [effectiveIntent.sector],
        reason: 'no_inventory_in_exact_sector_nofallback',
      },
      spatialContext: {
        ...spatialContext,
        spatialScope: 'EXACT',
        anchorSector: effectiveIntent.sector,
      },
    }
    await setCached(cacheKey, res, 300)
    return res
  }

  // ── Branch 4: Fallback to top city projects ─────────────────────────────
  // If the sector was completely unknown, fetch top projects across the city
  // so we can still push our own inventory instead of a dead end.
  // NOTE: This fallback is ONLY for BROAD scope queries (region-level searches)
  const fallbackWhere = { city: { equals: DISCOVERY.DEFAULT_CITY, mode: 'insensitive' as const } }
  const [fallbackTotalCount, fallbackRaw] = await Promise.all([
    prisma.project.count({ where: fallbackWhere }),
    prisma.project.findMany({
      where: fallbackWhere,
      include: PROJECT_INCLUDE,
      skip: offset,
      take: RESULTS_PER_PAGE,
      orderBy: { created_at: 'desc' },
    }),
  ])

  const scoredFallback = scoreAndSort(fallbackRaw as RawProject[], effectiveIntent, 0)
  const hasMore = offset + RESULTS_PER_PAGE < fallbackTotalCount
  const pageIndex = Math.floor(offset / RESULTS_PER_PAGE)

  const res: DiscoveryResult = {
    exactResults: [],
    nearbyResults: scoredFallback,
    expansion: {
      requestedSector: effectiveIntent.sector || 'Unknown',
      searchedSectors: ['Noida Citywide Top Properties'],
      reason: 'no_results_in_requested_sector',
    },
    pageIndex,
    totalCount: fallbackTotalCount,
    hasMore,
    spatialContext: {
      ...spatialContext,
      spatialScope: 'BROAD',
    },
  }
  await setCached(cacheKey, res, 300)
  return res
}

/**
 * Phase 5: Curated ranking helpers
 * Registered as tools when queryKind=RANKING
 */

/**
 * Get best value projects for a sector and budget.
 * Sorted by (headroom + amenity_depth).
 */
export async function bestValueProjects(
  sector: string,
  budgetMaxCr?: number
): Promise<ScoredProject[]> {
  const where: Prisma.ProjectWhereInput = {
    sector: { equals: sector, mode: 'insensitive' },
    status: { in: ['under_construction', 'ready_to_move'] },
  }

  const projects = await prisma.project.findMany({
    where,
    include: PROJECT_INCLUDE,
    take: 10,
  })

  const scored = projects.map((p) => mapToScored(p as RawProject, { budgetMax: budgetMaxCr }))
  // Sort by match score (which includes headroom + amenities)
  return scored.sort((a, b) => b.matchScore - a.matchScore)
}

/**
 * Get fastest possession projects for a sector and budget.
 * Possession date ascending, filter >12mo delays.
 */
export async function fastestPossessionProjects(
  sector: string,
  budgetMaxCr?: number
): Promise<ScoredProject[]> {
  const cutoffDate = new Date()
  cutoffDate.setMonth(cutoffDate.getMonth() + 36) // 3 years from now

  const where: Prisma.ProjectWhereInput = {
    sector: { equals: sector, mode: 'insensitive' },
    status: { in: ['under_construction', 'ready_to_move'] },
    possession_date: { lte: cutoffDate },
  }

  const projects = await prisma.project.findMany({
    where,
    include: PROJECT_INCLUDE,
    orderBy: { possession_date: 'asc' },
    take: 10,
  })

  const scored = projects.map((p) => mapToScored(p as RawProject, { budgetMax: budgetMaxCr }))
  // Already sorted by possession_date from DB
  return scored.sort((a, b) => {
    const aDate = a.possession_date ? new Date(a.possession_date) : new Date(9999, 0, 1)
    const bDate = b.possession_date ? new Date(b.possession_date) : new Date(9999, 0, 1)
    return aDate.getTime() - bDate.getTime()
  })
}

/**
 * Get best projects for families (school/amenities focus).
 */
export async function bestForFamiliesProjects(
  sector: string,
  budgetMaxCr?: number
): Promise<ScoredProject[]> {
  const where: Prisma.ProjectWhereInput = {
    sector: { equals: sector, mode: 'insensitive' },
    status: { in: ['under_construction', 'ready_to_move'] },
  }

  const projects = await prisma.project.findMany({
    where,
    include: PROJECT_INCLUDE,
    take: 10,
  })

  const scored = projects.map((p) => mapToScored(p as RawProject, { budgetMax: budgetMaxCr }))

  // Sort by amenity count + school/connectivity signals
  return scored.sort((a, b) => {
    const aAmenities = a.top_amenities?.length || 0
    const aSchools = a.top_connectivity?.filter((c) => c.type.toLowerCase().includes('school')).length || 0
    const bAmenities = b.top_amenities?.length || 0
    const bSchools = b.top_connectivity?.filter((c) => c.type.toLowerCase().includes('school')).length || 0

    const aScore = aAmenities * 2 + aSchools * 3
    const bScore = bAmenities * 2 + bSchools * 3
    return bScore - aScore
  })
}
