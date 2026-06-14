import { NextRequest } from 'next/server'

// Vercel Pro allows up to 60s; streaming chat needs this
export const maxDuration = 60
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { createGroq } from '@ai-sdk/groq'
import { streamText, tool, stepCountIs } from 'ai'
import { tavilySearch, formatTavilyContext } from '@/lib/ai/tavily'
import { buildSystemPrompt } from '@/lib/ai/prompts'
import { searchProjects, scoreAndRankProjects } from '@/lib/repositories/projectRepository'
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

// Reduced from 12 — 8 turns covers all real sessions without burning tokens
const MAX_HISTORY = 8

// Raised from 3 — complex queries (search + EMI + RERA) can need up to 5 steps
const MAX_STEPS = 5

// Hard ceiling on entire request — prevents hung streams blocking Vercel function slots
const REQUEST_TIMEOUT_MS = 30_000

const BodySchema = z.object({
  message: z.string().min(1).max(2000).trim(),
  session_id: z.string().uuid().optional(),
})

function getUserId(req: NextRequest): string | null {
  return req.headers.get('x-user-id')
}

if (!process.env.GROQ_API_KEY) {
  console.error('[chat] GROQ_API_KEY not set — chat will not work')
}

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY ?? '' })

function getModel() {
  return groq('llama-3.3-70b-versatile')
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

  // Combined abort: client disconnect OR 30s hard timeout
  const timeoutController = new AbortController()
  const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS)
  const combinedSignal = AbortSignal.any
    ? AbortSignal.any([request.signal, timeoutController.signal])
    : timeoutController.signal

  const responseStream = new ReadableStream({
    async start(controller) {
      let streamClosed = false
      const send = (data: object) => {
        if (streamClosed) return
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) } catch {}
      }

      let finalText = ''
      let projects: ProjectCard[] = []
      let chatPhase: string = 'DISCOVERY'
      const toolArgsList: string[] = []

      // Memory signals extracted from ANY tool call, not just search_properties
      const memorySignals: Record<string, unknown> = {}

      try {
        const result = streamText({
          model: getModel(),
          messages: chatMessages,
          system: systemPrompt,
          stopWhen: stepCountIs(MAX_STEPS),
          abortSignal: combinedSignal,
          tools: {
            search_properties: tool({
              description: 'Search the RealtyPals property database. Covers Noida and Greater Noida ONLY. Call when the user has named a Noida/Greater Noida location. For other cities do NOT call — use search_web for market context instead.',
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

                // Capture signals for memory update
                if (args.bhk)            memorySignals.bhk_preference   = Number(args.bhk)
                if (args.budget_min_cr)  memorySignals.budget_min_cr    = Number(args.budget_min_cr)
                if (args.budget_max_cr)  memorySignals.budget_max_cr    = Number(args.budget_max_cr)
                if (args.sector)         memorySignals.sector_preference = args.sector

                const filters: SearchFilters = {
                  city: args.city,
                  sector: args.sector,
                  bhk: args.bhk ? Number(args.bhk) : undefined,
                  budget_max_cr: args.budget_max_cr ? Number(args.budget_max_cr) : undefined,
                  budget_min_cr: args.budget_min_cr ? Number(args.budget_min_cr) : undefined,
                  possession_year_max: args.possession_year_max ? Number(args.possession_year_max) : undefined,
                }

                const dbResults = await searchProjects(filters, message)

                if (dbResults.length === 0) {
                  return 'No properties found matching those criteria. Tell the user inventory is limited and suggest broadening — higher budget, adjacent sector, or different possession timeline.'
                }

                const finalResults = scoreAndRankProjects(dbResults, filters, message)

                projects = finalResults
                chatPhase = 'ADVISOR'

                send({ type: 'properties', data: finalResults })

                const hasEstimatedPrices = finalResults.some((p) =>
                  (p as any).unit_types?.some((u: any) => u.price_is_estimated)
                )
                const priceWarning = hasEstimatedPrices
                  ? ' Note: some prices are indicative — advise user to confirm with builder.'
                  : ''

                const location = args.sector ?? args.city ?? 'the area'
                return `Found ${finalResults.length} verified properties in ${location}. Cards are displayed to the user.${priceWarning} Write a 2–3 sentence advisory summary: lead with the best-fit property and one specific reason, then note one honest trade-off. Under 100 words. Do not repeat specs shown on cards. Only reference prices already shown in the cards — never estimate.`
              }
            }),

            search_web: tool({
              description: 'Search the web for real-time information: builder reputation, delivery track record, RERA status, infrastructure updates, market trends, school/hospital quality, out-of-coverage city market data. Do NOT use for property listings.',
              inputSchema: z.object({
                query: z.string().describe('Specific query e.g. "ATS builder Noida delivery track record complaints 2024"'),
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
                    return 'Could not fetch web data. Answer from training knowledge and note it may not be current.'
                  }
                }
                return webContext || 'No current information found. Answer from training knowledge and caveat.'
              }
            }),

            get_commute_time: tool({
              description: 'Calculate driving and transit time between two locations. Use when user asks about commute, "how far is X from Y", "kitna door hai".',
              inputSchema: z.object({
                origin: z.string().describe('Full address or location, e.g. "ACE Parkway, Sector 150, Noida"'),
                destination: z.string().describe('Destination, e.g. "Cyber City, Gurgaon"'),
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
                  : `Could not calculate commute. Share approximate distance from general knowledge.`
              }
            }),

            calculate_emi: tool({
              description: 'Calculate monthly home loan EMI, total interest, and total payment. Use when asked about EMI, monthly payment, "kitna EMI hoga". If calculating for a specific property from search results, pass project_slug and the price shown in the card. For general EMI questions, pass principal_cr directly.',
              inputSchema: z.object({
                project_slug: z.string().optional().describe('Slug of a specific property from search results — tool will fetch the exact price from database'),
                bhk: z.union([z.number(), z.string()]).optional().describe('BHK type to use when looking up price from project_slug'),
                down_payment_pct: z.number().min(10).max(90).optional().describe('Down payment as percentage (e.g. 20 for 20%). Used with project_slug. Default 20%.'),
                principal_cr: z.union([z.number(), z.string()]).optional().describe('Loan amount in crores — provide this OR project_slug, not both'),
                annual_rate: z.union([z.number(), z.string()]).describe('Annual interest rate percent e.g. 8.5'),
                tenure_years: z.union([z.number(), z.string()]).describe('Loan tenure in years e.g. 20'),
              }),
              execute: async ({ project_slug, bhk, down_payment_pct, principal_cr, annual_rate, tenure_years }) => {
                let loanAmount_cr: number
                let propertyLabel = ''
                let priceNote = ''

                if (project_slug) {
                  const project = await prisma.project.findUnique({
                    where: { slug: project_slug },
                    include: {
                      unit_types: {
                        where: bhk ? { bhk: Number(bhk) } : undefined,
                        orderBy: { price_min_cr: 'asc' },
                        take: 1,
                      },
                    },
                  })

                  if (project && project.unit_types.length > 0) {
                    const unit = project.unit_types[0]
                    const price = unit.price_min_cr ?? unit.price_max_cr
                    if (!price) {
                      return 'Price not available in our database for this property. Please confirm price with the builder and use a general EMI calculation.'
                    }
                    const dp = (down_payment_pct ?? 20) / 100
                    const downpayment = price * dp
                    loanAmount_cr = price * (1 - dp)
                    propertyLabel = `${project.name}${bhk ? ` ${bhk}BHK` : ''}`
                    priceNote = `\nProperty price: ₹${price.toFixed(2)} Cr | Down payment (${down_payment_pct ?? 20}%): ₹${downpayment.toFixed(2)} Cr`
                    if ((unit as any).price_is_estimated) {
                      priceNote += '\n⚠️ Price is indicative — verify with builder before finalizing.'
                    }
                    memorySignals.budget_max_cr = price
                  } else {
                    return `Could not find price data for ${project_slug}. Please check with the builder directly or provide the price manually.`
                  }
                } else if (principal_cr != null) {
                  loanAmount_cr = Number(principal_cr)
                  propertyLabel = 'General calculation'
                  // Infer max budget from loan amount (loan / 0.8 = ~total price at 20% down)
                  memorySignals.budget_max_cr = Math.round(Number(principal_cr) / 0.8 * 100) / 100
                } else {
                  return 'Please provide either a property slug or a loan amount (principal_cr) to calculate EMI.'
                }

                const r = calculateEmi(loanAmount_cr, Number(annual_rate), Number(tenure_years))
                return [
                  propertyLabel ? `EMI for ${propertyLabel}:` : 'EMI Calculation:',
                  priceNote,
                  `Loan amount: ${formatInr(r.principal)} @ ${r.annual_rate}% p.a. for ${r.tenure_months / 12} years`,
                  `Monthly EMI: ${formatInr(r.emi_monthly)}`,
                  `Total payment: ${formatInr(r.total_payment)}`,
                  `Total interest paid: ${formatInr(r.total_interest)}`,
                ].filter(Boolean).join('\n')
              }
            }),

            calculate_stamp_duty: tool({
              description: 'Calculate UP stamp duty and registration charges. Use when asked about stamp duty, registration cost, "registration kitna hoga".',
              inputSchema: z.object({
                price_cr: z.union([z.number(), z.string()]).describe('Property price in crores'),
                buyer_gender: z.enum(['male', 'female', 'joint']).optional().describe('Buyer gender — affects stamp duty rate'),
              }),
              execute: async ({ price_cr, buyer_gender }) => {
                memorySignals.budget_max_cr = Number(price_cr)
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
              description: 'Calculate GST on a property. Use when asked about GST, "kitna GST lagega".',
              inputSchema: z.object({
                price_cr: z.union([z.number(), z.string()]).describe('Property price in crores'),
                status: z.enum(['under_construction', 'ready_to_move']),
                carpet_sqm: z.union([z.number(), z.string()]).optional().describe('Carpet area in sqm'),
              }),
              execute: async ({ price_cr, status, carpet_sqm }) => {
                memorySignals.budget_max_cr = Number(price_cr)
                const r = calculateGst(Number(price_cr), status, Number(carpet_sqm ?? 0))
                return [
                  `GST (${r.gst_rate}%): ${formatInr(r.gst_amount)}`,
                  `Category: ${r.category.replace('_', ' ')}`,
                  `Note: ${r.note}`,
                ].join('\n')
              }
            }),

            get_area_info: tool({
              description: 'Get background on a Noida sector from Wikipedia. Use when asked about an area: "tell me about Sector 150", "how is this area".',
              inputSchema: z.object({
                sector: z.string().describe('Sector name e.g. "Sector 150"'),
                city: z.string().describe('City e.g. "Noida"'),
              }),
              execute: async ({ sector, city }) => {
                memorySignals.sector_preference = sector
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
              description: 'Fetch live RERA details from UP-RERA portal. Use when asked to verify RERA status, "RERA check karo".',
              inputSchema: z.object({
                rera_number: z.string().optional().describe('RERA registration number e.g. UPRERAPRJ12345'),
                rera_url: z.string().optional().describe('Direct URL to RERA project page if available'),
              }),
              execute: async ({ rera_number, rera_url }) => {
                send({ type: 'searching' })
                const safeReraUrl = rera_url && rera_url.includes('up-rera.in') ? rera_url : null
                const url = safeReraUrl || (rera_number ? `https://www.up-rera.in/projects?project_search=${encodeURIComponent(rera_number)}` : 'https://www.up-rera.in')
                try {
                  const content = await Promise.race([
                    jinaRead(url, 2000),
                    new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000)),
                  ])
                  return content ? `RERA page for ${rera_number || 'search'}:\n${content}` : 'Could not fetch RERA page. Advise user to visit https://www.up-rera.in directly.'
                } catch {
                  return 'Could not fetch RERA page. Advise user to visit https://www.up-rera.in directly.'
                }
              }
            }),
          }
        })

        await prisma.chatMessage.create({
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
      } finally {
        clearTimeout(timeoutId)
      }

      // Build memory update from ALL tool signals (EMI, stamp duty, area queries, not just search)
      let memoryUpdate: Record<string, unknown> | null = null
      const hasSignals = Object.keys(memorySignals).length > 0 || projects.length > 0

      if (hasSignals) {
        const newViewedSlugs = projects.map((p) => p.slug)
        const existingViewed = (userMemoryResult?.viewed_slugs as string[]) ?? []
        const mergedViewed = [...new Set([...existingViewed, ...newViewedSlugs])].slice(-50)

        memoryUpdate = {
          ...(newViewedSlugs.length > 0 && { viewed_slugs: mergedViewed }),
          ...memorySignals,
        }
      }

      send({
        type: 'done',
        data: {
          session_id: sessionId,
          showRecommendations: projects.length > 0,
          chatPhase,
        },
      })
      streamClosed = true

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
        ...(memoryUpdate && Object.keys(memoryUpdate).length > 0
          ? [prisma.userMemory.upsert({
              where: { user_id: userId },
              create: { user_id: userId, ...memoryUpdate },
              update: memoryUpdate,
            })]
          : []),
      ]

      await Promise.all(persistPromises).catch((e) => console.error('[chat] persist failed:', e))
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
