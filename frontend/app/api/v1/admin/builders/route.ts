import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { validateAdminToken } from '@/lib/adminToken'

const BuilderSchema = z.object({
  name:               z.string().min(2),
  slug:               z.string().min(2),
  tagline:            z.string().optional(),
  description:        z.string().optional(),
  founded_year:       z.number().int().optional(),
  headquarters:       z.string().optional(),
  website:            z.string().optional(),
  credai_member:      z.boolean().optional(),
  delivered_units:    z.number().int().optional(),
  delivered_projects: z.array(z.string()).optional(),
  ongoing_projects:   z.array(z.string()).optional(),
  awards:             z.array(z.string()).optional(),
})

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!await validateAdminToken(token)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const builders = await prisma.builder.findMany({
    include: { _count: { select: { projects: true } } },
    orderBy: { name: 'asc' },
  })
  return Response.json({ builders })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!await validateAdminToken(token)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const parsed = BuilderSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const builder = await prisma.builder.create({ data: { ...parsed.data, delivered_projects: parsed.data.delivered_projects ?? [], ongoing_projects: parsed.data.ongoing_projects ?? [], awards: parsed.data.awards ?? [] } })
  return Response.json({ builder }, { status: 201 })
}
