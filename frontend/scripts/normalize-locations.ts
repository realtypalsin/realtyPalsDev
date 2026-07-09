/**
 * One-off migration script: normalize sector/city across all projects.
 *
 * Usage:
 *   DRY_RUN=true npx ts-node scripts/normalize-locations.ts  (preview changes)
 *   npx ts-node scripts/normalize-locations.ts               (apply changes)
 */

import { PrismaClient } from '@prisma/client'
import { canonicalSector, canonicalCity, isCanonical } from '../backend/src/lib/discovery/normalize'

const prisma = new PrismaClient()
const DRY_RUN = process.env.DRY_RUN === 'true'

interface Change {
  projectId: string
  projectName: string
  before: { sector: string | null; city: string | null }
  after: { sector: string | null; city: string | null }
}

async function main() {
  console.log(`\n🔄 Normalizing project locations (DRY_RUN=${DRY_RUN})...\n`)

  const projects = await prisma.project.findMany({
    select: { id: true, name: true, sector: true, city: true },
  })

  const changes: Change[] = []
  let alreadyCanonical = 0

  for (const project of projects) {
    const canonical = isCanonical(project.sector, project.city)
    if (canonical) {
      alreadyCanonical++
      continue
    }

    const newSector = canonicalSector(project.sector)
    const newCity = canonicalCity(project.city)

    // Skip if normalization failed (data issue — log separately)
    if (newSector === null || newCity === null) {
      console.warn(
        `⚠️  Cannot normalize ${project.name}: sector="${project.sector}" city="${project.city}"`
      )
      continue
    }

    changes.push({
      projectId: project.id,
      projectName: project.name,
      before: { sector: project.sector, city: project.city },
      after: { sector: newSector, city: newCity },
    })
  }

  // Report
  console.log(`✓ Already canonical: ${alreadyCanonical}`)
  console.log(`📝 Changes required: ${changes.length}`)

  if (changes.length === 0) {
    console.log('\n✅ No changes needed.\n')
    await prisma.$disconnect()
    return
  }

  console.log('\nChanges:')
  changes.forEach((c) => {
    console.log(
      `  ${c.projectName}: "${c.before.sector}" → "${c.after.sector}", "${c.before.city}" → "${c.after.city}"`
    )
  })

  if (DRY_RUN) {
    console.log(`\n📋 DRY_RUN enabled. Review above changes, then run without DRY_RUN=true to apply.\n`)
    await prisma.$disconnect()
    return
  }

  // Apply changes
  console.log(`\n⚙️  Applying ${changes.length} changes...\n`)
  let success = 0
  for (const change of changes) {
    try {
      await prisma.project.update({
        where: { id: change.projectId },
        data: { sector: change.after.sector, city: change.after.city },
      })
      success++
    } catch (err) {
      console.error(`❌ Failed to update ${change.projectName}:`, err)
    }
  }

  console.log(`\n✅ Updated ${success}/${changes.length} projects.\n`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Script error:', err)
  process.exit(1)
})
