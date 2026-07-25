import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '../.env') })
dotenv.config({ path: path.join(__dirname, '../../backend/.env') })

const prisma = new PrismaClient()
const PROP_IMAGES_DIR = 'C:\\Users\\Furqan\\Desktop\\PropImages'

async function inspectMatches() {
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, slug: true, hero_image_url: true }
  })

  console.log(`Found ${projects.length} projects in DB.`)

  const files = fs.readdirSync(PROP_IMAGES_DIR)
  console.log(`Found ${files.length} images in ${PROP_IMAGES_DIR}\n`)

  const matches: Array<{ file: string; project: typeof projects[0]; score: number }> = []
  const unmatchedFiles: string[] = []

  for (const file of files) {
    const ext = path.extname(file)
    const stem = path.basename(file, ext)

    // Normalize stem: e.g. "sikkaKarmicGreens" -> "sikka karmic greens", "atsHomeKraftHappyTrails" -> "ats home kraft happy trails"
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

      // Score matching
      const stemWords = normalizedStem.split(/\s+/).filter(w => w.length > 2)
      let matchedWords = 0
      for (const word of stemWords) {
        if (projNameNorm.includes(word) || projSlugNorm.includes(word)) {
          matchedWords++
        }
      }

      const score = stemWords.length > 0 ? matchedWords / stemWords.length : 0

      // Exact substring or high word match
      if (score > bestScore) {
        bestScore = score
        bestMatch = proj
      }
    }

    if (bestMatch && bestScore >= 0.5) {
      matches.push({ file, project: bestMatch, score: bestScore })
      console.log(`✓ ${file}  -->  [${bestMatch.slug}] "${bestMatch.name}" (score: ${(bestScore * 100).toFixed(0)}%)`)
    } else {
      unmatchedFiles.push(file)
      console.log(`✗ UNMATCHED: ${file} (stem: "${normalizedStem}")`)
    }
  }

  console.log(`\nMatched: ${matches.length} / ${files.length}`)
  console.log(`Unmatched: ${unmatchedFiles.length}`)
}

inspectMatches().catch(console.error).finally(() => prisma.$disconnect())
