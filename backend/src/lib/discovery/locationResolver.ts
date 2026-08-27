import { prisma } from '../db'
import { getCached, setCached } from '../cache'
import { calculateHaversineDistanceKm } from './geo'
import { DISCOVERY } from '../config'

/**
 * What sectors does a buyer's location phrase actually mean?
 *
 * This replaces a hardcoded map. That map held four sectors for the Noida
 * Expressway while two other files documented the corridor as 128–158, so a
 * buyer asking for the corridor was shown a third of the stock standing on it
 * and told nothing was missing. The list could only ever be as current as the
 * last person who remembered to edit it — and nobody did, through fifty
 * commits, while inventory grew underneath it.
 *
 * Nothing here is a list of sectors. Every tier reads what we actually hold:
 *
 *   exact         the phrase IS a sector we have rows for
 *   numeric_band  "132 to 150" — parsed, then filtered against real sectors
 *   micro_market  SectorIntelligence.micro_market, the curated column that
 *                 already exists for exactly this ("Noida Expressway")
 *   micro_market_geo  sectors whose centroid lies on the axis through the
 *                 labelled ones — this is what makes it self-extending
 *   literal       we could not resolve it; hand it back unchanged and let the
 *                 caller's own matching decide, rather than inventing a set
 *
 * The geo tier is the point. An analyst labels three sectors on a corridor and
 * the geometry finds the rest, including sectors added to the database next
 * month that no one thought to tag. A corridor is a line, not a disc, so
 * membership is perpendicular distance to the axis through the labelled
 * sectors — a radius around them pulls in everything sideways, which put
 * Central Noida inside the Expressway when I measured it.
 *
 * There is no LLM call here on purpose. Intent extraction upstream has already
 * turned the buyer's sentence into a location string; a second model call to
 * re-guess it would spend money to repeat work and add a way to be wrong.
 */

export type LocationSource =
  | 'exact'
  | 'numeric_band'
  | 'micro_market'
  | 'micro_market_geo'
  | 'literal'

export interface LocationResolution {
  /** Sector strings as stored in the database. */
  sectors: string[]
  source: LocationSource
  /** Cities the resolved sectors belong to, when the tier could tell. */
  cities: string[]
}

/** One sector, its project count, and the centroid of those projects. */
export interface SectorPoint {
  city: string
  sector: string
  lat: number
  lng: number
  projects: number
}

/**
 * How far off the corridor axis a sector may sit and still be on it.
 *
 * ponytail: one radius for every corridor. Measured against the Noida
 * Expressway, where 2km admits 134/143B/144/146/151/152 and holds Central
 * Noida out. If a corridor ever needs its own width, this becomes a column on
 * SectorIntelligence rather than a second constant here.
 */
const CORRIDOR_HALF_WIDTH_KM = 2.0

/**
 * Bump when a tier's logic changes. Resolutions live in Redis for an hour, so
 * without this a deploy keeps answering with the previous version's reasoning —
 * which it did, silently, the first time I changed the ambiguity rule.
 */
const CACHE_VERSION = 'v2'

const SECTOR_INDEX_TTL = 3600
const RESOLUTION_TTL = 3600

const norm = (s: string): string =>
  s.toLowerCase().replace(/[,.\-–—]/g, ' ').replace(/\s+/g, ' ').trim()

/** The leading sector number, if the string has one. "Sector 143B" -> 143. */
export function sectorNumber(sector: string): number | null {
  const m = /(\d+)/.exec(sector)
  return m ? Number(m[1]) : null
}

/**
 * Every sector we hold projects in, with the centroid of those projects.
 *
 * One grouped query, cached — this is read on any turn carrying a location, and
 * the shape changes only when inventory does.
 */
