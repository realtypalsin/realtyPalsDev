#!/usr/bin/env npx ts-node

import { getImageStats } from '../src/lib/images'
import { prisma } from '../src/lib/db'

async function main() {
  console.log('\n=== IMAGE AUDIT ===\n')

  const stats = await getImageStats()

  console.log('📊 Statistics:')
  console.log(`  Total DB images: ${stats.totalDbImages}`)
  console.log(`  Seed images: ${stats.seedImages}`)
  console.log(`  Admin images: ${stats.adminImages}`)
  console.log(`  Supabase files: ${stats.supabaseFileCount}`)
  console.log(`  Orphaned files: ${stats.orphanedCount}`)
  console.log(`  Invalid URLs: ${stats.invalidUrls}`)

  // Find projects without hero images
  const projectsWithoutHero = await prisma.project.count({
    where: {
      hero_image_url: { in: [null, ''] },
    },
  })
  console.log(`\n⚠️  Projects without hero_image_url: ${projectsWithoutHero}`)

  // Find images by type
  const imagesByType = await prisma.projectImage.groupBy({
    by: ['type', 'source'],
    _count: true,
  })
  console.log(`\n📸 Images by type and source:`)
  imagesByType.forEach(({ type, source, _count }) => {
    console.log(`  ${type} (${source}): ${_count}`)
  })

  // Find projects with missing image data
  const projectsWithImages = await prisma.project.findMany({
    where: {
      project_images: {
        some: {},
      },
    },
    select: {
      id: true,
      name: true,
      project_images: {
        select: { id: true, url: true, source: true },
      },
    },
    take: 10,
  })

  if (projectsWithImages.length > 0) {
    console.log(`\n📦 Sample projects with images (first 10):`)
    projectsWithImages.forEach(p => {
      const seedCount = p.project_images.filter(img => img.source === 'seed').length
      const adminCount = p.project_images.filter(img => img.source === 'admin').length
      console.log(`  ${p.name}: ${seedCount} seed, ${adminCount} admin`)
    })
  }

  console.log('\n✅ Audit complete.')
}

main().catch(err => {
  console.error('❌ Audit failed:', err)
  process.exit(1)
})
