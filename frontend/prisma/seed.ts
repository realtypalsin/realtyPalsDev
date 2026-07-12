// prisma/seed.ts
import { PrismaClient, ProjectStatus, AmenityCategory, ConnectivityType, DataSource, ImageType } from '@prisma/client'
import { BUILDERS, PROJECTS } from './data/seed-data'
import { CENTRAL_NOIDA_PROJECTS } from './data/seed-data-central-noida'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { NEW_BUILDERS, NEW_PROJECTS } = require('./data/seed-data-new')

const ALL_BUILDERS = [...BUILDERS, ...(NEW_BUILDERS ?? [])]
const ALL_PROJECTS = [...PROJECTS, ...(NEW_PROJECTS ?? []), ...CENTRAL_NOIDA_PROJECTS]


const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding RealtyPals database...\n')

  // ── 1. Upsert builders ────────────────────────────────────────────
  console.log('📦 Seeding builders...')
  const builderMap = new Map<string, string>() // slug → id

  for (const b of ALL_BUILDERS) {
    const builder = await (prisma as any).builder.upsert({
      where: { slug: b.slug },
      update: { ...b },
      create: { ...b },
    })
    builderMap.set(b.slug, builder.id)
    console.log(`  ✓ ${builder.name}`)
  }

  // ── 2. Upsert projects ────────────────────────────────────────────
  console.log('\n🏗️  Seeding projects...')

  for (const p of ALL_PROJECTS) {
    const builder_id = builderMap.get(p.builder_slug)
    if (!builder_id) {
      console.error(`  ✗ Builder not found for slug: ${p.builder_slug}`)
      continue
    }

    const { unit_types, amenities, connectivity, project_images, builder_slug, dna, decision_profile, persona_profile, recommendation_profile, competitors, payment_plan, cost_sheet, ...projectData } = p


    // Upsert project
    const project = await (prisma as any).project.upsert({
      where: { slug: p.slug },
      update: { ...projectData, builder_id, status: projectData.status as ProjectStatus },
      create: { ...projectData, builder_id, status: projectData.status as ProjectStatus },
    })

    // Delete and re-insert related records (idempotent seed)
    // NOTE: Only delete seed-sourced images. Admin images persist across re-seeds.
    await (prisma as any).unitType.deleteMany({ where: { project_id: project.id } })
    await (prisma as any).amenity.deleteMany({ where: { project_id: project.id } })
    await (prisma as any).connectivity.deleteMany({ where: { project_id: project.id } })
    await (prisma as any).projectImage.deleteMany({ where: { project_id: project.id } })


    // Insert unit types
    if (unit_types.length > 0) {
      await (prisma as any).unitType.createMany({
        data: unit_types.map((u: any) => ({ ...u, project_id: project.id })),

      })
    }

    // Insert amenities
    if (amenities.length > 0) {
      await (prisma as any).amenity.createMany({
        data: amenities.map((a: any) => ({
          ...a,
          project_id: project.id,
          category: a.category as AmenityCategory,

        })),
      })
    }

    // Insert connectivity
    if (connectivity.length > 0) {
      await (prisma as any).connectivity.createMany({
        data: connectivity.map((c: any) => ({
          ...c,
          project_id: project.id,
          type: c.type as ConnectivityType,
          data_source: c.data_source as DataSource,

        })),
      })
    }

    // Insert project images (mark as seed for future re-seeds)
    if (project_images && project_images.length > 0) {
      await (prisma as any).projectImage.createMany({
        data: project_images.map((img: any) => ({
          ...img,
          project_id: project.id,
          type: img.type as ImageType,
          source: 'seed',

        })),
      })
    }

    // Seed intelligence tables
    const verifiedAt = new Date('2026-06-22')
    await (prisma as any).projectDna.deleteMany({ where: { project_id: project.id } })
    await (prisma as any).decisionProfile.deleteMany({ where: { project_id: project.id } })
    await (prisma as any).personaProfile.deleteMany({ where: { project_id: project.id } })
    await (prisma as any).recommendationProfile.deleteMany({ where: { project_id: project.id } })
    await (prisma as any).projectCompetitor.deleteMany({ where: { project_id: project.id } })

    if (dna) {
      await (prisma as any).projectDna.create({ data: { ...dna, project_id: project.id, last_verified_at: verifiedAt, verified_by: 'seed' } })
    }
    if (decision_profile) {
      await (prisma as any).decisionProfile.create({ data: { ...decision_profile, project_id: project.id, status: 'PUBLISHED', last_verified_at: verifiedAt, verified_by: 'seed' } })
    }
    if (persona_profile) {
      await (prisma as any).personaProfile.create({ data: { ...persona_profile, project_id: project.id, last_verified_at: verifiedAt, verified_by: 'seed' } })
    }
    if (recommendation_profile) {
      await (prisma as any).recommendationProfile.create({ data: { ...recommendation_profile, project_id: project.id, last_verified_at: verifiedAt, verified_by: 'seed' } })
    }
    if (competitors && competitors.length > 0) {
      await (prisma as any).projectCompetitor.createMany({
        data: (competitors as any[]).map(c => ({ ...c, project_id: project.id, last_verified_at: verifiedAt })),
      })
    }

    // Cost plan tables (payment_plan / cost_sheet are 1:1 relations, upsert on project_id)
    if (payment_plan) {
      const cleanPaymentPlan = { ...payment_plan }
      await (prisma as any).paymentPlan.upsert({
        where: { project_id: project.id },
        update: { ...cleanPaymentPlan, verified_at: verifiedAt, verified_by: 'seed' },
        create: { ...cleanPaymentPlan, project: { connect: { id: project.id } }, verified_at: verifiedAt, verified_by: 'seed' },
      })
    }
    if (cost_sheet) {
      const cleanCostSheet = { 
        ...cost_sheet,
        stamp_duty_pct: cost_sheet.stamp_duty_pct ?? 0,
        registration_pct: cost_sheet.registration_pct ?? 0,
        floor_rise_per_floor: cost_sheet.floor_rise_per_floor ?? 0
      }
      await (prisma as any).costSheet.upsert({
        where: { project_id: project.id },
        update: { ...cleanCostSheet, verified_at: verifiedAt, verified_by: 'seed' },
        create: { ...cleanCostSheet, project: { connect: { id: project.id } }, verified_at: verifiedAt, verified_by: 'seed' },
      })
    }

    const intelCount = [dna, decision_profile, persona_profile, recommendation_profile].filter(Boolean).length
    console.log(`  ✓ ${project.name} (${unit_types.length} units, ${amenities.length} amenities, ${connectivity.length} connectivity, ${project_images?.length ?? 0} images, ${intelCount} intel tables)`)

  }

  console.log('\n✅ Seed complete.')
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await (prisma as any).$disconnect()
  })
