import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCached, setCached, makeKey } from '@/lib/redis'

const Schema = z.object({
  sector: z.string().min(1),
  city:   z.string().default('Noida'),
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const parsed = Schema.safeParse({
    sector: searchParams.get('sector'),
    city:   searchParams.get('city') ?? 'Noida',
  })
  if (!parsed.success) return Response.json({ error: 'sector required' }, { status: 400 })

  const { sector, city } = parsed.data
  const cacheKey = makeKey('market', city, sector)
  const cached = await getCached<ComparisonData>(cacheKey)
  if (cached) return Response.json(cached)

  const projects = await prisma.project.findMany({
    where: { sector, city },
    include: { unit_types: true },
  })

  if (projects.length === 0) {
    return Response.json({ error: 'No projects found in this sector' }, { status: 404 })
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

  await setCached(cacheKey, data, 60 * 60 * 12)
  return Response.json(data)
}
