// backend/scripts/corpus/route-check.ts
//
// Which lane would each query take, without calling a model?
//
//   npx tsx scripts/corpus/route-check.ts            # the long-tail set
//   npx tsx scripts/corpus/route-check.ts --corpus   # the 321-query corpus
//
// Every lane below is a deterministic decision the router makes BEFORE any
// model is involved: decline it, answer it from the database, or hand it to the
// AI. This replays those decisions offline so a paid run is spent on answer
// quality rather than on re-discovering that a query took the wrong branch.
//
// It cannot tell you whether an answer is good. It tells you whether the
// question reached the code that should be answering it, which is where the
// 29 Aug long-tail failures actually went wrong: a courthouse in Texas reached
// the amenities handler, and a project we hold reached the "we cover no such
// builder" lane.

process.env.NODE_ENV = 'test'

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prisma } from '../../src/lib/db'
import { builderCoverage, sectorPinCode } from '../../src/lib/chat/coverageAnswer'

const HERE = dirname(fileURLToPath(import.meta.url))
const source = process.argv.includes('--corpus') ? 'corpus.json' : 'longtail.json'
const queries: Array<{ id: string; query: string; class: string }> =
  JSON.parse(readFileSync(join(HERE, source), 'utf8'))

/** Mirrors the router's own guard, which is regex and therefore replayable. */
const FOREIGN =
  /\b(district court|county court|county highway|state highway \d|zip ?code|amsterdam|texas|\bny\b|\bnj\b|\btx\b|\bca\b|\bfl\b|county clerk|dmv)\b/i
const LOCAL = /\b(noida|greater noida|sector\s*\d|ncr|delhi|gurgaon|uttar pradesh|\bup\b)\b/i

const sectorOf = (q: string): string | null => {
  const m = /\bsector[\s-]*(\d{1,3}\s*[a-d]?)\b/i.exec(q)
  return m ? `Sector ${m[1].replace(/\s+/g, '').toUpperCase()}` : null
}

type Lane =
  | 'declined:elsewhere'
  | 'answered:pin-code'
  | 'answered:builder-held'
  | 'answered:builder-absent'
  | 'ai'

async function laneFor(q: string): Promise<Lane> {
  if (FOREIGN.test(q) && !LOCAL.test(q)) return 'declined:elsewhere'
  const sector = sectorOf(q)
  if (sector && (await sectorPinCode(q, [sector]))) return 'answered:pin-code'
  const cov = await builderCoverage(q)
  if (cov) return cov.kind === 'builder_held' ? 'answered:builder-held' : 'answered:builder-absent'
  return 'ai'
}

async function main() {
  const counts = new Map<Lane, number>()
  const examples = new Map<Lane, string[]>()

  for (const q of queries) {
    const lane = await laneFor(q.query)
    counts.set(lane, (counts.get(lane) ?? 0) + 1)
    const seen = examples.get(lane) ?? []
    if (seen.length < 5) examples.set(lane, [...seen, q.query])
  }

  console.log(`\n═══ routing — ${queries.length} queries from ${source}, no model calls ═══\n`)
  for (const [lane, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`${String(n).padStart(4)}  ${String(Math.round((100 * n) / queries.length)).padStart(3)}%  ${lane}`)
    for (const e of examples.get(lane) ?? []) console.log(`        ${e}`)
    console.log('')
  }

  const free = queries.length - (counts.get('ai') ?? 0)
  console.log(`  ${free} of ${queries.length} answered or declined without a model call — ${Math.round((100 * free) / queries.length)}%\n`)

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
