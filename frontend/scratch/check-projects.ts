import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const eliteX = await prisma.project.findFirst({
    where: {
      slug: 'elite-x-sector-10-greater-noida-west'
    },
    include: {
      decision_profile: true
    }
  })
  // The single intelligence_data blob was split into six explicit columns by
  // migration 20260801170000_simplify_intelligence_schema.
  const p = eliteX?.decision_profile
  console.log('Elite X intelligence:', JSON.stringify({
    financial_intelligence: p?.financial_intelligence,
    market_intelligence: p?.market_intelligence,
    builder_intelligence: p?.builder_intelligence,
    property_intelligence: p?.property_intelligence,
    comparative_analysis: p?.comparative_analysis,
    resources_documents: p?.resources_documents,
  }, null, 2))
}

main().finally(() => prisma.$disconnect())
