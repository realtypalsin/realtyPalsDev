// backend/src/lib/ai/cerebras.ts
import OpenAI from 'openai'

type Message = { role: 'user' | 'assistant'; content: string }
type SendFn = (event: string, data: Record<string, unknown>) => void

export async function streamWithCerebras(
  systemPrompt: string,
  messages: Message[],
  send: SendFn,
  apiKeyOverride?: string,
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

  const stream = await client.chat.completions.create({
    model: 'gpt-oss-120b',
    messages: msgs,
    stream: true,
    max_tokens: 1024,
    temperature: 0.7,
  })

  let fullText = ''
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content || ''
    if (token) {
      fullText += token
      send('token', { token })
    }
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
