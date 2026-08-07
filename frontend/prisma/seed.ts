import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const godrej = await prisma.builder.upsert({
    where: { name: 'Godrej Properties' },
    update: {
      delivered_units: 15000,
      construction_quality_score: 85,
      credai_member: true,
    },
    create: {
      name: 'Godrej Properties',
      slug: 'godrej-properties',
      founded_year: 1990,
      projects_delivered_count: 50,
      delivered_units: 15000,
      construction_quality_score: 85,
      credai_member: true,
    }
  })

  const palmRetreat = await prisma.project.upsert({
    where: { slug: 'godrej-palm-retreat-noida' },
    update: {
      possession_date: new Date('2025-06-01'),
      rera_number: 'UP-RERA-PS-2021-00123',
    },
    create: {
      name: 'Godrej Palm Retreat',
      slug: 'godrej-palm-retreat-noida',
      builder_id: godrej.id,
      sector: 'Sector 150',
      status: 'ready_to_move',
      possession_date: new Date('2025-06-01'),
      launch_date: new Date('2020-06-01'),
      rera_number: 'UP-RERA-PS-2021-00123',
      city: 'Noida',
      state: 'Uttar Pradesh',
      country: 'India',
    }
  })

  // Delete old unit types and recreate
  await prisma.unitType.deleteMany({ where: { project_id: palmRetreat.id } })
  
  await prisma.unitType.create({
    data: {
      project_id: palmRetreat.id,
      name: '3 BHK',
      bhk: 3,
      price_min_cr: 1.8,
      price_max_cr: 2.2,
      carpet_area_sqft: 1650,
      super_area_sqft: 2100,
      bathrooms: 2,
      inventory_left: 45,
    }
  })

  await prisma.builder.upsert({
    where: { name: 'Amrapali Group' },
    update: {},
    create: {
      name: 'Amrapali Group',
      slug: 'amrapali-group',
      legal_flag: 'NCLAT_DEBARRED',
      litigation_count: 15,
    }
  })

  console.log('✓ Seeded complete')
}

main().catch(console.error).finally(() => prisma.$disconnect())
