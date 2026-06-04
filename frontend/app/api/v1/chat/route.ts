import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { createGroq } from '@ai-sdk/groq'
import { createOpenAI } from '@ai-sdk/openai'
import { streamText, tool, stepCountIs } from 'ai'
import { GROQ_SMART } from '@/lib/ai/groq'
import { tavilySearch, formatTavilyContext } from '@/lib/ai/tavily'
import { buildSystemPrompt } from '@/lib/ai/prompts'
import { searchProjects, rerankProjects } from '@/lib/repositories/projectRepository'
import { normalizeQuery } from '@/lib/normalize'
import { checkRateLimit, getCached, setCached, makeKey, invalidateSessionListCache } from '@/lib/redis'
import { getCommuteTime } from '@/lib/google-maps'
import { jinaRead } from '@/lib/ai/jina'
import { getAreaInfo } from '@/lib/wikipedia'
import { calculateEmi, calculateStampDuty, calculateGst, formatInr } from '@/lib/calculators'
import type { SearchFilters } from '@/lib/repositories/projectRepository'
import type { ProjectCard } from '@/types/project'
import type { UserMemoryContext } from '@/lib/ai/prompts'
import type { Prisma } from '@prisma/client'

const MAX_HISTORY = 12

const BodySchema = z.object({
  message: z.string().min(1).max(2000).trim(),
  session_id: z.string().uuid().optional(),
})

function getUserId(req: NextRequest): string | null {
  return req.headers.get('x-user-id')
}

const groqProvider = createGroq({ apiKey: process.env.GROQ_API_KEY })
const cerebrasProvider = createOpenAI({
  baseURL: 'https://api.cerebras.ai/v1',
  apiKey: process.env.CEREBRAS_API_KEY ?? '',
})

const CHAT_PROVIDER = process.env.CHAT_PROVIDER ?? 'groq'

