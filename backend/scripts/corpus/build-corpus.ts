// backend/scripts/corpus/build-corpus.ts
//
// Folds the five query files in the repo root into one deduplicated corpus.
//
//   npx tsx scripts/corpus/build-corpus.ts
//   -> scripts/corpus/corpus.json
//
// Each entry carries the source file and a coarse class. The class is what the
// runner grades against: an out-of-scope query (rent, resale, dealer) is only
// "correct" if we decline honestly, so it cannot share a rubric with a
// market-fact query.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..', '..')
const OUT = join(HERE, 'corpus.json')

export type QueryClass =
  | 'market_fact' // Noida-wide figures: price/sqft, appreciation, rental yield
  | 'sector' // sector-level judgement, single sector
  | 'comparison' // A vs B
  | 'project_builder' // named project or builder
  | 'budget_personal' // stated budget / income / family constraints
  | 'financial' // EMI, stamp duty, GST, loan
  | 'risk_legal' // due diligence, RERA, documents, area problems
  | 'temporal' // "recently", "last 12 months", "upcoming"
  | 'out_of_scope' // rent, resale, commercial, auction, dealer, plot, PG
  | 'brand_probe' // a named brand, most of which have no Noida residential stock
  | 'discovery' // "best sector for families", "which sector is best"
  | 'malformed' // "propertiesinnoida107" — typo'd head terms from the CSVs
  | 'navigational' // bare head terms: "property in noida"
  | 'other'

export interface CorpusEntry {
  id: string
  query: string
  class: QueryClass
  sources: string[]
  /** Search volume from the CSVs, when the row carried one. */
  volume?: number
}

// ── source readers ─────────────────────────────────────────────────────────

function readLines(file: string): string[] {
  return readFileSync(join(ROOT, file), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.replace(/^﻿/, '').trim())
    .filter(Boolean)
}

/** queries1.md — one query per line, blank-line separated groups. */
function fromQueries1(): { query: string; volume?: number }[] {
  return readLines('queries1.md').map((query) => ({ query }))
}

/**
 * queriesStress.md — prose file. Drop the "A. Basic factual…" section headers
 * and the two explanatory paragraphs; everything else is a query.
 */
function fromStress(): { query: string; volume?: number }[] {
  return readLines('queriesStress.md')
    .filter((l) => !/^[A-Z]\.\s/.test(l))
    .filter((l) => !/^These are/i.test(l))
    .map((query) => ({ query }))
}

/** Minimal RFC4180 line splitter — the CSVs quote fields containing commas. */
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else inQuotes = false
      } else cur += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out
}

/** queries2/3/4.csv — keyword-research exports; the query lives in `Keyword`. */
function fromCsv(file: string): { query: string; volume?: number }[] {
  const lines = readLines(file)
  const header = splitCsvLine(lines[0]).map((h) => h.trim().replace(/^﻿/, ''))
  const kwIdx = header.findIndex((h) => /^keyword$/i.test(h))
  const volIdx = header.findIndex((h) => /search\s*vol/i.test(h))
  if (kwIdx === -1) throw new Error(`${file}: no Keyword column in [${header.join(', ')}]`)

  return lines.slice(1).flatMap((line) => {
    const cols = splitCsvLine(line)
    const query = (cols[kwIdx] ?? '').trim()
    if (!query) return []
    const rawVol = volIdx >= 0 ? (cols[volIdx] ?? '').trim() : ''
    const volume = /^\d+$/.test(rawVol) ? Number(rawVol) : undefined
    return [{ query, volume }]
  })
}

// ── classification ─────────────────────────────────────────────────────────

/**
 * Out of V1 scope per CLAUDE.md. These must be declined honestly, not answered.
 * Order matters: this test runs before every other class.
 */
