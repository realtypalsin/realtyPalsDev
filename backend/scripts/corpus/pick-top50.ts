// backend/scripts/corpus/pick-top50.ts
//
// The fifty queries the product has to be right about.
//
//   npx tsx scripts/corpus/pick-top50.ts
//   -> scripts/corpus/top50.json
//
// Different question from pick-demo-set.ts. That one balances across classes to
// find bugs — it deliberately over-samples rare shapes because that is where
// defects hide. This one is weighted by what buyers actually type, so it is the
// set to be confident about before a demo or a launch: getting all fifty right
// means being right for most of the traffic that will arrive.
//
// Selection is: real search volume first, then one query per distinct shape so
// fifty near-identical sector lookups cannot fill the list, then a floor of
// coverage for the expensive question types a portal cannot answer at all —
// those are the ones that justify the product existing.

import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CorpusEntry } from './build-corpus'
import { classifyShape, type QueryShape } from '../../src/lib/ai/inferenceProfile'

const HERE = dirname(fileURLToPath(import.meta.url))
const TARGET = 50

/**
 * Minimum slots for the shapes that carry the product's reason to exist.
 *
 * Volume alone would return fifty head terms, because that is what a keyword
 * export measures — and a demo of fifty head terms proves nothing a search box
 * could not do. A comparison and a multi-constraint brief are what a buyer
 * cannot get anywhere else, so they get a floor regardless of volume.
 */
const FLOOR: Partial<Record<QueryShape, number>> = {
  reasoning: 12,
  advisory: 8,
  factual: 12,
}

/** Query shape with the specifics stripped, so a family fills one slot. */
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
 * How much this query is worth being right about.
 *
 * Volume dominates — it is the only signal here grounded in what people type.
 * The rest is tie-breaking: a hand-written stress query is worth more than a
 * keyword-tool row of the same volume because someone chose it, and a query
 * appearing in several exports is corroborated demand.
 */
function score(e: CorpusEntry): number {
  let s = Math.min(e.volume ?? 0, 500) * 4
  if (e.sources.includes('queriesStress.md')) s += 300
  if (e.sources.includes('queries1.md')) s += 120
  s += e.sources.length * 40
  // Out-of-scope queries earn their place: they are real demand and a wrong
  // answer to one is the most damaging thing the product can do on stage.
  if (e.class === 'out_of_scope') s += 80
  return s
}

function main() {
  const corpus: CorpusEntry[] = JSON.parse(readFileSync(join(HERE, 'corpus.json'), 'utf8'))
  const ranked = [...corpus].sort((a, b) => score(b) - score(a))

  const picked: CorpusEntry[] = []
  const seenFamilies = new Set<string>()
  const shapeCount = new Map<QueryShape, number>()

  const take = (e: CorpusEntry) => {
    picked.push(e)
    seenFamilies.add(family(e.query))
    const sh = classifyShape(e.query)
    shapeCount.set(sh, (shapeCount.get(sh) ?? 0) + 1)
  }

  // Pass 1: the floors, so volume cannot crowd out the questions that matter.
  for (const [shape, floor] of Object.entries(FLOOR) as [QueryShape, number][]) {
    for (const e of ranked) {
      if ((shapeCount.get(shape) ?? 0) >= floor) break
      if (classifyShape(e.query) !== shape) continue
      if (seenFamilies.has(family(e.query))) continue
      take(e)
    }
  }

  // Pass 2: highest demand, one per family, until full.
  for (const e of ranked) {
    if (picked.length >= TARGET) break
    if (picked.includes(e)) continue
    if (seenFamilies.has(family(e.query))) continue
    take(e)
  }

  picked.sort(
    (a, b) => classifyShape(a.query).localeCompare(classifyShape(b.query)) || score(b) - score(a),
  )
  writeFileSync(join(HERE, 'top50.json'), JSON.stringify(picked, null, 2))

  console.log(`top ${picked.length} of ${corpus.length}\n`)
  let last = ''
  for (const e of picked) {
    const sh = classifyShape(e.query)
    if (sh !== last) {
      console.log(`\n── ${sh} (${shapeCount.get(sh)}) ──`)
      last = sh
    }
    const vol = e.volume ? `vol ${String(e.volume).padStart(3)}` : '        '
    console.log(`  ${vol}  [${e.class}] ${e.query.slice(0, 88)}`)
  }
  console.log(`\nwritten: ${join(HERE, 'top50.json')}`)
}

main()
