// backend/src/lib/ai/compression.ts
import Groq from 'groq-sdk'

const COMPRESSION_THRESHOLD = 14
const KEEP_RECENT = 8

const COMPRESSION_PROMPT = `Summarize this conversation in 3-4 sentences. Focus on:
1. What property criteria the user mentioned (BHK, budget, sector, timeline)
2. Any properties they reacted to positively or negatively
3. Any decisions or preferences expressed
Be factual, no filler. This summary replaces the full history for context efficiency.`

type Message = { role: 'user' | 'assistant'; content: string }

export async function maybeCompress(
  messages: Message[],
  existingSummary?: string | null
): Promise<{ messages: Message[]; newSummary: string | null }> {
  if (messages.length <= COMPRESSION_THRESHOLD) {
    return { messages, newSummary: null }
  }

  const toCompress = messages.slice(0, messages.length - KEEP_RECENT)
  const recent = messages.slice(messages.length - KEEP_RECENT)

  if (!process.env.GROQ_API_KEY) {
    return { messages: recent, newSummary: existingSummary ?? null }
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const context = toCompress.map((m) => `${m.role}: ${m.content}`).join('\n')
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: COMPRESSION_PROMPT },
        { role: 'user', content: context },
      ],
      max_tokens: 256,
      temperature: 0.1,
    })
    const summary = res.choices[0]?.message?.content?.trim() ?? ''
    const combined = existingSummary ? `${existingSummary}\n\n${summary}` : summary
    return { messages: recent, newSummary: combined }
  } catch {
    return { messages: recent, newSummary: existingSummary ?? null }
  }
}