export async function getSectorIndex(): Promise<SectorPoint[]> {
  const key = `loc:sector-index:${CACHE_VERSION}`
  const hit = await getCached<SectorPoint[]>(key)
  if (hit) return hit

  const rows = await prisma.$queryRaw<Array<{
    city: string; sector: string; lat: number | null; lng: number | null; projects: bigint
  }>>`
    SELECT city,
           sector,
           AVG(lat)::float AS lat,
           AVG(lng)::float AS lng,
           COUNT(*)        AS projects
    FROM projects
    WHERE sector IS NOT NULL AND sector <> ''
    GROUP BY city, sector
  `

  const index: SectorPoint[] = rows
    .filter(r => r.lat !== null && r.lng !== null)
    .map(r => ({
      city: r.city,
      sector: r.sector,
      lat: r.lat as number,
      lng: r.lng as number,
      projects: Number(r.projects),
    }))

  await setCached(key, index, SECTOR_INDEX_TTL)
  return index
}

/** Sectors an analyst has tagged with this micro-market, e.g. "Noida Expressway". */
async function microMarketSeeds(term: string): Promise<SectorPoint[]> {
  const rows = await prisma.sectorIntelligence.findMany({
    where: { micro_market: { not: null } },
    select: { city: true, sector: true, micro_market: true },
  })
  const t = norm(term)
  let matched = rows.filter(r => {
    const m = norm(r.micro_market ?? '')
    return m === t || m.includes(t) || t.includes(m)
  })
  if (matched.length === 0) return []

  /**
   * A loose phrase can name more than one market. Bare "expressway" matches
   * both the Noida Expressway and the Yamuna Expressway, and merging them
   * returned one belt made of two, forty kilometres apart.
   *
   * Exact naming wins. Failing that, the launch market wins — a buyer in a
   * Noida-only product who types "expressway" means the Noida one, and if they
   * meant the other they had to name it, which the exact tier then catches.
   */
  const names = new Set(matched.map(r => norm(r.micro_market ?? '')))
  if (names.size > 1) {
    const exact = matched.filter(r => norm(r.micro_market ?? '') === t)
    if (exact.length > 0) {
      matched = exact
    } else {
      const home = matched.filter(r => norm(r.city) === norm(DISCOVERY.DEFAULT_CITY))
      if (home.length > 0) matched = home
    }
  }

  const index = await getSectorIndex()
  return index.filter(p =>
    matched.some(m => norm(m.sector) === norm(p.sector) && norm(m.city) === norm(p.city)),
  )
}

/**
 * "132 to 150", "sectors 128-158", "between 74 and 79".
 *
 * Returns null when the phrase is not a band, so a plain "Sector 150" (one
 * number, no range) falls through to exact matching rather than being read as
 * a degenerate band.
 */
export function parseNumericBand(term: string): { lo: number; hi: number } | null {
  const m = /(\d{1,3})\s*(?:to|through|thru|and|-|–|—|until|till)\s*(\d{1,3})/i.exec(term)
  if (!m) return null
  const a = Number(m[1])
  const b = Number(m[2])
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return null
  return { lo: Math.min(a, b), hi: Math.max(a, b) }
}

// ── Corridor geometry ─────────────────────────────────────────────────────────
// A local planar projection. Over a city this is accurate to well under the
// resolution we need, and it keeps the segment maths readable.

const KM_PER_DEG_LAT = 110.574
const kmPerDegLng = (lat: number): number => 111.320 * Math.cos((lat * Math.PI) / 180)

interface Planar { x: number; y: number }

const toPlane = (p: { lat: number; lng: number }, origin: { lat: number; lng: number }): Planar => ({
  x: (p.lng - origin.lng) * kmPerDegLng(origin.lat),
  y: (p.lat - origin.lat) * KM_PER_DEG_LAT,
})

/** Perpendicular distance from a point to a finite segment, in km. */
export function distanceToSegmentKm(p: Planar, a: Planar, b: Planar): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/**
 * Sectors lying on the corridor the seeds describe.
 *
 * Two or more seeds define an axis; the polyline is walked in order along its
 * dominant direction so the segments do not zig-zag. A single seed has no
 * direction, so it degrades to a radius — correct, just less selective.
 *
 * The result never leaves the seeds' own cities. Without that, "Sector 107"
 * exists in both Noida and Greater Noida West and the corridor quietly acquires
 * projects from the wrong side of the city line.
 */
