import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { notifyLead } from '@/lib/leadNotify'
import { validateAdminToken } from '@/lib/adminToken'

const Schema = z.object({
  project_id:   z.string().uuid(),
  project_slug: z.string().min(1),
  project_name: z.string().min(1),
  name:         z.string().min(2),
  phone:        z.string().regex(/^[+\d\s-]{8,15}$/, 'Invalid phone'),
  email:        z.string().email().optional(),
  visit_date:   z.string().min(8),
  time_slot:    z.string().min(1),
  message:      z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const d = parsed.data
  let visit: { id: string }
  try {
    visit = await prisma.siteVisitRequest.create({
      data: {
        project_id:   d.project_id,
        project_slug: d.project_slug,
        project_name: d.project_name,
        name:         d.name,
        phone:        d.phone,
        email:        d.email,
        visit_date:   new Date(d.visit_date),
        time_slot:    d.time_slot,
        message:      d.message,
      },
    })
  } catch (err) {
    console.error('[site-visit] ❌ DB create failed:', err)
    return Response.json({ error: 'Failed to save site visit request. Please try again.' }, { status: 500 })
  }

  notifyLead({
    type: 'site_visit',
    name: d.name,
    phone: d.phone,
    project_name: d.project_name,
    project_slug: d.project_slug,
    visit_date: d.visit_date,
    time_slot: d.time_slot,
    message: d.message ?? undefined,
    timestamp: new Date().toISOString(),
  }).catch(() => {})
  return Response.json({ success: true, id: visit.id }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const adminToken = req.cookies.get('admin_token')?.value
  const isValid = await validateAdminToken(adminToken)
  if (!isValid) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  if (!slug) return Response.json({ error: 'slug required' }, { status: 400 })

  let visits: { visit_date: Date; time_slot: string; status: string }[]
  try {
    visits = await prisma.siteVisitRequest.findMany({
      where: { project_slug: slug },
      orderBy: { visit_date: 'asc' },
      select: { visit_date: true, time_slot: true, status: true },
    })
  } catch (err) {
    console.error('[site-visit GET] ❌', err)
    return Response.json({ error: 'Failed to fetch visits' }, { status: 500 })
  }
  return Response.json({ visits })
}
