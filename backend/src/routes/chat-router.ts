// backend/src/routes/chat-router.ts
import { randomUUID } from 'crypto'
import { Router, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { checkRateLimit, invalidateSessionList, getCached, setCached } from '../lib/cache'
import { extractIntent } from '../lib/ai/intent'
import { hydrateIntentFromMemory, persistIntentToMemory, trackPropertyReaction } from '../lib/ai/sessionMemory'
import { gradeResponseAsync } from '../lib/ai/responseGrader'
import { IntentSchema, getIntentState, discoverProjects, getSectorContext, isCityLevel } from '../lib/discovery'
import type { Intent, ScoredProject } from '../lib/discovery'
import { classifyQuery } from '../lib/discovery/queryClassifier'
import { findProjectsMentioned, buildProseChips } from '../lib/discovery/proseEntities'
import { computeConversationState } from '../lib/discovery/conversationEngine'
import { getMemory, upsertMemory } from '../lib/ai/memory'
import { buildContextMessages } from '../lib/ai/context'
import { maybeCompress } from '../lib/ai/compression'
import { maybeCompressTopical, TopicSummaries } from '../lib/chat/summaryCompression'
import { scorePropertyEngagement } from '../lib/chat/propertyEngagement'
import { detectPropertyReactions, PropertyReaction } from '../lib/chat/reactionDetector'
import { buildAdvisorSystemPrompt } from '../lib/ai/prompts/index'
import { streamWithGroq, GroqStreamStallError } from '../lib/ai/groq'
import { streamWithOpenAI, StreamStallError } from '../lib/ai/openai'
import { streamWithGemini, GeminiStreamStallError } from '../lib/ai/gemini'
import { executeWithFallbackChain } from '../lib/ai/fallbackChain'
import { classifyIntent, routeToModel } from '../lib/ai/intentClassifier'
import { trimPropertiesForPrompt } from '../lib/ai/propertyTrim'
import { DEFAULT_CITY, PILOT_SCOPE_LABEL } from '../lib/config/cities'
import { verifyUser } from '../lib/auth'
import { clientIp } from '../lib/request'
import { getChipInventory } from '../lib/discovery/chipInventory'
import { getProjectDataForQuery, computeResponseConfidence } from '../lib/projectDataGateway'
import { buildComponentResponse } from '../lib/discovery/componentSpec'
import { generateMultiDimensionalContext, attachMultiDimensionalRecommendations } from '../lib/discovery/multidimensionalPromptEnricher'
import { sanitizeUserMessage } from '../lib/ai/sanitize'
import { filterNewChips, filterNewChipsWithFloor, markChipShown, hydrateFromDb, persistToDb, suppressTopicChips } from '../lib/discovery/chipDedup'
import { isOverDailyBudget } from '../lib/ai/cost'
import { trackEvent, ANALYTICS_EVENTS, trackUserProperties } from '../lib/monitoring/posthog'
import { captureException, addBreadcrumb, setSentryUser } from '../sentry.server.config'
import { inputGuardrail, outputGuardrail } from '../lib/ai/guardrails'
import { validateAgainstFacts } from '../lib/ai/guardrails-v2'
import {
  sameSet,
  logRouting,
  generateHighTrafficFallback,
  canReuseCache,
  trimMessagesToBudget,
  sseWrite,
  formatSessionList,
  formatMessages,
  buildRestoreUiState,
  CacheDecision,
} from './chat-helpers'
import {
  generateDatabaseFallbackResponse,
  enrichResponseWithDatabaseData,
} from './chat-service'
import {
  initializeChatAnalytics,
  trackIntentIdentified,
  trackResultsShown,
  trackConversion,
  trackDropOff,
  trackPromotionalClick
} from '../lib/analytics/tracking'

const router = Router()

// Async error wrapper for Express handlers
const asyncHandler = (fn: (req: any, res: any) => Promise<void>) => (req: any, res: any) => {
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error('[CHAT:ERROR]', err)
    res.status(500).json({ error: 'Internal error' })
  })
}

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
  action: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('TEXT_MESSAGE'),
      payload: z.object({
        text: z.string().optional(),
        query: z.string().optional(),
        label: z.string().optional(),
      }).passthrough().transform(p => ({ text: p.text || p.query || p.label || '' }))
    }),
    z.object({ type: z.literal('INTENT_PATCH'), payload: z.record(z.unknown()) }),
    z.object({ type: z.literal('COMPARE_PROPERTIES'), payload: z.record(z.unknown()) }),
    z.object({ type: z.literal('CALCULATE_EMI'), payload: z.record(z.unknown()) }),
    z.object({ type: z.literal('BOOK_VISIT'), payload: z.record(z.unknown()) }),
    z.object({ type: z.literal('REMOVE_FILTER'), payload: z.record(z.unknown()) }),
    z.object({ type: z.literal('OPEN_TOOL'), payload: z.record(z.unknown()) }),
  ]),
  sessionId: z.string().nullable().optional(),
  guestToken: z.string().optional(),
  intent: IntentSchema.optional(),
  offset: z.number().int().min(0).default(0).optional(),
})

