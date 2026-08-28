// backend/src/lib/discovery/derivedSectors.ts

import { prisma } from '../db'

export interface DerivedSector {
  sector: string
  city: string
  projectCount: number
  readyCount: number
  /** Cheapest and dearest project entry price, in crore. Null when unpriced. */
  priceMinCr: number | null
  priceMaxCr: number | null
  /** Up to four project names, for a "landmark societies" cell. */
  topProjects: string[]
  /** Always true. */
  derived: true
}

/** Below this a "sector summary" is one project wearing a hat. */
const MIN_PROJECTS = 2

const cache = new Map<string, { data: DerivedSector[]; expiresAt: number }>()
const TTL_MS = 10 * 60 * 1000

/** Every sector we hold enough projects to describe, computed. */
export async function deriveSectorsFromProjects(city?: string): Promise<DerivedSector[]> {
  const key = (city ?? 'all').toLowerCase()
  const hit = cache.get(key)
  if (hit && hit.expiresAt > Date.now()) return hit.data

  try {
    const rows = await prisma.project.findMany({
      where: city ? { city: { contains: city, mode: 'insensitive' } } : {},
      select: {
        name: true,
        sector: true,
        city: true,
        status: true,
        price_min_cr: true,
      },
    })

    const bySector = new Map<string, typeof rows>()
    for (const r of rows) {
      if (!r.sector) continue
      const list = bySector.get(r.sector) ?? []
      list.push(r)
      bySector.set(r.sector, list)
    }

    const out: DerivedSector[] = []
    for (const [sector, projects] of bySector) {
      if (projects.length < MIN_PROJECTS) continue
      const prices = projects
        .map((p) => p.price_min_cr)
        .filter((n): n is number => typeof n === 'number' && n > 0)
      out.push({
        sector,
        city: projects[0].city ?? 'Noida',
        projectCount: projects.length,
        readyCount: projects.filter((p) => p.status === 'ready_to_move').length,
        priceMinCr: prices.length ? Math.min(...prices) : null,
        priceMaxCr: prices.length ? Math.max(...prices) : null,
        // Cheapest first: a "from" figure is what a buyer scanning a list wants.
        topProjects: [...projects]
          .sort((a, b) => (a.price_min_cr ?? Infinity) - (b.price_min_cr ?? Infinity))
          .slice(0, 4)
          .map((p) => p.name),
        derived: true,
      })
    }

    out.sort((a, b) => b.projectCount - a.projectCount)
    cache.set(key, { data: out, expiresAt: Date.now() + TTL_MS })
    return out
  } catch (err) {
    // A derivation failure must not take out the sector answer that would
    // otherwise have worked from curated rows.
    console.warn(
      '[derivedSectors] failed, falling back to curated rows only:',
      err instanceof Error ? err.message : err,
    )
    return []
  }
}

/** One sector, or null when we hold too few projects to say anything. */
export async function deriveSector(sector: string, city?: string): Promise<DerivedSector | null> {
  const all = await deriveSectorsFromProjects(city)
  const wanted = sector.toLowerCase().trim()
  return all.find((s) => s.sector.toLowerCase().trim() === wanted) ?? null
}

/** Test seam, and a way to force a refresh after a seed. */
export function resetDerivedSectorCache(): void {
  cache.clear()
}
