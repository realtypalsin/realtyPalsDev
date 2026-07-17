// backend/src/routes/chat.ts
import { randomUUID } from 'crypto'
import { Router, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { checkRateLimit, invalidateSessionList, getCached, setCached } from '../lib/cache'
import { extractIntent } from '../lib/ai/intent'
import { IntentSchema, getIntentState, discoverProjects, getSectorContext, getAllSectorsOverview, isCityLevel, matchesProjectName } from '../lib/discovery'
import type { Intent, ScoredProject } from '../lib/discovery'
import { computeConfidence, buildClarificationOptions } from '../lib/discovery/confidence'
import { getMemory, upsertMemory } from '../lib/ai/memory'
import { buildContextMessages } from '../lib/ai/context'
import { maybeCompress } from '../lib/ai/compression'
import { buildAdvisorSystemPrompt } from '../lib/ai/prompts/index'
import { streamWithGroq, GroqStreamStallError } from '../lib/ai/groq'
import { streamWithOpenAI, StreamStallError } from '../lib/ai/openai'
import { getChipInventory } from '../lib/discovery/chipInventory'
import { FINANCIAL } from '../lib/config'
import { DEFAULT_CITY, PILOT_SCOPE_LABEL } from '../lib/config/cities'
import { verifyUser } from '../lib/auth'
import { clientIp } from '../lib/request'
import { getBuilderRecord } from '../lib/builders'
import { webSearch, areaInfo, commute, readPage } from '../lib/web'
import { calcEmi, calcStampDuty, calcGst, formatInr } from '../lib/calculators'
import {
  initializeChatAnalytics,
  trackIntentIdentified,
  trackResultsShown,
  trackConversion,
  trackDropOff,
  trackPromotionalClick
} from '../lib/analytics/tracking'
import { sanitizeUserMessage } from '../lib/ai/sanitize'
import { filterNewChips, markChipShown, hydrateFromDb, persistToDb } from '../lib/discovery/chipDedup'

const router = Router()

// Async error wrapper for Express handlers
const asyncHandler = (fn: (req: any, res: any) => Promise<void>) => (req: any, res: any) => {
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error('[CHAT:ERROR]', err)
    res.status(500).json({ error: 'Internal error' })
  })
}

// ── Fixes 1/2/8/9/12: Centralized cache-reuse decision ──────────────────────

// Fix 8: order-independent array comparison
function sameSet(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].map(String).sort()
  const sb = [...b].map(String).sort()
  return sa.every((v, i) => v === sb[i])
}

// Fix 12: structured routing observability
function logRouting(
  event:
    | 'CACHE_REUSED' | 'CACHE_REJECTED' | 'CACHE_PROJECT_MISS'
    | 'CACHE_SECTOR_MISS' | 'DISCOVERY_TRIGGERED' | 'DISCOVERY_SKIPPED'
    | 'SHORTLISTED_ENTERED',
  detail: Record<string, unknown>,
): void {
  console.log(`[ROUTING:${event}]`, detail)
}

type CacheDecision = {
  reuse: boolean
  reason: 'CACHE_REUSED' | 'CACHE_REJECTED' | 'CACHE_PROJECT_MISS' | 'CACHE_SECTOR_MISS'
  budgetOnly: boolean
}

// Fix 9: centralized cache validation — priority: project > sector > builder > BHK > budget > reuse
function canReuseCache(
  intent: Intent,
  prevIntent: Record<string, unknown>,
  cached: ScoredProject[],
): CacheDecision {
  const prev = prevIntent as Partial<Intent>

  // Fix 1/3: project named but absent from cache → must discover (uses shared matchesProjectName)
  if ((intent.projectNames?.length ?? 0) > 0) {
    const missing = (intent.projectNames ?? []).filter(
      (n) => !cached.some((p) => matchesProjectName(n, p.name)),
    )
    if (missing.length > 0) {
      return { reuse: false, reason: 'CACHE_PROJECT_MISS', budgetOnly: false }
    }
  }

  // Fix 2: search-signal changes evaluated in priority order — sector first.
  // City-level terms ("Noida", "Greater Noida") are not search signals — do not invalidate cache.
  if (
    intent.sector !== undefined &&
    intent.sector !== prev.sector &&
    !isCityLevel(intent.sector)
  ) {
    return { reuse: false, reason: 'CACHE_SECTOR_MISS', budgetOnly: false }
  }
  if (intent.builderName !== undefined && intent.builderName !== prev.builderName) {
    return { reuse: false, reason: 'CACHE_REJECTED', budgetOnly: false }
  }
  // Fix 8: order-independent BHK comparison
  if ((intent.bhk?.length ?? 0) > 0 && !sameSet(intent.bhk!, (prev.bhk as number[] | undefined) ?? [])) {
    return { reuse: false, reason: 'CACHE_REJECTED', budgetOnly: false }
  }

  // Budget changed → filter existing set, no re-discovery
  const budgetChanged = intent.budgetMax !== prev.budgetMax || intent.budgetMin !== prev.budgetMin
  if (budgetChanged) return { reuse: true, reason: 'CACHE_REUSED', budgetOnly: true }

  // No search-signal change → safe to reuse (reasoning, follow-ups, etc.)
  return { reuse: true, reason: 'CACHE_REUSED', budgetOnly: false }
}

