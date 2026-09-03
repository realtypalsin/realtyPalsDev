// backend/src/lib/projectCatalog.ts
//
// The project list, cached, because three separate places on the hot path were
// each running their own unbounded `prisma.project.findMany` on the same turn:
//
//   chat-router  project-name match near the top of every text message
//   chat-router  the shortlist catalogue further down (this one WAS cached)
//   proseEntities.findProjectsMentioned  after every open-lane answer, to make
//                                        project names in the prose clickable
//
// Same data, three round-trips to Supabase, none of them needed more than
// id/name/slug plus the shortlist columns. Onboarding a project is an admin
// action, not a per-request event, so 300s is the right window — short enough
// that a newly published project appears quickly.
//
// A Redis failure is non-fatal: the read misses, the query runs, the write is
// attempted and ignored if it fails. A database failure returns an empty
// catalogue rather than throwing, because every caller treats "no match" as a
// legitimate outcome and none of them should fail a turn over it.

import { prisma } from './db'
import { getCached, setCached } from './cache'

const CACHE_KEY = 'chat:projectCatalog'

export interface DbCatalogEntry {
  id: string
  name: string
  slug: string
  sector: string
  status: string
  price_min_cr: number | null
  price_range_label: string | null
}

export async function projectCatalog(): Promise<DbCatalogEntry[]> {
  const hit = await getCached<DbCatalogEntry[]>(CACHE_KEY)
  if (hit) { rememberCatalogNames(hit.map((p) => p.name)); return hit }
  try {
    const raw = await prisma.project.findMany({
      select: {
        id: true, name: true, slug: true, sector: true,
        status: true, price_min_cr: true, price_range_label: true,
      },
    })
    // The duplicate IITL Nimbus row is filtered out permanently.
    const catalog = raw.filter((p) => !p.name.toLowerCase().includes('iitl nimbus')) as DbCatalogEntry[]
    await setCached(CACHE_KEY, catalog, 300)
    rememberCatalogNames(catalog.map((p) => p.name))
    return catalog
  } catch (e) {
    console.warn('[PROJECT_CATALOG:DB_ERROR]', (e as Error).message)
    return []
  }
}

/**
 * The names from the last successful load, without awaiting.
 *
 * `chipIsRelevant` needs to know whether a word in a chip label is a project
 * name or an ordinary English word, and it runs inside a synchronous emit. The
 * router loads the catalogue every turn regardless, so by the time any chip is
 * emitted this list is warm. Empty before the first load, which the caller
 * treats as "no entity vocabulary" and lets chips through — the safe direction:
 * showing a chip is recoverable, hiding a good one is invisible.
 */
let lastLoadedNames: string[] = []

export function catalogNamesSync(): readonly string[] {
  return lastLoadedNames
}

export function rememberCatalogNames(names: readonly string[]): void {
  lastLoadedNames = [...names]
}