function getModel() {
  if (CHAT_PROVIDER === 'cerebras' && process.env.CEREBRAS_API_KEY) {
    return cerebrasProvider('llama-3.3-70b')
  }
  return groqProvider(GROQ_SMART)
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request)
  if (!userId) {
    return new Response(JSON.stringify({ error: 'X-User-Id header required' }), { status: 400 })
  }

  let rawBody: unknown
  try { rawBody = await request.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
  }

  const parsed = BodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 })
  }

  const { message: rawMessage, session_id } = parsed.data
  const message = normalizeQuery(rawMessage)

  // Parallel init: rate limit + session fetch + user memory — saves one serial round-trip
  const [{ allowed, remaining }, sessionResult, userMemoryResult] = await Promise.all([
    checkRateLimit(userId),
    session_id
      ? prisma.chatSession.findUnique({
          where: { id: session_id },
          include: { messages: { orderBy: { created_at: 'asc' }, take: MAX_HISTORY } },
        })
      : Promise.resolve(null),
    prisma.userMemory.findUnique({ where: { user_id: userId } }).catch(() => null),
  ])

  if (!allowed) {
    return new Response(
      JSON.stringify({ error: 'Too many messages. Please wait a moment before sending again.' }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'X-RateLimit-Remaining': '0', 'Retry-After': '60' } }
    )
  }

  let session = sessionResult
  if (!session) {
    session = await prisma.chatSession.create({
      data: { user_id: userId },
      include: { messages: { orderBy: { created_at: 'asc' }, take: MAX_HISTORY } },
    })
  }

  const sessionId = session.id
  const historyMsgs = session.messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content as string,
  }))

  const chatMessages = [...historyMsgs, { role: 'user' as const, content: message }]

  const memoryCtx: UserMemoryContext | null = userMemoryResult
    ? {
        bhk_preference: userMemoryResult.bhk_preference ?? null,
        budget_min_cr: userMemoryResult.budget_min_cr ?? null,
        budget_max_cr: userMemoryResult.budget_max_cr ?? null,
        sector_preference: userMemoryResult.sector_preference ?? null,
        purpose: userMemoryResult.purpose ?? null,
        viewed_slugs: (userMemoryResult.viewed_slugs as string[]) ?? [],
      }
    : null

  const systemPrompt = buildSystemPrompt(memoryCtx)
  const encoder = new TextEncoder()
  const t0 = Date.now()

  console.log(`[chat] ▶ user="${message.slice(0, 120)}" session=${sessionId.slice(0, 8)} uid=${userId.slice(0, 8)}`)

  const responseStream = new ReadableStream({
    async start(controller) {
      let streamClosed = false
      const send = (data: object) => {
        if (streamClosed) return
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) } catch {}
      }

      let finalText = ''
      let projects: ProjectCard[] = []
      let chatPhase: 'DISCOVERY' | 'ADVISOR' = 'DISCOVERY'
      const toolArgsList: string[] = []

      try {
        const result = streamText({
          model: getModel(),
          messages: chatMessages,
          system: systemPrompt,
          stopWhen: stepCountIs(3),
          abortSignal: request.signal,
          tools: {
            search_properties: tool({
              description: 'Search the RealtyPals property database. The database covers Noida and Greater Noida ONLY. Call ONLY when the user has explicitly named a Noida sector or Greater Noida location. For other cities (Gurgaon, Delhi, Mumbai, Bangalore, Hyderabad, Chennai, Pune, etc.) do NOT call this tool — instead use search_web to get real estate market context for that city, then bridge back to Noida inventory.',
              inputSchema: z.object({
                city: z.string().optional().describe('City e.g. "Noida"'),
                sector: z.string().optional().describe('Sector e.g. "Sector 150"'),
                bhk: z.union([z.number(), z.string()]).optional().describe('Bedrooms 1-5'),
                budget_max_cr: z.union([z.number(), z.string()]).optional().describe('Max budget in crores e.g. 1.5'),
                budget_min_cr: z.union([z.number(), z.string()]).optional().describe('Min budget in crores e.g. 1.0'),
                possession_year_max: z.union([z.number(), z.string()]).optional().describe('Latest possession year e.g. 2026'),
              }),
              execute: async (args) => {
                send({ type: 'searching' })
                toolArgsList.push(JSON.stringify(args))

                const filters: SearchFilters = {
                  city: args.city,
                  sector: args.sector,
                  bhk: args.bhk ? Number(args.bhk) : undefined,
                  budget_max_cr: args.budget_max_cr ? Number(args.budget_max_cr) : undefined,
                  budget_min_cr: args.budget_min_cr ? Number(args.budget_min_cr) : undefined,
                  possession_year_max: args.possession_year_max ? Number(args.possession_year_max) : undefined,
                }

                // DB query — fast, ~200ms
                const dbResults = await searchProjects(filters, message)

                if (dbResults.length === 0) {
                  return 'No properties found matching those criteria. Tell the user inventory is limited and suggest broadening — higher budget, adjacent sector, or different possession timeline.'
                }

                // Rerank with 800ms gate: skip entirely for small result sets
                const rerankWithGate = dbResults.length > 3
                  ? Promise.race([
                      rerankProjects(dbResults, message),
                      new Promise<null>((resolve) => setTimeout(() => resolve(null), 800)),
                    ])
                  : Promise.resolve(null)

                const reranked = await rerankWithGate
                const finalResults = reranked ?? dbResults

                projects = finalResults
                chatPhase = 'ADVISOR'

                // Stream cards to client immediately — frontend renders before Groq writes text
                send({ type: 'properties', data: finalResults })

                const location = args.sector ?? args.city ?? 'the area'
                return `Found ${finalResults.length} properties in ${location}. The property cards are displayed to the user. Write a 2–3 sentence advisory summary: lead with the best-fit property and one specific reason, then note one honest trade-off. Under 80 words. Do not repeat specs already shown on the cards.`
              }
            }),

            search_web: tool({
              description: 'Search the web for real-time information. Use when asked about builder reputation, delivery track record, builder news/controversies, sector infrastructure updates, metro expansion, RERA status of a project, market trends, school/hospital quality in an area, or any current events. Do NOT use for property listings — use search_properties for that.',
              inputSchema: z.object({
                query: z.string().describe('Specific search query e.g. "ATS builder Noida delivery track record complaints 2024"'),
              }),
              execute: async ({ query }) => {
                send({ type: 'searching' })
                const webCacheKey = makeKey('websearch', query.toLowerCase().slice(0, 120))
                let webContext = await getCached<string>(webCacheKey)
                if (!webContext) {
                  try {
                    const webResult = await tavilySearch(query, 3)
                    webContext = formatTavilyContext(webResult.answer, webResult.results) || ''
                    if (webContext) await setCached(webCacheKey, webContext, 60 * 60 * 24)
                  } catch {
                    return 'Could not fetch data from web'
                  }
                }
                return webContext || 'No current information found for this query. Answer from your training knowledge.'
              }
            }),

            get_commute_time: tool({
              description: 'Calculate driving and transit time between two locations in India. Use when user asks: "how far is X from Y", "commute time", "kitna door hai", "how long to reach [office/metro/airport]", or when a property address and a destination are both known.',
              inputSchema: z.object({
                origin: z.string().describe('Full address or location name, e.g. "ACE Parkway, Sector 150, Noida"'),
                destination: z.string().describe('Destination address or place, e.g. "Cyber City, Gurgaon" or "Connaught Place, Delhi"'),
              }),
              execute: async ({ origin, destination }) => {
                send({ type: 'searching' })
                const commuteKey = makeKey('commute', origin.toLowerCase(), destination.toLowerCase())
                let commuteData = await getCached<object>(commuteKey)
                if (!commuteData) {
                  try {
                    const result = await getCommuteTime(origin, destination)
                    if (result) {
                      commuteData = result
                      await setCached(commuteKey, result, 60 * 60 * 6)
                    }
                  } catch {}
                }
                return commuteData
                  ? JSON.stringify(commuteData)
                  : `Could not calculate commute from "${origin}" to "${destination}". Share approximate distance/travel time from general knowledge.`
              }
            }),

            calculate_emi: tool({
              description: 'Calculate monthly home loan EMI, total interest, and total payment. Use when user asks about EMI, "kitna EMI hoga", monthly payment, affordability, loan repayment.',
              inputSchema: z.object({
                principal_cr: z.union([z.number(), z.string()]).describe('Loan amount in crores e.g. 1.2'),
                annual_rate: z.union([z.number(), z.string()]).describe('Annual interest rate percent e.g. 8.5'),
                tenure_years: z.union([z.number(), z.string()]).describe('Loan tenure in years e.g. 20'),
              }),
              execute: async ({ principal_cr, annual_rate, tenure_years }) => {
                const r = calculateEmi(Number(principal_cr), Number(annual_rate), Number(tenure_years))
                return [
                  `Monthly EMI: ${formatInr(r.emi_monthly)}`,
                  `Loan amount: ${formatInr(r.principal)} @ ${r.annual_rate}% p.a. for ${r.tenure_months / 12} years`,
                  `Total payment: ${formatInr(r.total_payment)}`,
                  `Total interest: ${formatInr(r.total_interest)}`,
                ].join('\n')
              }
            }),

            calculate_stamp_duty: tool({
              description: 'Calculate UP stamp duty and registration charges for a property purchase. Use when asked about stamp duty, registration cost, "registration kitna hoga".',
              inputSchema: z.object({
                price_cr: z.union([z.number(), z.string()]).describe('Property price in crores'),
                buyer_gender: z.enum(['male', 'female', 'joint']).describe('Buyer gender — affects stamp duty rate').optional(),
              }),
              execute: async ({ price_cr, buyer_gender }) => {
                const r = calculateStampDuty(Number(price_cr), buyer_gender ?? 'male')
                return [
                  `Stamp Duty (${r.stamp_duty_rate}%): ${formatInr(r.stamp_duty)}`,
                  `Registration (1%): ${formatInr(r.registration)}`,
                  `Total govt charges: ${formatInr(r.total_charges)}`,
                  `Note: ${r.note}`,
                ].join('\n')
              }
            }),

            calculate_gst: tool({
              description: 'Calculate GST applicable on a property. Use when asked about GST, "kitna GST lagega", tax on property purchase.',
              inputSchema: z.object({
                price_cr: z.union([z.number(), z.string()]).describe('Property price in crores'),
                status: z.enum(['under_construction', 'ready_to_move']),
                carpet_sqm: z.union([z.number(), z.string()]).describe('Carpet area in sqm').optional(),
              }),
              execute: async ({ price_cr, status, carpet_sqm }) => {
                const r = calculateGst(Number(price_cr), status, Number(carpet_sqm ?? 0))
                return [
                  `GST (${r.gst_rate}%): ${formatInr(r.gst_amount)}`,
                  `Category: ${r.category.replace('_', ' ')}`,
                  `Note: ${r.note}`,
                ].join('\n')
              }
            }),

            get_area_info: tool({
              description: 'Get background information about a Noida sector or area from Wikipedia. Use when asked: "tell me about Sector 150", "how is this area", "kya hai yahan".',
              inputSchema: z.object({
                sector: z.string().describe('Sector name e.g. "Sector 150"'),
                city: z.string().describe('City e.g. "Noida"'),
              }),
              execute: async ({ sector, city }) => {
                const areaCacheKey = makeKey('area', city.toLowerCase(), sector.toLowerCase())
                const cachedArea = await getCached<string>(areaCacheKey)
                if (cachedArea) return cachedArea

                const wikiResult = await Promise.race([
                  getAreaInfo(sector, city),
                  new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000)),
                ])
                const resultString = wikiResult
                  ? `${wikiResult.title}: ${wikiResult.extract}\nSource: ${wikiResult.url}`
                  : `No Wikipedia article found for ${sector}, ${city}. Answer from your knowledge of Noida.`

                await setCached(areaCacheKey, resultString, 86400).catch(() => {})
                return resultString
              }
            }),

            read_rera_page: tool({
              description: 'Fetch live RERA registration details from UP-RERA portal. Use when asked to verify RERA status, "RERA check karo", "is this registered with RERA".',
              inputSchema: z.object({
                rera_number: z.string().optional().describe('RERA registration number e.g. UPRERAPRJ12345'),
                rera_url: z.string().optional().describe('Direct URL to RERA project page if available'),
              }),
              execute: async ({ rera_number, rera_url }) => {
                send({ type: 'searching' })
                const url = rera_url || (rera_number ? `https://www.up-rera.in/projects?project_search=${encodeURIComponent(rera_number)}` : 'https://www.up-rera.in')
                try {
                  const content = await Promise.race([
                    jinaRead(url, 2000),
                    new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000)),
                  ])
                  return content ? `RERA page for ${rera_number || 'search'}:\n${content}` : `Could not fetch RERA page.`
                } catch {
                  return `Could not fetch RERA page. Advise user to visit https://www.up-rera.in directly.`
                }
              }
            }),
          }
        })

        // Fire-and-forget: save user message (don't block stream)
        prisma.chatMessage.create({
          data: { session_id: sessionId, role: 'user', content: rawMessage },
        }).catch((e) => console.error('[chat] user msg save failed:', e))

        for await (const chunk of result.fullStream) {
          if (chunk.type === 'text-delta') {
            const delta = (chunk as any).text ?? (chunk as any).textDelta ?? ''
            if (delta) {
              finalText += delta
              send({ type: 'text', delta })
            }
          } else if (chunk.type === 'error') {
            const err = (chunk as any).error
            console.error(`[chat] stream error chunk:`, err)
            if (!finalText) {
              send({ type: 'error', message: "I'm having trouble right now. Please try again in a moment." })
            }
          }
        }
      } catch (err) {
        console.error(`[chat] ❌ ERROR after ${Date.now() - t0}ms:`, err)
        send({ type: 'error', message: "I'm having trouble right now. Please try again in a moment." })
      }

      // Build memory update payload
      let memoryUpdate: Record<string, unknown> | null = null
      if (projects.length > 0 && toolArgsList.length > 0) {
        try {
          const raw = JSON.parse(toolArgsList[toolArgsList.length - 1]) as Record<string, unknown>
          const newViewedSlugs = projects.map((p) => p.slug)
          const existingViewed = (userMemoryResult?.viewed_slugs as string[]) ?? []
          const mergedViewed = [...new Set([...existingViewed, ...newViewedSlugs])]

          memoryUpdate = { viewed_slugs: mergedViewed }
          if (raw.bhk)            memoryUpdate.bhk_preference   = Number(raw.bhk)
          if (raw.budget_min_cr)  memoryUpdate.budget_min_cr    = Number(raw.budget_min_cr)
          if (raw.budget_max_cr)  memoryUpdate.budget_max_cr    = Number(raw.budget_max_cr)
          if (raw.sector)         memoryUpdate.sector_preference = raw.sector
        } catch { /* ok */ }
      }

      // Send done event immediately — client unblocks before DB writes
      send({
        type: 'done',
        data: {
          session_id: sessionId,
          showRecommendations: projects.length > 0,
          chatPhase,
        },
      })
      streamClosed = true

      // Persist before closing stream — keeps lambda alive until writes complete
      const persistPromises: Promise<unknown>[] = [
        ...(finalText.trim()
          ? [prisma.chatMessage.create({
              data: { session_id: sessionId, role: 'assistant', content: finalText },
            })]
          : []),
        prisma.chatSession.update({
          where: { id: sessionId },
          data: {
            message_count: { increment: 2 },
            ...(!session?.title && { title: rawMessage.slice(0, 60) }),
            ...(chatPhase === 'ADVISOR' && { chat_phase: chatPhase } as any),
            ...(projects.length > 0 && { last_projects: projects as unknown as Prisma.JsonArray } as any),
          },
        }),
        ...(memoryUpdate
          ? [prisma.userMemory.upsert({
              where: { user_id: userId },
              create: { user_id: userId, ...memoryUpdate },
              update: memoryUpdate,
            })]
          : []),
      ]

      await Promise.all(persistPromises).catch((e) => console.error('[chat] persist failed:', e))
      // Bust sidebar cache so next load reflects new session title
      if (!session?.title) await invalidateSessionListCache(userId)
      controller.close()
    }
  })

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-RateLimit-Remaining': String(remaining),
    },
  })
}
