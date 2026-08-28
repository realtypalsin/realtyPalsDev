// backend/src/lib/ai/mistral.ts
import OpenAI from 'openai'
import { recordUsage } from './cost'

type Message = { role: 'user' | 'assistant'; content: string }
type SendFn = (event: string, data: Record<string, unknown>) => void

export async function streamWithMistral(
  systemPrompt: string,
  messages: Message[],
  send: SendFn,
  apiKeyOverride?: string,
  userId?: string | null,
  sessionId?: string | null,
  /** Reply ceiling for this turn, from the caller's inference profile. */
  maxTokens?: number
): Promise<string> {
  const apiKey = apiKeyOverride || process.env.MISTRAL_API_KEY
  if (!apiKey) throw new Error('MISTRAL_API_KEY is not configured')

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.mistral.ai/v1',
  })

  console.log('[MISTRAL] START stream completion...')
  const msgs: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ]

  const stream = await client.chat.completions.create({
    model: 'mistral-small-latest',
    messages: msgs,
    stream: true,
    // Without this the stream carries no usage at all, so a turn answered here
    // was invisible in ai_usage_events and read as $0.00 spend. 238 of 321
    // corpus queries were served by this leg and by Cerebras, and the cost
    // dashboard showed 16 billed queries.
    stream_options: { include_usage: true },
    // From the turn's cost profile rather than a fixed 1024. This is the cheap
    // leg — Mistral Small is roughly 5x cheaper per input token and 9x cheaper
    // per output token than Gemini Flash — but a head term still has no use for
    // a 1,024-token allowance, and a four-sector comparison is truncated by one.
    max_tokens: maxTokens ?? 1024,
    temperature: 0.7,
  })

  let fullText = ''
  let promptTokens = 0
  let completionTokens = 0
  for await (const chunk of stream) {
    // The usage chunk arrives last and carries no choices.
    if (chunk.usage) {
      promptTokens = chunk.usage.prompt_tokens ?? 0
      completionTokens = chunk.usage.completion_tokens ?? 0
    }
    const token = chunk.choices[0]?.delta?.content || ''
    if (token) {
      fullText += token
      send('token', { token })
    }
  }

  if (promptTokens > 0 || completionTokens > 0) {
    void recordUsage({
      provider: 'mistral',
      model: 'mistral-small-latest',
      promptTokens,
      completionTokens,
      endpoint: 'chat',
      userId,
      sessionId,
    })
  }

  console.log(`[MISTRAL:SUCCESS] Stream complete (${fullText.length} chars)`)
  return fullText
}

export async function completeWithMistral(
  systemPrompt: string,
  userMessage: string,
  apiKeyOverride?: string,
): Promise<string> {
  const apiKey = apiKeyOverride || process.env.MISTRAL_API_KEY
  if (!apiKey) throw new Error('MISTRAL_API_KEY is not configured')

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.mistral.ai/v1',
  })

  const res = await client.chat.completions.create({
    model: 'mistral-small-latest',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 512,
    temperature: 0.2,
  })

  return res.choices[0]?.message?.content?.trim() || ''
}
