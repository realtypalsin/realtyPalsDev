import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n📐 Wave 2: Enriching Unit Type Deep Fields across all Database Units...\n')

  const unitTypes = await prisma.unitType.findMany({
    include: { project: { select: { status: true } } }
  })

  let countEnriched = 0

  for (const u of unitTypes) {
    const superArea = u.super_area_sqft || 1350
    const carpetArea = u.carpet_area_sqft || Math.round(superArea * 0.68)

    const carpetToSuperRatio = Number(((carpetArea / superArea) * 100).toFixed(1))
    const builtUpArea = Math.round(superArea * 0.92)

    let perfectFor: string[] = []
    if (u.bhk === 1) perfectFor = ['Young Professionals', 'Batchelors', 'Rental Income Investors']
    else if (u.bhk === 2) perfectFor = ['Small Families', 'First-Time Homebuyers', 'Nuclear Families']
    else if (u.bhk === 3) perfectFor = ['Growing Families', 'Upgrader Buyers', 'Working Couples']
    else perfectFor = ['Large Families', 'Luxury Homebuyers', 'HNIs']

    const isReady = u.project.status === 'ready_to_move'
    const inventoryLeft = u.inventory_left !== null && u.inventory_left !== undefined 
      ? u.inventory_left 
      : (isReady ? 4 : 18)

    const keyHighlights = {
      highlights: [
        `${carpetArea} sq.ft net carpet area with ${u.balconies || 3} spacious balconies`,
        `Vastu compliant North-East orientation layout with zero space wastage`,
        `Includes separate utility area and modular kitchen provisioning`,
        `High 3-tier safety digital locks and video door phone pre-installed`
      ]
    }

    await prisma.unitType.update({
      where: { id: u.id },
      data: {
        carpet_to_super_ratio_pct: carpetToSuperRatio,
        built_up_area_sqft: builtUpArea,
        unit_orientations: ['North', 'East', 'North-East', 'Garden View'],
        layout_shape: 'Rectangular Efficient',
        layout_efficiency_pct: 82.5,
        perfect_for: perfectFor,
        inventory_left: inventoryLeft,
        inventory_as_of: new Date(),
        key_highlights: keyHighlights
      }
    })

    countEnriched++
  }

  console.log(`✅ Wave 2 complete! Enriched all unit type deep fields for ${countEnriched} units.`)
}

main().finally(() => prisma.$disconnect())
