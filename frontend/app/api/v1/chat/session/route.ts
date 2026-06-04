import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const MAX_MESSAGES = 50

function getUserId(req: NextRequest): string | null {
  return req.headers.get('x-user-id')
}

function formatMessages(messages: Array<{ id: string; role: string; content: string; created_at: Date }>) {
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    created_at: m.created_at,
  }))
}

export async function GET(request: NextRequest) {
  const userId = getUserId(request)
  if (!userId) return NextResponse.json({ error: 'X-User-Id header required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const specificId = searchParams.get('id')

  if (specificId) {
    const session = await prisma.chatSession.findFirst({
      where: { id: specificId, user_id: userId },
      include: { messages: { orderBy: { created_at: 'asc' }, take: MAX_MESSAGES } },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({
      session_id: session.id,
      chat_phase: session.chat_phase ?? 'DISCOVERY',
      last_projects: session.last_projects ?? null,
      messages: formatMessages(session.messages as Parameters<typeof formatMessages>[0]),
    })
  }

  let session = await prisma.chatSession.findFirst({
    where: { user_id: userId },
    orderBy: { last_active: 'desc' },
    include: { messages: { orderBy: { created_at: 'asc' }, take: MAX_MESSAGES } },
  })

  if (!session) {
    session = await prisma.chatSession.create({
      data: { user_id: userId },
      include: { messages: { orderBy: { created_at: 'asc' }, take: MAX_MESSAGES } },
    })
  }

  return NextResponse.json({
    session_id: session.id,
    chat_phase: session.chat_phase ?? 'DISCOVERY',
    last_projects: session.last_projects ?? null,
    messages: formatMessages(session.messages as Parameters<typeof formatMessages>[0]),
  })
}
