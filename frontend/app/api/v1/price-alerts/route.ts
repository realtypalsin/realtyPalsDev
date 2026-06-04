import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const CreateSchema = z.object({
  project_id:      z.string().uuid(),
  project_slug:    z.string().min(1),
  target_price_cr: z.number().positive(),
  user_id:         z.string().optional(),
  guest_token:     z.string().optional(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const d = parsed.data
  const alert = await prisma.priceAlert.create({
    data: {
      project_id:      d.project_id,
      project_slug:    d.project_slug,
      target_price_cr: d.target_price_cr,
      user_id:         d.user_id,
      guest_token:     d.guest_token,
    },
  })

  return Response.json({ success: true, id: alert.id }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId      = req.headers.get('x-user-id')
  const user_id     = userId ?? searchParams.get('user_id')
  const guest_token = searchParams.get('guest_token')

  if (!user_id && !guest_token) {
    return Response.json({ error: 'user_id or guest_token required' }, { status: 400 })
  }

  const alerts = await prisma.priceAlert.findMany({
    where: {
      ...(user_id    ? { user_id }    : {}),
      ...(guest_token ? { guest_token } : {}),
      notified: false,
    },
    orderBy: { created_at: 'desc' },
  })

  return Response.json({ alerts })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })

  const userId = req.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'X-User-Id header required' }, { status: 401 })

  await prisma.priceAlert.delete({ where: { id, user_id: userId } })
  return Response.json({ success: true })
}
