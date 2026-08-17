import { prisma } from '../lib/db'
import * as fs from 'fs'
import * as path from 'path'

async function main() {
  const jsonPath = path.resolve(__dirname, '../../../realtypals-enrichment-73-projects.json')
  const raw = fs.readFileSync(jsonPath, 'utf8')
  const projectsList = JSON.parse(raw)
  console.log(`[check] Total projects listed in JSON: ${projectsList.length}`)

  const ids = projectsList.map((p: any) => p.id)
  const dbProjects = await prisma.project.findMany({
    where: { id: { in: ids } },
    include: {
      builder: true,
      cost_sheet: true,
      payment_plans: true,
      decision_profile: true,
      persona_profile: true,
      recommendation_profile: true,
      channel_partners: true,
      unit_types: true,
      amenities: true,
      connectivity: true,
    }
  })

  console.log(`[check] Found in DB: ${dbProjects.length} / ${projectsList.length}`)

  let missingCostSheet = 0
  let missingPaymentPlans = 0
  let missingDecision = 0
  let missingPersona = 0
  let missingRecommendation = 0
  let missingChannelPartners = 0

  const summary = dbProjects.map(p => {
    const hasCS = !!p.cost_sheet
    const hasPP = p.payment_plans.length > 0
    const hasDec = !!p.decision_profile
    const hasPers = !!p.persona_profile
    const hasRec = !!p.recommendation_profile
    const hasCP = p.channel_partners.length > 0

    if (!hasCS) missingCostSheet++
    if (!hasPP) missingPaymentPlans++
    if (!hasDec) missingDecision++
    if (!hasPers) missingPersona++
    if (!hasRec) missingRecommendation++
    if (!hasCP) missingChannelPartners++

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      sector: p.sector,
      city: p.city,
      status: p.status,
      builder: p.builder?.name,
      unitsCount: p.unit_types.length,
      hasCostSheet: hasCS,
      hasPaymentPlans: hasPP,
      hasDecision: hasDec,
      hasPersona: hasPers,
      hasRecommendation: hasRec,
      hasChannelPartners: hasCP,
    }
  })

  console.log('\n--- Missing Field Counts Across 73 Projects ---')
  console.log(`Missing Cost Sheet: ${missingCostSheet}`)
  console.log(`Missing Payment Plans: ${missingPaymentPlans}`)
  console.log(`Missing Decision Profile (Thesis, Pros/Cons): ${missingDecision}`)
  console.log(`Missing Persona Profile (Buyer Target): ${missingPersona}`)
  console.log(`Missing Recommendation Profile: ${missingRecommendation}`)
  console.log(`Missing Channel Partners: ${missingChannelPartners}`)

  console.log('\nSample project states (first 5):')
  console.log(JSON.stringify(summary.slice(0, 5), null, 2))

  await prisma.$disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
