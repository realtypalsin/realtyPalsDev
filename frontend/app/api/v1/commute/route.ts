import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getFullCommuteProfile, getNearbyPlaces } from '@/lib/google-maps'
import { getCached, setCached, makeKey } from '@/lib/redis'

const Schema = z.object({
  origin: z.string().min(2),
  destination: z.string().min(2),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const parsed = Schema.safeParse({
    origin:      searchParams.get('origin'),
    destination: searchParams.get('destination'),
    lat:         searchParams.get('lat'),
    lng:         searchParams.get('lng'),
  })

  if (!parsed.success) {
    return Response.json({ error: 'origin and destination are required' }, { status: 400 })
  }

  const { origin, destination, lat, lng } = parsed.data

  // Cache commute results for 6 hours — road distances don't change often
  const cacheKey = makeKey('commute', origin.toLowerCase(), destination.toLowerCase())
  const cached = await getCached<object>(cacheKey)
  if (cached) return Response.json(cached)

  const [commute, nearbyMetro] = await Promise.all([
    getFullCommuteProfile(origin, destination),
    lat && lng
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
  return Response.json(result)
}
