// backend/src/lib/ai/intent.ts
import Groq from 'groq-sdk'
import { meteredClient } from './geminiMeter'
import OpenAI from 'openai'
import { z } from 'zod'
import { INTENT_EXTRACTION_PROMPT } from './prompts/index'
import type { Intent } from '../discovery'
import { MODELS, FALLBACK_CHAIN } from '../config'
import { IntentSchema } from '../discovery/intent'

export function normalizeSectorName(rawSector?: string): string | undefined {
  if (!rawSector) return undefined
  const cleaned = rawSector.trim()

  const secNumMatch = cleaned.match(/Sector\s*(\d+[A-Za-z]?)/i)
  if (secNumMatch) {
    return `Sector ${secNumMatch[1]}`
  }

  if (/sports\s*city/i.test(cleaned)) return 'Sector 79'
  if (/yamuna\s*expressway/i.test(cleaned)) return 'Yamuna Expressway'
  if (/noida\s*expressway/i.test(cleaned)) return 'Noida Expressway'
  if (/greater\s*noida\s*west|noida\s*extension/i.test(cleaned)) return 'Greater Noida West'

  return cleaned
}

export function mergeIntent(previous: Intent, update: z.infer<typeof IntentSchema>): Intent {
  if (update.sector) {
    update.sector = normalizeSectorName(update.sector)
  }
  if (previous.sector) {
    previous.sector = normalizeSectorName(previous.sector)
  }

  // projectNames and is_comparison_query are per-turn signals — they reflect the
  // CURRENT message only. Never inherit from previous turns: a search query after a
  // comparison would otherwise see stale projectNames and wrongly enter comparison mode.
  const freshProjectLookup =
    (update.projectNames?.length ?? 0) > 0 && update.sector === undefined

  // If the user specifies a brand new sector and nothing else (e.g. "what about sector 75?")
  // we want to ensure we don't accidentally constrain it to highly specific previous filters
  // unless explicitly provided in the new query.
  const isSectorSwitch = update.sector && previous.sector && update.sector !== previous.sector

  // Default spatialScope to EXACT when sector is present and not explicitly PROXIMITY
  let spatialScope = update.spatialScope || previous.spatialScope
  if (update.sector && !update.spatialScope) {
    spatialScope = 'EXACT'
  }

  // Follow-up context queries (e.g. "show payment plans", "view cost sheet", "calculate EMI")
  // should preserve the active project context instead of wiping it
  // `!update.sector` matters: isSectorSwitch only fires when a PREVIOUS sector
  // existed, so a buyer who had one project in context and then names their first
  // sector ("what about Sector 150?") was still treated as a follow-up and kept
  // the old project attached — the assistant then answered about the wrong one.
  // Naming any sector is a topic change, not a follow-up.
  const isFollowUpQuery = Boolean(
    previous.projectNames &&
    previous.projectNames.length === 1 &&
    !isSectorSwitch &&
    !update.sector &&
    (!update.projectNames || update.projectNames.length === 0)
  )

  const result = {
    ...previous,
    projectNames: isFollowUpQuery ? previous.projectNames : (update.projectNames && update.projectNames.length > 0 ? update.projectNames : undefined),
    is_comparison_query: undefined, // reset comparison flag per turn
    // Only clear sector/lifestyle if this is a TRULY fresh lookup (no prior context)
    ...(freshProjectLookup && !previous.sector ? { lifestyleKeywords: undefined } : {}),
    ...(isSectorSwitch ? { 
        projectNames: undefined,
        targetProjectId: undefined,
        bhk: undefined, 
        budgetMin: undefined, 
        budgetMax: undefined, 
        lifestyleKeywords: undefined,
        areaMin: undefined,
        areaMax: undefined
    } : {}),
    // Drop nulls as well as undefined. IntentSchema is deliberately `.nullable()`
    // because models emit `"sector": null` for "not specified", but letting that
    // through put a literal null into Intent — and downstream isCityLevel(sector)
    // calls .toLowerCase() on it. Null means "not specified", same as absent.
    ...Object.fromEntries(Object.entries(update).filter(([, v]) => v !== undefined && v !== null)),
    ...(spatialScope ? { spatialScope } : {}),
  } as Intent

  // Drop keys whose value is undefined. The per-turn resets above (projectNames,
  // is_comparison_query) left the keys present-but-undefined, which is semantically
  // identical to absent but makes Intent objects non-canonical — it broke deep
  // equality and padded anything that enumerates keys.
  for (const k of Object.keys(result)) {
    if ((result as Record<string, unknown>)[k] === undefined) {
      delete (result as Record<string, unknown>)[k]
    }
  }

  return result
}

