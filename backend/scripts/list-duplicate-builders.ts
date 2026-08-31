// backend/scripts/list-duplicate-builders.ts
//
//   npx tsx scripts/list-duplicate-builders.ts
//
// Builder rows that look like the same company, for a human to merge.
//
// Deliberately a REPORT, not a fixer. Merging changes which builder a project
// points at, and getting it wrong attributes someone else's delays to the
// wrong developer — the exact failure this product exists to avoid. The
// judgement of "is Gaursons India the same company as Gaurs Group" is not one
// a name-similarity score should be trusted to make alone.

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

/** Strips suffixes that distinguish nothing: "Ltd", "Group", "India", "Pvt". */
function core(name: string): string {
  return name.toLowerCase()
    .replace(/\b(pvt|private|ltd|limited|llp|inc|corp|corporation|company|co|group|india|infra|infrastructure|projects?|developers?|builders?|buildtech|homes|realty|estates?|housing|world)\b/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function main() {
  const builders = await prisma.builder.findMany({
    select: {
      id: true, name: true, cin: true, rera_promoter_id: true, founded_year: true,
      delayed_projects_count: true, average_delay_months: true, description: true,
      _count: { select: { projects: true } },
    },
    orderBy: { name: 'asc' },
  })

  const groups = new Map<string, typeof builders>()
  for (const b of builders) {
    const k = core(b.name)
    if (k.length < 3) continue
    groups.set(k, [...(groups.get(k) ?? []), b])
  }

  const dupes = [...groups.entries()].filter(([, l]) => l.length > 1)
    .sort((a, b) => b[1].reduce((s, x) => s + x._count.projects, 0) - a[1].reduce((s, x) => s + x._count.projects, 0))

  console.log(`\n${'='.repeat(74)}`)
  console.log(`DUPLICATE BUILDER CANDIDATES — ${dupes.length} groups, ${dupes.reduce((s, [, l]) => s + l.length, 0)} rows`)
  console.log(`${'='.repeat(74)}`)
  console.log('\nGrouped by name with corporate suffixes removed. Each group is a')
  console.log('SUGGESTION for a human to confirm — a joint venture is not a duplicate.\n')

  for (const [key, list] of dupes) {
    const total = list.reduce((s, b) => s + b._count.projects, 0)
    console.log(`\n── "${key}" — ${list.length} rows, ${total} projects between them`)
    for (const b of list) {
      console.log(`   ${b.name}`)
      console.log(`     id           ${b.id}`)
      console.log(`     projects     ${b._count.projects}`)
      console.log(`     founded      ${b.founded_year ?? '—'}`)
      console.log(`     cin          ${b.cin ?? '— (cleared: was provably wrong)'}`)
      console.log(`     rera id      ${b.rera_promoter_id ?? '—'}`)
      console.log(`     delays       ${b.delayed_projects_count ?? '—'} projects, ${b.average_delay_months ?? '—'} months avg`)
      console.log(`     description  ${b.description ? `${b.description.slice(0, 70)}…` : '—'}`)
    }
    // The thing that makes a merge urgent rather than cosmetic.
    const delays = new Set(list.map((b) => `${b.delayed_projects_count}/${b.average_delay_months}`))
    if (delays.size > 1) {
      console.log(`     ⚠ CONTRADICTORY TRACK RECORDS — the same question gets a different`)
      console.log(`       answer depending on which row the chat happens to hit.`)
    }
  }

  console.log(`\n${'─'.repeat(74)}`)
  console.log('Suggested keep: the row with the most projects. Move the others\' projects')
  console.log('onto it, then delete the empties. Confirm each pair by hand first —')
  console.log('"ACE Group" and "ACE Group & Mahagun" are a company and a joint venture.\n')
}

main().catch((e) => { console.error(e); process.exitCode = 1 }).finally(() => prisma.$disconnect())
