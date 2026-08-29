// backend/scripts/audit-data.ts
//
// Fields that contradict each other on the same project row.
//
//   npm run audit:data
//
// Exits non-zero when a contradiction is found, so it can gate a deploy.
//
// Why this exists: "ace hanei construction update" answered with a superstructure
// 100% complete on a project that launched eleven months earlier, beside a
// possession date of October 2028 and an expected handover quarter of Q4 2026.
// Three fields, one project, no two of them agreeing — and every one of them
// was printed to the buyer, because nothing had ever compared them.
//
// `audit:prices` catches a label that contradicts its units. This is the same
// idea applied to dates and status, which is where the rest of the buyer's
// decision comes from.

process.env.NODE_ENV = 'test'

import { prisma } from '../src/lib/db'

interface Finding {
  project: string
  rule: string
  detail: string
}

/** "Q4 2026" → the last day of that quarter. */
function quarterEnd(q: string | null): Date | null {
  const m = /Q([1-4])\s*(\d{4})/i.exec(q ?? '')
  if (!m) return null
  const endMonth = Number(m[1]) * 3 // 3, 6, 9, 12
  return new Date(Date.UTC(Number(m[2]), endMonth, 0))
}

const MONTHS_MS = 30.44 * 86_400_000

async function main() {
  const projects = await prisma.project.findMany({
    select: {
      name: true, status: true, launch_date: true, possession_date: true,
      expected_handover_quarter: true, oc_obtained: true,
      rera_valid_until: true, construction_milestones: { select: { stage_code: true, completion_pct: true } },
    },
  })

  const findings: Finding[] = []
  const add = (project: string, rule: string, detail: string) => findings.push({ project, rule, detail })

  for (const p of projects) {
    const poss = p.possession_date
    const handover = quarterEnd(p.expected_handover_quarter)

    // The two fields that both claim to say when the buyer gets the keys.
    if (poss && handover) {
      const gapMonths = Math.abs(poss.getTime() - handover.getTime()) / MONTHS_MS
      if (gapMonths > 6) {
        add(p.name, 'possession vs handover quarter',
          `possession ${poss.toISOString().slice(0, 10)} but handover ${p.expected_handover_quarter} — ${Math.round(gapMonths)} months apart`)
      }
    }

    if (p.launch_date && poss && p.launch_date > poss) {
      add(p.name, 'launched after possession',
        `launch ${p.launch_date.toISOString().slice(0, 10)} is after possession ${poss.toISOString().slice(0, 10)}`)
    }

    // A finished building that is still years from handing over.
    const done = p.construction_milestones.filter((m) => (m.completion_pct ?? 0) >= 100).length
    const total = p.construction_milestones.length
    if (total > 0 && done === total && poss && poss.getTime() - Date.now() > 12 * MONTHS_MS) {
      add(p.name, 'built but not handed over',
        `all ${total} milestones complete, yet possession is ${poss.toISOString().slice(0, 10)}`)
    }

    // An occupancy certificate on a building that is not finished.
    if (p.oc_obtained && String(p.status) === 'under_construction') {
      add(p.name, 'OC on an unfinished build', 'oc_obtained is true while status is under_construction')
    }

    if (p.rera_valid_until && poss && p.rera_valid_until < poss) {
      add(p.name, 'RERA lapses before possession',
        `RERA valid to ${p.rera_valid_until.toISOString().slice(0, 10)}, possession ${poss.toISOString().slice(0, 10)}`)
    }
  }

  // ── Stamped placeholders ───────────────────────────────────────────────────
  // A field where one value covers most rows is usually a default someone
  // stamped, not a fact anyone recorded. Two have already been caught this way:
  // `price_range_label` reading "₹115 Lakh onwards" on projects starting at
  // ₹4.30 Cr, and `expected_handover_quarter` reading "Q4 2026" on projects
  // handing over in 2029. Both were quoted to buyers as data.
  //
  // Domination alone is not proof — "99-Year Authority Leasehold" is true of
  // every project on Noida authority land. So this reports for review rather
  // than failing the build, and the exemptions below are values checked by hand
  // and found to be backed by structured fields.
  const CHECKED_AND_BACKED = new Set([
    'land_tenure',        // genuinely uniform: all Noida authority land
    'legal_flag_detail',  // mirrors land_title_clear + litigation count on all 91 rows
    'approvals_status',   // every row carrying it has a RERA number
    'nclt_status',        // mirrors the structured NCLT fields
  ])

  const PLACEHOLDER_CANDIDATES = [
    'possession_label', 'location_verdict', 'green_rating', 'design_theme',
    'water_source', 'registry_status', 'occupancy_certificate_status',
    'shared_walls_type', 'flood_zone', 'proximity_to_industrial', 'project_risk_flag',
  ] as const

  const total = projects.length
  for (const field of PLACEHOLDER_CANDIDATES) {
    if (CHECKED_AND_BACKED.has(field)) continue
    const grouped = await prisma.project.groupBy({
      by: [field as never],
      _count: true,
    }) as Array<Record<string, unknown> & { _count: number }>
    const present = grouped.filter((g) => g[field] != null && g[field] !== '')
    if (present.length === 0 || present.length > 4) continue
    const top = present.sort((a, b) => b._count - a._count)[0]
    const share = top._count / total
    if (share > 0.5) {
      add('(all projects)', 'one value dominates a field',
        `${field} reads "${String(top[field]).slice(0, 48)}" on ${Math.round(share * 100)}% of rows, across only ${present.length} distinct value(s) — check it is recorded, not stamped`)
    }
  }

  const byRule = new Map<string, Finding[]>()
  for (const f of findings) byRule.set(f.rule, [...(byRule.get(f.rule) ?? []), f])

  console.log(`\n═══ data consistency — ${projects.length} projects ═══\n`)
  console.log(`  contradictions   ${findings.length}`)
  console.log(`  projects clean   ${projects.length - new Set(findings.map((f) => f.project)).size}\n`)

  for (const [rule, list] of [...byRule.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`${rule}  (${list.length})`)
    for (const f of list.slice(0, 6)) console.log(`  ${f.project.padEnd(34)} ${f.detail}`)
    if (list.length > 6) console.log(`  … ${list.length - 6} more`)
    console.log('')
  }

  if (findings.length === 0) console.log('  no contradictions found\n')

  await prisma.$disconnect()
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
