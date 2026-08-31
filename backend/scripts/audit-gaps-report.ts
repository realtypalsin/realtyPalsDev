// backend/scripts/audit-gaps-report.ts
//
//   npx tsx scripts/audit-gaps-report.ts
//
// Which buyer-facing fields are empty, per project and per builder.
//
// The three audits that already existed each answered a slice: audit-data.ts
// finds fields that CONTRADICT each other, audit-full-db-gaps.ts prints
// relation COUNTS with no names, audit-172-field-completeness.ts scores a
// hand-picked list. None of them answers the question a data team actually
// asks — "give me the rows to fill in, and tell me which column."
//
// Scope is PROJECT_PUBLIC_SELECT, so this reports exactly the fields a buyer
// can be shown. An internal column being empty is not a product gap.
//
// Writes two CSVs next to the repo root and prints a worst-first summary.

process.env.NODE_ENV = process.env.NODE_ENV || 'test'

import 'dotenv/config'
import { writeFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { PROJECT_PUBLIC_SELECT } from '../src/lib/projectExposure'

const prisma = new PrismaClient()

/** Empty for reporting purposes. `false` and `0` are real answers, not gaps. */
function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.length === 0
  return false
}

/**
 * Buyer-facing project columns, read from the exposure allowlist so this
 * cannot drift from what the chat is actually allowed to say.
 */
const PROJECT_SCALARS = Object.entries(PROJECT_PUBLIC_SELECT)
  .filter(([, v]) => v === true)
  .map(([k]) => k)
  .filter((k) => !['id', 'slug', 'created_at', 'updated_at'].includes(k))

/**
 * Builder columns a buyer can be shown. Analyst-set 0-100 scores are excluded:
 * they are manually entered and unverified, and CLAUDE.md forbids presenting
 * one as a rating.
 */
const BUILDER_FIELDS = [
  'description', 'company_overview', 'tagline', 'founded_year', 'headquarters',
  'website', 'experience_years', 'projects_delivered_count', 'total_projects_count',
  'delivered_units', 'delivered_projects', 'ongoing_projects',
  'delayed_projects_count', 'average_delay_months',
  'rera_promoter_id', 'cin', 'litigation_count',
  'awards', 'certifications', 'logo_url', 'parent_group', 'founder',
] as const

/** Relations a project needs before it is answerable, with the floor that matters. */
const RELATION_FLOORS: Array<{ key: string; min: number; label: string }> = [
  { key: 'unit_types', min: 1, label: 'unit types' },
  { key: 'amenities', min: 1, label: 'amenities' },
  { key: 'images', min: 1, label: 'images' },
  { key: 'payment_plans', min: 1, label: 'payment plans' },
  { key: 'price_history', min: 2, label: 'price history points' },
  { key: 'construction_milestones', min: 1, label: 'construction milestones' },
  { key: 'spec_items', min: 3, label: 'spec items' },
  { key: 'connectivity', min: 1, label: 'connectivity rows' },
]

