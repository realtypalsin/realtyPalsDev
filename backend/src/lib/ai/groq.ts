// backend/src/lib/ai/groq.ts
import Groq from 'groq-sdk'

type Message = { role: 'system' | 'user' | 'assistant'; content: string }
type SendFn = (event: string, data: Record<string, unknown>) => void

export async function streamWithGroq(
  system: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  send: SendFn
): Promise<string> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

  const msgs: Message[] = [
    { role: 'system', content: system },
    ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ]

  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: msgs,
    stream: true,
    max_tokens: 1024,
    temperature: 0.7,
  })

  let fullText = ''
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content
    if (token) {
      fullText += token
      send('token', { token })
    }
  }
  return fullText
}
