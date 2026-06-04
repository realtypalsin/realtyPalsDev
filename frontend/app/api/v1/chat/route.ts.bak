import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { groq, GROQ_SMART } from '@/lib/ai/groq'
import { cerebras, CEREBRAS_SMART } from '@/lib/ai/cerebras'
import { tavilySearch, formatTavilyContext } from '@/lib/ai/tavily'
import { buildSystemPrompt } from '@/lib/ai/prompts'
import { searchProjects } from '@/lib/repositories/projectRepository'
import { normalizeQuery } from '@/lib/normalize'
import { checkRateLimit, getCached, setCached, makeKey } from '@/lib/redis'
import { getCommuteTime } from '@/lib/google-maps'
import { jinaRead } from '@/lib/ai/jina'
import { getAreaInfo } from '@/lib/wikipedia'
import { calculateEmi, calculateStampDuty, calculateGst, formatInr } from '@/lib/calculators'
import type { SearchFilters } from '@/lib/repositories/projectRepository'
import type { ProjectCard } from '@/types/project'
import type { UserMemoryContext } from '@/lib/ai/prompts'
import type { Prisma } from '@prisma/client'

const MAX_HISTORY = 40

const BodySchema = z.object({
  message: z.string().min(1).max(2000).trim(),
  session_id: z.string().uuid().optional(),
})

function getUserId(req: NextRequest): string | null {
  return req.headers.get('x-user-id')
}

function getSmartModel(): string {
  if (process.env.CHAT_PROVIDER === 'cerebras' && cerebras) return CEREBRAS_SMART
  return GROQ_SMART
}

function getSmartClient() {
  if (process.env.CHAT_PROVIDER === 'cerebras' && cerebras) return cerebras
  return groq
}

function formatProjects(projects: ProjectCard[]): string {
  return projects
    .map(
      (p, i) =>
        `[Property ${i + 1}] ${p.name} by ${p.builder.name}\n` +
        `Location: ${p.sector}, ${p.city}\n` +
        `Price: ${p.price_range_label}\n` +
        `Configs: ${p.unit_types.map((u) => u.name).join(', ')}\n` +
        `Status: ${p.status.replace(/_/g, ' ')}\n` +
        `RERA: ${p.rera_number ?? 'Not registered'}\n` +
        `Amenities: ${p.top_amenities.map((a) => a.name).slice(0, 5).join(', ')}\n` +
        `Connectivity: ${p.top_connectivity.map((c) => c.name).join(', ')}`,
    )
    .join('\n\n---\n\n')
}

// Numeric fields accept string OR number — small models (8b) sometimes emit strings.
const NUM_OR_STR = { anyOf: [{ type: 'number' }, { type: 'string' }] }

const SEARCH_PROPERTIES_TOOL = {
  type: 'function' as const,
  function: {
    name: 'search_properties',
    description:
      'Search the RealtyPals property database. ' +
      'Call ONLY when the user has explicitly named a city or sector in this conversation. ' +
      'NEVER call without a confirmed location.',
    parameters: {
      type: 'object' as const,
      properties: {
        city:                { type: 'string', description: 'City e.g. "Noida"' },
        sector:              { type: 'string', description: 'Sector e.g. "Sector 150"' },
        bhk:                 { ...NUM_OR_STR, description: 'Bedrooms 1–5' },
        budget_max_cr:       { ...NUM_OR_STR, description: 'Max budget in crores e.g. 1.5' },
        budget_min_cr:       { ...NUM_OR_STR, description: 'Min budget in crores e.g. 1.0' },
        possession_year_max: { ...NUM_OR_STR, description: 'Latest possession year e.g. 2026' },
      },
      required: [] as string[],
    },
  },
}

const SEARCH_WEB_TOOL = {
  type: 'function' as const,
  function: {
    name: 'search_web',
    description:
      'Search the web for real-time information. Use when asked about: ' +
      'builder reputation, delivery track record, builder news/controversies, ' +
      'sector infrastructure updates, metro expansion, RERA status of a project, ' +
      'market trends, school/hospital quality in an area, or any current events. ' +
      'Do NOT use for property listings — use search_properties for that.',
    parameters: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Specific search query e.g. "ATS builder Noida delivery track record complaints 2024"',
        },
      },
      required: ['query'] as string[],
    },
  },
}

