import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const projects = await prisma.project.findMany({
    where: { hero_image_url: '/placeholder.png' },
    select: { name: true, sector: true, slug: true },
    orderBy: { sector: 'asc' }
  })

  console.log(`\n📷 Properties Currently Using Placeholder Image (${projects.length} total):\n`)
  projects.forEach((p, i) => {
    console.log(`${(i + 1).toString().padStart(2, ' ')}. ${p.name.padEnd(32)} | Sector: ${p.sector.padEnd(12)} | Folder: public/images/properties/${p.slug}/`)
  })
}

main().finally(() => prisma.$disconnect())
