import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n🧹 De-duplicating Builder Records in DB...\n')

  // 1. Gardenia Group: merge "Aims Max Gardenia Developers Pvt. Ltd." into "AIMS Max Gardenia Developers"
  const gardeniaMain = await prisma.builder.findFirst({ where: { slug: 'gardenia-group' } })
  const gardeniaDup = await prisma.builder.findFirst({ where: { slug: 'aims-max-gardenia-developers' } })

  if (gardeniaMain && gardeniaDup && gardeniaMain.id !== gardeniaDup.id) {
    console.log(`Merging Builder "${gardeniaDup.name}" -> "${gardeniaMain.name}"...`)
    await prisma.project.updateMany({
      where: { builder_id: gardeniaDup.id },
      data: { builder_id: gardeniaMain.id }
    })
    await prisma.builder.delete({ where: { id: gardeniaDup.id } })
    console.log('✓ Merged Gardenia Group')
  }

  // 2. Maxblis Group: merge "Maxblis Construction Private Limited" into "Maxblis Construction"
  const maxblisMain = await prisma.builder.findFirst({ where: { slug: 'maxblis-group' } })
  const maxblisDup = await prisma.builder.findFirst({ where: { slug: 'maxblis-construction' } })

  if (maxblisMain && maxblisDup && maxblisMain.id !== maxblisDup.id) {
    console.log(`Merging Builder "${maxblisDup.name}" -> "${maxblisMain.name}"...`)
    await prisma.project.updateMany({
      where: { builder_id: maxblisDup.id },
      data: { builder_id: maxblisMain.id }
    })
    await prisma.builder.delete({ where: { id: maxblisDup.id } })
    console.log('✓ Merged Maxblis Group')
  }

  // 3. Delete unused 0-project builder stubs
  const unusedBuilders = await prisma.builder.findMany({
    where: { projects: { none: {} } }
  })

  for (const b of unusedBuilders) {
    await prisma.builder.delete({ where: { id: b.id } }).catch(() => {})
    console.log(`✓ Removed unused builder stub: "${b.name}" (${b.slug})`)
  }

  const countAfter = await prisma.builder.count()
  console.log(`\n✅ Builder de-duplication complete! Total active builders remaining: ${countAfter}\n`)
}

main().finally(() => prisma.$disconnect())
