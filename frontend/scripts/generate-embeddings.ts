/**
 * Generate Jina embeddings for all projects missing them.
 * Run: npm run db:embeddings
 *
 * Uses jina-embeddings-v3 (1024 dims) — free 1M tokens.
 * Each project text is ~200 tokens, so 1M tokens ≈ 5000 projects.
 */
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env') })

const prisma = new PrismaClient()

function buildProjectText(p: {
  name: string
  sector: string
  city: string
  description?: string | null
  long_description?: string | null
  tagline?: string | null
  ai_search_keywords?: string[]
  marketing_claims?: string[]
  status: string
  possession_label?: string | null
  design_theme?: string | null
  architect?: string | null
  unit_types: Array<{ bhk: number; price_min_cr?: number | null; price_max_cr?: number | null; super_area_sqft?: number | null }>
  amenities: Array<{ name: string }>
  connectivity: Array<{ type: string; name: string; distance_km?: number | null }>
  builder: { name: string }
}): string {
  const bhks = [...new Set(p.unit_types.map((u) => `${u.bhk}BHK`))].join(', ')
  const prices = p.unit_types
    .filter((u) => u.price_min_cr)
    .map((u) => `${u.bhk}BHK from ₹${u.price_min_cr?.toFixed(2)} Cr`)
    .join(', ')
  const amenities = p.amenities
    .slice(0, 10)
    .map((a) => a.name)
    .join(', ')
  const conn = p.connectivity
    .slice(0, 8)
    .map((c) => `${c.name}${c.distance_km ? ` ${c.distance_km}km` : ''}`)
    .join(', ')

  const parts = [
    `${p.name} by ${p.builder.name}`,
    `Located in ${p.sector}, ${p.city}`,
    p.tagline ?? '',
    p.description ?? '',
    p.long_description ?? '',
    bhks ? `Configurations: ${bhks}` : '',
    prices ? `Pricing: ${prices}` : '',
    `Status: ${p.status.replace(/_/g, ' ')}`,
    p.possession_label ? `Possession: ${p.possession_label}` : '',
    p.design_theme ? `Theme: ${p.design_theme}` : '',
    p.architect ? `Architect: ${p.architect}` : '',
    amenities ? `Amenities: ${amenities}` : '',
    conn ? `Nearby: ${conn}` : '',
    p.ai_search_keywords?.length ? `Keywords: ${p.ai_search_keywords.join(', ')}` : '',
    p.marketing_claims?.length ? `Highlights: ${p.marketing_claims.join('. ')}` : '',
  ]
  return parts.filter(Boolean).join('. ')
}

async function embedText(text: string): Promise<number[] | null> {
  const key = process.env.JINA_API_KEY
  if (!key) throw new Error('JINA_API_KEY not set')

  const res = await fetch('https://api.jina.ai/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'jina-embeddings-v3',
      input: [text],
      dimensions: 1024,
      task: 'retrieval.passage',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Jina error ${res.status}: ${err}`)
  }

  const data = (await res.json()) as { data: Array<{ embedding: number[] }> }
  return data.data?.[0]?.embedding ?? null
}

async function main() {
  console.log('Fetching projects without embeddings...')

  const projects = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM projects WHERE embedding IS NULL
  `
  console.log(`Found ${projects.length} projects to embed`)

  if (projects.length === 0) {
    console.log('All projects already have embeddings.')
    return
  }

  const full = await prisma.project.findMany({
    where: { id: { in: projects.map((p) => p.id) } },

    include: {
      builder: { select: { name: true } },
      unit_types: true,
      amenities: true,
      connectivity: true,
    },
  })

  let done = 0
  let failed = 0

  for (const project of full) {
    try {
      const text = buildProjectText(project as Parameters<typeof buildProjectText>[0])
      const embedding = await embedText(text)

      if (!embedding) {
        console.warn(`  [skip] ${project.name} — no embedding returned`)
        failed++
        continue
      }

      const vectorStr = `[${embedding.join(',')}]`
      await prisma.$executeRaw`
        UPDATE projects SET embedding = ${vectorStr}::vector WHERE id = ${project.id}
      `
      done++
      console.log(`  [${done}/${full.length}] ${project.name}`)

      // 200ms delay to stay within free rate limits
      await new Promise((r) => setTimeout(r, 200))
    } catch (err) {
      console.error(`  [error] ${project.name}:`, err)
      failed++
    }
  }

  console.log(`\nDone. ${done} embedded, ${failed} failed.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
