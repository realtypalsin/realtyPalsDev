/**
 * Uploads local images from REimages/ to Supabase `property-images` bucket
 * and sets hero_image_url on the matching project.
 * Run: npm run db:seed-images
 */
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '../.env') })

const prisma = new PrismaClient()
// Use service role key to bypass RLS. Falls back to publishable key (will fail if RLS blocks uploads).
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
if (!supabaseKey) { console.error('No Supabase key in env'); process.exit(1) }
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabaseKey)

const BUCKET = 'property-images'

// Map filename (no extension) → project slug in DB
const FILE_TO_SLUG: Record<string, string> = {
  aceParkway:         'ace-parkway-sector-150-noida',
  atsKingston:        'ats-kingston-heath-sector-150-noida',
  atsPious:           'ats-pious-hideaways-sector-150-noida',
  atsPristine:        'ats-pristine-sector-150-noida',
  eldecoByTheGreens:  'eldeco-live-by-the-greens-sector-150-noida',
  godrejPalm:         'godrej-palm-retreat-sector-150-noida',
  prateekCanary:      'prateek-canary-sector-150-noida',
}

const MIME: Record<string, string> = {
  avif: 'image/avif',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  png:  'image/png',
  webp: 'image/webp',
}

async function run() {
  const imagesDir = path.join(__dirname, '../../REimages')

  if (!fs.existsSync(imagesDir)) {
    console.error('REimages/ directory not found at:', imagesDir)
    process.exit(1)
  }

  const files = fs.readdirSync(imagesDir)
  console.log(`Found ${files.length} files in REimages/\n`)

  for (const file of files) {
    const ext   = file.split('.').pop()?.toLowerCase() ?? ''
    const stem  = file.replace(/\.[^.]+$/, '')
    const slug  = FILE_TO_SLUG[stem]

    if (!slug) {
      console.log(`  ⚠  ${file} — no slug mapping, skipping`)
      continue
    }

    const project = await prisma.project.findUnique({ where: { slug } })
    if (!project) {
      console.log(`  ⚠  ${file} — project "${slug}" not found in DB`)
      continue
    }

    const filePath    = path.join(imagesDir, file)
    const fileBuffer  = fs.readFileSync(filePath)
    const storagePath = `projects/${slug}.${ext}`

    console.log(`  → ${project.name}`)
    console.log(`     Uploading ${file} → ${storagePath}`)

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: MIME[ext] ?? 'application/octet-stream',
        upsert: true,
      })

    if (uploadErr) {
      console.error(`     ✗ Upload failed:`, uploadErr.message)
      continue
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath)

    const publicUrl = urlData.publicUrl
    console.log(`     ✓ Public URL: ${publicUrl}`)

    await prisma.project.update({
      where: { slug },
      data: { hero_image_url: publicUrl },
    })
    console.log(`     ✓ DB updated\n`)
  }

  console.log('✓ Image seeding complete.')
  await prisma.$disconnect()
}

run().catch((e) => { console.error(e); process.exit(1) })
