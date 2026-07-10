// backend/src/routes/registryPrices.ts
// GET /registry-prices?sector=&city=
// Returns "coming soon" — DB is only source of truth for prices
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { checkRateLimit } from '../lib/cache'
import { clientIp } from '../lib/request'
import { DEFAULT_CITY } from '../lib/config/cities'

const router = Router()

const Schema = z.object({
  sector: z.string().min(1),
  city:   z.string().default(DEFAULT_CITY),
})

router.get('/', (req: Request, res: Response) => {
  const parsed = Schema.safeParse({
    sector: req.query['sector'],
    city:   req.query['city'] ?? DEFAULT_CITY,
  })

  if (!parsed.success) {
    res.status(400).json({ error: 'sector required' })
    return
  }

  // Registry prices always unavailable — data must come from DB, never LLM-generated
  res.json({
    available: false,
    message: 'Registry price data for this sector is being verified. Coming soon.',
  })
})

export default router
