// backend/src/scripts/verifyDbLivingSpecs.ts
import { prisma } from '../lib/db'

async function verify() {
  const total = await prisma.project.count()
  const enriched = await (prisma.project as any).count({
    where: { water_source: { not: null } }
  })

  console.log(`Total projects in database: ${total}`)
  console.log(`Projects with enriched living specs: ${enriched}`)

  const samples = await (prisma.project as any).findMany({
    take: 3,
    select: {
      id: true,
      name: true,
      sector: true,
      water_source: true,
      dg_power_rate_per_unit: true,
      maintenance_per_sqft_monthly: true,
      ceiling_height_ft: true,
      lifts_per_tower: true,
      shared_walls_type: true,
      has_png_gas_pipeline: true,
      land_tenure: true,
      pet_friendly: true,
      bachelor_tenants_allowed: true,
    }
  })

  console.log('Sample enriched projects from live database:')
  console.log(JSON.stringify(samples, null, 2))

  await prisma.$disconnect()
}

verify().catch(e => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
