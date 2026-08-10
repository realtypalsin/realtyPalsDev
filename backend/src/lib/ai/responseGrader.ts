/**
 * Phase 1: Response Grading Engine
 * Evaluates AI advisor responses against real buyer outcomes
 *
 * ⚠️ DB-SAFE: Creates records only. No deletions/truncations.
 */

import { prisma } from '../db'
import { streamWithOpenAI } from './openai'

export interface GradeResult {
  score: number // 0-100
  achieved: boolean // score >= 60?
  outcomes: string[] // ["saved", "callback_clicked", "question_asked"]
  reason: string
  shouldRetry: boolean
}

/**
 * Grade a response async (fire-and-forget after streaming)
 * Runs in background, doesn't block user
 */
export async function gradeResponseAsync(
  sessionId: string,
  messageId: string,
  userMessage: string,
  aiResponse: string,
  context: {
    propertiesShown?: number
    propertyNames?: string[]
    metrics?: Record<string, any>
  }
) {
  // Don't await — fire in background
  gradeResponseInternal(sessionId, messageId, userMessage, aiResponse, context).catch(
    (err) => {
      console.error(`[GRADER:ASYNC] Error grading message ${messageId}:`, err)
    }
  )
}

async function gradeResponseInternal(
  sessionId: string,
  messageId: string,
  userMessage: string,
  aiResponse: string,
  context: Record<string, any>
) {
  const gradePrompt = buildGradePrompt(userMessage, aiResponse, context)

  try {
    let result = ''

    await streamWithOpenAI(
      '',
      [
        {
          role: 'user',
          content: gradePrompt,
        },
      ],
      (event, data) => {
        if (event === 'text') result += data.text || ''
      },
      async () => ({}),
      { maxTokens: 200 }
    )

    const grade = parseGradeResponse(result)

    // Persist grade to DB
    await prisma.responseGrade.create({
      data: {
        session_id: sessionId,
        message_id: messageId,
        grade_score: grade.score,
        outcome_achieved: grade.achieved,
        outcomes: grade.outcomes,
        grading_reason: grade.reason,
        should_retry: grade.shouldRetry,
        graded_at: new Date(),
      },
    })

    console.log(`[GRADER:DONE] Session ${sessionId} msg ${messageId}: score=${grade.score}`)
  } catch (err) {
    // Non-fatal background analytics grading catch — silent
  }
}

function buildGradePrompt(userMsg: string, aiResp: string, ctx: Record<string, any>): string {
  return `You are an AI advisor quality grader for a real estate app.

User asked: "${userMsg}"

AI advisor responded:
${aiResp}

Context: ${JSON.stringify(ctx)}

Grade this response on:
1. Did it address the user's question directly?
2. Did it show properties (if relevant)?
3. Did it surface trade-offs and uncertainties?
4. Did it guide toward decision (save, callback, site visit)?

Respond ONLY with valid JSON, no markdown:
{
  "score": <0-100>,
  "achieved": <true if score >= 60>,
  "outcomes": ["saved" | "callback_clicked" | "question_asked" | "explored_comparison"],
  "reason": "<one sentence explanation>",
  "shouldRetry": <true only if score <40 and response seems rewritable>
}
`
}

function parseGradeResponse(text: string): GradeResult {
  try {
    // Extract JSON from response
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON found')

    const parsed = JSON.parse(match[0])
    return {
      score: Math.min(100, Math.max(0, parsed.score ?? 50)),
      achieved: parsed.achieved ?? parsed.score >= 60,
      outcomes: Array.isArray(parsed.outcomes) ? parsed.outcomes : [],
      reason: String(parsed.reason ?? 'Unknown'),
      shouldRetry: parsed.shouldRetry ?? false,
    }
  } catch (err) {
    console.error(`[GRADER:PARSE] Failed to parse grade response:`, err)
    return {
      score: 50,
      achieved: false,
      outcomes: [],
      reason: 'Parse error — using default score',
      shouldRetry: false,
    }
  }
}

/**
 * Fetch grade for a message (for analytics/monitoring)
 */
export async function getMessageGrade(messageId: string) {
  try {
    const grade = await prisma.responseGrade.findFirst({
      where: { message_id: messageId },
      orderBy: { created_at: 'desc' },
    })
    return grade
  } catch (err) {
    console.error(`[GRADER:GET] Error fetching grade:`, err)
    return null
  }
}

/**
 * Get session grade stats (avg score, outcome distribution)
 */
export async function getSessionGradeStats(sessionId: string) {
  try {
    const grades = await prisma.responseGrade.findMany({
      where: { session_id: sessionId },
    })

    if (!grades.length) return null

    const scores = grades.map((g) => g.grade_score ?? 0).filter((s) => s > 0)
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : 0

    const outcomes: Record<string, number> = {}
    grades.forEach((g) => {
      g.outcomes.forEach((outcome) => {
        outcomes[outcome] = (outcomes[outcome] ?? 0) + 1
      })
    })

    return {
      avg_score: avgScore,
      total_graded: grades.length,
      outcomes,
      last_grade: grades[grades.length - 1],
    }
  } catch (err) {
    console.error(`[GRADER:STATS] Error computing stats:`, err)
    return null
  }
}
