import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  const imgDir = path.join(__dirname, '../public/images/properties')
  const dirs = fs.existsSync(imgDir)
    ? fs.readdirSync(imgDir).filter(d => fs.statSync(path.join(imgDir, d)).isDirectory())
    : []

  const projects = await prisma.project.findMany({
    select: { id: true, name: true, slug: true, hero_image_url: true }
  })

  console.log(`Auditing images for ${projects.length} projects...\n`)

  let updatedCount = 0

  for (const p of projects) {
    if (p.hero_image_url && p.hero_image_url.trim() !== '') continue

    // Normalize project name for matching
    const pNorm = p.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    const match = dirs.find(d => {
      const dNorm = d.toLowerCase().replace(/[^a-z0-9]/g, '')
      return dNorm.includes(pNorm) || pNorm.includes(dNorm.replace(/(noida|greater|west|sector\d+)/g, ''))
    })

    let heroPath: string | null = null

    if (match) {
      for (const ext of ['jpg', 'avif', 'webp', 'png']) {
        if (fs.existsSync(path.join(imgDir, match, `hero.${ext}`))) {
          heroPath = `/images/properties/${match}/hero.${ext}`
          break
        }
      }
      if (!heroPath) {
        const files = fs.readdirSync(path.join(imgDir, match))
        const first = files.find(f => /\.(jpg|jpeg|png|webp|avif)$/i.test(f))
        if (first) heroPath = `/images/properties/${match}/${first}`
      }
    }

    // Fallback placeholder if no specific image directory found
    if (!heroPath) {
      heroPath = '/placeholder.png'
    }

    await prisma.project.update({
      where: { id: p.id },
      data: { hero_image_url: heroPath }
    })

    // Create ProjectImage record if missing
    const existingImgs = await prisma.projectImage.count({ where: { project_id: p.id } })
    if (existingImgs === 0) {
      await prisma.projectImage.create({
        data: {
          project_id: p.id,
          url: heroPath,
          type: 'exterior',
          source: 'seed',
          caption: `${p.name} Main View`,
          sort_order: 0,
        }
      })
    }

    updatedCount++
    console.log(`  ✓ Fixed image for "${p.name}" -> ${heroPath}`)
  }

  console.log(`\n🎉 Image restoration complete! Updated ${updatedCount} projects.`)
}

main().finally(() => prisma.$disconnect())
