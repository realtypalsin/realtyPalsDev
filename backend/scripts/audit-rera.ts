/**
 * Registration numbers claimed by more than one project.
 *
 * `npm run audit:rera`
 *
 * The chat withholds an ambiguous number rather than guessing which project
 * owns it (see reraIntegrity.ts). That is the safe behaviour, not the fix — the
 * fix is reconciling these rows against the authority record. This prints the
 * work list.
 */
import { prisma } from '../src/lib/db'
import { normalizeRera } from '../src/lib/reraIntegrity'

async function main(): Promise<void> {
  const rows = await prisma.project.findMany({
    select: { id: true, name: true, slug: true, sector: true, rera_number: true, builder: { select: { name: true } } },
    orderBy: { name: 'asc' },
  })

  const clusters = new Map<string, typeof rows>()
  for (const r of rows) {
    const key = normalizeRera(r.rera_number)
    if (!key) continue
    clusters.set(key, [...(clusters.get(key) ?? []), r])
  }

  const shared = [...clusters.entries()].filter(([, v]) => v.length > 1).sort((a, b) => b[1].length - a[1].length)
  const affected = shared.reduce((n, [, v]) => n + v.length, 0)

  console.log(`${rows.length} projects · ${shared.length} shared registration numbers · ${affected} projects affected (${((affected / rows.length) * 100).toFixed(1)}%)\n`)

  for (const [rera, group] of shared) {
    // Same name twice is a duplicate row; different names is a wrong number on
    // a real project. They need different fixes, so label them.
    const names = new Set(group.map(g => g.name.toLowerCase()))
    const kind = names.size === 1 ? 'DUPLICATE ROW' : 'COLLISION'
    console.log(`${rera}  [${kind}]`)
    for (const g of group) {
      console.log(`   ${g.name} — ${g.builder?.name ?? 'no builder'} — ${g.sector} — ${g.slug}`)
    }
    console.log()
  }

  if (shared.length > 0) {
    console.log('A COLLISION means a real project carries another project\'s registration number.')
    console.log('It is the one fact we tell buyers to verify themselves, so it is the highest-')
    console.log('trust field in the product. Resolve against the UP-RERA record, not by guessing.')
    process.exitCode = 1
  }
}

main().finally(() => prisma.$disconnect())
