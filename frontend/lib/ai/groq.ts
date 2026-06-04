import Groq from 'groq-sdk'

if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is not set')
}

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export const GROQ_FAST = 'llama-3.1-8b-instant'
export const GROQ_SMART = 'llama-3.3-70b-versatile'

/** Safe JSON parse — strips markdown code fences if present */
export function safeJsonParse(text: string | null | undefined): Record<string, unknown> {
  if (!text) return {}
  try {
    const clean = text
      .replace(/^```json\s*/m, '')
      .replace(/^```\s*/m, '')
      .replace(/```\s*$/m, '')
      .trim()
    const result = JSON.parse(clean)
    return typeof result === 'object' && result !== null ? result : {}
  } catch {
    return {}
  }
}
