import { getGroq } from '../groq'
import { MODELS } from '../../config'
import type { ChipAction } from '../../discovery/conversationEngine'
import { chip } from '../../discovery/conversationEngine'
import { prisma } from '../db'

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
      model: MODELS.GROQ_FAST, // e.g. llama3-8b-8192
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

export async function generateProseEntityChips(prose: string): Promise<ChipAction[]> {
  try {
    if (!prose || prose.length < 10) return []

    const chips: ChipAction[] = []
    const proseL = prose.toLowerCase()

    // Extract sector mentions (e.g., "Sector 75", "sector 62")
    const sectorMatches = prose.match(/sector\s+(\d+)/gi) || []
    const sectors = [...new Set(sectorMatches.map(m => m.replace(/sector\s+/i, '').trim()))]

    for (const sector of sectors.slice(0, 2)) {
      const projects = await prisma.project.findMany({
        where: { sector: sector },
        take: 2,
        select: { id: true, name: true }
      })

      if (projects.length > 0) {
        const pIds = projects.map(p => p.id).join(':')
        chips.push(
          chip(
            `prose_sector_${sector}`,
            'TEXT_MESSAGE',
            `Explore properties in Sector ${sector}`,
            '📍',
            { actionPrefix: 'Show me projects in', projects: projects.map(p => ({ id: p.id, name: p.name })) },
            chips.length + 1
          )
        )
      }
    }

    // Extract project names (simple heuristic: capitalized multi-word phrases)
    const projectMatches = prose.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) || []
    const potentialNames = [...new Set(projectMatches)].slice(0, 3)

    for (const name of potentialNames) {
      const projects = await prisma.project.findMany({
        where: { name: { contains: name, mode: 'insensitive' } },
        take: 1,
        select: { id: true, name: true }
      })

      if (projects.length > 0) {
        const project = projects[0]
        chips.push(
          chip(
            `prose_project_${project.id}`,
            'TEXT_MESSAGE',
            `Learn more about ${project.name}`,
            '🏢',
            { actionPrefix: 'Tell me about', projects: [{ id: project.id, name: project.name }] },
            chips.length + 1
          )
        )
      }
    }

    return chips.slice(0, 2)
  } catch (error) {
    console.error('[CHIPS:PROSE] Error generating prose entity chips', error)
    return []
  }
}