// Fields the extraction prompt actually reasons about. Serialising the whole
// merged Intent sent internal bookkeeping (targetProjectId, queryKind, radiusKm,
// scoring residue) to the model on every single turn for no benefit.
const PROMPT_INTENT_FIELDS = [
  'bhk', 'budgetMin', 'budgetMax', 'possession', 'sector', 'areaMin', 'areaMax',
  'purpose', 'builderName', 'lifestyleKeywords', 'projectNames', 'riskProfile',
] as const

/** Compact previous-intent payload for the extraction prompt. */
export function slimIntentForPrompt(prev: Intent): string {
  const out: Record<string, unknown> = {}
  for (const k of PROMPT_INTENT_FIELDS) {
    const v = (prev as Record<string, unknown>)[k]
    if (v === undefined || v === null) continue
    if (Array.isArray(v) && v.length === 0) continue
    out[k] = v
  }
  return JSON.stringify(out)
}

/**
 * Strict parse: returns null when the provider's output was unusable (empty,
 * non-JSON, or schema-invalid) so the caller can roll over to the next provider.
 * A valid-but-empty `{}` is a legitimate result ("hello" → no constraints) and
 * returns a merged Intent, not null.
 */
export function tryParseIntentJson(raw: string, previous: Intent): Intent | null {
  if (!raw || !raw.trim()) return null

  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return null

  try {
    const result = IntentSchema.safeParse(JSON.parse(match[0]))
    if (!result.success) {
      console.warn('[intent] schema mismatch:', result.error.message)
      return null
    }
    return mergeIntent(previous, result.data)
  } catch {
    return null
  }
}

/** Exported for unit testing only. Parses raw LLM JSON output into a merged Intent. */
export function parseIntentJson(raw: string, previous: Intent): Intent {
  return tryParseIntentJson(raw, previous) ?? previous
}

async function extractWithCerebras(msg: string, prev: Intent, apiKey: string): Promise<Intent | null> {
  const { completeWithCerebras } = await import('./cerebras')
  const raw = await completeWithCerebras(
    INTENT_EXTRACTION_PROMPT,
    `Previous intent: ${slimIntentForPrompt(prev)}\n\nUser message: ${msg}`,
    apiKey
  )
  return tryParseIntentJson(raw, prev)
}

async function extractWithMistral(msg: string, prev: Intent, apiKey: string): Promise<Intent | null> {
  const { completeWithMistral } = await import('./mistral')
  const raw = await completeWithMistral(
    INTENT_EXTRACTION_PROMPT,
    `Previous intent: ${slimIntentForPrompt(prev)}\n\nUser message: ${msg}`,
    apiKey
  )
  return tryParseIntentJson(raw, prev)
}

