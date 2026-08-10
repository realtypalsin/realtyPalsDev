import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n🔍 Auditing Prisma CostSheets fields across all Database Projects...\n')

  const costSheets = await prisma.costSheet.findMany({
    include: { project: { select: { name: true, sector: true } } }
  })

  let missingBsp = 0
  let missingUtilities = 0
  let missingPlc = 0
  let missingOther = 0
  let missingAssumptions = 0

  for (const cs of costSheets) {
    if (!cs.base_price_per_sqft) missingBsp++
    if (!cs.electricity_connection || !cs.water_sewer_connection || !cs.maintenance_psf_monthly) missingUtilities++
    if (!cs.plc_charges || (cs.plc_charges as any[]).length === 0) missingPlc++
    if (!cs.other_charges || (cs.other_charges as any[]).length === 0) missingOther++
    if (!cs.assumptions || cs.assumptions.length === 0) missingAssumptions++
  }

  console.log('════════════════════════════════════════════════════════════════════')
  console.log('  PRISMA COST SHEET FIELD AUDIT REPORT')
  console.log('════════════════════════════════════════════════════════════════════')
  console.log(`  Total CostSheets:                     ${costSheets.length}`)
  console.log(`  Missing Base Price per Sqft (BSP):     ${missingBsp} projects`)
  console.log(`  Missing Utilities (Electricity/Water): ${missingUtilities} projects`)
  console.log(`  Missing PLC Charges (JSON):            ${missingPlc} projects`)
  console.log(`  Missing Other One-Time Charges (JSON): ${missingOther} projects`)
  console.log(`  Missing Cost Assumptions:              ${missingAssumptions} projects`)
  console.log('════════════════════════════════════════════════════════════════════\n')
}

main().finally(() => prisma.$disconnect())
