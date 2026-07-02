/**
 * Diagnostic script — "Best project under 3 Cr in Sector 150"
 *
 * Run: node --require tsx/cjs src/lib/discovery/__tests__/sector150-debug.ts
 * (from backend/ directory with .env loaded)
 *
 * Simulates the full pipeline with a fixed known-good intent so we can
 * isolate whether the issue is in intent extraction or discovery/scoring.
 */

import 'dotenv/config'
import { discoverProjects } from '../projects'
import { getIntentState } from '../intent'
import { SCORE_THRESHOLD, MAX_RESULTS, BUDGET_TOLERANCE_MAX } from '../constants'
import { scoreProject, computeBudgetStatus } from '../scoring'
import { prisma } from '../../db'

const QUERY = 'Best project under 3 Cr in Sector 150'

// ── Fixed intent — what an ideal extractor should produce ──────────────────
const IDEAL_INTENT = {
  budgetMax: 3,
  sector: 'Sector 150',
}

// ── Intent that a bad extractor might produce ──────────────────────────────
const BAD_INTENT_1 = {
  projectNames: ['Best project'],
  budgetMax: 3,
  sector: 'Sector 150',
}

const BAD_INTENT_2 = {
  projectNames: ['Best project under 3 Cr in Sector 150'],
}

async function main() {
  console.log('='.repeat(70))
  console.log(`DIAGNOSTIC: "${QUERY}"`)
  console.log('='.repeat(70))
  console.log()
  console.log(`SCORE_THRESHOLD = ${SCORE_THRESHOLD}`)
  console.log(`MAX_RESULTS = ${MAX_RESULTS}`)
  console.log(`BUDGET_TOLERANCE_MAX = ${BUDGET_TOLERANCE_MAX}`)
  console.log()

  // ── Step 1: verify all Sector 150 projects in DB ──────────────────────────
  console.log('── STEP 1: All Sector 150 projects in DB ─────────────────────')
  const allSector150 = await prisma.project.findMany({
    where: { sector: { contains: 'Sector 150', mode: 'insensitive' } },
    include: {
      unit_types: true,
      builder: { select: { name: true, credai_member: true, delivered_units: true, awards_count: true } },
      amenities: { take: 5 },
    },
    orderBy: { name: 'asc' },
  })

  console.log(`Total Sector 150 projects in DB: ${allSector150.length}`)
  for (const p of allSector150) {
    const prices = p.unit_types.filter(u => u.price_min_cr != null).map(u => u.price_min_cr!)
    const minPrice = prices.length ? Math.min(...prices) : null
    const budgetStatus = computeBudgetStatus(p.unit_types, IDEAL_INTENT)
    const score = scoreProject(
      {
        unit_types: p.unit_types,
        possession_date: p.possession_date,
        amenities: p.amenities,
        ai_search_keywords: p.ai_search_keywords,
        builder: p.builder,
        hero_image_url: p.hero_image_url,
        rera_number: p.rera_number,
      },
      IDEAL_INTENT,
      budgetStatus
    )

    const inBudgetFilter = minPrice != null && minPrice <= IDEAL_INTENT.budgetMax * BUDGET_TOLERANCE_MAX
    const passesThreshold = score >= SCORE_THRESHOLD

    console.log(`  ${p.name}`)
    console.log(`    price_min_cr: ${minPrice ?? 'NULL'}  budgetFilter (≤${(IDEAL_INTENT.budgetMax * BUDGET_TOLERANCE_MAX).toFixed(2)}Cr): ${inBudgetFilter ? '✓' : '✗'}`)
    console.log(`    budgetStatus: ${budgetStatus}`)
    console.log(`    score: ${score} (threshold: ${SCORE_THRESHOLD}) → ${passesThreshold ? '✓ PASS' : '✗ DROP'}`)
    console.log(`    builder: credai=${p.builder.credai_member} delivered=${p.builder.delivered_units} awards=${p.builder.awards_count}`)
    console.log(`    hero_image: ${!!p.hero_image_url} rera: ${!!p.rera_number}`)
  }
  console.log()

  // ── Step 2: DB hard filter — price_min_cr ≤ 3.3 ──────────────────────────
  console.log('── STEP 2: DB hard filter pass (price_min_cr ≤ 3.3) ─────────')
  const budgetPassed = allSector150.filter(p => {
    const prices = p.unit_types.filter(u => u.price_min_cr != null).map(u => u.price_min_cr!)
    if (!prices.length) return false
    return Math.min(...prices) <= IDEAL_INTENT.budgetMax * BUDGET_TOLERANCE_MAX
  })
  console.log(`${budgetPassed.length} / ${allSector150.length} pass budget hard filter`)
  console.log()

  // ── Step 3: Ideal intent → discoverProjects ───────────────────────────────
  console.log('── STEP 3: discoverProjects(IDEAL_INTENT) ────────────────────')
  console.log('Intent:', JSON.stringify(IDEAL_INTENT))
  console.log('IntentState:', getIntentState(IDEAL_INTENT))
  const idealResult = await discoverProjects(IDEAL_INTENT)
  console.log(`exactResults: ${idealResult.exactResults.length}`)
  idealResult.exactResults.forEach((p, i) => {
    console.log(`  [${i + 1}] ${p.name} — score: ${p.matchScore} — ${p.matchReason}`)
  })
  console.log(`nearbyResults: ${idealResult.nearbyResults.length}`)
  console.log()

  // ── Step 4: Bad intent #1 → projectNames populated ───────────────────────
  console.log('── STEP 4: discoverProjects(BAD_INTENT_1) — projectNames set ─')
  console.log('Intent:', JSON.stringify(BAD_INTENT_1))
  console.log('IntentState:', getIntentState(BAD_INTENT_1))
  const bad1Result = await discoverProjects(BAD_INTENT_1 as any)
  console.log(`exactResults: ${bad1Result.exactResults.length} (Branch 1 triggered)`)
  console.log(`notFoundNames: ${JSON.stringify(bad1Result.notFoundNames ?? [])}`)
  console.log()

  // ── Step 5: Bad intent #2 → full phrase in projectNames ──────────────────
  console.log('── STEP 5: discoverProjects(BAD_INTENT_2) — full phrase ──────')
  console.log('Intent:', JSON.stringify(BAD_INTENT_2))
  const bad2Result = await discoverProjects(BAD_INTENT_2 as any)
  console.log(`exactResults: ${bad2Result.exactResults.length} (Branch 1 triggered)`)
  console.log(`notFoundNames: ${JSON.stringify(bad2Result.notFoundNames ?? [])}`)

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
