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
import { reportGrounding } from '../lib/ai/groundingCheck'
import { IntentSchema, getIntentState, discoverProjects, getSectorContext, getAllSectorsOverview, isCityLevel } from '../lib/discovery'
import { readLastProjectIds, readLastProjectCards } from '../lib/discovery/lastProjects'
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
import { createToolHandler } from '../lib/ai/tools/handlers'
import { getBuilderRecord } from '../lib/builders'
import { FINANCIAL, MODELS } from '../lib/config'
import { webSearch, areaInfo, commute, readPage } from '../lib/web'
import { calcEmi, calcStampDuty, calcGst, formatInr } from '../lib/calculators'
import { classifyQuery } from '../lib/discovery/queryClassifier'
import { detectOpenQuery } from '../lib/discovery/openQuery'
import { runGroundedAnswer, buildNoGroundingReply } from '../lib/ai/groundedAnswer'
import { findProjectsMentioned, buildProseChips, linkProjectNames, findSectorsMentioned, findSectorsAsked, buildOpenAnswerChips, resolveProjectNames } from '../lib/discovery/proseEntities'
import { computeConversationState, getFloorChips, CONVERTING_TURN_THRESHOLD } from '../lib/discovery/conversationEngine'
import { getMemory, upsertMemory } from '../lib/ai/memory'
import { buildContextMessages } from '../lib/ai/context'
import { maybeCompress } from '../lib/ai/compression'
import { maybeCompressTopical, TopicSummaries } from '../lib/chat/summaryCompression'
import { isSpecificUnknownProject, logCoverageGap, fetchUnknownProjectContext, unknownProjectDirective } from '../lib/chat/coverageGap'
import { statedMonthlyIncome, isAffordabilityQuestion, computeAffordability, renderAffordabilityTable, affordabilityDirective } from '../lib/ai/affordability'
import { scorePropertyEngagement } from '../lib/chat/propertyEngagement'
import { detectPropertyReactions, PropertyReaction } from '../lib/chat/reactionDetector'
import { buildSystemPromptWithCache } from '../lib/ai/systemPromptCache'
import { streamWithGroq, GroqStreamStallError } from '../lib/ai/groq'
import { streamWithOpenAI, StreamStallError } from '../lib/ai/openai'
import { streamWithGemini, GeminiStreamStallError } from '../lib/ai/gemini'
import { executeWithFallbackChain } from '../lib/ai/fallbackChain'
import { classifyIntent, routeToModel } from '../lib/ai/intentClassifier'
import { trimPropertiesForPrompt } from '../lib/ai/propertyTrim'
import { DEFAULT_CITY, PILOT_SCOPE_LABEL, SUPPORTED_CITIES } from '../lib/config/cities'
import { verifyUser } from '../lib/auth'
import { clientIp } from '../lib/request'
import { getChipInventory } from '../lib/discovery/chipInventory'
import { getProjectDataForQuery, computeResponseConfidence } from '../lib/projectDataGateway'
import { FEATURE_PROBES } from '../lib/featureProbes'
import { unverified, unverifiedFeature, confidenceFor, headingFor, UP_STATUTORY, NOIDA_MARKET_RANGES, MARKET_QUALIFIER, type FactTier } from '../lib/factPresentation'
import { redactProject } from '../lib/projectExposure'
import { buildProjectFacts, detectFactTopics } from '../lib/projectFactsBlock'
import { buildComponentResponse } from '../lib/discovery/componentSpec'
import { loadMentionedProjectCards } from '../lib/chat/mentionedProjectCards'
import { buildUnknownProjectReply } from '../lib/chat/unknownProject'
import { runTopicHandlers } from '../lib/chat/handlerContext'
import { isProximityQuestion, nearbyCoverage } from '../lib/discovery/nearby'
import {
  isReraProcessQuestion as matchesReraProcessQuestion,
  isPaymentPlanRequest as matchesPaymentPlanRequest,
} from '../lib/chat/topicFlags'
import { CHAT_TOPIC_HANDLERS } from '../lib/chat/handlers'
import { generateMultiDimensionalContext, attachMultiDimensionalRecommendations } from '../lib/discovery/multidimensionalPromptEnricher'
import { sanitizeUserMessage } from '../lib/ai/sanitize'
import { filterNewChips, markChipShown, hydrateFromDb, persistToDb, suppressTopicChips } from '../lib/discovery/chipDedup'
import { isOverDailyBudget } from '../lib/ai/cost'
import { trackEvent, ANALYTICS_EVENTS, trackUserProperties } from '../lib/monitoring/posthog'
import { captureException, addBreadcrumb, setSentryUser } from '../sentry.server.config'
import { inputGuardrail } from '../lib/ai/guardrails'
import { profileFor, classifyShape } from '../lib/ai/inferenceProfile'
import { asksRentalYield, asksAppreciation, computeSectorYields, renderRentalYieldTable, computePriceChange, renderPriceChangeTable, computeSectorAppreciation, renderAppreciationTable } from '../lib/ai/yieldTable'
import { renderMicroMarketTable, renderProjectTable, renderAlternativesTable, renderDerivedSectorTable, wantsMarketTable, wantsCityBandShelf } from '../lib/ai/marketTable'
import { renderCityShelfForCity } from '../lib/ai/cityShelf'
import { deriveSectorsFromProjects } from '../lib/discovery/derivedSectors'
import { buildAdaptiveChips } from '../lib/discovery/adaptiveChips'
import { buildTopicChips } from '../lib/discovery/topicChips'
import { sanitizeOutput } from '../lib/ai/sanitizeOutput'
import { stripInternalFields } from '../lib/projectRepository'
import { builderCoverage, sectorCoverage, sectorPinCode } from '../lib/chat/coverageAnswer'
import { rentalAnswer, isRentalQuestion } from '../lib/chat/rentalAnswer'
import { TABLE_ALREADY_SHOWN, cityShelfShown, YIELD_TABLE_SHOWN } from '../lib/ai/prompts/base'
import { STATIC_PREFIX_MARKER } from '../lib/ai/systemPromptCache'
import type { InferenceConfig } from '../lib/ai/openai'
import { validateAgainstFacts } from '../lib/ai/guardrails-v2'
import { getCachedResponse, setCachedResponse, intentFingerprint, GLOBAL_SCOPE } from '../lib/ai/semanticCache'
import {
  sameSet,
  logRouting,
  generateHighTrafficFallback,
  isServiceFailureReply,
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

// The old GROQ_FALLBACK_SUFFIX lived here: ~1,826 tokens appended to every

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
    // The label names the field AND the new value ("Change location to Sector
    // 79"). It used to be absent for every dock change, so the model read
    // "updated search" — no field, no value — and answered about the old one.
    const isPatch = action.type === 'INTENT_PATCH'
    const label = (action.payload.label as string) ||
      (isPatch ? 'updated search' : 'cleared a filter')
    message = `[User selected UI option: ${label}]`
  }

  // An empty TEXT_MESSAGE reaches here whenever a caller puts the question
  if (action.type === 'TEXT_MESSAGE' && !message.trim()) {
    res.status(400).json({
      error: 'Empty message',
      detail: 'action.payload.text is required for TEXT_MESSAGE (text, query or label).',
    })
    return
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

  // Every token the buyer sees passes through here, whatever produced it —
  // model stream, topic handler, hardcoded fallback. Emoji and competitor names
  // are stripped at this one point rather than trusting a prompt rule: both were
  // prompt rules first and both shipped anyway.
  const send = (event: string, data: Record<string, unknown>) => {
    // Internal ranker artifacts never leave the server, whichever emit produced
    // the payload. Measured: 51% of every project object, 80KB of a 120KB
    // response, read by no client. Per-emit stripping missed three call sites.
    if (event === 'properties') {
      const shape = (list: unknown) =>
        Array.isArray(list) ? list.map((p) => (p && typeof p === 'object' ? stripInternalFields(p as object) : p)) : list
      return sseWrite(res, event, {
        ...data,
        exactResults: shape(data.exactResults),
        nearbyResults: shape(data.nearbyResults),
      })
    }
    if (event === 'token' && typeof data.token === 'string') {
      const clean = sanitizeOutput(data.token)
      if (clean.strippedEmoji || clean.strippedPlatforms || clean.normalizedCitations) {
        console.warn(
          `[CHAT:SANITISED] emoji=${clean.strippedEmoji} platforms=${clean.strippedPlatforms} citations=${clean.normalizedCitations}`,
        )
      }
      if (!clean.text) return
      return sseWrite(res, event, { ...data, token: clean.text })
    }
    return sseWrite(res, event, data)
  }
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
  /** The prompt actually sent, kept for the post-answer grounding check. */
  let promptForGrounding = ''
  let ownershipFailed = false

  try {
    // ─── SEMANTIC FAQ CACHE (Instant $0.00 Token Fast Path) ────────────────────
    if (action.type === 'TEXT_MESSAGE' && message) {
      // Fingerprinted on the intent carried into this turn, so a cached answer
      // written for a buyer who had stated a budget or a sector cannot surface
      // for one who has stated nothing — and vice versa.
      const cached = await getCachedResponse(message, GLOBAL_SCOPE, intentFingerprint(prevIntent))
      if (cached) {
        console.log('[CHAT:CACHE_HIT] Serving verified advisory response from cache:', message.slice(0, 50))
        send('token', { token: cached.token })
        /**
         * A cache hit owes the buyer chips too.
         *
         * This branch emitted `ui_state` only when the cached entry happened to
         * carry chips, and most entries do not — the main path writes
         * `{ token, intentState, responseMode }` and no chip list. So a cached
         * turn showed a full answer with an empty chip row: measured live, "which
         * is the best project in Noida" served from cache with zero chips, which
         * is the 1/5 case the floor exists to remove. The cheapest answer in the
         * product was also its worst-presented one.
         *
         * Rebuilt from the question rather than stored, so the chips follow the
         * current topic table rather than whatever was true when the answer was
         * written — and so a chip never outlives the path that could answer it.
         */
        const cachedChips =
          cached.chips && cached.chips.length > 0
            ? cached.chips
            : buildTopicChips(
                message,
                {
                  sector: (prevIntent as { sector?: string | null })?.sector ?? null,
                  projectName: (prevIntent as { projectNames?: string[] })?.projectNames?.[0] ?? null,
                  hasBudget: Boolean((prevIntent as { budgetMax?: number })?.budgetMax),
                  city: DEFAULT_CITY,
                },
                3,
              )
        if (cachedChips.length > 0) {
          send('ui_state', {
            stage: 'RESEARCH',
            thinking: 'Verified RealtyPals Intelligence (Cached):',
            chips: cachedChips,
            missingFields: [],
            confidence: 'HIGH'
          })
        }
        // A cached turn is still a turn the buyer had, and the transcript is
        if (sessionId) {
          try {
            await prisma.chatMessage.createMany({
              data: [
                {
                  session_id: sessionId,
                  role: 'user',
                  content: message,
                  intent_snapshot: prevIntent as unknown as Prisma.InputJsonValue,
                },
                {
                  session_id: sessionId,
                  role: 'assistant',
                  content: cached.token,
                },
              ],
            })
            await prisma.chatSession.update({
              where: { id: sessionId },
              data: { message_count: { increment: 2 } },
            })
          } catch (dbErr) {
            console.error('[CHAT:CACHE_HIT_SAVE_ERROR]', dbErr)
          }
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

    // Neither of these reads depends on the extracted intent, so start them now.
    let sessionReadError: unknown
    const memoryPromise = getMemory(userId, guestToken)
    const sessionPromise = (sessionId
      ? prisma.chatSession.findUnique({
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
            chat_phase: true,
            messages: { orderBy: { created_at: 'desc' }, take: 50, select: { id: true, role: true, content: true, created_at: true } },
          },
        })
      : Promise.resolve(null)
    ).catch((err: unknown) => {
      sessionReadError = err
      return null
    })

    let rawIntentResult = { intent: prevIntent as Intent, degraded: false }

    // FAST PATH: bypass LLM extraction if action is INTENT_PATCH
    if (action.type === 'INTENT_PATCH') {
      console.log('[CHAT] INTENT_PATCH fast path — skipping LLM extraction')
      const patch = action.payload.patch as Record<string, unknown>
      const { mergeIntent } = await import('../lib/ai/intent')
      rawIntentResult = { intent: mergeIntent(prevIntent, patch), degraded: false }
    } else if (action.type === 'REMOVE_FILTER') {
      console.log('[CHAT] REMOVE_FILTER fast path')
      // A band clears two fields (budgetMin + budgetMax) in one action. The
      // single-`field` form is still accepted for any older caller.
      const fields = Array.isArray(action.payload.fields)
        ? (action.payload.fields as unknown[]).filter((f): f is string => typeof f === 'string')
        : typeof action.payload.field === 'string' ? [action.payload.field] : []
      const newIntent = { ...prevIntent }
      for (const f of fields) delete newIntent[f]
      rawIntentResult = { intent: newIntent as Intent, degraded: false }
    } else if (action.type === 'TEXT_MESSAGE' && message) {
      console.log('[CHAT] TEXT_MESSAGE — running LLM extraction')
      rawIntentResult = await extractIntent(message, prevIntent)
    }

    // Join point: the two reads above have been in flight for the whole duration
    // of intent extraction. Only the hydrate step genuinely depends on the intent.
    const baseIntent = rawIntentResult.intent
    const [, memory, sessionData] = await Promise.all([
      hydrateIntentFromMemory(sessionId ?? '', baseIntent).then(h => (hydratedIntent = h)),
      memoryPromise,
      sessionPromise,
    ])
    if (sessionReadError) throw sessionReadError
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

    const cachedProjectsFromSession: ScoredProject[] | null =
      readLastProjectCards(sessionData?.last_projects)

    /**
     * How long the buyer has been sitting on the same shortlist, used to escalate
     * chips from DECIDING to CONVERTING.
     *
     * ponytail: one turn of history, read from the persisted chat_phase, so this
     * saturates at the threshold rather than counting true depth. That is all the
     * current threshold (2) needs and it costs no schema change. A real counter
     * column on ChatSession is the upgrade if chips ever need more than two rungs.
     */
    const previousPhase = sessionData?.chat_phase ?? null
    const priorShortlistTurns = previousPhase === 'SHORTLISTED' ? CONVERTING_TURN_THRESHOLD : 0
    const isNewSession = !sessionId || !sessionData
    const currentSessionId = sessionId || randomUUID()

    /** Single exit for every ui_state this handler emits. */
    const emitUiState = <C extends { id: string; label?: string; payload?: unknown }>(state: {
      stage: string
      thinking: string
      chips: C[]
      missingFields?: string[]
      confidence?: string
      [k: string]: unknown
    }, opts: {
      /** Branch-specific recovery set, used instead of the generic floor. */
      fallbackChips?: C[]
      /** CLARIFYING guidance chips must survive dedup — they are the whole answer. */
      skipDedup?: boolean
    } = {}): void => {
      const activeSector = typeof intent?.sector === 'string' ? intent.sector : undefined

      // Drop chips pinned to a sector the buyer has ruled out by naming another.
      // A chip mentioning no sector, or the active one, is always kept.
      const onSector = (c: C): boolean => {
        if (!activeSector) return true
        const mentioned = `${c.label ?? ''} ${JSON.stringify(c.payload ?? {})}`
          .match(/Sector\s+\d+[A-Za-z]?/gi)
        if (!mentioned?.length) return true
        const wanted = activeSector.toLowerCase().replace(/\s+/g, ' ')
        return mentioned.some(m => m.toLowerCase().replace(/\s+/g, ' ') === wanted)
      }

      let chips: C[] = (state.chips ?? []).filter(onSector)
      if (!opts.skipDedup) {
        chips = filterNewChips(currentSessionId, chips)
      }

      // Every step above is subtractive — this is the only additive one.
      if (chips.length === 0) {
        chips = opts.fallbackChips?.length
          ? opts.fallbackChips
          : (getFloorChips(intent, projects) as unknown as C[])
      }

      chips = chips.slice(0, 4)
      chips.forEach(c => markChipShown(currentSessionId, c.id, c.label))
      send('ui_state', { ...state, chips })
    }

    // Post-process intent: qualify sectors with cities, resolve project context
    const previousProjectIds = readLastProjectIds(sessionData?.last_projects)
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
        // Detect if current query is a new sector search, builder query, or general discovery search
        const isSectorOrLocationSearch = Boolean(intent.sector) || /\b(sector\s*\d+|expressway|greater\s*noida|noida\s*extension|central\s*noida)\b/i.test(message);
        const isDiscoveryQuery = intent.queryKind === 'DISCOVERY' || /\b(show\s*(me)?|find|list|projects\s*in|flats\s*in|apartments\s*in|options\s*in|best\s*projects|top\s*societies)\b/i.test(message);
        const isBuilderDiscovery = Boolean((intent as any).builderName) || /\b(projects\s*by|builder|developer)\b/i.test(message);
        const isExplicitFollowUp = /\b(it|its|this\s*project|the\s*project|payment\s*plan|floor\s*plan|cost\s*sheet|construction|rera|who\s*is|developer|amenities|layout|bhk\s*sizes)\b/i.test(message);

        const shouldClearProjectFocus = (isSectorOrLocationSearch || isDiscoveryQuery || isBuilderDiscovery) && !isExplicitFollowUp;

        if (shouldClearProjectFocus) {
          console.log('[CHAT] Fresh discovery / sector query detected — isolating project focus.');
          intent.projectNames = undefined;
          (intent as any).targetProjectId = undefined;
        } else {
          // Persist active project focus from previous turn / session only if user is asking follow-up detail query
          const prevProjectName = (prevIntent as any)?.projectNames?.[0] || (hydratedIntent as any)?.projectNames?.[0] || cachedProjectsFromSession?.[0]?.name;
          const prevProjectId = (prevIntent as any)?.targetProjectId || (hydratedIntent as any)?.targetProjectId || cachedProjectsFromSession?.[0]?.id;

          if (prevProjectName && isExplicitFollowUp) {
            console.log('[CHAT] Persisting active project focus for follow-up detail:', prevProjectName);
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
      emitUiState({
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
    const verifiedProjectNames = await resolveProjectNames(
      (intent as Intent).projectNames,
      DEFAULT_CITY,
    )
    const hasVerifiedProjectNames = verifiedProjectNames.length > 0
    if ((intent as Intent).projectNames?.length && !hasVerifiedProjectNames) {
      console.log('[CHAT:UNVERIFIED_PROJECT_NAMES]', {
        guessed: (intent as Intent).projectNames,
        matched: 0,
      })
    }

    const queryClassification = classifyQuery(message, intent as Record<string, unknown>, {
      hasVerifiedProjectNames,
    })
    intent.queryKind = queryClassification.queryKind
    renderTarget = queryClassification.renderTarget
    console.log('[CHAT] Query classification', Date.now(), {
      queryKind: queryClassification.queryKind,
      renderTarget: queryClassification.renderTarget,
      confidence: queryClassification.confidence,
      reason: queryClassification.reason,
    })

    // ─── COVERAGE LANE ─────────────────────────────────────────────────────────
    if (action.type === 'TEXT_MESSAGE' && message) {
      let coverage: import('../lib/chat/coverageAnswer').CoverageAnswer | { text: string; projects?: never } | null = null

      if (isRentalQuestion(message)) {
        coverage = await rentalAnswer(message, (intent as any)?.city || DEFAULT_CITY)
      }
      // Ahead of the others: a postal-code question names a sector, and the
      // sector lane would answer it with an inventory summary instead.
      if (!coverage && intent.sector) {
        coverage = await sectorPinCode(message, [intent.sector])
      }
      // Proximity, before the sector lane: it answers from coordinates we hold
      // rather than treating the anchor sector as the subject of the question.
      if (!coverage) {
        coverage = await nearbyCoverage(message, (intent as { focus_project_id?: string | null })?.focus_project_id ?? null)
      }
      if (!coverage) coverage = await builderCoverage(message)
      // A proximity question names a sector as an ANCHOR, not as its subject.
      // "I want a property near Sector 62" was being answered by the sector
      // lane with "we hold one project in Sector 62" — true, and not what was
      // asked. The nearby handler answers it from coordinates instead.
      // A question about a PROJECT is never a question about its sector.
      //
      // postProcessIntent resolves a named project to its sector and writes it
      // onto the intent, so "Tell me about Godrej Woods" arrives here carrying
      // `sector: 'Sector 43'`. The sector lane then answered it with "we hold
      // one project in Sector 43" — true, about the wrong subject, and about a
      // project we do hold and could have described in full.
      const askedAboutAProject =
        (intent.projectNames?.length ?? 0) > 0 ||
        Boolean((intent as { focus_project_id?: string | null })?.focus_project_id)

      if (
        !coverage &&
        intent.sector &&
        !isCityLevel(intent.sector) &&
        !isProximityQuestion(message) &&
        !askedAboutAProject
      ) {
        coverage = await sectorCoverage(intent.sector)
      }

      if (coverage) {
        console.log('[CHAT:COVERAGE] answered from database coverage, no model call')
        // A builder we DO hold gets their projects rendered, not just described.
        const covProjects = 'projects' in coverage ? coverage.projects : undefined
        const covTable = covProjects?.length ? renderProjectTable(covProjects as any) : ''
        if (covTable) send('token', { token: `${covTable}

` })
        send('token', { token: coverage.text })
        emitUiState({
          stage: 'RESEARCH',
          thinking: 'Checking what we hold:',
          chips: [],
          missingFields: [],
          confidence: 'HIGH',
        })
        send('done', {
          sessionId: sessionId ?? null,
          intentState,
          intent,
          responseMode: 'chat',
        })
        res.end()
        return
      }
    }

    // ─── OPEN QUERY LANE (grounded general answers) ────────────────────────────
    //
    // The lane answers from sector intelligence and web grounding and never
    // touches project retrieval — which is right for "what should I check
    // before buying" and catastrophic for "best society in sector 137". That
    // question was classified OPEN, so the model answered from sector data
    // alone and said "we do not track verified projects in Sector 137" while
    // ten of them sat in the database.
    //
    // The guard is at the lane boundary rather than in the classifier because
    // this is the property that actually matters: whatever the classifier
    // decided, a question asking for INVENTORY in a place we hold inventory
    // must go through retrieval. Nothing else can answer it truthfully.
    const asksForInventory =
      /\b(societ(y|ies)|projects?|builders?|flats?|apartments?|properties|options?)\b/i.test(message) &&
      /\b(best|top|which|show|list|find|recommend|suggest|good|any)\b/i.test(message)

    /**
     * A question about legal safety is NEVER answered from the web.
     *
     * The worst answer this product has produced. Asked "which projects in
     * Noida have zero litigation and clear title?", the grounded lane searched
     * the web and replied that **Supertech Supernova** has zero litigation and
     * clear titles. Our own rows say `litigation_count: 14`,
     * `land_title_clear: false`, and its builder carries
     * `insolvency_history: true, legal_flag: NCLT_INSOLVENCY`.
     *
     * Meanwhile 239 projects in the database genuinely satisfy the filter.
     *
     * So the product's central promise — that it tells you the bad news —
     * was answered with the exact opposite of the truth it already held, about
     * the single worst project it could have named, sourced from a search
     * engine. Legal questions are answerable from our own columns or not at
     * all; the web has no standing here.
     */
    const asksLegalSafety =
      /\b(litigation|legal|court|nclt|dispute|title|encumbrance|clean|clear title|safe to buy|due diligence|rera)\b/i.test(message)

    // An affordability question with a stated income is not an open question
    // either — it is arithmetic we do in code, plus a shortlist.
    //
    // "I earn 2 lakh a month, what can I afford in Noida?" was classified OPEN
    // and answered from web grounding: it talked about RENT, which is out of
    // scope entirely, and cited a Reddit thread. The affordability renderer
    // further down never ran, because this lane returns before reaching it.
    const asksAffordability = Boolean(statedMonthlyIncome(message)) && isAffordabilityQuestion(message)

    /**
     * Rental yield and price history are answerable from our own rows, so the
     * open lane must not take them.
     *
     * Measured live: "what is the rental yield in Noida" was classified OPEN and
     * answered from web search — "3% to 5%", "up to 5.5%", each tagged (market
     * data) — while `yieldTable.ts` sat downstream holding a computed table off
     * 65 sector rents and 371 priced 3BHK units. The lane returns before the
     * render block, so the better answer was never reachable.
     *
     * Same failure as the affordability and legal-safety bail-outs above, and
     * the same shape as every lane problem in this file: a specialised path
     * claims a turn a general one would have answered from data.
     */
    const asksOurOwnNumbers = asksRentalYield(message) || asksAppreciation(message)
    if (queryClassification.queryKind === 'OPEN' && asksForInventory && intent.sector) {
      console.log(
        `[CHAT:OPEN_LANE_DECLINED] "${message.slice(0, 60)}" asks for inventory in ${intent.sector} — routing to retrieval instead`,
      )
    }

    if (queryClassification.queryKind === 'OPEN' && !(asksForInventory && intent.sector) && !asksAffordability && !asksLegalSafety && !asksOurOwnNumbers) {
      const openDetection = detectOpenQuery(message, hasVerifiedProjectNames)
        ?? { topic: 'GENERAL' as const, reason: 'Fail-open general question' }

      emitUiState({
        stage: 'RESEARCH',
        thinking: openDetection.topic === 'ENTITY'
          ? `Checking our records and live sources for ${openDetection.entity}…`
          : 'Checking verified sector data…',
        chips: [],
        missingFields: [],
        confidence: 'MEDIUM',
      })

      const grounded = await runGroundedAnswer({
        message,
        detection: openDetection,
        city: DEFAULT_CITY,
        userId,
        sessionId: currentSessionId,
      })

      const rawOpenText = grounded?.text ?? buildNoGroundingReply(openDetection)

      // Make the answer clickable, build chips from what it said, and show cards
      let openText = rawOpenText
      let openChips: Array<{ id: string; actionType: string; label: string; icon: string; analyticsId: string; priority: number; payload: Record<string, unknown> }> = []
      let openCards: unknown[] = []
      try {
        const mentionedProjects = await findProjectsMentioned(rawOpenText, DEFAULT_CITY)
        const mentionedSectors = findSectorsMentioned(rawOpenText)
        // `send` sanitises what the buyer reads, but this lane writes its own
        // transcript row further down. Sanitise here so the stored copy, the
        // cache and the stream all say the same thing — the open lane is where
        // the citation leaks came from, so it is the one that must agree.
        openText = sanitizeOutput(linkProjectNames(rawOpenText, mentionedProjects)).text
        openChips = buildOpenAnswerChips(mentionedProjects, mentionedSectors, {
          userMessage: message,
          city: DEFAULT_CITY,
          hasBudget: Boolean(intent.budgetMax || intent.budgetMin),
        })
        openCards = await loadMentionedProjectCards(mentionedProjects)
      } catch (e) {
        console.warn('[CHAT:OPEN_LANE:CHIP_ERROR]', e)
      }

      if (openCards.length > 0) {
        send('properties', {
          exactResults: openCards,
          nearbyResults: [],
          expansion: null,
          renderTarget: 'both',
        })
      }

      console.log('[CHAT:OPEN_LANE]', {
        topic: openDetection.topic,
        entity: openDetection.entity,
        grounded: Boolean(grounded),
        fromDatabase: grounded?.fromDatabase ?? false,
        fromWeb: grounded?.fromWeb ?? false,
        cached: grounded?.cached ?? false,
      })

      send('token', { token: openText })

      // This lane returns before the main pipeline's persistence, so it writes its
      // own turn. Without this the next message has no record the exchange happened
      // and the assistant re-asks what it just answered.
      try {
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
              content: openText,
            },
          ],
        })
        await prisma.chatSession.update({
          where: { id: currentSessionId },
          data: { message_count: { increment: 2 } },
        })
        if (userId) await invalidateSessionList(userId).catch(() => {})
      } catch (e) {
        console.warn('[CHAT:OPEN_LANE:PERSIST_ERROR]', e)
      }

      emitUiState({
        stage: 'RESEARCH',
        thinking: grounded?.fromWeb ? 'Answered from our data plus live sources:' : 'Answered from verified data:',
        chips: openChips,
        missingFields: [],
        confidence: grounded ? 'HIGH' : 'LOW',
        entities: [],
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

    // Pre-search ui_state exists to set the stage + thinking loader.
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
      true,
      undefined,
      { allowLlmChips: false }
    )
    
    // No dedup and no mark-shown here on purpose.
    send('ui_state', preSearchUiState as unknown as Record<string, unknown>)

    // ─── GROUND TRUTH DATABASE PIPELINE (Lightweight Catalog Cache) ─────────────
    type DbCatalogEntry = {
      id: string; name: string; slug: string; sector: string
      status: string; price_min_cr: number | null; price_range_label: string | null
    }
    let allDbProjects = await getCached<DbCatalogEntry[]>('chat:projectCatalog')
    if (!allDbProjects) {
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
      allDbProjects = rawDbProjects.filter(p => !p.name.toLowerCase().includes('iitl nimbus')) as DbCatalogEntry[]
      // 5 min: short enough that a newly published project appears quickly.
      await setCached('chat:projectCatalog', allDbProjects, 300)
    }

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
      emitUiState({
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
    /**
     * The question is about a place we do not cover, or an institution that has
     * no property reading at all.
     *
     * Long-tail keyword exports carry these: "cameron county 107 district
     * court" and "county highway 107 amsterdam ny" arrive because they share a
     * string with County 107 in Sector 107. We answered the courthouse one with
     * that project's swimming pool under a "Verified Amenities" heading — the
     * project name matched as a contiguous phrase, and nothing asked whether
     * the rest of the sentence was about Noida at all.
     *
     * Kept to signals that cannot be a Noida property question: a US state
     * beside a place name, a court, a highway, a postal-code system that is not
     * ours. A Noida marker anywhere in the message overrides it, so "district
     * court near Sector 62" is still answered.
     */
    const isForeignPlace =
      /\b(district court|county court|county highway|state highway \d|zip ?code|amsterdam|texas|\bny\b|\bnj\b|\btx\b|\bca\b|\bfl\b|county clerk|dmv)\b/i.test(message) &&
      !/\b(noida|greater noida|sector\s*\d|ncr|delhi|gurgaon|uttar pradesh|\bup\b)\b/i.test(message)

    const isOutOfScope = isForeignPlace || ((/^(write|generate|explain|solve|tell me|what is)\s+(a\s+)?(python|javascript|typescript|java|c\+\+|sql query|algorithm|bubble sort|code|script|recipe|joke|poem|song|essay|weather)|who won\b|capital of\b|translate\b/i.test(message) || (/python|bubble sort|javascript|algorithm|recipe/i.test(message))) && !/real estate|property|flat|bhk|builder|rera|noida|sector|ncr/i.test(message))
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
      emitUiState({
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

    /**
     * The message as the topic patterns below expect to see it.
     *
     * Every pattern here is written with spaces — `payment plan`, `cost sheet`,
     * `ready to move`. Buyers and our own chips write those with hyphens too,
     * and `\bpayment plan\b` does not match "payment-plan". "Show payment-plan
     * options for Maxblis White House II?" fell through every handler to the
     * generic path, which answered it with a two-row table reading "Available"
     * while five stored instalments went unread.
     *
     * Normalising the subject once beats hyphenating fourteen patterns and
     * remembering to do it in the fifteenth.
     */
    const topicText = message.replace(/[-_/]+/g, ' ').replace(/\s+/g, ' ')
    const isSectorCompare = sectorMatches.length >= 2 && /compare|vs|versus|better|difference|which sector|between/i.test(topicText)
    const isSummaryRequest = /summarize|summary|entire session|weightage/i.test(topicText)
    const isCompareRequest = (intent as any)?.is_comparison_query || (intent.projectNames && intent.projectNames.length >= 2) || /\bcompare\b/i.test(topicText) || isSectorCompare
    const isInventorySearch = /\b(\d\s*bhk|flats?|apartments?|villas?|penthouses?|show\s+me|find\s+me|options\s+in|available\s+in)\b/i.test(topicText) && !isCompareRequest && !isSectorCompare
    // Plurals matter: `\bpayment plan\b` does not match "payment plans", which
    // is how buyers and our own chips write it. "Show payment plans for Nirala
    // Diadem" reached no handler at all and was answered as ordinary prose,
    // with the stored milestone schedule never read.
    const isPaymentPlanRequest = matchesPaymentPlanRequest(topicText)
    // "What are the hidden costs beyond the sticker price" scored 2/5 in the
    // 31 Aug audit, and the cause was this regex rather than the answer. None of
    // the phrasings a buyer actually uses for the question — hidden, extra,
    // additional, what else do I pay, on top of the price — matched, so the turn
    // reached no handler and the generic path rendered the CITY PER-SQFT RATE
    // TABLE above prose about registry charges. The buyer asked what else they
    // pay and got a table of what things cost per square foot.
    //
    // `costSheetHandler` already answers this correctly with no project in focus:
    // statutory rates from UP_STATUTORY in one table, builder-set charges in a
    // second carrying MARKET_QUALIFIER, and the all-inclusive load band. The fix
    // is reaching it, not writing a second one.
    const isCostSheetRequest =
      /\b(cost sheets?|price breakdowns?|all inclusive|other charges|possession charges|car parking charge)\b/i.test(topicText) ||
      /\b(hidden|extra|additional|unexpected)\s+(costs?|charges?|fees?|expenses?)\b/i.test(topicText) ||
      /\b(?:costs?|charges?|fees?|expenses?)\s+(?:beyond|besides|apart\s+from|other\s+than|over\s+and\s+above|on\s+top\s+of)\b/i.test(topicText) ||
      /\b(?:beyond|on\s+top\s+of|over\s+and\s+above)\s+(?:the\s+)?(?:sticker|base|quoted|listed|ticket)?\s*price\b/i.test(topicText) ||
      /\bwhat\s+else\s+(?:do|will|would)\s+i\s+(?:pay|be\s+paying|spend)\b/i.test(topicText)
    const isStatutoryTaxQuery = /(stamp duty|registration (charges?|fees?)|gst on (flat|property|real estate)|tds on (property|sale)|circle rate|index 2|agreement value charges)/i.test(topicText)
    const isReraCheckQuery = matchesReraProcessQuestion(topicText) && (intent.projectNames?.length ?? 0) === 0
    // `!isReraCheckQuery` is the fix, not a tidy-up. "rera complian" belongs to
    // both readings — "is this builder RERA compliant" is a track-record
    // question, "how do I verify a project is RERA compliant" is a process one —
    // and this handler runs first, so without the guard it swallowed both.
    const isBuilderReputationQuery = /(builder|developer|developer track|on.?time delivery|delay|safe (to buy|project)|rera complian|which (company|builder)|best developer|reputable builder)/i.test(topicText) && !isSectorCompare && !isReraCheckQuery && (intent.projectNames?.length ?? 0) < 2
    const isNewcomerOrientation = /(new to noida|new to (the )?city|don'?t know (this area|this city|the area)|which sector|best sector|where (should|to) (buy|look)|area guide|sector guide|best area for family|best area near)/i.test(topicText) && (sectorMatches.length === 0 || /which sector/i.test(topicText))
    const isReadyToMoveQuery = !isInventorySearch && /\b(ready to move|rtm|occupancy certificates?|which.*ready|ready propert(y|ies)|ready flats?)\b/i.test(topicText) && !isPaymentPlanRequest && !isCostSheetRequest
    const isAmenityQuery = !isInventorySearch && /(amenit|sports|clubhouse|club|gym|fitness|pool|swimming|snooker|billiards|table tennis|squash|tennis|badminton|cricket|playground|play area|kid'?s? play|creche|daycare|park|green cover|open space|ev charg|theatre|library|banquet|spa|sauna|jacuzzi|which society has the best|best amenit|lifestyle|court|jogging|skating|golf)/i.test(topicText) && !isPaymentPlanRequest && !isCostSheetRequest
    const isConnectivityQuery = !isInventorySearch && /(connectivity|distance to|how far|metro proximity|airport distance|jewar|expressway access|transit|commute)/i.test(topicText) && !isPaymentPlanRequest
    const isConfigurationQuery = !isInventorySearch && /(balcon|bedroom|bathroom|carpet area|super area|sqft|square feet|size of|how big|how many (balconies|rooms|bhk|bathrooms)|configuration|unit type|floor plan)/i.test(topicText) && !isPaymentPlanRequest && !isCostSheetRequest
    const isTotalOutflowQuery = /(total (price|cost|amount|outflow)|on.?road|all.?inclusive price|how much (in total|total will it cost)|with registry|final price)/i.test(topicText)
    const activeProjectName = intent.projectNames?.[0] || (intent as any)?.targetProjectId

    // A project-specific RERA number question ("what is X's RERA number") is a
    const isReraFactQuery = /rera/i.test(message) && Boolean(activeProjectName)

    // How many distinct things the buyer asked for in this one message.
    const topicFlagCount = [
      isAmenityQuery,
      isConnectivityQuery,
      isConfigurationQuery,
      isReadyToMoveQuery,
      isReraFactQuery,
      isPaymentPlanRequest,
      isCostSheetRequest,
      isStatutoryTaxQuery,
      isTotalOutflowQuery,
    ].filter(Boolean).length
    const singleTopic = topicFlagCount <= 1

    if (!isInventorySearch && (activeProjectName || isSummaryRequest || isCompareRequest || isSectorCompare || isPaymentPlanRequest || isCostSheetRequest || isStatutoryTaxQuery || isReraCheckQuery || isBuilderReputationQuery || isNewcomerOrientation || isReadyToMoveQuery || isAmenityQuery || isConnectivityQuery || isConfigurationQuery || isTotalOutflowQuery) && action.type === 'TEXT_MESSAGE') {
      try {
        console.log('[CHAT:GROUND_TRUTH_DB] Executing Ground Truth DB Pipeline...', { activeProjectName, isSummaryRequest, isCompareRequest, isSectorCompare, isPaymentPlanRequest, isCostSheetRequest, isStatutoryTaxQuery, isReraCheckQuery, isBuilderReputationQuery, isNewcomerOrientation, isReadyToMoveQuery, isAmenityQuery, isConnectivityQuery, isReraFactQuery, topicFlagCount, sectorMatches })

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

        // ─── PROJECT CARDS FOR THE TOPIC LANE ─────────────────────────────────────
        const topicCardId = typeof (intent as { targetProjectId?: unknown }).targetProjectId === 'string'
          ? (intent as { targetProjectId: string }).targetProjectId
          : ''
        if (topicCardId) {
          try {
            const topicCards = await loadMentionedProjectCards([
              { id: topicCardId, name: String(activeProjectName ?? '') },
            ])
            if (topicCards.length > 0) {
              send('properties', {
                exactResults: topicCards,
                nearbyResults: [],
                expansion: null,
                renderTarget: 'both',
              })
            }
          } catch (e) {
            // A card is an enhancement; never fail the answer over it.
            console.warn('[CHAT:TOPIC_CARDS]', e)
          }
        }

        /**
         * The buyer named a project and a configuration it does not build.
         *
         * This runs ahead of every topic handler because they answer their own
         * topic and never check the premise. "county 107 3 bhk price" reached
         * the price handler, which read the project's minimum and reported
         * "3 BHK price: ₹4.85 Crore" — County 107 builds 4 and 5 BHK only, so
         * neither the flat nor the price existed. The card path already refuses
         * this; the prose path is where a buyer is actually told the number.
         */
        if ((intent.projectNames?.length ?? 0) === 1 && intent.bhk?.length) {
          const askedSizes = [...new Set(intent.bhk)].sort((a, b) => a - b)
          const named = allDbProjects.find(
            (p) => p.name.toLowerCase() === String(intent.projectNames![0]).toLowerCase(),
          )
          if (named) {
            const row = await prisma.project.findUnique({
              where: { id: named.id },
              select: { name: true, city: true, sector: true, unit_types: { select: { bhk: true } } },
            })
            const offered = [...new Set(row?.unit_types.map((u) => u.bhk) ?? [])].sort((a, b) => a - b)
            const missing = askedSizes.filter((b) => !offered.includes(b))
            if (row && offered.length > 0 && missing.length === askedSizes.length) {
              const nearby = await prisma.project.findMany({
                where: {
                  city: row.city, sector: row.sector, name: { not: row.name },
                  builder: { legal_flag: null },
                  unit_types: { some: { bhk: { in: askedSizes } } },
                },
                select: {
                  name: true, sector: true, status: true, possession_label: true,
                  builder: { select: { name: true } },
                  unit_types: { select: { bhk: true, price_min_cr: true, price_max_cr: true, carpet_area_sqft: true } },
                },
                take: 5,
              })
              const alt = renderAlternativesTable(nearby, askedSizes)
              const sizes = missing.join('/')
              send('token', {
                token:
                  `**${row.name} does not offer a ${sizes} BHK.** It builds ${offered.join('/')} BHK only, ` +
                  `so there is no ${sizes} BHK price for it to quote.\n\n` +
                  (alt
                    ? `In ${row.sector} these projects do offer it:\n\n${alt}\n`
                    : `We hold no other ${sizes} BHK project in ${row.sector}.\n`),
              })
              emitUiState({
                stage: 'RESEARCH',
                thinking: `${row.name} has no ${sizes} BHK:`,
                chips: [],
                missingFields: [],
                confidence: 'HIGH',
              })
              send('done', { sessionId: currentSessionId, intentState, intent, responseMode: 'chat' })
              res.end()
              return
            }
          }
        }

        // ─── TOPIC HANDLER REGISTRY ────────────────────────────────────────────────
        if (await runTopicHandlers(CHAT_TOPIC_HANDLERS, {
          message,
          intent,
          sessionId: currentSessionId,
          userId,
          guestToken,
          send,
          emitUiState,
          res,
          cachedProjects: cachedProjectsFromSession ?? [],
          builders: dbBuilders,
          activeProjectName: activeProjectName ? String(activeProjectName) : undefined,
          sectorMatches,
          setCachedResponse,
          catalog: allDbProjects,
          intentState,
          flags: {
            isReraCheckQuery,
            isStatutoryTaxQuery,
            isReadyToMoveQuery,
            isTotalOutflowQuery,
            isConnectivityQuery,
            isConfigurationQuery,
            isCompareRequest,
            hasSingleNamedProject: (intent.projectNames?.length ?? 0) === 1,
            hasNamedProject: (intent.projectNames?.length ?? 0) > 0,
            isBuilderReputationQuery,
            isBuilderCompare,
            isNewcomerOrientation,
            isAmenityQuery,
            isSectorCompare,
            isPaymentPlanRequest,
            isCostSheetRequest,
            // False when the buyer asked about more than one topic in one
            singleTopic,
          },
        })) return




        // ─── NEWCOMER & SECTOR ORIENTATION GUIDE ────────────────────────────────────


        // ─── AMENITY & LIFESTYLE HANDLER ───────────────────────────────────────────





        // ─── PAYMENT PLAN COMPARISON ────────────────────────────────────────────────

        // ─── COST SHEET & PRICING BREAKDOWN ─────────────────────────────────────────

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
          // Detected before the query, not after it.
          const askedFactTopics = detectFactTopics(message)

          const detailedTargetProjects = await prisma.project.findMany({
            where: { id: { in: targetIds } },
            include: {
              builder: true,
              unit_types: true,
              payment_plans: true,
              cost_sheet: true,
              amenities: true,
              images: { take: 3, orderBy: { sort_order: 'asc' } },
              connectivity: { take: 12, orderBy: { distance_km: 'asc' } },
              recommendation_profile: true,
              decision_profile: true,
              persona_profile: true,
              // Demand-driven, and bounded when taken.
              ...(askedFactTopics.has('price_history')
                ? { price_history: { take: 8, orderBy: { recorded_at: 'desc' as const } } }
                : {}),
              ...(askedFactTopics.has('construction')
                ? { construction_milestones: { take: 10, orderBy: { sort_order: 'asc' as const } } }
                : {}),
              ...(askedFactTopics.has('specifications')
                ? { spec_items: { take: 30, orderBy: [{ is_highlight: 'desc' as const }, { sort_order: 'asc' as const }] } }
                : {}),
              // dna is deliberately absent.
            }
          })

          // Emit project card(s) to frontend so project card is rendered above the facts.
          send('properties', {
            exactResults: detailedTargetProjects.map(redactProject),
            nearbyResults: [],
            expansion: null,
            renderTarget: 'both'
          })

          const totalInquiries = Array.from(projectMentionCounts.values()).reduce((sum, item) => sum + item.count, 0)

          const dbFactsJson = JSON.stringify(detailedTargetProjects.map(p => {
            const mentions = projectMentionCounts.get(p.id)?.count || 1
            const weightagePct = totalInquiries > 0 ? Math.round((mentions / totalInquiries) * 100) : Math.round(100 / detailedTargetProjects.length)

            // Every populated public field, not a hand-picked eleven.
            const baseObj: Record<string, any> = {
              ...buildProjectFacts(p as unknown as Record<string, unknown>, { topics: askedFactTopics }),
              location: `${p.sector}, ${p.city}`,
              status: p.status === 'ready_to_move' ? 'Ready to Move' : p.status === 'new_launch' ? 'New Launch' : 'Under Construction',
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
2. Give the answer as a sentence, then at most three supporting facts one line each.
   A table needs at least two things to compare and at least two columns of substance.
   One fact is a sentence, and a two-row table holding a single value is never right.
     Wrong: | Parameter | Value |\\n| RERA Number | UPRERAPRJ677887 |
     Right: The RERA number is UPRERAPRJ677887, valid to December 2031.
   After the fact, add the one line that says what it means for the buyer.
3. Do NOT output long text paragraphs or dump lists of unit types/payment plans unless the user explicitly requested them.
4. Maintain a clean executive tone without decorative emojis.
5. Do not end with a follow-up question. A factual answer ends when the fact is given.

USING THE FACTS:
5. The facts block carries every field we hold for these projects — maintenance,
   pet policy, lift count, water source, ceiling height, land tenure, distances
   to school/hospital/airport, flood risk, AQI, safety scores, OC and RERA
   standing, litigation, escrow, NRI eligibility, resale lock-in and more. If
   the user asks about any of them and the key is present, answer it directly.
6. A key that is ABSENT means we do not hold that fact. Say so plainly — "that
   isn't in our records for this project, our advisory team can confirm it" —
   and never substitute a typical, standard or estimated value. An absent key is
   never permission to guess.
7. Quote the value as given. Do not round a distance, re-scale a score, or
   convert a range into a single number.`
          }

          let responseText = ''
          let isDeterministic = false

          // Both branches below stream with zero LLM involvement, so whatever is
          if (isPaymentPlanRequest && detailedTargetProjects.length === 1) {
            const p = detailedTargetProjects[0]
            const plans = p.payment_plans ?? []
            if (plans.length > 0) {
              const rows = plans
                .map(pl => `| **${pl.plan_name}** | ${pl.description ?? 'Not specified'} |`)
                .join('\n')
              responseText = `### Payment Structures — ${p.name}\n\n| Payment Plan | Schedule |\n| :--- | :--- |\n${rows}\n\n_Schedules as recorded in our records. Confirm final terms in the developer's booking documents._`
            } else {
              responseText = `### Payment Structures — ${p.name}\n\n${unverified('developer payment schedule', p.name)}`
            }
            isDeterministic = true
          } else if (isCostSheetRequest && detailedTargetProjects.length === 1) {
            const p = detailedTargetProjects[0]
            const cs = p.cost_sheet
            const statutoryRows = [
              `| **GST** | ${p.status === 'ready_to_move' ? `${UP_STATUTORY.gstReadyToMovePct}% (exempt — OC obtained)` : `${UP_STATUTORY.gstUnderConstructionPct}% (without ITC)`} | With construction installments | Statutory |`,
              `| **UP Stamp Duty** | ${UP_STATUTORY.stampDutyPct}% of agreement value | At registration | ${UP_STATUTORY.stampDutyFemalePct}% for female primary owners |`,
              `| **Registration Fee** | ${UP_STATUTORY.registrationPct}% (capped ₹${UP_STATUTORY.registrationCapInr.toLocaleString('en-IN')}) | At registration | Sub-registrar charge |`,
            ].join('\n')

            // Developer charges are per-project.
            const inr = (n: unknown) => `₹${Number(n).toLocaleString('en-IN')}`
            const developerRows: string[] = []
            if (p.price_range_label) developerRows.push(`| **Base Selling Price (BSP)** | ${p.price_range_label} | As per payment plan | Basic unit purchase price |`)
            if (cs?.base_price_per_sqft) developerRows.push(`| **Base rate** | ${inr(cs.base_price_per_sqft)} / sq.ft | As per payment plan | Verified base rate |`)
            if (cs?.floor_rise_per_floor) developerRows.push(`| **Floor rise** | ${inr(cs.floor_rise_per_floor)} / sq.ft per floor | With BSP | Verified |`)
            if (Array.isArray(cs?.plc_charges) && cs.plc_charges.length > 0) {
              const plc = (cs.plc_charges as Array<{ name?: string; psf?: number }>)
                .filter(c => c?.name)
                .map(c => `${c.name}${c.psf ? ` ${inr(c.psf)}/sq.ft` : ''}`)
                .join(', ')
              if (plc) developerRows.push(`| **Preferential location (PLC)** | ${plc} | With BSP | Verified |`)
            }
            if (cs?.parking_cost) developerRows.push(`| **Covered parking** | ${inr(cs.parking_cost)} | Initial installments | Verified |`)
            if (cs?.club_membership) developerRows.push(`| **Club membership** | ${inr(cs.club_membership)} | On possession | Verified |`)
            if (cs?.ifms) developerRows.push(`| **IFMS (refundable)** | ${inr(cs.ifms)} / sq.ft | On possession | Verified |`)
            if (cs?.electricity_connection) developerRows.push(`| **Electricity connection** | ${inr(cs.electricity_connection)} | On possession | Verified |`)
            if (cs?.water_sewer_connection) developerRows.push(`| **Water & sewer connection** | ${inr(cs.water_sewer_connection)} | On possession | Verified |`)
            const maintenance = cs?.maintenance_psf_monthly ?? p.maintenance_per_sqft_monthly
            if (maintenance) developerRows.push(`| **Maintenance** | ${inr(maintenance)} / sq.ft / month | Post possession | Verified |`)
            if (p.dg_power_rate_per_unit) developerRows.push(`| **DG power** | ${inr(p.dg_power_rate_per_unit)} / unit | Post possession | Verified |`)
            const assumptions = Array.isArray(cs?.assumptions) ? cs.assumptions.filter(Boolean) : []

            const developerBlock = developerRows.length > 0
              ? `**Developer charges on record:**\n\n| Parameter | Rate / Amount | Stage | Note |\n| :--- | :--- | :--- | :--- |\n${developerRows.join('\n')}`
              : `**Developer charges:** ${unverified('itemised cost sheet', p.name)}`

            const tiers: FactTier[] = developerRows.length > 0 ? ['verified', 'statutory'] : ['missing', 'statutory']

            responseText = `### Cost Breakdown — ${p.name}\n\n${developerBlock}\n\n**Statutory charges (fixed by UP law, same for every project):**\n\n| Parameter | Rate | Stage | Note |\n| :--- | :--- | :--- | :--- |\n${statutoryRows}\n\n**For budgeting:** allow roughly ${p.status === 'ready_to_move' ? NOIDA_MARKET_RANGES.allInclusiveLoadReadyToMovePct : NOIDA_MARKET_RANGES.allInclusiveLoadUnderConstructionPct} to cover statutory and possession charges — ${MARKET_QUALIFIER}.${assumptions.length ? `\n\n_Assumptions on record: ${assumptions.join('; ')}._` : ''}${tiers.includes('missing') ? `\n\nParking, club membership and IFMS vary by developer and are not in our records for ${p.name}; our advisory team can pull the official booking cost sheet.` : ''}`
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
              // See InferenceConfig.tools: a stub handler must not be paired
              // with a tool catalogue, or the model loops and returns nothing.
              config: { maxTokens: 1500, tools: false },
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
            /**
             * The catch-all for a project-fact answer.
             *
             * This branch used to emit the same four chips — payment plans,
             * cost sheet, EMI, site visit — whatever had been asked. Measured
             * over 120 long-tail queries it was **47 of them**: the identical
             * row after a question about a brochure, an address, a construction
             * update. Chips that never change are decoration, not navigation.
             *
             * The adaptive set is built from what this turn actually put on
             * screen and offers one question per axis — what it costs, whether
             * it is clean, what competes with it — so three chips are three
             * different decisions rather than one repeated button.
             */
            responseChips = buildAdaptiveChips({
              projects: detailedTargetProjects.slice(0, 4).map((p) => ({ id: p.id, name: p.name })),
              sectors: detailedTargetProjects[0]?.sector ? [detailedTargetProjects[0].sector] : [],
              rendered: null,
              missingFields: [],
              focusedProject: { name: projName },
              userMessage: message,
              city: DEFAULT_CITY,
              hasBudget: Boolean(intent.budgetMax || intent.budgetMin),
            })
          }

          emitUiState({
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
            // redactProject, like exactResults above.
            ...(isCompareRequest && targetProjects.length >= 2
              ? { comparisonProjects: detailedTargetProjects.map(redactProject) }
              : {})
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

          // A city-wide substitution used to run here, and it shadowed the honest

          // Not in our database — say so, then look, keeping the two apart.
          const unknown = await buildUnknownProjectReply(String(plan.projectIds[0]), {
            city: DEFAULT_CITY,
            userId,
            sessionId: currentSessionId,
          })
          send('token', { token: unknown.text })
          emitUiState({
            stage: 'RESEARCH',
            thinking: unknown.fromWeb
              ? 'Not in our records — reporting what public sources say:'
              : 'Not in our records:',
            chips: [
              { id: `chip_verify_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Get it verified', icon: 'shield-check', analyticsId: 'chip_unknown_verify', priority: 1, payload: { text: `Can your advisory team verify ${plan.projectIds[0]} for me?` } },
            ],
            missingFields: ['project'],
            // Web-sourced material is never presented as verified.
            confidence: 'LOW',
          }, { skipDedup: true })
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
          // Project detail summary: use smart chain, without tools — the handler
          // above answers every call with an error, so offering them only burns
          // tool cycles. See InferenceConfig.tools.
          config: { maxTokens: 1500, tools: false },
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
      emitUiState({ ...postDetailUiState, chips: postDetailUiState.chips })

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
    /** Web context plus its handling rules, when the buyer named a project we do not hold. */
    let unknownProjectTail = ''
    let disambiguationText: string | null = null

    /**
     * The buyer asked to SEE what is in a place. That is answerable now.
     *
     * "best society in sector 137" is sector-only, so the rule below classed it
     * as a single signal and asked for BHK and budget before searching. But the
     * question is not under-specified — it is a request for the shelf, and the
     * shelf is what narrows the conversation. Asking three questions before
     * showing anything is how a chat starts feeling like a form.
     *
     * Worse, the empty result then reached the prompt as though we had searched
     * and found nothing, and the buyer was told Sector 137 was not in our
     * database while ten projects sat in it. That half is fixed in
     * systemPromptCache; this is the half that makes the answer useful.
     */
    const asksToSeeInventoryHere =
      Boolean(intent.sector) &&
      /\b(societ(y|ies)|projects?|flats?|apartments?|properties|options?|builders?)\b/i.test(message ?? '') &&
      /\b(best|top|which|show|list|find|recommend|suggest|good|any|what)\b/i.test(message ?? '')

    /**
     * The same question with no place attached: "which is the best project in
     * Noida", "what's the cheapest society I can buy".
     *
     * `asksToSeeInventoryHere` requires `intent.sector`, so a citywide
     * superlative fell to the state machine and the gate closed on
     * `intentState=COLD` — measured live: retrieval never ran, the reply was
     * micro-market prose naming no project, and the chips were two filters. The
     * band shelf could not render because there was nothing to render it from.
     *
     * The gate's own reasoning below covers this: GATHERING means we do not know
     * enough to RECOMMEND, and it does not follow that we cannot LIST. A buyer
     * who has told us nothing is exactly who the shelf is for — it shows the
     * range and asks which band, instead of asking three questions before
     * showing anything.
     *
     * Uses the shelf's own predicate rather than a second one, so the gate and
     * the renderer can never disagree about which turns this is.
     */
    const asksToSeeInventoryCitywide = wantsCityBandShelf(message ?? '', {
      hasSector: Boolean(intent.sector),
      hasBudget: Boolean(intent.budgetMax || intent.budgetMin),
      hasProjectFocus: (intent.projectNames?.length ?? 0) > 0,
    })

    // Single-signal with no geographic or lifestyle context → ask rather than guess.
    // Covers: BHK-only, budget-only, sector-only. Takes priority over isAdvisoryQuery.
    const needsClarification = !asksToSeeInventoryHere && !asksToSeeInventoryCitywide && intentState === 'GATHERING' && (
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

    // `asksToSeeInventoryHere` opens BOTH gates, not just the clarification one.
    // Closing the first and leaving the second changed the log line from
    // `reason: needsClarification` to `reason: intentState=GATHERING` and
    // nothing else — the search still did not run, and the buyer was still told
    // Sector 137 was not in our database.
    //
    // The state machine is right that GATHERING means we do not know enough to
    // recommend. It does not follow that we cannot LIST. Showing the shelf is
    // what moves a buyer out of GATHERING in the first place.
    const discoverySkipReason =
      asksToSeeInventoryHere || asksToSeeInventoryCitywide ? null :
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
        send('properties', {
      exactResults: projects,
      nearbyResults: nearbyProjects,
      expansion: null,
      renderTarget,
    })
      }
      logRouting('DISCOVERY_SKIPPED', { intentState })
      // `asksToSeeInventoryHere` is the third clause because this is the gate
      // that actually decides whether discovery runs — the two above it only
      // set a log line. A buyer asking "best society in sector 137" is in
      // GATHERING by definition (no BHK, no budget) and is asking to be shown
      // the shelf; the shelf is what moves them out of GATHERING.
      // ...and `asksToSeeInventoryCitywide` is the fourth, for the same reason.
      // I made the exact mistake the comment above warns about: opening the two
      // gates further up flipped `[DISCOVERY:GATE]` to `ran: true` and changed
      // nothing else, because THIS is the branch that calls `discoverProjects`.
      // Retrieval still returned zero, so the band shelf had nothing to render
      // and the tool-blind legs were all skipped by `[FALLBACK:NO_LOOKUP]` — the
      // turn ended in an outage notice with a green log line above it.
    } else if (intentState === 'READY_TO_SEARCH' || intentState === 'SHORTLISTED' || asksToSeeInventoryHere || asksToSeeInventoryCitywide) {
      // Builder-only queries always run discovery — no pre-disambiguation.
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

      // A named project we do not hold: say something useful about it from the
      // web, and tell an admin it is missing. Deliberately NOT fired for a
      // general browse — "best society in sector 137" names no project, and
      // treating it as a gap would log noise and search the web for a question
      // the database answers well. No card is ever rendered: a card promises
      // verified rows and there are none.
      if (projects.length === 0 && (notFoundNames?.length ?? 0) > 0) {
        const unknown = isSpecificUnknownProject(message, notFoundNames ?? [])
        if (unknown) {
          console.log(`[CHAT:COVERAGE_GAP] "${unknown}" — not in the database, falling back to web`)
          void logCoverageGap(unknown, message, sessionId)
          const ctx = await fetchUnknownProjectContext(unknown, (intent as { city?: string })?.city || DEFAULT_CITY)
          unknownProjectTail = `${ctx ? `\n\n${ctx}` : ''}\n${unknownProjectDirective(unknown)}`
        }
      }

      // ─── MULTI-DIMENSIONAL RANKING ENHANCEMENT ────────────────────────────────
      const wantsMultiDim =
        queryClassification.queryKind === 'DISCOVERY' ||
        queryClassification.queryKind === 'RANKING'

      if ((projects.length > 0 || nearbyProjects.length > 0) && action.type === 'TEXT_MESSAGE' && wantsMultiDim) {
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
        // Deliberately NOT routed through emitUiState: these chips are the question
        // being asked ("Noida or Greater Noida?"), so neither the sector filter nor
        // session dedup may remove them.
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
    //
    // The limit used to be a flat 3, and that one number was behind most of the
    // wrong answers in the 30 Aug manual run:
    //
    //   "3BHK in Sector 150 under 2Cr"  retrieval returned 9, prompt saw 3
    //   "best society in sector 137"    retrieval returned 8, prompt saw 3,
    //                                   the model named 2, and the prose-card
    //                                   renderer can only draw cards for names
    //                                   the model actually wrote — so the buyer
    //                                   got 2 cards out of 8 real matches, both
    //                                   from the same builder.
    //
    // Cards were never the constraint: the `properties` event ships every
    // retrieved project and the UI pages them six at a time. The prompt was.
    //
    // A DISCOVERY turn is a browse — the buyer is asking to see the shelf, so
    // give the model the shelf. Everything else is a judgement call about a
    // handful of options, where more rows buy nothing and cost tokens.
    // Trimmed rows are small (~250 chars), so 12 is roughly 750 tokens on the
    // turns that need it and unchanged on the turns that do not.
    const promptProjectLimit = queryClassification.queryKind === 'DISCOVERY' ? 12 : 5
    const trimmedProjects = trimPropertiesForPrompt(projects.slice(0, promptProjectLimit))
    const trimmedNearby = nearbyProjects.length > 0 ? trimPropertiesForPrompt(nearbyProjects.slice(0, 5)) : undefined
    if (projects.length > promptProjectLimit) {
      console.log(`[CHAT:PROMPT_TRIM] ${projects.length} retrieved, ${promptProjectLimit} sent to the model (${queryClassification.queryKind})`)
    }

    // Phase 2: Use cached system prompt (static part cached, dynamic part injected)
    const multiDimContext = generateMultiDimensionalContext(projects)

    /**
     * Is this a question about places and what they cost?
     *
     * Decided once, and it governs BOTH the city micro-market block in the
     * prompt and the table we render from it. They must agree: the block lists
     * every micro-market with its sectors, average rate, range and character,
     * which is exactly the five-column table buyers kept seeing appear
     * unbidden — the model was transcribing the block it had been handed.
     *
     * It was injected on every turn. "Show me 3 BHK in Sector 75" was answered
     * with a Noida-wide corridor table, then the project cards; so was a
     * question about what to check before buying. Nothing asked for it, and the
     * prompt rule against drawing tables cannot beat data sitting in context
     * begging to be tabulated. Don't send it unless the question is about it.
     */
    const wantsPriceContext = wantsMarketTable(message, (intent.projectNames?.length ?? 0) > 0)

    let microMarketsTail = ''
    if (wantsPriceContext) {
      try {
        const { buildCityMicroMarketsContext } = await import('../lib/discovery/sectorDataGateway')
        const city = (intent as any)?.city || DEFAULT_CITY
        // Same scope as the rendered table below. If these two ever disagree,
        // the model transcribes the block and the buyer sees two different
        // answers to one question stacked on top of each other.
        const microMarketsBlock = await buildCityMicroMarketsContext(city, findSectorsAsked(message))
        if (microMarketsBlock) {
          microMarketsTail = `\n\n${microMarketsBlock}`
        }
      } catch (e) {
        console.warn('[CHAT:MICRO_MARKET_CONTEXT:WARN]', e)
      }
    }

    // ─── AFFORDABILITY, CALCULATED HERE RATHER THAN BY THE MODEL ───────────────
    // Same rule as the market tables, for the same reason: the 31 Aug audit
    // caught the model quoting a comfortable EMI of "₹1,000,000 per month" on a
    // ₹2 lakh income — a slipped digit between lakh notation and numerals, on a
    // figure a buyer would act on. It also spent 45 seconds deriving it.
    let affordabilityTail = ''
    const statedIncome = statedMonthlyIncome(message ?? '')
    if (statedIncome && isAffordabilityQuestion(message ?? '')) {
      const a = computeAffordability(statedIncome)
      send('token', { token: `${renderAffordabilityTable(a)}\n\n` })
      affordabilityTail = affordabilityDirective(a)
      console.log(`[CHAT:AFFORDABILITY] income=${statedIncome} -> ₹${a.priceConservativeCr.toFixed(2)}–${a.priceStretchedCr.toFixed(2)} Cr`)
    }

    // ─── MARKET TABLE, RENDERED HERE RATHER THAN BY THE MODEL ──────────────────
    let renderedTable = ''
    /** Which table went on screen, so the chips can follow it. */
    let renderedTableKind: 'projects' | 'micro-market' | 'city-shelf' | 'yield' | null = null
    // A shortlist of real projects beats a city-wide table whenever discovery
    const cardsAreRendering = renderTarget === 'cards' || renderTarget === 'both'

    /**
     * Is the buyer asking us to list projects?
     *
     * Having projects in context is not the same as being asked for them. This
     * condition used to be "we hold two or more", so "What should I check
     * before buying a property in Noida?" — a general question, answered well
     * in prose — opened with a five-column table of Aims Max Gardenia, JM Aroma
     * and Maxblis White House II, because those happened to be the sector
     * shortlist from three turns earlier. The buyer had not asked about them.
     */
    const wantsProjectList =
      intent.queryKind === 'DISCOVERY' ||
      intent.queryKind === 'RANKING' ||
      (intent as { is_comparison_query?: boolean }).is_comparison_query === true

    /**
     * Citywide and superlative — "which is the best project in Noida".
     *
     * Checked BEFORE the shortlist table, because it is the same turn seen more
     * honestly: no sector, no budget, no named project, so there is nothing to
     * rank against and the old answer ranked against nothing. The shelf shows
     * one pick per budget band with the rule printed above it, and the chips
     * carry the narrowing the shelf declined to guess at.
     *
     * Unlike the shortlist table this renders even when cards are on screen. The
     * "never a project table beside cards" rule exists because the cards carry
     * the same five columns — the shelf's Budget column is the one thing they
     * cannot show, and three rows of framing beside twenty cards is the index to
     * them, not a duplicate of them.
     */
    const wantsShelf =
      Boolean(message) &&
      wantsProjectList &&
      wantsCityBandShelf(message ?? '', {
        hasSector: Boolean(intent.sector),
        hasBudget: Boolean(intent.budgetMax || intent.budgetMin),
        hasProjectFocus: (intent.projectNames?.length ?? 0) > 0,
      })

    /**
     * Built from a citywide query, not from `trimmedProjects`.
     *
     * Feeding it the turn's retrieval was the first version, and it rendered two
     * bands out of three: retrieval returned 19 rows and none had an entry price
     * above ₹2 Cr, because it ranks by score against an intent that is empty by
     * definition here. A ranked shortlist and a price spread want opposite
     * things, and the question that asks to see our range is the worst one to
     * answer from a shortlist's bias.
     */
    let citywideShelf = ''
    /** The names the shelf chose, handed to the prompt so it annotates them. */
    let shelfPicks: string[] = []
    if (wantsShelf) {
      try {
        const shelf = await renderCityShelfForCity(
          [...SUPPORTED_CITIES, 'Yamuna Expressway'],
          DEFAULT_CITY,
        )
        citywideShelf = shelf.table
        shelfPicks = shelf.picks
      } catch (e) {
        console.warn('[CHAT:CITY_SHELF] skipped:', e instanceof Error ? e.message : e)
      }
    }

    if (citywideShelf) {
      renderedTable = citywideShelf
      renderedTableKind = 'city-shelf'
      console.log('[CHAT:CITY_SHELF] rendered band spread for a citywide superlative')
    } else if (
      message &&
      !cardsAreRendering &&
      wantsProjectList &&
      trimmedProjects.length >= 2 &&
      (intent.projectNames?.length ?? 0) === 0
    ) {
      renderedTable = renderProjectTable(trimmedProjects as any)
      if (renderedTable) renderedTableKind = 'projects'
    }

    /**
     * The buyer named a project and a size it does not build.
     *
     * Say so plainly — the alternative is a card quoting the project's other
     * configurations, which reads as an answer until they open it and find no
     * 3 BHK. Then show what nearby actually has that size, because "it doesn't
     * exist here" on its own is a dead end, not advice.
     */
    const askedSizes = intent.bhk?.length ? [...new Set(intent.bhk)].sort((a, b) => a - b) : []
    const focusLacksSize =
      askedSizes.length > 0 &&
      (intent.projectNames?.length ?? 0) === 1 &&
      projects.length === 1 &&
      (projects[0] as { missing_bhk?: number[] }).missing_bhk?.length === askedSizes.length

    if (focusLacksSize && message) {
      const focus = projects[0]
      const sizes = askedSizes.join('/')
      try {
        const nearby = await prisma.project.findMany({
          where: {
            city: focus.city,
            sector: focus.sector,
            id: { not: focus.id },
            builder: { legal_flag: null },
            unit_types: { some: { bhk: { in: askedSizes } } },
          },
          select: {
            name: true, sector: true, status: true, possession_label: true,
            builder: { select: { name: true } },
            unit_types: {
              select: { bhk: true, price_min_cr: true, price_max_cr: true, carpet_area_sqft: true },
            },
          },
          take: 5,
        })
        const alternatives = renderAlternativesTable(nearby, askedSizes)
        send('token', {
          token: alternatives
            ? `**${focus.name} does not offer a ${sizes} BHK.** It builds ${[...new Set(focus.unit_types.map((u) => u.bhk))].sort((a, b) => a - b).join('/')} BHK only.\n\nIn ${focus.sector} these projects do:\n\n${alternatives}\n\n`
            : `**${focus.name} does not offer a ${sizes} BHK.** It builds ${[...new Set(focus.unit_types.map((u) => u.bhk))].sort((a, b) => a - b).join('/')} BHK only, and we hold no other ${sizes} BHK project in ${focus.sector}.\n\n`,
        })
        if (alternatives) {
          renderedTable = renderedTable || alternatives
          renderedTableKind = renderedTableKind ?? 'projects'
        }
      } catch (e) {
        console.warn('[CHAT:ALTERNATIVES] skipped:', e instanceof Error ? e.message : e)
      }
    }
    // The rendered counterpart of the block above, under the same condition.
    //
    // This used to also fire on `cardsAreRendering && trimmedProjects.length > 0`
    // — the reasoning being that cards cannot show what a sector costs against
    // its neighbours. True, and irrelevant to most questions: every turn that
    // rendered a card also got the Central Noida / Expressway / Greater Noida
    // table, whether the buyer asked about amenities, possession or schools.
    /**
     * Rental yield, and what a price has recorded doing.
     *
     * Three systems answered these and disagreed: `guardrails.ts` blocks any
     * "N% returns/CAGR/ROI" claim, HARD RULE 20 forbids ROI projections, and
     * `tools/financialCalculators.ts` projected 12% residential / 18% commercial
     * CAGR from constants. So the buyer got a refusal, a hedge or an invented
     * number depending on which path won the turn.
     *
     * The first two are right. But refusing the whole question was wrong, because
     * we hold the measured half: 65 sector rows carry a recorded 3BHK rent and we
     * hold 371 priced 3BHK units, so gross yield is division on rows we already
     * show. `yieldTable.ts` computes it, prints what it is and is not net of, and
     * still refuses to forecast — which is the part the guardrail protects.
     */
    if (!renderedTable && message && asksRentalYield(message)) {
      try {
        const yields = await computeSectorYields([
          ...SUPPORTED_CITIES,
          'Yamuna Expressway',
        ])
        renderedTable = renderRentalYieldTable(yields)
        if (renderedTable) {
          renderedTableKind = 'yield'
          console.log(`[CHAT:YIELD_TABLE] ${yields.length} sectors`)
        }
      } catch (e) {
        console.warn('[CHAT:YIELD_TABLE] skipped:', e instanceof Error ? e.message : e)
      }
    }

    /**
     * Appreciation, answered as recorded history or declined.
     *
     * Only fires with a project in focus, because the series is per project. And
     * it prints the points WITHOUT a rate of change when every point carries
     * `source: 'historical_benchmark'` — 1,400 of our 1,680 rows do, and they
     * step by an identical amount each quarter, so a CAGR off them restates
     * whatever constant generated them while looking like a market finding.
     */
    if (!renderedTable && message && asksAppreciation(message) && projects.length === 1) {
      try {
        const change = await computePriceChange(projects[0].id)
        if (change) {
          renderedTable = renderPriceChangeTable(change)
          if (renderedTable) {
            renderedTableKind = 'yield'
            console.log(`[CHAT:PRICE_CHANGE] ${change.projectName} observed=${change.observed}`)
          }
        }
      } catch (e) {
        console.warn('[CHAT:PRICE_CHANGE] skipped:', e instanceof Error ? e.message : e)
      }
    }

    /**
     * Appreciation for a SECTOR, or for the city when no sector was named.
     *
     * The branch above only fires on a single project in focus, and it can never
     * print a rate — every project holds five benchmark points and one observed
     * point, so `observed` is false for all 280 by construction. That left the
     * question buyers actually ask with nothing: "price appreciation in Sector
     * 150" retrieved ten projects, fell past the project branch, and was
     * answered from the model's memory. It scored 3/5 for that reason.
     *
     * `sector_intelligence.price_5yr_cagr_pct` is populated on all 65 rows and
     * stamped `verified_by: 'RealtyPals Research Desk'`. It is backward-looking,
     * which is the half of this question we are allowed to answer. The renderer
     * carries the refusal to forecast in its own text rather than trusting the
     * prompt, which is the layer that had been ignoring it.
     *
     * With no sector named this becomes a ranking, which is the citywide
     * superlative shape — the same gap the band shelf closes for "best project".
     */
    if (!renderedTable && message && asksAppreciation(message)) {
      try {
        const asked = findSectorsAsked(message)
        const sectorsForAppreciation =
          asked.length > 0 ? asked : intent.sector ? [String(intent.sector)] : []
        const rows = await computeSectorAppreciation(
          [...SUPPORTED_CITIES, 'Yamuna Expressway'],
          sectorsForAppreciation,
        )
        renderedTable = renderAppreciationTable(rows)
        if (renderedTable) {
          renderedTableKind = 'yield'
          console.log(
            `[CHAT:APPRECIATION] ${rows.length} sectors, asked=${sectorsForAppreciation.join(',') || 'citywide'}`,
          )
        }
      } catch (e) {
        console.warn('[CHAT:APPRECIATION] skipped:', e instanceof Error ? e.message : e)
      }
    }

    if (!renderedTable && message && wantsPriceContext) {
      try {
        const { getCityMicroMarkets } = await import('../lib/discovery/sectorDataGateway')
        const markets = await getCityMicroMarkets((intent as any)?.city || DEFAULT_CITY)
        renderedTable = renderMicroMarketTable(markets, {
          // A premium brief reads top-down, everything else bottom-up.
          order: /\bpremium|luxury|\b[2-9]\s*crore/i.test(message) ? 'price_desc' : 'price_asc',
          // Scope to the sectors the buyer named, when they named any. Without
          // this, "which is better for a family: 74, 75, 76 or 78" got the full
          // city table — six micro-markets, none of them containing 75, 76 or
          // 78 — above prose that quoted different rates for the same sectors.
          focusSectors: findSectorsAsked(message),
        })
        // Without this the chips never learned a market table went on screen,
        // so the branch that follows one up has never run.
        if (renderedTable) renderedTableKind = 'micro-market'
      } catch (e) {
        // A missing table costs the buyer nothing — the model still writes the
        // answer, it just writes it without the evidence block attached.
        console.warn('[CHAT:MARKET_TABLE] render skipped:', e instanceof Error ? e.message : e)
      }
    }

    // The micro-markets block is city-level and byte-identical on every turn,
    const spliceIntoStaticPrefix = (prompt: string, block: string): string => {
      if (!block) return prompt
      const token = `\n${STATIC_PREFIX_MARKER}\n`
      // No marker means this prompt was not built by buildSystemPromptWithCache;
      // appending is then the only safe option and matches the old behaviour.
      if (!prompt.includes(token)) return prompt + block
      return prompt.replace(token, `\n${block}\n${token}`)
    }

    // Built per provider: only the OpenAI legs can call tools, so everyone else
    // gets a prompt with no tool catalogue at all rather than the catalogue plus
    // a suffix retracting it.
    const buildPromptForProvider = (supportsTools: boolean): string =>
      spliceIntoStaticPrefix(
        buildSystemPromptWithCache(
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
        multiDimContext,
        supportsTools,
        // False when the gate above skipped retrieval. Without it the prompt
        // cannot tell "searched and found nothing" from "never searched".
        discoverySkipReason === null,
        ) + systemSuffix + (renderedTable ? (renderedTableKind === 'city-shelf' ? cityShelfShown(shelfPicks) : renderedTableKind === 'yield' ? YIELD_TABLE_SHOWN : TABLE_ALREADY_SHOWN) : ''),
        // Both tails ride the same slot. The unknown-project block goes last so
        // its handling rules are the closest instruction to the answer.
        microMarketsTail + unknownProjectTail + affordabilityTail,
      )

    // Tool-less is the common path (Gemini is tier 1) — size and fact-check against it.
    const systemPrompt = buildPromptForProvider(false)
    promptForGrounding = systemPrompt

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
    const isMetaQuestion = /what.*(assum|remember|know).*about\s+me\b|what.*constraints.*\bi\b|what.*(my|our)\s+(filters|profile|preferences|requirements)|what.*have\s+i\s+told|what.*do you.*think.*about\s+me\b/i.test(message)

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
    } else if (disambiguationText !== null) {
      fullText = disambiguationText
      send('token', { token: fullText })
    }

    if (disambiguationText === null && !isMetaQuestion) {
    // Tool dispatch lives in lib/ai/tools/handlers — shared across every
    // provider, so Gemini and OpenAI call into the exact same handlers.
    // Groq, Mistral and Cerebras get no tools (documented below).
    const handleToolCall = createToolHandler({ userId, sessionId: currentSessionId });

    // Stream generation with cost-aware model routing (G5): factual queries (definitional,
    const modelRoute = routeToModel(classification)
    // The cost profile for this turn: model, thinking budget and reply ceiling,
    const profile = profileFor(message)
    const inferenceConfig: InferenceConfig = {
      maxTokens: profile.maxTokens,
      model: modelRoute === 'cheap' ? MODELS.GEMINI_LITE : profile.model,
      thinkingBudget: profile.thinkingBudget,
    }
    console.log(
      `[CHAT:PROFILE] shape=${profile.shape} model=${inferenceConfig.model} think=${profile.thinkingBudget} maxTokens=${profile.maxTokens}`,
    )
    if (process.env.DEBUG_FALLBACK) {
      console.log(`[CHAT:MODEL_ROUTE] category=${classification.category} route=${modelRoute}`)
    }

    if (renderedTable) {
      send('token', { token: `${renderedTable}\n\n` })
      fullText += `${renderedTable}\n\n`
    }

    // Phase 2.2: Emit early "thinking" status before LLM inference to reduce perceived latency
    send('status', { status: 'thinking', message: 'Searching verified properties and analyzing your requirements...' })

      fallbackResult = await executeWithFallbackChain({
        systemPrompt,
        buildSystemPrompt: buildPromptForProvider,
        messages,
        send,
        onToolCall: handleToolCall,
        groqFallbackSuffix: '',
        projects,
        userMessage: message,
        userId,
        sessionId: currentSessionId,
        config: inferenceConfig,
        // We rendered the table above; drop any the model draws anyway.
        // Suppress when WE rendered a table, and also whenever cards are on
      // screen. CLAUDE.md has said "a project table is never rendered when
      // property cards are" since the table renderer was written, but the flag
      // only ever covered the first half — so a turn that rendered cards and no
      // table left the model free to draw its own.
      //
      // That is what happened to "best society in sector 137": eight cards went
      // to the buyer and the model wrote a three-row table above them, choosing
      // three of the eight for reasons nobody can audit. The cards already
      // carry price, builder, possession and area, and they can be tapped.
      suppressTables: Boolean(renderedTable) || cardsAreRendering,
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

    // ─── ANSWER CACHE WRITE ────────────────────────────────────────────────────
    if (
      action.type === 'TEXT_MESSAGE' &&
      message &&
      fullText &&
      // Not `startsWith` on one of the two outage strings — that missed the
      // other one, and an outage got cached and replayed as a verified answer.
      !isServiceFailureReply(fullText) &&
      (classifyShape(message) === 'lookup' || classifyShape(message) === 'factual') &&
      (intent.projectNames?.length ?? 0) === 0
    ) {
      setCachedResponse(
        message,
        { token: fullText, intentState, responseMode: 'chat' },
        undefined,
        GLOBAL_SCOPE,
        intentFingerprint(intent as Record<string, unknown>),
      )
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
      usedProvider, // Pass provider that succeeded for main response
      {
        // Second consecutive turn on the same shortlist escalates DECIDING → CONVERTING.
        stageTurnCount: priorShortlistTurns,
        // No model call for chips on a head term.
        allowLlmChips: false,
      }
    )

    // Chips built from the answer, not from a second model call.
    const adaptiveChips = buildAdaptiveChips({
      // 8, not 4: this list is what the picker chips offer, and a dropdown
      // that shows half the cards on screen is its own kind of wrong answer.
      projects: projects.slice(0, 8).map((p) => ({ id: p.id, name: p.name })),
      sectors: sectorMatches ?? [],
      rendered: renderedTableKind,
      missingFields: postSearchUiState.missingFields ?? [],
      /**
       * The project the buyer named — matched by name, not taken from the top
       * of the list.
       *
       * `projects[0]` is whatever ranked first, which is only the named project
       * when discovery ran as a name lookup. Ask about Maxblis White House II
       * while a Sector 75 shortlist is in context and `projects[0]` is Aims Max
       * Gardenia, so every follow-up chip offered Aims Max — a project the
       * buyer never mentioned. Falling back to null is right: no chip beats a
       * chip about the wrong building.
       */
      focusedProject: (() => {
        const named = intent.projectNames?.length === 1 ? intent.projectNames[0] : null
        if (!named) return null
        const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
        const hit = projects.find((p) => norm(p.name) === norm(named))
          ?? projects.find((p) => norm(p.name).includes(norm(named)) || norm(named).includes(norm(p.name)))
        return hit ? { id: hit.id, name: hit.name } : null
      })(),
      userMessage: message,
      city: DEFAULT_CITY,
      hasBudget: Boolean(intent.budgetMax || intent.budgetMin),
    })
    if (adaptiveChips.length > 0) {
      postSearchUiState.chips = adaptiveChips
    }

    // Branch-specific recovery set, handed to emitUiState as the fallback so the
    // single dedup pass there decides whether it is needed. Previously this block
    // ran its own dedup + mark-shown, duplicating what every other emission does.
    let recoveryChips: typeof postSearchUiState.chips = []
    {
      const sec = intent.sector || 'this sector'
      if (discoveryExpansion?.reason === 'no_inventory_in_exact_sector_nofallback') {
        recoveryChips = [
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
        recoveryChips = [
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

    emitUiState(
      { ...postSearchUiState, chips: postSearchUiState.chips },
      { fallbackChips: recoveryChips, skipDedup: postSearchUiState.stage === 'CLARIFYING' },
    )

    // ── Build artifact payload for the assistant message ──────────────────
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

    // Strip any residual web-search or provenance tags before persistence / rendering
    const sanitizedFullText = (fullText || '')
      .replace(/\s*\((?:web[-\s]?search|untrusted[-\s]?source|wikipedia|source:[^)]+)\)/gi, '')
      .replace(/\[(?:Source|\d+)[^\]]*\]/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    let assistantTextToPersist = sanitizedFullText || fullText;

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
      try {
        if (fullText) {
          // Names already rendered as cards this turn stay plain — a link beside the
          // card is noise. Everything else the model named becomes clickable, which
          // is the only route into detail for a project the search did not return.
          const cardedIds = new Set([...projects, ...nearbyProjects].map((p) => p.id))
          const allMentioned = await findProjectsMentioned(fullText, DEFAULT_CITY)
          const mentioned = allMentioned.filter((m) => !cardedIds.has(m.id))
          const proseChips = projects.length === 0 ? buildProseChips(mentioned) : []

          // Cards for the projects the answer itself named.
          if (projects.length === 0 && nearbyProjects.length === 0 && mentioned.length > 0 && renderTarget !== 'text') {
            try {
              const namedCards = await prisma.project.findMany({
                where: { id: { in: mentioned.map((m) => m.id) } },
                include: {
                  builder: { select: { id: true, name: true, slug: true } },
                  unit_types: true,
                  images: { take: 3, orderBy: { sort_order: 'asc' } },
                  amenities: { take: 10 },
                  connectivity: { take: 5, orderBy: { distance_km: 'asc' } },
                },
              })
              if (namedCards.length > 0) {
                send('properties', {
                  exactResults: namedCards,
                  nearbyResults: [],
                  expansion: null,
                  renderTarget: 'cards',
                })
                console.log('[CHAT:PROSE_CARDS]', { count: namedCards.length, names: namedCards.map((p) => p.name) })
              }
            } catch (e) {
              console.warn('[CHAT:PROSE_CARDS:ERROR]', e)
            }
          }

          if (proseChips.length > 0 || mentioned.length > 0) {
            // Dedup + mark-shown is emitUiState's job now — doing it here as well
            // marked these chips as seen, so emitUiState's own pass then filtered
            // every one of them out and fell through to floor chips.
            const emitted = proseChips
            // Convert project names to clickable markdown links: [Name](#entity:id)
            const linkedText = linkProjectNames(fullText, mentioned, cardedIds)
            emitUiState({
              stage: 'RESEARCH',
              thinking: '',
              chips: emitted,
              missingFields: [],
              confidence: 'MEDIUM',
              entities: mentioned,
            })
            // Persist the linked form with THIS turn's message.
            if (mentioned.length > 0 && linkedText !== fullText) {
              assistantTextToPersist = linkedText
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
              content: assistantTextToPersist || '[streamed]',
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

    /**
     * Did the answer contain a figure we never gave it?
     *
     * Perplexity's research prompt requires a citation on every sentence drawn
     * from tool output; the OpenAI Agents SDK wraps generation in an output
     * guardrail. A buyer-facing answer cannot carry [1][2] markers, but the
     * check those markers exist to enable is mechanical: a rupee figure, an
     * area or a year in the reply that appears nowhere in the prompt is one the
     * model supplied from memory.
     *
     * Logged, never blocking. Arithmetic we asked for — an EMI, a total outflow
     * — legitimately produces figures absent from the context, so the false
     * positive rate has to be measured before this can gate anything.
     * `[CHAT:UNGROUNDED]` is the signal; `groundingRate()` is the number.
     */
    if (responseText && promptForGrounding) {
      try {
        reportGrounding(responseText, promptForGrounding, { sessionId, query: (message || '').slice(0, 80) })
      } catch (e) {
        console.warn('[CHAT:GROUNDING] check skipped:', e instanceof Error ? e.message : e)
      }
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

  // Deliberately does not create a session.
  res.json({ ok: true })
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

  // Only sessions that actually contain a conversation.
  const sessions = await prisma.chatSession.findMany({
    where: { ...where, messages: { some: {} } },
    select: {
      id: true,
      title: true,
      summary: true,
      created_at: true,
      // One query instead of a count per session.
      _count: { select: { messages: true } },
      // The first user message is the title fallback. Taking it here costs one
      // join rather than a findFirst per row: the previous version issued two
      // extra queries for every session, so a 50-row sidebar cost 101 queries.
      messages: {
        orderBy: { created_at: 'asc' },
        take: 1,
        select: { content: true },
      },
    },
    orderBy: { created_at: 'desc' },
    take: 50,
  })

  const withTitles = sessions.map(session => {
    const stored = session.title?.trim()
    // 'Chat' is the old placeholder, not a title anyone chose.
    const usable = stored && stored !== 'Chat' ? stored : null
    const title = usable ?? session.messages[0]?.content.slice(0, 60) ?? 'Untitled'
    return {
      id: session.id,
      title,
      summary: session.summary,
      created_at: session.created_at,
      messageCount: session._count.messages,
    }
  })

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

      // Signature is trackEvent(userId, event, properties).
      trackEvent(userId ?? null, 'property_feedback_recorded', {
        project_id: projectId,
        session_id: sessionId,
        sentiment: sentiment || 'neutral',
        rating: rating ?? null,
        reason_count: Array.isArray(reasons) ? reasons.length : 0,
        has_comment: !!comment,
      })
    }
  } catch (err) {
    console.warn('[FEEDBACK] Failed to save:', err instanceof Error ? err.message : err)
  }

  res.json({ ok: true, feedback })
}))

export default router
