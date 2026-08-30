// backend/src/lib/ai/cerebras.ts
import OpenAI from 'openai'
import { recordUsage } from './cost'
import { createInactivityGuard, type InactivityGuard } from './streamTimeout'

type Message = { role: 'user' | 'assistant'; content: string }
type SendFn = (event: string, data: Record<string, unknown>) => void

export async function streamWithCerebras(
  systemPrompt: string,
  messages: Message[],
  send: SendFn,
  apiKeyOverride?: string,
  modelOverride?: string,
  userId?: string | null,
  sessionId?: string | null,
  /** Reply ceiling for this turn, from the caller's inference profile. */
  maxTokens?: number
): Promise<string> {
  const apiKey = apiKeyOverride || process.env.CEREBRAS_API_KEY
  if (!apiKey) throw new Error('CEREBRAS_API_KEY is not configured')

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.cerebras.ai/v1',
  })

  console.log('[CEREBRAS] START stream completion...')
  const msgs: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ]

  const model = modelOverride || 'llama-3.3-70b'

  // See mistral.ts: armed before create() so a header stall and a mid-body
  // stall share one window. Explicitly typed so rethrow()'s never return narrows.
  const guard: InactivityGuard = createInactivityGuard('cerebras')

  let stream
  try {
    stream = await client.chat.completions.create(
      {
        model,
        messages: msgs,
        stream: true,
        // See the note in mistral.ts: without usage in the stream this leg bills
        // nothing into ai_usage_events and reads as free traffic.
        stream_options: { include_usage: true },
        // See mistral.ts: the reply ceiling comes from the turn's cost profile.
        max_tokens: maxTokens ?? 1024,
        temperature: 0.7,
      },
      { signal: guard.signal },
    )
  } catch (err) {
    guard.rethrow(err)
  }

  guard.reset()

  let fullText = ''
  let promptTokens = 0
  let completionTokens = 0
  try {
    for await (const chunk of stream) {
      guard.reset()
      if (chunk.usage) {
        promptTokens = chunk.usage.prompt_tokens ?? 0
        completionTokens = chunk.usage.completion_tokens ?? 0
      }
      const token = chunk.choices[0]?.delta?.content || ''
      if (token) {
        fullText += token
        guard.markTokenSent()
        send('token', { token })
      }
    }
  } catch (err) {
    guard.rethrow(err)
  }
  guard.clear()

  if (promptTokens > 0 || completionTokens > 0) {
    void recordUsage({
      provider: 'cerebras',
      model,
      promptTokens,
      completionTokens,
      endpoint: 'chat',
      userId,
      sessionId,
    })
  }

  console.log(`[CEREBRAS:SUCCESS] Stream complete (${fullText.length} chars)`)
  return fullText
}

export async function completeWithCerebras(
  systemPrompt: string,
  userMessage: string,
  apiKeyOverride?: string,
): Promise<string> {
  const apiKey = apiKeyOverride || process.env.CEREBRAS_API_KEY
  if (!apiKey) throw new Error('CEREBRAS_API_KEY is not configured')

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.cerebras.ai/v1',
  })

  const res = await client.chat.completions.create({
    model: 'gpt-oss-120b',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 512,
    temperature: 0.2,
  })

  return res.choices[0]?.message?.content?.trim() || ''
}
