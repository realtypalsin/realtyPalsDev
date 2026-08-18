import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import Groq from 'groq-sdk'
import { getGroq } from '../groq'
import { MODELS, FALLBACK_CHAIN, type FallbackKeyConfig } from '../../config'
import type { ChipAction } from '../../discovery/conversationEngine'
import { chip } from '../../discovery/conversationEngine'

const CHIP_SYSTEM_PROMPT = `You are an elite conversation intent predictor and property discovery navigator for RealtyPals (Noida & Greater Noida real estate platform).
Based on the conversation history, generate exactly 3 highly relevant, high-conversion follow-up action chips.

CRITICAL RULES:
1. AT LEAST 1 TO 2 CHIPS MUST BE DIRECT PROPERTY DISCOVERY ACTIONS that lead the user to project cards (e.g. "Show projects in Sector 150", "View 3/4 BHK on Expressway", "Show ₹3 Cr properties in Central Noida", "Explore top RTM societies in Sector 75").
2. The other chip can be a strategic comparison, legal/RERA check, or financial breakdown (e.g. "Compare Sector 150 vs Central 7X", "What are the payment plans?", "Check builder track record").
3. Keep each question or action under 7 words.
4. Output ONLY a valid JSON object with a single key "questions" containing an array of 3 strings. No markdown, no markdown formatting, no explanations.

Example output:
{
  "questions": [
    "Show projects in Sector 150",
    "View 3 BHK in Central Noida",
    "Compare Sector 150 vs Sector 79"
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

import { completeWithCerebras } from '../cerebras'
import { completeWithMistral } from '../mistral'
import { beautifyResponse } from '../responseBeautifier'

async function tryProvider(item: FallbackKeyConfig, systemPrompt: string, historyText: string): Promise<string[]> {
  const apiKey = process.env[item.envKey]
  if (!apiKey) return []

  try {
    let raw = ''

    if (item.provider === 'cerebras') {
      raw = await completeWithCerebras(systemPrompt, historyText, apiKey)
    } else if (item.provider === 'groq') {
      const groq = new Groq({ apiKey, timeout: 6000 })
      const res = await groq.chat.completions.create({
        model: MODELS.GROQ_FAST,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: historyText },
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' },
      })
      raw = res.choices[0]?.message?.content?.trim() ?? ''
    } else if (item.provider === 'mistral') {
      raw = await completeWithMistral(systemPrompt, historyText, apiKey)
    } else if (item.provider === 'openai') {
      const client = new OpenAI({ apiKey, baseURL: 'https://models.inference.ai.azure.com', maxRetries: 0 })
      const res = await client.chat.completions.create({
        model: MODELS.OPENAI_FALLBACK,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: historyText },
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' },
      })
      raw = res.choices[0]?.message?.content?.trim() ?? ''
    } else if (item.provider === 'gemini') {
      const client = new GoogleGenAI({ apiKey })
      const res = await client.models.generateContent({
        model: MODELS.GEMINI_LITE,
        contents: [{ role: 'user', parts: [{ text: historyText }] }],
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.5,
          responseMimeType: 'application/json',
        },
      })
      raw = res.text?.trim() ?? ''
    }

    return parseChipQuestions(raw)
  } catch (error: unknown) {
    console.warn(`[CHIPS:LLM] Provider ${item.label} (${item.envKey}) failed:`, error instanceof Error ? error.message : String(error))
    return []
  }
}

export async function generateContextualLLMChips(
  chatHistory: { role: string; content: string }[] | null | undefined,
  priorityStart: number,
  preferredProvider?: { provider: string; envKey: string } // Provider that succeeded for main response
): Promise<ChipAction[]> {
  if (!chatHistory?.length) return []
  const historyText = chatHistory.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n')
  if (!historyText) return []

  let questions: string[] = []

  // Build chain with preferred provider first if specified
  let chainToUse = FALLBACK_CHAIN
  if (preferredProvider && preferredProvider.provider !== 'database') {
    const preferred = FALLBACK_CHAIN.find(c => c.provider === preferredProvider.provider && c.envKey === preferredProvider.envKey)
    if (preferred) {
      chainToUse = [preferred, ...FALLBACK_CHAIN.filter(c => c !== preferred)]
      console.log(`[CHIPS] Prioritizing provider affinity: ${preferred.label}`)
    }
  }

  for (const item of chainToUse) {
    const result = await tryProvider(item, CHIP_SYSTEM_PROMPT, historyText)
    if (result.length > 0) {
      questions = result
      break
    }
  }

  return questions.slice(0, 3).map((q, idx) => {
    const cleanQuestion = q.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim() // strip emojis
    const beautified = beautifyResponse(cleanQuestion).replace(/\.$/, '') // beautify, remove trailing period (chips don't need it)
    return chip(
      `llm_chip_${idx}`,
      'TEXT_MESSAGE',
      beautified,
      '',
      { text: beautified },
      priorityStart + idx
    )
  })
}