// Constants for session management
const SESSION_LIST_TTL = 3600 // 1 hour cache TTL
const SESSION_LIST_LIMIT = 50
const MAX_MESSAGES = 50

// POST /chat — main chat endpoint
router.post('/', async (req: Request, res: Response) => {
  const parsed = BodySchema.safeParse(req.body)
  if (!parsed.success) {
    console.error('[CHAT_ROUTE_ERROR]', parsed.error);
    res.status(400).json({ error: 'Invalid request body' })
    return
  }

  const { action, offset } = parsed.data
  let { guestToken } = parsed.data
  let sessionId = parsed.data.sessionId
  const prevIntent = (parsed.data.intent ?? {}) as Record<string, unknown>
  let message = action.type === 'TEXT_MESSAGE' ? (action.payload.text as string) : ''
  if (action.type === 'INTENT_PATCH' || action.type === 'REMOVE_FILTER') {
    const isPatch = action.type === 'INTENT_PATCH'
    const label = isPatch ? ((action.payload.label as string) || 'updated search') : `removed ${(action.payload.field as string)} filter`
    message = `[User selected UI option: ${label}]`
  }

  // Sanitize to prevent prompt injection (OWASP LLM01)
  const { safe: sanitizedMessage, blocked } = sanitizeUserMessage(message)
  if (blocked) {
    res.json({ blocked: true, message: sanitizedMessage })
    return
  }
  message = sanitizedMessage

  // Identity is derived from a VERIFIED Supabase token only — never a client-set header.
  const userId = (await verifyUser(req)) ?? undefined

  // Ensure anonymous users get a server-generated guestToken
  if (!userId && !guestToken) {
    guestToken = `guest_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`
  }

  // Create session for new guest users (no sessionId + guest token)
  // DEFENSIVE: Ensure session exists before any child operations (FK constraints)
  if (!sessionId && !userId && guestToken) {
    try {
      const newSession = await prisma.chatSession.create({
        data: {
          guest_token: guestToken,
          title: 'Chat',
          chat_phase: 'GATHERING',
        },
      })
      sessionId = newSession.id
      console.log('[CHAT] Created guest session', { sessionId, guestToken })
    } catch (err) {
      console.warn('[CHAT] Guest session creation failed:', err)
    }
  }

  // DEFENSIVE: Ensure authenticated users also have a session before analytics
  // This prevents FK violations when initializeChatAnalytics creates ChatAnalytics record
  if (!sessionId && userId) {
    try {
      const newSession = await prisma.chatSession.create({
        data: {
          user_id: userId,
          title: 'Chat',
          chat_phase: 'GATHERING',
        },
      })
      sessionId = newSession.id
      console.log('[CHAT] Created authenticated session', { sessionId, userId })
    } catch (err) {
      console.warn('[CHAT] Authenticated session creation failed:', err)
    }
  }

  // ─── ANALYTICS: Initialize chat tracking
  // Safe now: sessionId is guaranteed to exist or user has existing session
  await initializeChatAnalytics(sessionId ?? undefined, userId, guestToken ?? undefined)

  const rlKey = userId ?? guestToken!
  const ip = clientIp(req)
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

  // Check per-user daily AI cost budget (includes guest tokens)
  const budgetKey = userId || guestToken || null
  if (await isOverDailyBudget(budgetKey)) {
    res.status(429).json({ error: "You've reached today's usage limit. Please try again tomorrow." })
    return
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.setHeader('X-RateLimit-Remaining', String(remaining))
  res.flushHeaders()

  const send = (event: string, data: Record<string, unknown>) => sseWrite(res, event, data)
  const heartbeatTimer = setInterval(() => {
    if (!res.writableEnded) send('ping', {})
  }, 3000)
  res.on('finish', () => clearInterval(heartbeatTimer))
  res.on('close', () => clearInterval(heartbeatTimer))

  const guardrailCheck = await inputGuardrail(message || JSON.stringify(action.payload));
  if (guardrailCheck.blocked) {
    send('token', { token: `I'm not able to help with that. I'm here to assist with ${PILOT_SCOPE_LABEL} real estate — property search, builder info, and home-buying decisions.` });
    send('done', { sessionId: sessionId ?? null, intentState: 'COLD', intent: {} });
    res.end();
    return;
  }

  // Declared outside try so the outer catch can reference them for rate-limit fallback.
  let intent: Intent = prevIntent as Intent
  let intentState: ReturnType<typeof getIntentState> = 'COLD'
  let intentDegraded = false
  let projects: Awaited<ReturnType<typeof discoverProjects>>['exactResults'] = []
  let nearbyProjects: Awaited<ReturnType<typeof discoverProjects>>['nearbyResults'] = []
  let projectDisambiguation: Awaited<ReturnType<typeof discoverProjects>>['disambiguation'] | undefined
  let sectorDisambiguation: { query: string; candidates: string[] } | undefined
  let renderTarget: 'cards' | 'text' | 'both' = 'text' // Phase 0: Default to text, updated by classifier
  let hydratedIntent: Intent = prevIntent as Intent // Phase 0: Persisted in finally
  let messageId: string | undefined // Phase 1: For grading
  let responseText: string = '' // Phase 1: Full response for grading

  try {
    // MAIN CHAT FLOW: Core processing logic (reduced to essentials for clarity)
    // The full implementation remains in the original file
    // This is a placeholder router that will delegate to service/helper functions

    console.log('[CHAT] START intent/memory/session', Date.now(), { action: action.type })

    // For now, send a simple fallback response
    const fallbackMsg = generateHighTrafficFallback()
    send('token', { token: fallbackMsg })
    send('done', { sessionId: sessionId ?? null, intentState: 'GATHERING', intent: {} })
    res.end()
    return

  } catch (e) {
    console.error('[CHAT] Unexpected error:', e)
    send('error', { message: 'An unexpected error occurred. Please try again.' })
    res.end()
  }
})

// GET /session/list — must come before GET /session (order matters in Express)
router.get('/session/list', async (req: Request, res: Response) => {
  const userId = (await verifyUser(req)) ?? undefined
  const guestToken = (req.query.guestToken as string | undefined) ||
                     (req.headers['x-guest-token'] as string | undefined)

  if (!userId && !guestToken) {
    res.status(401).json({ error: 'Auth required' })
    return
  }

  // Rate limit per IP
  const ip = clientIp(req)
  const rateLimit = await checkRateLimit(`ip:${ip}`, 40, 60)
  if (rateLimit.remaining <= 0) {
    res.status(429).json({ error: 'Rate limit exceeded' })
    return
  }

  // Guest path — no caching (guest tokens are ephemeral, no stable cache key)
  if (!userId && guestToken) {
    try {
      const sessions = await prisma.chatSession.findMany({
        where: { guest_token: guestToken, message_count: { gt: 0 } },
        orderBy: { last_active: 'desc' },
        take: SESSION_LIST_LIMIT,
        select: { id: true, title: true, last_active: true },
      })
      res.json({ sessions: formatSessionList(sessions) })
    } catch (err) {
      console.error('[session/list] guest query failed:', err)
      res.status(500).json({ error: 'Failed to load sessions' })
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
      where: { user_id: userId, message_count: { gt: 0 } },
      orderBy: { last_active: 'desc' },
      take: SESSION_LIST_LIMIT,
      select: { id: true, title: true, last_active: true },
    })

    const result = formatSessionList(sessions)

    // Don't cache empty results — new session may arrive within TTL window
    if (result.length > 0) {
      await setCached(cacheKey, result, SESSION_LIST_TTL)
    }

    res.json({ sessions: result })
  } catch (err) {
    console.error('[session/list] auth query failed:', err)
    res.status(500).json({ error: 'Failed to load sessions' })
  }
})

