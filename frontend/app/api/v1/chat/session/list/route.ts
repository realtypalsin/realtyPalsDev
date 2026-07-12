import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCached, setCached, makeKey } from '@/lib/redis'

const SESSION_LIST_TTL = 30 // seconds

function getUserId(req: NextRequest): string | null {
  return req.headers.get('x-user-id')
}

export async function GET(request: NextRequest) {
  const userId = getUserId(request)
  if (!userId) return NextResponse.json({ error: 'X-User-Id header required' }, { status: 400 })

  const cacheKey = makeKey('sessions', 'list', userId)

  try {
    const cached = await getCached<{ id: string; label: string; last_active: string }[]>(cacheKey)
    if (cached) {
      return NextResponse.json({ sessions: cached })
    }

    const sessions = await prisma.chatSession.findMany({
      where: { user_id: userId },
      orderBy: { last_active: 'desc' },
      take: 10,
      select: { id: true, title: true, last_active: true },
    })

    const result = sessions.map((s: any) => ({
      id: s.id,
      label: s.title ??
        `Chat ${new Date(s.last_active).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
      last_active: s.last_active,
    }))

    await setCached(cacheKey, result, SESSION_LIST_TTL)

    return NextResponse.json({ sessions: result })
  } catch {
    return NextResponse.json({ sessions: [] })
  }
}
