import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('💰 Enriching project pricing fields from unit types...')
  const projects = await prisma.project.findMany({
    include: { unit_types: true }
  })

  let updatedCount = 0

  for (const p of projects) {
    const validMinPrices = p.unit_types.map(u => u.price_min_cr).filter((pr): pr is number => pr != null && pr > 0)
    const validMaxPrices = p.unit_types.map(u => u.price_max_cr).filter((pr): pr is number => pr != null && pr > 0)

    if (validMinPrices.length > 0) {
      const minPrice = Math.min(...validMinPrices)
      const maxPrice = validMaxPrices.length > 0 ? Math.max(...validMaxPrices) : minPrice

      let label = ''
      if (minPrice === maxPrice) {
        label = `₹${minPrice} Cr`
      } else {
        label = `₹${minPrice} Cr - ₹${maxPrice} Cr`
      }

      console.log(`  → ${p.name}: Setting price_min_cr = ${minPrice}, price_range_label = "${label}"`)
      await prisma.project.update({
        where: { id: p.id },
        data: {
          price_min_cr: minPrice,
          price_range_label: label
        }
      })
      updatedCount++
    }
  }

  console.log(`\n✓ Successfully enriched pricing for ${updatedCount} projects.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
