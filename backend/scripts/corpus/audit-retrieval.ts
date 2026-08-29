// backend/scripts/corpus/audit-retrieval.ts
//
// Does the retrieval layer return the right rows?
//
//   npx tsx scripts/corpus/audit-retrieval.ts
//   npx tsx scripts/corpus/audit-retrieval.ts --class=sector --verbose
//
// No model is called. Every query in the corpus is parsed to an intent by
// regex, run through `discoverProjects`, and the result checked against a
// second, independent Prisma query built from the same parse.
//
// Why this exists: `run-corpus.ts` grades the SHAPE of an answer — did it come
// back, was it the right length, did it carry a table. It cannot tell whether
// the rows underneath were right, so a search that answered "no luxury projects
// in Sector 12, Greater Noida West" scored as a clean pass while the database
// held twelve projects there. Shape was fine. The rows were from another
// sector entirely.
//
// The three findings here are the ones that need no judgement:
//
//   WRONG_PLACE   the buyer named a place; a result is somewhere else
//   FALSE_EMPTY   we hold matching rows; the search returned none
//   MISSED        we hold matching rows the search did not return (not capped)
//
// Anything requiring an opinion about ranking is out of scope on purpose: this
// is an oracle, and an oracle that argues is not one.

import { prisma } from '../../src/lib/db'
import { discoverProjects } from '../../src/lib/discovery/projects'
import { BUDGET_TOLERANCE_MAX } from '../../src/lib/discovery/constants'
import corpus from './corpus.json'

interface CorpusQuery { id: string; query: string; class: string }

/**
 * Read past every cache.
 *
 * Discovery memoises a result for 300s against a hash of the intent. Running
 * this twice with the same queries therefore audits the first run's answers,
 * not the code — which it did: a deliberately reverted fix still scored 100%,
 * because the fixed results were sitting in the cache under identical keys. An
 * audit that reads a cache is auditing the cache.
 *
 * `cache.ts` already treats NODE_ENV=test as "never read, never write", so this
 * is the switch rather than a second one.
 */
process.env.NODE_ENV = 'test'

const args = process.argv.slice(2)
const only = args.find((a) => a.startsWith('--class='))?.split('=')[1]
const verbose = args.includes('--verbose')

// ─── Deterministic intent parse ──────────────────────────────────────────────
// Production extracts intent with a model. Using one here would spend money to
// audit a layer that sits downstream of it — and would make a retrieval bug
// indistinguishable from an extraction bug. This parse is deliberately literal:
// it only ever claims what the query says in so many words.

const CITY_PHRASES: Array<[RegExp, string]> = [
  [/\bgreater noida west\b|\bnoida extension\b|\bnoida ext\b|\bgnw\b/i, 'Greater Noida West'],
  [/\bgreater noida\b/i, 'Greater Noida'],
  [/\byamuna expressway\b/i, 'Yamuna Expressway'],
]

interface ParsedIntent {
  sector?: string
  city?: string
  bhk?: number[]
  budgetMax?: number
  builderName?: string
}

function parseQuery(q: string, builders: string[]): ParsedIntent {
  const out: ParsedIntent = {}

  for (const [re, city] of CITY_PHRASES) {
    if (re.test(q)) { out.city = city; break }
  }
  // No Greater Noida marker and the word "noida" present means plain Noida.
  if (!out.city && /\bnoida\b/i.test(q)) out.city = 'Noida'

  // A query naming several sectors is a comparison, not a claim about one
  // place, and this parse cannot represent it. Left unset so the query is
  // skipped rather than audited against whichever sector happened to be first —
  // which read a four-sector comparison as a failed search of Sector 62.
  const sectors = [...new Set(
    [...q.matchAll(/\bsector[\s-]*(\d{1,3}\s*[a-d]?)\b/gi)]
      .map((m) => `Sector ${m[1].replace(/\s+/g, '').toUpperCase()}`),
  )]
  const techzone = /\btechzone[\s-]*(\d)\b/i.exec(q)
  if (sectors.length === 1) out.sector = sectors[0]
  else if (sectors.length === 0 && techzone) out.sector = `Techzone ${techzone[1]}`

  const bhk = [...q.matchAll(/\b([1-6])\s*bhk\b/gi)].map((m) => Number(m[1]))
  if (bhk.length) out.bhk = [...new Set(bhk)]

  // "1.5 cr", "1.5 crore", "under 2cr", "80 lakh"
  const cr = /\b(\d+(?:\.\d+)?)\s*(?:cr\b|crore)/i.exec(q)
  const lakh = /\b(\d{2,3})\s*(?:lakh|lac|l\b)/i.exec(q)
  if (cr) out.budgetMax = Number(cr[1])
  else if (lakh) out.budgetMax = Number(lakh[1]) / 100

  // Builders are matched against the names we hold, longest first, so
  // "Godrej Properties" is not read as some other row containing "Godrej".
  const lower = q.toLowerCase()
  const hit = builders.find((b) => lower.includes(b.toLowerCase()))
  if (hit) out.builderName = hit

  return out
}

