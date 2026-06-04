import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function getUserId(req: NextRequest): string | null {
  return req.headers.get('x-user-id')
}

export async function DELETE(request: NextRequest) {
  const userId = getUserId(request)
  if (!userId) return NextResponse.json({ error: 'X-User-Id header required' }, { status: 400 })

  await prisma.userMemory.deleteMany({ where: { user_id: userId } })
  const newSession = await prisma.chatSession.create({ data: { user_id: userId } })
  return NextResponse.json({ ok: true, session_id: newSession.id })
}