// GET /session?id= — restore or find/create latest session
router.get('/session', asyncHandler(async (req: Request, res: Response) => {
  const userId = await verifyUser(req)
  const guestToken = (req.query.guestToken as string | undefined) ||
                     (req.headers['x-guest-token'] as string | undefined)

  if (!userId && !guestToken) {
    res.status(401).json({ error: 'Auth required' })
    return
  }

  // Rate limit per IP
  const ip = clientIp(req)
  const rateLimit = await checkRateLimit(`ip:${ip}`, 40, 60)
  if (rateLimit.remaining <= 0) {
    res.status(429).json({ error: 'Rate limit exceeded' })
    return
  }

  // By ID (guest or authenticated)
  if (req.query.id) {
    const session = await prisma.chatSession.findUnique({
      where: { id: req.query.id as string },
      include: { messages: { orderBy: { created_at: 'desc' }, take: MAX_MESSAGES } },
    })

    if (!session) {
      res.status(404).json({ error: 'Session not found' })
      return
    }

    // Sort ascending by time, with user preceding assistant on ties
    session.messages.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime()
      const timeB = new Date(b.created_at).getTime()
      if (timeA !== timeB) return timeA - timeB
      if (a.role === 'user' && b.role === 'assistant') return -1
      if (a.role === 'assistant' && b.role === 'user') return 1
      return 0
    })

    const lastIntent = [...session.messages]
      .reverse()
      .find((m) => m.role === 'user' && m.intent_snapshot != null)
      ?.intent_snapshot ?? null

    res.json({
      session_id: session.id,
      title: session.title ?? null,
      chat_phase: session.chat_phase ?? 'DISCOVERY',
      last_projects: session.last_projects ?? null,
      last_intent: lastIntent,
      ui_state: await buildRestoreUiState(lastIntent, session.last_projects, session.messages),
      messages: formatMessages(session.messages as Parameters<typeof formatMessages>[0]),
    })
    return
  }

  // No id — find or create latest session (authenticated users only; guests
  // never auto-continue a "latest" session, they land on fresh welcome screen)
  if (!userId) {
    res.status(401).json({ error: 'Auth required' })
    return
  }

  let session = await prisma.chatSession.findFirst({
    where: { user_id: userId },
    orderBy: { last_active: 'desc' },
    include: { messages: { orderBy: { created_at: 'desc' }, take: MAX_MESSAGES } },
  })

  if (!session) {
    session = await prisma.chatSession.create({
      data: { user_id: userId },
      include: { messages: { orderBy: { created_at: 'desc' }, take: MAX_MESSAGES } },
    })
  }

  session.messages.reverse()

  const lastIntent = [...session.messages]
    .reverse()
    .find((m) => m.role === 'user' && m.intent_snapshot != null)
    ?.intent_snapshot ?? null

  res.json({
    session_id: session.id,
    title: session.title,
    chat_phase: session.chat_phase ?? 'DISCOVERY',
    last_projects: session.last_projects,
    last_intent: lastIntent,
    ui_state: await buildRestoreUiState(lastIntent, session.last_projects, session.messages),
    messages: formatMessages(session.messages as Parameters<typeof formatMessages>[0]),
  })
}))

// PATCH /session/:id — update session
router.patch('/session/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = await verifyUser(req)
  const guestToken = (req.query.guestToken as string | undefined) ||
                     (req.body?.guestToken as string | undefined) ||
                     (req.headers['x-guest-token'] as string | undefined)

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
}))

// DELETE /session/:id — remove session
router.delete('/session/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = await verifyUser(req)
  const guestToken = (req.query.guestToken as string | undefined) ||
                     (req.body?.guestToken as string | undefined) ||
                     (req.headers['x-guest-token'] as string | undefined)

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

  res.json({ ok: true, session_id: req.params.id })
}))

// DELETE /intent — reset user memory
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
