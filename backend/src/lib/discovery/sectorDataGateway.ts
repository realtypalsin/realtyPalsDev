// backend/src/lib/discovery/sectorDataGateway.ts
import { prisma } from '../db'

export interface MicroMarketSummary {
  microMarket: string
  city: string
  sectors: string[]
  avgPricePerSqft: number
  priceRange: { min: number; max: number }
  lifestyleTags: string[]
  dominantSegment: string
  highlights: string[]
}

export interface SectorFullIntelligence {
  city: string
  sector: string
  microMarket: string | null
  sectorStage: string | null
  dominantSegment: string | null
  avgPricePerSqft: number | null
  price5yrCagrPct: number | null
  rentalYieldPct: number | null
  avgRent3bhkMonthly: number | null
  lifestyleTags: string[]
  sectorStrengths: string[]
  sectorWeaknesses: string[]
  whoShouldBuy: string | null
  whoShouldAvoid: string | null
  commuteAnchors: Record<string, number> | null
  utilitiesProfile: Record<string, unknown> | null
  statutoryRates: Record<string, unknown> | null
  infrastructurePipeline: Record<string, unknown> | null
}

// In-memory cache with 10-minute TTL
interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const CACHE_TTL_MS = 10 * 60 * 1000
const cityMicroMarketsCache = new Map<string, CacheEntry<MicroMarketSummary[]>>()
const sectorIntelligenceCache = new Map<string, CacheEntry<SectorFullIntelligence | null>>()

/**
 * Fetch and aggregate all distinct micro-markets for a given city dynamically from DB.
 */
export async function getCityMicroMarkets(city: string = 'Noida'): Promise<MicroMarketSummary[]> {
  const cacheKey = city.toLowerCase().trim()
  const cached = cityMicroMarketsCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  try {
    let records: any[] = []
    try {
      records = await prisma.sectorIntelligence.findMany({
        where: {
          city: {
            contains: city,
            mode: 'insensitive'
          }
        },
        orderBy: {
          avg_price_per_sqft: 'desc'
        }
      })
    } catch {
      // Direct SQL fallback if Prisma client model cache has not reloaded
      records = await prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM "sector_intelligence"
        WHERE LOWER("city") LIKE $1
        ORDER BY "avg_price_per_sqft" DESC NULLS LAST
      `, `%${city.toLowerCase()}%`)
    }

    if (!records || records.length === 0) {
      return []
    }

    // Group by micro_market
    const grouped = new Map<string, any[]>()
    for (const r of records) {
      const mm = r.micro_market || 'General Corridor'
      const list = grouped.get(mm) || []
      list.push(r)
      grouped.set(mm, list)
    }

    const summaries: MicroMarketSummary[] = []
    for (const [microMarket, items] of grouped.entries()) {
      const sectors = items.map(i => i.sector)
      const validPrices = items.map(i => i.avg_price_per_sqft).filter((p): p is number => p != null && p > 0)
      const avgPrice = validPrices.length > 0
        ? Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length)
        : 0
      const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0
      const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0

      // Collect unique lifestyle tags across sectors in this micro-market
      const tagSet = new Set<string>()
      for (const item of items) {
        if (Array.isArray(item.lifestyle_tags)) {
          for (const tag of item.lifestyle_tags) {
            tagSet.add(tag)
          }
        }
      }

      // Collect top strengths
      const allStrengths = items.flatMap(i => Array.isArray(i.sector_strengths) ? i.sector_strengths : [])
      const highlights = Array.from(new Set(allStrengths)).slice(0, 3)

      summaries.push({
        microMarket,
        city: items[0].city,
        sectors,
        avgPricePerSqft: avgPrice,
        priceRange: { min: minPrice, max: maxPrice },
        lifestyleTags: Array.from(tagSet).slice(0, 5),
        dominantSegment: items[0].dominant_segment || 'Residential',
        highlights
      })
    }

    cityMicroMarketsCache.set(cacheKey, { data: summaries, expiresAt: Date.now() + CACHE_TTL_MS })
    return summaries
  } catch (err) {
    console.error('[sectorDataGateway:getCityMicroMarkets:error]', err)
    return []
  }
}

/**
 * Fetch full intelligence for a specific city + sector.
 */
export async function getSectorFullIntelligence(city: string, sector: string): Promise<SectorFullIntelligence | null> {
  const cacheKey = `${city.toLowerCase().trim()}:${sector.toLowerCase().trim()}`
  const cached = sectorIntelligenceCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  try {
    let record: any = null
    try {
      record = await prisma.sectorIntelligence.findFirst({
        where: {
          city: { contains: city, mode: 'insensitive' },
          sector: { contains: sector, mode: 'insensitive' }
        }
      })
    } catch {
      const rows = await prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM "sector_intelligence"
        WHERE LOWER("city") LIKE $1 AND LOWER("sector") LIKE $2
        LIMIT 1
      `, `%${city.toLowerCase()}%`, `%${sector.toLowerCase()}%`)
      record = rows && rows.length > 0 ? rows[0] : null
    }

    if (!record) {
      sectorIntelligenceCache.set(cacheKey, { data: null, expiresAt: Date.now() + CACHE_TTL_MS })
      return null
    }

    const intel: SectorFullIntelligence = {
      city: record.city,
      sector: record.sector,
      microMarket: record.micro_market,
      sectorStage: record.sector_stage,
      dominantSegment: record.dominant_segment,
      avgPricePerSqft: record.avg_price_per_sqft,
      price5yrCagrPct: record.price_5yr_cagr_pct,
      rentalYieldPct: record.rental_yield_pct,
      avgRent3bhkMonthly: record.avg_rent_3bhk_monthly,
      lifestyleTags: record.lifestyle_tags,
      sectorStrengths: record.sector_strengths,
      sectorWeaknesses: record.sector_weaknesses,
      whoShouldBuy: record.who_should_buy,
      whoShouldAvoid: record.who_should_avoid,
      commuteAnchors: record.commute_anchors as Record<string, number> | null,
      utilitiesProfile: record.utilities_profile as Record<string, unknown> | null,
      statutoryRates: record.statutory_rates as Record<string, unknown> | null,
      infrastructurePipeline: record.infrastructure_pipeline as Record<string, unknown> | null
    }

    sectorIntelligenceCache.set(cacheKey, { data: intel, expiresAt: Date.now() + CACHE_TTL_MS })
    return intel
  } catch (err) {
    console.error('[sectorDataGateway:getSectorFullIntelligence:error]', err)
    return null
  }
}

/**
 * Format a dynamic, database-grounded micro-markets overview string for system prompt injection.
 */
export async function buildCityMicroMarketsContext(city: string = 'Noida'): Promise<string> {
  const markets = await getCityMicroMarkets(city)
  if (!markets || markets.length === 0) return ''

  let text = `## VERIFIED CITY MICRO-MARKETS (${city.toUpperCase()})\n`
  for (const m of markets) {
    text += `### ${m.microMarket} (Sectors: ${m.sectors.join(', ')})\n`
    text += `- **Pricing**: Avg ₹${m.avgPricePerSqft.toLocaleString('en-IN')}/sqft (Range: ₹${m.priceRange.min.toLocaleString('en-IN')} – ₹${m.priceRange.max.toLocaleString('en-IN')})\n`
    text += `- **Lifestyle DNA**: ${m.lifestyleTags.join(' · ')}\n`
    text += `- **Character**: ${m.dominantSegment}\n`
    if (m.highlights.length > 0) {
      text += `- **Key Highlights**: ${m.highlights.join('; ')}\n`
    }
    text += `\n`
  }
  return text.trim()
}
