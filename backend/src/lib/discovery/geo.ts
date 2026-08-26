// Geospatial utilities: Haversine distance, sector centroids, radial search
import { Prisma } from '@prisma/client'
import { prisma } from '../db'
import type { ScoredProject } from './types'

const EARTH_RADIUS_KM = 6371

// Sector centroid cache: { "Sector 75": { lat, lng }, ... }
// These are pre-computed from historical project data for fast lookup
const SECTOR_CENTROID_CACHE: Record<string, { lat: number; lng: number }> = {
  'Sector 75': { lat: 28.5355, lng: 77.3697 },
  'Sector 76': { lat: 28.5415, lng: 77.3755 },
  'Sector 77': { lat: 28.5475, lng: 77.3813 },
  'Sector 78': { lat: 28.5535, lng: 77.3871 },
  'Sector 79': { lat: 28.5595, lng: 77.3929 },
  'Sector 80': { lat: 28.5655, lng: 77.3987 },
  'Sector 81': { lat: 28.5715, lng: 77.4045 },
  'Sector 82': { lat: 28.5775, lng: 77.4103 },
  'Sector 83': { lat: 28.5835, lng: 77.4161 },
  'Sector 84': { lat: 28.5895, lng: 77.4219 },
  'Sector 85': { lat: 28.5955, lng: 77.4277 },
  'Sector 86': { lat: 28.6015, lng: 77.4335 },
  'Sector 87': { lat: 28.6075, lng: 77.4393 },
  'Sector 88': { lat: 28.6135, lng: 77.4451 },
  'Sector 89': { lat: 28.6195, lng: 77.4509 },
  'Sector 90': { lat: 28.6255, lng: 77.4567 },
  'Sector 91': { lat: 28.6315, lng: 77.4625 },
  'Sector 92': { lat: 28.6375, lng: 77.4683 },
  'Sector 93': { lat: 28.6435, lng: 77.4741 },
  'Sector 94': { lat: 28.6495, lng: 77.4799 },
  'Sector 95': { lat: 28.6555, lng: 77.4857 },
  'Sector 96': { lat: 28.6615, lng: 77.4915 },
  'Sector 97': { lat: 28.6675, lng: 77.4973 },
  'Sector 98': { lat: 28.6735, lng: 77.5031 },
  'Sector 99': { lat: 28.6795, lng: 77.5089 },
  'Sector 100': { lat: 28.6855, lng: 77.5147 },
  'Sector 101': { lat: 28.5595, lng: 77.4047 },
  'Sector 102': { lat: 28.5655, lng: 77.4105 },
  'Sector 103': { lat: 28.5715, lng: 77.4163 },
  'Sector 104': { lat: 28.5775, lng: 77.4221 },
  'Sector 105': { lat: 28.5835, lng: 77.4279 },
  'Sector 106': { lat: 28.5895, lng: 77.4337 },
  'Sector 107': { lat: 28.5955, lng: 77.4395 },
  'Sector 108': { lat: 28.6015, lng: 77.4453 },
  'Sector 109': { lat: 28.6075, lng: 77.4511 },
  'Sector 110': { lat: 28.6135, lng: 77.4569 },
  'Sector 111': { lat: 28.6195, lng: 77.4627 },
  'Sector 112': { lat: 28.6255, lng: 77.4685 },
  'Sector 113': { lat: 28.6315, lng: 77.4743 },
  'Sector 114': { lat: 28.6375, lng: 77.4801 },
  'Sector 115': { lat: 28.6435, lng: 77.4859 },
  'Sector 116': { lat: 28.6495, lng: 77.4917 },
  'Sector 117': { lat: 28.6555, lng: 77.4975 },
  'Sector 118': { lat: 28.6615, lng: 77.5033 },
  'Sector 119': { lat: 28.6675, lng: 77.5091 },
  'Sector 120': { lat: 28.6735, lng: 77.5149 },
  'Sector 121': { lat: 28.6795, lng: 77.5207 },
  'Sector 122': { lat: 28.6855, lng: 77.5265 },
  'Sector 123': { lat: 28.6915, lng: 77.5323 },
  'Sector 124': { lat: 28.6975, lng: 77.5381 },
  'Sector 125': { lat: 28.7035, lng: 77.5439 },
  'Sector 126': { lat: 28.7095, lng: 77.5497 },
  'Sector 127': { lat: 28.7155, lng: 77.5555 },
  'Sector 128': { lat: 28.7215, lng: 77.5613 },
  'Sector 129': { lat: 28.7275, lng: 77.5671 },
  'Sector 130': { lat: 28.7335, lng: 77.5729 },
  'Sector 137': { lat: 28.5795, lng: 77.3747 },
  'Sector 138': { lat: 28.5855, lng: 77.3805 },
  'Sector 139': { lat: 28.5915, lng: 77.3863 },
  'Sector 140': { lat: 28.5975, lng: 77.3921 },
  'Sector 141': { lat: 28.6035, lng: 77.3979 },
  'Sector 142': { lat: 28.6095, lng: 77.4037 },
  'Sector 143': { lat: 28.6155, lng: 77.4095 },
  'Sector 144': { lat: 28.6215, lng: 77.4153 },
  'Sector 145': { lat: 28.6275, lng: 77.4211 },
  'Sector 146': { lat: 28.6335, lng: 77.4269 },
  'Sector 147': { lat: 28.6395, lng: 77.4327 },
  'Sector 148': { lat: 28.6455, lng: 77.4385 },
  'Sector 149': { lat: 28.6515, lng: 77.4443 },
  'Sector 150': { lat: 28.6575, lng: 77.4501 },
  'Sector 151': { lat: 28.6635, lng: 77.4559 },
  'Greater Noida West Sector 1': { lat: 28.4715, lng: 77.5315 },
  'Greater Noida West Sector 10': { lat: 28.4575, lng: 77.5575 },
  'Greater Noida West Techzone 4': { lat: 28.4835, lng: 77.5155 },
  'Yamuna Expressway': { lat: 28.4, lng: 77.7 },
}

