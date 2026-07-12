// backend/src/lib/ai/intent.ts
import Groq from 'groq-sdk'
import OpenAI from 'openai'
// import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { INTENT_EXTRACTION_PROMPT } from './prompts/index'
import type { Intent } from '../discovery'
import { MODELS } from '../config'

const IntentSchema = z.object({
  bhk: z.array(z.number()).optional(),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  possession: z.enum(['immediate', '1year', '2year', '3year+']).optional(),
  sector: z.string().optional(),
  areaMin: z.number().optional(),
  areaMax: z.number().optional(),
  purpose: z.enum(['endUse', 'investment']).optional(),
  builderName: z.string().optional(),
  lifestyleKeywords: z.array(z.string()).optional(),
  projectNames: z.array(z.string()).optional(),
  riskProfile: z.enum(['nri', 'retiree', 'risk_averse', 'first_time_buyer']).optional(),
  is_comparison_query: z.boolean().optional(),
  legal_check: z.boolean().optional(),
})

export function mergeIntent(previous: Intent, update: z.infer<typeof IntentSchema>): Intent {
  // projectNames and is_comparison_query are per-turn signals — they reflect the
  // CURRENT message only. Never inherit from previous turns: a search query after a
  // comparison would otherwise see stale projectNames and wrongly enter comparison mode.
  const freshProjectLookup =
    (update.projectNames?.length ?? 0) > 0 && update.sector === undefined

  const result = {
    ...previous,
    projectNames: undefined,           // reset — only populated if this turn names projects
    is_comparison_query: undefined,    // reset — only populated if this turn is a compare request
    // Only clear sector/lifestyle if this is a TRULY fresh lookup (no prior context)
    ...(freshProjectLookup && !previous.sector ? { lifestyleKeywords: undefined } : {}),
    ...Object.fromEntries(Object.entries(update).filter(([, v]) => v !== undefined)),
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

async function extractWithGroq(msg: string, prev: Intent): Promise<Intent> {
  console.log('[INTENT] START extractWithGroq', Date.now())
  // 15s timeout — Groq is fast; this guards against unexpected Groq slowdowns.
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY!, timeout: 15000 })
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
  console.log('[INTENT] END extractWithGroq', Date.now())
  const raw = completion.choices[0]?.message?.content ?? '{}'
  return parseIntentJson(raw, prev)
}

// signal is the AbortSignal from the 8-second wall-clock in extractIntent.
// Passing it per-request wires it to the underlying fetch — including the body
// read — so aborting it terminates both header and body phases cleanly.
async function extractWithOpenAI(msg: string, prev: Intent, signal: AbortSignal): Promise<Intent> {
  console.log('[INTENT] START extractWithOpenAI', Date.now())
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://models.inference.ai.azure.com',
    // No SDK-level timeout — the external AbortSignal owns the wall-clock.
    // No retries — a retry would extend past our 8s budget; let Groq handle failures.
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
    // Per-request signal: threads through fetchWithTimeout AND response body read.
    // When the signal fires, both the fetch and any in-progress response.json() abort.
    { signal },
  )
  console.log('[INTENT] END extractWithOpenAI', Date.now())
  const raw = completion.choices[0]?.message?.content ?? '{}'
  return parseIntentJson(raw, prev)
}

/*
async function extractWithClaude(msg: string, prev: Intent): Promise<Intent> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system: INTENT_EXTRACTION_PROMPT,
    messages: [{ role: 'user', content: `Previous intent: ${JSON.stringify(prev)}\n\nUser message: ${msg}` }],
  })
  const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}'
  return parseJson(text, prev)
}
*/

export interface IntentResult {
  intent: Intent
  /** True when all providers failed and previousIntent was returned as fallback. */
  degraded: boolean
}

export async function extractIntent(message: string, previousIntent: Intent): Promise<IntentResult> {
  if (process.env.OPENAI_API_KEY) {
    // Hard wall-clock: 8 seconds from call to result, covering headers + body.
    // When the timer fires, the AbortController cancels the in-flight request
    // including any stalled body read. The catch block is guaranteed to execute.
    const controller = new AbortController()
    const timer = setTimeout(() => {
      console.warn('[intent] 8s wall-clock expired — aborting OpenAI, switching to Groq')
      controller.abort()
    }, 8000)

    try {
      console.log('[INTENT] trying OpenAI path', Date.now())
      const result = await extractWithOpenAI(message, previousIntent, controller.signal)
      console.log('[INTENT] OpenAI path succeeded', Date.now(), { result })
      clearTimeout(timer)
      return { intent: result, degraded: false }
    } catch (err) {
      clearTimeout(timer)
      console.warn('[intent] OpenAI failed, trying Groq:', (err as Error).message)
    }
  }

  if (process.env.GROQ_API_KEY) {
    try {
      console.log('[INTENT] trying Groq path', Date.now())
      const result = await extractWithGroq(message, previousIntent)
      console.log('[INTENT] Groq path succeeded', Date.now(), { result })
      return { intent: result, degraded: false }
    } catch (err) {
      console.warn('[intent] Groq failed:', (err as Error).message)
    }
  }

  console.error('[intent] all providers failed — returning previous intent (degraded)')
  return { intent: previousIntent, degraded: true }
}
