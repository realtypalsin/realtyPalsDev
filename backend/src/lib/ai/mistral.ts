// backend/src/lib/ai/mistral.ts
import OpenAI from 'openai'

type Message = { role: 'user' | 'assistant'; content: string }
type SendFn = (event: string, data: Record<string, unknown>) => void

export async function streamWithMistral(
  systemPrompt: string,
  messages: Message[],
  send: SendFn,
  apiKeyOverride?: string,
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
