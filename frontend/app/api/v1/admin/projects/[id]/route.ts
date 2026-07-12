import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { validateAdminToken } from '@/lib/adminToken'

const PatchSchema = z.object({
  name:              z.string().min(2).optional(),
  status:            z.enum(['under_construction', 'ready_to_move', 'new_launch']).optional(),
  tagline:           z.string().optional(),
  address:           z.string().optional(),
  lat:               z.number().optional(),
  lng:               z.number().optional(),
  rera_number:       z.string().optional(),
  rera_url:          z.string().optional(),
  total_units:       z.number().int().optional(),
  total_towers:      z.number().int().optional(),
  land_area_acres:   z.number().optional(),
  possession_label:  z.string().optional(),
  possession_date:   z.string().optional(),
  description:       z.string().optional(),
  long_description:  z.string().optional(),
  design_theme:      z.string().optional(),
  architect:         z.string().optional(),
  hero_image_url:    z.string().optional(),
  marketing_claims:  z.array(z.string()).optional(),
  ai_search_keywords: z.array(z.string()).optional(),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get('admin_token')?.value
  if (!await validateAdminToken(token)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      builder:      true,
      unit_types:   { orderBy: { bhk: 'asc' } },
      images:       { orderBy: { sort_order: 'asc' } },
      amenities:    true,
      connectivity: true,
    },
  })
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ project })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get('admin_token')?.value
  if (!await validateAdminToken(token)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const d = parsed.data
  const updated = await prisma.project.update({
    where: { id: params.id },
    data: {
      ...d,
      possession_date: d.possession_date ? new Date(d.possession_date) : undefined,
    },
  })
  return Response.json({ project: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get('admin_token')?.value
  if (!await validateAdminToken(token)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.project.delete({ where: { id: params.id } })
  return Response.json({ ok: true })
}
