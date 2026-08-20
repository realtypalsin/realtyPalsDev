import { GoogleGenerativeAI } from '@google/generative-ai'
import { env } from './env'
import { MODELS } from './config'

export interface BuyerNarrative {
  summary: string
  decisionBlocker: string
  recommendedActions: Array<{
    type: string
    reason: string
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
  }>
}

export async function generateBuyerNarrative(messages: any[]): Promise<BuyerNarrative | null> {
  try {
    if (!env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not set, skipping narrative generation')
      return null
    }

    const client = new GoogleGenerativeAI(env.GEMINI_API_KEY)
    const model = client.getGenerativeModel({ model: MODELS.GEMINI_LITE || 'gemini-3.5-flash-lite' })

    const transcript = messages
      .map(
        (m) =>
          `${m.role === 'user' ? 'Buyer' : 'Assistant'}: ${m.content}`
      )
      .join('\n')

    const prompt = `Analyze this real estate buyer conversation and create a brief narrative profile.

Conversation:
${transcript.substring(0, 3000)} ${transcript.length > 3000 ? '...(truncated)' : ''}

Generate a JSON response with:
1. "summary" (2-3 sentences): Who is this buyer and what are they looking for?
2. "decisionBlocker" (1 sentence): What's preventing them from moving forward?
3. "recommendedActions" (array of 2-3 items):
   - "type": One of: 'send_payment_plan', 'send_finance_preapproval', 'show_construction_proof', 'show_commute_data', 'rera_clarity', 'contact_now'
   - "reason": Why this action fits this buyer
   - "priority": 'HIGH', 'MEDIUM', or 'LOW'

Respond ONLY with valid JSON (no markdown, no extra text).`

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    // Parse JSON from response
    const json = JSON.parse(text)

    return {
      summary: json.summary || '',
      decisionBlocker: json.decisionBlocker || '',
      recommendedActions: (json.recommendedActions || []).slice(0, 3),
    }
  } catch (err) {
    console.error('[buyerNarrative:generate] error:', err)
    return null
  }
}

export function rankRecommendedActions(
  narrative: BuyerNarrative,
  objectionCount: number,
  messagingQuality: number
): BuyerNarrative {
  // Sort by priority: HIGH first, then MEDIUM, then LOW
  const sortedActions = [...narrative.recommendedActions].sort((a, b) => {
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  return {
    ...narrative,
    recommendedActions: sortedActions,
  }
}
