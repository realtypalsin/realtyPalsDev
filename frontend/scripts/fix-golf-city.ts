import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('⛳ Consolidating duplicate "Golf City" projects...')

  // Find all three versions of Golf City
  const targetProject = await prisma.project.findUnique({
    where: { slug: 'golf-city-sector-75-noida' }
  })
  
  const sourceProject1 = await prisma.project.findUnique({
    where: { slug: 'aims-max-gardenia-golf-city-sector-75-noida' }
  })

  const sourceProject2 = await prisma.project.findUnique({
    where: { slug: 'aims-max-golf-city-sector-75-noida' }
  })

  if (!targetProject) {
    console.error('❌ Target project "golf-city-sector-75-noida" not found in DB.')
    return
  }

  // Use sourceProject1 (from gardenia-golf-city.json) which has all the intelligence data
  const source = sourceProject1 || sourceProject2

  if (!source) {
    console.warn('⚠️ No source project found with intelligence data.')
    return
  }

  console.log(`Copying intelligence data from source ID ${source.id} (${source.slug}) to target ID ${targetProject.id} (${targetProject.slug})...`)

  // Copy DNA
  const dna = await prisma.projectDna.findUnique({ where: { project_id: source.id } })
  if (dna) {
    const { id, project_id, ...dnaData } = dna
    await prisma.projectDna.upsert({
      where: { project_id: targetProject.id },
      create: { project_id: targetProject.id, ...dnaData },
      update: dnaData
    })
    console.log(' ✓ Copied Project DNA')
  }

  // Copy Decision Profile
  const decision = await prisma.decisionProfile.findUnique({ where: { project_id: source.id } })
  if (decision) {
    const { id, project_id, ...decisionData } = decision
    await prisma.decisionProfile.upsert({
      where: { project_id: targetProject.id },
      create: { project_id: targetProject.id, ...decisionData },
      update: decisionData
    })
    console.log(' ✓ Copied Decision Profile')
  }

  // Copy Persona Profile
  const persona = await prisma.personaProfile.findUnique({ where: { project_id: source.id } })
  if (persona) {
    const { id, project_id, ...personaData } = persona
    await prisma.personaProfile.upsert({
      where: { project_id: targetProject.id },
      create: { project_id: targetProject.id, ...personaData },
      update: personaData
    })
    console.log(' ✓ Copied Persona Profile')
  }

  // Copy Recommendation Profile
  const rec = await prisma.recommendationProfile.findUnique({ where: { project_id: source.id } })
  if (rec) {
    const { id, project_id, ...recData } = rec
    await prisma.recommendationProfile.upsert({
      where: { project_id: targetProject.id },
      create: { project_id: targetProject.id, ...recData },
      update: recData
    })
    console.log(' ✓ Copied Recommendation Profile')
  }

  // Copy Competitors
  const competitors = await prisma.projectCompetitor.findMany({ where: { project_id: source.id } })
  if (competitors.length > 0) {
    await prisma.projectCompetitor.deleteMany({ where: { project_id: targetProject.id } })
    for (const c of competitors) {
      const { id, project_id, ...cData } = c
      await prisma.projectCompetitor.create({
        data: { project_id: targetProject.id, ...cData }
      })
    }
    console.log(` ✓ Copied ${competitors.length} Competitors`)
  }

  // Copy Cost Sheet
  const costSheet = await prisma.costSheet.findFirst({ where: { project_id: source.id } })
  if (costSheet) {
    const { id, project_id, ...csData } = costSheet
    await prisma.costSheet.deleteMany({ where: { project_id: targetProject.id } })
    await prisma.costSheet.create({
      data: { project_id: targetProject.id, ...csData }
    })
    console.log(' ✓ Copied Cost Sheet')
  }

  // Copy Payment Plan
  const paymentPlan = await prisma.paymentPlan.findFirst({ where: { project_id: source.id } })
  if (paymentPlan) {
    const { id, project_id, ...ppData } = paymentPlan
    await prisma.paymentPlan.deleteMany({ where: { project_id: targetProject.id } })
    await prisma.paymentPlan.create({
      data: { project_id: targetProject.id, ...ppData }
    })
    console.log(' ✓ Copied Payment Plan')
  }

  // Delete the duplicate projects to clean up the DB
  console.log('Cleaning up duplicate projects...')
  if (sourceProject1) {
    await prisma.project.delete({ where: { id: sourceProject1.id } }).catch(() => {})
  }
  if (sourceProject2) {
    await prisma.project.delete({ where: { id: sourceProject2.id } }).catch(() => {})
  }
  console.log(' ✓ Deleted duplicates.')

  // Update target project name to match the fuller one if needed
  await prisma.project.update({
    where: { id: targetProject.id },
    data: { name: 'Aims Max Gardenia Golf City' }
  })
  
  console.log('🎉 Consolidate complete! "golf-city-sector-75-noida" now holds all intelligence and pricing details.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
