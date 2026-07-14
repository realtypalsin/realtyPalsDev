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

export async function generateContextualLLMChips(
  chatHistory: { role: string; content: string }[],
  priorityStart: number
): Promise<ChipAction[]> {
  try {
    const groq = getGroq()
    const historyText = chatHistory.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n')
    
    if (!historyText) return []

    const response = await groq.chat.completions.create({
      model: MODELS.GROQ_SMART, // e.g. llama3-8b-8192
      messages: [
        { role: 'system', content: CHIP_SYSTEM_PROMPT },
        { role: 'user', content: historyText }
      ],
      temperature: 0.5,
      response_format: { type: 'json_object' } // well, array isn't technically json_object but some models enforce { "chips": [] }. Let's use json_object with a fixed schema.
    })

    // To be safe with JSON_OBJECT, change prompt to output { "questions": ["..."] }
    // Let's parse it safely:
    const content = response.choices[0]?.message?.content || ''
    
    let questions: string[] = []
    try {
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) {
        questions = parsed
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        questions = parsed.questions
      }
    } catch (e) {
      console.error('[CHIPS:LLM] failed to parse JSON', content)
    }

    return questions.slice(0, 3).map((q, idx) => 
      chip(
        `llm_chip_${idx}`,
        'TEXT_MESSAGE',
        // eslint-disable-next-line no-misleading-character-class
        q.replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]+/g, '').trim(), // strip any emojis LLM might add
        '',
        { text: q },
        priorityStart + idx
      )
    )

  } catch (error) {
    console.error('[CHIPS:LLM] Error generating contextual chips', error)
    return []
  }
}
