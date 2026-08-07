import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const builders = await prisma.builder.findMany({
    include: { _count: { select: { projects: true } } },
    orderBy: { name: 'asc' }
  })

  console.log(`Total Builders in DB: ${builders.length}\n`)
  builders.forEach(b => console.log(`  - [${b.id}] "${b.name}" | slug: ${b.slug} | projects: ${b._count.projects}`))
}

main().finally(() => prisma.$disconnect())