const COMMUTE_TOOL = {
  type: 'function' as const,
  function: {
    name: 'get_commute_time',
    description:
      'Calculate driving and transit time between two locations in India. ' +
      'Use when user asks: "how far is X from Y", "commute time", "kitna door hai", ' +
      '"how long to reach [office/metro/airport]", or when a property address and a destination are both known.',
    parameters: {
      type: 'object' as const,
      properties: {
        origin: {
          type: 'string',
          description: 'Full address or location name, e.g. "ACE Parkway, Sector 150, Noida"',
        },
        destination: {
          type: 'string',
          description: 'Destination address or place, e.g. "Cyber City, Gurgaon" or "Connaught Place, Delhi"',
        },
      },
      required: ['origin', 'destination'] as string[],
    },
  },
}

const CALCULATE_EMI_TOOL = {
  type: 'function' as const,
  function: {
    name: 'calculate_emi',
    description:
      'Calculate monthly home loan EMI, total interest, and total payment. ' +
      'Use when user asks about EMI, "kitna EMI hoga", monthly payment, affordability, loan repayment.',
    parameters: {
      type: 'object' as const,
      properties: {
        principal_cr: { ...NUM_OR_STR, description: 'Loan amount in crores e.g. 1.2' },
        annual_rate:  { ...NUM_OR_STR, description: 'Annual interest rate percent e.g. 8.5' },
        tenure_years: { ...NUM_OR_STR, description: 'Loan tenure in years e.g. 20' },
      },
      required: ['principal_cr', 'annual_rate', 'tenure_years'] as string[],
    },
  },
}

const CALCULATE_STAMP_TOOL = {
  type: 'function' as const,
  function: {
    name: 'calculate_stamp_duty',
    description:
      'Calculate UP stamp duty and registration charges for a property purchase. ' +
      'Use when asked about stamp duty, registration cost, "registration kitna hoga".',
    parameters: {
      type: 'object' as const,
      properties: {
        price_cr:     { ...NUM_OR_STR, description: 'Property price in crores' },
        buyer_gender: {
          type: 'string' as const,
          enum: ['male', 'female', 'joint'],
          description: 'Buyer gender — affects stamp duty rate',
        },
      },
      required: ['price_cr'] as string[],
    },
  },
}

const CALCULATE_GST_TOOL = {
  type: 'function' as const,
  function: {
    name: 'calculate_gst',
    description:
      'Calculate GST applicable on a property. ' +
      'Use when asked about GST, "kitna GST lagega", tax on property purchase.',
    parameters: {
      type: 'object' as const,
      properties: {
        price_cr:   { ...NUM_OR_STR, description: 'Property price in crores' },
        status:     { type: 'string' as const, enum: ['under_construction', 'ready_to_move'] },
        carpet_sqm: { ...NUM_OR_STR, description: 'Carpet area in sqm (needed to check affordable housing bracket)' },
      },
      required: ['price_cr', 'status'] as string[],
    },
  },
}

const GET_AREA_INFO_TOOL = {
  type: 'function' as const,
  function: {
    name: 'get_area_info',
    description:
      'Get background information about a Noida sector or area from Wikipedia. ' +
      'Use when asked: "tell me about Sector 150", "how is this area", "kya hai yahan".',
    parameters: {
      type: 'object' as const,
      properties: {
        sector: { type: 'string' as const, description: 'Sector name e.g. "Sector 150"' },
        city:   { type: 'string' as const, description: 'City e.g. "Noida"' },
      },
      required: ['sector', 'city'] as string[],
    },
  },
}

const READ_RERA_TOOL = {
  type: 'function' as const,
  function: {
    name: 'read_rera_page',
    description:
      'Fetch live RERA registration details from UP-RERA portal. ' +
      'Use when asked to verify RERA status, "RERA check karo", "is this registered with RERA".',
    parameters: {
      type: 'object' as const,
      properties: {
        rera_number: { type: 'string' as const, description: 'RERA registration number e.g. UPRERAPRJ12345' },
        rera_url:    { type: 'string' as const, description: 'Direct URL to RERA project page if available' },
      },
      required: [] as string[],
    },
  },
}

