/**
 * AI-powered data enrichment.
 * For each project, searches the web and fills missing fields:
 * RERA number, possession date, price range, description, hero image.
 * Run: npm run db:enrich-ai
 *
 * Runs 3 projects in parallel — fast enough, won't hit Tavily rate limits.
 */
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env') })
const prisma = new PrismaClient()

// ── Tavily search ────────────────────────────────────────────────────────────
async function searchWeb(query: string): Promise<string> {
  const key = process.env.TAVILY_API_KEY
  if (!key) return ''
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        query,
        search_depth: 'basic',
        max_results: 5,
        include_answer: true,
        include_domains: [
          'up-rera.in', '99acres.com', 'magicbricks.com', 'housing.com',
          'nobroker.in', 'commonfloor.com', 'squareyards.com', 'proptiger.com',
        ],
      }),
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json() as {
      answer?: string
      results?: Array<{ title: string; content: string }>
    }
    const parts: string[] = []
    if (data.answer) parts.push(data.answer)
    data.results?.slice(0, 4).forEach((r) => parts.push(`${r.title}: ${r.content.slice(0, 300)}`))
    return parts.join('\n')
  } catch {
    return ''
  }
}

// ── Groq extraction ─────────────────────────────────────────────────────────
async function extractWithGroq(context: string, projectName: string, builderName: string): Promise<{
  rera_number?: string
  possession_label?: string
  possession_year?: number
  price_min_cr?: number
  price_max_cr?: number
  description?: string
  status?: 'ready_to_move' | 'under_construction' | 'new_launch'
}> {
  const key = process.env.GROQ_API_KEY
  if (!key || !context) return {}

  const prompt = `Extract structured data for the property "${projectName}" by ${builderName} from this web search context.

CONTEXT:
${context.slice(0, 3000)}

Return ONLY valid JSON with these fields (omit fields if not found):
{
  "rera_number": "UPRERAPRJXXXXX or similar — string",
  "possession_label": "e.g. Ready to Move or Possession: Dec 2022",
  "possession_year": 2022,
  "price_min_cr": 1.5,
  "price_max_cr": 3.2,
  "description": "2-3 sentences about this project",
  "status": "ready_to_move or under_construction or new_launch"
}

Rules:
- possession_year must be a number (year only)
- price in crores (Indian rupees), decimal number
- status must be exactly one of the three values
- If unclear, omit the field`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(10000),
    })
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
    const text = data.choices?.[0]?.message?.content ?? '{}'
    return JSON.parse(text)
  } catch {
    return {}
  }
}

// ── Google Places image fetch ────────────────────────────────────────────────
async function getPlaceImage(projectName: string, sector: string): Promise<string | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) return null

  try {
    // Text search to find the place
    const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
    searchUrl.searchParams.set('query', `${projectName} ${sector} Noida residential`)
    searchUrl.searchParams.set('type', 'establishment')
    searchUrl.searchParams.set('key', key)

    const searchRes = await fetch(searchUrl.toString(), { signal: AbortSignal.timeout(5000) })
    const searchData = await searchRes.json() as {
      results?: Array<{ photos?: Array<{ photo_reference: string }> }>
    }

    const photoRef = searchData.results?.[0]?.photos?.[0]?.photo_reference
    if (!photoRef) return null

    // Construct photo URL (redirects to actual image — use as-is, it's a valid URL)
    const photoUrl = new URL('https://maps.googleapis.com/maps/api/place/photo')
    photoUrl.searchParams.set('maxwidth', '1200')
    photoUrl.searchParams.set('photo_reference', photoRef)
    photoUrl.searchParams.set('key', key)

    // Follow redirect to get permanent URL
    const photoRes = await fetch(photoUrl.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    })

    const redirectUrl = photoRes.headers.get('location')
    return redirectUrl ?? photoUrl.toString()
  } catch {
    return null
  }
}

// ── Enrich one project ───────────────────────────────────────────────────────
async function enrichProject(project: {
  id: string
  name: string
  sector: string
  city: string
  rera_number: string | null
  description: string | null
  hero_image_url: string | null
  status: string
  builder: { name: string }
}): Promise<void> {
  console.log(`  → ${project.name}`)

  const needsRera        = !project.rera_number
  const needsDescription = !project.description
  const needsImage       = !project.hero_image_url

  // Only search web if something is missing
  const context = (needsRera || needsDescription)
    ? await searchWeb(`"${project.name}" ${project.builder.name} Noida RERA possession price 2024 2025`)
    : ''

  const extracted = context ? await extractWithGroq(context, project.name, project.builder.name) : {}

  const imageUrl = needsImage
    ? await getPlaceImage(project.name, project.sector)
    : null

  const update: Record<string, unknown> = {}

  if (needsRera && extracted.rera_number) {
    update.rera_number = extracted.rera_number
    console.log(`     RERA: ${extracted.rera_number}`)
  }
  if (needsDescription && extracted.description) {
    update.description = extracted.description
    console.log(`     Description: added`)
  }
  if (extracted.status && extracted.status !== project.status) {
    update.status = extracted.status
    console.log(`     Status: ${project.status} → ${extracted.status}`)
  }
  if (extracted.possession_year && extracted.possession_label) {
    update.possession_label = extracted.possession_label
    update.possession_date  = new Date(`${extracted.possession_year}-06-01`)
    console.log(`     Possession: ${extracted.possession_label}`)
  }
  if (extracted.price_min_cr || extracted.price_max_cr) {
    // Only update unit types if price data found and not already set
    const unitTypes = await prisma.unitType.findMany({ where: { project_id: project.id } })
    for (const ut of unitTypes) {
      if (!ut.price_min_cr && extracted.price_min_cr) {
        await prisma.unitType.update({
          where: { id: ut.id },
          data: {
            price_min_cr: extracted.price_min_cr,
            price_max_cr: extracted.price_max_cr ?? extracted.price_min_cr,
            price_is_estimated: true,
          },
        })
      }
    }
    console.log(`     Price: ₹${extracted.price_min_cr}–${extracted.price_max_cr} Cr (estimated)`)
  }
  if (needsImage && imageUrl) {
    update.hero_image_url = imageUrl
    console.log(`     Image: found via Google Places`)
  }

  if (Object.keys(update).length > 0) {
    await prisma.project.update({ where: { id: project.id }, data: update })
  } else {
    console.log(`     (no updates needed)`)
  }
}

// ── Run in parallel batches ──────────────────────────────────────────────────
async function runBatch<T>(items: T[], fn: (item: T) => Promise<void>, batchSize: number) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    await Promise.all(batch.map(fn))
  }
}

async function main() {
  console.log('Starting AI enrichment...\n')

  const projects = await prisma.project.findMany({
    include: { builder: { select: { name: true } } },
    orderBy: { name: 'asc' },
  })

  console.log(`Found ${projects.length} projects\n`)

  // 3 in parallel — fast, won't hit rate limits
  await runBatch(projects, enrichProject, 3)

  console.log('\n✓ Enrichment complete.')
  console.log('Run: npm run db:re-embed  ← refresh search vectors')
}

main().catch(console.error).finally(() => prisma.$disconnect())
