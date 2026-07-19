// backend/src/routes/aqi.ts
// GET /aqi?lat=&lng=
// Fetches current AQI from Google Air Quality API. No auth required — public.
import { Router, Request, Response } from 'express'
import { checkRateLimit } from '../lib/cache'

const router = Router()

function aqiColor(category: string): string {
  switch (category.toLowerCase()) {
    case 'good':                              return 'text-green-600'
    case 'moderate':                          return 'text-yellow-600'
    case 'unhealthy for sensitive groups':    return 'text-orange-500'
    case 'unhealthy':                         return 'text-red-600'
    case 'very unhealthy':                    return 'text-purple-700'
    case 'hazardous':                         return 'text-rose-900'
    default:                                  return 'text-gray-600'
  }
}

router.get('/', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query['lat'] as string ?? '')
  const lng = parseFloat(req.query['lng'] as string ?? '')

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ aqi: null })
    return
  }

  // Rate limit: Google Air Quality API is a paid API (15 req/min per IP)
  const ip = req.ip || '127.0.0.1'
  const rateLimit = await checkRateLimit(`aqi:${ip}`, 15, 60)
  if (rateLimit.remaining <= 0) {
    res.status(429).json({ aqi: null })
    return
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    res.json({ aqi: null })
    return
  }

  try {
    const response = await fetch(
      `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: { latitude: lat, longitude: lng } }),
        signal: AbortSignal.timeout(4000),
      },
    )

    if (!response.ok) {
      res.json({ aqi: null })
      return
    }

    const data = await response.json() as {
      indexes?: Array<{ code: string; aqi: number; category: string; dominantPollutant?: string }>
    }

    const indexes = data.indexes ?? []
    const aqiIndex =
      indexes.find((i) => i.code === 'uaqi' || i.code === 'ind_cpcb') ?? indexes[0]

    if (!aqiIndex) {
      res.json({ aqi: null })
      return
    }

    res.set('Cache-Control', 'public, max-age=1800, s-maxage=1800')
    res.json({
      aqi: aqiIndex.aqi,
      label: aqiIndex.category,
      color: aqiColor(aqiIndex.category),
      dominantPollutant: aqiIndex.dominantPollutant ?? null,
      station: 'noida',
    })
  } catch {
    res.json({ aqi: null })
  }
})

export default router
