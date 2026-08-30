// backend/src/lib/ai/mistral.ts
import OpenAI from 'openai'
import { recordUsage } from './cost'
import { createInactivityGuard, type InactivityGuard } from './streamTimeout'

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

  const startedAt = Date.now()
  console.log('[MISTRAL] START stream completion...')
  const msgs: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ]

  // Armed before create(), so a header stall and a mid-body stall share one
  // window. Aborting tears down the fetch and the SDK throws where it stands.
  // Explicitly typed: TypeScript only narrows on a never-returning call when the
  // reference carries a declared type, and guard.rethrow() never returns.
  const guard: InactivityGuard = createInactivityGuard('mistral')

  let stream
  try {
    stream = await client.chat.completions.create(
      {
        model: 'mistral-small-latest',
        messages: msgs,
        stream: true,
        // Without this the stream carries no usage at all, so a turn answered here
        stream_options: { include_usage: true },
        // From the turn's cost profile rather than a fixed 1024.
        max_tokens: maxTokens ?? 1024,
        temperature: 0.7,
      },
      { signal: guard.signal },
    )
  } catch (err) {
    guard.rethrow(err)
  }

  // Headers arrived — re-arm for the body phase.
  guard.reset()

  let fullText = ''
  let promptTokens = 0
  let completionTokens = 0
  try {
    for await (const chunk of stream) {
      // Each chunk resets the timer — only genuine silence aborts, so a slow
      // but progressing generation is never cut off mid-sentence.
      guard.reset()
      // The usage chunk arrives last and carries no choices.
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
      provider: 'mistral',
      model: 'mistral-small-latest',
      promptTokens,
      completionTokens,
      endpoint: 'chat',
      userId,
      sessionId,
    })
  }

  console.log(`[MISTRAL:SUCCESS] Stream complete (${fullText.length} chars in ${Date.now() - startedAt}ms)`)
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
