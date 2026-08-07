import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/sector\s*\d+/gi, '')
    .replace(/noida/gi, '')
    .replace(/greater/gi, '')
    .replace(/west/gi, '')
    .replace(/phase\s*\d+/gi, '')
    .replace(/builder/gi, '')
    .replace(/group/gi, '')
    .replace(/ltd/gi, '')
    .replace(/pvt/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

async function cleanDuplicates() {
  console.log('\n🧹 Finding and Cleaning Duplicate Projects in Database...\n')

  const projects = await prisma.project.findMany({
    include: {
      builder: true,
      unit_types: true,
      images: true,
      amenities: true,
      connectivity: true,
      dna: true,
      decision_profile: true,
      persona_profile: true,
      recommendation_profile: true,
      cost_sheet: true,
    },
    orderBy: { created_at: 'asc' }
  })

  console.log(`Loaded ${projects.length} total projects from DB.`)

  // Group by normalized name
  const groups = new Map<string, typeof projects>()

  for (const p of projects) {
    const key = normalizeName(p.name)
    if (!key) continue
    const list = groups.get(key) || []
    list.push(p)
    groups.set(key, list)
  }

  let deletedCount = 0
  let mergedCount = 0

  for (const [key, list] of groups.entries()) {
    if (list.length <= 1) continue

    console.log(`\n🔍 Found ${list.length} duplicates for "${key}":`)

    // Score each project to pick the winner
    const scored = list.map(p => {
      let score = 0
      if (p.hero_image_url && p.hero_image_url.trim() !== '') score += 30
      score += (p.unit_types?.length || 0) * 15
      score += (p.images?.length || 0) * 10
      score += (p.amenities?.length || 0) * 2
      score += (p.connectivity?.length || 0) * 2
      if (p.dna) score += 10
      if (p.decision_profile) score += 10
      if (p.persona_profile) score += 10
      if (p.recommendation_profile) score += 10
      if (p.cost_sheet) score += 10
      if (p.rera_number) score += 5
      return { project: p, score }
    })

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score)

    const keeper = scored[0].project
    const duplicates = scored.slice(1).map(s => s.project)

    console.log(`  🏆 KEEPING: "${keeper.name}" (ID: ${keeper.id}, Slug: ${keeper.slug}, Score: ${scored[0].score})`)

    for (const dup of duplicates) {
      console.log(`  ❌ DELETING DUPLICATE: "${dup.name}" (ID: ${dup.id}, Slug: ${dup.slug}, Score: ${scored.find(s => s.project.id === dup.id)?.score})`)

      // Transfer hero image if keeper is missing hero image but duplicate has one
      if ((!keeper.hero_image_url || keeper.hero_image_url === '') && dup.hero_image_url && dup.hero_image_url !== '') {
        await prisma.project.update({
          where: { id: keeper.id },
          data: { hero_image_url: dup.hero_image_url }
        })
        console.log(`     → Transferred hero image to keeper`)
      }

      // Delete child relations before deleting duplicate project
      await prisma.unitType.deleteMany({ where: { project_id: dup.id } })
      await prisma.projectImage.deleteMany({ where: { project_id: dup.id } })
      await prisma.amenity.deleteMany({ where: { project_id: dup.id } })
      await prisma.connectivity.deleteMany({ where: { project_id: dup.id } })
      await prisma.projectDna.deleteMany({ where: { project_id: dup.id } }).catch(() => {})
      await prisma.decisionProfile.deleteMany({ where: { project_id: dup.id } }).catch(() => {})
      await prisma.personaProfile.deleteMany({ where: { project_id: dup.id } }).catch(() => {})
      await prisma.recommendationProfile.deleteMany({ where: { project_id: dup.id } }).catch(() => {})
      await prisma.projectCompetitor.deleteMany({ where: { project_id: dup.id } }).catch(() => {})
      await prisma.costSheet.deleteMany({ where: { project_id: dup.id } }).catch(() => {})
      await prisma.paymentPlan.deleteMany({ where: { project_id: dup.id } }).catch(() => {})
      await prisma.priceHistory.deleteMany({ where: { project_id: dup.id } }).catch(() => {})
      await prisma.constructionMilestone.deleteMany({ where: { project_id: dup.id } }).catch(() => {})
      await prisma.constructionUpdate.deleteMany({ where: { project_id: dup.id } }).catch(() => {})
      await prisma.projectChannelPartner.deleteMany({ where: { project_id: dup.id } }).catch(() => {})

      // Delete duplicate project
      await prisma.project.delete({ where: { id: dup.id } })
      deletedCount++
    }
    mergedCount++
  }

  console.log(`\n✅ DUPLICATE CLEANUP COMPLETE! Merged ${mergedCount} duplicate groups and removed ${deletedCount} duplicate projects.\n`)
}

cleanDuplicates()
  .catch(e => {
    console.error('Error cleaning duplicates:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