export function corridorMembers(
  seeds: SectorPoint[],
  index: SectorPoint[],
  halfWidthKm: number = CORRIDOR_HALF_WIDTH_KM,
): SectorPoint[] {
  if (seeds.length === 0) return []
  const cities = new Set(seeds.map(s => s.city))
  const candidates = index.filter(p => cities.has(p.city))

  if (seeds.length === 1) {
    const s = seeds[0]
    return candidates.filter(
      p => calculateHaversineDistanceKm(s.lat, s.lng, p.lat, p.lng) <= halfWidthKm,
    )
  }

  const origin = seeds[0]
  const path = seeds
    .map(s => toPlane(s, origin))
    // Order along the axis: sort by the dominant spread so consecutive points
    // are genuinely adjacent on the corridor.
    .sort((a, b) => {
      const xs = seeds.map(s => toPlane(s, origin).x)
      const ys = seeds.map(s => toPlane(s, origin).y)
      const spreadX = Math.max(...xs) - Math.min(...xs)
      const spreadY = Math.max(...ys) - Math.min(...ys)
      return spreadX >= spreadY ? a.x - b.x : a.y - b.y
    })

  return candidates.filter(p => {
    const q = toPlane(p, origin)
    let best = Infinity
    for (let i = 0; i < path.length - 1; i++) {
      best = Math.min(best, distanceToSegmentKm(q, path[i], path[i + 1]))
      if (best <= halfWidthKm) return true
    }
    return best <= halfWidthKm
  })
}

// ── Entry point ───────────────────────────────────────────────────────────────

/**
 * Turn a buyer's location phrase into the sectors it covers.
 *
 * Never invents. When no tier resolves the phrase it comes back as `literal`
 * with the phrase unchanged — the caller then matches it as an ordinary sector
 * string and finds nothing if we hold nothing, which is the honest outcome.
 */
export async function resolveLocationTerm(term: string): Promise<LocationResolution> {
  const cleaned = term?.trim()
  if (!cleaned) return { sectors: [], source: 'literal', cities: [] }

  const key = `loc:resolve:${CACHE_VERSION}:${norm(cleaned)}`
  const hit = await getCached<LocationResolution>(key)
  if (hit) return hit

  const resolution = await resolveUncached(cleaned)
  await setCached(key, resolution, RESOLUTION_TTL)
  return resolution
}

async function resolveUncached(term: string): Promise<LocationResolution> {
  const index = await getSectorIndex()
  const t = norm(term)

  const asResult = (points: SectorPoint[], source: LocationSource): LocationResolution => ({
    // Densest sectors first: when a caller caps the list, it keeps the stock.
    sectors: [...points].sort((a, b) => b.projects - a.projects).map(p => p.sector),
    source,
    cities: [...new Set(points.map(p => p.city))],
  })

  // 1. The phrase is a sector we hold.
  const exact = index.filter(p => norm(p.sector) === t)
  if (exact.length > 0) return asResult(exact, 'exact')

  // 2. A numeric band, filtered against sectors that exist.
  const band = parseNumericBand(term)
  if (band) {
    const inBand = index.filter(p => {
      const n = sectorNumber(p.sector)
      return n !== null && n >= band.lo && n <= band.hi
    })
    if (inBand.length > 0) return asResult(inBand, 'numeric_band')
  }

  // 3. A named micro-market an analyst has curated.
  const seeds = await microMarketSeeds(term)
  if (seeds.length > 0) {
    const members = corridorMembers(seeds, index)
    // Geometry should only ever add to what was curated, never lose it.
    const union = [...members]
    for (const s of seeds) {
      if (!union.some(m => m.city === s.city && m.sector === s.sector)) union.push(s)
    }
    return asResult(union, union.length > seeds.length ? 'micro_market_geo' : 'micro_market')
  }

  // 4. Unresolved. Hand it back untouched — do not guess a set.
  return { sectors: [term], source: 'literal', cities: [] }
}
