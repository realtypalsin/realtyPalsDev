// backend/src/routes/commute.ts
// GET /commute?origin=&destination=&lat?=&lng?=
// No auth required.
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { getFullCommuteProfile, getNearbyPlaces } from '../lib/googleMaps'
import { getCached, setCached, checkRateLimit } from '../lib/cache'

const router = Router()

const Schema = z.object({
  origin:      z.string().min(2),
  destination: z.string().min(2),
  lat:         z.coerce.number().optional(),
  lng:         z.coerce.number().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  const parsed = Schema.safeParse({
    origin:      req.query['origin'],
    destination: req.query['destination'],
    lat:         req.query['lat'],
    lng:         req.query['lng'],
  })

  if (!parsed.success) {
    res.status(400).json({ error: 'origin and destination are required' })
    return
  }

  const { origin, destination, lat, lng } = parsed.data

  // Rate limit: Google Maps is a paid API (15 req/min per IP)
  const ip = req.ip || '127.0.0.1'
  const rateLimit = await checkRateLimit(`commute:${ip}`, 15, 60)
  if (rateLimit.remaining <= 0) {
    res.status(429).json({ error: 'Too many requests' })
    return
  }

  // Cache commute results for 6 hours — road distances don't change often
  const cacheKey = `commute:${origin.toLowerCase()}:${destination.toLowerCase()}`
  const cached = await getCached<object>(cacheKey)
  if (cached) {
    res.json(cached)
    return
  }

  const [commute, nearbyMetro] = await Promise.all([
    getFullCommuteProfile(origin, destination),
    lat !== undefined && lng !== undefined
      ? getNearbyPlaces(lat, lng, 'subway_station', 4000)
      : Promise.resolve([]),
  ])

  const result = {
    origin,
    destination,
    drive: commute.drive,
    transit: commute.transit,
    nearby_metro: nearbyMetro,
  }

  await setCached(cacheKey, result, 60 * 60 * 6)
  res.json(result)
})

export default router