// ─── The oracle ──────────────────────────────────────────────────────────────
// Built from the same parse, straight against Prisma, sharing no code path with
// discovery. Two implementations of "what should come back" that agree is
// evidence; one implementation checking itself is not.

async function groundTruth(p: ParsedIntent): Promise<Array<{ name: string; city: string; sector: string }>> {
  if (!p.sector) return []
  const where: Record<string, unknown> = {
    sector: { equals: p.sector, mode: 'insensitive' },
    // A debarred builder is withheld on purpose. Counting its rows as owed to
    // the buyer reports the safety rule as a bug — the first run of this audit
    // did exactly that, flagging four Amrapali projects under NCLAT debarment
    // as inventory we had failed to show.
    builder: { legal_flag: null },
  }
  if (p.city) where.city = { equals: p.city, mode: 'insensitive' }
  if (p.builderName) {
    where.builder = { name: { contains: p.builderName, mode: 'insensitive' }, legal_flag: null }
  }
  // BHK and budget must hold on the SAME unit — a project with a 2BHK in budget
  // and a 3BHK over it does not answer "3 BHK under 1.25cr".
  const unit: Record<string, unknown> = {}
  if (p.bhk?.length) unit.bhk = { in: p.bhk }
  if (p.budgetMax) {
    unit.OR = [
      { price_min_cr: { lte: p.budgetMax * BUDGET_TOLERANCE_MAX } },
      { price_min_cr: null },
    ]
  }
  if (Object.keys(unit).length) where.unit_types = { some: unit }

  return prisma.project.findMany({
    where: where as never,
    select: { name: true, city: true, sector: true },
    orderBy: { name: 'asc' },
  })
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

// ─── The phrasings the corpus never had ──────────────────────────────────────
// 321 real queries audited clean while "Sector 12, Greater Noida West" returned
// twelve projects from the wrong sectors. They audited clean because not one of
// them names a sector AND its city — the corpus was collected from search logs,
// where people type "sector 150 noida" and rarely disambiguate.
//
// So the phrasings are generated from inventory instead of collected: every
// sector we hold rows for, written the several ways a buyer writes it. The
// expected answer is known by construction, and a sector added next month is
// covered the first time this runs.

const CITY_SHORTHAND: Record<string, string[]> = {
  'Greater Noida West': ['Greater Noida West', 'Noida Extension', 'GNW'],
  'Greater Noida': ['Greater Noida'],
  Noida: ['Noida'],
  'Yamuna Expressway': ['Yamuna Expressway'],
}

async function generatedQueries(): Promise<CorpusQuery[]> {
  const held = await prisma.project.groupBy({ by: ['city', 'sector'], _count: true })
  const out: CorpusQuery[] = []
  let n = 0
  for (const { city, sector } of held) {
    for (const written of CITY_SHORTHAND[city] ?? [city]) {
      out.push(
        { id: `g${++n}`, query: `${sector}, ${written}`, class: 'generated' },
        { id: `g${++n}`, query: `3 BHK in ${sector} ${written}`, class: 'generated' },
      )
    }
    // The bare form, which must not drift to another city's sector of the same
    // number when only one city has it.
    out.push({ id: `g${++n}`, query: `projects in ${sector}`, class: 'generated' })
  }
  return out
}

interface Finding {
  kind: 'WRONG_PLACE' | 'FALSE_EMPTY' | 'MISSED'
  id: string
  query: string
  detail: string
}

async function main() {
  const builders = (await prisma.builder.findMany({ select: { name: true } }))
    .map((b) => b.name)
    .sort((a, b) => b.length - a.length)

  // Discovery narrates itself at every branch. Useful in a request log, noise
  // in a report — the findings are the output here.
  const chatter = console.log
  const quiet = () => { console.log = () => {} }
  const loud = () => { console.log = chatter }

  const pool = [...(corpus as CorpusQuery[]), ...(await generatedQueries())]
  const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 0)
  const queries = pool
    .filter((q) => !only || q.class === only)
    .slice(0, limit > 0 ? limit : undefined)
  const findings: Finding[] = []
  let audited = 0
  let skipped = 0

  for (const q of queries) {
    const parsed = parseQuery(q.query, builders)
    // Nothing to check: the query never named a place, so there is no claim
    // about location to be wrong about. Counted, not silently dropped.
    if (!parsed.sector) { skipped++; continue }

    const truth = await groundTruth(parsed)
    // The parse found a sector string we hold no rows for at all. That is a
    // data-coverage fact, not a retrieval defect — `beta-report.ts` owns it.
    if (truth.length === 0) { skipped++; continue }

    audited++
    const term = parsed.city ? `${parsed.sector}, ${parsed.city}` : parsed.sector
    quiet()
    const result = await discoverProjects({ ...parsed, sector: term } as never, 0)
    loud()
    const returned = result.exactResults as Array<{ name: string; city: string; sector: string }>

    // Asking which city is a correct answer, not an empty one. "Sector 107" is
    // a real sector in both Noida and Greater Noida West, and picking one for
    // the buyer is the failure mode — silently merging both is what this whole
    // audit exists to catch. Only count it as an answer when the query itself
    // did not name a city; if it did and we still asked, that IS a defect.
    const asked = (result as { cityDisambiguation?: unknown }).cityDisambiguation
    if (asked && !parsed.city) continue
    if (asked && parsed.city) {
      findings.push({
        kind: 'FALSE_EMPTY', id: q.id, query: q.query,
        detail: `asked which city, but the query already said ${parsed.city}`,
      })
      continue
    }

    if (returned.length === 0) {
      findings.push({
        kind: 'FALSE_EMPTY', id: q.id, query: q.query,
        detail: `${truth.length} row(s) in ${term}, search returned none — e.g. ${truth.slice(0, 3).map((t) => t.name).join(', ')}`,
      })
      continue
    }

    const strays = returned.filter(
      (r) => norm(r.sector) !== norm(parsed.sector as string) ||
        (parsed.city ? norm(r.city) !== norm(parsed.city) : false),
    )
    if (strays.length > 0) {
      findings.push({
        kind: 'WRONG_PLACE', id: q.id, query: q.query,
        detail: `asked ${term}, got ${strays.length}/${returned.length} elsewhere — e.g. ${strays.slice(0, 3).map((s) => `${s.name} [${s.city}/${s.sector}]`).join(', ')}`,
      })
    }

    // Undercoverage only counts when the page was not full: a short page means
    // the search had room and still left rows behind.
    const names = new Set(returned.map((r) => norm(r.name)))
    const missed = truth.filter((t) => !names.has(norm(t.name)))
    if (missed.length > 0 && returned.length < 20) {
      findings.push({
        kind: 'MISSED', id: q.id, query: q.query,
        detail: `${missed.length} row(s) in ${term} left behind on an unfilled page — e.g. ${missed.slice(0, 3).map((m) => m.name).join(', ')}`,
      })
    }
  }

  // ── Report ────────────────────────────────────────────────────────────────
  const byKind = new Map<string, Finding[]>()
  for (const f of findings) {
    byKind.set(f.kind, [...(byKind.get(f.kind) ?? []), f])
  }

  const fromCorpus = queries.filter((q) => q.class !== 'generated').length
  console.log(`\n═══ retrieval audit — ${queries.length} queries ═══\n`)
  console.log(`  corpus             ${fromCorpus}   (real search traffic)`)
  console.log(`  generated          ${queries.length - fromCorpus}   (every sector we hold, written several ways)`)
  console.log(`  audited            ${audited}   (named a sector we hold rows for)`)
  console.log(`  skipped            ${skipped}   (no sector named, or none held)`)
  console.log(`  clean              ${audited - new Set(findings.map((f) => f.id)).size}`)
  console.log(`  with a finding     ${new Set(findings.map((f) => f.id)).size}\n`)

  for (const kind of ['FALSE_EMPTY', 'WRONG_PLACE', 'MISSED'] as const) {
    const list = byKind.get(kind) ?? []
    console.log(`${kind.padEnd(12)} ${list.length}`)
    for (const f of verbose ? list : list.slice(0, 8)) {
      console.log(`  ${f.id}  "${f.query.slice(0, 58)}"`)
      console.log(`        ${f.detail}`)
    }
    if (!verbose && list.length > 8) console.log(`  … ${list.length - 8} more (--verbose)`)
    console.log('')
  }

  const pass = audited > 0 ? ((audited - new Set(findings.map((f) => f.id)).size) / audited) * 100 : 0
  console.log(`  retrieval correctness: ${pass.toFixed(1)}%\n`)

  await prisma.$disconnect()
  // A finding is a defect. Exit non-zero so this can gate a deploy.
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
