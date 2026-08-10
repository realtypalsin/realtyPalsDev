import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const GLOBAL_VARIANT_CODES = ['Type A', 'Type B', 'Type C', 'Type D', 'Type E', 'Type F', 'Type G', 'Type H', 'Type I', 'Type J']
const TOWER_NAMES = ['Tower A', 'Tower B', 'Tower C', 'Tower D', 'Tower E', 'Tower F', 'Tower G', 'Tower H']

async function main() {
  console.log('\n🏷️  Seeding Globally Unique Layout Variant Codes (Type A, B, C, D...) & Distinct Towers across all projects...\n')

  const projects = await prisma.project.findMany({
    include: {
      unit_types: { orderBy: [{ bhk: 'asc' }, { super_area_sqft: 'asc' }] }
    }
  })

  let totalUnitsUpdated = 0

  for (const p of projects) {
    const totalTowers = p.total_towers || 4

    // Assign globally unique variant code across ALL unit types of this project
    for (let globalIdx = 0; globalIdx < p.unit_types.length; globalIdx++) {
      const u = p.unit_types[globalIdx]
      const variantCode = GLOBAL_VARIANT_CODES[globalIdx % GLOBAL_VARIANT_CODES.length]
      const areaSuffix = u.super_area_sqft ? ` (${u.super_area_sqft} sqft)` : ''
      const variantName = `${variantCode}${areaSuffix}`

      // Assign distinct towers based on BHK & unit layout index
      const assignedTowers: string[] = []
      if (totalTowers <= 2) {
        assignedTowers.push('Tower A', 'Tower B')
      } else {
        const t1 = TOWER_NAMES[globalIdx % totalTowers] || `Tower ${globalIdx + 1}`
        const t2 = TOWER_NAMES[(globalIdx + 1) % totalTowers] || `Tower ${globalIdx + 2}`
        assignedTowers.push(t1, t2)
      }

      await prisma.unitType.update({
        where: { id: u.id },
        data: {
          layout_variant_name: variantName,
          tower_association: assignedTowers,
          towers: assignedTowers
        }
      })
      totalUnitsUpdated++
    }
  }

  console.log(`✅ Globally unique variant codes (Type A, B, C, D...) seeded for all ${totalUnitsUpdated} units across ${projects.length} projects.`)
}

main().finally(() => prisma.$disconnect())
