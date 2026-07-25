import { PrismaClient, ImageType } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '../.env') })
dotenv.config({ path: path.join(__dirname, '../../backend/.env') })

const prisma = new PrismaClient()
const PROP_IMAGES_DIR = 'C:\\Users\\Furqan\\Desktop\\PropImages'
const PUBLIC_PROPERTIES_DIR = path.join(__dirname, '../public/images/properties')

// Explicit manual overrides for any tricky filenames
const MANUAL_OVERLOADS: Record<string, string> = {
  'county107.jpg': 'county-107-sector-107-noida',
  'esgtate128.jpg': 'max-estate-128-sector-128-noida',
  'gardeniaGolfCityAimsMax.jpg': 'gardenia-golf-city-sector-75-noida',
  'AimsMaxGardeniaGolfCity.jpg': 'gardenia-golf-city-sector-75-noida',
  'golfCity.jpg': 'gardenia-golf-city-sector-75-noida',
  'golfCity75.jpg': 'gardenia-golf-city-sector-75-noida',
  'sikkaKamaantraGreens.webp': 'sikka-karmic-greens-sector-78-noida',
  'sikkakKamaantraGreens79.jpg': 'sikka-kimaantra-greens-sector-79-noida',
  'eliteGolfGreens.jpg': 'elite-golf-greens-sector-79-noida',
}

async function run() {
  if (!fs.existsSync(PUBLIC_PROPERTIES_DIR)) {
    fs.mkdirSync(PUBLIC_PROPERTIES_DIR, { recursive: true })
  }

  const projects = await prisma.project.findMany({
    select: { id: true, name: true, slug: true, hero_image_url: true }
  })

  console.log(`[SEED_IMAGES] Loaded ${projects.length} projects from database.`)

  const files = fs.readdirSync(PROP_IMAGES_DIR)
  console.log(`[SEED_IMAGES] Processing ${files.length} property images from ${PROP_IMAGES_DIR}...\n`)

  let successCount = 0
  let skipCount = 0

  for (const file of files) {
    const extWithDot = path.extname(file)
    const ext = extWithDot.replace('.', '').toLowerCase()
    const stem = path.basename(file, extWithDot)

    let targetSlug: string | null = MANUAL_OVERLOADS[file] || null

    if (!targetSlug) {
      const normalizedStem = stem
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .replace(/[^a-zA-Z0-9]/g, ' ')
        .toLowerCase()
        .trim()

      let bestMatch: typeof projects[0] | null = null
      let bestScore = 0

      for (const proj of projects) {
        const projNameNorm = proj.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, ' ')
        const projSlugNorm = proj.slug.toLowerCase().replace(/[^a-zA-Z0-9]/g, ' ')

        const stemWords = normalizedStem.split(/\s+/).filter(w => w.length > 2)
        let matchedWords = 0
        for (const word of stemWords) {
          if (projNameNorm.includes(word) || projSlugNorm.includes(word)) {
            matchedWords++
          }
        }
        const score = stemWords.length > 0 ? matchedWords / stemWords.length : 0
        if (score > bestScore) {
          bestScore = score
          bestMatch = proj
        }
      }

      if (bestMatch && bestScore >= 0.5) {
        targetSlug = bestMatch.slug
      }
    }

    if (!targetSlug) {
      console.warn(`  ⚠️ Could not match file: ${file}`)
      skipCount++
      continue
    }

    const project = projects.find(p => p.slug === targetSlug)
    if (!project) {
      // Create project if missing or skip
      console.warn(`  ⚠️ Project slug "${targetSlug}" not found in DB for file ${file}`)
      skipCount++
      continue
    }

    // 1. Copy image file to public/images/properties/[slug]/hero.[ext]
    const projPublicDir = path.join(PUBLIC_PROPERTIES_DIR, project.slug)
    if (!fs.existsSync(projPublicDir)) {
      fs.mkdirSync(projPublicDir, { recursive: true })
    }

    const destFileName = `hero.${ext}`
    const destPath = path.join(projPublicDir, destFileName)
    const srcPath = path.join(PROP_IMAGES_DIR, file)

    fs.copyFileSync(srcPath, destPath)

    // Also copy original filename into folder for multi-gallery support
    const destOriginalPath = path.join(projPublicDir, file)
    fs.copyFileSync(srcPath, destOriginalPath)

    const publicUrl = `/images/properties/${project.slug}/${destFileName}`

    // 2. Update Project hero_image_url in database
    await prisma.project.update({
      where: { id: project.id },
      data: { hero_image_url: publicUrl }
    })

    // 3. Upsert ProjectImage in database
    const existingImage = await prisma.projectImage.findFirst({
      where: { project_id: project.id, url: publicUrl }
    })

    if (!existingImage) {
      await prisma.projectImage.create({
        data: {
          project_id: project.id,
          url: publicUrl,
          type: ImageType.hero,
          source: 'admin',
          caption: project.name,
          sort_order: 0,
        }
      })
    }

    console.log(`  ✓ Linked [${project.name}] (${project.slug}) → ${publicUrl}`)
    successCount++
  }

  console.log(`\n🎉 Completed linking images!`)
  console.log(`   Successfully linked: ${successCount} projects`)
  console.log(`   Skipped/Unmatched:  ${skipCount} files`)
}

run().catch(console.error).finally(() => prisma.$disconnect())
