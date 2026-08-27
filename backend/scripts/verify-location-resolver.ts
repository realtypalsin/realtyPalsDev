/**
 * What does each location phrase actually resolve to, against the live database?
 *
 * The resolver's pure geometry is unit-tested; its tiers are not, because they
 * read rows. This is how you check them: run it after changing the resolver,
 * after tagging SectorIntelligence.micro_market, or when a buyer reports a
 * search that found nothing.
 *
 *   npx tsx scripts/verify-location-resolver.ts
 *
 * It writes nothing. Exit code is 1 if a phrase we expect to resolve came back
 * `literal`, so it can be wired into a check later.
 */
import 'dotenv/config'
import { prisma } from '../src/lib/db'
import { resolveLocationTerm } from '../src/lib/discovery/locationResolver'
import { buildHardFilters } from '../src/lib/discovery/projects'
import type { Intent } from '../src/lib/discovery/types'

/** Phrases a buyer plausibly types, and whether we expect a multi-sector answer. */
const PHRASES: Array<{ term: string; expect: 'area' | 'single' | 'unresolved' }> = [
  { term: 'Noida Expressway', expect: 'area' },
  { term: 'expressway', expect: 'area' },
  { term: 'Central Noida 7X', expect: 'area' },
  { term: 'Greater Noida West', expect: 'area' },
  { term: 'Yamuna Expressway', expect: 'single' },
  { term: 'sectors 132 to 150', expect: 'area' },
  { term: '74 to 79', expect: 'area' },
  { term: 'Sector 150', expect: 'single' },
  { term: 'Sector 143B', expect: 'single' },
  { term: 'Sector 999', expect: 'unresolved' },
  { term: 'somewhere green and quiet', expect: 'unresolved' },
]

async function main(): Promise<void> {
  let failures = 0

  for (const { term, expect } of PHRASES) {
    const r = await resolveLocationTerm(term)
    const where = buildHardFilters({ sector: term, gathering_loop_count: 0 } as Intent, r.sectors)
    const count = await prisma.project.count({ where })

    const kind = r.source === 'literal' ? 'unresolved' : r.sectors.length > 1 ? 'area' : 'single'
    const ok = kind === expect
    if (!ok) failures++

    console.log(
      `${ok ? 'ok  ' : 'FAIL'}  ${term.padEnd(26)} ${r.source.padEnd(17)} ` +
      `${String(r.sectors.length).padStart(2)} sectors  ${String(count).padStart(3)} projects` +
      (ok ? '' : `   expected ${expect}, got ${kind}`),
    )
    if (r.source !== 'literal') console.log(`        ${r.sectors.join(', ')}`)
  }

  // A corridor that returns nothing is the original bug, whatever the tier says.
  const expressway = await resolveLocationTerm('Noida Expressway')
  const n = await prisma.project.count({
    where: buildHardFilters({ sector: 'Noida Expressway', gathering_loop_count: 0 } as Intent, expressway.sectors),
  })
  if (n === 0) {
    console.log('\nFAIL  the Noida Expressway resolved to zero projects')
    failures++
  }

  console.log(`\n${failures === 0 ? 'all phrases resolved as expected' : `${failures} failing`}`)
  await prisma.$disconnect()
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e: unknown) => {
  console.error('verify-location-resolver failed:', e instanceof Error ? e.message : e)
  process.exit(1)
})
