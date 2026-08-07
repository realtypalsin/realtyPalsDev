import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const masterSlugs = [
    'crc-maesta-sector-10',
    'eldeco-ballads-of-bliss-sector-10',
    'ats-homekraft-happy-trails-sector-10',
    'mahagun-manorialle-sector-10',
    'ace-hanei-sector-12',
    'gardenia-gateway-sector-75',
    'lotus-arena-sector-79',
    'hilston-by-urbtech-sector-79',
    'sethi-max-royal-sector-76'
  ]

  console.log('\nChecking Master Slugs in DB:')
  for (const slug of masterSlugs) {
    const p = await prisma.project.findUnique({
      where: { slug },
      include: { _count: { select: { unit_types: true } } }
    })
    if (p) {
      console.log(`  ✓ ${slug} -> Name: "${p.name}", UnitTypes: ${p._count.unit_types}`)
    } else {
      console.log(`  ❌ ${slug} -> NOT FOUND`)
    }
  }
}

main().finally(() => prisma.$disconnect())
