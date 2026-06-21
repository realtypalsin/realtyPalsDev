// backend/src/routes/builderReputation.ts
// GET /builder-reputation?name=
// No auth required.
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { getBuilderReputation } from '../lib/ai/builderReputation'
import { getCached, setCached } from '../lib/cache'

const router = Router()

const Schema = z.object({ name: z.string().min(2) })

router.get('/', async (req: Request, res: Response) => {
  const parsed = Schema.safeParse({ name: req.query['name'] })
  if (!parsed.success) {
    res.status(400).json({ error: 'name required (min 2 chars)' })
    return
  }

  const { name } = parsed.data

  const cacheKey = `builder-rep:${name.toLowerCase()}`
  const cached = await getCached<object>(cacheKey)
  if (cached) {
    res.json(cached)
    return
  }

  const report = await getBuilderReputation(name)

  // Cache for 24 hours — builder reputation doesn't change hourly
  await setCached(cacheKey, report, 60 * 60 * 24)
  res.json(report)
})

export default router
