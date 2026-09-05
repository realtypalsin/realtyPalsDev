/**
 * Grounded answers for open questions and general conversational intelligence.
 *
 * Tier 1 & Tier 2 Grounding Engine:
 * 1. For questions answerable from DB (sector stats, price aggregations, verified builders),
 *    fetches ground-truth data in <20ms and completely skips web search.
 * 2. For unheld entities, broader market trends, or general knowledge, runs fast web search
 *    or general intelligence prompt.
 * 3. Never returns robotic refusals or "not verified in database" wall messages.
 * 4. Always ends with engaging conversational follow-up questions.
 */

import { prisma } from '../db'
import { DEFAULT_CITY, SUPPORTED_CITIES } from '../config/cities'
import { webSearch } from '../web'
import { executeWithFallbackChain } from './fallbackChain'
import { profileFor } from './inferenceProfile'
import { MODELS } from '../config'
import { builderMentionedIn } from '../builderNames'
import { getCachedResponse, setCachedResponse } from './semanticCache'
import type { OpenQueryDetection } from '../discovery/openQuery'
import { buildGeneralConversationalPrompt } from './prompts/generalPrompt'
import { findSectorsAsked } from '../discovery/proseEntities'

/** Cache scope. Open answers hold no session-specific facts, so they are shareable. */
export const OPEN_CACHE_SCOPE = 'open'

/** Entity and sector facts move slowly; 12h cache. */
const OPEN_CACHE_TTL_MS = 12 * 60 * 60 * 1000

export interface GroundedAnswer {
  text: string
  /** True when at least one claim came from our own tables. */
  fromDatabase: boolean
  /** True when live web results were part of the grounding. */
  fromWeb: boolean
  cached: boolean
  /**
   * True when `text` was already sent to the buyer token by token.
   *
   * The caller must not send it again — it is returned only so the transcript,
   * the cache and the card/chip pass have the finished answer to work from.
   */
  streamed?: boolean
}

// ── Database grounding helpers ───────────────────────────────────────────────

/**
 * Calculates sector pricing analytics directly from database tables.
 */
async function buildSectorPricingContext(message: string, city: string): Promise<string> {
  const sectorsAsked = findSectorsAsked(message)
  
  if (sectorsAsked.length > 0) {
    const rows = await prisma.sectorIntelligence.findMany({
      where: {
        sector: { in: sectorsAsked, mode: 'insensitive' },
      },
      select: {
        sector: true,
        city: true,
        micro_market: true,
        avg_price_per_sqft: true,
        avg_rent_3bhk_monthly: true,
        sector_stage: true,
        dominant_segment: true,
        lifestyle_tags: true,
        who_should_buy: true,
      },
    })

    const projectCounts = await prisma.project.groupBy({
      by: ['sector'],
      where: { sector: { in: sectorsAsked, mode: 'insensitive' } },
      _count: { _all: true },
      _avg: { price_min_cr: true },
      _min: { price_min_cr: true },
      _max: { price_min_cr: true },
    })

    if (rows.length > 0 || projectCounts.length > 0) {
      const parts = rows.map((r) => {
        const pStats = projectCounts.find(p => p.sector?.toLowerCase() === r.sector.toLowerCase())
        return `### ${r.sector} (${r.city || 'Noida'})\n` +
          `- Average Rate: ₹${Math.round(r.avg_price_per_sqft || 0).toLocaleString('en-IN')}/sqft\n` +
          `- Average 3 BHK Rent: ₹${Math.round(r.avg_rent_3bhk_monthly || 0).toLocaleString('en-IN')}/month\n` +
          `- Price Band: ₹${pStats?._min.price_min_cr || 'N/A'} Cr to ₹${pStats?._max.price_min_cr || 'N/A'} Cr\n` +
          `- Micro-market: ${r.micro_market || 'Noida'}\n` +
          `- Profile: ${r.dominant_segment || ''} (${r.sector_stage || 'Developed'})\n` +
          `- Best Suited For: ${r.who_should_buy || 'End-users and investors'}`
      })
      return `VERIFIED DATABASE SECTOR INTELLIGENCE:\n${parts.join('\n\n')}`
    }
  }

  // City-wide overview if no specific sector named
  const topSectors = await prisma.sectorIntelligence.findMany({
    where: { city: { in: [DEFAULT_CITY, ...SUPPORTED_CITIES] } },
    orderBy: { avg_price_per_sqft: 'desc' },
    take: 10,
    select: {
      sector: true,
      city: true,
      avg_price_per_sqft: true,
      avg_rent_3bhk_monthly: true,
      dominant_segment: true,
    },
  })

  if (topSectors.length > 0) {
    const list = topSectors.map(
      s => `- ${s.sector} (${s.city}): avg ₹${Math.round(s.avg_price_per_sqft || 0).toLocaleString('en-IN')}/sqft, 3BHK rent ₹${Math.round(s.avg_rent_3bhk_monthly || 0).toLocaleString('en-IN')}/mo`
    ).join('\n')
    return `VERIFIED DATABASE NOIDA / NCR SECTOR PRICING BENCHMARKS:\n${list}`
  }

  return ''
}

