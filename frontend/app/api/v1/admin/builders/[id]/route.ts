import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { validateAdminToken } from '@/lib/adminToken'

const PatchSchema = z.object({
  name:          z.string().min(2).optional(),
  slug:          z.string().min(2).optional(),
  founded_year:  z.number().int().nullable().optional(),
  headquarters:  z.string().nullable().optional(),
  website:       z.string().nullable().optional(),
  credai_member: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get('admin_token')?.value
  if (!await validateAdminToken(token)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body   = await req.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const builder = await prisma.builder.update({
    where: { id: params.id },
    data:  parsed.data,
  })
  return Response.json({ builder })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get('admin_token')?.value
  if (!await validateAdminToken(token)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.builder.delete({ where: { id: params.id } })
  return Response.json({ ok: true })
}
