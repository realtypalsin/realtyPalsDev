import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getBuilderReputation } from '@/lib/ai/builderReputation'
import { getCached, setCached, makeKey } from '@/lib/redis'

const Schema = z.object({ name: z.string().min(2) })

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const parsed = Schema.safeParse({ name: searchParams.get('name') })
  if (!parsed.success) return Response.json({ error: 'name required' }, { status: 400 })

  const { name } = parsed.data
  const cacheKey = makeKey('builder-rep', name.toLowerCase())
  const cached = await getCached<object>(cacheKey)
  if (cached) return Response.json(cached)

  const report = await getBuilderReputation(name)
  // Cache for 24 hours — builder reputation doesn't change hourly
  await setCached(cacheKey, report, 60 * 60 * 24)
  return Response.json(report)
}
