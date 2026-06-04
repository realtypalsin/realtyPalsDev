/**
 * Real-time pricing from registry — uses web search to fetch
 * current circle rates and recent registration data for a sector.
 * No scraping, no third-party API needed.
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { tavilySearch } from '@/lib/ai/tavily'
import { groq, GROQ_FAST } from '@/lib/ai/groq'
import { getCached, setCached, makeKey } from '@/lib/redis'

const Schema = z.object({
  sector: z.string().min(1),
  city:   z.string().default('Noida'),
})

export interface RegistryPriceData {
  sector: string
  city: string
  circle_rate_sqft: string
  market_rate_range: string
  recent_registrations: string
  data_freshness: string
  sources: string[]
  summary: string
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const parsed = Schema.safeParse({
    sector: searchParams.get('sector'),
    city:   searchParams.get('city') ?? 'Noida',
  })
  if (!parsed.success) return Response.json({ error: 'sector required' }, { status: 400 })

  const { sector, city } = parsed.data
  const cacheKey = makeKey('registry', city, sector)
  const cached = await getCached<RegistryPriceData>(cacheKey)
  if (cached) return Response.json(cached)

  const queries = [
    `${sector} ${city} circle rate 2024 2025 property registration`,
    `${sector} ${city} flat price per sqft recent registration data`,
  ]

  const searchResponses = await Promise.all(queries.map((q) => tavilySearch(q, 4)))
  const allResults: Array<{ title: string; url: string; content: string }> = searchResponses.flatMap((r) => r.results)

  const context = allResults
    .slice(0, 6)
    .map((r, i) => `[Source ${i + 1}] ${r.title}\n${r.content.slice(0, 400)}`)
    .join('\n\n')

  const prompt = `Based on the following web search results, extract and summarize current property price data for ${sector}, ${city}.

${context}

Return a JSON object with these exact fields:
{
  "circle_rate_sqft": "₹X,XXX/sqft or 'Not found'",
  "market_rate_range": "₹X,XXX – ₹XX,XXX/sqft or 'Not found'",
  "recent_registrations": "Summary of recent registration activity or 'No data found'",
  "data_freshness": "2024 / 2025 / Unclear",
  "summary": "2-3 sentence plain English summary of pricing in this sector"
}

If data is unavailable, use appropriate placeholder text. Return only valid JSON.`

  let extracted: Partial<RegistryPriceData> = {}
  try {
    const resp = await groq.chat.completions.create({
      model: GROQ_FAST,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0,
      response_format: { type: 'json_object' },
    })
    const text = resp.choices[0]?.message?.content ?? '{}'
    extracted = JSON.parse(text)
  } catch {
    extracted = {}
  }

  const result: RegistryPriceData = {
    sector,
    city,
    circle_rate_sqft:     extracted.circle_rate_sqft ?? 'Not available',
    market_rate_range:    extracted.market_rate_range ?? 'Not available',
    recent_registrations: extracted.recent_registrations ?? 'No recent data found',
    data_freshness:       extracted.data_freshness ?? 'Unknown',
    sources:              allResults.slice(0, 3).map((r) => r.url),
    summary:              extracted.summary ?? `Price data for ${sector} ${city} sourced from web.`,
  }

  await setCached(cacheKey, result, 60 * 60 * 6)
  return Response.json(result)
}
