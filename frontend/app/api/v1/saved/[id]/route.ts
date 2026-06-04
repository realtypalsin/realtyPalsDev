import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function getUserId(req: NextRequest): string | null {
  return req.headers.get('x-user-id')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = getUserId(request)
  if (!userId) return NextResponse.json({ error: 'X-User-Id required' }, { status: 400 })

  await prisma.savedProperty.deleteMany({
    where: { user_id: userId, project_id: params.id },
  })
  return NextResponse.json({ ok: true })
}
