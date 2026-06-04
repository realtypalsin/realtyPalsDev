import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { notifyLead } from '@/lib/leadNotify'

const BodySchema = z.object({
  name:         z.string().min(1).max(100).trim(),
  phone:        z.string().min(10).max(15).trim(),
  project_id:   z.string().uuid().optional(),
  project_slug: z.string().optional(),
  project_name: z.string().optional(),
  message:      z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  let rawBody: unknown
  try { rawBody = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const { name, phone, project_id, project_slug, project_name, message } = parsed.data

  try {
    // Reuse SiteVisitRequest with a sentinel time slot to avoid a new table
    await prisma.siteVisitRequest.create({
      data: {
        project_id:   project_id ?? 'callback',
        project_slug: project_slug ?? 'callback',
        project_name: project_name ?? 'General',
        name,
        phone,
        visit_date:   new Date(),
        time_slot:    '__callback__',
        message:      message ?? null,
        status:       'pending',
      },
    })

    console.log(`[callback] ✅ lead: ${name} ${phone} → ${project_name ?? 'general'}`)
    notifyLead({
      type: 'callback',
      name,
      phone,
      project_name: project_name ?? 'General',
      project_slug: project_slug ?? 'general',
      message: message ?? undefined,
      timestamp: new Date().toISOString(),
    }).catch(() => {})
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[callback] ❌', err)
    return NextResponse.json({ error: 'Failed to save callback request' }, { status: 500 })
  }
}
