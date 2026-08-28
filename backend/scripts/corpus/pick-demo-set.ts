// backend/scripts/corpus/pick-demo-set.ts
//
// Picks the demo set: the smallest list of queries whose answers, if all good,
// mean the product is ready to show.
//
//   npx tsx scripts/corpus/pick-demo-set.ts
//   -> scripts/corpus/demo-set.json   (ids referencing corpus.json)
//
// The 321-query corpus is mostly template families. "property in sector 62
// noida" through "property in sector 168 noida" are twenty-one rows that
// exercise one code path; running all of them measures the same thing twenty-one
// times and hides the classes with three rows. This collapses each family to its
// highest-volume members and rebalances across classes.

import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CorpusEntry, QueryClass } from './build-corpus'

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * How many queries each class contributes. Weighted by what a demo can afford
 * to get wrong, not by how many rows the keyword export happened to contain.
 *
 * `sector` is 103 of 321 rows and gets 10 slots: they are near-identical.
 * `out_of_scope` is 39 rows and gets 6, because answering one of them as though
 * we had listings is the single most damaging failure on stage — it is the
 * fabrication CLAUDE.md forbids, in front of an audience.
 * `financial` and `market_fact` have 2 and 3 rows and keep all of them: they are
 * the tool-backed and figure-backed paths, and both were broken until today.
 */
const QUOTA: Record<QueryClass, number> = {
  sector: 10,
  comparison: 8,
  budget_personal: 8,
  discovery: 6,
  out_of_scope: 6,
  risk_legal: 5,
  temporal: 4,
  project_builder: 4,
  brand_probe: 4,
  navigational: 3,
  market_fact: 3,
  financial: 2,
  other: 2,
  malformed: 2,
}

/**
 * The family a query belongs to: its shape with the specifics removed. Sector
 * numbers, budgets and BHK counts are the parts that vary within a family, so
 * they collapse to a placeholder and everything else stays.
 */
function family(query: string): string {
  return query
    .toLowerCase()
    .replace(/\bsector\s*\d+/g, 'sector #')
    .replace(/\d+(\.\d+)?\s*(crore|cr|lakh|lac)\b/g, '# money')
    .replace(/\b\d\s*bhk\b/g, '# bhk')
    .replace(/\b\d+\b/g, '#')
    .replace(/[^\w\s#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Hand-written queries beat keyword-tool exports. queriesStress.md is where the
 * multi-constraint questions live ("₹1.25 crore, wife works near Sector 135,
 * one child, may sell in 5 years") and those are what a demo actually gets
 * asked; the CSVs are head terms a portal would rank for.
 */
const HANDWRITTEN = 'queriesStress.md'

function score(e: CorpusEntry): number {
  let s = 0
  if (e.sources.includes(HANDWRITTEN)) s += 1000
  if (e.sources.includes('queries1.md')) s += 200
  s += Math.min(e.volume ?? 0, 500) // real demand, capped so one big row cannot dominate
  s += e.sources.length * 50 // appearing in several exports is its own signal
  s += Math.min(e.query.length, 200) / 10 // richer phrasing exercises more of the pipeline
  return s
}

function main() {
  const corpus: CorpusEntry[] = JSON.parse(readFileSync(join(HERE, 'corpus.json'), 'utf8'))

  const picked: CorpusEntry[] = []
  for (const [cls, quota] of Object.entries(QUOTA) as [QueryClass, number][]) {
    const rows = corpus.filter((e) => e.class === cls).sort((a, b) => score(b) - score(a))

    // One per family first, so the slots spread across distinct shapes. Only if
    // a class has fewer families than slots do second members get picked up.
    const seenFamilies = new Set<string>()
    const firstPass = rows.filter((e) => {
      const f = family(e.query)
      if (seenFamilies.has(f)) return false
      seenFamilies.add(f)
      return true
    })
    const chosen = firstPass.slice(0, quota)
    if (chosen.length < quota) {
      for (const e of rows) {
        if (chosen.length >= quota) break
        if (!chosen.includes(e)) chosen.push(e)
      }
    }
    picked.push(...chosen)
  }

  picked.sort((a, b) => a.class.localeCompare(b.class) || a.id.localeCompare(b.id))
  writeFileSync(join(HERE, 'demo-set.json'), JSON.stringify(picked, null, 2))

  const families = new Set(corpus.map((e) => family(e.query)))
  console.log(`corpus ${corpus.length} queries in ${families.size} families -> demo set ${picked.length}`)
  for (const [cls, quota] of Object.entries(QUOTA) as [QueryClass, number][]) {
    const got = picked.filter((e) => e.class === cls)
    console.log(`\n${cls} (${got.length}/${quota})`)
    for (const e of got) console.log(`  ${e.id}  ${e.query}`)
  }
}

main()
