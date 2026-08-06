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
    let builder = await (prisma as any).builder.findFirst({
      where: {
        OR: [
          { name: b.name },
          { slug: b.slug }
        ]
      }
    })

    if (builder) {
      builder = await (prisma as any).builder.update({
        where: { id: builder.id },
        data: b
      })
    } else {
      builder = await (prisma as any).builder.create({
        data: b
      })
    }

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

    const { unit_types, amenities, connectivity, project_images, builder_slug, dna, decision_profile, persona_profile, recommendation_profile, competitors, payment_plan, payment_plans, cost_sheet, ...projectData } = p as any


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

    // Payment plans: many per project, keyed on (project_id, plan_type).
    // Accepts a `payment_plans` array or a single legacy `payment_plan` object.
    const plansToSeed: any[] = Array.isArray(payment_plans)
      ? payment_plans
      : payment_plan ? [payment_plan] : []

    for (const [i, plan] of plansToSeed.entries()) {
      const planType = plan.plan_type ?? 'construction_linked'
      const cleanPlan = { ...plan, plan_type: planType, sort_order: plan.sort_order ?? i }
      await (prisma as any).paymentPlan.upsert({
        where: { project_id_plan_type: { project_id: project.id, plan_type: planType } },
        update: { ...cleanPlan, verified_at: verifiedAt, verified_by: 'seed' },
        create: { ...cleanPlan, project: { connect: { id: project.id } }, verified_at: verifiedAt, verified_by: 'seed' },
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

  // ── 3. Seed unit inventory for first project ────────────────────────────
  console.log('\n📦 Seeding unit inventory...')
  const firstProject = await (prisma as any).project.findFirst({
    include: { unit_types: true }
  })

  if (firstProject && firstProject.unit_types && firstProject.unit_types.length > 0) {
    const unitType = firstProject.unit_types[0]
    const towers = ['Tower A', 'Tower B', 'Tower C']
    const facings = ['North', 'South', 'East', 'West', 'NE', 'NW', 'SE', 'SW']
    const views = ['Park', 'Main road', 'Garden', 'Lake', 'Golf course']
    const statuses = ['available', 'booked', 'reserved']

    let inventoryCount = 0
    for (const tower of towers) {
      for (let floor = 1; floor <= 8; floor++) {
        for (let unit = 1; unit <= 3; unit++) {
          try {
            const unitNumber = `${floor}${String(unit).padStart(2, '0')}`
            await (prisma as any).unitInventory.upsert({
              where: {
                projectId_towerName_floorNumber_unitNumber: {
                  projectId: firstProject.id,
                  towerName: tower,
                  floorNumber: floor,
                  unitNumber: unitNumber
                }
              },
              update: {},
              create: {
                projectId: firstProject.id,
                unitTypeId: unitType.id,
                towerName: tower,
                floorNumber: floor,
                unitNumber: unitNumber,
                facing: facings[Math.floor(Math.random() * facings.length)],
                view: views[Math.floor(Math.random() * views.length)],
                status: statuses[Math.floor(Math.random() * statuses.length)]
              }
            })
            inventoryCount++
          } catch (e: any) {
            if (!e.message.includes('Unique constraint failed')) {
              console.error(`  ✗ Error seeding inventory: ${e.message}`)
            }
          }
        }
      }
    }
    console.log(`  ✓ ${inventoryCount} units seeded for ${firstProject.name}`)
  }

  // ── 4. Seed project-channel partnerships ────────────────────────────
  console.log('\n🔗 Seeding project-channel partnerships...')
  const projects = await (prisma as any).project.findMany({ take: 3 })
  const partners = await (prisma as any).channelPartner.findMany({ take: 3 })

  let partnershipCount = 0
  for (const project of projects) {
    for (let i = 0; i < partners.length; i++) {
      try {
        await (prisma as any).projectChannelPartner.upsert({
          where: {
            projectId_channelPartnerId: {
              projectId: project.id,
              channelPartnerId: partners[i].id
            }
          },
          update: {},
          create: {
            projectId: project.id,
            channelPartnerId: partners[i].id,
            isFeatured: i < 2 // Feature first 2 partners
          }
        })
        partnershipCount++
      } catch (e: any) {
        if (!e.message.includes('Unique constraint failed')) {
          console.error(`  ✗ Error seeding partnership: ${e.message}`)
        }
      }
    }
  }
  console.log(`  ✓ ${partnershipCount} project-partner links created`)

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