// ── Issue 4: Token budget protection — prevent OpenAI 413 ────────────────────

const SAFE_TOKEN_CEILING = 100_000

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function trimMessagesToBudget(
  systemPrompt: string,
  msgs: Array<{ role: 'user' | 'assistant'; content: string }>,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const remaining = SAFE_TOKEN_CEILING - estimateTokens(systemPrompt)
  if (remaining <= 0) return msgs.slice(-2)

  let trimmed = [...msgs]
  while (
    trimmed.length > 2 &&
    estimateTokens(trimmed.map((m) => m.content).join(' ')) > remaining
  ) {
    // drop oldest user+assistant pair (priority: old history first)
    trimmed = trimmed.slice(2)
  }
  return trimmed
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
    z.object({ type: z.literal('TEXT_MESSAGE'), payload: z.object({ text: z.string() }) }),
    z.object({ type: z.literal('INTENT_PATCH'), payload: z.record(z.unknown()) }),
    z.object({ type: z.literal('COMPARE_PROPERTIES'), payload: z.record(z.unknown()) }),
    z.object({ type: z.literal('CALCULATE_EMI'), payload: z.record(z.unknown()) }),
    z.object({ type: z.literal('BOOK_VISIT'), payload: z.record(z.unknown()) }),
    z.object({ type: z.literal('REMOVE_FILTER'), payload: z.record(z.unknown()) }),
    z.object({ type: z.literal('OPEN_TOOL'), payload: z.record(z.unknown()) }),
  ]),
  sessionId: z.string().uuid().optional(),
  guestToken: z.string().optional(),
  intent: IntentSchema.optional(),
})

import { inputGuardrail, outputGuardrail } from '../lib/ai/guardrails'

function sseWrite(res: Response, event: string, data: Record<string, unknown>): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

