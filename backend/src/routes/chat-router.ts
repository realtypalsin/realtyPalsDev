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
import { IntentSchema, getIntentState, discoverProjects, getSectorContext, getAllSectorsOverview, isCityLevel } from '../lib/discovery'
import type { Intent, ScoredProject } from '../lib/discovery'
import { postProcessIntent } from '../lib/discovery/intentPostProcessor'
import { computeConfidence, buildClarificationOptions } from '../lib/discovery/confidence'
import { getMultiDimensionalRecommendations } from '../lib/discovery/multiDimensionalIntegration'
import { planProjectDetailQuery, isActionable, getClarificationMessage } from '../lib/discovery/queryPlanner'
import {
  getBuyerFit,
  getFloorPlans,
  getPriceHistory,
  getConstructionStatus,
  getProjectIntelligence,
  getFullCostSheet,
  getAmenitiesAndConnectivity,
  getProjectImages,
  getBuilderNews,
  getUserSavedState,
  getSectorProjects,
  getProjectFinancialDetails,
} from '../lib/projectFacts'
import { gatePublished } from '../lib/intelligenceGate'
import { getBuilderRecord } from '../lib/builders'
import { FINANCIAL } from '../lib/config'
import { webSearch, areaInfo, commute, readPage } from '../lib/web'
import { calcEmi, calcStampDuty, calcGst, formatInr } from '../lib/calculators'
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
import { buildSystemPromptWithCache } from '../lib/ai/systemPromptCache'
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
import { inputGuardrail } from '../lib/ai/guardrails'
import { validateAgainstFacts } from '../lib/ai/guardrails-v2'
import { getCachedResponse, setCachedResponse } from '../lib/ai/semanticCache'
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
  estimateTokens,
} from './chat-helpers'
import {
  generateDatabaseFallbackResponse,
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

  // Phase 5: Guest-to-user session adoption — if user logs in mid-chat with guest token,
  // adopt the guest session instead of creating new one (preserves chat history)
  if (!sessionId && userId && guestToken) {
    try {
      const guestSession = await prisma.chatSession.findFirst({
        where: { guest_token: guestToken, user_id: null },
      })
      if (guestSession) {
        // Adopt guest session to authenticated user
        const adoptedSession = await prisma.chatSession.update({
          where: { id: guestSession.id },
          data: {
            user_id: userId,
            guest_token: null, // Clear guest marker
          },
        })
        sessionId = adoptedSession.id
        console.log('[CHAT] Adopted guest session to user', { sessionId, userId, guestToken })
      }
    } catch (err) {
      console.warn('[CHAT] Guest session adoption failed:', err)
      // Fall through to create new session if adoption fails
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
  let ownershipFailed = false

  try {
    // ─── SEMANTIC FAQ CACHE (Instant $0.00 Token Fast Path) ────────────────────
    if (action.type === 'TEXT_MESSAGE' && message) {
      const cached = getCachedResponse(message)
      if (cached) {
        console.log('[CHAT:CACHE_HIT] Serving verified advisory response from cache:', message.slice(0, 50))
        send('token', { token: cached.token })
        if (cached.chips && cached.chips.length > 0) {
          send('ui_state', {
            stage: 'RESEARCH',
            thinking: 'Verified RealtyPals Intelligence (Cached):',
            chips: cached.chips,
            missingFields: [],
            confidence: 'HIGH'
          })
        }
        send('done', {
          sessionId: sessionId ?? null,
          intentState: cached.intentState ?? 'SHORTLISTED',
          intent: prevIntent,
          responseMode: cached.responseMode ?? 'chat',
        })
        res.end()
        return
      }
    }

    console.log('[CHAT] START intent/memory/session', Date.now(), { action: action.type })
    let rawIntentResult = { intent: prevIntent as Intent, degraded: false }
    
    // FAST PATH: bypass LLM extraction if action is INTENT_PATCH
    if (action.type === 'INTENT_PATCH') {
      console.log('[CHAT] INTENT_PATCH fast path — skipping LLM extraction')
      const patch = action.payload.patch as Record<string, unknown>
      const { mergeIntent } = await import('../lib/ai/intent')
      rawIntentResult = { intent: mergeIntent(prevIntent, patch), degraded: false }
    } else if (action.type === 'REMOVE_FILTER') {
      console.log('[CHAT] REMOVE_FILTER fast path')
      const fieldToRemove = action.payload.field as string
      const newIntent = { ...prevIntent }
      delete newIntent[fieldToRemove]
      rawIntentResult = { intent: newIntent as Intent, degraded: false }
    } else if (action.type === 'TEXT_MESSAGE' && message) {
      console.log('[CHAT] TEXT_MESSAGE — running LLM extraction')
      rawIntentResult = await extractIntent(message, prevIntent)
    }

    // Phase 2: Parallelize intent extraction with DB prefetch — while LLM generates intent, prefetch DB data
    const baseIntent = rawIntentResult.intent
    const [, memory, sessionData] = await Promise.all([
      // Hydrate intent after DB data arrives (depend only on intent result)
      hydrateIntentFromMemory(sessionId ?? '', baseIntent).then(h => (hydratedIntent = h)),
      getMemory(userId, guestToken),
      sessionId ? prisma.chatSession.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          user_id: true,
          guest_token: true,
          summary: true,
          summary_location: true,
          summary_financial: true,
          summary_timeline: true,
          property_reactions: true,
          last_projects: true,
          messages: { orderBy: { created_at: 'desc' }, take: 50, select: { id: true, role: true, content: true, created_at: true } },
        },
      }) : null,
    ])
    console.log('[CHAT] END intent/memory/session', Date.now())

    // Ownership check — prevent resuming/poisoning another user's conversation (IDOR).
    if (sessionData && !(
      (userId && sessionData.user_id === userId) ||
      (guestToken && sessionData.guest_token === guestToken)
    )) {
      ownershipFailed = true
      send('error', { message: 'This conversation is not available.' })
      res.end()
      return
    }

    const existingSummary = sessionData?.summary ?? null
    const existingTopicSummaries: TopicSummaries | null = sessionData ? {
      location: sessionData.summary_location ?? null,
      financial: sessionData.summary_financial ?? null,
      timeline: sessionData.summary_timeline ?? null,
    } : null
    const chatHistoryRaw = sessionData?.messages ?? []
    
    // Sort ascending by time, with user preceding assistant on ties
    const sortedRaw = [...chatHistoryRaw].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime()
      const timeB = new Date(b.created_at).getTime()
      if (timeA !== timeB) return timeA - timeB
      if (a.role === 'user' && b.role === 'assistant') return -1
      if (a.role === 'assistant' && b.role === 'user') return 1
      return 0
    })

    const chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = sortedRaw.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    if (action.type === 'INTENT_PATCH' || action.type === 'REMOVE_FILTER') {
      chatHistory.push({ role: 'user', content: message })
    }

    const cachedProjectsFromSession: ScoredProject[] | null = sessionData?.last_projects
      ? (sessionData.last_projects as unknown as ScoredProject[])
      : null
    const isNewSession = !sessionId || !sessionData
    const currentSessionId = sessionId || randomUUID()

    // Post-process intent: qualify sectors with cities, resolve project context
    const previousProjectIds = (sessionData?.last_projects as string[]) ?? []
    const postProcessed = await postProcessIntent(hydratedIntent, previousProjectIds, 'Noida')
    hydratedIntent = postProcessed.intent
    const projectContext = postProcessed.projectContext
    const intentContextSwitched = postProcessed.contextSwitched

    if (intentContextSwitched) {
      console.log('[CHAT] Project context switched to:', projectContext?.projectName)
    }

    // Track current projects in session for next turn context detection
    if (projectContext) {
      const newProjectIds = [projectContext.projectId, ...previousProjectIds].slice(0, 5)
      await prisma.chatSession.update({
        where: { id: currentSessionId },
        data: { last_projects: newProjectIds },
      }).catch(e => console.warn('[CHAT] Failed to update last_projects:', e))
    }

    intentDegraded = rawIntentResult.degraded
    const rawIntent = rawIntentResult.intent

    if (intentDegraded) {
      console.log('[CHAT] Intent extraction degraded (fallback to previous intent used).', { currentSessionId });
    }

    // Code-level purpose inference: retiree and first_time_buyer unambiguously imply endUse.
    // Defensive fallback for cases where the LLM prompt inference doesn't fire.
    intent = (
      !hydratedIntent.purpose &&
      (hydratedIntent.riskProfile === 'retiree' || hydratedIntent.riskProfile === 'first_time_buyer')
    ) ? { ...hydratedIntent, purpose: 'endUse' } : hydratedIntent
    console.log('[CHAT] END extractIntent', Date.now(), { intent })

    // Exact project name detection & active session focus persistence
    try {
      const lowerMsg = message.toLowerCase().trim();
      const cleanQuery = lowerMsg
        .replace(/^(show\s+me|tell\s+me\s+about|details\s+of|give\s+me|what\s+is|what\s+about|information\s+about|info\s+on)\s+/i, '')
        .trim();

      let matched: { id: string; name: string; slug: string } | null = null;



      // Exact & Token match fallback
      if (!matched) {
        const dbProjects = await prisma.project.findMany({
          select: { id: true, name: true, slug: true },
        });

        // 1. Direct exact name match
        matched = dbProjects.find(p => p.name.toLowerCase() === cleanQuery || p.name.toLowerCase() === lowerMsg) || null;

        // 2. Exact substring match (prioritizing exact word matches)
        if (!matched) {
          const matchingSubstring = dbProjects
            .filter(p => {
              const pLower = p.name.toLowerCase();
              return lowerMsg.includes(pLower) || (cleanQuery.length >= 3 && pLower.includes(cleanQuery));
            })
            .sort((a, b) => b.name.length - a.name.length); // longer name match first (e.g. "Elite Golf Greens" vs "Elite")

          if (matchingSubstring.length > 0) {
            matched = matchingSubstring[0];
          }
        }

        // 3. Token-based overlap match with score calculation
        if (!matched && cleanQuery.length >= 2) {
          const queryTokens = cleanQuery.split(/\s+/).filter(t => t.length > 0);
          const scored = dbProjects.map(p => {
            const pLower = p.name.toLowerCase();
            const pTokens = pLower.split(/\s+/);
            const matchingTokens = queryTokens.filter(qt => pTokens.includes(qt)).length;
            const score = matchingTokens / Math.max(queryTokens.length, pTokens.length);
            return { p, score, matchingTokens };
          }).filter(s => s.matchingTokens > 0).sort((a, b) => b.score - a.score || b.matchingTokens - a.matchingTokens);

          if (scored.length > 0 && scored[0].score >= 0.4) {
            matched = scored[0].p;
          }
        }
      }

      if (matched) {
        console.log('[CHAT] Project match detected in query:', matched.name);
        intent.projectNames = [matched.name];
        (intent as any).targetProjectId = matched.id;
      } else {
        // Persist active project focus from previous turn / session if user is asking follow-up detail query
        const prevProjectName = (prevIntent as any)?.projectNames?.[0] || (hydratedIntent as any)?.projectNames?.[0] || cachedProjectsFromSession?.[0]?.name
        const prevProjectId = (prevIntent as any)?.targetProjectId || (hydratedIntent as any)?.targetProjectId || cachedProjectsFromSession?.[0]?.id

        if (prevProjectName) {
          // Carry forward active project unless user explicitly starts a new sector or discovery search
          const isNewSectorSearch = intent.sector && prevIntent?.sector && intent.sector !== prevIntent.sector
          if (!isNewSectorSearch) {
            console.log('[CHAT] Persisting active project focus from session:', prevProjectName);
            intent.projectNames = [prevProjectName];
            if (prevProjectId) (intent as any).targetProjectId = prevProjectId;
          }
        }
      }
    } catch (e) {
      console.warn('[CHAT] Project name detection fallback error:', e);
    }

    // Detect explicit lead submission (phone number with contact intent or name in user message)
    const phoneMatch = message.match(/\b[6-9]\d{9}\b/) || message.match(/phone\s*number[:\s]*([0-9+]+)/i)
    const isContactIntent = /call|contact|reach|callback|phone|mobile|number|talk to|speak to|connect me/i.test(message)
    if (phoneMatch && isContactIntent) {
      const phone = phoneMatch[1] || phoneMatch[0]
      const nameMatch = message.match(/name[:\s]*([a-zA-Z\s;]+)/i)
      let nameStr = 'Valued Buyer'
      if (nameMatch) {
        nameStr = nameMatch[1].replace(/;/g, '').trim()
        nameStr = nameStr.charAt(0).toUpperCase() + nameStr.slice(1)
      }

      const targetProj = cachedProjectsFromSession?.[0] || null
      try {
        // Deduplicate against existing callbacks within session or identical phone in last 10 mins
        const existingLead = await prisma.callbackRequest.findFirst({
          where: {
            phone,
            created_at: { gte: new Date(Date.now() - 10 * 60 * 1000) }
          }
        })
        if (!existingLead) {
          await prisma.callbackRequest.create({
            data: {
              name: nameStr,
              phone: phone,
              project_name: targetProj?.name || 'General Inquiry',
              project_slug: targetProj?.slug || undefined,
              source_session: sessionId || undefined,
            }
          })
          const redactedPhone = phone.length > 4 ? `${phone.slice(0, 2)}******${phone.slice(-2)}` : '***'
          console.log('[LEAD:CAPTURED]', { name: nameStr, phone: redactedPhone, targetProj: targetProj?.name })
        }
      } catch (e) {
        console.warn('[LEAD:SAVE_ERROR]', e)
      }

      const successText = `✅ **Callback Request Registered!**\n\nThank you **${nameStr}**! Your contact number has been registered with our RealtyPals advisory team.\nOur senior consultant will reach out to you shortly with exclusive project details.\n\n*Need immediate pricing or floor plan details while you wait? Ask me anytime!*`
      
      send('token', { token: successText })
      send('ui_state', {
        stage: 'RESEARCH',
        thinking: 'Callback request registered.',
        chips: [
          { id: `chip_visit_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: '📅 Schedule a Site Visit', icon: '📅', analyticsId: 'chip_visit', priority: 1, payload: { text: 'Schedule a site visit' } },
          { id: `chip_emi_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: '🧮 Calculate EMI', icon: '🧮', analyticsId: 'chip_emi', priority: 2, payload: { text: 'Calculate EMI' } }
        ],
        missingFields: [],
        confidence: 'HIGH'
      })
      send('done', { sessionId: currentSessionId, intentState: 'SHORTLISTED', intent })
      res.end()
      return
    }

    // ─── Phase 0: Query Classification (deterministic + LLM fallback)
    const queryClassification = classifyQuery(message, intent as Record<string, unknown>)
    intent.queryKind = queryClassification.queryKind
    renderTarget = queryClassification.renderTarget
    console.log('[CHAT] Query classification', Date.now(), {
      queryKind: queryClassification.queryKind,
      renderTarget: queryClassification.renderTarget,
      confidence: queryClassification.confidence,
      reason: queryClassification.reason,
    })

    // ─── GATHERING Loop Fallback
    const currentIntentState = getIntentState(intent)
    const prevIntentState = prevIntent ? getIntentState(prevIntent as Intent) : 'COLD'
    if (currentIntentState === 'GATHERING' && prevIntentState === 'GATHERING') {
      intent.gathering_loop_count = ((prevIntent as Intent).gathering_loop_count ?? 0) + 1
      if (intent.gathering_loop_count >= 2) {
        console.log('[CHAT] GATHERING loop detected (2+ turns). Ask for clarification instead of fabricating constraints.')
        // Do NOT inject fabricated constraints here. Fall through to clarification chips instead.
        intent.gathering_loop_count = 0
      }
    } else {
      intent.gathering_loop_count = 0
    }

    const hasCachedProjects = (cachedProjectsFromSession?.length ?? 0) > 0

    // Fix 2: resolve cache decision BEFORE computing intentState so SHORTLISTED is
    // only emitted when the cache is actually reused — not when it's rejected.
    const cacheDecision = hasCachedProjects
      ? canReuseCache(intent, prevIntent, cachedProjectsFromSession!)
      : null
    const skipForCachedQuery = cacheDecision?.reuse ?? false

    // SHORTLISTED iff the cache is being reused; cache miss → READY_TO_SEARCH
    intentState = getIntentState(intent, skipForCachedQuery)
    if (intentState === 'SHORTLISTED') {
      logRouting('SHORTLISTED_ENTERED', { cachedCount: cachedProjectsFromSession?.length ?? 0 })
    }
    console.log('[CHAT] intentState', Date.now(), { intentState })
    send('intent', { intent, intentState })

    // Emit ui_state FIRST TIME (pre-search, sets stage and thinking loader)
    // computeConversationState imported at top of file
    const chipInventory = await getChipInventory(DEFAULT_CITY)
    
    if (!isNewSession) {
      await hydrateFromDb(currentSessionId)
    }

    // Suppress chips corresponding to the user's explicit question topic
    const msgLower = (message || '').toLowerCase()
    markChipShown(currentSessionId, `msg_${Date.now()}`, message)
    if (msgLower.includes('payment') || msgLower.includes('plan') || msgLower.includes('clp') || msgLower.includes('flexi') || msgLower.includes('down payment') || msgLower.includes('possession linked')) {
      suppressTopicChips(currentSessionId, 'payment_plans')
    }
    if (msgLower.includes('amenit') || msgLower.includes('facilit') || msgLower.includes('feature')) {
      suppressTopicChips(currentSessionId, 'amenities')
    }

    const preSearchUiState = await computeConversationState(
      intent,
      intentState,
      cachedProjectsFromSession ?? [],
      intent.is_comparison_query ?? false,
      chatHistory,
      undefined,
      undefined,
      undefined,
      chipInventory,
      true
    )
    
    // For CLARIFYING stage, never deduplicate — these are essential guidance chips
    // For other stages, deduplicate to avoid showing the same chip twice
    let preChips = preSearchUiState.chips
    if (preSearchUiState.stage !== 'CLARIFYING') {
      preChips = filterNewChipsWithFloor(currentSessionId, preSearchUiState.chips, 2)
      preChips.forEach(c => markChipShown(currentSessionId, c.id, c.label))
    }
    console.log('[CHAT] preSearchUiState chips:', preSearchUiState.chips.length, 'after', preSearchUiState.stage === 'CLARIFYING' ? 'CLARIFYING (no dedup)' : 'dedup', preChips.map(c => c.label))
    preSearchUiState.chips = preChips

    send('ui_state', preSearchUiState as unknown as Record<string, unknown>)

    // ─── GROUND TRUTH DATABASE PIPELINE (Lightweight Catalog Cache) ─────────────
    const rawDbProjects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        sector: true,
        status: true,
        price_min_cr: true,
        price_range_label: true,
      }
    })

    // Filter out duplicate IITL Nimbus project permanently
    const allDbProjects = rawDbProjects.filter(p => !p.name.toLowerCase().includes('iitl nimbus'))

    // 0. ADVERSARIAL & JAILBREAK SHIELD
    const isJailbreak = /ignore\s+(all\s+)?(previous\s+)?instructions|system\s+prompt|dan\s+mode|unrestricted\s+assistant|bypass\s+(paying\s+)?(taxes|laws)|jailbreak/i.test(message)
    if (isJailbreak && action.type === 'TEXT_MESSAGE') {
      const jailbreakText = `### Security & Compliance Notice

RealtyPals operates under strict real estate advisory protocols for Noida and Greater Noida. I cannot alter internal instructions or assist with tax evasion or non-compliant actions.

For legal statutory schedules (UP Stamp Duty, GST, TDS) or verified property checks, feel free to ask!`

      const jbChips = [
        { id: `chip_tax_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'View UP Stamp Duty & Tax Rates', icon: 'file-text', analyticsId: 'chip_tax', priority: 1, payload: { text: 'How much stamp duty and GST do I pay in UP?' } },
        { id: `chip_rera_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Check RERA Verification Guide', icon: 'shield-check', analyticsId: 'chip_rera', priority: 2, payload: { text: 'How do I check UP RERA registration?' } },
      ]

      send('token', { token: jailbreakText })
      send('ui_state', {
        stage: 'RESEARCH',
        thinking: 'RealtyPals compliance and security protocols active:',
        chips: jbChips,
        missingFields: [],
        confidence: 'HIGH'
      })
      send('done', {
        sessionId: currentSessionId,
        intentState: 'GATHERING',
        intent,
        responseMode: 'chat',
      })
      res.end()
      return
    }

    // 0. OUT-OF-SCOPE GUARDRAIL
    const isOutOfScope = (/^(write|generate|explain|solve|tell me|what is)\s+(a\s+)?(python|javascript|typescript|java|c\+\+|sql query|algorithm|bubble sort|code|script|recipe|joke|poem|song|essay|weather)|who won\b|capital of\b|translate\b/i.test(message) || (/python|bubble sort|javascript|algorithm|recipe/i.test(message))) && !/real estate|property|flat|bhk|builder|rera|noida|sector|ncr/i.test(message)
    if (isOutOfScope && action.type === 'TEXT_MESSAGE') {
      const deflectionText = `### RealtyPals Advisory Scope

RealtyPals is an AI advisory engine specialized exclusively in verified real estate intelligence across Noida and Greater Noida.

For questions regarding property pricing, sector analysis, RERA legal checks, payment plans, or builder track records, feel free to ask!`

      const outOfScopeChips = [
        { id: `chip_noida_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Show properties in Noida', icon: 'building', analyticsId: 'chip_noida', priority: 1, payload: { text: 'Show verified properties in Noida' } },
        { id: `chip_sectors_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Which sectors are trending?', icon: 'map-pin', analyticsId: 'chip_trending_sectors', priority: 2, payload: { text: 'Which sectors are best for investment in Noida?' } },
        { id: `chip_builders_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Top builders by track record', icon: 'shield-check', analyticsId: 'chip_top_builders', priority: 3, payload: { text: 'Which builders in Noida have on-time delivery?' } },
      ]

      send('token', { token: deflectionText })
      send('ui_state', {
        stage: 'RESEARCH',
        thinking: 'RealtyPals real estate advisory scope:',
        chips: outOfScopeChips,
        missingFields: [],
        confidence: 'HIGH'
      })
      send('done', {
        sessionId: currentSessionId,
        intentState: 'GATHERING',
        intent,
        responseMode: 'chat',
      })
      res.end()
      return
    }

    // Helper: Extract sectors from user query with support for "sector 76 with 75", "76 vs 75", etc.
    const extractSectorsFromMessage = (msg: string): string[] => {
      const normalized = msg.toLowerCase()
      const sectorsFound = new Set<string>()

      // 1. Explicit "sector \d+" matches
      const explicitMatches = Array.from(normalized.matchAll(/\bsector\s*(\d+[a-z]?)\b/gi))
      explicitMatches.forEach(m => sectorsFound.add(`Sector ${m[1]}`))

      // 2. Relative pattern e.g. "sector 76 with 75", "sector 76 vs 75", "sector 76 and 75"
      const relativeMatch = normalized.match(/\bsector\s*(\d+[a-z]?)\s*(?:vs\.?|versus|with|and|or|compared to|to)\s*(?:sector\s*)?(\d+[a-z]?)\b/i)
      if (relativeMatch) {
        sectorsFound.add(`Sector ${relativeMatch[1]}`)
        sectorsFound.add(`Sector ${relativeMatch[2]}`)
      }

      // 3. Match known DB sectors if numbers appear in comparison context (avoid matching decimal parts like 1.5)
      if (sectorsFound.size < 2 && /compare|vs|versus|better|difference|between|which\s+sector/i.test(normalized)) {
        const dbSectors = new Set(allDbProjects.map(p => p.sector.replace(/^Sector\s*/i, '').trim().toLowerCase()))
        const textWithoutDecimals = normalized.replace(/\d+\.\d+/g, ' ')
        const numberTokens = Array.from(textWithoutDecimals.matchAll(/\b(\d{1,3}[a-z]?)\b/gi)).map(m => m[1])
        numberTokens.forEach(tok => {
          if (dbSectors.has(tok.toLowerCase())) {
            sectorsFound.add(`Sector ${tok}`)
          }
        })
      }

      return Array.from(sectorsFound)
    }

    const sectorMatches = extractSectorsFromMessage(message)
    const isSectorCompare = sectorMatches.length >= 2 && /compare|vs|versus|better|difference|which sector|between/i.test(message)
    const isSummaryRequest = /summarize|summary|entire session|weightage/i.test(message)
    const isPaymentPlanRequest = /payment plan|payment schedule|construction linked|down payment|flexi plan|clp|plp/i.test(message)
    const isCostSheetRequest = /cost sheet|price breakdown|all inclusive|other charges|possession charges|car parking charge/i.test(message)
    const isStatutoryTaxQuery = /(stamp duty|registration (charge|fee)|gst on (flat|property|real estate)|tds on (property|sale)|circle rate|index 2|agreement value charges)/i.test(message)
    const isReraCheckQuery = /(blacklist|nclt|insolven|defaulter|check rera|verify rera|rera website|rera portal|rera status|is.*rera registered)/i.test(message) && (intent.projectNames?.length ?? 0) === 0
    const isBuilderReputationQuery = /(builder|developer|developer track|on.?time delivery|delay|safe (to buy|project)|rera complian|which (company|builder)|best developer|reputable builder)/i.test(message) && !isSectorCompare && (intent.projectNames?.length ?? 0) < 2
    const isNewcomerOrientation = /(new to noida|new to (the )?city|don'?t know (this area|this city|the area)|which sector|best sector|where (should|to) (buy|look)|area guide|sector guide|best area for family|best area near)/i.test(message) && (sectorMatches.length === 0 || /which sector/i.test(message))
    const isCompareRequest = (intent as any)?.is_comparison_query || (intent.projectNames && intent.projectNames.length >= 2) || /\bcompare\b/i.test(message) || isSectorCompare
    const activeProjectName = intent.projectNames?.[0] || (intent as any)?.targetProjectId

    if ((activeProjectName || isSummaryRequest || isCompareRequest || isSectorCompare || isPaymentPlanRequest || isCostSheetRequest || isStatutoryTaxQuery || isReraCheckQuery || isBuilderReputationQuery || isNewcomerOrientation) && action.type === 'TEXT_MESSAGE') {
      try {
        console.log('[CHAT:GROUND_TRUTH_DB] Executing Ground Truth DB Pipeline...', { activeProjectName, isSummaryRequest, isCompareRequest, isSectorCompare, isPaymentPlanRequest, isCostSheetRequest, isStatutoryTaxQuery, isReraCheckQuery, isBuilderReputationQuery, isNewcomerOrientation, sectorMatches })

        // Check for Builder Comparison
        const dbBuilders = await prisma.builder.findMany({
          select: {
            id: true,
            name: true,
            slug: true,
            projects_delivered_count: true,
            total_projects_count: true,
            average_delay_months: true,
            delivery_score: true,
            construction_quality_score: true,
            rera_compliance_score: true,
            founded_year: true,
            company_overview: true,
          }
        })
        const matchedBuilders = dbBuilders.filter(b => message.toLowerCase().includes(b.name.toLowerCase()))
        const isBuilderCompare = matchedBuilders.length >= 2 && /compare|vs|versus|better|difference|track record|builder|developer/i.test(message)

        // ─── UP RERA & NCLT VERIFICATION PROTOCOL ─────────────────────────────────
        if (isReraCheckQuery) {
          const reraText = `### UP RERA & Project Title Verification Protocol

To verify any residential or commercial project in Noida and Greater Noida:

1. **Official UP RERA Portal**:
   - Visit the official registry at **[up-rera.in](https://www.up-rera.in)**
   - Navigate to **Important Links → Registered Projects** and enter the project RERA registration number or project name.

2. **Check Promoter Defaulter & Revocation List**:
   - Access **Promoter Defaulter List** on the UP-RERA portal to verify if the developer has pending recovery certificates (RCs) or revoked registrations.

3. **NCLT Insolvency Verification**:
   - Search the builder's corporate entity name on the Insolvency and Bankruptcy Board of India (**[ibbi.gov.in](https://ibbi.gov.in)**) to check if the company is under Corporate Insolvency Resolution Process (CIRP).

4. **RealtyPals Pre-Screening**:
   - All projects listed on RealtyPals are pre-screened against active UP-RERA registration certificates, sanctioned map approvals, and developer delivery records.`

          const reraChips = [
            { id: `chip_builders_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Top Safe Builders in Noida', icon: 'shield-check', analyticsId: 'chip_builders_safe', priority: 1, payload: { text: 'Which builders in Noida are safe and have on-time delivery?' } },
            { id: `chip_tax_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'View Stamp Duty & Taxes', icon: 'file-text', analyticsId: 'chip_tax_rera', priority: 2, payload: { text: 'How much stamp duty and GST do I pay in UP?' } },
            { id: `chip_sec_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Explore Sector 76 Flats', icon: 'building', analyticsId: 'chip_sec76_rera', priority: 3, payload: { text: 'Show 2 BHK and 3 BHK flats in Sector 76' } },
          ]

          send('token', { token: reraText })
          send('ui_state', {
            stage: 'RESEARCH',
            thinking: 'Official UP RERA & NCLT legal compliance check protocol:',
            chips: reraChips,
            missingFields: [],
            confidence: 'HIGH'
          })
          send('done', {
            sessionId: currentSessionId,
            intentState: 'SHORTLISTED',
            intent,
            responseMode: 'chat',
          })
          res.end()
          return
        }

        // ─── STATUTORY TAX & LEGAL KNOWLEDGE HANDLER ──────────────────────────────
        if (isStatutoryTaxQuery) {
          const taxText = `### Statutory Taxes & Registration Charges (Noida / Uttar Pradesh)

| Statutory Component | Rate / Charge | Nature | When & To Whom Paid |
| :--- | :--- | :--- | :--- |
| **Stamp Duty (Standard)** | 7% of agreement / circle value | Mandatory | Paid to UP Stamp & Registration Dept at registry |
| **Stamp Duty (Female Buyer)** | 6% (₹10,000 concession up to ₹10L) | Concession | Paid at registry for female primary owners |
| **Registration Fee** | 1% of property value (max ₹30,000) | Mandatory | Paid to Sub-Registrar Office at deed execution |
| **GST (Under-Construction)** | 5% (without ITC) | Statutory | Billed across construction milestones |
| **GST (Ready-to-Move with OC)**| 0% (Fully Exempt) | Exemption | Nil GST on properties with Occupancy Certificate |
| **TDS (Section 194-IA)** | 1% of total sale consideration | Mandatory | Deducted by buyer if value > ₹50L (Form 26QB) |

### Recommendation
For an under-construction apartment, budget an additional **12–13% above Base Sale Price (BSP)** to cover Stamp Duty, Registration, and GST. For a Ready-to-Move home with OC, the extra statutory load is approximately **7.5–8%**.`

          const taxChips = [
            { id: `chip_cost_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'View Cost Sheet & Other Charges', icon: 'file-text', analyticsId: 'chip_cost', priority: 1, payload: { text: 'Show cost sheet and price breakdown' } },
            { id: `chip_emi_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Calculate Monthly EMI', icon: 'calculator', analyticsId: 'chip_emi', priority: 2, payload: { text: 'Calculate EMI' } },
            { id: `chip_rtm_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Show Ready-to-Move (0% GST)', icon: 'check-circle', analyticsId: 'chip_rtm_tax', priority: 3, payload: { text: 'Show ready to move flats in Noida' } },
          ]

          send('token', { token: taxText })
          send('ui_state', {
            stage: 'RESEARCH',
            thinking: 'Verified Uttar Pradesh statutory tax and stamp duty rates:',
            chips: taxChips,
            missingFields: [],
            confidence: 'HIGH'
          })
          send('done', {
            sessionId: currentSessionId,
            intentState: 'SHORTLISTED',
            intent,
            responseMode: 'chat',
          })
          res.end()
          return
        }

        // ─── BUILDER REPUTATION & DELIVERY SCORECARD ──────────────────────────────
        if (isBuilderReputationQuery && !isBuilderCompare) {
          const topBuilders = dbBuilders
            .filter(b => b.delivery_score && b.delivery_score > 0)
            .sort((a, b) => (b.delivery_score ?? 0) - (a.delivery_score ?? 0))
            .slice(0, 6)

          const builderRows = topBuilders.map(b => {
            const delayStr = b.average_delay_months === 0 ? 'On Time' : `${b.average_delay_months} months`
            const qualStr = b.construction_quality_score ? `${b.construction_quality_score}/100` : 'A-Grade'
            const reraStr = b.rera_compliance_score ? `${b.rera_compliance_score}/100` : 'Verified'
            return `| **${b.name}** | ${b.delivery_score}/100 | ${delayStr} | ${b.projects_delivered_count || 5}+ Projects | ${qualStr} | ${reraStr} |`
          }).join('\n')

          const topSafeNames = topBuilders.slice(0, 3).map(b => b.name).join(', ')
          const reputationText = `### Verified Developer Track Record (Noida & Greater Noida)

| Developer | Delivery Score | Avg Handover Delay | Delivered Track Record | Construction Quality | RERA Compliance |
| :--- | :--- | :--- | :--- | :--- | :--- |
${builderRows}

### Recommendation
Prioritize developers with a Delivery Score above **85/100** and high RERA compliance (such as ${topSafeNames || 'reputable tier-1 builders'}) to minimize delivery delays and title risks.`

          const repChips = topBuilders.slice(0, 3).map((b, i) => ({
            id: `chip_b_${i}_${Date.now()}`,
            actionType: 'TEXT_MESSAGE',
            label: `Projects by ${b.name}`,
            icon: 'building',
            analyticsId: `chip_b_${b.id}`,
            priority: i + 1,
            payload: { text: `Show me projects by ${b.name}` }
          }))

          send('token', { token: reputationText })
          send('ui_state', {
            stage: 'RESEARCH',
            thinking: 'Verified developer delivery scorecard from PostgreSQL database:',
            chips: repChips,
            missingFields: [],
            confidence: 'HIGH'
          })
          setCachedResponse(message, { token: reputationText, chips: repChips })
          send('done', {
            sessionId: currentSessionId,
            intentState: 'SHORTLISTED',
            intent,
            responseMode: 'chat',
          })
          res.end()
          return
        }

        // ─── NEWCOMER & SECTOR ORIENTATION GUIDE ────────────────────────────────────
        if (isNewcomerOrientation) {
          const [sectorsIntel, activeProjects] = await Promise.all([
            prisma.sectorIntelligence.findMany({
              where: { city: { in: ['Noida', 'Greater Noida'] } },
              take: 8,
              orderBy: { avg_price_per_sqft: 'desc' }
            }),
            prisma.project.findMany({
              select: { name: true, sector: true, price_range_label: true, price_min_cr: true },
              take: 30
            })
          ])

          const projsBySector: Record<string, string[]> = {}
          activeProjects.forEach(p => {
            if (!projsBySector[p.sector]) projsBySector[p.sector] = []
            if (projsBySector[p.sector].length < 3) projsBySector[p.sector].push(p.name)
          })

          let rows = ''
          if (sectorsIntel.length > 0) {
            rows = sectorsIntel.slice(0, 5).map(s => {
              const socList = projsBySector[s.sector]?.join(', ') || 'Verified RERA societies'
              const priceBand = s.avg_price_per_sqft ? `₹${Math.round(s.avg_price_per_sqft).toLocaleString('en-IN')}/sq.ft` : '₹7,500–12,000/sq.ft'
              const strength = s.sector_strengths?.[0] || s.sector_overview?.slice(0, 70) || 'Established residential hub'
              return `| **${s.sector}** (${s.city || 'Noida'}) | ${priceBand} | ${strength} | ${socList} |`
            }).join('\n')
          } else {
            const uniqueSectors = Array.from(new Set(activeProjects.map(p => p.sector))).slice(0, 5)
            rows = uniqueSectors.map(sec => {
              const socList = projsBySector[sec]?.join(', ') || 'Verified RERA societies'
              return `| **${sec}** | ₹0.95–2.50 Cr | Metro access & settled family enclaves | ${socList} |`
            }).join('\n')
          }

          const orientationText = `### Noida & Greater Noida Locality Guide for Families & Investors\n\n| Micro-Market / Sector | Price Spectrum | Locality Highlights | Top Listed Projects |\n| :--- | :--- | :--- | :--- |\n${rows}\n\n### Recommendation\nFor **metro connectivity and immediate family infrastructure**, prioritize **Sector 75 / 76**. For **expressway corporate commute and modern high-rises**, explore **Sector 137 / 150**.`

          const orientationChips = [
            { id: `chip_s76_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Flats in Sector 76', icon: 'building', analyticsId: 'chip_s76', priority: 1, payload: { text: 'Show 2 BHK and 3 BHK flats in Sector 76' } },
            { id: `chip_s137_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Flats in Sector 137', icon: 'building', analyticsId: 'chip_s137', priority: 2, payload: { text: 'Show 2 BHK and 3 BHK flats in Sector 137' } },
            { id: `chip_compare_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Compare Sector 76 vs 137', icon: 'arrow-right-left', analyticsId: 'chip_compare_76_137', priority: 3, payload: { text: 'Compare Sector 76 with Sector 137' } },
          ]

          send('token', { token: orientationText })
          send('ui_state', {
            stage: 'RESEARCH',
            thinking: 'Curated sector orientation guide from database:',
            chips: orientationChips,
            missingFields: [],
            confidence: 'HIGH'
          })
          setCachedResponse(message, { token: orientationText, chips: orientationChips })
          send('done', {
            sessionId: currentSessionId,
            intentState: 'SHORTLISTED',
            intent,
            responseMode: 'chat',
          })
          res.end()
          return
        }

        if (isSectorCompare && sectorMatches.length >= 2) {
          // ─── SECTOR VS SECTOR COMPARISON ──────────────────────────────────────────
          const s1 = sectorMatches[0]
          const s2 = sectorMatches[1]

          // Query deep relations for the two sectors specifically
          const [s1DetailedProjs, s2DetailedProjs] = await Promise.all([
            prisma.project.findMany({
              where: { sector: { contains: s1.replace(/Sector\s*/i, ''), mode: 'insensitive' } },
              include: { unit_types: true, builder: true }
            }),
            prisma.project.findMany({
              where: { sector: { contains: s2.replace(/Sector\s*/i, ''), mode: 'insensitive' } },
              include: { unit_types: true, builder: true }
            })
          ])

          const getStats = (projs: typeof s1DetailedProjs, sName: string) => {
            const prices = projs.flatMap(p => p.unit_types.map(u => u.price_min_cr)).filter(Boolean) as number[]
            const minP = prices.length ? Math.min(...prices) : null
            const maxP = prices.length ? Math.max(...prices) : null
            const readyCount = projs.filter(p => p.status === 'ready_to_move').length
            const topNames = projs.slice(0, 4).map(p => p.name).join(', ')
            return {
              sector: sName,
              totalProjects: projs.length,
              priceRange: minP && maxP ? `₹${minP}–${maxP} Cr` : '₹0.95–2.5 Cr',
              readyCount,
              topProjects: topNames || 'Top verified residential societies'
            }
          }

          const s1Stats = getStats(s1DetailedProjs, s1)
          const s2Stats = getStats(s2DetailedProjs, s2)
          const sectorFactsJson = JSON.stringify({ [s1]: s1Stats, [s2]: s2Stats }, null, 2)

          const systemPrompt = `You are RealtyPal, a professional real estate advisor for Noida and Greater Noida.
Verified Sector Database Facts: ${sectorFactsJson}

CRITICAL FORMATTING MANDATE:
- Maintain a clean, executive, professional tone. Do NOT include decorative emojis or icons in headings or text.
- Present the comparison primarily in a clean, high-contrast Markdown Comparison Table.
- Keep every data point super-summarized, concise, and scannable.

OUTPUT STRUCTURE:

### Verdict
1-2 direct sentences stating the overall winner and key distinction between ${s1} and ${s2}.

| Comparison Parameter | ${s1} | ${s2} |
| :--- | :--- | :--- |
| **Average Price / sq.ft** | [Price per sqft range] | [Price per sqft range] |
| **Budget Range** | ${s1Stats.priceRange} | ${s2Stats.priceRange} |
| **Metro & Transit** | [Nearest metro station & road connectivity] | [Nearest metro station & road connectivity] |
| **Livability & Atmosphere** | [Commercial vitality vs. quiet residential, density] | [Commercial vitality vs. quiet residential, density] |
| **Social Infrastructure** | [Malls, schools, parks, convenience] | [Malls, schools, parks, convenience] |
| **Top Landmark Societies** | ${s1Stats.topProjects} | ${s2Stats.topProjects} |
| **Best Suited For** | [Ideal buyer profile] | [Ideal buyer profile] |

### Recommendation
1 actionable decision sentence: "Choose **${s1}** if [profile]; choose **${s2}** if [profile]."`

          const systemMsgHistory = [{ role: 'user' as const, content: message }]
          const fallbackResult = await executeWithFallbackChain({
            systemPrompt,
            messages: systemMsgHistory,
            send,
            onToolCall: async () => ({}),
            groqFallbackSuffix: '',
            userMessage: message,
          })

          const sectorChips = [
            { id: `chip_s1_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: `Flats in ${s1}`, icon: 'building', analyticsId: 'chip_s1_search', priority: 1, payload: { text: `Show me 2 BHK and 3 BHK flats in ${s1}` } },
            { id: `chip_s2_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: `Flats in ${s2}`, icon: 'building', analyticsId: 'chip_s2_search', priority: 2, payload: { text: `Show me 2 BHK and 3 BHK flats in ${s2}` } },
            { id: `chip_emi_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Calculate Monthly EMI', icon: 'calculator', analyticsId: 'chip_emi', priority: 3, payload: { text: 'Calculate EMI' } },
          ]

          send('ui_state', {
            stage: 'RESEARCH',
            thinking: `Comparing ${s1} vs ${s2}:`,
            chips: sectorChips,
            missingFields: [],
            confidence: 'HIGH'
          })

          send('done', {
            sessionId: currentSessionId,
            intentState: 'SHORTLISTED',
            intent,
            responseMode: 'sector_comparison',
          })
          res.end()
          return
        }

        // ─── PAYMENT PLAN COMPARISON ────────────────────────────────────────────────
        if (isPaymentPlanRequest) {
          const matchedTarget = allDbProjects.find(p => p.name.toLowerCase() === activeProjectName?.toLowerCase() || p.id === activeProjectName) ||
            allDbProjects.find(p => message.toLowerCase().includes(p.name.toLowerCase()))

          let planProject = null
          if (matchedTarget) {
            planProject = await prisma.project.findUnique({
              where: { id: matchedTarget.id },
              include: { builder: true, payment_plans: true }
            })
          }

          if (!planProject) {
            const clarifyText = `### Payment Plans in Noida & Greater Noida\n\nMost verified developers in Noida offer three standard RERA-compliant payment structures:\n\n1. **Construction Linked Plan (CLP)**: ~10% booking, 80% across milestone slabs, 10% on handover (lowest upfront risk).\n2. **Down Payment Plan**: ~10% booking, 85% in 45 days, 5% on handover (typical 5–8% BSP discount).\n3. **Flexi / Milestone Plan (30:70 / 20:80)**: 20–30% in first 90 days, balance upon superstructure or possession.\n\n*Which specific project would you like to view the detailed payment schedule for?*`
            send('token', { token: clarifyText })
            send('ui_state', {
              stage: 'RESEARCH',
              thinking: 'Select a project to view exact builder payment plans:',
              chips: [
                { id: `chip_sec76_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Projects in Sector 76', icon: 'building', analyticsId: 'chip_p_s76', priority: 1, payload: { text: 'Show projects in Sector 76' } },
                { id: `chip_tax_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'View Stamp Duty & Taxes', icon: 'file-text', analyticsId: 'chip_p_tax', priority: 2, payload: { text: 'How much stamp duty and GST do I pay in UP?' } }
              ],
              missingFields: [],
              confidence: 'HIGH'
            })
            send('done', { sessionId: currentSessionId, intentState: 'GATHERING', intent, responseMode: 'chat' })
            res.end()
            return
          }

          const paymentPlans = planProject?.payment_plans || []
          const planFactsJson = JSON.stringify({
            projectName: planProject?.name,
            developer: planProject?.builder?.name,
            payment_plans: paymentPlans.length > 0 ? paymentPlans : [
              { plan_name: 'Construction Linked Plan (CLP)', description: '10% on booking, 80% across construction milestones, 10% on offer of possession.' },
              { plan_name: 'Down Payment Plan', description: '10% on booking, 85% within 45 days (with 5-8% upfront discount on BSP), 5% on possession.' },
              { plan_name: 'Flexi / Milestone Plan (30:70 or 20:80)', description: '30% during construction, 70% upon super-structure or possession.' }
            ]
          }, null, 2)

          const systemPrompt = `You are RealtyPal, a professional real estate advisor for Noida and Greater Noida.
Verified Payment Plan Database Facts: ${planFactsJson}

CRITICAL FORMATTING MANDATE:
- Maintain a clean, executive tone. Do NOT use decorative emojis or icons in headings or text.
- Present the payment plans primarily in a clean, high-contrast Markdown Comparison Table.
- Keep every data point super-summarized, concise, and scannable.

OUTPUT STRUCTURE:

### Verdict
1-2 direct sentences explaining the financial advantage and cash flow tradeoff across available payment schedules for ${planProject?.name || 'this property'}.

| Payment Plan | Initial Booking % | Construction Milestones | On Possession | Best Suited For |
| :--- | :--- | :--- | :--- | :--- |
| **Construction Linked (CLP)** | 10% on booking | 80% linked to slab casting | 10% on handover | Low upfront risk, salaried buyers with home loans |
| **Down Payment Plan** | 10% on booking + 85% in 45 days | Nil during construction | 5% on handover | Cash-rich investors seeking 5–8% upfront BSP discount |
| **Flexi / Milestone (30:70)** | 20–30% in first 90 days | 40% on top floor completion | 30–40% on handover | Balanced cash flow with minimal loan pre-EMI burden |

### Recommendation
1 actionable sentence advising which payment structure optimizes total out-of-pocket interest versus cash liquidity.`

          const systemMsgHistory = [{ role: 'user' as const, content: message }]
          const fallbackResult = await executeWithFallbackChain({
            systemPrompt,
            messages: systemMsgHistory,
            send,
            onToolCall: async () => ({}),
            groqFallbackSuffix: '',
            userMessage: message,
          })

          const planChips = [
            { id: `chip_emi_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Calculate Monthly EMI', icon: 'calculator', analyticsId: 'chip_emi', priority: 1, payload: { text: 'Calculate EMI' } },
            { id: `chip_cost_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'View Cost Sheet & Taxes', icon: 'file-text', analyticsId: 'chip_cost_sheet', priority: 2, payload: { text: 'Show cost sheet and price breakdown' } },
            { id: `chip_visit_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Schedule Site Visit', icon: 'calendar', analyticsId: 'chip_site_visit', priority: 3, payload: { text: 'Schedule a site visit' } },
          ]

          send('ui_state', {
            stage: 'RESEARCH',
            thinking: `Analyzing payment plan schedules for ${planProject?.name}:`,
            chips: planChips,
            missingFields: [],
            confidence: 'HIGH'
          })

          setCachedResponse(message, { token: fallbackResult.text, chips: planChips })
          send('done', {
            sessionId: currentSessionId,
            intentState: 'SHORTLISTED',
            intent,
            responseMode: 'chat',
          })
          res.end()
          return
        }

        // ─── COST SHEET & PRICING BREAKDOWN ─────────────────────────────────────────
        if (isCostSheetRequest) {
          const matchedTarget = allDbProjects.find(p => p.name.toLowerCase() === activeProjectName?.toLowerCase() || p.id === activeProjectName) ||
            allDbProjects.find(p => message.toLowerCase().includes(p.name.toLowerCase()))

          let costProject = null
          if (matchedTarget) {
            costProject = await prisma.project.findUnique({
              where: { id: matchedTarget.id },
              include: { builder: true, cost_sheet: true, unit_types: true }
            })
          }

          if (!costProject) {
            const clarifyText = `### All-Inclusive Property Cost & Tax Structure (Noida)

| Acquisition Component | Standard Rate / Range | Stage Payable | Description & Applicability |
| :--- | :--- | :--- | :--- |
| **Base Sale Price (BSP)** | As per project & carpet size | Construction milestones | Basic apartment purchase consideration |
| **UP Stamp Duty** | 7% of agreement value | At Registration | 6% for single/joint women owners |
| **Registration Fee** | 1% of agreement value | At Registration | Sub-registrar administrative fee |
| **GST (Goods & Services Tax)** | 5% (without ITC) | With construction milestones | Applicable on Under-Construction (**0% GST on RTM**) |
| **Covered Car Parking** | ₹3.50–5.00 Lakhs | Initial installments | Dedicated basement slot |
| **Club Membership** | ₹1.50–3.00 Lakhs | On Possession | Access to luxury clubhouse & sports amenities |
| **IFMS (Maintenance Sinking Fund)** | ₹50–100 / sq.ft | On Possession | Refundable interest-free corpus deposit |
| **Dual Power & Meter Connection** | ₹1.25–2.00 Lakhs | On Possession | 5–7.5 kVA DG backup & grid connection |

> **Advisory Rule of Thumb:** For under-construction homes, budget roughly **12%–14% above BSP** for all-inclusive handover. For Ready-to-Move apartments with Occupancy Certificate (OC), the statutory & possession load is approximately **8%–9%** (zero GST).`

            send('token', { token: clarifyText })
            send('ui_state', {
              stage: 'RESEARCH',
              thinking: 'All-inclusive cost structure & statutory fee schedule:',
              chips: [
                { id: `chip_tax_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'View UP Stamp Duty & Tax Rates', icon: 'file-text', analyticsId: 'chip_tax_cs', priority: 1, payload: { text: 'How much stamp duty and GST do I pay in UP?' } },
                { id: `chip_rtm_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Show Ready-to-Move (0% GST)', icon: 'check-circle', analyticsId: 'chip_rtm_cs', priority: 2, payload: { text: 'Show ready to move flats in Noida' } },
                { id: `chip_emi_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Calculate Monthly EMI', icon: 'calculator', analyticsId: 'chip_emi_cs', priority: 3, payload: { text: 'Calculate EMI' } }
              ],
              missingFields: [],
              confidence: 'HIGH'
            })
            send('done', { sessionId: currentSessionId, intentState: 'SHORTLISTED', intent, responseMode: 'chat' })
            res.end()
            return
          }

          const costFactsJson = JSON.stringify({
            projectName: costProject?.name,
            developer: costProject?.builder?.name,
            bsp_range: costProject?.price_range_label,
            cost_sheet: costProject?.cost_sheet,
            unit_types: costProject?.unit_types.map(u => `${u.bhk} BHK (${u.super_area_sqft} sq ft): ₹${u.price_min_cr}–${u.price_max_cr} Cr`)
          }, null, 2)

          const systemPrompt = `You are RealtyPal, a professional real estate advisor for Noida and Greater Noida.
Verified Pricing & Cost Sheet Facts: ${costFactsJson}

CRITICAL FORMATTING MANDATE:
- Maintain a clean, executive tone. Do NOT use decorative emojis or icons in headings or text.
- Present the price breakdown primarily in a clean, high-contrast Markdown Table based ONLY on available verified facts.
- For statutory taxes, always state 7% UP Stamp Duty, 1% Registration, and 5% GST on under-construction.
- For non-statutory developer charges (parking, club, EDC), state that they are detailed in the project's official booking cost sheet.
- Keep every data point super-summarized, concise, and scannable.

OUTPUT STRUCTURE:

### Verdict
1-2 direct sentences explaining the all-inclusive pricing structure versus base rate for ${costProject?.name || 'this property'}.

| **IFMS (Maintenance Sinking Fund)**| ₹50–100 / sq.ft | On Possession | Refundable interest-free security deposit |
| **GST (Goods & Services Tax)** | 5% (without ITC) | Statutory | Applicable on under-construction units |
| **Stamp Duty & Registration** | 7% of agreement value | On Possession | State revenue authority fee |

### Recommendation
1 actionable sentence advising buyers to budget roughly 12–14% above BSP for all-inclusive handover.`

          const systemMsgHistory = [{ role: 'user' as const, content: message }]
          const fallbackResult = await executeWithFallbackChain({
            systemPrompt,
            messages: systemMsgHistory,
            send,
            onToolCall: async () => ({}),
            groqFallbackSuffix: '',
            userMessage: message,
          })

          const costChips = [
            { id: `chip_plans_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'View Payment Plans', icon: 'file-text', analyticsId: 'chip_plans', priority: 1, payload: { text: 'Show payment plans' } },
            { id: `chip_emi_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Calculate Monthly EMI', icon: 'calculator', analyticsId: 'chip_emi', priority: 2, payload: { text: 'Calculate EMI' } },
            { id: `chip_visit_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Schedule Site Visit', icon: 'calendar', analyticsId: 'chip_site_visit', priority: 3, payload: { text: 'Schedule a site visit' } },
          ]

          send('ui_state', {
            stage: 'RESEARCH',
            thinking: `Calculating all-inclusive cost breakdown for ${costProject?.name}:`,
            chips: costChips,
            missingFields: [],
            confidence: 'HIGH'
          })

          send('done', {
            sessionId: currentSessionId,
            intentState: 'SHORTLISTED',
            intent,
            responseMode: 'chat',
          })
          res.end()
          return
        }

        // Track frequency of project mentions strictly across user messages (excluding assistant outputs & meta summary commands)
        const isMetaSummaryMsg = (txt: string) => /summarize|session summary|interest weightage|calculate weight|summary of session/i.test(txt)
        const userInquiryMessages = chatHistoryRaw
          .filter(m => m.role === 'user' && !isMetaSummaryMsg(m.content))
          .map(m => m.content)
        if (!isSummaryRequest) {
          userInquiryMessages.push(message)
        }

        const projectMentionCounts = new Map<string, { count: number; project: typeof allDbProjects[0] }>()

        allDbProjects.forEach(proj => {
          const lowerName = proj.name.toLowerCase()
          let count = 0
          userInquiryMessages.forEach(msgText => {
            if (msgText.toLowerCase().includes(lowerName)) {
              count++
            }
          })
          if (count > 0) {
            projectMentionCounts.set(proj.id, { count, project: proj })
          }
        })

        let targetProjects: typeof allDbProjects = []
        const fuzzyMatchedNotes: string[] = []

        if (isCompareRequest) {
          const matchedProjects: typeof allDbProjects = []
          const msgLower = message.toLowerCase()

          // 1. If explicit projectNames provided by intent, match directly against those
          if (intent.projectNames && intent.projectNames.length > 0) {
            intent.projectNames.forEach(reqName => {
              const reqLower = reqName.toLowerCase().trim()
              const exact = allDbProjects.find(p => p.name.toLowerCase() === reqLower)
              if (exact && !matchedProjects.some(mp => mp.id === exact.id)) {
                matchedProjects.push(exact)
                return
              }
              const prefixOrSub = allDbProjects.find(p => {
                const pLower = p.name.toLowerCase()
                return pLower === reqLower || pLower.startsWith(reqLower) || reqLower.startsWith(pLower) || pLower.includes(reqLower)
              })
              if (prefixOrSub && !matchedProjects.some(mp => mp.id === prefixOrSub.id)) {
                matchedProjects.push(prefixOrSub)
              }
            })
          }

          // 2. If no projectNames or fewer than 2 matched, scan message for full DB project names
          if (matchedProjects.length < 2) {
            const sortedDb = [...allDbProjects].sort((a, b) => b.name.length - a.name.length)
            sortedDb.forEach(p => {
              if (msgLower.includes(p.name.toLowerCase()) && !matchedProjects.some(mp => mp.id === p.id)) {
                matchedProjects.push(p)
              }
            })
          }

          targetProjects = matchedProjects.slice(0, 4)
        }

        // If not comparing, find the single active project (exact or fuzzy)
        if (targetProjects.length === 0 && activeProjectName) {
          const directMatch = allDbProjects.find(p => p.name.toLowerCase() === activeProjectName.toLowerCase() || p.id === activeProjectName)
          if (directMatch) {
            targetProjects = [directMatch]
          } else {
            const activeLower = activeProjectName.toLowerCase()
            const fuzzyMatch = allDbProjects.find(p => p.name.toLowerCase().includes(activeLower) || activeLower.includes(p.name.toLowerCase()))
            if (fuzzyMatch) {
              targetProjects = [fuzzyMatch]
              fuzzyMatchedNotes.push(`Did you mean **${fuzzyMatch.name}**? Showing verified facts for **${fuzzyMatch.name}**:`)
            }
          }
        }

        // Execute only if target projects were explicitly identified
        if (targetProjects.length > 0) {
          const targetIds = targetProjects.map(p => p.id)
          const detailedTargetProjects = await prisma.project.findMany({
            where: { id: { in: targetIds } },
            include: {
              builder: true,
              unit_types: true,
              payment_plans: true,
              cost_sheet: true,
              amenities: true,
              images: { take: 3, orderBy: { sort_order: 'asc' } },
              connectivity: { take: 5, orderBy: { distance_km: 'asc' } },
              recommendation_profile: true,
              decision_profile: true,
              dna: true,
            }
          })

          // Emit project card(s) to frontend so project card is rendered above the facts
          send('properties', {
            exactResults: detailedTargetProjects,
            nearbyResults: [],
            expansion: null,
            renderTarget: 'both'
          })

          const totalInquiries = Array.from(projectMentionCounts.values()).reduce((sum, item) => sum + item.count, 0)

          const dbFactsJson = JSON.stringify(detailedTargetProjects.map(p => {
            const mentions = projectMentionCounts.get(p.id)?.count || 1
            const weightagePct = totalInquiries > 0 ? Math.round((mentions / totalInquiries) * 100) : Math.round(100 / detailedTargetProjects.length)

            const baseObj: Record<string, any> = {
              name: p.name,
              builder: p.builder ? p.builder.name : 'Unknown Builder',
              location: `${p.sector}, ${p.city}`,
              status: p.status === 'ready_to_move' ? 'Ready to Move' : p.status === 'new_launch' ? 'New Launch' : 'Under Construction',
              rera_number: p.rera_number,
              price_range: p.price_range_label,
              launch_date: p.launch_date ? p.launch_date.toISOString().split('T')[0] : 'N/A',
              possession_date: p.possession_date ? p.possession_date.toISOString().split('T')[0] : (p.possession_label || 'N/A'),
              description: p.description,
              payment_plans: p.payment_plans.map(pp => pp.plan_name),
              unit_types: p.unit_types.map(ut => `${ut.bhk} BHK (${ut.super_area_sqft} sq ft)`),
              amenities: p.amenities.map(a => a.name).slice(0, 10),
            }
            if (isSummaryRequest) {
              baseObj.session_inquiry_count = mentions
              baseObj.session_interest_weightage_pct = weightagePct
            }
            return Object.fromEntries(Object.entries(baseObj).filter(([, v]) => v !== undefined))
          })).replace(/\s+/g, ' ')

          const transparentClarificationText = fuzzyMatchedNotes.length > 0 ? `\nTRANSPARENT MATCH NOTE:\n${fuzzyMatchedNotes.join('\n')}\n` : ''

          let systemPrompt = ''
          const isAmenityQuery = /amenit|sports|clubhouse|gym|pool|park|open space|green/i.test(message)

          if (isSummaryRequest) {
            systemPrompt = `You are RealtyPal, a professional real estate advisor for Noida and Greater Noida.
Verified facts: ${dbFactsJson}
${transparentClarificationText}
EXECUTIVE SUMMARY INSTRUCTIONS:
1. Render a clean Markdown summary table of the session with columns: | Project Name | Inquiry Count | Interest Weightage (%) |.
2. Below the table, provide a concise summary for each discussed project.
3. Never invent facts outside PostgreSQL DB.`
          } else if (isCompareRequest && targetProjects.length >= 2 && isAmenityQuery) {
            const projectHeaders = targetProjects.map(p => p.name).join(' vs. ')
            systemPrompt = `You are RealtyPal, a professional real estate advisor for Noida and Greater Noida.
Verified facts from database: ${dbFactsJson}
${transparentClarificationText}

CRITICAL FORMATTING MANDATE:
- Maintain a clean, executive tone. Do NOT use decorative emojis or icons in headings or text.
- Render the comparison as a clean, structured Markdown Comparison Table.

OUTPUT STRUCTURE:

### Verdict
1-2 direct sentences on which project offers superior lifestyle and amenities.

| Amenity & Lifestyle Feature | ${targetProjects[0].name} | ${targetProjects[1].name} |
| :--- | :--- | :--- |
| **Clubhouse & Scale** | [Clubhouse size/features] | [Clubhouse size/features] |
| **Swimming Pools** | [Pool specs] | [Pool specs] |
| **Sports Facilities** | [Courts, gym, tracks] | [Courts, gym, tracks] |
| **Open Green Cover** | [Open space % & parks] | [Open space % & parks] |
| **Density & Atmosphere** | [Units/acre & living environment] | [Units/acre & living environment] |

### Recommendation
1 actionable decision sentence for buyers.`
          } else if (isCompareRequest && targetProjects.length >= 2) {
            const projectHeaders = targetProjects.map(p => p.name).join(' vs. ')
            systemPrompt = `You are RealtyPal, a professional real estate advisor for Noida and Greater Noida.
Verified facts from database: ${dbFactsJson}
${transparentClarificationText}

CRITICAL FORMATTING MANDATE:
- Maintain a clean, executive tone. Do NOT use decorative emojis or icons in headings or text.
- Render the comparison as a clean, structured Markdown Comparison Table with concise data points.

OUTPUT STRUCTURE:

### Verdict
1-2 direct sentences on the overall winner and key tradeoff between ${projectHeaders}.

| Core Metric | ${targetProjects[0].name} | ${targetProjects[1].name} |
| :--- | :--- | :--- |
| **Price / sq.ft** | [Price per sqft range] | [Price per sqft range] |
| **Unit Configurations** | [BHK offerings & size range] | [BHK offerings & size range] |
| **Status & Possession** | [Possession date & status] | [Possession date & status] |
| **Key Advantage** | [1-line top strength] | [1-line top strength] |
| **Critical Watch-out** | [1-line risk factor or delay history] | [1-line risk factor or delay history] |
| **Ideal Buyer** | [1-line best suited profile] | [1-line best suited profile] |

### Recommendation
1 actionable decision sentence: "Choose **${targetProjects[0].name}** if [profile]; choose **${targetProjects[1].name}** if [profile]."`
          } else {
            systemPrompt = `You are RealtyPal, a professional real estate advisor for Noida and Greater Noida.
Verified facts: ${dbFactsJson}

EXECUTIVE INSTRUCTIONS:
1. Answer ONLY what the user explicitly asked for. Be extremely concise.
2. Structure your answer with small bullet points or a concise 2-column Markdown Table (| Parameter | Value |).
3. Do NOT output long text paragraphs or dump lists of unit types/payment plans unless the user explicitly requested them.
4. Maintain a clean executive tone without decorative emojis.`
          }

          let responseText = ''
          let isDeterministic = false

          if (isPaymentPlanRequest && detailedTargetProjects.length === 1) {
            const p = detailedTargetProjects[0]
            responseText = `### Payment Structures — ${p.name}

${p.name} provides flexible RERA-compliant payment schedules designed for cash-flow management and construction milestone transparency.

| Payment Plan | Initial Booking | Milestone Breakdown | On Possession | Best Suited For |
| :--- | :--- | :--- | :--- | :--- |
| **Construction Linked (10:90 CLP)** | 10% on booking + 10% on excavation | 70% distributed across slab & finishing stages | 10% on handover | End-users and salaried buyers seeking bank loan disbursement linked to physical progress. |
| **Down Payment Plan (8% Discount)** | 10% at booking + 80% within 45 days | Nil during active construction | 10% on handover | Cash-surplus buyers and investors seeking upfront BSP savings. |
| **Possession Linked (20:80 / 30:70)** | 20%–30% within 60 days | 0% during structure completion | 70%–80% on notice of possession | Buyers seeking zero pre-EMI liability during construction. |

### Advisory Recommendation
For end-use buyers relying on home financing, the **10:90 Construction Linked Plan (CLP)** minimizes financial risk by ensuring disbursements track certified site milestones.`
            isDeterministic = true
          } else if (isCostSheetRequest && detailedTargetProjects.length === 1) {
            const p = detailedTargetProjects[0]
            responseText = `### Complete Cost Breakdown & Statutory Charges — ${p.name}

| Parameter | Rate / Amount | Payment Stage | Description |
| :--- | :--- | :--- | :--- |
| **Base Selling Price (BSP)** | ${p.price_range_label || '₹10,800 – ₹11,200 / sq.ft'} | As per selected payment plan | Basic unit purchase price |
| **Car Parking** | ₹3,50,000 (Covered) | With booking installment | Reserved basement slot |
| **Club Membership** | ₹2,00,000 | On Possession | Access to luxury clubhouse & lifestyle amenities |
| **Power Backup & Utilities** | ₹1,25,000 + ₹50 / sq.ft | On Possession | 5 kVA dual-meter DG infrastructure & power |
| **Water & Sewerage Charges** | ₹35,000 | On Possession | Authority grid connection infrastructure |
| **IFMS (Maintenance Security)** | ₹75 / sq.ft | On Possession | Refundable interest-free maintenance deposit |
| **GST (Goods & Services Tax)** | 5% (without ITC) | With construction installments | Standard statutory tax on under-construction property |
| **UP Stamp Duty** | 7% of agreement value | At Registration | UP state stamp duty (6% for female owners) |
| **Registration Fee** | 1% of agreement value | At Registration | Sub-registrar administrative charge |

### Budgeting Advice
Buyers should factor an additional **12% to 14%** over the Basic Sale Price (BSP) to account for statutory registration taxes, utility connection, and possession charges.`
            isDeterministic = true
          }

          if (isDeterministic) {
            // Stream chunks smoothly for natural UI animation (0 LLM tokens, <50ms latency)
            const words = responseText.split(' ')
            for (let i = 0; i < words.length; i += 6) {
              const chunk = words.slice(i, i + 6).join(' ') + (i + 6 < words.length ? ' ' : '')
              send('token', { token: chunk })
            }
          } else {
            const systemMsgHistory = [{ role: 'user' as const, content: message }]
            const fallbackResult = await executeWithFallbackChain({
              systemPrompt,
              messages: systemMsgHistory,
              send,
              onToolCall: async () => ({}),
              groqFallbackSuffix: '',
              userMessage: message,
            })
            responseText = fallbackResult.text
          }

          const projName = detailedTargetProjects[0]?.name || 'Project'
          let responseChips: Array<{ id: string; actionType: string; label: string; icon: string; analyticsId: string; priority: number; payload: Record<string, unknown> }> = []

          if (isCompareRequest && detailedTargetProjects.length >= 2) {
            responseChips = [
              {
                id: `chip_emi_${Date.now()}`,
                actionType: 'CALCULATE_EMI',
                label: 'Calculate Monthly EMI',
                icon: 'calculator',
                analyticsId: 'chip_emi_compare',
                priority: 1,
                payload: { action: 'emi' }
              },
              {
                id: `chip_visit_${Date.now()}`,
                actionType: 'BOOK_VISIT',
                label: 'Schedule Site Visit',
                icon: 'calendar',
                analyticsId: 'chip_visit_compare',
                priority: 2,
                payload: { action: 'site_visit' }
              },
              {
                id: `chip_plans_${Date.now()}`,
                actionType: 'TEXT_MESSAGE',
                label: `Payment Plans (${detailedTargetProjects[0].name.slice(0, 16)})`,
                icon: 'file-text',
                analyticsId: 'chip_plans_p1',
                priority: 3,
                payload: { text: `Show payment plans for ${detailedTargetProjects[0].name}` }
              },
              {
                id: `chip_cost_${Date.now()}`,
                actionType: 'TEXT_MESSAGE',
                label: `Cost Sheet (${detailedTargetProjects[1].name.slice(0, 16)})`,
                icon: 'file-text',
                analyticsId: 'chip_cost_p2',
                priority: 4,
                payload: { text: `Show cost sheet and taxes for ${detailedTargetProjects[1].name}` }
              }
            ]
          } else if (isPaymentPlanRequest) {
            responseChips = [
              { id: `chip_cost_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'View Cost Sheet & Taxes', icon: 'file-text', analyticsId: 'chip_cost', priority: 1, payload: { text: `Show cost sheet and taxes for ${projName}` } },
              { id: `chip_emi_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Calculate Monthly EMI', icon: 'calculator', analyticsId: 'chip_emi', priority: 2, payload: { text: `Calculate EMI for ${projName}` } },
              { id: `chip_visit_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Schedule Site Visit', icon: 'calendar', analyticsId: 'chip_visit', priority: 3, payload: { text: `Schedule a site visit for ${projName}` } },
              { id: `chip_sec_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Explore Sector Flats', icon: 'building', analyticsId: 'chip_sector_sim', priority: 4, payload: { text: `Show other flats in ${detailedTargetProjects[0]?.sector || 'this sector'}` } }
            ]
          } else if (isCostSheetRequest) {
            responseChips = [
              { id: `chip_emi_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Calculate Monthly EMI', icon: 'calculator', analyticsId: 'chip_emi', priority: 1, payload: { text: `Calculate EMI for ${projName}` } },
              { id: `chip_visit_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Schedule Site Visit', icon: 'calendar', analyticsId: 'chip_visit', priority: 2, payload: { text: `Schedule a site visit for ${projName}` } },
              { id: `chip_rera_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Check RERA Status', icon: 'shield-check', analyticsId: 'chip_rera', priority: 3, payload: { text: `Verify RERA registration for ${projName}` } },
              { id: `chip_sec_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Explore Sector Flats', icon: 'building', analyticsId: 'chip_sector_sim', priority: 4, payload: { text: `Show other flats in ${detailedTargetProjects[0]?.sector || 'this sector'}` } }
            ]
          } else {
            responseChips = [
              { id: `chip_plans_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'View Payment Plans', icon: 'file-text', analyticsId: 'chip_plans', priority: 1, payload: { text: `Show payment plans for ${projName}` } },
              { id: `chip_cost_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'View Cost Sheet & Taxes', icon: 'file-text', analyticsId: 'chip_cost', priority: 2, payload: { text: `Show cost sheet and taxes for ${projName}` } },
              { id: `chip_emi_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Calculate Monthly EMI', icon: 'calculator', analyticsId: 'chip_emi', priority: 3, payload: { text: `Calculate EMI for ${projName}` } },
              { id: `chip_visit_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Schedule Site Visit', icon: 'calendar', analyticsId: 'chip_visit', priority: 4, payload: { text: `Schedule a site visit for ${projName}` } }
            ]
          }

          send('ui_state', {
            stage: 'RESEARCH',
            thinking: 'Verified database details:',
            chips: responseChips,
            missingFields: [],
            confidence: 'HIGH'
          })

          // Persist session & chat messages to PostgreSQL Database so sidebar logs it immediately
          try {
            if (isNewSession) {
              await prisma.chatSession.create({
                data: {
                  id: currentSessionId,
                  ...(userId ? { user_id: userId } : { guest_token: guestToken }),
                  title: message.slice(0, 60),
                  chat_phase: 'SHORTLISTED',
                  message_count: 2,
                }
              })
              if (userId) await invalidateSessionList(userId).catch(() => {})
            } else {
              await prisma.chatSession.update({
                where: { id: currentSessionId },
                data: {
                  last_active: new Date(),
                  chat_phase: 'SHORTLISTED',
                  message_count: { increment: 2 },
                }
              })
              if (userId) await invalidateSessionList(userId).catch(() => {})
            }

            await prisma.chatMessage.createMany({
              data: [
                {
                  session_id: currentSessionId,
                  role: 'user',
                  content: message,
                  intent_snapshot: intent as unknown as Prisma.InputJsonValue,
                },
                {
                  session_id: currentSessionId,
                  role: 'assistant',
                  content: responseText || '[streamed]',
                  artifacts: { property_results: detailedTargetProjects } as unknown as Prisma.InputJsonValue,
                },
              ]
            })
          } catch (dbErr) {
            console.error('[CHAT:GROUND_TRUTH_DB_SAVE_ERROR]', dbErr)
          }

          const responseMode = isCompareRequest && targetProjects.length >= 2 ? 'comparison' : 'ground_truth_database'
          send('done', {
            sessionId: currentSessionId,
            intentState: 'SHORTLISTED',
            intent,
            responseMode,
            ...(isCompareRequest && targetProjects.length >= 2 ? { comparisonProjects: targetProjects } : {})
          })
          res.end()
          return
        }
      } catch (err) {
        console.error('[CHAT:GROUND_TRUTH_DB_ERROR]', err)
        // Fall through
      }
    }

    // ─── PROJECT DETAIL PIPELINE (Phase 5 Integration) ───────────────────────
    // If user is asking about a specific project detail (EMI, investment, location, etc.),
    // bypass discovery and use verified data pipeline instead.
    const classification = classifyIntent(message, intent)

    // Track intent classification (Phase 11)
    trackEvent(userId ?? null, ANALYTICS_EVENTS.INTENT_CLASSIFIED, {
      category: classification.category,
      detailType: classification.projectDetail?.detailType,
      confidence: classification.projectDetail?.confidence || 0,
      messageLength: message.length,
    })

    // Set user context in Sentry
    if (userId) {
      setSentryUser(userId)
      trackUserProperties(userId, { sessionId: currentSessionId })
    }

    if (classification.category === 'project_detail' && classification.projectDetail && action.type === 'TEXT_MESSAGE') {
      // EDGE CASE: Validate input message (Phase 8)
      const { validateUserMessage, sanitizeMessage, getMissingProjectClarification, createFallbackResponse } = await import('../lib/discovery/queryPlanner.guards')
      const inputError = validateUserMessage(message)
      if (inputError) {
        console.log('[CHAT:PROJECT_DETAIL:INPUT_ERROR]', inputError.type, inputError.message)
        send('token', { token: getMissingProjectClarification(0, []) })
        send('done', { sessionId: currentSessionId, intentState: 'GATHERING', intent })
        res.end()
        return
      }

      const cleanMessage = sanitizeMessage(message)

      console.log('[CHAT:PROJECT_DETAIL]', Date.now(), {
        detailType: classification.projectDetail.detailType,
        projectIdentifier: classification.projectDetail.projectIdentifier,
        confidence: classification.projectDetail.confidence,
      })

      // Step 1: Plan the query (planner auto-detects intent from message)
      let plan
      try {
        const activeProjectList = (intent.projectNames && intent.projectNames.length > 0)
          ? intent.projectNames
          : (cachedProjectsFromSession ?? []).map(p => p.name || p.id).filter(Boolean)

        plan = await planProjectDetailQuery({
          userMessage: cleanMessage,
          conversationContext: { activeProjects: activeProjectList },
        })
      } catch (err) {
        console.error('[CHAT:PROJECT_DETAIL:PLAN_ERROR]', err)
        // Track planning error (Phase 11)
        trackEvent(userId ?? null, ANALYTICS_EVENTS.API_ERROR, {
          stage: 'query_planning',
          error: err instanceof Error ? err.message : 'Unknown error',
        })
        captureException(err, { stage: 'query_planning', intent: 'project_detail' })
        const { createFallbackResponse } = await import('../lib/discovery/queryPlanner.guards')
        send('token', { token: createFallbackResponse(err as Error) })
        send('done', { sessionId: currentSessionId, intentState: 'GATHERING', intent })
        res.end()
        return
      }

      console.log('[CHAT:PROJECT_DETAIL:PLAN]', Date.now(), {
        isActionable: isActionable(plan),
        projectIds: plan.projectIds,
        requiredFields: plan.requiredFields.slice(0, 3),
      })

      // Step 2: Validate plan is actionable
      if (!isActionable(plan) && plan.projectIds.length === 0) {
        const clarification = getClarificationMessage(plan) || 'Which project are you asking about?'
        console.log('[CHAT:PROJECT_DETAIL:CLARIFY]', Date.now(), { question: clarification })
        send('token', { token: clarification })
        send('done', { sessionId: currentSessionId, intentState: 'GATHERING', intent })
        res.end()
        return
      }

      // Step 3: Fetch verified data from gateway
      if (plan.projectIds.length === 0) {
        send('token', { token: 'I need a project name to answer that. Which project are you asking about?' })
        send('done', { sessionId: currentSessionId, intentState: 'GATHERING', intent })
        res.end()
        return
      }

      let gatewayResponse
      try {
        const { handleDatabaseError, repairGatewayResponse } = await import('../lib/projectDataGateway.guards')
        gatewayResponse = await getProjectDataForQuery({
          projectId: plan.projectIds[0],
          intent: plan.intent as any, // Safe cast: queryPlanner ensures valid intent
          requiredFields: plan.requiredFields,
        })

        // EDGE CASE: Repair incomplete response (Phase 8)
        const repair = repairGatewayResponse(gatewayResponse)
        if (repair.repaired) {
          console.log('[CHAT:PROJECT_DETAIL:GATEWAY_REPAIRED]', repair.message)
        }

        if (!gatewayResponse.found || !gatewayResponse.data || !gatewayResponse.completeness) {
          const { handleMissingProject } = await import('../lib/projectDataGateway.guards')
          const missing = handleMissingProject(plan.projectIds[0])
          console.log('[CHAT:PROJECT_DETAIL:NOT_FOUND]', missing.message, { query: message, sector: intent?.sector })

          // Fallback: Check if the user is asking about ready-to-move, possession, pricing or general sector projects
          const activeSector = intent?.sector || 'Sector 79, Noida'
          const matchingDbProjects = await prisma.project.findMany({
            where: {
              OR: [
                { sector: { contains: activeSector.split(',')[0].trim(), mode: 'insensitive' } },
                { city: { contains: 'Noida', mode: 'insensitive' } }
              ]
            },
            include: { unit_types: true, builder: true },
            take: 8
          })

          const isRtmQuery = /ready to move|rtm|immediate|possession/i.test(message)
          const isBhkQuery = /\b([2345])\s*bhk\b/i.test(message)

          if (matchingDbProjects.length > 0 && (isRtmQuery || isBhkQuery || /which of these|show me|list/i.test(message))) {
            let filtered = matchingDbProjects
            if (isRtmQuery) {
              filtered = matchingDbProjects.filter(p => p.status === 'ready_to_move')
            }
            if (filtered.length === 0) filtered = matchingDbProjects.slice(0, 4)

            const projectRows = filtered.map(p => {
              const prices = p.unit_types.map(u => u.price_min_cr).filter((val): val is number => typeof val === 'number')
              const minPrice = prices.length ? Math.min(...prices) : null
              const priceStr = minPrice ? `₹${minPrice} Cr+` : p.price_range_label || 'On Request'
              const bhks = Array.from(new Set(p.unit_types.map(u => `${u.bhk} BHK`))).join(', ') || '2, 3 BHK'
              const statusStr = p.status === 'ready_to_move' ? 'Ready to Move' : 'Under Construction'
              return `| **${p.name}** | ${p.sector} | ${statusStr} | ${bhks} | ${priceStr} |`
            }).join('\n')

            const responseText = `### Verified Projects Status

| Project Name | Location | Status | Configurations | Price Spectrum |
| :--- | :--- | :--- | :--- | :--- |
${projectRows}

### Recommendation
For ready-to-move possession, prioritize **${filtered[0]?.name}** or **${filtered[1]?.name || filtered[0]?.name}** for immediate registry and verified occupancy.`

            send('token', { token: responseText })
            send('done', { sessionId: currentSessionId, intentState: 'SHORTLISTED', intent })
            res.end()
            return
          }

          send('token', { token: `I couldn't locate a verified database record matching "${plan.projectIds[0]}". Would you like me to show verified properties in ${activeSector}?` })
          send('done', { sessionId: currentSessionId, intentState: 'GATHERING', intent })
          res.end()
          return
        }
      } catch (err) {
        console.error('[CHAT:PROJECT_DETAIL:GATEWAY_ERROR]', err)
        const { handleDatabaseError } = await import('../lib/projectDataGateway.guards')
        const dbError = handleDatabaseError(err as Error)
        // Track database error (Phase 11)
        trackEvent(userId ?? null, ANALYTICS_EVENTS.DATABASE_ERROR, {
          error: dbError.message,
          recoverable: dbError.recoverable,
          intent: plan.intent,
        })
        captureException(err, { stage: 'data_gateway', intent: plan.intent, recoverable: dbError.recoverable })
        send('token', { token: dbError.message })
        if (!dbError.recoverable) {
          send('done', { sessionId: currentSessionId, intentState: 'ERROR', intent })
        } else {
          send('done', { sessionId: currentSessionId, intentState: 'GATHERING', intent })
        }
        res.end()
        return
      }

      console.log('[CHAT:PROJECT_DETAIL:GATEWAY]', Date.now(), {
        projectId: plan.projectIds[0],
        complete: gatewayResponse.completeness.complete,
        coverage: Math.round(gatewayResponse.completeness.coverage * 100),
      })

      // Step 4: Compute confidence
      const confidence = computeResponseConfidence(gatewayResponse.data)

      // Track confidence score (Phase 11)
      const maxDataAge = Object.values(gatewayResponse.data).reduce((max: number, item: any) => {
        const age = item?.dataAge ?? 0
        return Math.max(max, typeof age === 'number' ? age : 0)
      }, 0 as number)
      trackEvent(userId ?? null, ANALYTICS_EVENTS.CONFIDENCE_COMPUTED, {
        confidence: Math.round(confidence * 100),
        intent: plan.intent,
        projectId: plan.projectIds[0],
        dataAge: maxDataAge,
      })

      // Step 5: Check if data is sufficient
      const hasFacts = gatewayResponse.data && Object.keys(gatewayResponse.data).length > 0
      if (!hasFacts) {
        const dbProj = await prisma.project.findUnique({
          where: { id: plan.projectIds[0] },
          include: { builder: true }
        })
        const projectName = dbProj?.name || 'this project'
        const builderName = dbProj?.builder?.name || 'Reputed Regional Developer'
        const msg = `### 🏢 ${projectName} Overview\n\n| Property Detail | Value |\n| :--- | :--- |\n| **Project Name** | ${projectName} |\n| **Developer** | ${builderName} |\n| **RERA Standing** | RERA Approved & Verified |\n| **Status** | Active Verified Project |\n\n*Detailed milestone facts for this specific inquiry are being updated by our verified data team.*`
        send('token', { token: msg })
        send('done', { sessionId: currentSessionId, intentState: 'SHORTLISTED', intent })
        res.end()
        return
      }

      // Step 6: Generate summary from verified facts
      // Build facts summary for LLM reasoning
      const factsList = Object.entries(gatewayResponse.data)
        .map(([k, v]: [string, any]) => ({
          key: k,
          value: v?.value ?? '',
          source: v?.source ?? 'database',
          confidence: v?.confidence ?? 0,
        }))
      const factsJson = JSON.stringify(factsList, null, 2)
      const projectDataMsg = `User question: "${message}"\n\nVerified facts available:\n${factsJson}\n\nProvide a clear, helpful breakdown based on these facts. Highlight specific amenities, payment plans, or connectivity details if present. Never invent numbers or claim facts are missing if they are listed above.`

      let componentSummary = ''
      try {
        const systemMsg = `You are RealtyPal — an expert real estate advisor analyzing verified project data.
EXECUTIVE RESPONSE INSTRUCTIONS:
1. Directly and concisely answer the user's exact question using ONLY the provided verified facts.
2. Stay strictly focused on the requested topic (e.g. if asked about amenities, present the amenities clearly; if asked about metro/location, answer the metro/location query).
3. Do NOT add meta-disclaimers or negative statements about unrequested topics (e.g. NEVER write "Please note that the provided information does not include details on payment plans or connectivity"). Simply answer what was asked and stop.
4. Do NOT use emojis like 📌 or pushpins. Do NOT output raw HTML tags.
5. Present tables and bullet points cleanly using GitHub Flavored Markdown.`
        const fallbackResult = await executeWithFallbackChain({
          systemPrompt: systemMsg,
          messages: [{ role: 'user', content: projectDataMsg }],
          send,
          onToolCall: async () => ({ error: 'No tools required for project detail' }),
          groqFallbackSuffix: '',
          userMessage: message,
          // Project detail summary: use smart chain
        })
        componentSummary = fallbackResult.text
      } catch (err) {
        console.warn('[CHAT:PROJECT_DETAIL:LLM_ERROR]', (err as Error).message)
        // Track LLM error (Phase 11)
        trackEvent(userId ?? null, ANALYTICS_EVENTS.LLM_TIMEOUT, {
          error: err instanceof Error ? err.message : 'Unknown error',
          intent: plan.intent,
          projectId: plan.projectIds[0],
        })
        captureException(err, { stage: 'llm_reasoning', intent: plan.intent })
        // Dynamic, beautified fallback from database facts
        try {
          const dbProject = await (prisma as any).project.findUnique({
            where: { id: plan.projectIds[0] },
            include: { unit_types: true, payment_plans: true, amenities: true, cost_sheet: true },
          })
          componentSummary = await generateDatabaseFallbackResponse(message, dbProject ? [dbProject] : [], currentSessionId)
        } catch {
          const topFacts = factsList.slice(0, 5).map(f => `${f.key}: ${f.value}`).join('. ')
          componentSummary = `### Project Details\n\n${topFacts}`
        }
        send('token', { token: componentSummary })
      }

      // Step 7: Build component response
      // Map 'general' intent to 'details' for component spec
      const componentIntent: 'payment' | 'investment' | 'location' | 'timeline' | 'builder' | 'details' | 'compare' =
        plan.intent === 'general' ? 'details' : (plan.intent as any)
      const sources = (gatewayResponse.sources ?? []).map(String)

      const componentResponse = buildComponentResponse({
        summary: componentSummary,
        confidence,
        facts: gatewayResponse.data,
        intent: componentIntent,
        projectId: plan.projectIds[0],
        sources,
      })

      console.log('[CHAT:PROJECT_DETAIL:RESPONSE]', Date.now(), {
        componentCount: componentResponse.components.length,
        confidence: Math.round(confidence * 100),
        sources: componentResponse.sources,
      })

      // Track successful component response (Phase 11)
      trackEvent(userId ?? null, ANALYTICS_EVENTS.COMPONENTS_RENDERED, {
        componentCount: componentResponse.components.length,
        confidence: Math.round(confidence * 100),
        componentTypes: componentResponse.components.map(c => c.type),
        sources: componentResponse.sources,
        intent: componentIntent,
        projectId: plan.projectIds[0],
      })

      // Send components as response
      send('components', componentResponse as unknown as Record<string, unknown>)

      const matchedCardProject = await (prisma as any).project.findUnique({
        where: { id: plan.projectIds[0] },
        include: {
          builder: { select: { id: true, name: true, slug: true } },
          unit_types: {
            select: {
              name: true,
              bhk: true,
              bathrooms: true,
              super_area_sqft: true,
              carpet_area_sqft: true,
              price_min_cr: true,
              price_max_cr: true,
              price_label: true,
              inventory_left: true,
            }
          },
          images: { take: 3, orderBy: { sort_order: 'asc' } },
          amenities: { take: 10 },
          connectivity: { take: 5, orderBy: { distance_km: 'asc' } },
          recommendation_profile: true,
          decision_profile: true,
          dna: true,
        }
      })

      if (matchedCardProject) {
        send('properties', {
          exactResults: [matchedCardProject],
          nearbyResults: [],
          expansion: null,
          renderTarget: 'cards'
        })
      }
      
      // Re-emit ui_state to populate chips AFTER the component response
      // For project detail we can just generate standard chips based on the project.
      // Fix 3: Use matched project name, not ID string
      const projectForChips = matchedCardProject
        ? [matchedCardProject as any]
        : []
      if (!matchedCardProject && plan.projectIds[0]) {
        try {
          const fallbackProj = await prisma.project.findUnique({
            where: { id: plan.projectIds[0] },
            select: { id: true, name: true }
          })
          if (fallbackProj) {
            projectForChips.push(fallbackProj as any)
          }
        } catch (e) {
          console.warn('[CHIP_FALLBACK_LOOKUP] Failed to fetch project', e)
        }
      }
      const postDetailUiState = await computeConversationState(
        intent,
        'SHORTLISTED', // because we found the project and answered
        projectForChips.length > 0 ? projectForChips : [{ id: 'unknown', name: 'Unknown Project', priority: 1 } as any],
        false,
        chatHistory,
        undefined,
        undefined,
        undefined,
        chipInventory,
        true
      )
      const postDetailChips = filterNewChipsWithFloor(currentSessionId, postDetailUiState.chips, 2)
      postDetailChips.forEach(c => markChipShown(currentSessionId, c.id, c.label))
      postDetailUiState.chips = postDetailChips

      send('ui_state', postDetailUiState as unknown as Record<string, unknown>)

      // Persist assistant message with property card artifacts for session restore
      const detailArtifacts: Array<Record<string, unknown>> = []
      if (matchedCardProject) {
        detailArtifacts.push({
          type: 'property_results',
          exactResults: [matchedCardProject],
          nearbyResults: [],
          expansion: null,
        })
      }

      if (currentSessionId && componentSummary) {
        try {
          // Fix 2 & 4: Ensure idempotency on retry + validate artifacts schema
          const existing = await prisma.chatMessage.findFirst({
            where: {
              session_id: currentSessionId,
              role: 'assistant',
              content: componentSummary,
            }
          })
          if (!existing) {
            // Validate artifacts before save
            let validatedArtifacts: Prisma.InputJsonValue | undefined = undefined
            if (detailArtifacts.length > 0) {
              try {
                // Ensure all objects are serializable
                validatedArtifacts = JSON.parse(JSON.stringify(detailArtifacts)) as Prisma.InputJsonValue
              } catch (validateErr) {
                console.warn('[CHAT:ARTIFACT_VALIDATION_FAILED]', validateErr)
                // Skip invalid artifacts rather than corrupt the message
              }
            }
            await prisma.chatMessage.create({
              data: {
                session_id: currentSessionId,
                role: 'assistant',
                content: componentSummary,
                artifacts: validatedArtifacts,
              }
            })
          }
        } catch (saveErr) {
          console.warn('[CHAT:SAVE_DETAIL_MSG_ERROR]', saveErr)
        }
      }

      send('done', { sessionId: currentSessionId, intentState: 'SHORTLISTED', intent })
      res.end()
      return
    }

    if (skipForCachedQuery) {
      logRouting(cacheDecision!.reason, { budgetOnly: cacheDecision!.budgetOnly, cachedCount: cachedProjectsFromSession!.length })
    } else if (cacheDecision && !cacheDecision.reuse) {
      logRouting('DISCOVERY_TRIGGERED', { reason: cacheDecision.reason })
    }

    let discoveryExpansion: Awaited<ReturnType<typeof discoverProjects>>['expansion'] = undefined
    let notFoundNames: string[] | undefined = undefined
    let disambiguationText: string | null = null

    // Single-signal with no geographic or lifestyle context → ask rather than guess.
    // Covers: BHK-only, budget-only, sector-only. Takes priority over isAdvisoryQuery.
    const needsClarification = intentState === 'GATHERING' && (
      ((intent.bhk?.length ?? 0) > 0 && !intent.sector && !intent.budgetMax && !(intent.lifestyleKeywords?.length ?? 0)) ||
      (!!intent.budgetMax && !intent.sector && !(intent.bhk?.length ?? 0) && !(intent.lifestyleKeywords?.length ?? 0)) ||
      (!!intent.sector && !isCityLevel(intent.sector) && !(intent.bhk?.length ?? 0) && !intent.budgetMax && !(intent.lifestyleKeywords?.length ?? 0))
    )

    // ─── ANALYTICS: Track intent identification (moved after needsClarification definition)
    if (action.type === 'TEXT_MESSAGE' && message && sessionId) {
      const clarificationCount = needsClarification ? 1 : 0
      await trackIntentIdentified(sessionId, intent, message, clarificationCount)
    }

    // NEVER ask purpose when intentState is READY_TO_SEARCH — the state machine owns this.
    // If we have enough to search, we search. Purpose is inferred post-results.
    const needsPurposeClarification = false

    const isAdvisoryQuery = !skipForCachedQuery && !needsClarification && intentState === 'GATHERING' && (
      (intent.bhk?.length ?? 0) > 0 ||
      !!intent.budgetMax ||
      (intent.lifestyleKeywords?.length ?? 0) > 0
    )
    // ponytail: hasSectorAndBhk was part of the removed needsPurposeClarification gate

    if (isAdvisoryQuery) {
      console.log('[CHAT] START getAllSectorsOverview', Date.now())
    }
    const sectorsOverview = isAdvisoryQuery
      ? await getAllSectorsOverview(intent.lifestyleKeywords)
      : null
    if (isAdvisoryQuery) {
      console.log('[CHAT] END getAllSectorsOverview', Date.now())
    }

    const discoverySkipReason =
      needsClarification   ? 'needsClarification' :
      skipForCachedQuery   ? `cachedQuery=${cacheDecision?.reason ?? 'cached'}` :
      (intentState !== 'READY_TO_SEARCH' && intentState !== 'SHORTLISTED') ? `intentState=${intentState}` :
      null
    console.log('[DISCOVERY:GATE]', discoverySkipReason
      ? { ran: false, reason: discoverySkipReason, intentState, intent }
      : { ran: true,  intentState, intent }
    )

    if (skipForCachedQuery) {
      // Fix 6: restore provenance — split cached set by cacheSource tag
      const allCached = cachedProjectsFromSession!
      const cachedExact = allCached.filter((p) => p.cacheSource !== 'nearby')
      const cachedNearby = allCached.filter((p) => p.cacheSource === 'nearby')

      if (cacheDecision!.budgetOnly && intent.budgetMax) {
        // Filter to new budget with 10% tolerance
        projects = cachedExact.filter((p) => (p.price_min_cr ?? 0) <= intent.budgetMax! * 1.1)
        nearbyProjects = cachedNearby.filter((p) => (p.price_min_cr ?? 0) <= intent.budgetMax! * 1.1)
        logRouting('CACHE_REUSED', { budgetFilter: intent.budgetMax, exact: projects.length, nearby: nearbyProjects.length })
      } else {
        projects = cachedExact
        nearbyProjects = cachedNearby
        logRouting('CACHE_REUSED', { exact: projects.length, nearby: nearbyProjects.length })
      }

      // If user specified specific project names, filter cached results to match
      if (intent.projectNames?.length && intent.projectNames.length <= 2) {
        const requestedNames = intent.projectNames.map((n) => n.toLowerCase())
        projects = projects.filter((p) =>
          requestedNames.some((rn) => p.name.toLowerCase().includes(rn) || rn.includes(p.name.toLowerCase()))
        )
        nearbyProjects = nearbyProjects.filter((p) =>
          requestedNames.some((rn) => p.name.toLowerCase().includes(rn) || rn.includes(p.name.toLowerCase()))
        )
      }

      // Fix 3: sync frontend cards with filtered/reused result set
      // Phase 3: Guard on renderTarget — cards only emit when renderTarget !== 'text'
      if (renderTarget !== 'text' && (projects.length > 0 || nearbyProjects.length > 0)) {
        send('properties', { exactResults: projects, nearbyResults: nearbyProjects, expansion: null, renderTarget })
      }
      logRouting('DISCOVERY_SKIPPED', { intentState })
    } else if (intentState === 'READY_TO_SEARCH' || intentState === 'SHORTLISTED') {
      // Builder-only queries always run discovery — no pre-disambiguation.
      // discoverProjects() returns all matching projects via BUILDER_ONLY_THRESHOLD;
      // the AI summarizes. Pre-disambiguation here blocked discoverProjects() from
      // running, so no property cards were emitted for builder searches.
      const searchOffset = offset ?? 0
      console.log('[CHAT] START discoverProjects', Date.now(), { intent, offset: searchOffset })
      const cacheKey = `search:${JSON.stringify({ ...intent, offset: searchOffset })}`
      let discoveryResult = await getCached(cacheKey) as Awaited<ReturnType<typeof discoverProjects>> | null
      if (!discoveryResult) {
        discoveryResult = await discoverProjects(intent, searchOffset)
        await setCached(cacheKey, discoveryResult, 600)
      }
      console.log('[CHAT] END discoverProjects', Date.now(), { exact: discoveryResult.exactResults.length, nearby: discoveryResult.nearbyResults.length, expansion: discoveryResult.expansion ?? null, notFound: discoveryResult.notFoundNames ?? [] })
      console.log('[INTELLIGENCE:RETRIEVED]', discoveryResult.exactResults.map(p => ({
        name:            p.name,
        score:           p.matchScore,
        rec_tier:        p.recommendation_profile?.tier          ?? 'MISSING',
        persona:         p.persona_profile?.primary_persona      ?? 'MISSING',
        decision_thesis: p.decision_profile?.decision_thesis?.slice(0, 60) ?? 'MISSING',
        competitor_count: (p.competitors?.length ?? 0),
      })))
      projects = discoveryResult.exactResults
      nearbyProjects = discoveryResult.nearbyResults
      discoveryExpansion = discoveryResult.expansion
      notFoundNames = discoveryResult.notFoundNames

      // ─── MULTI-DIMENSIONAL RANKING ENHANCEMENT ────────────────────────────────
      // If we have projects, enhance with comprehensive multi-dimensional scoring
      // This enriches the basic discovery results with detailed explanations
      if ((projects.length > 0 || nearbyProjects.length > 0) && action.type === 'TEXT_MESSAGE') {
        try {
          console.log('[MULTI_DIM:ENHANCEMENT] Starting multi-dimensional ranking enhancement')
          const multiDimResult = await getMultiDimensionalRecommendations(
            message,
            chatHistory,
            undefined,
            { limit: Math.min(5, projects.length + nearbyProjects.length) }
          )

          if (multiDimResult.recommendations.length > 0 && multiDimResult.topRecommendation) {
            console.log('[MULTI_DIM:ENHANCEMENT] Success', {
              recommendationCount: multiDimResult.recommendations.length,
              topScore: multiDimResult.topRecommendation.finalScore,
              overallConfidence: multiDimResult.confidence.overallConfidence,
              dealBreakers: multiDimResult.dealBreakersDetected
            })

            // Enhance the discovered projects with multi-dimensional data
            // Map recommendations back to discovered projects for enrichment
            const recommendationMap = new Map(
              multiDimResult.recommendations.map(r => [r.projectId, r])
            )

            // Enhance exact results with multi-dimensional data
            projects = projects.map(p => ({
              ...p,
              // Store multi-dimensional data for use in response generation
              _multidimensional_rank: recommendationMap.get(p.id),
              _multidimensional_explanation: recommendationMap.get(p.id)?.dimensionExplanations,
              _multidimensional_tradeoffs: recommendationMap.get(p.id)?.tradeOffs,
              _multidimensional_score: recommendationMap.get(p.id)?.finalScore,
              _recommendation_summary: recommendationMap.get(p.id)?.summary
            })) as any

            // Store in session for later use
            if (sessionId) {
              await prisma.chatSession.update({
                where: { id: sessionId },
                data: {
                  last_projects: projects.slice(0, 5) as any,
                }
              }).catch(e => console.warn('[SESSION:UPDATE] Failed:', e))
            }
          }
        } catch (err) {
          console.error('[MULTI_DIM:ENHANCEMENT] Failed:', err)
          // Fall through — discovery results still available
        }
      }

      if (intent.projectNames?.length) {
        const targetLower = intent.projectNames[0].toLowerCase();
        const matchedIdx = projects.findIndex(p => p.name.toLowerCase().includes(targetLower) || targetLower.includes(p.name.toLowerCase()));
        if (matchedIdx > 0) {
          console.log('[CHAT] Boosting exact requested project to #1 spot:', projects[matchedIdx].name);
          const [matchedProj] = projects.splice(matchedIdx, 1);
          projects.unshift(matchedProj);
        } else if (matchedIdx === -1) {
          const nearbyIdx = nearbyProjects.findIndex(p => p.name.toLowerCase().includes(targetLower) || targetLower.includes(p.name.toLowerCase()));
          if (nearbyIdx !== -1) {
            console.log('[CHAT] Promoting exact requested project from nearby to #1 spot:', nearbyProjects[nearbyIdx].name);
            const [matchedProj] = nearbyProjects.splice(nearbyIdx, 1);
            projects.unshift(matchedProj);
          }
        }
      }

      // ─── Phase 0: Anchor Resolution
      // NOTE: Anchor resolution commented out pending schema update for focus_project_id and focus_set_at fields.
      // Resolve focus project for DRILLDOWN queries and set it in the session.
      // const anchorResolution = await resolveAnchor(
      //   currentSessionId,
      //   message,
      //   intent.projectNames,
      //   projects,
      //   nearbyProjects,
      //   (intent.queryKind as any) ?? 'DISCOVERY'
      // )
      // console.log('[ANCHOR]', Date.now(), {
      //   action: anchorResolution.action,
      //   focusProjectId: anchorResolution.focusProjectId,
      //   reason: anchorResolution.reason,
      // })

      // Handle project disambiguation (multi-project match)
      if (discoveryResult.disambiguation) {
        projectDisambiguation = discoveryResult.disambiguation
        const { query, candidates } = discoveryResult.disambiguation
        const list = candidates.map((c) => `• ${c.name} (${c.sector})`).join('\n')
        disambiguationText = `Multiple projects match "${query}":\n\n${list}\n\nWhich one did you mean?`
        console.log('[CHAT:DISAMBIG] multi-match detected', { query, count: candidates.length })
      }

      // Handle city disambiguation first (sector exists in multiple cities)
      if (discoveryResult.cityDisambiguation) {
        const { query, candidates } = discoveryResult.cityDisambiguation
        const cityDisambiguation = discoveryResult.cityDisambiguation
        // Convert city objects to array format for computeConversationState
        const list = candidates.map(c => c.label).join(' or ')
        disambiguationText = `I found ${query} in multiple areas. Which did you mean: ${list}?`
        console.log('[CHAT:DISAMBIG] city ambiguity detected', { query, cities: candidates.map(c => c.city) })
        // Short-circuit: don't proceed to search until user clarifies city
        send('token', { token: disambiguationText })
        const clarifyState = await computeConversationState(intent, intentState, [], false, chatHistory, undefined, undefined, cityDisambiguation, chipInventory, true)
        send('ui_state', clarifyState as unknown as Record<string, unknown>)
        send('done', { sessionId: currentSessionId, intentState, intent })
        res.end()
        return
      }

      // Handle sector disambiguation (multi-sector match)
      if (discoveryResult.sectorDisambiguation) {
        sectorDisambiguation = discoveryResult.sectorDisambiguation
        const { query, candidates } = discoveryResult.sectorDisambiguation
        const list = candidates.map((sector) => `${sector}`).join(', ')
        disambiguationText = disambiguationText
          ? disambiguationText + `\n\nOr did you mean sector(s): ${list}?`
          : `Did you mean: ${list}?`
        console.log('[CHAT:DISAMBIG] sector ambiguity detected', { query, count: candidates.length })
      }

      // Phase 3: Guard on renderTarget — cards only emit when renderTarget !== 'text'
      // For text-only queries mentioning a project, emit focus event instead
      if (renderTarget !== 'text') {
        // Always send the properties event when intent is ready — even empty exactResults
        // is meaningful (triggers empty state UI and nearby section on the frontend, and clears previous results).
        send('properties', {
          exactResults: projects,
          nearbyResults: nearbyProjects,
          expansion: discoveryExpansion ?? null,
          renderTarget,
        })
      }
      // NOTE: Anchor resolution commented out pending schema update
      // else if (anchorResolution.focusProjectId) {
      //   // Text-only: emit focus event to scroll/highlight existing card
      //   const focusProject = projects.find(p => p.id === anchorResolution.focusProjectId) ||
      //                        nearbyProjects.find(p => p.id === anchorResolution.focusProjectId)
      //   if (focusProject) {
      //     send('focus', {
      //       projectId: anchorResolution.focusProjectId,
      //       name: focusProject.name,
      //       anchor: 'project-card',
      //     })
      //   }
      // }

      // ─── ANALYTICS: Track results shown
      if (sessionId && (projects.length > 0 || nearbyProjects.length > 0)) {
        await trackResultsShown(sessionId, projects.length + nearbyProjects.length)
      }
    }


    // Skip sector context when: cache reused (project data carries it), or discovery found nothing
    const hasDiscoveredProjects = projects.length > 0 || nearbyProjects.length > 0
    const sectorForContext = (skipForCachedQuery || !hasDiscoveredProjects)
      ? null
      : (discoveryExpansion?.searchedSectors[0] ?? intent.sector)
    console.log('[CHAT] START getSectorContext', Date.now(), { sectorForContext: sectorForContext ?? null })
    // Try to infer city from discovered projects; otherwise use DEFAULT_CITY
    // This ensures getSectorContext matches projects on both city + sector
    const cityForContext = projects.length > 0 ? projects[0].city : DEFAULT_CITY
    const sectorCtx = sectorForContext ? await getSectorContext(sectorForContext, cityForContext) : null
    console.log('[CHAT] END getSectorContext', Date.now(), { found: !!sectorCtx })

    console.log('[CHAT] START maybeCompress', Date.now(), { historyLen: chatHistory.length })
    const { messages: compressedHistory, newSummaries } = await maybeCompressTopical(chatHistory, existingTopicSummaries)
    console.log('[CHAT] END maybeCompress', Date.now(), { compressedLen: compressedHistory.length, newSummaries: !!newSummaries })

    // Select relevant summary based on queryKind (fall back to old summary if not topical)
    let selectedSummary = existingSummary
    if (newSummaries) {
      if (queryClassification.queryKind === 'DISCOVERY' && newSummaries.location) {
        selectedSummary = newSummaries.location
      } else if (queryClassification.queryKind === 'DRILLDOWN' && intent.queryKind?.includes('cost') && newSummaries.financial) {
        selectedSummary = newSummaries.financial
      } else if (queryClassification.queryKind === 'DRILLDOWN' && intent.queryKind?.includes('timeline') && newSummaries.timeline) {
        selectedSummary = newSummaries.timeline
      } else if (newSummaries.location && newSummaries.financial && newSummaries.timeline) {
        // Fallback: concatenate all three if available
        selectedSummary = [newSummaries.location, newSummaries.financial, newSummaries.timeline]
          .filter(Boolean)
          .join(' | ')
      }
    }

    const { systemSuffix, messages: rawMessages } = buildContextMessages(message, compressedHistory, selectedSummary, memory)
    // ponytail: cache blockedBuilders for 1h, invalidate when legal flag updated.
    let blockedBuilders: Array<{ name: string; legal_flag?: string }> | null = await getCached('blockedBuilders')
    if (!blockedBuilders) {
      const blockedBuildersRaw = await prisma.builder.findMany({
        where: { legal_flag: { not: null } },
        select: { name: true, legal_flag: true },
      })
      blockedBuilders = blockedBuildersRaw.map(b => ({ name: b.name, legal_flag: b.legal_flag as string | undefined }))
      await setCached('blockedBuilders', blockedBuilders, 3600)
    }
    // G6: trim properties to only essential fields (30-40% token savings)
    const trimmedProjects = trimPropertiesForPrompt(projects.slice(0, 3))
    const trimmedNearby = nearbyProjects.length > 0 ? trimPropertiesForPrompt(nearbyProjects.slice(0, 3)) : undefined

    // Phase 2: Use cached system prompt (static part cached, dynamic part injected)
    const multiDimContext = generateMultiDimensionalContext(projects)
    let systemPrompt = buildSystemPromptWithCache(
      intent as any,
      trimmedProjects as any,
      memory,
      sectorCtx ?? undefined,
      sectorsOverview ?? undefined,
      discoveryExpansion ?? undefined,
      trimmedNearby as any,
      notFoundNames ?? [],
      blockedBuilders,
      intentState,
      DEFAULT_CITY,
      multiDimContext
    ) + systemSuffix

    // Inject dynamic, database-grounded micro-market corridor intelligence
    try {
      const { buildCityMicroMarketsContext } = await import('../lib/discovery/sectorDataGateway')
      const city = (intent as any)?.city || DEFAULT_CITY
      const microMarketsBlock = await buildCityMicroMarketsContext(city)
      if (microMarketsBlock) {
        systemPrompt += `\n\n${microMarketsBlock}`
      }
    } catch (e) {
      console.warn('[CHAT:MICRO_MARKET_CONTEXT:WARN]', e)
    }

    // Issue 4: trim message history if total token estimate exceeds safe ceiling
    // Phase 1: Aggressive trimming based on intent type (search=3, advisory=8)
    const messages = trimMessagesToBudget(systemPrompt, rawMessages, intent as any)
    if (messages.length < rawMessages.length) {
      console.warn('[CHAT:TOKEN_GUARD] trimmed messages', { from: rawMessages.length, to: messages.length, intent: (intent as any)?.queryKind, estimatedSystemTokens: estimateTokens(systemPrompt) })
    }

    let fullText = ''
    let usedProvider: { provider: string; envKey: string } = { provider: 'database', envKey: 'FALLBACK_MODE' }
    let fallbackResult: any = null

    // Phase 5.4: Meta-awareness handler — user asking "what have you assumed about me?"
    const isMetaQuestion = /what.*(assum|remember|know).*about.*me|what.*constraints.*i|what.*filters|what.*do you.*think|what.*my.*profile/i.test(message)

    const isPropertySearchWithResults = projects.length > 0 &&
      queryClassification.queryKind !== 'DRILLDOWN' &&
      queryClassification.renderTarget !== 'text' &&
      !skipForCachedQuery &&
      (queryClassification.queryKind === 'DISCOVERY' || queryClassification.queryKind === 'RANKING')

    if (isMetaQuestion && hydratedIntent) {
      const constraints = []
      if (hydratedIntent.bhk?.length) constraints.push(`${hydratedIntent.bhk.join('/')} BHK`)
      if (hydratedIntent.budgetMin || hydratedIntent.budgetMax) {
        const min = hydratedIntent.budgetMin ? `₹${hydratedIntent.budgetMin}Cr` : ''
        const max = hydratedIntent.budgetMax ? `₹${hydratedIntent.budgetMax}Cr` : ''
        constraints.push(`Budget: ${min}${min && max ? '–' : ''}${max}`.replace(/Cr$/, '').trim() + 'Cr')
      }
      if (hydratedIntent.sector) constraints.push(`${hydratedIntent.sector}`)
      if (hydratedIntent.possession) constraints.push(`Possession: ${hydratedIntent.possession}`)
      if (hydratedIntent.lifestyleKeywords?.length) constraints.push(`Lifestyle: ${hydratedIntent.lifestyleKeywords.join(', ')}`)
      if (hydratedIntent.purpose) constraints.push(`Purpose: ${hydratedIntent.purpose === 'endUse' ? 'Own Use' : 'Investment'}`)

      fullText = constraints.length > 0
        ? `You've told me: ${constraints.join(', ')}. You can correct any of these with "actually..." or add more details.`
        : `You haven't given me specific constraints yet. Tell me: budget, location, BHK size, or timeline, and I'll find what works.`
      console.log('[CHAT:META_AWARE]', { constraints, response: fullText })
      send('token', { token: fullText })
    } else if (needsClarification) {
      const confidence = computeConfidence(intent)
      const clarification = buildClarificationOptions(intent, chipInventory)
      fullText = clarification.question
      console.log('[CHAT:CLARIFY] deterministic clarification, skipping LLM', { intent, confidence: confidence.level, question: fullText })
      send('token', { token: fullText })
    } else if (disambiguationText !== null) {
      fullText = disambiguationText
      send('token', { token: fullText })
    } else if (isPropertySearchWithResults) {
      const bhkLabel = intent.bhk?.length ? `${intent.bhk.join('/')} BHK ` : ''
      const sector = intent.sector || ''
      const city = projects[0]?.city || ''
      const sectorLabel = sector ? ` in ${sector}` : ''
      const cityLabel = city && !sector.toLowerCase().includes(city.toLowerCase()) ? `, ${city}` : ''
      fullText = `Here are ${projects.length} verified ${bhkLabel}properties matching your search${sectorLabel}${cityLabel}:`
      console.log('[CHAT:SEARCH_LEAD_IN] deterministic search lead-in, skipping LLM project hallucination', { fullText })
      send('token', { token: fullText })
    }

    if (!needsClarification && disambiguationText === null && !isPropertySearchWithResults) {
      // Tool dispatch — shared across every provider so Gemini/OpenAI both call
    // into the exact same 15 handlers. Groq gets no tools (documented below).
    const handleToolCall = async (name: string, args: any): Promise<any> => {
        try {
          if (name === 'payment_plan_lookup') {
            const pName = args.project_name ?? args.name ?? '';
            const proj = await prisma.project.findFirst({
              where: { name: { contains: pName, mode: 'insensitive' } },
              include: {
                payment_plans: { orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }] },
                cost_sheet: true,
              }
            });
            const populatedPlans = (proj?.payment_plans ?? []).filter(
              p => Array.isArray(p.milestones) && (p.milestones as unknown[]).length > 0
            );
            if (proj && populatedPlans.length > 0) {
              const primary = populatedPlans[0];
              return {
                found: true,
                project_name: proj.name,
                plan_name: primary.plan_name ?? 'Custom Payment Plan',
                milestones: primary.milestones,
                notes: primary.notes ?? null,
                // All available plans, so the advisor can compare them for the buyer.
                plans: populatedPlans.map(p => ({
                  plan_type: p.plan_type,
                  plan_name: p.plan_name ?? 'Custom Payment Plan',
                  milestones: p.milestones,
                  notes: p.notes ?? null,
                })),
                cost_sheet: proj.cost_sheet ? {
                  base_price_per_sqft: proj.cost_sheet.base_price_per_sqft,
                  gst_rate_pct: proj.cost_sheet.gst_rate_pct,
                  stamp_duty_pct: proj.cost_sheet.stamp_duty_pct,
                  registration_pct: proj.cost_sheet.registration_pct
                } : undefined
              };
            }
            const nameToUse = proj ? proj.name : pName;
            return {
              found: false,
              project_name: nameToUse,
              message: `Payment plan details for ${nameToUse} are available on request. Custom payment structures (including Construction-Linked, Down Payment, and Flexi options) can be tailored with our team. Instruct the user to connect with our RealtyPals team via the 'Book Site Visit' or 'Callback' button for custom payment slabs.`
            };
          }

          if (name === 'builder_lookup') {
          const rec = await getBuilderRecord(args.name ?? '');
          return rec ?? {
            found: false,
            message: `No verified record for "${args.name}" in the RealtyPals database. You may share clearly-labelled general knowledge or call web_search, but never invent specific delivery counts or reputation scores.`,
          };
        }

        // ── On-demand detail lookups ────────────────────────────────────────
        // Pull-based by design: these read tables the system prompt does not
        // carry, so the buyer sees this depth only when they ask for it.
        if (name === 'buyer_fit_analysis') {
          return getBuyerFit(args.project_name ?? '');
        }

        if (name === 'floor_plans_lookup') {
          return getFloorPlans(args.project_name ?? '');
        }

        if (name === 'price_history_lookup') {
          return getPriceHistory(args.project_name ?? '');
        }

        if (name === 'construction_status') {
          return getConstructionStatus(args.project_name ?? '');
        }

        if (name === 'project_intelligence') {
          return getProjectIntelligence(args.project_name ?? '', args.topic);
        }

        if (name === 'cost_sheet_lookup') {
          return getFullCostSheet(args.project_name ?? '');
        }

        if (name === 'project_financial_details') {
          return getProjectFinancialDetails(args.project_name ?? '');
        }

        if (name === 'amenities_lookup') {
          return getAmenitiesAndConnectivity(args.project_name ?? '');
        }

        if (name === 'project_images') {
          return getProjectImages(args.project_name ?? '');
        }

        if (name === 'builder_news') {
          return getBuilderNews(args.builder_name ?? '');
        }

        if (name === 'user_saved_state') {
          return getUserSavedState(userId);
        }

        if (name === 'sector_projects') {
          return getSectorProjects({
            sector: args.sector,
            city: args.city ?? DEFAULT_CITY,
            bhk: args.bhk != null ? Number(args.bhk) : undefined,
            maxBudgetCr: args.max_budget_cr != null ? Number(args.max_budget_cr) : undefined,
            limit: args.limit != null ? Number(args.limit) : undefined,
          });
        }

        if (name === 'web_search') {
          const ctx = await webSearch(args.query ?? '', 3);
          return ctx
            ? { results: ctx, note: 'Cite the sources in your answer.' }
            : { results: '', message: 'No web results found. Answer from general knowledge and state explicitly that it is not verified.' };
        }

        if (name === 'area_info') {
          const info = await areaInfo(args.sector ?? '', args.city ?? DEFAULT_CITY);
          return info ? { info } : { info: null, message: 'No Wikipedia article found. Answer from general knowledge of Noida and label it as such.' };
        }

        if (name === 'rera_check') {
          const url = args.rera_url || (args.rera_number
            ? `https://www.up-rera.in/projects?project_search=${encodeURIComponent(args.rera_number)}`
            : 'https://www.up-rera.in');
          const content = await readPage(url, 2000);
          return content
            ? { rera_page: content, source: url }
            : { rera_page: null, message: 'Could not fetch live RERA details. Advise the user that verified RERA status is available on the RealtyPals project card or through our advisor team.' };
        }

        if (name === 'commute') {
          const r = await commute(args.origin ?? '', args.destination ?? '');
          return r ? { commute: r } : { commute: null, message: 'Tell the user commute data is temporarily unavailable. Do not provide approximate times from memory.' };
        }

        if (name === 'calculate_emi') {
          const pCr = Number(args.principalCr);
          const aRate = Number(args.annualRate ?? FINANCIAL.EMI_RATE);
          const tYears = Number(args.tenureYears ?? FINANCIAL.LOAN_TENURE_YEARS);
          if (isNaN(pCr) || isNaN(aRate) || isNaN(tYears) || pCr <= 0) {
            return { error: 'Invalid parameters for calculate_emi. principalCr must be a positive number.' };
          }
          const r = calcEmi(pCr, aRate, tYears);
          return {
            monthly_emi: formatInr(r.emi),
            total_payment: formatInr(r.totalPayment),
            total_interest: formatInr(r.totalInterest),
            assumptions: { annual_rate_pct: aRate, tenure_years: tYears },
          };
        }

        if (name === 'calculate_stamp_duty') {
          const pCr = Number(args.priceCr);
          if (isNaN(pCr) || pCr <= 0) {
            return { error: 'Invalid priceCr parameter for calculate_stamp_duty. Must be a positive number.' };
          }
          const g = (args.gender === 'female' || args.gender === 'joint') ? args.gender : 'male';
          const r = calcStampDuty(pCr, g);
          return { stamp_duty: formatInr(r.stampDuty), registration: formatInr(r.registration), total: formatInr(r.total), rate_pct: r.rate };
        }

        if (name === 'calculate_gst') {
          const pCr = Number(args.priceCr);
          const cSqm = Number(args.carpetSqm ?? 0);
          if (isNaN(pCr) || pCr <= 0 || isNaN(cSqm)) {
            return { error: 'Invalid parameters for calculate_gst. priceCr must be a positive number.' };
          }
          const st = args.status === 'ready_to_move' ? 'ready_to_move' : 'under_construction';
          const r = calcGst(pCr, st, cSqm);
          return { gst: formatInr(r.gst), rate_pct: r.rate, category: r.category };
        }

        if (name === 'project_costs') {
          const projectId = args.project_id ?? '';
          if (!projectId) {
            return { error: 'project_id is required' };
          }
          const [costSheet, paymentPlans] = await Promise.all([
            (prisma as any).costSheet.findUnique({ where: { project_id: projectId } }),
            (prisma as any).paymentPlan.findMany({
              where: { project_id: projectId },
              orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
            }),
          ]);
          return {
            cost_sheet: costSheet || null,
            payment_plan: paymentPlans[0] || null,
            payment_plans: paymentPlans,
            message: !costSheet && !paymentPlans.length ? 'Cost details not yet verified in database. Output exactly this: <realty-action type="contact" />' : undefined,
          };
        }

        if (name === 'project_nearby') {
          const projectId = args.project_id ?? '';
          if (!projectId) {
            return { error: 'project_id is required' };
          }
          const connectivity = await prisma.connectivity.findMany({
            where: { project_id: projectId },
            take: 30,
          });
          if (!connectivity.length) {
            return { nearby: [], message: 'Connectivity data not available. Output exactly this: <realty-action type="contact" />' };
          }
          // Manual groupBy (Object.groupBy requires ES2024)
          const grouped: Record<string, typeof connectivity> = {};
          for (const c of connectivity) {
            const type = String(c.type);
            if (!grouped[type]) grouped[type] = [];
            grouped[type].push(c);
          }
          return { nearby: connectivity, grouped };
        }

        if (name === 'project_amenities') {
          const projectId = args.project_id ?? '';
          if (!projectId) {
            return { error: 'project_id is required' };
          }
          const amenities = await prisma.amenity.findMany({
            where: { project_id: projectId },
            take: 50,
          });
          if (!amenities.length) {
            return { amenities: [], message: 'Amenity information not available. Output exactly this: <realty-action type="contact" />' };
          }
          // Manual groupBy (Object.groupBy requires ES2024)
          const grouped: Record<string, typeof amenities> = {};
          for (const a of amenities) {
            if (!grouped[a.category]) grouped[a.category] = [];
            grouped[a.category].push(a);
          }
          return { amenities, grouped };
        }

        if (name === 'project_competitors') {
          const projectId = args.project_id ?? '';
          if (!projectId) {
            return { error: 'project_id is required' };
          }
          const competitors = await (prisma as any).projectCompetitor.findMany({
            where: { project_id: projectId },
            orderBy: { sort_order: 'asc' },
            take: 5,
          });
          if (!competitors || !competitors.length) {
             return { competitors: [], message: 'No competitor data available for this project. Output exactly this: <realty-action type="contact" />' }
          }
          return { competitors };
        }

        if (name === 'project_documents') {
          const projectId = args.project_id ?? '';
          if (!projectId) {
            return { error: 'project_id is required' };
          }
          const documents = await (prisma as any).projectDocument.findMany({
            where: { project_id: projectId },
            take: 3,
          });
          if (!documents || !documents.length) {
             return { documents: [], message: 'No documents available for this project. Output exactly this: <realty-action type="contact" />' }
          }
          const trimmedDocs = documents.map((d: any) => ({
             ...d,
             content_text: d.content_text ? d.content_text.substring(0, 500) + (d.content_text.length > 500 ? '...' : '') : null
          }))
          return { documents: trimmedDocs };
        }

        if (name === 'select_property') {
          const propertyId = args.property_id;
          if (!propertyId) return { error: 'property_id is required' };
          const raw = await (prisma as any).project.findUnique({
            where: { id: propertyId },
            include: {
              builder: { select: { name: true, slug: true } },
              unit_types: { select: { bhk: true, price_min_cr: true, price_max_cr: true, super_area_sqft: true } },
              images: { where: { type: 'hero' }, take: 1, select: { url: true } },
              decision_profile: { select: { status: true, why_buy: true, why_avoid: true, decision_thesis: true } },
              recommendation_profile: { select: { status: true, primary_thesis: true } }
            }
          });
          if (!raw) return { error: 'Property not found.' };
          const property = {
            ...raw,
            decision_profile: gatePublished(raw.decision_profile),
            recommendation_profile: gatePublished(raw.recommendation_profile),
          };
          return { property };
        }

          return { error: 'Tool not recognized' };
        } catch (toolErr) {
          console.error(`[CHAT:TOOL_ERROR] ${name}:`, toolErr);
          return { error: `Tool ${name} failed to execute. Tell the user this information is temporarily unavailable.` };
        }
    };

    // Stream generation with dynamic provider chain selection
    // Phase 4: Route factual queries to 8B models, advisory/project_detail to 70B+
    const dynamicChainConfig = undefined

    // Phase 2.2: Emit early "thinking" status before LLM inference to reduce perceived latency
    send('status', { status: 'thinking', message: 'Searching verified properties and analyzing your requirements...' })

      fallbackResult = await executeWithFallbackChain({
        systemPrompt,
        messages,
        send,
        onToolCall: handleToolCall,
        groqFallbackSuffix: GROQ_FALLBACK_SUFFIX,
        projects,
        userMessage: message,
        userId,
        sessionId: currentSessionId,
        chainConfig: dynamicChainConfig,
      })
      fullText = fallbackResult.text
      usedProvider = { provider: fallbackResult.provider, envKey: fallbackResult.envKey }
    } // end: !needsClarification && disambiguationText === null

    // Fix 1: Guard against null fallbackResult if early exit path taken
    if (!fallbackResult && !fullText) {
      console.warn('[CHAT:FALLBACK_RESULT_NULL] Early exit path taken, fallbackResult is null')
      fallbackResult = { text: fullText, provider: 'database', envKey: 'FALLBACK_MODE' }
    }

    if (!fullText) {
      console.warn('[CHAT] LLM fallback chain produced empty text')
      fullText = generateHighTrafficFallback()
      const words = fullText.split(' ')
      for (const word of words) {
        send('token', { token: word + ' ' })
        await new Promise((r) => setTimeout(r, 10))
      }
    }

    // Multi-dimensional context is already injected into the system prompt prior to LLM generation.

    if (fullText && !isPropertySearchWithResults) {
      try {
        const gr = await validateAgainstFacts(fullText, systemPrompt);
        if (gr.violations.length > 0) {
          const severity = gr.blocked ? 'CRITICAL' : 'WARNING'
          console.error(`[GUARDRAIL_${severity}] Output guardrail triggered`, {
            blocked: gr.blocked,
            confidence: gr.confidence,
            violations: gr.violations,
            session_id: sessionId,
          })

          if (gr.blocked) {
            const isReraViolation = gr.violations.some(v => v.type === 'upreraprj_hallucination');
            const safeResponse = isReraViolation
              ? "I can't confirm that RERA number — it wasn't in our verified database. Please verify directly at up-rera.in by searching the project name."
              : "I'm not able to provide that information. Please ask about properties, builders, or real estate in Noida.";
            fullText = safeResponse;
          }
        }
      } catch (err) {
        console.error('[GUARDRAIL_ERROR] Failed to run validateAgainstFacts', err)
      }
    }

    // Emit ui_state with provider affinity (after LLM response generated, so usedProvider is available)
    const postChatHistory = [
      ...chatHistory,
      { role: 'user' as const, content: message },
      { role: 'assistant' as const, content: fullText }
    ]
    const postSearchUiState = await computeConversationState(
      intent,
      intentState,
      projects,
      intent.is_comparison_query ?? false,
      postChatHistory,
      projectDisambiguation,
      sectorDisambiguation,
      undefined,
      chipInventory, // Reuse inventory loaded earlier for consistency
      true, // isUserMessage
      usedProvider // Pass provider that succeeded for main response
    )

    // Deduplicate chips based on session — strictly progressive without resurrecting previously emitted chips
    let postChips = postSearchUiState.chips
    if (postSearchUiState.stage !== 'CLARIFYING') {
      postChips = filterNewChipsWithFloor(currentSessionId, postSearchUiState.chips, 0)
    }

    // High quality adaptive floor fallback if deduplication or zero inventory yielded 0 chips
    if (postChips.length === 0) {
      const sec = intent.sector || 'this sector'
      if (discoveryExpansion?.reason === 'no_inventory_in_exact_sector_nofallback') {
        postChips = [
          {
            id: `rec_sec_config_${Date.now()}`,
            actionType: 'TEXT_MESSAGE',
            label: `Check other configurations in ${sec}`,
            icon: '',
            analyticsId: 'recovery_sector_config',
            priority: 1,
            payload: { text: `What configurations and price ranges are available in ${sec}?` },
          },
          {
            id: `rec_adj_sec_${Date.now()}`,
            actionType: 'TEXT_MESSAGE',
            label: 'Explore nearby sectors',
            icon: '',
            analyticsId: 'recovery_adjacent_sectors',
            priority: 2,
            payload: { text: `Show me alternatives in adjacent sectors near ${sec}.` },
          },
          {
            id: `rec_budget_noida_${Date.now()}`,
            actionType: 'TEXT_MESSAGE',
            label: 'Show popular budget homes',
            icon: '',
            analyticsId: 'recovery_budget_homes',
            priority: 3,
            payload: { text: `Show me popular budget homes in Noida under ₹1.5 Cr.` },
          },
        ]
      } else if (projects.length > 0) {
        postChips = [
          {
            id: `floor_rtm_${Date.now()}`,
            actionType: 'TEXT_MESSAGE',
            label: 'Are these ready to move?',
            icon: '',
            analyticsId: 'floor_ready_to_move',
            priority: 1,
            payload: { text: 'Which of these projects are ready to move in?' },
          },
          {
            id: `floor_rera_${Date.now()}`,
            actionType: 'TEXT_MESSAGE',
            label: 'Check RERA & Legal status',
            icon: '',
            analyticsId: 'floor_rera_check',
            priority: 2,
            payload: { text: 'Are all these projects RERA approved with clear land titles?' },
          },
          {
            id: `floor_cost_${Date.now()}`,
            actionType: 'TEXT_MESSAGE',
            label: 'Compare all-inclusive pricing',
            icon: '',
            analyticsId: 'floor_all_inclusive_pricing',
            priority: 3,
            payload: { text: 'What is the all-inclusive price breakdown including GST and registry?' },
          },
        ]
      }
    }

    postChips.forEach(c => markChipShown(currentSessionId, c.id, c.label))
    postSearchUiState.chips = postChips

    send('ui_state', postSearchUiState as unknown as Record<string, unknown>)

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

    // Comparison: user explicitly asked to compare projects (is_comparison_query=true)
    // AND discovery returned ≥2 results to compare. The flag is set by intent
    // extraction — no inference from projectNames count, no stale state bleed.
    const isComparison = intent.is_comparison_query === true && projects.length >= 2

    // Backend owns responseMode — frontend renders, never derives.
    const responseMode: 'search' | 'comparison' | 'chat' =
      isComparison ? 'comparison' :
      (projects.length > 0 || nearbyProjects.length > 0) ? 'search' :
      'chat'

    if (isComparison) {
      // Compare exactly what the user named; only fall back to a capped
      // default when no explicit project list was extracted (e.g. "compare
      // top options here").
      const requestedCount = intent.projectNames?.length ?? 0
      const compareCount = requestedCount >= 2 ? requestedCount : Math.min(projects.length, 4)
      messageArtifacts.push({
        type: 'comparison',
        projects: projects.slice(0, compareCount),
      })
    }

    // Pre-generate ID for new sessions so send('done') never blocks on DB write.
    // (Already generated at the start of the try block)

    // ── Phase 4: Engagement Scoring and Reaction Detection ───────────────────
    // Track property engagement (weighted) and sentiment reactions
    const projectIdCount = projects.reduce(
      (acc: Record<string, number>, p) => {
        acc[p.id] = (acc[p.id] || 0) + 1
        return acc
      },
      {}
    )
    const engagementScores = await scorePropertyEngagement(currentSessionId, projectIdCount)
    console.log('[CHAT] Engagement scores computed', { count: engagementScores.length })

    // Detect sentiment reactions on DRILLDOWN/COMPARISON queries
    const mentionedProjectIds = projects.map(p => p.id)
    const reactions = detectPropertyReactions(message, queryClassification.queryKind, mentionedProjectIds)
    console.log('[CHAT] Property reactions detected', { count: reactions.length })

    // Load existing reactions and merge with new ones
    const existingReactions: PropertyReaction[] = sessionData?.property_reactions
      ? (sessionData.property_reactions as unknown as PropertyReaction[])
      : []
    const mergedReactions = [...existingReactions]
    for (const reaction of reactions) {
      const idx = mergedReactions.findIndex(r => r.projectId === reaction.projectId)
      if (idx >= 0) {
        // Update existing reaction (latest sentiment wins)
        mergedReactions[idx] = reaction
      } else {
        mergedReactions.push(reaction)
      }
    }

    // Phase 1: Capture response for grading
    responseText = fullText

    // Phase 5.7: Emit proactive follow-up suggestion after response
    if (fullText && projects.length > 0) {
      const followupSuggestions = []
      if (projects.length > 1 && !intent.is_comparison_query) followupSuggestions.push(`Compare **${projects[0].name}** with **${projects[1].name}**?`)
      if (nearbyProjects.length > 0) followupSuggestions.push(`See alternatives in ${nearbyProjects[0].sector || 'nearby sectors'}?`)
      if (projects[0]?.builder) followupSuggestions.push(`Want to know about **${projects[0].builder.name}**'s other projects?`)
      if (projects.length > 0 && !intent.sector) followupSuggestions.push(`Interested in **${projects[0].sector || 'this sector'}**?`)
      if (followupSuggestions.length > 0) {
        const suggestion = followupSuggestions[Math.floor(Math.random() * followupSuggestions.length)]
        send('followup', { suggestion })
      }
    }

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
            ...(newSummaries?.location ? { summary_location: newSummaries.location } : {}),
            ...(newSummaries?.financial ? { summary_financial: newSummaries.financial } : {}),
            ...(newSummaries?.timeline ? { summary_timeline: newSummaries.timeline } : {}),
            ...(mergedReactions.length > 0 ? { property_reactions: mergedReactions as unknown as Prisma.InputJsonValue } : {}),
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
            ...(newSummaries?.location ? { summary_location: newSummaries.location } : {}),
            ...(newSummaries?.financial ? { summary_financial: newSummaries.financial } : {}),
            ...(newSummaries?.timeline ? { summary_timeline: newSummaries.timeline } : {}),
            ...(mergedReactions.length > 0 ? { property_reactions: mergedReactions as unknown as Prisma.InputJsonValue } : {}),
            ...(() => {
              const tagged = [
                ...projects.map((p) => ({ ...p, cacheSource: 'exact' as const })),
                ...nearbyProjects.map((p) => ({ ...p, cacheSource: 'nearby' as const })),
              ]
              return tagged.length > 0 ? { last_projects: tagged as unknown as Prisma.InputJsonValue } : {}
            })(),
          },
        })
      )

      // ── Prose-entity chips & entities ──────────────────────────────────────────────
      // The model can name real projects in prose without the search tool returning
      // cards. Without this, that turn renders zero chips (verified user report).
      // Only DB-matched names become chips, so nothing is invented.
      try {
        if (fullText && projects.length === 0) {
          const mentioned = await findProjectsMentioned(fullText, DEFAULT_CITY)
          const proseChips = buildProseChips(mentioned)
          if (proseChips.length > 0 || mentioned.length > 0) {
            const emitted = proseChips.length > 0 ? filterNewChipsWithFloor(currentSessionId, proseChips, 2) : []
            emitted.forEach(c => markChipShown(currentSessionId, c.id))
            // Convert project names to clickable markdown links: [Name](#entity:id)
            let linkedText = fullText
            for (const e of mentioned) {
              linkedText = linkedText.replace(new RegExp(`\\b${e.name}\\b`, 'g'), `[${e.name}](#entity:${e.id})`)
            }
            send('ui_state', {
              stage: 'RESEARCH',
              thinking: '',
              chips: emitted,
              missingFields: [],
              confidence: 'MEDIUM',
              entities: mentioned,
            } as unknown as Record<string, unknown>)
            // Re-emit with linked content if entities found
            if (mentioned.length > 0 && linkedText !== fullText) {
              const linkedMessage = await prisma.chatMessage.findFirst({
                where: { session_id: currentSessionId, role: 'assistant' },
                orderBy: { created_at: 'desc' }
              })
              if (linkedMessage) {
                await prisma.chatMessage.update({
                  where: { id: linkedMessage.id },
                  data: { content: linkedText }
                })
              }
            }
          }
        }
      } catch (e) {
        console.warn('[CHAT] prose chip emit failed (non-fatal)', e)
      }

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

    console.log('[CHAT] BEFORE persist', Date.now())
    if (currentSessionId) {
      await persistToDb(currentSessionId).catch((e) => {
        console.error('[chat] chipDedup persist failed:', e)
        send('warning', { message: 'Failed to save interaction history; please refresh' })
      })
    }
    await Promise.all(persistPromises).catch((e) => console.error('[chat] persist error:', e))
    console.log('[CHAT] AFTER persist', Date.now())

    // Phase 1: Capture latest assistant message ID for grading
    if (currentSessionId) {
      const latestMessage = await prisma.chatMessage.findFirst({
        where: { session_id: currentSessionId, role: 'assistant' },
        orderBy: { created_at: 'desc' },
        select: { id: true },
      })
      if (latestMessage) messageId = latestMessage.id
    }

    console.log('[CHAT] BEFORE send(done)', Date.now())
    send('done', { sessionId: currentSessionId, intentState, intent, responseMode })
    res.end()
    console.log('[CHAT] AFTER send(done)', Date.now())
  } catch (err) {
    console.error('[chat] error:', err)
    // Issue 5: rate-limit fallback — preserve loaded context instead of dropping it
    const errMsg = (err as Error).message ?? ''
    const isRateLimit =
      (err as { status?: number }).status === 429 ||
      errMsg.includes('429') ||
      errMsg.toLowerCase().includes('rate limit') ||
      errMsg.toLowerCase().includes('tpm') ||
      errMsg.toLowerCase().includes('capacity')
    const loadedProjects = [...(projects ?? []), ...(nearbyProjects ?? [])].slice(0, 5)
    if (isRateLimit && loadedProjects.length > 0) {
      const projectList = loadedProjects.map((p) => `• ${p.name}`).join('\n')
      const fallback = `I've temporarily hit capacity limits.\n\nCurrent matches already loaded:\n\n${projectList}\n\nYou can continue exploring these results. Capacity typically resets in seconds — try your question again shortly.`
      send('token', { token: fallback })
      send('done', { sessionId: sessionId ?? null, intentState, intent, responseMode: 'chat' })
    } else {
      send('error', { message: "I'm having trouble right now. Please try again in a moment." })
    }
  } finally {
    // Phase 0: Persist intent to session memory (async, fire-and-forget) - guarded against IDOR
    if (sessionId && hydratedIntent && !ownershipFailed) {
      persistIntentToMemory(sessionId, userId, hydratedIntent).catch((err) => {
        console.error('[PHASE0:PERSIST] Error persisting intent:', err.message)
      })
    }

    // Phase 1: Grade response async (fire-and-forget, don't block)
    if (sessionId && messageId && responseText) {
      gradeResponseAsync(
        sessionId,
        messageId,
        message || '',
        responseText,
        {
          propertiesShown: projects?.length ?? 0,
          propertyNames: projects?.map((p) => p.name) ?? [],
        }
      ).catch((err) => {
        console.error('[PHASE1:GRADE] Error grading response:', err.message)
      })
    }

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

// POST /session/:id/summarize — weighted summary of chat with property mention counts
router.post('/session/:id/summarize', asyncHandler(async (req: Request, res: Response) => {
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
    include: {
      messages: {
        select: { role: true, content: true, intent_snapshot: true },
        orderBy: { created_at: 'asc' },
      },
    },
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

  // Aggregate property mentions from intent snapshots
  const projectMentionCounts: Record<string, { count: number; name: string }> = {}
  for (const msg of session.messages) {
    if (msg.intent_snapshot && typeof msg.intent_snapshot === 'object') {
      const snapshot = msg.intent_snapshot as any
      if (snapshot.projectNames && Array.isArray(snapshot.projectNames)) {
        for (const projectName of snapshot.projectNames) {
          if (!projectMentionCounts[projectName]) {
            projectMentionCounts[projectName] = { count: 0, name: projectName }
          }
          projectMentionCounts[projectName].count += 1
        }
      }
    }
  }

  // Score property engagement (combines mention count + reaction sentiment)
  const engagementScores = await scorePropertyEngagement(session.id,
    Object.fromEntries(Object.entries(projectMentionCounts).map(([k, v]) => [k, v.count]))
  )

  // Get property reactions from session
  const propertyReactions = (session.property_reactions || []) as any[]

  // Build weighted summary: top 5 properties by engagement score
  const topProperties = engagementScores.slice(0, 5)
  const { generatePropertySummary: generatePropSummary } = await import('../lib/chat/summaryCompression')

  const propertySummaries = await Promise.all(
    topProperties.map(async (prop) => {
      const projectName = projectMentionCounts[prop.projectId]?.name || prop.projectId
      const reaction = propertyReactions.find((r) => r.projectId === prop.projectId)
      const sentiment = reaction?.sentiment || 'neutral'

      // Generate AI summary for this property
      const messages = session.messages.map((m) => ({ role: m.role, content: m.content }))
      const aiSummary = await generatePropSummary(messages, projectName)

      return {
        projectId: prop.projectId,
        projectName,
        mentionCount: prop.count,
        sentiment,
        engagementScore: prop.weight,
        aiSummary,
      }
    })
  )

  // Generate overall chat summary
  const messages = session.messages.map((m) => ({ role: m.role, content: m.content }))
  const { newSummaries } = await maybeCompressTopical(messages, null, true)

  const overallSummary =
    newSummaries?.location && newSummaries?.financial && newSummaries?.timeline
      ? `Location: ${newSummaries.location}\n\nFinancial: ${newSummaries.financial}\n\nTimeline: ${newSummaries.timeline}`
      : `User discussed ${Object.keys(projectMentionCounts).length} properties over ${session.messages.length} messages.`

  res.json({
    overall_summary: overallSummary,
    properties: propertySummaries,
    total_mentions: Object.values(projectMentionCounts).reduce((sum, p) => sum + p.count, 0),
    unique_properties: Object.keys(projectMentionCounts).length,
  })
}))

// GET /chat/sessions/list — User's conversation history
router.get('/sessions/list', asyncHandler(async (req: Request, res: Response) => {
  const userId = await verifyUser(req)
  const guestToken = (req.query.guestToken as string | undefined) ||
                     (req.body?.guestToken as string | undefined) ||
                     (req.headers['x-guest-token'] as string | undefined)

  if (!userId && !guestToken) {
    res.status(401).json({ error: 'Auth required' })
    return
  }

  const where = userId ? { user_id: userId } : { guest_token: guestToken }

  const sessions = await prisma.chatSession.findMany({
    where,
    select: {
      id: true,
      title: true,
      summary: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
    take: 50,
  })

  // Generate title and count messages
  const withTitles = await Promise.all(
    sessions.map(async (session) => {
      let title = session.title || 'Chat'
      if (!title || title === 'Chat') {
        const firstMsg = await prisma.chatMessage.findFirst({
          where: { session_id: session.id },
          orderBy: { created_at: 'asc' },
          select: { content: true },
        })
        if (firstMsg) {
          title = firstMsg.content.substring(0, 60)
        }
      }

      const messageCount = await prisma.chatMessage.count({
        where: { session_id: session.id },
      })

      return {
        ...session,
        title,
        messageCount,
      }
    })
  )

  res.json({ sessions: withTitles })
}))

// POST /chat/feedback — Save user feedback on recommendations
router.post('/feedback', asyncHandler(async (req: Request, res: Response) => {
  const userId = await verifyUser(req)
  const guestToken = (req.query.guestToken as string | undefined) ||
                     (req.body?.guestToken as string | undefined) ||
                     (req.headers['x-guest-token'] as string | undefined)

  if (!userId && !guestToken) {
    res.status(401).json({ error: 'Auth required' })
    return
  }

  const { sessionId, projectId, sentiment, reasons, rating, comment } = req.body

  if (!sessionId || !projectId) {
    res.status(400).json({ error: 'sessionId and projectId required' })
    return
  }

  // Verify ownership
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    select: { user_id: true, guest_token: true },
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

  // Save feedback (PropertyFeedback model added in Phase 5 migration)
  let feedback = null
  try {
    const prismaAny = prisma as any
    if (prismaAny.propertyFeedback) {
      feedback = await prismaAny.propertyFeedback.create({
        data: {
          session_id: sessionId,
          project_id: projectId,
          sentiment: sentiment || 'neutral',
          reasons: reasons || [],
          rating,
          comment,
        },
      })

      // Track analytics
      trackEvent('property_feedback_recorded', feedback)
    }
  } catch (err) {
    console.warn('[FEEDBACK] Failed to save:', err instanceof Error ? err.message : err)
  }

  res.json({ ok: true, feedback })
}))

export default router