const OUT_OF_SCOPE = [
  /\brent(al)?s?\b(?!\s*yield)/i, // "rental yield" is an investment metric, in scope
  /\bfor rent\b/i,
  // A request FOR resale stock, not any mention of the word. "resale liquidity",
  // "resale value" and "resale potential" are attributes of a new-build purchase
  // — they are exactly what an advisor should discuss — and matching a bare
  // \bresale\b sent the richest query in the whole corpus to the decline bucket.
  /\bresale\s+(propert|flat|apartment|home|house|unit|market|listing)/i,
  /\bbuy(ing)?\s+a\s+resale\b/i,
  /\bcommercial\b/i,
  /\boffice space\b/i,
  /\bshops?\b/i,
  /\bauction\b/i,
  /\bdealers?\b/i,
  /\bbrokers?\b/i,
  /\bpg\b/i,
  /\bplots?\b/i,
  /\bland\b/i,
  /\bvilla plots?\b/i,
  /\bindependent house\b/i,
  /\bkothi\b/i,
  /\bwarehouse\b/i,
  /\bleasehold|freehold\b/i,
  /\bhome loan approval\b/i,
]

/**
 * A named brand in the query. Most of these have no Noida residential stock at
 * all — some are hotel groups. The only correct answer is that we hold nothing
 * for them, so they are graded on refusal-to-fabricate, not on recommendation
 * quality. Kept explicit rather than inferred: a generic "capitalised word"
 * heuristic would swallow half the sector queries.
 */
const BRANDS =
  /\b(accor|ace|airbnb|amrapali|assotech|ats|bhutani|damac|dlf|eldeco|emaar|gaur|godrej|gulshan|jaypee|jp|lodha|m3m|mahagun|marriott|max|nbcc|nirala|omaxe|paras|prateek|prestige|purvanchal|sarthi|sobha|sunworld|supertech|taj|tata|county|hyatt|oberoi|radisson)\b/i

/** Hospitality, not residential — a brand probe that is also out of V1 scope. */
const HOSPITALITY = /\b(\d\s*star|hotel|resort|airbnb|marriott|taj|accor|hyatt|radisson|oberoi)\b/i

/** Head terms mangled by the keyword tool: no spaces, or dots/underscores for them. */
const MALFORMED = /^[a-z0-9]*(?:properties|property|flats?)[a-z0-9_.]*$|^[a-z]+[._][a-z._]+$/i

const RULES: [RegExp, QueryClass][] = [
  [/\bemi\b|\bstamp duty\b|\bgst\b|\bregistration charge|\bdown payment\b|\bloan\b|\bper month\b/i, 'financial'],
  [/\bvs\b|\bversus\b|\bbetter than\b|\bcompare\b|\bdifference between\b|\bwhich is better\b/i, 'comparison'],
  // "risk-adjusted return" is an investment phrase, not a due-diligence one.
  [/\brera\b|\brisks?\b(?!-adjusted)|\blegal|\bdocument|\bverify|\bdue diligence|\bwaterlogg|\bpollution|\bsafe\b|\bavoid\b|\blitigation|\bcheck before\b/i, 'risk_legal'],
  // `appreciat` was in here and swallowed most investment questions: nearly
  // every one mentions appreciation, and almost none of them is asking what
  // changed recently. Temporal means the query turns on a date.
  // Above temporal: a stated budget or income dictates what the answer must
  // contain far more than a "next 5 years" horizon does, and most investment
  // questions carry both. "I have ₹1 crore … best risk-adjusted return over the
  // next 5 years" is a budget question with a horizon, not a news question.
  [/₹|\bcrore\b|\bcr\b|\blakh\b|\bbudget\b|\bi have\b|\bi earn\b|\bmy family\b|\bmy wife\b|\bafford/i, 'budget_personal'],
  [/\brecent|\blast \d+ months?\b|\bupcoming\b|\bright now\b|\bcurrently\b|\bthis year\b|\bnext \d+ years?\b|\bhistorically\b/i, 'temporal'],
  [/\bbuilder\b|\bdeveloper\b|\bsociety\b|\bproject\b|\bgodrej\b|\bats\b|\bnirala\b|\belite\b|\bgaur\b|\bsupertech\b/i, 'project_builder'],
  [/\bsector\s*\d+|\bnoida extension\b|\bgreater noida\b|\byamuna expressway\b|\bjewar\b/i, 'sector'],
  [/\bprice per sq\.? ?ft\b|\brate|\bprice(s)?\b|\byield\b|\bmarket\b|\baverage\b/i, 'market_fact'],
  // Superlative discovery with no sector, budget or brand anchor. Last, so a
  // "best 3 BHK under 1.5cr in Sector 75" lands on the more specific class.
  [/\bbest\b|\btop\b|\bcheapest\b|\bmost expensive\b|\bwhich (sector|area|property|flat|builder)/i, 'discovery'],
]

