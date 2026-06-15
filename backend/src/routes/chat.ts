// backend/src/routes/chat.ts
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { checkRateLimit } from '../lib/redis'
import { extractIntent } from '../lib/ai/intent'
import { getIntentState, discoverProjects } from '../lib/discovery'
import { getMemory, upsertMemory } from '../lib/ai/memory'
import { buildContextMessages } from '../lib/ai/context'
import { maybeCompress } from '../lib/ai/compression'
import { buildAdvisorSystemPrompt } from '../lib/ai/prompts'
import { streamWithGroq } from '../lib/ai/groq'
import { streamWithClaude } from '../lib/ai/claude'

const router = Router()

const BodySchema = z.object({
  message: z.string().min(1).max(2000).trim(),
  sessionId: z.string().uuid().optional(),
  guestToken: z.string().optional(),
  intent: z.record(z.unknown()).optional(),
})

function sseWrite(res: Response, event: string, data: Record<string, unknown>): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

router.post('/', async (req: Request, res: Response) => {
  const parsed = BodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' })
    return
  }

  const { message, sessionId, guestToken } = parsed.data
  const prevIntent = (parsed.data.intent ?? {}) as Record<string, unknown>
  const userId = req.headers['x-user-id'] as string | undefined

  if (!userId && !guestToken) {
    res.status(400).json({ error: 'x-user-id header or guestToken body field required' })
    return
  }

  const rlKey = userId ?? guestToken!
  const { allowed, remaining } = await checkRateLimit(rlKey)
  if (!allowed) {
    res.status(429).json({ error: 'Too many messages. Please wait a moment.' })
    return
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.setHeader('X-RateLimit-Remaining', String(remaining))
  res.flushHeaders()

  const send = (event: string, data: Record<string, unknown>) => sseWrite(res, event, data)

  try {
    const [intent, memory] = await Promise.all([
      extractIntent(message, prevIntent as Parameters<typeof extractIntent>[1]),
      getMemory(userId, guestToken),
    ])

    const intentState = getIntentState(intent)
    send('intent', { intent, intentState })

    let projects: Awaited<ReturnType<typeof discoverProjects>> = []
    if (intentState === 'READY_TO_SEARCH' || intentState === 'SHORTLISTED') {
      projects = await discoverProjects(intent)
      if (projects.length > 0) send('properties', { projects })
    }

    let chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
    let existingSummary: string | null = null
    let currentSessionId = sessionId

    if (sessionId) {
      const session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        include: {
          messages: { orderBy: { created_at: 'asc' }, select: { role: true, content: true } },
        },
      })
      if (session) {
        existingSummary = session.summary ?? null
        chatHistory = session.messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
      }
    }

    const { messages: compressedHistory, newSummary } = await maybeCompress(chatHistory, existingSummary)
    const { systemSuffix, messages } = buildContextMessages(message, compressedHistory, newSummary ?? existingSummary, memory)
    const systemPrompt = buildAdvisorSystemPrompt(intent, projects, memory) + systemSuffix

    let fullText = ''
    if (process.env.GROQ_API_KEY) {
      try {
        fullText = await streamWithGroq(systemPrompt, messages, send)
      } catch (err) {
        console.warn('[chat] Groq stream failed, falling back to Claude:', (err as Error).message)
        if (process.env.ANTHROPIC_API_KEY) {
          fullText = await streamWithClaude(systemPrompt, messages, send)
        } else {
          throw err
        }
      }
    } else if (process.env.ANTHROPIC_API_KEY) {
      fullText = await streamWithClaude(systemPrompt, messages, send)
    } else {
      throw new Error('No AI API keys configured')
    }

    const persistPromises: Promise<unknown>[] = []

    if (!currentSessionId) {
      const session = await prisma.chatSession.create({
        data: {
          ...(userId ? { user_id: userId } : { guest_token: guestToken }),
          title: message.slice(0, 60),
          chat_phase: intentState,
          message_count: 2,
          ...(newSummary ? { summary: newSummary } : {}),
        },
      })
      currentSessionId = session.id
    } else {
      persistPromises.push(
        prisma.chatSession.update({
          where: { id: currentSessionId },
          data: {
            chat_phase: intentState,
            message_count: { increment: 2 },
            ...(newSummary ? { summary: newSummary } : {}),
            ...(projects.length > 0 ? { last_projects: projects as unknown as Parameters<typeof prisma.chatSession.update>[0]['data']['last_projects'] } : {}),
          },
        })
      )
    }

    persistPromises.push(
      prisma.chatMessage.createMany({
        data: [
          {
            session_id: currentSessionId!,
            role: 'user',
            content: message,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            intent_snapshot: intent as any,
          },
          {
            session_id: currentSessionId!,
            role: 'assistant',
            content: fullText || '[streamed]',
          },
        ],
      })
    )

    if (projects.length > 0) {
      persistPromises.push(
        upsertMemory(userId, guestToken, intent, projects.map((p) => p.slug))
      )
    }

    send('done', { sessionId: currentSessionId, intentState })

    await Promise.all(persistPromises).catch((e) => console.error('[chat] persist error:', e))
  } catch (err) {
    console.error('[chat] error:', err)
    send('error', { message: "I'm having trouble right now. Please try again in a moment." })
  } finally {
    res.end()
  }
})

export default router
