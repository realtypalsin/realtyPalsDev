/**
 * Verify Elite Group seeding was successful
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const builder = await prisma.builder.findUnique({
    where: { slug: 'elite-group' },
    include: {
      projects: { select: { id: true, name: true, slug: true } },
    },
  })

  if (!builder) {
    console.log('❌ Elite Group not found in database')
    return
  }

  console.log('✅ Elite Group Builder Details:\n')
  console.log(`ID: ${builder.id}`)
  console.log(`Name: ${builder.name}`)
  console.log(`Slug: ${builder.slug}`)
  console.log(`Email: ${builder.email}`)
  console.log(`Website: ${builder.website}`)
  console.log(`CIN: ${builder.cin}`)
  console.log(`RERA Promoter ID: ${builder.rera_promoter_id}`)
  console.log(`Founded Year: ${builder.founded_year}`)
  console.log(`Headquarters: ${builder.headquarters}`)
  console.log(`\n📊 Track Record:`)
  console.log(`Delivered Projects: ${builder.delivered_projects?.join(', ')}`)
  console.log(`Ongoing Projects: ${builder.ongoing_projects?.join(', ')}`)
  console.log(`\n💼 Corporate:`)
  console.log(`Legal Entities: ${JSON.stringify(builder.legal_entities, null, 2)}`)
  console.log(`Executives: ${JSON.stringify(builder.executives, null, 2)}`)
  console.log(`\n💰 Financial:`)
  console.log(`Financial Hygiene Score: ${builder.financial_hygiene_score}/100`)
  console.log(`Outstanding Dues: ₹${builder.outstanding_dues_cr} Cr`)
  console.log(`Funding Banks: ${builder.funding_banks?.join(', ')}`)
  console.log(`\n✨ Specialization:`)
  console.log(`Luxury Specialization: ${builder.luxury_specialization}`)
  console.log(`Township Specialization: ${builder.township_specialization}`)
  console.log(`Affordable Specialization: ${builder.affordable_specialization}`)
  console.log(`\n🔐 Compliance:`)
  console.log(`RERA Compliance Score: ${builder.rera_compliance_score}`)
  console.log(`Verification Level: ${builder.verification_level}`)
  console.log(`Data Source: ${builder.data_source}`)
  console.log(`\n📋 Audit Flags:`)
  console.log(builder.audit_flags_log)
  console.log(`\n🔗 Linked Projects (${builder.projects.length}):`)
  builder.projects.forEach(p => {
    console.log(`  • ${p.name} (${p.slug})`)
  })
}

main()
  .catch(e => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
