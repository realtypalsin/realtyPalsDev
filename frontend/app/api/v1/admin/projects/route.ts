import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { validateAdminToken } from '@/lib/adminToken'

const ProjectSchema = z.object({
  name:             z.string().min(2),
  slug:             z.string().min(2),
  builder_id:       z.string().uuid(),
  sector:           z.string().min(1),
  city:             z.string().default('Noida'),
  status:           z.enum(['under_construction', 'ready_to_move', 'new_launch']),
  tagline:          z.string().optional(),
  address:          z.string().optional(),
  lat:              z.number().optional(),
  lng:              z.number().optional(),
  rera_number:      z.string().optional(),
  rera_url:         z.string().optional(),
  total_units:      z.number().int().optional(),
  total_towers:     z.number().int().optional(),
  land_area_acres:  z.number().optional(),
  possession_label: z.string().optional(),
  possession_date:  z.string().optional(),
  description:      z.string().optional(),
  long_description: z.string().optional(),
  design_theme:     z.string().optional(),
  architect:        z.string().optional(),
  hero_image_url:   z.string().optional(),
  marketing_claims: z.array(z.string()).optional(),
  ai_search_keywords: z.array(z.string()).optional(),
})

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!await validateAdminToken(token)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('q') ?? ''

  const projects = await prisma.project.findMany({
    where: search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { sector: { contains: search, mode: 'insensitive' } }] }
      : undefined,
    include: {
      builder:    { select: { id: true, name: true } },
      unit_types: { select: { id: true, bhk: true, price_min_cr: true, price_max_cr: true } },
      images:     { select: { id: true, url: true, type: true }, orderBy: { sort_order: 'asc' }, take: 3 },
    },
    orderBy: { name: 'asc' },
  })

  return Response.json({ projects })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!await validateAdminToken(token)) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const parsed = ProjectSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const d = parsed.data
  const project = await prisma.project.create({
    data: {
      name:              d.name,
      slug:              d.slug,
      builder_id:        d.builder_id,
      sector:            d.sector,
      city:              d.city,
      status:            d.status,
      tagline:           d.tagline,
      address:           d.address,
      lat:               d.lat,
      lng:               d.lng,
      rera_number:       d.rera_number,
      rera_url:          d.rera_url,
      total_units:       d.total_units,
      total_towers:      d.total_towers,
      land_area_acres:   d.land_area_acres,
      possession_label:  d.possession_label,
      possession_date:   d.possession_date ? new Date(d.possession_date) : undefined,
      description:       d.description,
      long_description:  d.long_description,
      design_theme:      d.design_theme,
      architect:         d.architect,
      hero_image_url:    d.hero_image_url,
      marketing_claims:  d.marketing_claims ?? [],
      ai_search_keywords: d.ai_search_keywords ?? [],
    },
  })
  return Response.json({ project }, { status: 201 })
}
