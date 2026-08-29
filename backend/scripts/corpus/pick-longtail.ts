// backend/scripts/corpus/pick-longtail.ts
//
// Curate a runnable set from the keyword exports in /test.
//
//   npx tsx scripts/corpus/pick-longtail.ts > scripts/corpus/longtail.json
//
// The exports hold 904 unique keywords across four targets, and most are near
// duplicates: "ace hanei address", "ace hanei location", "ace hanei map". Running
// all of them spends money to grade the same answer many times.
//
// So one query is kept per (target × topic). Topic is read from the keyword —
// price, RERA, possession, amenities, brochure — which is what actually decides
// which branch of the router answers. Volume breaks ties, so the survivor of
// each bucket is the phrasing people really search.

import fs from 'fs'
import path from 'path'

const DIR = path.join(__dirname, '../../../test')

/** What the buyer is really asking, in the order a specific pattern must win. */
const TOPICS: Array<[string, RegExp]> = [
  ['payment_plan', /payment plan|instal?ment|emi|booking amount|down payment/i],
  ['price', /price|rate|cost|cr\b|crore|lakh|budget|per sqft|psf/i],
  ['rera', /rera|approval|registration|legal|litigation|nclt|court/i],
  ['possession', /possession|ready to move|handover|completion|delay|oc\b|occupancy/i],
  ['floorplan', /floor plan|layout|carpet|super area|sq ?ft|size|\d\s*bhk/i],
  ['amenities', /amenit|club|gym|pool|park|sport|security|lift|parking/i],
  ['location', /address|location|map|metro|distance|connectivity|near|route/i],
  ['builder', /builder|developer|group|owner|promoter|reputation|review/i],
  ['resale_rent', /resale|rent|lease|tenant|yield|roi|investment|appreciat/i],
  ['brochure', /brochure|pdf|download|photo|image|video|gallery|site visit/i],
  ['comparison', /vs\b|versus|compare|better|difference|which one/i],
  ['availability', /available|inventory|units left|sold out|launch|new/i],
]

const topicOf = (q: string): string => TOPICS.find(([, re]) => re.test(q))?.[0] ?? 'general'

/** "all_categories-sector_75_noida-hi-in-…" → "sector_75_noida" */
const targetOf = (file: string): string =>
  file.replace(/^all_categories-/, '').replace(/-hi-in-.*$/, '')

interface Row { query: string; target: string; topic: string; volume: number }

const rows: Row[] = []
for (const file of fs.readdirSync(DIR).filter((f) => f.startsWith('all_categories') && f.endsWith('.csv'))) {
  const target = targetOf(file)
  const lines = fs.readFileSync(path.join(DIR, file), 'utf8').split(/\r?\n/).slice(1).filter(Boolean)
  for (const line of lines) {
    // No CSV library for a file we control the shape of; every field is quoted.
    const cells = line.match(/"([^"]*)"/g)?.map((c) => c.slice(1, -1)) ?? []
    if (cells.length < 6) continue
    const query = cells[4]?.trim()
    if (!query || query.length < 6) continue
    rows.push({ query, target, topic: topicOf(query), volume: Number(cells[6]) || 0 })
  }
}

// One survivor per target × topic: the highest-volume phrasing.
const best = new Map<string, Row>()
for (const r of rows) {
  const key = `${r.target}::${r.topic}`
  const held = best.get(key)
  if (!held || r.volume > held.volume) best.set(key, r)
}

// Then the highest-volume remainder, so genuinely popular phrasings are not
// lost just because their bucket already had a winner — but capped per target.
//
// Without the cap the fill is won outright by whichever target has the most
// rows: the first run returned 64 queries about one project and 2 about Sector
// 10, which measures that project rather than the product.
const PER_TARGET = 30
const chosen = new Map<string, Row>()
const perTarget = new Map<string, number>()
const take = (r: Row): void => {
  const key = r.query.toLowerCase()
  if (chosen.has(key)) return
  const n = perTarget.get(r.target) ?? 0
  if (n >= PER_TARGET) return
  chosen.set(key, r)
  perTarget.set(r.target, n + 1)
}

for (const r of best.values()) take(r)
for (const r of [...rows].sort((a, b) => b.volume - a.volume)) {
  if (chosen.size >= 120) break
  take(r)
}

const out = [...chosen.values()]
  .sort((a, b) => a.target.localeCompare(b.target) || a.topic.localeCompare(b.topic))
  .map((r, i) => ({ id: `lt${String(i + 1).padStart(3, '0')}`, query: r.query, class: r.topic, target: r.target, volume: r.volume }))

console.log(JSON.stringify(out, null, 2))
