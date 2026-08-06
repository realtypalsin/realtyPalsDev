import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import { getGroq } from '../groq'
import { MODELS } from '../../config'
import type { ChipAction } from '../../discovery/conversationEngine'
import { chip } from '../../discovery/conversationEngine'

const CHIP_SYSTEM_PROMPT = `You are a conversation intent predictor for a real estate assistant.
Based on the conversation history, predict exactly 3 short, natural follow-up questions the user might want to ask next.

CRITICAL RULES:
1. Do NOT suggest questions about topics already discussed in the conversation history.
2. Keep each question under 8 words.
3. Make them conversational and direct (e.g., "What are the payment plans?", "Tell me about the builder's track record", "Is it RERA registered?").
4. Output ONLY a valid JSON object with a single key "questions" containing an array of strings. No markdown, no introductory text.

Example output:
{
  "questions": [
    "What is the exact location?",
    "Are there any legal risks?",
    "Show me the floor plans."
  ]
}
`

function parseChipQuestions(content: string): string[] {
  if (!content) return []
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) return parsed
    if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions
  } catch (e) {
    console.error('[CHIPS:LLM] failed to parse JSON', content)
  }
  return []
}

async function tryGemini(systemPrompt: string, historyText: string): Promise<string[]> {
  if (!process.env.GEMINI_API_KEY) return []
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const res = await client.models.generateContent({
    model: MODELS.GEMINI_LITE,
    contents: [{ role: 'user', parts: [{ text: historyText }] }],
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.5,
      responseMimeType: 'application/json',
    },
  })
  return parseChipQuestions(res.text?.trim() ?? '')
}

async function tryOpenAI(systemPrompt: string, historyText: string): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY) return []
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://models.inference.ai.azure.com',
  })
  const res = await client.chat.completions.create({
    model: MODELS.OPENAI_FALLBACK,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: historyText },
    ],
    temperature: 0.5,
    response_format: { type: 'json_object' },
  })
  return parseChipQuestions(res.choices[0]?.message?.content?.trim() ?? '')
}

async function tryGroq(systemPrompt: string, historyText: string): Promise<string[]> {
  if (!process.env.GROQ_API_KEY) return []
  const groq = getGroq()
  const res = await groq.chat.completions.create({
    model: MODELS.GROQ_FAST,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: historyText },
    ],
    temperature: 0.5,
    response_format: { type: 'json_object' },
  })
  return parseChipQuestions(res.choices[0]?.message?.content?.trim() ?? '')
}

export async function generateContextualLLMChips(
  chatHistory: { role: string; content: string }[],
  priorityStart: number
): Promise<ChipAction[]> {
  const historyText = chatHistory.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n')
  if (!historyText) return []

  let questions: string[] = []
  for (const attempt of [tryGemini, tryOpenAI, tryGroq]) {
    try {
      questions = await attempt(CHIP_SYSTEM_PROMPT, historyText)
      if (questions.length > 0) break
    } catch (error: any) {
      const msg = error?.message || error?.status || 'API call error'
      console.warn(`[CHIPS:LLM] ${attempt.name} provider unavailable (${msg}), trying next provider...`)
    }
  }

  return questions.slice(0, 3).map((q, idx) =>
    chip(
      `llm_chip_${idx}`,
      'TEXT_MESSAGE',
      q.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim(), // strip any emojis LLM might add
      '',
      { text: q },
      priorityStart + idx
    )
  )
}
