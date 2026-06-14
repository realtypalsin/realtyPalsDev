// prisma/seed.ts
import { PrismaClient, ProjectStatus, AmenityCategory, ConnectivityType, DataSource, ImageType } from '@prisma/client'
import { BUILDERS, PROJECTS } from './data/seed-data'
import { NEW_BUILDERS, NEW_PROJECTS } from './data/seed-data-new'

const ALL_BUILDERS = [...BUILDERS, ...NEW_BUILDERS]
const ALL_PROJECTS = [...PROJECTS, ...NEW_PROJECTS]

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

    const { unit_types, amenities, connectivity, project_images, builder_slug, ...projectData } = p

    // Upsert project
    const project = await prisma.project.upsert({
      where: { slug: p.slug },
      update: { ...projectData, builder_id, status: projectData.status as ProjectStatus },
      create: { ...projectData, builder_id, status: projectData.status as ProjectStatus },
    })

    // Delete and re-insert related records (idempotent seed)
    await prisma.unitType.deleteMany({ where: { project_id: project.id } })
    await prisma.amenity.deleteMany({ where: { project_id: project.id } })
    await prisma.connectivity.deleteMany({ where: { project_id: project.id } })
    await prisma.projectImage.deleteMany({ where: { project_id: project.id } })

    // Insert unit types
    if (unit_types.length > 0) {
      await prisma.unitType.createMany({
        data: unit_types.map(u => ({ ...u, project_id: project.id })),
      })
    }

    // Insert amenities
    if (amenities.length > 0) {
      await prisma.amenity.createMany({
        data: amenities.map(a => ({
          ...a,
          project_id: project.id,
          category: a.category as AmenityCategory,
        })),
      })
    }

    // Insert connectivity
    if (connectivity.length > 0) {
      await prisma.connectivity.createMany({
        data: connectivity.map(c => ({
          ...c,
          project_id: project.id,
          type: c.type as ConnectivityType,
          data_source: c.data_source as DataSource,
        })),
      })
    }

    // Insert project images
    if (project_images && project_images.length > 0) {
      await prisma.projectImage.createMany({
        data: project_images.map(img => ({
          ...img,
          project_id: project.id,
          type: img.type as ImageType,
        })),
      })
    }

    console.log(`  ✓ ${project.name} (${unit_types.length} units, ${amenities.length} amenities, ${connectivity.length} connectivity, ${project_images?.length ?? 0} images)`)
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