/** Builder record for a named entity, if we hold one. */
async function buildEntityContext(entity: string): Promise<string> {
  const builder = await prisma.builder.findFirst({
    where: { name: { contains: entity, mode: 'insensitive' } },
    select: {
      name: true,
      founder: true,
      founded_year: true,
      headquarters: true,
      parent_group: true,
      company_overview: true,
      website: true,
      projects_delivered_count: true,
      delivered_units: true,
      delivery_score: true,
      average_delay_months: true,
      rera_compliance_score: true,
      rera_promoter_id: true,
      legal_flag: true,
      executives: true,
    },
  })

  if (!builder) return ''

  const parts: string[] = [`Builder on record: ${builder.name}`]
  if (builder.founder) parts.push(`Founder: ${builder.founder}`)
  if (builder.executives) parts.push(`Executives: ${JSON.stringify(builder.executives).slice(0, 300)}`)
  if (builder.founded_year) parts.push(`Founded: ${builder.founded_year}`)
  if (builder.parent_group) parts.push(`Parent group: ${builder.parent_group}`)
  if (builder.headquarters) parts.push(`Headquarters: ${builder.headquarters}`)
  if (builder.projects_delivered_count) parts.push(`Projects delivered: ${builder.projects_delivered_count}`)
  if (builder.delivered_units) parts.push(`Units delivered: ${builder.delivered_units}`)
  // Scores are deliberately absent — see BUYER_OPAQUE_SCORES in
  // projectExposure.ts. "Delivery score: 92/100" is an analyst-set number a
  // buyer cannot interpret or check, and the model quoted it verbatim as
  // evidence of quality. The handover delay below is the same signal in a form
  // that means something.
  if (builder.average_delay_months !== null && builder.average_delay_months !== undefined) {
    parts.push(`Average handover delay: ${builder.average_delay_months} months`)
  }
  if (builder.rera_promoter_id) parts.push(`RERA promoter ID: ${builder.rera_promoter_id}`)
  if (builder.legal_flag) parts.push(`Legal flag: ${builder.legal_flag}`)
  if (builder.company_overview) parts.push(`Overview: ${builder.company_overview.slice(0, 400)}`)

  return parts.join('\n')
}

/** Any builder we hold whose name appears in the message. Longest name wins. */
// Was its own unbounded `prisma.builder.findMany` on every GENERAL turn,
// including "hi". `builderMentionedIn` is the same match against a 300s cache.
const findBuilderMentioned = builderMentionedIn

/** Digits that carry no factual weight on their own. */
const TRIVIAL_NUMBERS = new Set(['1', '2', '3', '0'])

function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/[,\s]/g, '')
}