function csvCell(s: unknown): string {
  const v = String(s ?? '')
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

async function main() {
  const projects = await prisma.project.findMany({
    include: {
      builder: { select: { name: true, slug: true } },
      unit_types: { select: { id: true } },
      amenities: { select: { id: true } },
      images: { select: { id: true } },
      payment_plans: { select: { id: true } },
      price_history: { select: { id: true } },
      construction_milestones: { select: { id: true } },
      spec_items: { select: { id: true } },
      connectivity: { select: { id: true } },
      cost_sheet: { select: { id: true } },
    },
    orderBy: [{ sector: 'asc' }, { name: 'asc' }],
  })

  const builders = await prisma.builder.findMany({
    include: { _count: { select: { projects: true } } },
    orderBy: { name: 'asc' },
  })

  // ---------- per-project ----------
  const fieldMisses = new Map<string, number>()
  const projectRows: string[] = ['sector,project,builder,missing_count,missing_fields,missing_relations']
  const projectGaps: Array<{ name: string; sector: string; builder: string; fields: string[]; rels: string[] }> = []

  for (const p of projects as Array<Record<string, unknown>>) {
    const fields = PROJECT_SCALARS.filter((f) => isEmpty(p[f]))
    for (const f of fields) fieldMisses.set(f, (fieldMisses.get(f) ?? 0) + 1)

    const rels: string[] = []
    for (const r of RELATION_FLOORS) {
      const n = (p[r.key] as unknown[] | undefined)?.length ?? 0
      if (n < r.min) rels.push(`${r.label} (${n}/${r.min})`)
    }
    if (!p.cost_sheet) rels.push('cost sheet (missing)')

    if (fields.length || rels.length) {
      const builderName = (p.builder as { name: string } | null)?.name ?? '—'
      projectGaps.push({ name: String(p.name), sector: String(p.sector), builder: builderName, fields, rels })
      projectRows.push([
        csvCell(p.sector), csvCell(p.name), csvCell(builderName),
        String(fields.length + rels.length),
        csvCell(fields.join(' | ')), csvCell(rels.join(' | ')),
      ].join(','))
    }
  }

  // ---------- per-builder ----------
  const builderMisses = new Map<string, number>()
  const builderRows: string[] = ['builder,projects_in_db,missing_count,missing_fields']
  const builderGaps: Array<{ name: string; projects: number; fields: string[] }> = []

  for (const b of builders as Array<Record<string, unknown>>) {
    const fields = BUILDER_FIELDS.filter((f) => isEmpty(b[f]))
    for (const f of fields) builderMisses.set(f, (builderMisses.get(f) ?? 0) + 1)
    const projectCount = (b._count as { projects: number }).projects
    if (fields.length) {
      builderGaps.push({ name: String(b.name), projects: projectCount, fields: [...fields] })
      builderRows.push([csvCell(b.name), String(projectCount), String(fields.length), csvCell(fields.join(' | '))].join(','))
    }
  }

  writeFileSync('gaps-projects.csv', projectRows.join('\n'), 'utf8')
  writeFileSync('gaps-builders.csv', builderRows.join('\n'), 'utf8')

  // ---------- summary ----------
  const pct = (n: number, total: number) => `${Math.round((n / total) * 100)}%`

  console.log('\n=== PROJECT FIELD GAPS (buyer-facing columns only) ===')
  console.log(`${projects.length} projects · ${PROJECT_SCALARS.length} public columns checked`)
  console.log(`${projectGaps.length} projects have at least one gap\n`)
  console.log('Worst columns (empty on N projects):')
  ;[...fieldMisses.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .forEach(([f, n]) => console.log(`  ${String(n).padStart(4)}  ${pct(n, projects.length).padStart(5)}  ${f}`))

  console.log('\n=== RELATION GAPS ===')
  for (const r of RELATION_FLOORS) {
    const n = (projects as Array<Record<string, unknown>>)
      .filter((p) => ((p[r.key] as unknown[] | undefined)?.length ?? 0) < r.min).length
    console.log(`  ${String(n).padStart(4)}  ${pct(n, projects.length).padStart(5)}  ${r.label} below ${r.min}`)
  }
  const noCost = (projects as Array<Record<string, unknown>>).filter((p) => !p.cost_sheet).length
  console.log(`  ${String(noCost).padStart(4)}  ${pct(noCost, projects.length).padStart(5)}  cost sheet missing`)

  console.log('\n=== BUILDER FIELD GAPS ===')
  console.log(`${builders.length} builders · ${builderGaps.length} have at least one gap\n`)
  ;[...builderMisses.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([f, n]) => console.log(`  ${String(n).padStart(4)}  ${pct(n, builders.length).padStart(5)}  ${f}`))

  console.log('\n=== BUILDERS WITH NO DESCRIPTION (highest demo risk) ===')
  builderGaps
    .filter((b) => b.fields.includes('description'))
    .sort((a, b) => b.projects - a.projects)
    .forEach((b) => console.log(`  ${String(b.projects).padStart(3)} projects  ${b.name}`))

  console.log('\nWrote gaps-projects.csv and gaps-builders.csv')
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
