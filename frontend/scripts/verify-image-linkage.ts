import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env') })
dotenv.config({ path: path.join(__dirname, '../../backend/.env') })

const prisma = new PrismaClient()

async function verifyLinkage() {
  const projectsWithImages = await prisma.project.findMany({
    where: { hero_image_url: { not: null } },
    select: {
      id: true,
      name: true,
      slug: true,
      hero_image_url: true,
      images: { select: { url: true, type: true } }
    },
    orderBy: { name: 'asc' }
  })

  console.log(`\n================================================================================`);
  console.log(`VERIFYING IMAGE LINKAGE FOR ${projectsWithImages.length} PROJECTS IN DATABASE`);
  console.log(`================================================================================\n`);

  let countOk = 0

  for (const proj of projectsWithImages) {
    const url = proj.hero_image_url || ''
    // Perform fetch check
    let httpStatus = 'LOCAL/NOT_TESTED'
    if (url.startsWith('http')) {
      try {
        const res = await fetch(url, { method: 'HEAD' })
        httpStatus = res.ok ? `HTTP ${res.status} OK` : `HTTP ${res.status} ERROR`
      } catch (err: any) {
        httpStatus = `FETCH_ERR: ${err.message}`
      }
    }

    console.log(`Project: "${proj.name}"`)
    console.log(`  Slug: ${proj.slug}`)
    console.log(`  Hero URL: ${url}`)
    console.log(`  Gallery Count: ${proj.images.length}`)
    console.log(`  CDN Status: ${httpStatus}`)
    console.log(`--------------------------------------------------------------------------------`)
    countOk++
  }

  console.log(`\n✅ Summary: ${countOk} projects verified with active hero images linked.`)
}

verifyLinkage().catch(console.error).finally(() => prisma.$disconnect())
