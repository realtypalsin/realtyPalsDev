// backend/src/lib/ai/intent.ts
import Groq from 'groq-sdk'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { INTENT_EXTRACTION_PROMPT } from './prompts'
import type { Intent } from '../discovery'

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
})

function mergeIntent(previous: Intent, update: z.infer<typeof IntentSchema>): Intent {
  return {
    ...previous,
    ...Object.fromEntries(Object.entries(update).filter(([, v]) => v !== undefined)),
  } as Intent
}

function parseJson(raw: string, previous: Intent): Intent {
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
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: INTENT_EXTRACTION_PROMPT },
      { role: 'user', content: `Previous intent: ${JSON.stringify(prev)}\n\nUser message: ${msg}` },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 256,
    temperature: 0.1,
  })
  return parseJson(completion.choices[0]?.message?.content ?? '{}', prev)
}

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

export async function extractIntent(message: string, previousIntent: Intent): Promise<Intent> {
  if (process.env.GROQ_API_KEY) {
    try {
      return await extractWithGroq(message, previousIntent)
    } catch (err) {
      console.warn('[intent] Groq failed, trying Claude:', (err as Error).message)
    }
  }
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await extractWithClaude(message, previousIntent)
    } catch (err) {
      console.warn('[intent] Claude failed:', (err as Error).message)
    }
  }
  console.error('[intent] No AI keys set')
  return previousIntent
}
