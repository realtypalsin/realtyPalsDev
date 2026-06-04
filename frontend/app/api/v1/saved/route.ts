import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { toProjectCard } from '@/lib/repositories/projectRepository'

function getUserId(req: NextRequest): string | null {
  return req.headers.get('x-user-id')
}

const SaveBodySchema = z.object({
  project_id: z.string(),
})

export async function GET(request: NextRequest) {
  const userId = getUserId(request)
  if (!userId) return NextResponse.json({ error: 'X-User-Id required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const limit  = Math.max(1, Math.min(100, parseInt(searchParams.get('limit')  ?? '20', 10) || 20))
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0',  10) || 0)

  try {
    const saved = await prisma.savedProperty.findMany({
      where: { user_id: userId },
      include: {
        project: {
          include: {
            builder: { select: { name: true, slug: true } },
            unit_types: { orderBy: { bhk: 'asc' } },
            amenities: true,
            connectivity: true,
            images: { orderBy: { sort_order: 'asc' } },
          },
        },
      },
      orderBy: { saved_at: 'desc' },
      take: limit,
      skip: offset,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projects = saved.map((s: any) => toProjectCard(s.project))
    return NextResponse.json({ projects, count: projects.length })
  } catch (err) {
    console.error('[GET /api/v1/saved]', err)
    return NextResponse.json({ error: 'Failed to fetch saved' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request)
  if (!userId) return NextResponse.json({ error: 'X-User-Id required' }, { status: 400 })

  let rawBody: unknown
  try { rawBody = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = SaveBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    await prisma.savedProperty.upsert({
      where: { user_id_project_id: { user_id: userId, project_id: parsed.data.project_id } },
      create: { user_id: userId, project_id: parsed.data.project_id },
      update: {},
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/v1/saved]', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