const TOOLS = [
  SEARCH_PROPERTIES_TOOL,
  SEARCH_WEB_TOOL,
  COMMUTE_TOOL,
  CALCULATE_EMI_TOOL,
  CALCULATE_STAMP_TOOL,
  CALCULATE_GST_TOOL,
  GET_AREA_INFO_TOOL,
  READ_RERA_TOOL,
]

const KNOWN_TOOL_NAMES = new Set([
  'search_properties', 'search_web', 'get_commute_time',
  'calculate_emi', 'calculate_stamp_duty', 'calculate_gst',
  'get_area_info', 'read_rera_page',
])

/** Coerce string numbers → actual numbers (8b models send strings for numeric fields) */
function coerceFilters(raw: Record<string, unknown>): SearchFilters {
  const n = (v: unknown) => (v != null && v !== '' ? Number(v) : undefined)
  return {
    city:                typeof raw.city === 'string' ? raw.city : undefined,
    sector:              typeof raw.sector === 'string' ? raw.sector : undefined,
    bhk:                 n(raw.bhk),
    budget_max_cr:       n(raw.budget_max_cr),
    budget_min_cr:       n(raw.budget_min_cr),
    possession_year_max: n(raw.possession_year_max),
  }
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request)
  if (!userId) {
    return new Response(JSON.stringify({ error: 'X-User-Id header required' }), { status: 400 })
  }

  // Rate limit: 15 messages per user per 60 seconds
  const { allowed, remaining } = await checkRateLimit(userId)
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: 'Too many messages. Please wait a moment before sending again.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': '0',
          'Retry-After': '60',
        },
      },
    )
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

  // ── Parallel: fetch session + user memory ───────────────────────────────
  const [sessionResult, userMemoryResult] = await Promise.all([
    session_id
      ? prisma.chatSession.findUnique({
          where: { id: session_id },
          include: { messages: { orderBy: { created_at: 'asc' }, take: MAX_HISTORY } },
        })
      : Promise.resolve(null),
    prisma.userMemory.findUnique({ where: { user_id: userId } }).catch(() => null),
  ])

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

  const saveUserMsg = prisma.chatMessage.create({
    data: { session_id: sessionId, role: 'user', content: rawMessage },
  })

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

  console.log(`[chat] ▶ user="${message.slice(0, 120)}" session=${sessionId?.slice(0, 8) ?? 'new'} uid=${userId.slice(0, 8)}`)

  const responseStream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch { /* controller closed */ }
      }

      let finalText = ''
      let projects: ProjectCard[] = []
      let chatPhase: 'DISCOVERY' | 'ADVISOR' = 'DISCOVERY'
      // Stores tool call info for memory extraction after tool execution
      let toolArgsForMemory: string | null = null

      try {
        // ── Single-pass: stream first call. Forward text immediately; buffer tool calls. ──
        const firstStream = await groq.chat.completions.create({
          model: GROQ_SMART,
          messages: [{ role: 'system', content: systemPrompt }, ...chatMessages],
          tools: TOOLS,
          tool_choice: 'auto',
          temperature: 0,
          max_tokens: 1024,
          stream: true as const,
        })

        let toolCallId = ''
        let toolCallName = ''
        let toolCallArgs = ''
        let isToolCall = false

        for await (const chunk of firstStream) {
          const delta = chunk.choices[0]?.delta
          if (!delta) continue

          if (delta.tool_calls?.length) {
            isToolCall = true
            const tc = delta.tool_calls[0]
            if (tc.id) toolCallId = tc.id
            if (tc.function?.name) toolCallName += tc.function.name
            if (tc.function?.arguments) toolCallArgs += tc.function.arguments
          } else if (delta.content) {
            // No tool — stream tokens directly to user (single pass, no second call)
            finalText += delta.content
            send({ type: 'text', delta: delta.content })
          }
        }

        // ── Hallucination guard ──────────────────────────────────────────────
        if (isToolCall && !KNOWN_TOOL_NAMES.has(toolCallName)) {
          console.warn(`[chat] ⚠ hallucinated tool ignored: "${toolCallName}" — falling back to direct stream`)
          await saveUserMsg
          const fallbackStream = await getSmartClient().chat.completions.create({
            model: getSmartModel(),
            messages: [{ role: 'system', content: systemPrompt }, ...chatMessages],
            temperature: 0.3,
            max_tokens: 1024,
            stream: true as const,
          })
          finalText = ''
          for await (const chunk of fallbackStream) {
            const delta = chunk.choices[0]?.delta?.content
            if (delta) { finalText += delta; send({ type: 'text', delta }) }
          }
          await persistAndDone()
          return
        }

        // ── No tool — text was already streamed above ─────────────────────────
        if (!isToolCall) {
          await saveUserMsg
          await persistAndDone()
          return
        }

        // ── Tool path ────────────────────────────────────────────────────────
        console.log(`[chat] 🔧 tool=${toolCallName} args=${toolCallArgs.slice(0, 200)}`)
        toolArgsForMemory = toolCallArgs

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const secondMessages: any[] = [
          { role: 'system', content: systemPrompt },
          ...chatMessages,
          {
            role: 'assistant',
            content: null,
            tool_calls: [{
              id: toolCallId,
              type: 'function',
              function: { name: toolCallName, arguments: toolCallArgs },
            }],
          },
        ]

        if (toolCallName === 'search_properties') {
          send({ type: 'searching' })

          let filters: SearchFilters = {}
          try {
            const raw = JSON.parse(toolCallArgs) as Record<string, unknown>
            filters = coerceFilters(raw)
          } catch { /* ok */ }

          console.log(`[chat] 🔍 search_properties filters:`, JSON.stringify(filters))

          const [, searchResults] = await Promise.all([
            saveUserMsg,
            searchProjects(filters, message),
          ])
          projects = searchResults
          chatPhase = 'ADVISOR'

          console.log(`[chat] 📦 found ${projects.length} project(s): ${projects.map(p => p.slug).join(', ')}`)

          const toolResult =
            projects.length === 0
              ? 'No properties found. Tell the user we have limited inventory and ask if they want to broaden their search.'
              : formatProjects(projects)

          secondMessages.push({ role: 'tool', tool_call_id: toolCallId, content: toolResult })

        } else if (toolCallName === 'search_web') {
          send({ type: 'searching' })

          let webQuery = ''
          try { webQuery = JSON.parse(toolCallArgs).query as string } catch { /* ok */ }

          console.log(`[chat] 🌐 search_web query="${webQuery}"`)

          const webCacheKey = makeKey('websearch', webQuery.toLowerCase().slice(0, 120))
          let webContext = await getCached<string>(webCacheKey)

          try {
            if (!webContext) {
              const [, webResult] = await Promise.all([
                saveUserMsg,
                tavilySearch(webQuery, 3),
              ])
              webContext = formatTavilyContext(webResult.answer, webResult.results) || ''
              console.log(`[chat] 🌐 web src=${webResult.source} results=${webResult.results.length} cached=false`)
              if (webContext) await setCached(webCacheKey, webContext, 60 * 60 * 24)
            } else {
              console.log(`[chat] 🌐 web cached=true`)
              await saveUserMsg
            }
          } catch (toolErr) {
            console.warn('[chat] web search failed:', toolErr instanceof Error ? toolErr.message : toolErr)
            await saveUserMsg.catch(() => {})
            webContext = ''
          }

          secondMessages.push({
            role: 'tool',
            tool_call_id: toolCallId,
            content: webContext || 'No current information found for this query. Answer from your training knowledge.',
          })

        } else if (toolCallName === 'get_commute_time') {
          send({ type: 'searching' })

          let origin = '', destination = ''
          try {
            const args = JSON.parse(toolCallArgs)
            origin = args.origin as string
            destination = args.destination as string
          } catch { /* ok */ }

          console.log(`[chat] 🗺 commute origin="${origin}" → dest="${destination}"`)

          const commuteKey = makeKey('commute', origin.toLowerCase(), destination.toLowerCase())
          let commuteData = await getCached<object>(commuteKey)

          try {
            if (!commuteData) {
              const [, result] = await Promise.all([saveUserMsg, getCommuteTime(origin, destination)])
              if (result) {
                commuteData = result
                await setCached(commuteKey, result, 60 * 60 * 6)
              }
            } else {
              await saveUserMsg
            }
          } catch (toolErr) {
            console.warn('[chat] commute tool failed:', toolErr instanceof Error ? toolErr.message : toolErr)
            await saveUserMsg.catch(() => {})
          }

          secondMessages.push({
            role: 'tool',
            tool_call_id: toolCallId,
            content: commuteData
              ? JSON.stringify(commuteData)
              : `Could not calculate commute from "${origin}" to "${destination}". Share approximate distance/travel time from general knowledge.`,
          })

        } else if (toolCallName === 'calculate_emi') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const args: any = { principal_cr: 1, annual_rate: 8.5, tenure_years: 20 }
          try { Object.assign(args, JSON.parse(toolCallArgs)) } catch { /* ok */ }
          console.log(`[chat] 🧮 calculate_emi principal=${args.principal_cr}Cr rate=${args.annual_rate}% tenure=${args.tenure_years}yr`)
          const r = calculateEmi(Number(args.principal_cr), Number(args.annual_rate), Number(args.tenure_years))
          const toolResult = [
            `Monthly EMI: ${formatInr(r.emi_monthly)}`,
            `Loan amount: ${formatInr(r.principal)} @ ${r.annual_rate}% p.a. for ${r.tenure_months / 12} years`,
            `Total payment: ${formatInr(r.total_payment)}`,
            `Total interest: ${formatInr(r.total_interest)}`,
          ].join('\n')
          await saveUserMsg
          secondMessages.push({ role: 'tool', tool_call_id: toolCallId, content: toolResult })

        } else if (toolCallName === 'calculate_stamp_duty') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const args: any = { price_cr: 1, buyer_gender: 'male' }
          try { Object.assign(args, JSON.parse(toolCallArgs)) } catch { /* ok */ }
          const r = calculateStampDuty(Number(args.price_cr), args.buyer_gender ?? 'male')
          const toolResult = [
            `Stamp Duty (${r.stamp_duty_rate}%): ${formatInr(r.stamp_duty)}`,
            `Registration (1%): ${formatInr(r.registration)}`,
            `Total govt charges: ${formatInr(r.total_charges)}`,
            `Note: ${r.note}`,
          ].join('\n')
          await saveUserMsg
          secondMessages.push({ role: 'tool', tool_call_id: toolCallId, content: toolResult })

        } else if (toolCallName === 'calculate_gst') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const args: any = { price_cr: 1, status: 'under_construction', carpet_sqm: 0 }
          try { Object.assign(args, JSON.parse(toolCallArgs)) } catch { /* ok */ }
          const r = calculateGst(Number(args.price_cr), args.status, Number(args.carpet_sqm ?? 0))
          const toolResult = [
            `GST (${r.gst_rate}%): ${formatInr(r.gst_amount)}`,
            `Category: ${r.category.replace('_', ' ')}`,
            `Note: ${r.note}`,
          ].join('\n')
          await saveUserMsg
          secondMessages.push({ role: 'tool', tool_call_id: toolCallId, content: toolResult })

        } else if (toolCallName === 'get_area_info') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const args: any = { sector: 'Sector 150', city: 'Noida' }
          try { Object.assign(args, JSON.parse(toolCallArgs)) } catch { /* ok */ }
          const [, wikiResult] = await Promise.all([saveUserMsg, getAreaInfo(args.sector, args.city)])
          const toolResult = wikiResult
            ? `${wikiResult.title}: ${wikiResult.extract}\nSource: ${wikiResult.url}`
            : `No Wikipedia article found for ${args.sector}, ${args.city}. Answer from your knowledge of Noida.`
          secondMessages.push({ role: 'tool', tool_call_id: toolCallId, content: toolResult })

        } else if (toolCallName === 'read_rera_page') {
          send({ type: 'searching' })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const args: any = {}
          try { Object.assign(args, JSON.parse(toolCallArgs)) } catch { /* ok */ }
          const reraUrl: string = args.rera_url || (args.rera_number
            ? `https://www.up-rera.in/projects?project_search=${encodeURIComponent(args.rera_number)}`
            : 'https://www.up-rera.in')
          let reraContent: string | null = null
          try {
            const [, content] = await Promise.all([saveUserMsg, jinaRead(reraUrl, 2000)])
            reraContent = content
          } catch (toolErr) {
            console.warn('[chat] RERA read failed:', toolErr instanceof Error ? toolErr.message : toolErr)
            await saveUserMsg.catch(() => {})
          }
          const toolResult = reraContent
            ? `RERA page for ${args.rera_number || 'search'}:\n${reraContent}`
            : `Could not fetch RERA page. Advise user to visit https://www.up-rera.in directly.`
          secondMessages.push({ role: 'tool', tool_call_id: toolCallId, content: toolResult })
        }

        // ── Second pass: stream the advisor response ──────────────────────────
        const streamResp = await getSmartClient().chat.completions.create({
          model: getSmartModel(),
          messages: secondMessages,
          temperature: 0.3,
          max_tokens: 1024,
          stream: true as const,
        })

        for await (const chunk of streamResp) {
          const delta = chunk.choices[0]?.delta?.content
          if (delta) { finalText += delta; send({ type: 'text', delta }) }
        }

        await persistAndDone()

      } catch (err) {
        const errMsg2 = err instanceof Error ? err.message : String(err)
        console.error(`[chat] ❌ ERROR after ${Date.now() - t0}ms:`, errMsg2)
        const errMsg = "I'm having trouble right now. Please try again in a moment."
        await Promise.all([
          saveUserMsg.catch(() => {}),
          prisma.chatMessage.create({
            data: { session_id: sessionId, role: 'assistant', content: errMsg },
          }).catch(() => {}),
        ])
        send({ type: 'error', message: errMsg })
      } finally {
        controller.close()
      }

      async function persistAndDone() {
        const persistPromises: Promise<unknown>[] = [
          prisma.chatMessage.create({
            data: { session_id: sessionId, role: 'assistant', content: finalText || '...' },
          }),
          prisma.chatSession.update({
            where: { id: sessionId },
            data: {
              message_count: { increment: 2 },
              ...(!session?.title && { title: rawMessage.slice(0, 60) }),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ...(chatPhase === 'ADVISOR' && { chat_phase: chatPhase } as any),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ...(projects.length > 0 && { last_projects: projects as unknown as Prisma.JsonArray } as any),
            },
          }),
        ]

        if (projects.length > 0) {
          let filters: SearchFilters = {}
          try {
            if (toolArgsForMemory) filters = coerceFilters(JSON.parse(toolArgsForMemory) as Record<string, unknown>)
          } catch { /* ok */ }

          const newViewedSlugs = projects.map((p) => p.slug)
          const existingViewed = (userMemoryResult?.viewed_slugs as string[]) ?? []
          const mergedViewed = [...new Set([...existingViewed, ...newViewedSlugs])]

          const memoryUpdate: Record<string, unknown> = { viewed_slugs: mergedViewed }
          if (filters.bhk)            memoryUpdate.bhk_preference     = filters.bhk
          if (filters.budget_min_cr)  memoryUpdate.budget_min_cr      = filters.budget_min_cr
          if (filters.budget_max_cr)  memoryUpdate.budget_max_cr      = filters.budget_max_cr
          if (filters.sector)         memoryUpdate.sector_preference   = filters.sector

          console.log(`[chat] 💾 memory update: ${Object.keys(memoryUpdate).join(', ')} | viewed=${mergedViewed.length} slugs`)

          persistPromises.push(
            prisma.userMemory.upsert({
              where: { user_id: userId! },
              create: { user_id: userId!, ...memoryUpdate },
              update: memoryUpdate,
            }).catch((e) => console.error('[chat] ❌ memory upsert failed:', e)),
          )
        }

        await Promise.all(persistPromises)
        console.log(`[chat] ✅ done in ${Date.now() - t0}ms | phase=${chatPhase} projects=${projects.length} chars=${finalText.length}`)

        send({
          type: 'done',
          data: {
            session_id: sessionId,
            showRecommendations: projects.length > 0,
            projects: projects.length > 0 ? projects : undefined,
            chatPhase,
          },
        })
      }
    },
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
