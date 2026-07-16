import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const eliteX = await prisma.project.findFirst({
    where: {
      slug: 'elite-x-sector-10-greater-noida-west'
    },
    include: {
      decision_profile: true
    }
  })
  console.log('Elite X intelligence_data:', JSON.stringify(eliteX?.decision_profile?.intelligence_data, null, 2))
}

main().finally(() => prisma.$disconnect())
