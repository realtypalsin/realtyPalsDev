import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const godrej = await prisma.builder.upsert({
    where: { name: 'Godrej Properties' },
    update: {},
    create: {
      name: 'Godrej Properties',
      slug: 'godrej-properties',
      founded_year: 1990,
      projects_delivered_count: 50,
      credai_member: true,
    }
  })

  await prisma.project.upsert({
    where: { slug: 'godrej-palm-retreat-noida' },
    update: {},
    create: {
      name: 'Godrej Palm Retreat',
      slug: 'godrej-palm-retreat-noida',
      builder_id: godrej.id,
      sector: 'Sector 150',
      status: 'ready_to_move',
    }
  })

  await prisma.builder.upsert({
    where: { name: 'Amrapali Group' },
    update: {},
    create: {
      name: 'Amrapali Group',
      slug: 'amrapali-group',
      legal_flag: 'NCLAT_DEBARRED',
    }
  })

  console.log('✓ Seed complete')
}

main().catch(console.error).finally(() => prisma.$disconnect())
