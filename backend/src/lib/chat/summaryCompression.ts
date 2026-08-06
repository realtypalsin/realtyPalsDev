// backend/src/lib/chat/summaryCompression.ts
// Topic-separated compression: location, financial, timeline summaries

import Groq from 'groq-sdk'
import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import { MODELS } from '../config'

const COMPRESSION_THRESHOLD = 14
const KEEP_RECENT = 8
const MAX_SUMMARY_CHARS = 250

type Message = { role: 'user' | 'assistant'; content: string }

export interface TopicSummaries {
  location: string | null // sectors, geography, commute concerns
  financial: string | null // budget, price sensitivity, investment vs. personal
  timeline: string | null // possession urgency, construction tolerance, decision deadline
}

// Split compression into three topic-focused summaries
const COMPRESSION_PROMPTS = {
  location: `Summarize in 2-3 sentences focusing ONLY on:
- Sector preferences (Noida, Sector 10, etc.)
- Geography concerns (location, commute, proximity)
- Commute and connectivity needs
Ignore budget, timeline, and property characteristics.`,

  financial: `Summarize in 2-3 sentences focusing ONLY on:
- Budget range (minimum/maximum in crores)
- Price sensitivity and investment appetite
- Whether for personal use or investment
Ignore location, commute, and timeline.`,

  timeline: `Summarize in 2-3 sentences focusing ONLY on:
- Possession timeline and urgency (immediate, 6 months, 2+ years)
- Tolerance for construction delays
- Decision deadline
Ignore budget, location, and specific properties.`,
}

function sanitizeSummary(text: string): string {
  const cleaned = text.replace(/^#{1,6}\s+.*/gm, '').trim()
  return cleaned.length > MAX_SUMMARY_CHARS
    ? cleaned.slice(cleaned.length - MAX_SUMMARY_CHARS)
    : cleaned
}

async function compressTopic(
  messages: Message[],
  topic: 'location' | 'financial' | 'timeline'
): Promise<string | null> {
  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY) {
    return null
  }

  const context = messages.map((m) => `${m.role}: ${m.content}`).join('\n')
  const prompt = COMPRESSION_PROMPTS[topic]

  try {
    if (process.env.GEMINI_API_KEY) {
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
      const res = await client.models.generateContent({
        model: MODELS.GEMINI_LITE,
        contents: [{ role: 'user', parts: [{ text: context }] }],
        config: {
          systemInstruction: prompt,
          maxOutputTokens: 120,
          temperature: 0.1,
        },
      })
      return sanitizeSummary(res.text?.trim() ?? '')
    }
  } catch (err) {
    console.warn(`[compression] Gemini failed for ${topic}:`, (err as Error).message)
  }

  try {
    if (process.env.OPENAI_API_KEY) {
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: 'https://models.inference.ai.azure.com',
      })
      const res = await client.chat.completions.create({
        model: MODELS.FALLBACK,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: context },
        ],
        max_tokens: 120,
        temperature: 0.1,
      })
      return sanitizeSummary(res.choices[0]?.message?.content?.trim() ?? '')
    }
  } catch (err) {
    console.warn(`[compression] OpenAI failed for ${topic}:`, (err as Error).message)
  }

  try {
    if (process.env.GROQ_API_KEY) {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
      const res = await groq.chat.completions.create({
        model: MODELS.GROQ_SMART,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: context },
        ],
        max_tokens: 120,
        temperature: 0.1,
      })
      return sanitizeSummary(res.choices[0]?.message?.content?.trim() ?? '')
    }
  } catch (err) {
    console.warn(`[compression] Groq failed for ${topic}:`, (err as Error).message)
  }

  return null
}

export async function maybeCompressTopical(
  messages: Message[],
  existingSummaries?: TopicSummaries | null
): Promise<{ messages: Message[]; newSummaries: TopicSummaries | null }> {
  if (messages.length <= COMPRESSION_THRESHOLD) {
    return { messages, newSummaries: null }
  }

  const toCompress = messages.slice(0, messages.length - KEEP_RECENT)

  // Compress all three topics in parallel
  const [locSummary, finSummary, timeSummary] = await Promise.all([
    compressTopic(toCompress, 'location'),
    compressTopic(toCompress, 'financial'),
    compressTopic(toCompress, 'timeline'),
  ])

  const newSummaries: TopicSummaries = {
    location: locSummary || existingSummaries?.location || null,
    financial: finSummary || existingSummaries?.financial || null,
    timeline: timeSummary || existingSummaries?.timeline || null,
  }

  const recent = messages.slice(messages.length - KEEP_RECENT)
  return { messages: recent, newSummaries }
}
