#!/usr/bin/env node
/**
 * How many payment plans are templates, and how many anyone has checked.
 *
 * `npm run audit:plans`           report only
 * `npm run audit:plans -- --label` record the provenance we know
 *
 * The chat qualifies an unverified schedule (see PAYMENT_PLAN_PROVENANCE) and
 * that is the safe behaviour, not the fix. The fix is someone reading a
 * developer's actual terms and stamping `verified_at`. This prints how far from
 * that we are, and targets the work.
 *
 * `--label` writes `source = 'inferred_default'` on every plan that is part of a
 * mass-duplicated group and has no source. That is a labelling write, not a
 * claim: it records something we measured — that this row's content is shared
 * verbatim with dozens of other projects — where before there was only a null
 * that could equally have meant "researched but the field was skipped".
 *
 * It cannot silence the buyer-facing qualifier: `hasRealProvenance()` tests for
 * a source that is NOT our own defaulting, exactly so that recording the truth
 * about these rows does not read as provenance for them.
 */
import { prisma } from '../src/lib/db'

/** A plan's identity for duplicate detection: its name plus its full schedule. */
function shapeOf(plan: { plan_name: string | null; plan_type: string; milestones: unknown }): string {
  const ms = Array.isArray(plan.milestones) ? (plan.milestones as Array<Record<string, unknown>>) : []
  const detail = ms
    .map((m) => `${m.pct ?? m.percentage ?? '?'}@${m.stage ?? m.stage_name ?? '?'}`)
    .join(':')
  return `${plan.plan_name ?? plan.plan_type}||${detail}`
}

/** How many projects must share a shape before it is a template rather than a coincidence. */
const MASS_DUPLICATE_THRESHOLD = 10

async function main(): Promise<void> {
  const shouldLabel = process.argv.includes('--label')

  const plans = await prisma.paymentPlan.findMany({
    select: {
      id: true, project_id: true, plan_name: true, plan_type: true, milestones: true,
      source: true, verified_at: true, watch_out: true, best_for: true,
    },
  })

  const groups = new Map<string, string[]>()
  for (const p of plans) {
    const key = shapeOf(p)
    groups.set(key, [...(groups.get(key) ?? []), p.id])
  }

  const templates = [...groups.entries()].filter(([, ids]) => ids.length >= MASS_DUPLICATE_THRESHOLD)
  const templateIds = new Set(templates.flatMap(([, ids]) => ids))

  const verified = plans.filter((p) => p.verified_at).length
  const sourced = plans.filter((p) => p.source).length

  console.log(`${plans.length} payment plans across ${new Set(plans.map((p) => p.project_id)).size} projects`)
  console.log(`  distinct shapes (name + full schedule): ${groups.size}`)
  console.log(`  in a group of ${MASS_DUPLICATE_THRESHOLD}+ projects:   ${templateIds.size}`)
  console.log(`  verified_at set:                        ${verified}`)
  console.log(`  source set:                             ${sourced}`)
  console.log(`  watch_out set:                          ${plans.filter((p) => p.watch_out).length}`)
  console.log(`  best_for set:                           ${plans.filter((p) => p.best_for).length}`)

  console.log(`\nshapes, largest first:`)
  for (const [key, ids] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const flag = ids.length >= MASS_DUPLICATE_THRESHOLD ? 'TEMPLATE' : 'rare    '
    console.log(`  ${flag} x${String(ids.length).padStart(3)}  ${key.slice(0, 92)}`)
  }

  if (shouldLabel) {
    const toLabel = plans.filter((p) => templateIds.has(p.id) && !p.source)
    if (toLabel.length === 0) {
      console.log('\nnothing to label — every template already carries a source')
    } else {
      const result = await prisma.paymentPlan.updateMany({
        where: { id: { in: toLabel.map((p) => p.id) } },
        data: { source: 'inferred_default' },
      })
      console.log(`\nlabelled ${result.count} template plans with source = 'inferred_default'`)
      console.log("this does NOT silence the buyer-facing qualifier — hasRealProvenance() excludes it by design")
    }
  } else if (verified === 0) {
    console.log(`\nNOT ONE of these ${plans.length} plans has been checked against a developer's terms.`)
    console.log('The chat says so on every one. Stamping verified_at on a researched plan')
    console.log('removes the qualifier for that project and nothing else.')
    console.log('\nRe-run with --label to record which rows are templates.')
    process.exitCode = 1
  }
}

main().finally(() => prisma.$disconnect())