router.post('/', async (req: Request, res: Response) => {
  const parsed = BodySchema.safeParse(req.body)
  if (!parsed.success) {
    console.error('[CHAT_ROUTE_ERROR]', parsed.error);
    res.status(400).json({ error: 'Invalid request body' })
    return
  }

  const { action, sessionId, guestToken } = parsed.data
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

  if (!userId && !guestToken) {
    res.status(400).json({ error: 'x-user-id header or guestToken body field required' })
    return
  }

  // ─── ANALYTICS: Initialize chat tracking
  await initializeChatAnalytics(sessionId, userId, guestToken)

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

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.setHeader('X-RateLimit-Remaining', String(remaining))
  res.flushHeaders()

  const send = (event: string, data: Record<string, unknown>) => sseWrite(res, event, data)

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

  try {
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

    const [memory, sessionData] = await Promise.all([
      getMemory(userId, guestToken),
      sessionId ? prisma.chatSession.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          user_id: true,
          guest_token: true,
          summary: true,
          last_projects: true,
          messages: { orderBy: { created_at: 'desc' }, take: 50, select: { role: true, content: true } },
        },
      }) : null,
    ])
    console.log('[CHAT] END intent/memory/session', Date.now())

    // Ownership check — prevent resuming/poisoning another user's conversation (IDOR).
    if (sessionData && !(
      (userId && sessionData.user_id === userId) ||
      (guestToken && sessionData.guest_token === guestToken)
    )) {
      send('error', { message: 'This conversation is not available.' })
      res.end()
      return
    }

    const existingSummary = sessionData?.summary ?? null
    const chatHistoryRaw = sessionData?.messages ?? []
    // If it was ordered desc, we must reverse it to ascending for the context window
    const chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [...chatHistoryRaw].reverse().map((m) => ({
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
    let currentSessionId = sessionId || randomUUID()

    intentDegraded = rawIntentResult.degraded
    const rawIntent = rawIntentResult.intent

    if (intentDegraded) {
      console.log('[CHAT] Intent extraction degraded (fallback to previous intent used).', { currentSessionId });
    }

    // Code-level purpose inference: retiree and first_time_buyer unambiguously imply endUse.
    // Defensive fallback for cases where the LLM prompt inference doesn't fire.
    intent = (
      !rawIntent.purpose &&
      (rawIntent.riskProfile === 'retiree' || rawIntent.riskProfile === 'first_time_buyer')
    ) ? { ...rawIntent, purpose: 'endUse' } : rawIntent
    console.log('[CHAT] END extractIntent', Date.now(), { intent })

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
    const { computeConversationState } = await import('../lib/discovery/conversationEngine')
    const chipInventory = await getChipInventory(DEFAULT_CITY)
    
    if (!isNewSession) {
      await hydrateFromDb(currentSessionId)
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
    
    // Deduplicate chips based on session
    const preChips = filterNewChips(currentSessionId, preSearchUiState.chips)
    preChips.forEach(c => markChipShown(currentSessionId, c.id))
    preSearchUiState.chips = preChips

    send('ui_state', preSearchUiState as unknown as Record<string, unknown>)

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
      if (projects.length > 0 || nearbyProjects.length > 0) {
        send('properties', { exactResults: projects, nearbyResults: nearbyProjects, expansion: null })
      }
      logRouting('DISCOVERY_SKIPPED', { intentState })
    } else if (intentState === 'READY_TO_SEARCH' || intentState === 'SHORTLISTED') {
      // Builder-only queries always run discovery — no pre-disambiguation.
      // discoverProjects() returns all matching projects via BUILDER_ONLY_THRESHOLD;
      // the AI summarizes. Pre-disambiguation here blocked discoverProjects() from
      // running, so no property cards were emitted for builder searches.
      console.log('[CHAT] START discoverProjects', Date.now(), { intent })
      const cacheKey = `search:${JSON.stringify(intent)}`
      let discoveryResult = await getCached(cacheKey) as Awaited<ReturnType<typeof discoverProjects>> | null
      if (!discoveryResult) {
        discoveryResult = await discoverProjects(intent)
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

      // Handle project disambiguation (multi-project match)
      if (discoveryResult.disambiguation) {
        projectDisambiguation = discoveryResult.disambiguation
        const { query, candidates } = discoveryResult.disambiguation
        const list = candidates.map((c) => `• ${c.name} (${c.sector})`).join('\n')
        disambiguationText = `Multiple projects match "${query}":\n\n${list}\n\nWhich one did you mean?`
        console.log('[CHAT:DISAMBIG] multi-match detected', { query, count: candidates.length })
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

      // Always send the properties event when intent is ready — even empty exactResults
      // is meaningful (triggers empty state UI and nearby section on the frontend, and clears previous results).
      send('properties', {
        exactResults: projects,
        nearbyResults: nearbyProjects,
        expansion: discoveryExpansion ?? null,
      })

      // ─── ANALYTICS: Track results shown
      if (sessionId && (projects.length > 0 || nearbyProjects.length > 0)) {
        await trackResultsShown(sessionId, projects.length + nearbyProjects.length)
      }
    }

    // Emit ui_state SECOND TIME (post-search, populates progressive chips)
    const postSearchUiState = await computeConversationState(
      intent,
      intentState,
      projects,
      intent.is_comparison_query ?? false,
      chatHistory,
      projectDisambiguation,
      sectorDisambiguation,
      undefined,
      chipInventory, // Reuse inventory loaded earlier for consistency
      true // isUserMessage
    )

    // Deduplicate chips based on session
    const postChips = filterNewChips(currentSessionId, postSearchUiState.chips)
    postChips.forEach(c => markChipShown(currentSessionId, c.id))
    postSearchUiState.chips = postChips

    send('ui_state', postSearchUiState as unknown as Record<string, unknown>)

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
    const { messages: compressedHistory, newSummary } = await maybeCompress(chatHistory, existingSummary)
    console.log('[CHAT] END maybeCompress', Date.now(), { compressedLen: compressedHistory.length, newSummary: !!newSummary })
    const { systemSuffix, messages: rawMessages } = buildContextMessages(message, compressedHistory, newSummary ?? existingSummary, memory)
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
    const systemPrompt = buildAdvisorSystemPrompt(intent, projects.slice(0, 3), memory, sectorCtx ?? undefined, sectorsOverview ?? undefined, discoveryExpansion ?? undefined, nearbyProjects.length > 0 ? nearbyProjects.slice(0, 3) : undefined, notFoundNames, blockedBuilders, intentState, DEFAULT_CITY) + systemSuffix

    // Issue 4: trim message history if total token estimate exceeds safe ceiling
    const messages = trimMessagesToBudget(systemPrompt, rawMessages)
    if (messages.length < rawMessages.length) {
      console.warn('[CHAT:TOKEN_GUARD] trimmed messages', { from: rawMessages.length, to: messages.length, estimatedSystemTokens: estimateTokens(systemPrompt) })
    }

    let fullText = ''
    if (needsClarification) {
      const confidence = computeConfidence(intent)
      const clarification = buildClarificationOptions(intent, chipInventory)
      fullText = clarification.question
      console.log('[CHAT:CLARIFY] deterministic clarification, skipping LLM', { intent, confidence: confidence.level, question: fullText })
      send('token', { token: fullText })
    } else if (disambiguationText !== null) {
      fullText = disambiguationText
      send('token', { token: fullText })
    }
    if (!needsClarification && disambiguationText === null) {

    // Using GitHub Models API (via Azure OpenAI) as Primary
    try {
      if (!process.env.OPENAI_API_KEY) throw new Error('No OPENAI_API_KEY configured');
      console.log('[CHAT] START streamWithOpenAI', Date.now())
      fullText = await streamWithOpenAI(systemPrompt, messages, send, async (name, args: any) => {
        try {
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
            : { rera_page: null, message: 'Could not fetch the RERA page. Advise the user to verify directly at up-rera.in.' };
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
          const [costSheet, paymentPlan] = await Promise.all([
            (prisma as any).costSheet.findUnique({ where: { project_id: projectId } }),
            (prisma as any).paymentPlan.findUnique({ where: { project_id: projectId } }),
          ]);
          return {
            cost_sheet: costSheet || null,
            payment_plan: paymentPlan || null,
            message: !costSheet && !paymentPlan ? 'Cost details not yet verified in database. Output exactly this: <realty-action type="contact" />' : undefined,
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
          const property = await (prisma as any).project.findUnique({
            where: { id: propertyId },
            include: {
              builder: { select: { name: true, slug: true } },
              unit_types: { select: { bhk: true, price_min_cr: true, price_max_cr: true, super_area_sqft: true } },
              images: { where: { type: 'hero' }, take: 1, select: { url: true } },
              decision_profile: { select: { why_buy: true, why_avoid: true, decision_thesis: true } },
              recommendation_profile: { select: { primary_thesis: true } }
            }
          });
          if (!property) return { error: 'Property not found.' };
          return { property };
        }

          return { error: 'Tool not recognized' };
        } catch (toolErr) {
          console.error(`[CHAT:TOOL_ERROR] ${name}:`, toolErr);
          return { error: `Tool ${name} failed to execute. Tell the user this information is temporarily unavailable.` };
        }
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
        send('token', { token: '\n\n[Response truncated due to timeout. Please ask me to continue.]' });
        // Close cleanly so the user's session is persisted and they can just say 'continue'
        fullText += '\n\n[Response truncated due to timeout. Please ask me to continue.]';
        // We do NOT throw here, we let the normal flow persist the partial message.
      } else {

      // Pre-first-chunk stall OR any other OpenAI error: no tokens sent yet.
      // Groq fallback is clean — client sees a seamless response from Groq.
      // IMPORTANT: Groq runs without tool support (no builder_lookup, web_search,
      // rera_check, etc.). Append FALLBACK_MODE suffix so the model knows it cannot
      // call tools and must redirect tool-dependent queries instead of answering
      // from training memory. This preserves Hard Rules 13, 16, 17, 18.
      if (process.env.GROQ_API_KEY) {
        const fallbackSystemPrompt = systemPrompt + GROQ_FALLBACK_SUFFIX
        console.log('[CHAT] START streamWithGroq (fallback)', Date.now(), {
          reason: 'OpenAI pre-first-chunk stall or network error',
          originalErrorMessage: (err as Error).message
        })
        try {
          fullText = await streamWithGroq(fallbackSystemPrompt, messages, send);
          console.log('[CHAT] END streamWithGroq', Date.now(), { fullTextLen: fullText.length })
        } catch (groqErr) {
          console.error('[chat] Groq fallback error:', (groqErr as Error).message);
          fullText = "I apologize, but my AI services are currently experiencing extremely high load and rate limits. Please try your request again in a few minutes.";
          send('token', { token: fullText });
        }
      } else {
        console.error('OpenAI failed and no GROQ_API_KEY fallback configured');
        fullText = "I apologize, but my AI services are currently unavailable. Please try your request again in a few minutes.";
        send('token', { token: fullText });
      }
      }
      }
    } // end: !needsClarification && disambiguationText === null

    if (fullText) {
      try {
        const gr = await outputGuardrail(fullText, systemPrompt);
        if (gr.violations.length > 0) {
          const severity = gr.blocked ? 'CRITICAL' : 'WARNING'
          console.error(`[GUARDRAIL_${severity}] Output guardrail triggered`, {
            blocked: gr.blocked,
            reason: gr.reason,
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
        console.error('[GUARDRAIL_ERROR] Failed to run outputGuardrail', err)
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

    console.log('[CHAT] BEFORE send(done)', Date.now())
    send('done', { sessionId: currentSessionId, intentState, intent, responseMode })
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

// Session restore (GET /chat/session) never runs the Conversation Engine, so
// without this the progressive suggestion chips only exist after the user
// sends a fresh message — a restored session with a shortlist and history
// shows no chips at all until then. Recompute the same ui_state a live POST
// /chat turn would emit, from the restored intent/projects/history.
async function buildRestoreUiState(
  lastIntent: Prisma.JsonValue | null,
  lastProjects: Prisma.JsonValue | null,
  messages: Array<{ role: string; content: string }>,
  currentSessionId?: string,
  rlKey?: string
) {
  const { computeConversationState } = await import('../lib/discovery/conversationEngine')
  const { hydrateFromDb } = await import('../lib/discovery/chipDedup')
  const intent = (lastIntent ?? {}) as Intent
  const projects = (lastProjects as unknown as ScoredProject[]) ?? []
  const chatHistory = messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  const intentState = getIntentState(intent, projects.length > 0)
  const chipInventory = await getChipInventory(DEFAULT_CITY)

  if (currentSessionId) {
    await hydrateFromDb(currentSessionId)
  }

  const uiState = await computeConversationState(intent, intentState, projects, intent.is_comparison_query ?? false, chatHistory, undefined, undefined, undefined, chipInventory, true)
  
  if (currentSessionId) {
    const { filterNewChips } = await import('../lib/discovery/chipDedup')
    uiState.chips = filterNewChips(currentSessionId, uiState.chips)
  }
  
  return uiState
}

// GET /chat/session/list — must come before GET /chat/session (order matters in Express)
router.get('/session/list', async (req: Request, res: Response) => {
  const userId = (await verifyUser(req)) ?? undefined
  const guestToken = req.query.guestToken as string | undefined

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

    // Don't cache empty results — a new session may arrive within the TTL window
    if (result.length > 0) {
      await setCached(cacheKey, result, SESSION_LIST_TTL)
    }

    res.json({ sessions: result })
  } catch (err) {
    console.error('[session/list] auth query failed:', err)
    res.status(500).json({ error: 'Failed to load sessions' })
  }
})

// GET /chat/session?id= — restore or find/create latest session
router.get('/session', asyncHandler(async (req: Request, res: Response) => {
  const userId = await verifyUser(req)
  const guestToken = req.query.guestToken as string | undefined

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

  const specificId = req.query.id as string | undefined

  if (specificId) {
    // Guests can restore their own sessions too (guest_token match) — mirrors
    // the ownership check already used by PATCH/DELETE /session/:id below.
    const ownerFilter = userId ? { user_id: userId } : { guest_token: guestToken }
    const session = await prisma.chatSession.findFirst({
      where: { id: specificId, ...ownerFilter },
      include: { messages: { orderBy: { created_at: 'desc' }, take: MAX_MESSAGES } },
    })

    if (!session) {
      res.status(404).json({ error: 'Session not found' })
      return
    }

    session.messages.reverse()

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
      messages: formatMessages(
        session.messages as Parameters<typeof formatMessages>[0]
      ),
    })
    return
  }

  // No id — find or create latest session (authenticated users only; guests
  // never auto-continue a "latest" session, they land on a fresh welcome screen)
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
    chat_phase: session.chat_phase ?? 'DISCOVERY',
    last_projects: session.last_projects ?? null,
    last_intent: lastIntent,
    ui_state: await buildRestoreUiState(lastIntent, session.last_projects, session.messages),
    messages: formatMessages(
      session.messages as Parameters<typeof formatMessages>[0]
    ),
  })
}))

// PATCH /chat/session/:id — rename session
router.patch('/session/:id', asyncHandler(async (req: Request, res: Response) => {
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
}))

// DELETE /chat/session/:id — remove session
router.delete('/session/:id', asyncHandler(async (req: Request, res: Response) => {
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
}))

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
