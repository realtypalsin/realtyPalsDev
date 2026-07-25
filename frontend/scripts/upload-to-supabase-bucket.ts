import { PrismaClient, ImageType } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '../.env') })
dotenv.config({ path: path.join(__dirname, '../../backend/.env') })

const prisma = new PrismaClient()

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const BUCKET = 'property-images'
const PROP_IMAGES_DIR = 'C:\\Users\\Furqan\\Desktop\\PropImages'

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

const MIME: Record<string, string> = {
  avif: 'image/avif',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

async function uploadToBucket() {
  console.log(`[SUPABASE_STORAGE] Connecting to ${supabaseUrl}...`)

  // 1. Ensure bucket exists
  const { data: buckets, error: getBucketsErr } = await supabase.storage.listBuckets()
  if (getBucketsErr) {
    console.warn('⚠️ Could not list buckets:', getBucketsErr.message)
  } else {
    const exists = buckets?.some(b => b.name === BUCKET)
    if (!exists) {
      console.log(`[SUPABASE_STORAGE] Creating public bucket "${BUCKET}"...`)
      const { error: createErr } = await supabase.storage.createBucket(BUCKET, { public: true })
      if (createErr) console.warn('⚠️ Bucket creation error:', createErr.message)
    }
  }

  const projects = await prisma.project.findMany({
    select: { id: true, name: true, slug: true }
  })

  const files = fs.readdirSync(PROP_IMAGES_DIR)
  console.log(`[SUPABASE_STORAGE] Uploading ${files.length} images to Supabase bucket "${BUCKET}"...\n`)

  let uploadSuccess = 0
  let uploadFail = 0

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
      console.warn(`  ⚠️ Skipping unmatched file: ${file}`)
      uploadFail++
      continue
    }

    const project = projects.find(p => p.slug === targetSlug)
    if (!project) {
      uploadFail++
      continue
    }

    const filePath = path.join(PROP_IMAGES_DIR, file)
    const fileBuffer = fs.readFileSync(filePath)
    const storagePath = `projects/${project.slug}/hero.${ext}`

    // Upload to Supabase Storage
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: MIME[ext] || 'image/jpeg',
        upsert: true
      })

    if (uploadErr) {
      console.error(`  ❌ Failed uploading ${file}:`, uploadErr.message)
      uploadFail++
      continue
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath)

    const publicUrl = urlData.publicUrl

    // Update DB to Supabase CDN URL
    await prisma.project.update({
      where: { id: project.id },
      data: { hero_image_url: publicUrl }
    })

    const existingImage = await prisma.projectImage.findFirst({
      where: { project_id: project.id, type: ImageType.hero }
    })

    if (existingImage) {
      await prisma.projectImage.update({
        where: { id: existingImage.id },
        data: { url: publicUrl }
      })
    } else {
      await prisma.projectImage.create({
        data: {
          project_id: project.id,
          url: publicUrl,
          type: ImageType.hero,
          source: 'admin',
          caption: project.name,
          sort_order: 0
        }
      })
    }

    console.log(`  ✓ Bucket Uploaded & DB Updated [${project.name}] → ${publicUrl}`)
    uploadSuccess++
  }

  console.log(`\n🎉 Supabase Storage Upload Complete!`)
  console.log(`   Successfully uploaded: ${uploadSuccess} images`)
  console.log(`   Failed/Skipped: ${uploadFail}`)
}

uploadToBucket().catch(console.error).finally(() => prisma.$disconnect())
