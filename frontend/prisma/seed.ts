// prisma/seed.ts
<<<<<<< HEAD
import { PrismaClient } from '@prisma/client'
import { BUILDERS, PROJECTS } from './data/seed-data'
import { NEW_BUILDERS, NEW_PROJECTS } from './data/seed-data-new'

const ALL_BUILDERS = [...BUILDERS, ...NEW_BUILDERS]
const ALL_PROJECTS = [...PROJECTS, ...NEW_PROJECTS]
=======
import { PrismaClient, ProjectStatus, AmenityCategory, ConnectivityType, DataSource, ImageType } from '@prisma/client'
import { BUILDERS, PROJECTS } from './data/seed-data'
import { CENTRAL_NOIDA_PROJECTS } from './data/seed-data-central-noida'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { NEW_BUILDERS, NEW_PROJECTS } = require('./data/seed-data-new')

const ALL_BUILDERS = [...BUILDERS, ...(NEW_BUILDERS ?? [])]
const ALL_PROJECTS = [...PROJECTS, ...(NEW_PROJECTS ?? []), ...CENTRAL_NOIDA_PROJECTS]
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding RealtyPals database...\n')

  // ── 1. Upsert builders ────────────────────────────────────────────
  console.log('📦 Seeding builders...')
  const builderMap = new Map<string, string>() // slug → id

  for (const b of ALL_BUILDERS) {
    const builder = await prisma.builder.upsert({
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

<<<<<<< HEAD
    const { unit_types, amenities, connectivity, project_images, builder_slug, ...projectData } = p
=======
    const { unit_types, amenities, connectivity, project_images, builder_slug, dna, decision_profile, persona_profile, recommendation_profile, competitors, payment_plan, cost_sheet, ...projectData } = p
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172

    // Upsert project
    const project = await prisma.project.upsert({
      where: { slug: p.slug },
<<<<<<< HEAD
      update: { ...projectData, builder_id, status: projectData.status as any },
      create: { ...projectData, builder_id, status: projectData.status as any },
    })

    // Delete and re-insert related records (idempotent seed)
    await prisma.unitType.deleteMany({ where: { project_id: project.id } })
    await prisma.amenity.deleteMany({ where: { project_id: project.id } })
    await prisma.connectivity.deleteMany({ where: { project_id: project.id } })
    await prisma.projectImage.deleteMany({ where: { project_id: project.id } })
=======
      update: { ...projectData, builder_id, status: projectData.status as ProjectStatus },
      create: { ...projectData, builder_id, status: projectData.status as ProjectStatus },
    })

    // Delete and re-insert related records (idempotent seed)
    // NOTE: Only delete seed-sourced images. Admin images persist across re-seeds.
    await prisma.unitType.deleteMany({ where: { project_id: project.id } })
    await prisma.amenity.deleteMany({ where: { project_id: project.id } })
    await prisma.connectivity.deleteMany({ where: { project_id: project.id } })
    await prisma.projectImage.deleteMany({ where: { project_id: project.id, source: 'seed' } })
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172

    // Insert unit types
    if (unit_types.length > 0) {
      await prisma.unitType.createMany({
<<<<<<< HEAD
        data: unit_types.map(u => ({ ...u, project_id: project.id })),
=======
        data: unit_types.map((u: any) => ({ ...u, project_id: project.id })),
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
      })
    }

    // Insert amenities
    if (amenities.length > 0) {
      await prisma.amenity.createMany({
<<<<<<< HEAD
        data: amenities.map(a => ({
          ...a,
          project_id: project.id,
          category: a.category as any,
=======
        data: amenities.map((a: any) => ({
          ...a,
          project_id: project.id,
          category: a.category as AmenityCategory,
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
        })),
      })
    }

    // Insert connectivity
    if (connectivity.length > 0) {
      await prisma.connectivity.createMany({
<<<<<<< HEAD
        data: connectivity.map(c => ({
          ...c,
          project_id: project.id,
          type: c.type as any,
          data_source: c.data_source as any,
=======
        data: connectivity.map((c: any) => ({
          ...c,
          project_id: project.id,
          type: c.type as ConnectivityType,
          data_source: c.data_source as DataSource,
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
        })),
      })
    }

<<<<<<< HEAD
    // Insert project images
    if (project_images && project_images.length > 0) {
      await prisma.projectImage.createMany({
        data: project_images.map(img => ({
          ...img,
          project_id: project.id,
          type: img.type as any,
=======
    // Insert project images (mark as seed for future re-seeds)
    if (project_images && project_images.length > 0) {
      await prisma.projectImage.createMany({
        data: project_images.map((img: any) => ({
          ...img,
          project_id: project.id,
          type: img.type as ImageType,
          source: 'seed',
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
        })),
      })
    }

<<<<<<< HEAD
    console.log(`  ✓ ${project.name} (${unit_types.length} units, ${amenities.length} amenities, ${connectivity.length} connectivity, ${project_images?.length ?? 0} images)`)
=======
    // Seed intelligence tables
    const verifiedAt = new Date('2026-06-22')
    await prisma.projectDna.deleteMany({ where: { project_id: project.id } })
    await prisma.decisionProfile.deleteMany({ where: { project_id: project.id } })
    await prisma.personaProfile.deleteMany({ where: { project_id: project.id } })
    await prisma.recommendationProfile.deleteMany({ where: { project_id: project.id } })
    await prisma.projectCompetitor.deleteMany({ where: { project_id: project.id } })

    if (dna) {
      await prisma.projectDna.create({ data: { ...dna, project_id: project.id, last_verified_at: verifiedAt, verified_by: 'seed' } })
    }
    if (decision_profile) {
      await prisma.decisionProfile.create({ data: { ...decision_profile, project_id: project.id, status: 'PUBLISHED', last_verified_at: verifiedAt, verified_by: 'seed' } })
    }
    if (persona_profile) {
      await prisma.personaProfile.create({ data: { ...persona_profile, project_id: project.id, last_verified_at: verifiedAt, verified_by: 'seed' } })
    }
    if (recommendation_profile) {
      await prisma.recommendationProfile.create({ data: { ...recommendation_profile, project_id: project.id, status: 'PUBLISHED', last_verified_at: verifiedAt, verified_by: 'seed' } })
    }
    if (competitors && competitors.length > 0) {
      await prisma.projectCompetitor.createMany({
        data: (competitors as any[]).map(c => ({ ...c, project_id: project.id, last_verified_at: verifiedAt })),
      })
    }

    // Cost plan tables (payment_plan / cost_sheet are 1:1 relations, upsert on project_id)
    if (payment_plan) {
      const cleanPaymentPlan = { ...payment_plan }
      await prisma.paymentPlan.upsert({
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
      await prisma.costSheet.upsert({
        where: { project_id: project.id },
        update: { ...cleanCostSheet, verified_at: verifiedAt, verified_by: 'seed' },
        create: { ...cleanCostSheet, project: { connect: { id: project.id } }, verified_at: verifiedAt, verified_by: 'seed' },
      })
    }

    const intelCount = [dna, decision_profile, persona_profile, recommendation_profile].filter(Boolean).length
    console.log(`  ✓ ${project.name} (${unit_types.length} units, ${amenities.length} amenities, ${connectivity.length} connectivity, ${project_images?.length ?? 0} images, ${intelCount} intel tables)`)
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
  }

  console.log('\n✅ Seed complete.')
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