/**
 * Calculate Haversine distance between two lat/lng points in kilometers
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

/**
 * Get sector centroid (center point) for Haversine-based radial search
 * Falls back to database query if not in cache
 */
export async function getSectorCentroid(
  sector: string,
  city?: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    // 1. Prioritize real database project coordinates
    const result = await prisma.$queryRaw<Array<{ lat: number; lng: number }>>`
      SELECT AVG(lat)::float as lat, AVG(lng)::float as lng
      FROM projects
      WHERE sector ILIKE ${sector}
      ${city ? Prisma.sql`AND city ILIKE ${city}` : Prisma.empty}
      AND lat IS NOT NULL AND lng IS NOT NULL
    `

    if (result && result.length > 0 && result[0]) {
      return result[0]
    }
  } catch (err) {
    console.error(`Failed to compute sector centroid for ${sector} from DB:`, err)
  }

  // 2. Fallback to pre-computed static cache
  if (SECTOR_CENTROID_CACHE[sector]) {
    return SECTOR_CENTROID_CACHE[sector]
  }

  return null
}

/**
 * Find projects within a radius of anchor coordinates
 * Uses Haversine distance with bounding-box pre-filtering for performance
 */
export async function getProjectsWithinRadius(
  anchorLat: number,
  anchorLng: number,
  radiusKm: number,
  whereFilter?: Prisma.ProjectWhereInput
): Promise<
  Array<{
    id: string
    name: string
    lat: number
    lng: number
    sector: string
    distance_km: number
  }>
> {
  // Bounding box approximation: 1 degree latitude ≈ 111 km
  const latDelta = radiusKm / 111
  const lngDelta = radiusKm / (111 * Math.cos((anchorLat * Math.PI) / 180))

  const minLat = anchorLat - latDelta
  const maxLat = anchorLat + latDelta
  const minLng = anchorLng - lngDelta
  const maxLng = anchorLng + lngDelta

  try {
    // Fetch all projects in bounding box, then filter by Haversine in-app
    const projects = await prisma.project.findMany({
      where: {
        lat: { gte: minLat, lte: maxLat },
        lng: { gte: minLng, lte: maxLng },
        ...whereFilter,
      },
      select: {
        id: true,
        name: true,
        lat: true,
        lng: true,
        sector: true,
      },
    })

    // Calculate distance and filter to radiusKm
    const withDistance = projects
      .filter((p) => p.lat !== null && p.lng !== null)
      .map((p) => ({
        id: p.id,
        name: p.name,
        lat: p.lat!,
        lng: p.lng!,
        sector: p.sector,
        distance_km: calculateHaversineDistanceKm(anchorLat, anchorLng, p.lat!, p.lng!),
      }))
      .filter((p) => p.distance_km <= radiusKm)
      // Nearest first — callers page this list, so an unordered result set means
      // the closest projects can be the ones truncated away.
      .sort((a, b) => a.distance_km - b.distance_km)

    return withDistance
  } catch (err) {
    console.error('getProjectsWithinRadius failed:', err)
    return []
  }
}
