// backend/src/lib/ai/intent.ts
import Groq from 'groq-sdk'
import OpenAI from 'openai'
import { z } from 'zod'
import { INTENT_EXTRACTION_PROMPT } from './prompts/index'
import type { Intent } from '../discovery'
import { MODELS } from '../config'
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
  const isFollowUpQuery = Boolean(
    previous.projectNames &&
    previous.projectNames.length === 1 &&
    !isSectorSwitch &&
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
    ...Object.fromEntries(Object.entries(update).filter(([, v]) => v !== undefined)),
    ...(spatialScope ? { spatialScope } : {}),
  } as Intent

  console.log('[INTENT:MERGE]', JSON.stringify({
    previous,
    update,
    freshProjectLookup,
    result,
  }))

  return result
}

/** Exported for unit testing only. Parses raw LLM JSON output into a merged Intent. */
export function parseIntentJson(raw: string, previous: Intent): Intent {
  // Empty or whitespace-only input returns previous unchanged
  if (!raw || !raw.trim()) {
    return previous
  }

  const match = raw.match(/\{[\s\S]*\}/)
  const str = match ? match[0] : '{}'
  try {
    const result = IntentSchema.safeParse(JSON.parse(str))
    if (!result.success) {
      console.warn('[intent] schema mismatch:', result.error.message)
      return previous
    }
    return mergeIntent(previous, result.data)
  } catch {
    return previous
  }
}

async function extractWithCerebras(msg: string, prev: Intent, apiKey: string): Promise<Intent> {
  const { completeWithCerebras } = await import('./cerebras')
  const raw = await completeWithCerebras(
    INTENT_EXTRACTION_PROMPT,
    `Previous intent: ${JSON.stringify(prev)}\n\nUser message: ${msg}`,
    apiKey
  )
  return parseIntentJson(raw, prev)
}

async function extractWithMistral(msg: string, prev: Intent, apiKey: string): Promise<Intent> {
  const { completeWithMistral } = await import('./mistral')
  const raw = await completeWithMistral(
    INTENT_EXTRACTION_PROMPT,
    `Previous intent: ${JSON.stringify(prev)}\n\nUser message: ${msg}`,
    apiKey
  )
  return parseIntentJson(raw, prev)
}

async function extractWithGroqKey(msg: string, prev: Intent, apiKey: string): Promise<Intent> {
  const groq = new Groq({ apiKey, timeout: 8000 })
  let raw = '{}'
  try {
    const completion = await groq.chat.completions.create({
      model: MODELS.GROQ_SMART,
      messages: [
        { role: 'system', content: INTENT_EXTRACTION_PROMPT },
        { role: 'user', content: `Previous intent: ${JSON.stringify(prev)}\n\nUser message: ${msg}` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 256,
      temperature: 0.1,
    })
    raw = completion.choices[0]?.message?.content ?? '{}'
  } catch (err: any) {
    if (err?.status === 429 || err?.message?.includes('rate_limit_exceeded') || err?.message?.includes('Rate limit reached')) {
      console.warn('[INTENT:GROQ] 70B rate limited, retrying intent with 8B instant model')
      const fallbackCompletion = await groq.chat.completions.create({
        model: MODELS.GROQ_FAST,
        messages: [
          { role: 'system', content: INTENT_EXTRACTION_PROMPT },
          { role: 'user', content: `Previous intent: ${JSON.stringify(prev)}\n\nUser message: ${msg}` },
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
  return parseIntentJson(raw, prev)
}

async function extractWithOpenAIKey(msg: string, prev: Intent, apiKey: string, signal: AbortSignal): Promise<Intent> {
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
        { role: 'user', content: `Previous intent: ${JSON.stringify(prev)}\n\nUser message: ${msg}` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 256,
      temperature: 0.1,
    },
    { signal },
  )
  const raw = completion.choices[0]?.message?.content ?? '{}'
  return parseIntentJson(raw, prev)
}

export interface IntentResult {
  intent: Intent
  /** True when all providers failed and previousIntent was returned as fallback. */
  degraded: boolean
}

import { FALLBACK_CHAIN } from '../config'
import { isKeyFailed, markKeyFailed } from './providerStatus'

import { GoogleGenAI } from '@google/genai'

export async function extractIntent(message: string, previousIntent: Intent): Promise<IntentResult> {
  // Intent extraction chain: prioritize Gemini Flash & fast, reliable models
  const intentChain = [
    // Tier 1: Gemini 2.5 Flash (Primary high-accuracy, lightning-fast)
    { provider: 'gemini' as const, envKey: 'GEMINI_API_KEY', model: MODELS.GEMINI_MAIN || 'gemini-2.5-flash', timeout: 3000 },
    // Tier 2: Mistral Small
    { provider: 'mistral' as const, envKey: 'MISTRAL_API_KEY', model: 'mistral-small-latest', timeout: 3000 },
    // Tier 3: Groq
    { provider: 'groq' as const, envKey: 'GROQ_API_KEY', model: MODELS.GROQ_SMART || 'llama-3.3-70b-versatile', timeout: 3000 },
    { provider: 'groq' as const, envKey: 'GROQ_API_KEY1', model: MODELS.GROQ_SMART || 'llama-3.3-70b-versatile', timeout: 3000 },
    // Tier 4: Cerebras
    { provider: 'cerebras' as const, envKey: 'CEREBRAS_API_KEY', model: 'llama3.3-70b', timeout: 3000 },
    // Tier 5: OpenAI (Fallback)
    { provider: 'openai' as const, envKey: 'OPENAI_API_KEY', model: MODELS.MAIN || 'gpt-4o', timeout: 2000 },
  ]

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
        const client = new GoogleGenAI({ apiKey, httpOptions: { timeout: config.timeout } })
        const res = await client.models.generateContent({
          model: config.model || 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: `Previous intent: ${JSON.stringify(previousIntent)}\n\nUser message: ${message}` }] }],
          config: {
            systemInstruction: INTENT_EXTRACTION_PROMPT,
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        })
        const raw = res.text?.trim() ?? '{}'
        const result = parseIntentJson(raw, previousIntent)
        if (result) return { intent: result, degraded: false }
      }
      if (config.provider === 'groq') {
        console.log(`[INTENT] Trying Groq (${config.model}) via ${config.envKey}`)
        const groq = new Groq({ apiKey, timeout: config.timeout })
        const completion = await groq.chat.completions.create({
          model: config.model,
          messages: [
            { role: 'system', content: INTENT_EXTRACTION_PROMPT },
            { role: 'user', content: `Previous intent: ${JSON.stringify(previousIntent)}\n\nUser message: ${message}` },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 256,
          temperature: 0.1,
        })
        const raw = completion.choices[0]?.message?.content ?? '{}'
        const result = parseIntentJson(raw, previousIntent)
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
        } catch (err: any) {
          clearTimeout(timer)
          if (err?.status === 404 || err?.status === 401 || err?.status === 403 || err?.name === 'AbortError' || (err?.message || '').includes('404')) {
            markKeyFailed(config.envKey)
          }
          throw err
        }
      }
    } catch (err: any) {
      console.warn(`[INTENT] ${config.provider}/${config.envKey} failed:`, err?.message || String(err))
    }
  }

  // All providers failed. Use heuristic pattern matching as last resort
  console.warn('[INTENT] All LLM providers failed or unconfigured — executing heuristic fallback')
  const heuristicIntent = extractIntentHeuristic(message, previousIntent)
  return { intent: heuristicIntent, degraded: true }
}

function extractIntentHeuristic(message: string, previousIntent: Intent): Intent {
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
