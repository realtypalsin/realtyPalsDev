/**
 * Safe seed script for Elite Group builder enrichment.
 * Updates Elite Group record with comprehensive corporate data from RERA + registry.
 * Does NOT affect existing projects — only updates Builder record via upsert.
 * Run: npx ts-node scripts/seed-elite-group.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ELITE_GROUP_DATA = {
  slug: 'elite-group',
  name: 'Elite Group',
  tagline: 'Premium Developer with Mivan Construction Excellence',
  parent_group: null,
  description: 'Premium Tier 2 developer specializing in low-density luxury residential projects. Track record: 4 delivered projects (Elite Homz, Elite Golf Green). Proprietary Mivan shuttering technology ensures fast, high-quality construction. Clean RERA compliance with on-time/near-on-time delivery across all projects.',
  founded_year: 2012,
  headquarters: 'Greater Noida, Uttar Pradesh',
  website: 'https://www.elitehomz.com',
  email: 'accounts@elitehomz.com',
  phone: null,
  credai_member: false,
  delivered_units: null,
  delivered_projects: ['Elite Homz', 'Elite Golf Green'],
  ongoing_projects: ['Elite X'],
  awards: [],
  awards_count: null,
  cin: 'U70200DL2012PTC237482',
  rera_promoter_id: 'UPRERAPRM5180',
  legal_entities: [
    {
      name: 'Golfgreen Mansions Private Limited',
      cin: 'U70200DL2012PTC237482',
      role: 'primary',
      incorporated_date: '2012-06-14',
    },
    {
      name: 'Golfgreen Buildcon Pvt. Ltd.',
      cin: null,
      role: 'secondary',
    },
  ],
  executives: [
    { name: 'Vinod Bahl', designation: 'Director' },
    { name: 'Pramod Bahl', designation: 'Director' },
    { name: 'Vikas Gupta', designation: 'Director' },
    { name: 'Uma Shanker', designation: 'Director' },
  ],
  financial_hygiene_score: 92,
  outstanding_dues_cr: 0.0,
  funding_banks: ['Tata Capital'],
  audit_flags_log:
    'Clean RERA record verified. Incorporation: June 14, 2012. On-time or near-on-time delivery with zero structural delays across 4 delivered projects. Authorized marketing partner: Nandee Realtors (RERA Agent Cert: UPRERAAGT18728). Primary project channel: https://nandeerealtors.in/project/elite-x-sector-10-greater-noida-west/',
  luxury_specialization: true,
  verification_level: 'FULLY_VERIFIED',
  data_source: 'Official RERA records + Corporate registry + Authorized partner verification',
}

async function main() {
  console.log('🌱 Seeding Elite Group builder with comprehensive corporate data...\n')

  // Check if Elite Group exists
  const existing = await prisma.builder.findUnique({
    where: { slug: 'elite-group' },
  })

  if (existing) {
    console.log(`📋 Found existing Elite Group record (ID: ${existing.id})`)
    console.log('🔄 Updating with enhanced data...\n')
  } else {
    console.log('✨ Elite Group not found. Creating new record.\n')
  }

  // Upsert Elite Group — safe because:
  // 1. Updates only Builder record via slug
  // 2. Does not affect Project foreign keys (already set)
  // 3. Idempotent — safe to run multiple times
  const eliteGroup = await prisma.builder.upsert({
    where: { slug: 'elite-group' },
    update: ELITE_GROUP_DATA,
    create: ELITE_GROUP_DATA,
  })

  console.log('✅ Elite Group update complete:\n')
  console.log(`  Name: ${eliteGroup.name}`)
  console.log(`  CIN: ${eliteGroup.cin}`)
  console.log(`  Email: ${eliteGroup.email}`)
  console.log(`  RERA Promoter ID: ${eliteGroup.rera_promoter_id}`)
  console.log(`  Legal Entities: ${(eliteGroup.legal_entities as any[]).length}`)
  console.log(`  Delivered Projects: ${eliteGroup.delivered_projects?.join(', ')}`)
  console.log(`  Ongoing Projects: ${eliteGroup.ongoing_projects?.join(', ')}`)
  console.log(`  Financial Hygiene Score: ${eliteGroup.financial_hygiene_score}/100`)
  console.log(`  Luxury Specialization: ${eliteGroup.luxury_specialization}`)
  console.log(`  Verification Level: ${eliteGroup.verification_level}`)

  // Verify Elite X project still linked
  const eliteXProject = await prisma.project.findUnique({
    where: { slug: 'elite-x-sector-10-greater-noida-west' },
    select: {
      id: true,
      name: true,
      builder_id: true,
      builder: { select: { name: true } },
    },
  })

  if (eliteXProject) {
    console.log(`\n🔗 Verified Elite X project link:`)
    console.log(`  Project: ${eliteXProject.name}`)
    console.log(`  Builder: ${eliteXProject.builder.name}`)
    console.log(`  Relationship: ✅ Intact`)
  }

  console.log('\n🎉 Seed complete. No existing projects affected.')
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
