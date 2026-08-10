import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TARGET_SECTORS = ['75', '76', '77', '78', '79', '99', '10', '12']

async function main() {
  console.log('\n🔍 Running Deep Field Audit across all Database Projects...\n')

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
      competitors: true,
      cost_sheet: true,
      payment_plans: true,
      construction_milestones: true,
      construction_updates: true,
      channel_partners: { include: { channel_partner: true } }
    },
    orderBy: { sector: 'asc' }
  })

  console.log(`Auditing ${projects.length} projects in database...\n`)

  let missingCostSheets = 0
  let missingPaymentPlans = 0
  let missingMilestones = 0
  let missingUpdates = 0
  let missingPartners = 0
  let missingDna = 0
  let missingDecision = 0
  let missingPersona = 0
  let missingRecommendation = 0
  let missingCompetitors = 0

  for (const p of projects) {
    const gaps: string[] = []

    if (!p.cost_sheet) missingCostSheets++
    if (p.payment_plans.length === 0) missingPaymentPlans++
    if (p.construction_milestones.length === 0) missingMilestones++
    if (p.construction_updates.length === 0) missingUpdates++
    if (p.channel_partners.length === 0) missingPartners++
    if (!p.dna) missingDna++
    if (!p.decision_profile) missingDecision++
    if (!p.persona_profile) missingPersona++
    if (!p.recommendation_profile) missingRecommendation++
    if (p.competitors.length === 0) missingCompetitors++
  }

  console.log('════════════════════════════════════════════════════════════════════')
  console.log('  DEEP DATABASE COVERAGE REPORT')
  console.log('════════════════════════════════════════════════════════════════════')
  console.log(`  Total Projects: ${projects.length}`)
  console.log(`  Missing Cost Sheets:             ${missingCostSheets} projects`)
  console.log(`  Missing Payment Plans:           ${missingPaymentPlans} projects`)
  console.log(`  Missing Construction Milestones: ${missingMilestones} projects`)
  console.log(`  Missing Construction Updates:    ${missingUpdates} projects`)
  console.log(`  Missing Channel Partners:        ${missingPartners} projects`)
  console.log(`  Missing Project DNA:             ${missingDna} projects`)
  console.log(`  Missing Decision Profiles:       ${missingDecision} projects`)
  console.log(`  Missing Persona Profiles:        ${missingPersona} projects`)
  console.log(`  Missing Recommendation Profiles: ${missingRecommendation} projects`)
  console.log(`  Missing Competitors:             ${missingCompetitors} projects`)
  console.log('════════════════════════════════════════════════════════════════════\n')
}

main().finally(() => prisma.$disconnect())
