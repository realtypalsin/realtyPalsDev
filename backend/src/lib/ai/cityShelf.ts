// backend/src/lib/ai/cityShelf.ts
//
// The candidate rows behind the citywide band shelf, fetched for the whole city.
//
// The first version fed `renderCityBandShelf` whatever the turn's retrieval had
// returned. Measured live on "which is the best project in Noida": retrieval
// returned 19 projects and **not one of them had an entry price above ₹2 Cr**,
// so the shelf rendered two bands out of three and the premium half of our
// inventory was invisible on the one question that asks to see the range.
//
// That is not a bug in retrieval. Retrieval ranked 19 rows by score against an
// intent that is empty by definition on this turn, and any ordering of an empty
// intent will skew somewhere. The mistake was asking a ranked shortlist to
// stand in for a spread — the two want opposite things.
//
// So the shelf gets its own query, like every other rendered table here: the
// micro-market table reads `sectorDataGateway`, the affordability table computes
// from income, the yield table queries sector rents. A rendered table that draws
// from the turn's shortlist inherits the shortlist's bias.

import { prisma } from '../db'
import { renderCityBandShelf, type BandShelfRow } from './marketTable'

/** The bands, matching `SHELF_BANDS` in marketTable. */
const BAND_EDGES: Array<[number, number]> = [[0, 1], [1, 2], [2, Number.POSITIVE_INFINITY]]

interface Candidate {
  name: string
  sector: string
  status: string | null
  possession_label: string | null
  price_min_cr: number | null
  rera_number: string | null
  litigation_count: number | null
  builder: { name: string; delivery_score: number | null; average_delay_months: number | null } | null
  unit_types: Array<{ price_min_cr: number | null; price_max_cr: number | null }>
}

/** Lowest real asking price for a project, in crore. */
function entryPrice(p: Candidate): number | null {
  const unit = p.unit_types
    .map((u) => u.price_min_cr ?? u.price_max_cr)
    .filter((n): n is number => typeof n === 'number' && n > 0)
  if (unit.length > 0) return Math.min(...unit)
  return typeof p.price_min_cr === 'number' && p.price_min_cr > 0 ? p.price_min_cr : null
}

/**
 * The rule, printed to the buyer by the renderer.
 *
 * RERA on record first — the one binary the product refuses to be vague about.
 * Then the builder's own delivery record, then recorded litigation. Every term is
 * a column; none is a computed confidence score, which this codebase forbids.
 *
 * Kept in step with `projects.ts` Branch 6, which applies the same weights when
 * a citywide search pages through the whole city. If one changes, change both —
 * a shelf that disagrees with the list below it is worse than either alone.
 */
function bandRank(p: Candidate): number {
  let score = 0
  if (p.rera_number) score += 1000
  score += Math.min(p.builder?.delivery_score ?? 0, 100) * 5
  score -= Math.min(p.builder?.average_delay_months ?? 0, 60) * 4
  score -= Math.min(p.litigation_count ?? 0, 20) * 25
  return score
}

/**
 * The strongest project in each band across the given cities, best-first within
 * each band, ready for `renderCityBandShelf`.
 *
 * Returns at most one row per band: the renderer takes the first in each, and
 * handing it more would mean two files deciding the same thing.
 */
export async function computeCityBandShelf(cities: string[]): Promise<BandShelfRow[]> {
  const candidates = (await prisma.project.findMany({
    where: { city: { in: cities } },
    select: {
      name: true,
      sector: true,
      status: true,
      possession_label: true,
      price_min_cr: true,
      rera_number: true,
      litigation_count: true,
      builder: { select: { name: true, delivery_score: true, average_delay_months: true } },
      unit_types: { select: { price_min_cr: true, price_max_cr: true } },
    },
  })) as Candidate[]

  const out: BandShelfRow[] = []
  for (const [lo, hi] of BAND_EDGES) {
    const best = candidates
      .map((p) => ({ p, price: entryPrice(p) }))
      .filter((x) => x.price !== null && (x.price as number) >= lo && (x.price as number) < hi)
      .sort((a, b) => bandRank(b.p) - bandRank(a.p))[0]
    if (!best) continue
    out.push({
      name: best.p.name,
      sector: best.p.sector,
      status: best.p.status ?? undefined,
      possession_label: best.p.possession_label ?? undefined,
      builder: best.p.builder ? { name: best.p.builder.name } : null,
      entryPriceCr: best.price,
      rera_number: best.p.rera_number,
      litigation_count: best.p.litigation_count,
    })
  }
  return out
}

/**
 * The shelf for a citywide superlative, plus the names it chose.
 *
 * `picks` goes into the prompt. Without it the instruction reads "for each band
 * on screen", which the model satisfied by inventing its own bands — measured
 * live, it printed "₹65–100 lacs / ₹95–150 lacs / ₹1.25–2.85 crore" and named
 * four projects, none of them the three in the table above. Every name it used
 * was a real row, so this is not fabrication; it is two answers on one screen
 * with no way for the buyer to tell which we stand behind.
 *
 * `table` is '' when fewer than two bands fill, in which case there is nothing
 * to annotate and `picks` is empty too.
 */
export async function renderCityShelfForCity(
  cities: string[],
  label: string,
): Promise<{ table: string; picks: string[] }> {
  const rows = await computeCityBandShelf(cities)
  const table = renderCityBandShelf(rows, label)
  /**
   * Name plus sector plus builder, not the name alone.
   *
   * Given only names, the model annotated each pick with a sector it made up:
   * "Coco County in Sector 44" against a table row reading Sector 10,
   * "Purvanchal Royal City in Chi 5" against Zeta 1, "IVY County in Sector 137"
   * against Sector 75. It was told not to restate the table and then had to place
   * each project somewhere, so it recalled instead of reading. Three contradictions
   * of a table two lines above them is worse than the duplication this
   * instruction was added to stop.
   */
  return {
    table,
    picks: table
      ? rows
          .filter((r) => r.name)
          .map((r) => {
            const sector = typeof r.sector === 'string' ? r.sector : r.sector?.name
            const parts = [sector, r.builder?.name].filter(Boolean)
            return parts.length ? `${r.name} (${parts.join(', ')})` : String(r.name)
          })
      : [],
  }
}
