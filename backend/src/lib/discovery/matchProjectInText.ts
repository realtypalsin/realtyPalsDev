// backend/src/lib/discovery/matchProjectInText.ts
//
// Which project does this message name?
//
// `claudeResponse.md` named this bug precisely and it was live in three places:
//
//     ctx.catalog.find(p => ctx.message.toLowerCase().includes(p.name.toLowerCase()))
//
// Two faults in one line. `.find()` returns the FIRST array element that
// matches, not the best one — and the array is `projectCatalog()`, a
// `findMany()` with no `orderBy`, so its order is Postgres heap order and
// changes with inserts and vacuum. And because the test is substring
// containment, a shorter name matches every message a longer name matches.
//
// Measured against the live database: **11 project names are a prefix of
// another project's name.**
//
//     ATS Pristine            / ATS Pristine & Golf Meadows
//     Maxblis White House     / Maxblis White House II
//     Lotus Greens Arena      / Lotus Greens Arena II
//     Lotus Boulevard         / Lotus Boulevard Espacia
//     Nirala Estate Phase 1   / Nirala Estate Phase 1 & 2
//     Antriksh Golf View      / Antriksh Golf View I / II
//     AIMS Golf Avenue I      / AIMS Golf Avenue I & II
//
// So "cost sheet for Maxblis White House II" could be answered with Maxblis
// White House — a different building, different RERA number, different
// possession date — and which one you got depended on heap order. These are
// phase-two towers of the same township: adjacent, differently priced, and
// years apart on handover.
//
// The rule is simply the longest match. A buyer who types more characters is
// being more specific, and the most specific name they matched is the one they
// meant.

export interface CatalogEntry {
  id: string
  name: string
}

/**
 * The most specific catalogue project named in this text, or null.
 *
 * `minLength` guards against a pathologically short project name matching
 * ordinary prose. Ties break on the id so the result is stable across
 * processes — never on array order, which is the fault being fixed.
 */
export function matchProjectInText<T extends CatalogEntry>(
  text: string,
  catalog: readonly T[],
  minLength = 4,
): T | null {
  const haystack = (text ?? '').toLowerCase()
  if (!haystack) return null

  let best: T | null = null
  for (const p of catalog) {
    const name = (p.name ?? '').toLowerCase()
    if (name.length < minLength || !haystack.includes(name)) continue
    if (
      best === null ||
      name.length > best.name.length ||
      (name.length === best.name.length && p.id < best.id)
    ) {
      best = p
    }
  }
  return best
}

/**
 * Every catalogue project named in the text, most specific first, with names
 * that are merely a prefix of a longer match removed.
 *
 * For a comparison — "Maxblis White House II vs Lotus Boulevard Espacia" — the
 * caller wants both, and must not also receive "Maxblis White House" and
 * "Lotus Boulevard" as two extra projects that were never mentioned.
 */
export function matchProjectsInText<T extends CatalogEntry>(
  text: string,
  catalog: readonly T[],
  minLength = 4,
): T[] {
  const haystack = (text ?? '').toLowerCase()
  if (!haystack) return []

  const hits = catalog
    .filter(p => (p.name ?? '').length >= minLength && haystack.includes(p.name.toLowerCase()))
    .sort((a, b) => b.name.length - a.name.length || (a.id < b.id ? -1 : 1))

  // Drop a hit whose name sits inside a longer hit's name: it was matched by
  // the same characters, so it names no additional project.
  return hits.filter(
    (p, i) => !hits.slice(0, i).some(longer => longer.name.toLowerCase().includes(p.name.toLowerCase())),
  )
}