/**
 * Drop sentences containing a number that does not appear in the grounding.
 *
 * The pre-send gate: a fabricated price, year or count is the failure mode that
 * costs the most trust, and the one that is cheap to catch deterministically.
 * Prose claims are not checked.
 *
 * **It runs only when we supplied the numbers ourselves.** Applied to every
 * answer it deletes correct general knowledge — asked about capital gains, the
 * lane answers "20% with indexation under Section 112A", and with no database
 * block to match against, every such sentence is ungrounded by this test and
 * the buyer gets an empty reply. So the caller passes the database context and
 * nothing else: when we handed the model our own figures, it must quote them;
 * when the question is general knowledge, this gate has no opinion.
 *
 * ponytail: numeric-substring match only. It drops legitimately derived figures
 * (a total computed from a per-sqft rate) along with invented ones — correct for
 * this path, since a grounded answer should quote rather than compute. Move to a
 * claim-level LLM check if derived figures ever need to survive here.
 */
export function stripUngroundedSentences(
  answer: string,
  groundingContext: string,
): { text: string; dropped: string[] } {
  const haystack = normalizeForMatch(groundingContext)
  const sentences = answer.split(/(?<=[.!?])\s+/)
  const kept: string[] = []
  const dropped: string[] = []

  for (const sentence of sentences) {
    const numbers = sentence.match(/\d[\d,]*(?:\.\d+)?/g) ?? []
    const ungrounded = numbers.filter((n) => {
      const clean = n.replace(/,/g, '')
      if (TRIVIAL_NUMBERS.has(clean)) return false
      return !haystack.includes(normalizeForMatch(clean))
    })
    if (ungrounded.length > 0) dropped.push(sentence.trim())
    else kept.push(sentence)
  }

  return { text: kept.join(' ').trim(), dropped }
}

// ── Entry point ──────────────────────────────────────────────────────────────

export interface GroundedAnswerInput {
  message: string
  detection: OpenQueryDetection
  city: string
  userId?: string | null
  sessionId?: string | null
  /**
   * The caller's SSE `send`, to stream the answer as it is generated.
   *
   * Optional, and honoured only when the answer is built from general knowledge
   * with no database block behind it — see the `streamable` decision below.
   * When it streams, the result carries `streamed: true` and the caller must
   * NOT send the text again.
   */
  stream?: (event: string, data: Record<string, unknown>) => void
  /**
   * What the session already knows, from `buildStateBrief`.
   *
   * Without it this lane answers every turn as though it were the first one.
   */
  stateBrief?: string
}

/**
 * High-performance grounded answer engine.
 * Dispatches to Database fast-path or Web-augmented Tier 1 prompt.
 */
