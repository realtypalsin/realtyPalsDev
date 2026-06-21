// backend/src/routes/chat.ts
import { randomUUID } from 'crypto'
import { Router, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { checkRateLimit, invalidateSessionList, getCached, setCached } from '../lib/cache'
import { extractIntent } from '../lib/ai/intent'
import { getIntentState, discoverProjects, getSectorContext, getAllSectorsOverview } from '../lib/discovery'
import { getMemory, upsertMemory } from '../lib/ai/memory'
import { buildContextMessages } from '../lib/ai/context'
import { maybeCompress } from '../lib/ai/compression'
import { buildAdvisorSystemPrompt } from '../lib/ai/prompts/index'
import { streamWithGroq } from '../lib/ai/groq'
// import { streamWithClaude } from '../lib/ai/claude'
import { streamWithOpenAI, StreamStallError } from '../lib/ai/openai'
import { verifyUser } from '../lib/auth'
import { getBuilderRecord } from '../lib/builders'
import { webSearch, areaInfo, commute, readPage } from '../lib/web'
import { calcEmi, calcStampDuty, calcGst, formatInr } from '../lib/calculators'

const router = Router()

// Appended to system prompt when Groq is used as fallback.
// Groq runs without tool support — no builder_lookup, web_search, rera_check,
// or calculation tools. This suffix overrides default tool-routing instructions
// so the model redirects instead of answering from training memory.
const GROQ_FALLBACK_SUFFIX = `

## FALLBACK MODE — REAL-TIME TOOLS UNAVAILABLE
You are operating without access to real-time tools. builder_lookup, web_search, rera_check, commute, and calculation tools cannot be called in this session.

REQUIRED behavior when a tool would normally be needed:

BUILDER REPUTATION/TRACK RECORD queries (builder_lookup unavailable):
→ DO NOT answer builder quality, delivery reliability, trustworthiness, delay record, or ranking questions from training memory.
→ For single-builder queries: "I'm unable to access our real-time builder database right now. For [builder]'s track record, check up-rera.in for their project filings and search '[builder] complaints' or '[builder] reviews' on Google."
→ For ranking queries ("best builder", "most trustworthy", "fewest delays", "rank top builders in Noida"): "I need to look up each builder in our database to make this comparison — that tool isn't available right now. Try again in a moment, or check up-rera.in and PropTiger for builder track records." STOP. Do NOT add "generally speaking", CREDAI quality signals, "well-regarded builders like", or training-memory builder names after this.
→ For recommendation queries ("which builder would you recommend", "which is best for end-use"): "I can't make a recommendation without verified database data on each builder — that tool isn't available right now. Try again in a moment." STOP. Do NOT add any builder suggestions, established-builder hints, or quality signals after this.
→ For "which builder to avoid" or "which builder is risky" queries:
   - Apply Rule 6c FIRST — these are legal facts, not database lookups. NEVER recommend Supertech Limited, Amrapali Group, Unitech Group, or Wave Infratech for new purchases. State the known legal fact immediately (court proceedings / NBCC takeover / SC-appointed board / RERA cancellations).
   - Apply Rule 6d — Jaypee Greens: state NCLT insolvency of parent company.
   - For ALL other builders: "For other builders, we don't track complaint frequency or delay rates. Check up-rera.in for complaint history and search '[builder] complaints' on Google." STOP. Do NOT add generic risk warnings ("smaller builders tend to", "builders without CREDAI") or training-memory avoidance advice. NEVER name a non-legally-flagged builder as 'avoid' from training memory.
→ Hard Rules 13, 17, 18, 19, and 25 remain fully active in fallback mode.

COST-SHEET CHARGES (maintenance, floor rise, PLC, IFMS, parking, payment plans — Hard Rule 23):
→ These are NEVER in our database. Hard Rule 23 remains fully active in fallback mode.
→ Respond: "We don't track [charge name] in our database — request the complete cost sheet from the builder's sales team."
→ DO NOT say "typically ₹X" even in fallback mode. These numbers vary by project and any estimate will be wrong.

RERA VERIFICATION queries (rera_check unavailable):
→ Say: "I can't verify RERA details right now — check up-rera.in directly: search for [project name] to confirm registration status and the registered completion date."
→ NEVER generate a UPRERAPRJ number or any RERA registration string.
→ If rera field in the data block is already present, you may quote it but note it should be verified at up-rera.in.

LIVE WEB queries — market trends, news, metro updates (web_search unavailable):
→ NEVER provide: market price trends, appreciation projections, historical price growth claims (e.g. "up X% since 2022"), construction progress on any project, project-specific facts from training memory, or possession timeline predictions based on builder history.
→ If asked about any of the above: "I'm in limited mode right now — for current market data, check PropTiger or MagicBricks, or try your question again in a moment."
→ You MAY share general knowledge ONLY for: area geography, expressways and roads, metro connectivity, schools, hospitals, and local landmarks. These MUST be labelled: "Based on general knowledge (not a live search) —"
→ NEVER present any training-memory data as current or verified.

EMI / FINANCIAL CALCULATIONS (calculate_emi unavailable):
→ Use the formula and calibration anchors in CALCULATION FORMAT to calculate directly.
→ This is the one tool-class that remains safe to compute in-prompt.

PROJECT DATA INTEGRITY:
→ Use ONLY what is in the Properties Found block. Do NOT supplement with training memory about unlisted projects.
→ For every project that IS in the Properties Found block: describe ONLY the fields present in that JSON. Do NOT add from training memory:
   - floor counts or construction progress estimates
   - delivery timeline predictions or possession inferences (e.g. "this builder usually delivers within X months")
   - builder reputation signals not present in the block
   - appreciation projections or historical pricing for that project
   - RERA numbers inferred from pattern — if the rera field is NOT_IN_DATABASE, do NOT invent a UPRERAPRJ string
→ All sentinels (PROJECT_NOT_FOUND, SECTOR_NOT_COVERED, possession_status, NOT_IN_DATABASE) remain fully active.

PROJECT_NOT_FOUND sentinel — explicit prohibition (Hard Rule 14, fully active in fallback mode):
If the block contains PROJECT_NOT_FOUND: "[name]" — do NOT provide from training memory:
  location, builder name, sector, price, BHK, possession date, project description,
  amenities, RERA number, or comparison context for that project.
Required response (verbatim): "This project is not currently in our tracked database."
STOP after that sentence. Do NOT elaborate. Do NOT use the unlisted project as comparison
context when describing tracked alternatives.

BANK / HOME LOAN queries:
→ NEVER predict loan approval, rank lenders, recommend specific banks, or estimate approval speed.
→ Loan approval depends on CIBIL score, income documentation, and project legal status — none of which are in our database.
→ Required response: "Loan approval depends on your profile and the project's legal status. Please consult a home-loan advisor or lender."

PROPERTY DATA INTEGRITY GUARD (Hard Rule 24 — fully active in fallback mode):
The following fields are NOT in the RealtyPals database. NEVER estimate, approximate, or infer them — not from training memory, not from "similar projects", not from general knowledge.
Fields not tracked:
  - Construction progress (% complete, floors, slab status)
  - Sold inventory or unsold units
  - Launch price or original booking price
  - Price change or appreciation since launch
  - Historical price appreciation for any specific project
  - BSP vs all-inclusive price breakdown
  - CC (Completion Certificate) status or date
  - OC (Occupancy Certificate) status or date
    EXCEPTION: possession_status "DELIVERED" in the data block means OC issued — state that fact only.
  - Any government approval or certification status
  - Maintenance charges, floor rise, PLC, IFMS, CLP stages, payment plan terms
Required response for ALL of the above (verbatim):
"We do not currently track this information in our database. Please verify directly with the builder or official project documents."
DO NOT say "typically", "approximately", "usually", or "from general knowledge" for any of these fields.

Keep responses concise — you have a 1024-token limit in this mode.`

const BodySchema = z.object({
  message: z.string().min(1).max(2000).trim(),
  sessionId: z.string().uuid().optional(),
  guestToken: z.string().optional(),
  intent: z.record(z.unknown()).optional(),
})

import { inputGuardrail } from '../lib/ai/guardrails'

function sseWrite(res: Response, event: string, data: Record<string, unknown>): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

router.post('/', async (req: Request, res: Response) => {
  const parsed = BodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' })
    return
  }

  const { message, sessionId, guestToken } = parsed.data
  const prevIntent = (parsed.data.intent ?? {}) as Record<string, unknown>
  // Identity is derived from a VERIFIED Supabase token only — never a client-set header.
  const userId = (await verifyUser(req)) ?? undefined

  if (!userId && !guestToken) {
    res.status(400).json({ error: 'x-user-id header or guestToken body field required' })
    return
  }

  const rlKey = userId ?? guestToken!
  const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || req.ip || 'unknown'
  // Two ceilings: per-identity (20/min) AND per-IP (40/min) so rotating guest tokens
  // from one source can't bypass the limit and drain the AI budget.
  const [byKey, byIp] = await Promise.all([
    checkRateLimit(rlKey),
    checkRateLimit(`ip:${ip}`, 40, 60),
  ])
  const remaining = Math.min(byKey.remaining, byIp.remaining)
  if (!byKey.allowed || !byIp.allowed) {
    res.status(429).json({ error: 'Too many messages. Please wait a moment.' })
    return
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.setHeader('X-RateLimit-Remaining', String(remaining))
  res.flushHeaders()

  const send = (event: string, data: Record<string, unknown>) => sseWrite(res, event, data)

  const guardrailCheck = await inputGuardrail(message);
  if (guardrailCheck.blocked) {
    send('token', { token: "I'm not able to help with that. I'm here to assist with Noida real estate — property search, builder info, and home-buying decisions." });
    send('done', { sessionId: sessionId ?? null, intentState: 'COLD', intent: {} });
    res.end();
    return;
  }

  try {
    console.log('[CHAT] START extractIntent+getMemory', Date.now(), { message: message.slice(0, 80) })
    const [intent, memory] = await Promise.all([
      extractIntent(message, prevIntent as Parameters<typeof extractIntent>[1]),
      getMemory(userId, guestToken),
    ])
    console.log('[CHAT] END extractIntent+getMemory', Date.now(), { intent })

    const intentState = getIntentState(intent)
    console.log('[CHAT] intentState', Date.now(), { intentState })
    send('intent', { intent, intentState })

    let projects: Awaited<ReturnType<typeof discoverProjects>>['exactResults'] = []
    let nearbyProjects: Awaited<ReturnType<typeof discoverProjects>>['nearbyResults'] = []
    let discoveryExpansion: Awaited<ReturnType<typeof discoverProjects>>['expansion'] = undefined
    let notFoundNames: string[] | undefined = undefined

    const isAdvisoryQuery = intentState === 'GATHERING' && (
      (intent.bhk?.length ?? 0) > 0 ||
      !!intent.budgetMax ||
      (intent.lifestyleKeywords?.length ?? 0) > 0
    )

    if (isAdvisoryQuery) {
      console.log('[CHAT] START getAllSectorsOverview', Date.now())
    }
    const sectorsOverview = isAdvisoryQuery
      ? await getAllSectorsOverview(intent.lifestyleKeywords)
      : null
    if (isAdvisoryQuery) {
      console.log('[CHAT] END getAllSectorsOverview', Date.now())
    }

    if (intentState === 'READY_TO_SEARCH' || intentState === 'SHORTLISTED') {
      console.log('[CHAT] START discoverProjects', Date.now(), { intent })
      const discoveryResult = await discoverProjects(intent)
      console.log('[CHAT] END discoverProjects', Date.now(), { exact: discoveryResult.exactResults.length, nearby: discoveryResult.nearbyResults.length, expansion: discoveryResult.expansion ?? null, notFound: discoveryResult.notFoundNames ?? [] })
      projects = discoveryResult.exactResults
      nearbyProjects = discoveryResult.nearbyResults
      discoveryExpansion = discoveryResult.expansion
      notFoundNames = discoveryResult.notFoundNames
      // Always send the properties event when intent is ready — even empty exactResults
      // is meaningful (triggers empty state UI and nearby section on the frontend).
      if (projects.length > 0 || nearbyProjects.length > 0) {
        send('properties', {
          exactResults: projects,
          nearbyResults: nearbyProjects,
          expansion: discoveryExpansion ?? null,
        })
      }
    }

    // Use expansion sector for context when nearby expansion fired,
    // otherwise use the originally requested sector.
    const sectorForContext = discoveryExpansion?.searchedSectors[0] ?? intent.sector
    console.log('[CHAT] START getSectorContext', Date.now(), { sectorForContext: sectorForContext ?? null })
    const sectorCtx = sectorForContext ? await getSectorContext(sectorForContext) : null
    console.log('[CHAT] END getSectorContext', Date.now(), { found: !!sectorCtx })

    let chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
    let existingSummary: string | null = null
    let currentSessionId = sessionId

    if (sessionId) {
      const session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        include: {
          messages: { orderBy: { created_at: 'asc' }, select: { role: true, content: true } },
        },
      })
      if (session) {
        // Ownership check — prevent resuming/poisoning another user's conversation (IDOR).
        const owned =
          (userId && session.user_id === userId) ||
          (guestToken && session.guest_token === guestToken)
        if (!owned) {
          send('error', { message: 'This conversation is not available.' })
          res.end()
          return
        }
        existingSummary = session.summary ?? null
        chatHistory = session.messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
      }
    }

    console.log('[CHAT] START maybeCompress', Date.now(), { historyLen: chatHistory.length })
    const { messages: compressedHistory, newSummary } = await maybeCompress(chatHistory, existingSummary)
    console.log('[CHAT] END maybeCompress', Date.now(), { compressedLen: compressedHistory.length, newSummary: !!newSummary })
    const { systemSuffix, messages } = buildContextMessages(message, compressedHistory, newSummary ?? existingSummary, memory)
    const systemPrompt = buildAdvisorSystemPrompt(intent, projects, memory, sectorCtx ?? undefined, sectorsOverview ?? undefined, discoveryExpansion ?? undefined, nearbyProjects.length > 0 ? nearbyProjects : undefined, notFoundNames) + systemSuffix

    let fullText = ''
    /*
    if (process.env.GROQ_API_KEY) {
      let groqAttempts = 0
      while (groqAttempts < 2) {
        try {
          fullText = await streamWithGroq(systemPrompt, messages, send)
          break
        } catch (err) {
          groqAttempts++
          console.warn(`[chat] Groq stream failed (attempt ${groqAttempts}):`, (err as Error).message)
          if (groqAttempts >= 2) {
            if (process.env.ANTHROPIC_API_KEY) {
              console.warn('[chat] Falling back to Claude')
              fullText = await streamWithClaude(systemPrompt, messages, send)
            } else {
              throw err
            }
          } else {
            await new Promise(r => setTimeout(r, 1000))
          }
        }
      }
    } else if (process.env.ANTHROPIC_API_KEY) {
      fullText = await streamWithClaude(systemPrompt, messages, send)
    } else {
      throw new Error('No AI API keys configured')
    }
    */

    // Using GitHub Models API (via Azure OpenAI) as Primary
    try {
      if (!process.env.OPENAI_API_KEY) throw new Error('No OPENAI_API_KEY configured');
      console.log('[CHAT] START streamWithOpenAI', Date.now())
      fullText = await streamWithOpenAI(systemPrompt, messages, send, async (name, args: any) => {
        if (name === 'builder_lookup') {
          const rec = await getBuilderRecord(args.name ?? '');
          return rec ?? {
            found: false,
            message: `No verified record for "${args.name}" in the RealtyPals database. You may share clearly-labelled general knowledge or call web_search, but never invent specific delivery counts or reputation scores.`,
          };
        }

        if (name === 'web_search') {
          const ctx = await webSearch(args.query ?? '', 3);
          return ctx
            ? { results: ctx, note: 'Cite the sources in your answer.' }
            : { results: '', message: 'No web results found. Answer from general knowledge and state explicitly that it is not verified.' };
        }

        if (name === 'area_info') {
          const info = await areaInfo(args.sector ?? '', args.city ?? 'Noida');
          return info ? { info } : { info: null, message: 'No Wikipedia article found. Answer from general knowledge of Noida and label it as such.' };
        }

        if (name === 'rera_check') {
          const url = args.rera_url || (args.rera_number
            ? `https://www.up-rera.in/projects?project_search=${encodeURIComponent(args.rera_number)}`
            : 'https://www.up-rera.in');
          const content = await readPage(url, 2000);
          return content
            ? { rera_page: content, source: url }
            : { rera_page: null, message: 'Could not fetch the RERA page. Advise the user to verify directly at up-rera.in.' };
        }

        if (name === 'commute') {
          const r = await commute(args.origin ?? '', args.destination ?? '');
          return r ? { commute: r } : { commute: null, message: 'Could not calculate commute precisely. Give an approximate from general knowledge and say it is approximate.' };
        }

        if (name === 'calculate_emi') {
          const r = calcEmi(Number(args.principalCr), Number(args.annualRate ?? 8.75), Number(args.tenureYears ?? 20));
          return {
            monthly_emi: formatInr(r.emi),
            total_payment: formatInr(r.totalPayment),
            total_interest: formatInr(r.totalInterest),
            assumptions: { annual_rate_pct: Number(args.annualRate ?? 8.75), tenure_years: Number(args.tenureYears ?? 20) },
          };
        }

        if (name === 'calculate_stamp_duty') {
          const g = (args.gender === 'female' || args.gender === 'joint') ? args.gender : 'male';
          const r = calcStampDuty(Number(args.priceCr), g);
          return { stamp_duty: formatInr(r.stampDuty), registration: formatInr(r.registration), total: formatInr(r.total), rate_pct: r.rate };
        }

        if (name === 'calculate_gst') {
          const st = args.status === 'ready_to_move' ? 'ready_to_move' : 'under_construction';
          const r = calcGst(Number(args.priceCr), st, Number(args.carpetSqm ?? 0));
          return { gst: formatInr(r.gst), rate_pct: r.rate, category: r.category };
        }

        return { error: 'Tool not recognized' };
      });
      console.log('[CHAT] END streamWithOpenAI', Date.now(), { fullTextLen: fullText.length })
    } catch (err) {
      console.warn('[chat] OpenAI stream failed:', (err as Error).message);

      // Mid-stream stall: tokens were already sent to the SSE client.
      // A Groq fallback would append a second response to the same partial stream —
      // corrupting the UI. Re-throw so the outer catch sends a clean error event
      // and res.end() closes the connection. No session is persisted (correct —
      // the user retries with a clean slate).
      if (err instanceof StreamStallError && err.tokensSent) {
        console.error('[chat] mid-stream stall after tokens sent — cannot fall back cleanly');
        throw err;
      }

      // Pre-first-chunk stall OR any other OpenAI error: no tokens sent yet.
      // Groq fallback is clean — client sees a seamless response from Groq.
      // IMPORTANT: Groq runs without tool support (no builder_lookup, web_search,
      // rera_check, etc.). Append FALLBACK_MODE suffix so the model knows it cannot
      // call tools and must redirect tool-dependent queries instead of answering
      // from training memory. This preserves Hard Rules 13, 16, 17, 18.
      if (process.env.GROQ_API_KEY) {
        const fallbackSystemPrompt = systemPrompt + GROQ_FALLBACK_SUFFIX
        console.log('[CHAT] START streamWithGroq (fallback)', Date.now())
        fullText = await streamWithGroq(fallbackSystemPrompt, messages, send);
        console.log('[CHAT] END streamWithGroq', Date.now(), { fullTextLen: fullText.length })
      } else {
        throw new Error('OpenAI failed and no GROQ_API_KEY fallback configured');
      }
    }

    // ── Build artifact payload for the assistant message ──────────────────
    // Artifacts capture the structured widget data shown to the user so it
    // can be reconstructed on session restore. Only persisted on assistant
    // messages; user messages never carry artifacts.
    const messageArtifacts: Array<Record<string, unknown>> = []

    if (projects.length > 0 || nearbyProjects.length > 0) {
      messageArtifacts.push({
        type: 'property_results',
        exactResults: projects,
        nearbyResults: nearbyProjects,
        expansion: discoveryExpansion ?? null,
      })
    }

    // Comparison: intent named ≥2 specific projects AND discovery returned them.
    // No keyword heuristic — intent.projectNames is the authoritative signal.
    // Capped at 4 projects; anything beyond is silently dropped (widget limit).
    const isComparison = (intent.projectNames?.length ?? 0) >= 2 && projects.length >= 2

    if (isComparison) {
      messageArtifacts.push({
        type: 'comparison',
        projects: projects.slice(0, 4),
      })
    }

    // Pre-generate ID for new sessions so send('done') never blocks on DB write.
    const isNewSession = !currentSessionId
    if (isNewSession) currentSessionId = randomUUID()

    const persistPromises: Promise<unknown>[] = []

    if (isNewSession) {
      const newId = currentSessionId!
      // Chain: session create must complete before message insert (FK constraint).
      persistPromises.push(
        prisma.chatSession.create({
          data: {
            id: newId,
            ...(userId ? { user_id: userId } : { guest_token: guestToken }),
            title: message.slice(0, 60),
            chat_phase: intentState,
            message_count: 2,
            ...(newSummary ? { summary: newSummary } : {}),
          },
        }).then(() => {
          // Bust the Next.js session list Redis cache so the sidebar reflects the new session immediately.
          if (userId) invalidateSessionList(userId).catch(() => {})
          return prisma.chatMessage.createMany({
            data: [
              {
                session_id: newId,
                role: 'user',
                content: message,
                intent_snapshot: intent as unknown as Prisma.InputJsonValue,
              },
              {
                session_id: newId,
                role: 'assistant',
                content: fullText || '[streamed]',
                ...(messageArtifacts.length > 0
                  ? { artifacts: messageArtifacts as unknown as Prisma.InputJsonValue }
                  : {}),
              },
            ],
          })
        })
      )
    } else {
      persistPromises.push(
        prisma.chatSession.update({
          where: { id: currentSessionId },
          data: {
            last_active: new Date(),
            chat_phase: intentState,
            message_count: { increment: 2 },
            ...(newSummary ? { summary: newSummary } : {}),
            ...(projects.length > 0 ? { last_projects: projects as unknown as Prisma.InputJsonValue } : nearbyProjects.length > 0 ? { last_projects: nearbyProjects as unknown as Prisma.InputJsonValue } : {}),
          },
        })
      )
      persistPromises.push(
        prisma.chatMessage.createMany({
          data: [
            {
              session_id: currentSessionId!,
              role: 'user',
              content: message,
              intent_snapshot: intent as unknown as Prisma.InputJsonValue,
            },
            {
              session_id: currentSessionId!,
              role: 'assistant',
              content: fullText || '[streamed]',
              ...(messageArtifacts.length > 0
                ? { artifacts: messageArtifacts as unknown as Prisma.InputJsonValue }
                : {}),
            },
          ],
        })
      )
    }

    const slugsToMemorize = projects.length > 0
      ? projects.map((p) => p.slug)
      : nearbyProjects.map((p) => p.slug)
    if (slugsToMemorize.length > 0) {
      persistPromises.push(upsertMemory(userId, guestToken, intent, slugsToMemorize))
    }

    console.log('[CHAT] BEFORE send(done)', Date.now())
    send('done', { sessionId: currentSessionId, intentState, intent })
    console.log('[CHAT] AFTER send(done)', Date.now())

    console.log('[CHAT] BEFORE persist', Date.now())
    await Promise.all(persistPromises).catch((e) => console.error('[chat] persist error:', e))
    console.log('[CHAT] AFTER persist', Date.now())
  } catch (err) {
    console.error('[chat] error:', err)
    send('error', { message: "I'm having trouble right now. Please try again in a moment." })
  } finally {
    res.end()
  }
})

