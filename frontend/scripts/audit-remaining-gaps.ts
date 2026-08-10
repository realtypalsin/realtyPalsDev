import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n══════════════════════════════════════════════════════════════════════')
  console.log('  COMPREHENSIVE REMAINING GAPS AUDIT')
  console.log('══════════════════════════════════════════════════════════════════════\n')

  const projects = await prisma.project.findMany({
    include: {
      unit_types: true,
      cost_sheet: true,
      payment_plans: true,
      construction_milestones: true,
      construction_updates: true,
      lifecycle_updates: true,
      channel_partners: true,
      dna: true,
      decision_profile: true,
      persona_profile: true,
      recommendation_profile: true,
      competitors: true,
      price_history: true,
      connectivity: true,
      amenities: true,
      images: true,
      unit_inventory: true,
    }
  })

  // ═══════════════════════════════════════════════
  // 1. CORE PROJECT FIELDS
  // ═══════════════════════════════════════════════
  console.log('┌─────────────────────────────────────────────────────────────────┐')
  console.log('│ SECTION 1: CORE PROJECT FIELDS                                │')
  console.log('└─────────────────────────────────────────────────────────────────┘')

  const coreFieldChecks = [
    { field: 'has_duplex/has_penthouse', check: (p: any) => p.has_duplex !== null },
    { field: 'project_type', check: (p: any) => !!p.project_type },
    { field: 'possession_confidence', check: (p: any) => !!p.possession_confidence },
    { field: 'oc_obtained', check: (p: any) => p.oc_obtained !== null },
    { field: 'rera_valid_until', check: (p: any) => !!p.rera_valid_until },
    { field: 'rera_compliance_score', check: (p: any) => p.rera_compliance_score !== null },
    { field: 'legal_flag', check: (p: any) => !!p.legal_flag },
    { field: 'location_advantages (JSON)', check: (p: any) => !!p.location_advantages },
    { field: 'location_verdict', check: (p: any) => !!p.location_verdict },
    { field: 'walkability_score', check: (p: any) => p.walkability_score !== null },
    { field: 'commute_matrix (JSON)', check: (p: any) => !!p.commute_matrix },
    { field: 'price_includes_plc/club/taxes', check: (p: any) => p.price_includes_plc !== null || p.price_includes_club !== null },
    { field: 'price_range_label', check: (p: any) => !!p.price_range_label },
    { field: 'project_risk_flag', check: (p: any) => !!p.project_risk_flag },
    { field: 'escrow_verified', check: (p: any) => p.escrow_verified !== null },
    { field: 'registry_status', check: (p: any) => !!p.registry_status },
    // Phase 5 fields
    { field: 'nri_eligible', check: (p: any) => p.nri_eligible !== null },
    { field: 'vastu_compliant', check: (p: any) => p.vastu_compliant !== null },
    { field: 'women_safety_score', check: (p: any) => p.women_safety_score !== null },
    { field: 'market_demand_score', check: (p: any) => p.market_demand_score !== null },
    { field: 'approvals_status', check: (p: any) => !!p.approvals_status },
  ]

  for (const c of coreFieldChecks) {
    const filled = projects.filter(c.check).length
    const missing = projects.length - filled
    const status = missing === 0 ? '✅' : missing <= 5 ? '⚠️' : '❌'
    console.log(`  ${status} ${c.field}: ${filled}/${projects.length} filled (${missing} missing)`)
  }

  // ═══════════════════════════════════════════════
  // 2. UNIT TYPE DEEP FIELDS
  // ═══════════════════════════════════════════════
  console.log('\n┌─────────────────────────────────────────────────────────────────┐')
  console.log('│ SECTION 2: UNIT TYPE DEEP FIELDS                              │')
  console.log('└─────────────────────────────────────────────────────────────────┘')

  const allUnits = projects.flatMap(p => p.unit_types)
  const unitFieldChecks = [
    { field: 'carpet_to_super_ratio_pct', check: (u: any) => u.carpet_to_super_ratio_pct !== null },
    { field: 'balcony_area_sqft', check: (u: any) => u.balcony_area_sqft !== null },
    { field: 'unit_orientations[]', check: (u: any) => u.unit_orientations && u.unit_orientations.length > 0 },
    { field: 'perfect_for[]', check: (u: any) => u.perfect_for && u.perfect_for.length > 0 },
    { field: 'key_highlights (JSON)', check: (u: any) => !!u.key_highlights },
    { field: 'layout_shape', check: (u: any) => !!u.layout_shape },
    { field: 'layout_efficiency_pct', check: (u: any) => u.layout_efficiency_pct !== null },
    { field: 'built_up_area_sqft', check: (u: any) => u.built_up_area_sqft !== null },
    { field: 'inventory_left', check: (u: any) => u.inventory_left !== null },
  ]

  for (const c of unitFieldChecks) {
    const filled = allUnits.filter(c.check).length
    const missing = allUnits.length - filled
    const status = missing === 0 ? '✅' : missing <= 10 ? '⚠️' : '❌'
    console.log(`  ${status} ${c.field}: ${filled}/${allUnits.length} units filled (${missing} missing)`)
  }

  // ═══════════════════════════════════════════════
  // 3. COST SHEET DEEP FIELDS
  // ═══════════════════════════════════════════════
  console.log('\n┌─────────────────────────────────────────────────────────────────┐')
  console.log('│ SECTION 3: COST SHEET DEEP FIELDS                             │')
  console.log('└─────────────────────────────────────────────────────────────────┘')

  const costSheets = projects.map(p => p.cost_sheet).filter(Boolean)
  const csChecks = [
    { field: 'base_price_per_sqft', check: (cs: any) => cs.base_price_per_sqft !== null },
    { field: 'floor_rise_per_floor', check: (cs: any) => cs.floor_rise_per_floor !== null },
    { field: 'electricity_connection', check: (cs: any) => cs.electricity_connection !== null },
    { field: 'water_sewer_connection', check: (cs: any) => cs.water_sewer_connection !== null },
    { field: 'maintenance_psf_monthly', check: (cs: any) => cs.maintenance_psf_monthly !== null },
    { field: 'all_inclusive_price_cr', check: (cs: any) => cs.all_inclusive_price_cr !== null },
    { field: 'gst_note', check: (cs: any) => !!cs.gst_note },
    { field: 'assumptions[]', check: (cs: any) => cs.assumptions && cs.assumptions.length > 0 },
    { field: 'verified_at', check: (cs: any) => cs.verified_at !== null },
  ]

  for (const c of csChecks) {
    const filled = costSheets.filter(c.check).length
    const missing = costSheets.length - filled
    const status = missing === 0 ? '✅' : '❌'
    console.log(`  ${status} ${c.field}: ${filled}/${costSheets.length} filled (${missing} missing)`)
  }

  // ═══════════════════════════════════════════════
  // 4. PAYMENT PLAN COMPLETENESS
  // ═══════════════════════════════════════════════
  console.log('\n┌─────────────────────────────────────────────────────────────────┐')
  console.log('│ SECTION 4: PAYMENT PLAN TYPES COVERAGE                        │')
  console.log('└─────────────────────────────────────────────────────────────────┘')

  const planTypes = ['construction_linked', 'flexi', 'down_payment', 'investor', 'possession_linked', 'subvention', 'nri', 'easy_payment']
  for (const pt of planTypes) {
    const count = projects.filter(p => p.payment_plans.some(pp => pp.plan_type === pt)).length
    const status = count === projects.length ? '✅' : count > 0 ? '⚠️' : '❌'
    console.log(`  ${status} ${pt}: ${count}/${projects.length} projects have this plan`)
  }

  // ═══════════════════════════════════════════════
  // 5. LIFECYCLE UPDATES (POST-DELIVERY)
  // ═══════════════════════════════════════════════
  console.log('\n┌─────────────────────────────────────────────────────────────────┐')
  console.log('│ SECTION 5: POST-DELIVERY LIFECYCLE UPDATES                    │')
  console.log('└─────────────────────────────────────────────────────────────────┘')

  const readyProjects = projects.filter(p => p.status === 'ready_to_move')
  const readyWithLifecycle = readyProjects.filter(p => p.lifecycle_updates.length > 0)
  console.log(`  Ready-to-Move Projects: ${readyProjects.length}`)
  console.log(`  With Lifecycle Updates:  ${readyWithLifecycle.length}`)
  console.log(`  ${readyWithLifecycle.length === readyProjects.length ? '✅' : '❌'} Missing Lifecycle Updates: ${readyProjects.length - readyWithLifecycle.length}`)

  // ═══════════════════════════════════════════════
  // 6. UNIT INVENTORY
  // ═══════════════════════════════════════════════
  console.log('\n┌─────────────────────────────────────────────────────────────────┐')
  console.log('│ SECTION 6: UNIT INVENTORY                                     │')
  console.log('└─────────────────────────────────────────────────────────────────┘')

  const withInventory = projects.filter(p => p.unit_inventory.length > 0)
  console.log(`  ${withInventory.length === projects.length ? '✅' : '❌'} Projects with Unit Inventory: ${withInventory.length}/${projects.length}`)

  // ═══════════════════════════════════════════════
  // 7. SECTOR INTELLIGENCE
  // ═══════════════════════════════════════════════
  console.log('\n┌─────────────────────────────────────────────────────────────────┐')
  console.log('│ SECTION 7: SECTOR INTELLIGENCE                                │')
  console.log('└─────────────────────────────────────────────────────────────────┘')

  const sectorRecords = await prisma.sectorIntelligence.findMany()
  console.log(`  ${sectorRecords.length >= 7 ? '✅' : '❌'} Sector Intelligence Records: ${sectorRecords.length}`)

  // ═══════════════════════════════════════════════
  // 8. PRICE HISTORY
  // ═══════════════════════════════════════════════
  console.log('\n┌─────────────────────────────────────────────────────────────────┐')
  console.log('│ SECTION 8: PRICE HISTORY                                      │')
  console.log('└─────────────────────────────────────────────────────────────────┘')

  const withPH = projects.filter(p => p.price_history.length > 0)
  const totalPH = projects.reduce((sum, p) => sum + p.price_history.length, 0)
  console.log(`  ${withPH.length === projects.length ? '✅' : '❌'} Projects with Price History: ${withPH.length}/${projects.length} (${totalPH} total records)`)

  // ═══════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════════════════════════════')
  console.log('  SUMMARY: WHAT REMAINS')
  console.log('══════════════════════════════════════════════════════════════════════')

  const gaps: string[] = []

  // Core fields not populated
  for (const c of coreFieldChecks) {
    const missing = projects.length - projects.filter(c.check).length
    if (missing > 0) gaps.push(`Core: ${c.field} (${missing} projects)`)
  }

  // Unit fields
  for (const c of unitFieldChecks) {
    const missing = allUnits.length - allUnits.filter(c.check).length
    if (missing > 0) gaps.push(`Units: ${c.field} (${missing} units)`)
  }

  // CostSheet
  for (const c of csChecks) {
    const missing = costSheets.length - costSheets.filter(c.check).length
    if (missing > 0) gaps.push(`CostSheet: ${c.field} (${missing} sheets)`)
  }

  // Lifecycle
  const lifecycleMissing = readyProjects.length - readyWithLifecycle.length
  if (lifecycleMissing > 0) gaps.push(`Lifecycle Updates: ${lifecycleMissing} ready-to-move projects`)

  // Inventory
  if (withInventory.length < projects.length) gaps.push(`Unit Inventory: ${projects.length - withInventory.length} projects`)

  if (gaps.length === 0) {
    console.log('  🎉 ZERO REMAINING GAPS! All fields populated.\n')
  } else {
    console.log(`  ⚠️  ${gaps.length} REMAINING GAPS:\n`)
    gaps.forEach((g, i) => console.log(`    ${i + 1}. ${g}`))
    console.log()
  }
}

main().finally(() => prisma.$disconnect())
