// backend/scripts/fix-builder-identity.ts
//
//   npx tsx scripts/fix-builder-identity.ts            # dry run, changes nothing
//   npx tsx scripts/fix-builder-identity.ts --apply    # writes
//
// Clears company-identity numbers that cannot be right, and says why.
//
// A CIN is issued once per company and is unique by law. So is a UP-RERA
// promoter registration. In our rows, five CINs are each shared by two
// builders — and in three of those pairs the two builders are not the same
// company at all:
//
//   U70102UP2018PTC011198   Amrapali (NBCC)   and   The 3C Company
//   U70102UP2019PTC011184   Migsun Group      and   Spring Group
//   U70101DL1995PTC068480   ACE / Mahagun     and   Mahagun Group
//
// Two unrelated developers cannot hold one CIN. The generator that filled
// these was producing plausible-looking strings, not looking anything up —
// and the embedded incorporation year gives it away independently: Migsun's
// CIN says 2019 while its own founded_year says 2000.
//
// This does NOT invent replacements. Substituting a fresh guess for a bad
// guess is the same error with a cleaner audit trail. An empty column tells
// the chat we do not hold the number, which is true and is the one thing that
// keeps the answer honest; `unverified()` in factPresentation already knows
// how to say so and offer the advisory handoff.
//
// A number that is NOT shared is left alone. Some are real — NBCC India's
// L74899DL1960GOI003335 is the genuine CIN of that PSU — and clearing the
// whole column to be safe would throw away real data to punish a bad batch.

process.env.NODE_ENV = process.env.NODE_ENV || 'test'

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

/** Rows sharing one value in a column that must be unique. */
async function collisions(field: 'cin' | 'rera_promoter_id') {
  const rows = await prisma.builder.findMany({
    where: { [field]: { not: null } },
    select: { id: true, name: true, cin: true, rera_promoter_id: true, founded_year: true, _count: { select: { projects: true } } },
    orderBy: { name: 'asc' },
  })
  const byValue = new Map<string, typeof rows>()
  for (const r of rows) {
    const v = r[field] as string
    byValue.set(v, [...(byValue.get(v) ?? []), r])
  }
  return [...byValue.entries()].filter(([, list]) => list.length > 1)
}

/** The 4-digit incorporation year a CIN encodes: [LU]#####XX(YYYY)... */
function cinYear(cin: string): number | null {
  const m = /^[LU]\d{5}[A-Z]{2}(\d{4})/.exec(cin.toUpperCase())
  return m ? Number(m[1]) : null
}

async function main() {
  console.log(`\n${'='.repeat(72)}\nBUILDER IDENTITY — ${APPLY ? 'APPLYING' : 'DRY RUN (pass --apply to write)'}\n${'='.repeat(72)}`)

  const ids = new Set<string>()

  for (const field of ['cin', 'rera_promoter_id'] as const) {
    const dupes = await collisions(field)
    console.log(`\n### ${field}: ${dupes.length} value(s) shared by more than one builder`)
    for (const [value, list] of dupes) {
      console.log(`\n  ${value}`)
      for (const b of list) {
        console.log(`    ${b.name.padEnd(36)} ${String(b._count.projects).padStart(2)} projects, founded ${b.founded_year ?? '?'}`)
        ids.add(b.id)
      }
    }
  }

  // Independent tell: a CIN whose embedded incorporation year contradicts the
  // builder's own founded_year. Caught separately because it does not need a
  // collision to prove the value was generated rather than looked up.
  const all = await prisma.builder.findMany({
    where: { cin: { not: null }, founded_year: { not: null } },
    select: { id: true, name: true, cin: true, founded_year: true },
  })
  const yearMismatch = all.filter((b) => {
    const y = cinYear(b.cin as string)
    return y !== null && Math.abs(y - (b.founded_year as number)) > 3
  })
  console.log(`\n### CIN incorporation year vs founded_year: ${yearMismatch.length} contradict by more than 3 years`)
  for (const b of yearMismatch.slice(0, 20)) {
    console.log(`    ${b.name.padEnd(36)} CIN says ${cinYear(b.cin as string)}, founded_year says ${b.founded_year}`)
    ids.add(b.id)
  }

  console.log(`\n${'─'.repeat(72)}`)
  console.log(`${ids.size} builder row(s) will have cin and rera_promoter_id cleared to NULL.`)
  console.log('Nothing is replaced with a new value — an empty column is the honest state,')
  console.log('and the chat already knows how to say "we do not hold this, our team can confirm".')

  if (!APPLY) {
    console.log('\nDRY RUN — nothing written. Re-run with --apply.\n')
    return
  }

  const res = await prisma.builder.updateMany({
    where: { id: { in: [...ids] } },
    data: { cin: null, rera_promoter_id: null },
  })
  console.log(`\nCleared identity numbers on ${res.count} builder row(s).`)

  const left = await collisions('cin')
  const leftRera = await collisions('rera_promoter_id')
  console.log(`Remaining collisions — cin: ${left.length}, rera_promoter_id: ${leftRera.length}`)
  const withCin = await prisma.builder.count({ where: { cin: { not: null } } })
  console.log(`Builders still carrying a CIN: ${withCin} (unshared, left alone).\n`)
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
