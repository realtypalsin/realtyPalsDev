#!/usr/bin/env node
/**
 * Which buyer-facing fields carry no information.
 *
 * `npm run audit:synthetic`
 *
 * Two fields were caught by hand after a buyer was shown them — a
 * recommendation tier that reads STRONG_BUY on all 280 projects, and a
 * "satisfaction rating" that is 4.7 on 92 of the 94 rows that have one. Both
 * were found because a review document happened to point at them.
 *
 * That is not a method. This is: sweep every field in PROJECT_PUBLIC_SELECT and
 * report the ones whose values do not vary. A field where one value covers
 * almost every populated row is not a measurement, whatever its column name
 * says, and rendering it gives a buyer a specific figure that nobody measured.
 *
 * The judgement this cannot make for you is the interesting half. A
 * concentrated distribution is not automatically fake:
 *
 *   ongoing_litigation_count   0×239, 3×19, 5×11, 6×8, 2×2, 4×1
 *       Real. Most projects genuinely have no litigation, and the tail is
 *       populated. Withholding it would hide good news from buyers.
 *
 *   handover_defect_rate       1.2×91
 *       Not real. One value, every populated row. No one measured 91 projects
 *       and found the identical defect rate.
 *
 * So the report separates FLAT (one or two values, effectively a constant) from
 * CONCENTRATED (dominant value with a populated tail) and asks a human to look
 * at the second group. The cost of getting it wrong runs both ways: rendering a
 * template is a fabricated fact, and withholding a real one hides something the
 * buyer is entitled to.
 */
import { prisma } from '../src/lib/db'
import { PROJECT_PUBLIC_SELECT, INTERNAL_ONLY_FIELDS } from '../src/lib/projectExposure'

/** Below this many populated rows there is nothing to conclude. */
const MIN_POPULATED = 20

interface Finding {
  field: string
  populated: number
  distinct: number
  topValue: string
  topShare: number
  verdict: 'FLAT' | 'CONCENTRATED'
}

function describe(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

async function main(): Promise<void> {
  const fields = Object.entries(PROJECT_PUBLIC_SELECT)
    .filter(([, selected]) => selected === true)
    .map(([name]) => name)

  const rows = (await prisma.project.findMany({
    select: Object.fromEntries(fields.map((f) => [f, true])) as never,
  })) as unknown as Array<Record<string, unknown>>

  const findings: Finding[] = []

  for (const field of fields) {
    const populated = rows
      .map((r) => r[field])
      .filter((v) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))
    if (populated.length < MIN_POPULATED) continue

    // Booleans and small enums repeat legitimately and by design.
    if (typeof populated[0] === 'boolean') continue

    const counts = new Map<string, number>()
    for (const v of populated) {
      const key = describe(v)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const [topValue, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
    const topShare = topCount / populated.length

    // A field carrying free text or a date is not a measurement to compare.
    if (topValue.length > 40) continue

    if (counts.size <= 2 && topShare >= 0.9) {
      findings.push({ field, populated: populated.length, distinct: counts.size, topValue, topShare, verdict: 'FLAT' })
    } else if (topShare >= 0.7) {
      findings.push({ field, populated: populated.length, distinct: counts.size, topValue, topShare, verdict: 'CONCENTRATED' })
    }
  }

  const withheld = new Set(Object.keys(INTERNAL_ONLY_FIELDS))
  const live = findings.filter((f) => !withheld.has(f.field))

  console.log(`swept ${fields.length} buyer-facing scalar fields across ${rows.length} projects\n`)

  const flat = live.filter((f) => f.verdict === 'FLAT')
  const conc = live.filter((f) => f.verdict === 'CONCENTRATED')

  console.log(`── FLAT — one or two values, effectively a constant ${'─'.repeat(22)}`)
  if (flat.length === 0) console.log('  none')
  for (const f of flat.sort((a, b) => b.topShare - a.topShare)) {
    console.log(
      `  ${f.field.padEnd(30)} ${f.topValue.padEnd(10)} on ${String(Math.round(f.topShare * 100)).padStart(3)}% of ${f.populated} populated  (${f.distinct} distinct)`,
    )
  }

  console.log(`\n── CONCENTRATED — dominant value, populated tail. JUDGEMENT NEEDED ${'─'.repeat(7)}`)
  if (conc.length === 0) console.log('  none')
  for (const f of conc.sort((a, b) => b.topShare - a.topShare)) {
    console.log(
      `  ${f.field.padEnd(30)} ${f.topValue.padEnd(10)} on ${String(Math.round(f.topShare * 100)).padStart(3)}% of ${f.populated} populated  (${f.distinct} distinct)`,
    )
  }

  console.log(
    `\nFLAT fields should be withheld — see SYNTHETIC_FIELDS in projectExposure.ts.\n` +
      `CONCENTRATED needs a person: "0 litigation on 239 of 280" is real and useful,\n` +
      `"8 schools nearby on 81 of 91" is one import repeated. Withholding a true fact\n` +
      `hides good news; rendering a template invents one. Neither error is free.`,
  )

  if (flat.length > 0) process.exitCode = 1
}

main().finally(() => prisma.$disconnect())
