// backend/src/lib/reraIntegrity.ts
//
// A registration number that more than one project claims.
//
// Measured against the live database on 4 Sep 2026, after `claudeResponse.md`
// asserted "19 duplicate RERA clusters". The number was exactly right, and the
// problem is worse than duplication — these are mostly DIFFERENT projects, from
// DIFFERENT builders, carrying the SAME registration:
//
//   UPRERAPRJ1504  Godrej Palm Retreat        | Apex Golf Avenue
//   UPRERAPRJ1281  Jaypee Imperial Court      | Mahagun Manorialle
//   UPRERAPRJ1001  Coco County | Stellar Jeevan | Express Astra
//   UPRERAPRJ4281  SKA Orion | Mahagun Moderne | Supertech Orb
//   …19 clusters, 43 projects, 15% of inventory
//
// Two of the nineteen are genuine duplicate rows (Sikka Kaamna Greens twice;
// ATS Homekraft Happy Trails / ATS Happy Trails). The rest are collisions:
// wrong numbers attached to real, distinct projects.
//
// Why this is the worst class of error in the product: the registration number
// is the ONE fact we tell buyers to verify for themselves. A buyer who looks up
// UPRERAPRJ1504 expecting Apex Golf Avenue finds Godrej Palm Retreat, and
// concludes — correctly, from the evidence in front of them — that we invent
// data. Every other number we print becomes suspect at the same moment.
//
// This code does NOT guess which project owns which number. It cannot: both
// rows look equally plausible and the authority's record is the arbiter. It
// withholds a number we cannot attribute, which is the `missing` tier doing
// exactly what it is for, and says so in words. `npm run audit:rera` prints the
// clusters for whoever fixes the rows.

import { prisma } from './db'
import { getCached, setCached } from './cache'

const CACHE_KEY = 'rera:ambiguous'
const TTL_SECONDS = 900

/**
 * Registration numbers claimed by more than one project, upper-cased.
 *
 * A database failure resolves to an EMPTY set, which means every number renders
 * as before. That is the deliberate direction: a guard that cannot read the
 * database must not start withholding the registration numbers of projects it
 * knows nothing about.
 */
export async function ambiguousReraNumbers(): Promise<ReadonlySet<string>> {
  const hit = await getCached<string[]>(CACHE_KEY)
  if (hit) return new Set(hit)
  try {
    const rows = await prisma.project.findMany({ select: { rera_number: true } })
    const counts = new Map<string, number>()
    for (const r of rows) {
      const key = normalizeRera(r.rera_number)
      if (!key) continue
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const ambiguous = [...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k)
    await setCached(CACHE_KEY, ambiguous, TTL_SECONDS)
    return new Set(ambiguous)
  } catch (e) {
    console.warn('[RERA_INTEGRITY:DB_ERROR]', (e as Error).message)
    return new Set()
  }
}

/** Upper-cased and trimmed, or null when the value is not a registration at all. */
export function normalizeRera(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const t = value.trim().toUpperCase()
  if (!t) return null
  // "RERA NOT APPLICABLE" is a status, not a number, and two projects carry it.
  // It is already not a claim, so it needs no withholding.
  if (!/\d/.test(t)) return null
  return t
}

/** What we say instead of a number we cannot attribute to one project. */
export const RERA_AMBIGUOUS_NOTE =
  'The registration number on file for this project is also recorded against another project, ' +
  'so I will not quote it — a number that turns out to belong to a different development is worse ' +
  'than no number. Our team is reconciling it against the authority record, and the advisory desk ' +
  'can confirm the correct registration for you.'