export async function runGroundedAnswer(
  input: GroundedAnswerInput,
): Promise<GroundedAnswer | null> {
  const { message, detection, city, userId, sessionId } = input

  // An answer shaped by this buyer's state is not shareable.
  //
  // The scope key is the message alone, which was correct while this lane was
  // stateless. Now that a brief carrying budget, sector, workplace and the
  // focused project goes into the prompt, "what are the negatives" answered for
  // a buyer looking at ATS Nobility must never surface for the next buyer — the
  // same rule `semanticCache` already enforces by project focus.
  //
  // So a stateful turn neither reads nor writes the shared cache. Cold general
  // questions, which are the ones worth caching, still do.
  const shareable = !input.stateBrief
  const cached = shareable ? await getCachedResponse(message, OPEN_CACHE_SCOPE) : null
  if (cached?.token) {
    return { text: cached.token, fromDatabase: false, fromWeb: false, cached: true }
  }

  let dbContext = ''
  let fromDatabase = false
  let fromWeb = false

  // 1. Check Database Fast-Path
  try {
    if (detection.topic === 'SECTOR_PROFILE' || /\b(price|pricing|rates?|sqft|rent|cost|yield)\b/i.test(message)) {
      dbContext = await buildSectorPricingContext(message, city)
      if (dbContext) fromDatabase = true
    } else if (detection.topic === 'ENTITY' && detection.entity) {
      dbContext = await buildEntityContext(detection.entity)
      if (dbContext) fromDatabase = true
    } else if (detection.topic === 'GENERAL') {
      const builderGuess = await findBuilderMentioned(message)
      if (builderGuess) {
        dbContext = await buildEntityContext(builderGuess)
        if (dbContext) fromDatabase = true
      }
    }
  } catch (err) {
    console.warn('[GROUNDED:DB_ERROR]', err)
  }

  // 2. Web search, only when the question has a subject the web can answer.
  //
  // This was a blocklist — "if the message is not advice, search the web" —
  // which is the wrong shape for the same reason `toolBlindGuard` learned to
  // ask what a name IS rather than what it is not. Measured: "hi" fell through
  // it, cost 1,906ms searching for "hi Noida", and returned 2,009 characters of
  // noise that were then injected into the prompt as LIVE WEB & FACTUAL
  // CONTEXT — a greeting paying two seconds and an input-token bill to be told
  // about unrelated listings.
  //
  // The web earns its round trip when the turn names something outside our rows
  // and time-sensitive: a specific party, or market/news/policy movement. A
  // greeting, a pleasantry and a general-knowledge question name none of those.
  let webContext = ''
  const isEntity = detection.topic === 'ENTITY' && Boolean(detection.entity)
  const needsLiveFacts =
    /\b(latest|current|recent|now|today|this year|20\d\d|news|announced|launch(?:ed|ing)?|upcoming|trend|trending|appreciat|forecast|projection|circle rate|policy|notification|approved|metro|expressway|airport|jewar|infrastructure)\b/i
      .test(message)

  if (!dbContext && (isEntity || needsLiveFacts)) {
    const query = isEntity ? `${detection.entity} ${city} real estate` : `${message} ${city}`
    try {
      webContext = await webSearch(query, 3)
      if (webContext) fromWeb = true
    } catch (err) {
      console.warn('[GROUNDED:WEB_ERROR]', err)
    }
  } else if (!dbContext) {
    console.log('[GROUNDED:WEB_SKIPPED]', { reason: 'no searchable subject', q: message.slice(0, 60) })
  }

  // 3. Assemble Prompt
  const promptContext = [dbContext, webContext].filter(Boolean).join('\n\n')
  const systemPrompt = buildGeneralConversationalPrompt({
    userMessage: message,
    webContext: promptContext,
    city: city || DEFAULT_CITY,
    hasVerifiedData: Boolean(dbContext),
    stateBrief: input.stateBrief,
  })

  // 4. Stream / Generate Answer via Fallback Chain
  const profile = profileFor(message)
  const collected: string[] = []

  /**
   * Stream only when nothing we hold is at stake in the numbers.
   *
   * This lane buffered every answer, so time-to-first-token was the whole
   * generation — the buyer stared at a spinner for the full reply even though
   * the transport is SSE and the frontend renders tokens as they land.
   *
   * The reason to buffer is real but narrow: `stripUngroundedSentences` below
   * has to see the finished text to drop a figure that drifted off the block we
   * supplied, and a sentence already sent cannot be recalled. That check only
   * runs when `dbContext` is non-empty, so a general-knowledge answer — the
   * greeting, the tax question, the process explainer — has nothing to wait
   * for. Those stream; anything carrying our own figures still buffers.
   *
   * Safe to send raw here: the caller's `send` runs `sanitizeOutput` on every
   * token, so emoji, competitor names and off-platform URLs are stripped in
   * flight. What a streamed answer gives up is `linkProjectNames`, which needs
   * the whole text — the trade is inline entity links on answers built from no
   * project data, where our project names rarely appear, and the cards and
   * chips below are still built from the collected text either way.
   */
  const streamable = Boolean(input.stream) && !dbContext
  const collect = (event: string, data: Record<string, unknown>) => {
    if (event === 'token' && typeof data.token === 'string') {
      collected.push(data.token)
      if (streamable) input.stream?.('token', { token: data.token })
    }
  }
  if (streamable) console.log('[GROUNDED:STREAMING]', { q: message.slice(0, 60) })

  let raw = ''
  try {
    const result = await executeWithFallbackChain({
      systemPrompt,
      messages: [{ role: 'user', content: message }],
      send: collect,
      onToolCall: async () => ({}),
      groqFallbackSuffix: '',
      userMessage: message,
      userId,
      sessionId,
      // Two fixes over `{ maxTokens: 600 }`:
      //
      // `tools: false` — CLAUDE.md is explicit that a caller passing a stub
      // `onToolCall` must disable the catalogue. This one answers every tool
      // call with `{}`, so the model could call a tool, get nothing, call
      // again, and exhaust its tool cycles without emitting a single token.
      // The general lane is the one that must never come back empty.
      //
      // The profile — this lane is the whole general path now, and it was
      // running on the chain's default smart model with the default thinking
      // budget for "hi" and "what is the capital of france" alike.
      // `profileFor` reads the shape off the message with a regex and picks
      // the lite model with no thinking for a lookup, the smart one for a
      // judgement call. The 900 ceiling stays because a general answer that
      // needs more than that has become a project question.
      // The lite model with no thinking, whatever shape the question is.
      //
      // `profileFor` gives an ADVISORY question `gemini-3.6-flash` with a
      // 512-token thinking budget, which is right for the project lanes — a
      // comparison across four sectors and six constraints is what that budget
      // is for. It is wrong here, and it was the entire latency tail: measured
      // against production, the only two advisory-shaped queries in an
      // eight-query run were the two slowest at 57.0s and 23.4s while every
      // factual and lookup query landed between 4.2s and 10.8s.
      //
      // Probed directly on the same question ("is Noida good for families"):
      //
      //   gemini-3.6-flash, thinking 512   first token 6,248ms, total 19,899ms
      //   gemini-3.5-flash-lite, thinking 0  first token 3,458ms, total 3,626ms
      //
      // 5.5x on the total and nearly 2x on time-to-first-token, for an answer
      // now capped at 120-160 words with no project rows behind it. There is no
      // reasoning chain here to spend a thinking budget on, and thinking bills
      // at the output rate — so this is cheaper as well as faster. The project
      // lanes keep their profiles; only this one is pinned.
      config: {
        model: MODELS.GEMINI_LITE,
        thinkingBudget: 0,
        maxTokens: Math.min(profile.maxTokens ?? 900, 900),
        tools: false,
      },
    })
    raw = result.text || collected.join('')
  } catch (err) {
    console.warn('[GROUNDED:CHAIN_ERROR]', err)
    return null
  }

  // Numbers we supplied must be quoted, not drifted off. Only `dbContext` is
  // the reference — see stripUngroundedSentences on why the web block and
  // general knowledge are deliberately out of scope.
  let text = raw.trim()
  if (dbContext) {
    const { text: checked, dropped } = stripUngroundedSentences(text, dbContext)
    if (dropped.length > 0) {
      console.warn('[GROUNDED:UNGROUNDED_DROPPED]', { count: dropped.length, first: dropped[0]?.slice(0, 120) })
    }
    // A gate that empties the answer has failed, not the answer. Fall back to
    // the full text rather than sending the buyer nothing.
    if (checked.length >= 40) text = checked
  }

  if (!text || text.length < 10) return null

  if (shareable) {
    setCachedResponse(message, { token: text, responseMode: 'grounded' }, OPEN_CACHE_TTL_MS, OPEN_CACHE_SCOPE)
  }

  return {
    text,
    fromDatabase,
    fromWeb,
    cached: false,
    streamed: streamable,
  }
}

/**
 * Intelligent, helpful conversational fallback when no specific data is found.
 */
export function buildNoGroundingReply(detection: OpenQueryDetection): string {
  if (detection.topic === 'ENTITY' && detection.entity) {
    return `Regarding **${detection.entity}**, we are currently tracking verified partner projects and builders across Noida, Greater Noida, and Yamuna Expressway.\n\nWhile specific internal records for ${detection.entity} are being updated, I can provide immediate due-diligence checks, RERA verification steps, or compare them with top-rated developers in the same micro-market.\n\n*Which project or locality are you evaluating with them?*`
  }
  return `To help you with this effectively, could you share a bit more context on what you're looking to achieve — such as your preferred sector, budget band, or whether this is for family self-use or long-term investment?`
}