async function extractWithGroqKey(msg: string, prev: Intent, apiKey: string, timeout = 8000): Promise<Intent | null> {
  const groq = new Groq({ apiKey, timeout })
  let raw = '{}'
  try {
    const completion = await groq.chat.completions.create({
      model: MODELS.GROQ_SMART,
      messages: [
        { role: 'system', content: INTENT_EXTRACTION_PROMPT },
        { role: 'user', content: `Previous intent: ${slimIntentForPrompt(prev)}\n\nUser message: ${msg}` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 256,
      temperature: 0.1,
    })
    raw = completion.choices[0]?.message?.content ?? '{}'
  } catch (err) {
    const e = err as { status?: number; message?: string }
    if (e?.status === 429 || e?.message?.includes('rate_limit_exceeded') || e?.message?.includes('Rate limit reached')) {
      console.warn('[INTENT:GROQ] 70B rate limited, retrying intent with 8B instant model')
      const fallbackCompletion = await groq.chat.completions.create({
        model: MODELS.GROQ_FAST,
        messages: [
          { role: 'system', content: INTENT_EXTRACTION_PROMPT },
          { role: 'user', content: `Previous intent: ${slimIntentForPrompt(prev)}\n\nUser message: ${msg}` },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 256,
        temperature: 0.1,
      })
      const fallbackRaw = fallbackCompletion.choices[0]?.message?.content
      if (!fallbackRaw || !fallbackRaw.trim()) {
        console.error('[INTENT:GROQ] Both GROQ models failed after rate limit')
        throw new Error('Both GROQ models failed after rate limit exceeded')
      }
      raw = fallbackRaw
    } else {
      throw err
    }
  }
  return tryParseIntentJson(raw, prev)
}

async function extractWithOpenAIKey(msg: string, prev: Intent, apiKey: string, signal: AbortSignal): Promise<Intent | null> {
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://models.inference.ai.azure.com',
    maxRetries: 0,
  })
  const completion = await client.chat.completions.create(
    {
      model: MODELS.MAIN,
      messages: [
        { role: 'system', content: INTENT_EXTRACTION_PROMPT },
        { role: 'user', content: `Previous intent: ${slimIntentForPrompt(prev)}\n\nUser message: ${msg}` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 256,
      temperature: 0.1,
    },
    { signal },
  )
  const raw = completion.choices[0]?.message?.content ?? '{}'
  return tryParseIntentJson(raw, prev)
}

export interface IntentResult {
  intent: Intent
  /** True when all providers failed and previousIntent was returned as fallback. */
  degraded: boolean
}

import { isKeyFailed, markKeyFailed } from './providerStatus'

import { GoogleGenAI } from '@google/genai'

/**
 * True when regex extraction is as good as the model on this message, so the
 * LLM round trip buys nothing.
 *
 * Intent extraction runs to completion before the answering call starts, and it
 * measures p50 3.4s / p90 6.7s — a fifth to a third of total turn latency,
 * spent in front of the buyer. Most of what it is asked to parse is a keyword
 * phrase: "2 bhk in sector 75 noida", "property rates in noida extension".
 * There is no ambiguity in those for a model to resolve.
 *
 * The bar is deliberately conservative, because everything the heuristic cannot
 * see — a second constraint, a comparison, a stated life situation — is exactly
 * what makes an answer good. A message qualifies only if it is short, has a
 * single clause, and yielded at least one hard field. Anything else pays for
 * the model.
 */
function heuristicIsSufficient(message: string, extracted: Intent, previous: Intent): boolean {
  const words = message.trim().split(/\s+/).length
  if (words > 10) return false

  // Multi-clause, comparative or conversational phrasing needs the model:
  // commas and "vs" carry constraints the regexes above do not look for, and a
  // follow-up ("make that 2 crore") is only meaningful against previous intent.
  if (/[,;?]|\bvs\b|\bversus\b|\bcompare\b|\bor\b|\band\b|\bbut\b|\bactually\b|\binstead\b|\bwhat about\b/i.test(message)) {
    return false
  }

  // Refinement of an existing search is the model's job — the heuristic cannot
  // tell "show me something bigger" from a fresh query.
  if (Object.keys(previous).length > 0) return false

  const gained =
    (extracted.bhk?.length ?? 0) > 0 || !!extracted.sector || !!extracted.budgetMax
  return gained
}

export async function extractIntent(message: string, previousIntent: Intent): Promise<IntentResult> {
  // Fast path: skip the round trip when the regexes already have the whole
  // message. See heuristicIsSufficient for why the bar is set where it is.
  if (process.env.INTENT_FAST_PATH !== 'false') {
    const heuristic = extractIntentHeuristic(message, previousIntent)
    if (heuristicIsSufficient(message, heuristic, previousIntent)) {
      console.log(`[INTENT:FAST_PATH] regex-only extraction for "${message.slice(0, 60)}"`)
      return { intent: heuristic, degraded: false }
    }
  }

  /**
   * Intent extraction walks the same chain the answer does.
   *
   * This used to be a second, hand-written copy of the provider order, and it
   * had already drifted: it omitted `GEMINI_API_KEY1` entirely, so when the
   * billed Gemini key ran out of credits — which is its state today — intent
   * extraction skipped the working free-tier key and jumped to Mistral. It also
   * asked Cerebras for `llama3.3-70b` while the answer chain asked for
   * `gpt-oss-120b`, so the two could fail for different reasons on the same
   * outage. CLAUDE.md says the chain lives in one place; this derives from it.
   *
   * Only the timeout is intent-specific: extraction sits in front of the
   * answer, so a slow leg costs the buyer twice and is worth abandoning sooner.
   */
  const intentChain = FALLBACK_CHAIN.map((leg) => ({
    provider: leg.provider,
    envKey: leg.envKey,
    model: leg.model,
    timeout: leg.provider === 'gemini' ? 10_000 : 3_000,
  }))

  for (const config of intentChain) {
    if (isKeyFailed(config.envKey)) {
      console.log(`[INTENT:SKIP] ${config.provider}/${config.envKey} — blacklisted circuit breaker active`)
      continue
    }
    const apiKey = process.env[config.envKey]
    if (!apiKey) continue

    try {
      if (config.provider === 'gemini') {
        console.log(`[INTENT] Trying Gemini (${config.model}) via ${config.envKey}`)
        const client = meteredClient({ apiKey, endpoint: 'intent', timeoutMs: config.timeout })
        const res = await client.models.generateContent({
          model: config.model || 'gemini-3.6-flash',
          contents: [{ role: 'user', parts: [{ text: `Previous intent: ${slimIntentForPrompt(previousIntent)}\n\nUser message: ${message}` }] }],
          config: {
            systemInstruction: INTENT_EXTRACTION_PROMPT,
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        })
        const raw = res.text?.trim() ?? '{}'
        const result = tryParseIntentJson(raw, previousIntent)
        if (result) return { intent: result, degraded: false }
      }
      if (config.provider === 'groq') {
        console.log(`[INTENT] Trying Groq (${config.model}) via ${config.envKey}`)
        const result = await extractWithGroqKey(message, previousIntent, apiKey, config.timeout)
        if (result) return { intent: result, degraded: false }
      }
      if (config.provider === 'cerebras') {
        console.log(`[INTENT] Trying Cerebras via ${config.envKey}`)
        const result = await extractWithCerebras(message, previousIntent, apiKey)
        if (result) return { intent: result, degraded: false }
      }
      if (config.provider === 'mistral') {
        console.log(`[INTENT] Trying Mistral via ${config.envKey}`)
        const result = await extractWithMistral(message, previousIntent, apiKey)
        if (result) return { intent: result, degraded: false }
      }
      if (config.provider === 'openai') {
        console.log(`[INTENT] Trying OpenAI via ${config.envKey}`)
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), config.timeout)
        try {
          const result = await extractWithOpenAIKey(message, previousIntent, apiKey, controller.signal)
          clearTimeout(timer)
          if (result) return { intent: result, degraded: false }
        } catch (err) {
          clearTimeout(timer)
          const e = err as { status?: number; name?: string; message?: string }
          if (e?.status === 404 || e?.status === 401 || e?.status === 403 || e?.name === 'AbortError' || (e?.message || '').includes('404')) {
            markKeyFailed(config.envKey)
          }
          throw err
        }
      }
    } catch (err) {
      console.warn(`[INTENT] ${config.provider}/${config.envKey} failed:`, (err as Error)?.message || String(err))
    }
  }

  // All providers failed. Use heuristic pattern matching as last resort
  console.warn('[INTENT] All LLM providers failed or unconfigured — executing heuristic fallback')
  const heuristicIntent = extractIntentHeuristic(message, previousIntent)
  return { intent: heuristicIntent, degraded: true }
}

/**
 * Last-resort extraction when every LLM provider has failed. Exported so the
 * degraded path is directly testable — it is what buyers hit during an outage.
 */
export function extractIntentHeuristic(message: string, previousIntent: Intent): Intent {
  const fallback = { ...previousIntent }

  // BHK extraction
  const bhkMatch = message.match(/(\d)\s*(?:bhk|bed\s*room)/i)
  if (bhkMatch) {
    fallback.bhk = [parseInt(bhkMatch[1])]
  }

  // Budget extraction (handles crore, cr, lakh, lac)
  const budgetMatch = message.match(/(?:under|within|upto|up\s*to)?[\s]*₹?(\d+(?:\.\d+)?)\s*(crore|cr|lakh|lac)/i)
  if (budgetMatch) {
    let value = parseFloat(budgetMatch[1])
    const unit = budgetMatch[2].toLowerCase()
    if (unit === 'lakh' || unit === 'lac') {
      value = value / 100 // Convert lakh to crore
    }
    fallback.budgetMax = value
  }

  // Sector extraction
  const sectorMatch = message.match(/sector\s+(\d+[a-z]*)/i)
  if (sectorMatch) {
    fallback.sector = normalizeSectorName(`Sector ${sectorMatch[1]}`)
  }

  // Possession/timeline extraction
  if (/ready\s*to\s*move|rtm|immediate|asap/i.test(message)) {
    fallback.possession = 'immediate'
  } else if (/within\s*1\s*year|1\s*year|next\s*year/i.test(message)) {
    fallback.possession = '1year'
  } else if (/within\s*2\s*year|2\s*year|in\s*2\s*year/i.test(message)) {
    fallback.possession = '2year'
  } else if (/within\s*3\s*year|3\s*year|in\s*3\s*year|long\s*term/i.test(message)) {
    fallback.possession = '3year+'
  }

  // Purpose extraction
  if (/invest|investment|appreciation|roi|returns|income/i.test(message)) {
    fallback.purpose = 'investment'
  } else if (/live|stay|own|occupy|home/i.test(message)) {
    fallback.purpose = 'endUse'
  }

  // Area range extraction
  const areaMatch = message.match(/(\d+)\s*(?:to|—|-)\s*(\d+)\s*(?:sq|sqft|sq\.\s*ft|square\s*feet)/i)
  if (areaMatch) {
    fallback.areaMin = parseInt(areaMatch[1])
    fallback.areaMax = parseInt(areaMatch[2])
  } else {
    const singleAreaMatch = message.match(/(?:about|around|approximately)\s*(\d+)\s*(?:sq|sqft|sq\.\s*ft|square\s*feet)/i)
    if (singleAreaMatch) {
      fallback.areaMin = parseInt(singleAreaMatch[1]) * 0.9
      fallback.areaMax = parseInt(singleAreaMatch[1]) * 1.1
    }
  }

  // Builder name extraction (basic pattern)
  const builderMatch = message.match(/(?:by|from|builder|developer)\s+([A-Z][a-zA-Z\s&]+?)(?:\s+(?:project|in|at|sector)|$)/i)
  if (builderMatch) {
    fallback.builderName = builderMatch[1].trim()
  }

  // Spatial scope detection: distinguish "in Sector X" (EXACT) vs "near Sector X" (PROXIMITY) vs "Noida" (BROAD)
  if (fallback.sector) {
    // Check for proximity keywords before the sector mention
    const proximityMatch = /\b(near|around|close\s+to|nearby|vicinity|adjacent\s+to)\s+/i.test(message)

    // For exact match, look around sector mention (before and after)
    const sectorIndex = message.toLowerCase().indexOf(fallback.sector.toLowerCase())
    const contextStart = Math.max(0, sectorIndex - 50)
    const contextEnd = Math.min(message.length, sectorIndex + fallback.sector.length + 30)
    const context = message.substring(contextStart, contextEnd)
    const exactMatch = /\b(in|at|inside)\s+/i.test(context)

    if (proximityMatch) {
      fallback.spatialScope = 'PROXIMITY'
      fallback.radiusKm = 3.5
    } else if (exactMatch) {
      fallback.spatialScope = 'EXACT'
    }
  } else if (/\b(noida|greater\s+noida|yamuna\s+expressway)\b/i.test(message)) {
    // City-level query without sector
    fallback.spatialScope = 'BROAD'
  }

  return fallback
}