/** Bare head terms with no question in them — a portal query, not an advisory one. */
const NAVIGATIONAL = /^(property|properties|flats?|apartments?|\d\s*bhk|new projects?)\b[\w\s]*$/i

/**
 * Asks about public law or process, not about inventory we would have to hold.
 *
 * "What legal documents should I check before buying a resale apartment" names
 * resale, but the answer is the same registry and encumbrance checklist for any
 * sale — general knowledge the prompt explicitly permits. Grading it as a
 * decline marked correct answers wrong twice over.
 */
const LEGAL_PROCESS =
  /\b(legal|document|paperwork|title|deed|encumbrance|registry|registration|rera|due diligence|verify|check before|approvals?)\b/i

function classify(query: string): QueryClass {
  if (MALFORMED.test(query.replace(/\s/g, '')) && !/\s/.test(query)) return 'malformed'
  if (LEGAL_PROCESS.test(query)) return 'risk_legal'
  if (HOSPITALITY.test(query)) return 'out_of_scope'
  if (OUT_OF_SCOPE.some((r) => r.test(query))) return 'out_of_scope'
  // Before the sector/discovery rules: "best godrej project in sector 150" is
  // first a question about whether we hold Godrej stock at all.
  if (BRANDS.test(query)) return 'brand_probe'
  for (const [re, cls] of RULES) if (re.test(query)) return cls
  if (NAVIGATIONAL.test(query)) return 'navigational'
  return 'other'
}

// ── build ──────────────────────────────────────────────────────────────────

/** Collapse whitespace and case so "3 BHK in Noida" and "3 bhk in noida" merge. */
const normalize = (q: string) => q.toLowerCase().replace(/\s+/g, ' ').replace(/[?.!]+$/, '').trim()

function main() {
  const sources: [string, () => { query: string; volume?: number }[]][] = [
    ['queries1.md', fromQueries1],
    ['queriesStress.md', fromStress],
    ['queries2.csv', () => fromCsv('queries2.csv')],
    ['queries3.csv', () => fromCsv('queries3.csv')],
    ['queries4.csv', () => fromCsv('queries4.csv')],
  ]

  const byKey = new Map<string, CorpusEntry>()
  let raw = 0

  for (const [name, read] of sources) {
    for (const { query, volume } of read()) {
      raw++
      const key = normalize(query)
      if (!key) continue
      const existing = byKey.get(key)
      if (existing) {
        if (!existing.sources.includes(name)) existing.sources.push(name)
        if (volume !== undefined) existing.volume = Math.max(existing.volume ?? 0, volume)
        continue
      }
      byKey.set(key, {
        id: '', // assigned after sorting, so ids are stable across runs
        query: query.trim(),
        class: classify(query),
        sources: [name],
        ...(volume !== undefined ? { volume } : {}),
      })
    }
  }

  const entries = [...byKey.values()].sort((a, b) => a.query.localeCompare(b.query))
  entries.forEach((e, i) => (e.id = `q${String(i + 1).padStart(3, '0')}`))

  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, JSON.stringify(entries, null, 2))

  const counts = new Map<QueryClass, number>()
  for (const e of entries) counts.set(e.class, (counts.get(e.class) ?? 0) + 1)

  console.log(`raw rows: ${raw}  ->  unique queries: ${entries.length}`)
  console.log('by class:')
  for (const [cls, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cls.padEnd(18)} ${String(n).padStart(4)}  ${((n / entries.length) * 100).toFixed(1)}%`)
  }
  console.log(`written: ${OUT}`)
}

main()
