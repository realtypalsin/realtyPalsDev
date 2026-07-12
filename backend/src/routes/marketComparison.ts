// backend/src/routes/marketComparison.ts
// GET /api/v1/market-comparison?sector=&city=
// Ported from frontend/app/api/v1/market-comparison/route.ts
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { getCached, setCached } from '../lib/cache'

const router = Router()

const Schema = z.object({
  sector: z.string().min(1),
  city: z.string().default('Noida'),
})

interface ComparisonData {
  sector: string
  city: string
  project_count: number
  avg_price_sqft: number | null
  min_price_sqft: number | null
  max_price_sqft: number | null
  status_breakdown: Record<string, number>
  bhk_distribution: Record<string, number>
}

const MARKET_CACHE_TTL = 60 * 60 * 12 // 12 hours

router.get('/', async (req: Request, res: Response) => {
  const parsed = Schema.safeParse({
    sector: req.query['sector'],
    city: req.query['city'] ?? 'Noida',
  })
  if (!parsed.success) { res.status(400).json({ error: 'sector required' }); return }

  const { sector, city } = parsed.data
  const cacheKey = `market:${city}:${sector}`

  const cached = await getCached<ComparisonData>(cacheKey)
  if (cached) { res.json(cached); return }

  const projects = await prisma.project.findMany({
    where: { sector, city },
    select: {
      status: true,
      unit_types: {
        select: {
          bhk: true,
          price_min_cr: true,
          super_area_sqft: true,
        },
      },
    },
  })

  if (projects.length === 0) {
    res.status(404).json({ error: 'No projects found in this sector' })
    return
  }

  const pricesPerSqft: number[] = []
  const statusCount: Record<string, number> = {}
  const bhkCount: Record<string, number> = {}

  for (const p of projects) {
    statusCount[p.status] = (statusCount[p.status] ?? 0) + 1
    for (const u of p.unit_types) {
      if (u.price_min_cr && u.super_area_sqft && u.super_area_sqft > 0) {
        const priceRupeesPerSqft = Math.round((u.price_min_cr * 10_000_000) / u.super_area_sqft)
        pricesPerSqft.push(priceRupeesPerSqft)
      }
      const key = `${u.bhk}BHK`
      bhkCount[key] = (bhkCount[key] ?? 0) + 1
    }
  }

  const avg = pricesPerSqft.length
    ? Math.round(pricesPerSqft.reduce((a, b) => a + b, 0) / pricesPerSqft.length)
    : null

  const data: ComparisonData = {
    sector,
    city,
    project_count: projects.length,
    avg_price_sqft: avg,
    min_price_sqft: pricesPerSqft.length ? Math.min(...pricesPerSqft) : null,
    max_price_sqft: pricesPerSqft.length ? Math.max(...pricesPerSqft) : null,
    status_breakdown: statusCount,
    bhk_distribution: bhkCount,
  }

  await setCached(cacheKey, data, MARKET_CACHE_TTL)
  res.json(data)
})

export default router
