import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function findUnmatched() {
  const p107 = await prisma.project.findMany({
    where: { OR: [{ name: { contains: '107', mode: 'insensitive' } }, { slug: { contains: '107', mode: 'insensitive' } }, { name: { contains: 'County', mode: 'insensitive' } }] },
    select: { name: true, slug: true }
  })
  console.log('107 / County projects:', p107)

  const p128 = await prisma.project.findMany({
    where: { OR: [{ name: { contains: '128', mode: 'insensitive' } }, { slug: { contains: '128', mode: 'insensitive' } }, { name: { contains: 'Estate', mode: 'insensitive' } }] },
    select: { name: true, slug: true }
  })
  console.log('128 / Estate projects:', p128)
}

findUnmatched().catch(console.error).finally(() => prisma.$disconnect())