// ── Session sub-routes ────────────────────────────────────────────────────────
// NOTE: /session/list MUST be registered before /session to prevent Express
// from interpreting "list" as an :id param match on GET /session/:id.

const SESSION_LIST_TTL = 30   // seconds
const SESSION_LIST_LIMIT = 50
const MAX_MESSAGES = 50

function formatSessionList(sessions: Array<{ id: string; title: string | null; last_active: Date }>) {
  return sessions.map((s) => ({
    id: s.id,
    label:
      s.title ??
      `Chat ${new Date(s.last_active).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
    last_active: s.last_active,
  }))
}

function formatMessages(
  messages: Array<{
    id: string
    role: string
    content: string
    created_at: Date
    artifacts?: Prisma.JsonValue | null
  }>
) {
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    created_at: m.created_at,
    artifacts: Array.isArray(m.artifacts) ? m.artifacts : [],
  }))
}

// GET /chat/session/list — must come before GET /chat/session (order matters in Express)
router.get('/session/list', async (req: Request, res: Response) => {
  const userId = (await verifyUser(req)) ?? undefined
  const guestToken = req.query.guestToken as string | undefined

  if (!userId && !guestToken) {
    res.status(401).json({ error: 'Auth required' })
    return
  }

  // Guest path — no caching (guest tokens are ephemeral, no stable cache key)
  if (!userId && guestToken) {
    try {
      const sessions = await prisma.chatSession.findMany({
        where: { guest_token: guestToken },
        orderBy: { last_active: 'desc' },
        take: SESSION_LIST_LIMIT,
        select: { id: true, title: true, last_active: true },
      })
      res.json({ sessions: formatSessionList(sessions) })
    } catch (err) {
      console.error('[session/list] guest query failed:', err)
      res.json({ sessions: [] })
    }
    return
  }

  // Authenticated path — Redis-cached
  const cacheKey = `sessions:list:${userId}`
  try {
    const cached = await getCached<{ id: string; label: string; last_active: string }[]>(cacheKey)
    if (cached) {
      res.json({ sessions: cached })
      return
    }

    const sessions = await prisma.chatSession.findMany({
      where: { user_id: userId },
      orderBy: { last_active: 'desc' },
      take: SESSION_LIST_LIMIT,
      select: { id: true, title: true, last_active: true },
    })

    const result = formatSessionList(sessions)

    // Don't cache empty results — a new session may arrive within the TTL window
    if (result.length > 0) {
      await setCached(cacheKey, result, SESSION_LIST_TTL)
    }

    res.json({ sessions: result })
  } catch (err) {
    console.error('[session/list] auth query failed:', err)
    res.json({ sessions: [] })
  }
})

// GET /chat/session?id= — restore or find/create latest session
router.get('/session', async (req: Request, res: Response) => {
  const userId = await verifyUser(req)
  if (!userId) {
    res.status(401).json({ error: 'Auth required' })
    return
  }

  const specificId = req.query.id as string | undefined

  if (specificId) {
    const session = await prisma.chatSession.findFirst({
      where: { id: specificId, user_id: userId },
      include: { messages: { orderBy: { created_at: 'asc' }, take: MAX_MESSAGES } },
    })

    if (!session) {
      res.status(404).json({ error: 'Session not found' })
      return
    }

    res.json({
      session_id: session.id,
      title: session.title ?? null,
      chat_phase: session.chat_phase ?? 'DISCOVERY',
      last_projects: session.last_projects ?? null,
      messages: formatMessages(
        session.messages as Parameters<typeof formatMessages>[0]
      ),
    })
    return
  }

  // No id — find or create latest session
  let session = await prisma.chatSession.findFirst({
    where: { user_id: userId },
    orderBy: { last_active: 'desc' },
    include: { messages: { orderBy: { created_at: 'asc' }, take: MAX_MESSAGES } },
  })

  if (!session) {
    session = await prisma.chatSession.create({
      data: { user_id: userId },
      include: { messages: { orderBy: { created_at: 'asc' }, take: MAX_MESSAGES } },
    })
  }

  res.json({
    session_id: session.id,
    chat_phase: session.chat_phase ?? 'DISCOVERY',
    last_projects: session.last_projects ?? null,
    messages: formatMessages(
      session.messages as Parameters<typeof formatMessages>[0]
    ),
  })
})

// PATCH /chat/session/:id — rename session
router.patch('/session/:id', async (req: Request, res: Response) => {
  const userId = await verifyUser(req)
  const guestToken = req.query.guestToken as string | undefined

  if (!userId && !guestToken) {
    res.status(401).json({ error: 'Auth required' })
    return
  }

  const session = await prisma.chatSession.findUnique({
    where: { id: req.params.id },
    select: { id: true, user_id: true, guest_token: true },
  })

  if (!session) {
    res.status(404).json({ error: 'Session not found' })
    return
  }

  const ownsAsUser = userId !== null && session.user_id === userId
  const ownsAsGuest = guestToken !== null && session.guest_token === guestToken
  if (!ownsAsUser && !ownsAsGuest) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const title = typeof req.body?.title === 'string' ? req.body.title.trim().slice(0, 100) : null
  if (!title) {
    res.status(400).json({ error: 'title required' })
    return
  }

  await prisma.chatSession.update({ where: { id: req.params.id }, data: { title } })

  if (session.user_id) {
    await invalidateSessionList(session.user_id)
  }

  res.json({ ok: true, title })
})

// DELETE /chat/session/:id — remove session
router.delete('/session/:id', async (req: Request, res: Response) => {
  const userId = await verifyUser(req)
  const guestToken = req.query.guestToken as string | undefined

  if (!userId && !guestToken) {
    res.status(401).json({ error: 'Auth required' })
    return
  }

  const session = await prisma.chatSession.findUnique({
    where: { id: req.params.id },
    select: { id: true, user_id: true, guest_token: true },
  })

  if (!session) {
    res.status(404).json({ error: 'Session not found' })
    return
  }

  const ownsAsUser = userId !== null && session.user_id === userId
  const ownsAsGuest = guestToken !== null && session.guest_token === guestToken
  if (!ownsAsUser && !ownsAsGuest) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  await prisma.chatSession.delete({ where: { id: req.params.id } })

  if (session.user_id) {
    await invalidateSessionList(session.user_id)
  }

  res.json({ ok: true })
})

// DELETE /chat/intent — reset intent + start fresh session
// Security: uses verifyUser(req) — NEVER x-user-id header (that was the Next.js bug)
router.delete('/intent', async (req: Request, res: Response) => {
  const userId = await verifyUser(req)
  if (!userId) {
    res.status(401).json({ error: 'Auth required' })
    return
  }

  await prisma.userMemory.deleteMany({ where: { user_id: userId } })
  const newSession = await prisma.chatSession.create({ data: { user_id: userId } })

  res.json({ ok: true, session_id: newSession.id })
})

export default router
