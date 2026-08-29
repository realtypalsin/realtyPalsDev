// backend/scripts/fix-price-labels.ts
//
// Recompute Project.price_range_label from each project's own unit types.
//
//   npx tsx scripts/fix-price-labels.ts            report only, writes nothing
//   npx tsx scripts/fix-price-labels.ts --apply    write, after saving a backup
//
// `price_range_label` is free text entered alongside the unit rows, and it
// drifted from them: Nirala Diadem read "₹115 Lakh onwards" while its cheapest
// unit is a 3 BHK at ₹1.45 Cr — a different number, quoted 20% under the real
// floor, on a card a buyer decides from. Search results were never wrong
// because they build the label from units; every path that read the stored
// column was quoting a price we cannot honour.
//
// The label is derived data. Until the column goes away, this is what keeps it
// honest, and `audit-data.ts` is what notices when it drifts again.

import fs from 'fs'
import path from 'path'
import { prisma } from '../src/lib/db'
import { priceLabelFor, buildPriceRangeLabel } from '../src/lib/discovery/scoring'

const APPLY = process.argv.includes('--apply')

/**
 * Read the crore figures out of a stored label.
 *
 * The column is free text written by several hands: "₹115 Lakh onwards",
 * "₹565 Lakh - ₹9.00 Cr", "₹62.00 Lakh - ₹1.25 Cr". Parsing it is not for
 * display — it is so this script can tell a label that is merely formatted
 * differently from one that states a different price, and so a ceiling the
 * unit rows do not carry is not silently thrown away.
 */
function parseStoredCr(label: string | null): { min: number | null; max: number | null } {
  if (!label) return { min: null, max: null }

  // A range often carries its unit once, at the end — "₹1.65–3.8 Cr". Reading
  // only the numbers that are directly followed by a unit sees 3.8 alone and
  // calls a correct label wrong, which is how the first run of this script
  // reported 104 misstatements against a true 44.
  const tokens: Array<{ value: number; unit: string | null }> = []
  const re = /([\d.]+)\s*(lakh|lac|cr|crore)?/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(label)) !== null) {
    const value = Number(m[1])
    if (!Number.isFinite(value)) continue
    tokens.push({ value, unit: m[2] ? m[2].toLowerCase() : null })
  }
  if (tokens.length === 0) return { min: null, max: null }

  // A bare number takes the unit of the next number that names one.
  for (let i = tokens.length - 1, carry: string | null = null; i >= 0; i--) {
    if (tokens[i].unit) carry = tokens[i].unit
    else tokens[i].unit = carry
  }

  const cr = tokens
    .filter((t) => t.unit)
    .map((t) => (t.unit!.startsWith('l') ? t.value / 100 : t.value))
  if (cr.length === 0) return { min: null, max: null }
  return { min: Math.min(...cr), max: cr.length > 1 ? Math.max(...cr) : null }
}

/** Two prices are the same price if they agree to within a rounding step. */
const same = (a: number | null, b: number | null): boolean =>
  a == null && b == null ? true : a == null || b == null ? false : Math.abs(a - b) < 0.011

async function main() {
  const projects = await prisma.project.findMany({
    select: {
      id: true, name: true, city: true, sector: true, price_range_label: true,
      unit_types: { select: { price_min_cr: true, price_max_cr: true } },
    },
    orderBy: { name: 'asc' },
  })

  const planned = projects.map((p) => {
    const mins = p.unit_types.map((u) => u.price_min_cr).filter((n): n is number => n != null)
    const maxs = p.unit_types.map((u) => u.price_max_cr).filter((n): n is number => n != null)
    const stored = parseStoredCr(p.price_range_label)

    const unitMin = mins.length ? Math.min(...mins) : null
    let unitMax = maxs.length ? Math.max(...maxs) : null

    // The units are the source of truth for the floor — they are what budget
    // filtering and comparison run on. But where they carry no ceiling and the
    // stored label does, that ceiling is real information and rewriting without
    // it would make the card less useful than before: "₹62.00 Lakh - ₹1.25 Cr"
    // must not become "₹0.62Cr+".
    let keptCeiling = false
    if (unitMax == null && stored.max != null && unitMin != null && stored.max > unitMin) {
      unitMax = stored.max
      keptCeiling = true
    }

    const next = unitMin != null ? buildPriceRangeLabel(unitMin, unitMax) : priceLabelFor(p)
    const misstates = unitMin != null && !same(stored.min, unitMin)
    return { p, next, misstates, keptCeiling, storedMin: stored.min, unitMin }
  })

  const wrong = planned.filter((c) => c.misstates && c.next !== c.p.price_range_label)
  const reformat = planned.filter((c) => !c.misstates && c.next !== c.p.price_range_label)
  const changes = [...wrong, ...reformat]
  const unpriced = projects.filter((p) => p.unit_types.every((u) => u.price_min_cr == null))

  console.log(`\nprojects                     ${projects.length}`)
  console.log(`state a different price       ${wrong.length}   ← a buyer is misled by these`)
  console.log(`same price, other formatting  ${reformat.length}`)
  console.log(`no priced unit at all         ${unpriced.length}  (left as stored — it is all we hold)`)
  console.log(`ceiling preserved from label  ${changes.filter((c) => c.keptCeiling).length}\n`)

  console.log('MISSTATED — stored floor vs the units\' own floor:')
  for (const c of wrong.slice(0, 15)) {
    const off = c.storedMin != null && c.unitMin != null
      ? `${c.storedMin < c.unitMin ? 'under' : 'over'} by ${Math.abs(Math.round(100 * (c.storedMin - c.unitMin) / c.unitMin))}%`
      : 'no figure parsed'
    console.log(`  ${c.p.name.padEnd(32)} ${String(c.p.price_range_label).padEnd(24)} → ${String(c.next).padEnd(16)} ${off}`)
  }
  if (wrong.length > 15) console.log(`  … ${wrong.length - 15} more`)

  if (!APPLY) {
    console.log('\nreport only — pass --apply to write\n')
    await prisma.$disconnect()
    // Non-zero when a stored label states a price its own units do not, so this
    // can gate a deploy. Formatting drift alone is not worth failing a build
    // over; a wrong number on a card is.
    process.exit(wrong.length > 0 ? 1 : 0)
  }

  // Every overwritten value is recoverable. The column is free text nobody can
  // reconstruct from elsewhere, so it is saved before it is replaced.
  const backup = path.join(__dirname, `price-label-backup-${Date.now()}.json`)
  fs.writeFileSync(
    backup,
    JSON.stringify(changes.map(({ p, next }) => ({
      id: p.id, name: p.name, was: p.price_range_label, now: next,
    })), null, 2),
  )
  console.log(`\nbackup written: ${backup}`)

  let done = 0
  for (const { p, next } of changes) {
    await prisma.project.update({ where: { id: p.id }, data: { price_range_label: next } })
    done++
  }
  console.log(`updated ${done} project(s)\n`)
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
