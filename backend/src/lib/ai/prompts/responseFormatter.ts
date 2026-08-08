import type { ConversationMemory } from '../../discovery/types'

export function buildResponseFormatterPrompt(
  intentType: string,
  data: any[],
  confidence: number,
  memory: Partial<ConversationMemory>
): string {
  const basePrompt = `You are a real estate advisor formatting database information for a buyer.

USER CONTEXT:
- Budget: ₹${memory.user_budget_min_cr || '?'}-${memory.user_budget_max_cr || '?'} Crore
- Timeline: ${memory.user_timeline || 'Not specified'}
- Pain points: ${memory.user_pain_points?.join(', ') || 'Not specified'}
- Confidence in available data: ${confidence}%

RAW DATABASE DATA:
${JSON.stringify(data, null, 2)}

YOUR TASK:
`

  switch (intentType) {
    case 'PAYMENT_PLANS':
      return (
        basePrompt +
        `Format these payment plans as a decision framework (not a list).

For each plan, include:
1. Monthly EMI (with comparison to user's stated budget)
2. Total cost over lifetime
3. What this plan is best for
4. Key tradeoffs

Use decision framework language like:
"MINIMIZE UPFRONT: Plan X costs ₹Y down payment, ₹Z/month for 60 months"

End with: "Based on your budget of ₹${memory.user_budget_min_cr}-${memory.user_budget_max_cr}Cr, Plan X best fits your situation because..."

Output only the formatted response. No markdown, no code blocks. Plain text with clear sections.`
      )

    case 'COSTS':
      return (
        basePrompt +
        `Format this cost breakdown for clarity.

Include:
1. Base price per sqft
2. Total cost calculation (base + parking + IFMS + taxes)
3. What's included vs extra charges
4. Market comparison (how does this compare to nearby projects?)

Output only plain text. Use ₹ for currency. Organize as clear sections.`
      )

    case 'BUILDER_HISTORY':
      return (
        basePrompt +
        `Summarize this builder's track record as a narrative (not bullets).

Include:
1. Number of delivered projects (sample size context)
2. On-time delivery percentage
3. Average delay when late
4. Buyer satisfaction score
5. Confidence level: "High (${confidence}% confidence)" or "Moderate" based on confidence score

Example: "This builder delivered 7 projects, 95% on-time, with an average 2-month delay when late. High confidence (92%)."

Output only plain text narrative. No lists.`
      )

    case 'LOCATION':
      return (
        basePrompt +
        `Explain this location's advantages as decision factors.

Include:
1. Proximity to metros/stations (with commute times)
2. Schools, hospitals, shopping nearby
3. Future infrastructure catalysts
4. Walkability score

Format as: "This location offers X advantage for your lifestyle (mentioned: ${memory.user_pain_points?.join(', ')})."

Output only plain text.`
      )

    case 'POSSESSION_TIMELINE':
      return (
        basePrompt +
        `Explain possession timeline with confidence and risk flags.

Include:
1. Expected possession date + confidence level
2. OC status and what it means
3. Legal flags if any (litigation, RERA)
4. Typical delays in this sector
5. Mitigation: force majeure clause limits

Example: "Likely Q2 2027 (80% confidence). OC status: [obtained|pending]. Legal flags: 1 active litigation (common for this sector)."

Output only plain text.`
      )

    default:
      return basePrompt + `Format this data clearly and concisely for the buyer.`
  }
}

export async function formatDatabaseResponse(
  intentType: string,
  data: any[],
  confidence: number,
  memory: Partial<ConversationMemory>,
  llmClient: any
): Promise<string> {
  const prompt = buildResponseFormatterPrompt(intentType, data, confidence, memory)

  try {
    const response = await llmClient.chat.completions.create({
      model: 'gpt-4-mini',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    })

    return response.choices[0]?.message?.content || 'Unable to format response'
  } catch (error) {
    console.error('[ResponseFormatter] LLM call failed:', error)
    return `Data unavailable. Please contact our team for detailed information. ${JSON.stringify(data).slice(0, 200)}...`
  }
}
