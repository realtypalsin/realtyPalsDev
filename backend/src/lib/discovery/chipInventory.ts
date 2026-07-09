// backend/src/lib/discovery/chipInventory.ts
// Database-driven chip inventory — sectors, budget buckets, BHK options
// Cached 10 minutes to avoid repeated DB queries

import { prisma } from '../db'
import { DISCOVERY, VALIDATION } from '../config'

export interface BudgetBucket {
  label: string
  min?: number
  max?: number
}

export interface ChipInventory {
  sectors: Array<{ sector: string; projectCount: number }>
  budgetBuckets: BudgetBucket[]
  bhkOptions: number[]
  city: string
  cachedAt: Date
}

// In-memory cache with TTL
const chipCache = new Map<string, { data: ChipInventory; expiresAt: number }>()

export async function getChipInventory(city: string = DISCOVERY.DEFAULT_CITY): Promise<ChipInventory> {
  const cacheKey = city.toLowerCase()
  const now = Date.now()

  // Check cache
  const cached = chipCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return cached.data
  }

  // Query 1: Sectors by project count
  const sectorData = await prisma.project.groupBy({
    by: ['sector'],
    where: {
      city: { equals: city, mode: 'insensitive' },
    },
    _count: true,
    orderBy: { _count: { sector: 'desc' } },
    take: 5,
  })

  const sectors = sectorData.map(s => ({
    sector: s.sector,
    projectCount: s._count,
  }))

  // Query 2: Price distribution from unit_types
  const priceData = await prisma.unitType.findMany({
    where: {
      project: { city: { equals: city, mode: 'insensitive' } },
      price_min_cr: { not: null },
    },
    select: { price_min_cr: true },
    orderBy: { price_min_cr: 'asc' },
  })

  const prices = priceData.map(p => p.price_min_cr!).filter((v, i, a) => a.indexOf(v) === i)

  const budgetBuckets = computeBudgetBuckets(prices)

  // Query 3: Distinct BHK values
  const bhkData = await prisma.unitType.findMany({
    where: {
      project: { city: { equals: city, mode: 'insensitive' } },
    },
    select: { bhk: true },
    distinct: ['bhk'],
    orderBy: { bhk: 'asc' },
  })

  const bhkOptions = bhkData.map(b => b.bhk).filter((v): v is number => v !== null).sort((a, b) => a - b)

  const inventory: ChipInventory = {
    sectors,
    budgetBuckets,
    bhkOptions,
    city,
    cachedAt: new Date(),
  }

  // Cache with 10-minute TTL
  const ttlMs = DISCOVERY.CHIP_INVENTORY_CACHE_MINUTES * 60 * 1000
  chipCache.set(cacheKey, {
    data: inventory,
    expiresAt: now + ttlMs,
  })

  return inventory
}

/**
 * Compute budget buckets from live price distribution.
 * If prices exist, use quartile-based ranges. Otherwise use sensible defaults.
 */
function computeBudgetBuckets(prices: number[]): BudgetBucket[] {
  if (prices.length === 0) {
    return [
      { label: 'Under ₹1.5 Cr', min: 0, max: 1.5 },
      { label: '₹1.5–2.5 Cr', min: 1.5, max: 2.5 },
      { label: '₹2.5–4 Cr', min: 2.5, max: 4 },
      { label: 'Luxury ₹4 Cr+', min: 4 },
    ]
  }

  // Compute quartiles
  const sorted = [...prices].sort((a, b) => a - b)
  const q1 = sorted[Math.floor(sorted.length * 0.25)]
  const q2 = sorted[Math.floor(sorted.length * 0.5)]
  const q3 = sorted[Math.floor(sorted.length * 0.75)]
  const min = sorted[0]
  const max = sorted[sorted.length - 1]

  return [
    { label: `Under ₹${q1.toFixed(1)} Cr`, min: 0, max: q1 },
    { label: `₹${q1.toFixed(1)}–${q2.toFixed(1)} Cr`, min: q1, max: q2 },
    { label: `₹${q2.toFixed(1)}–${q3.toFixed(1)} Cr`, min: q2, max: q3 },
    { label: `₹${q3.toFixed(1)} Cr+`, min: q3 },
  ]
}

/**
 * Invalidate cache for a city (call when projects are upserted).
 */
export function invalidateChipCache(city: string = DISCOVERY.DEFAULT_CITY): void {
  chipCache.delete(city.toLowerCase())
}

/**
 * Invalidate all chip caches.
 */
export function invalidateAllChipCaches(): void {
  chipCache.clear()
}
