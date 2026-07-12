/**
 * Builder Leads API
 * GET /api/builder/leads — list builder's leads
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { verifyUser } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  status: z.enum(['all', 'new', 'contacted', 'qualified', 'lost', 'converted', 'archived']).default('all'),
})

type BuilderLead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  lead_type: string;
  project_id: string | null;
  status: string;
  created_at: Date;
  contacted_at: Date | null;
  notes: string | null;
  // some leads might have follow_up_date depending on schema
  follow_up_date?: Date | null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parseResult = querySchema.safeParse(Object.fromEntries(searchParams.entries()))
    
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: parseResult.error.format() }, { status: 400 })
    }

    const { status } = parseResult.data

    // Get builder for this user via BuilderAccount
    const account = await prisma.builderAccount.findFirst({
      where: { user_id: userId },
      include: { builder: true }
    })

    if (!account?.builder) {
      return NextResponse.json({ error: 'Builder not found' }, { status: 404 })
    }

    const builder = account.builder

    const leads = await prisma.builderLead.findMany({
      where: {
        builder_id: builder.id,
        ...(status !== 'all' && { status })
      },
      orderBy: { created_at: 'desc' }
    }) as BuilderLead[]

    const projectIds = Array.from(new Set(leads.map(l => l.project_id).filter((id): id is string => id !== null)))
    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, name: true }
    })
    const projectMap = new Map<string, string>(projects.map(p => [p.id, p.name]))

    const formatted = leads.map(lead => ({
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      lead_type: lead.lead_type,
      project_id: lead.project_id,
      project_name: lead.project_id ? projectMap.get(lead.project_id) || 'Unknown' : 'General Inquiry',
      status: lead.status,
      created_at: lead.created_at,
      follow_up_date: lead.follow_up_date || lead.contacted_at,
      notes: lead.notes
    }))

    return NextResponse.json(formatted)
  } catch (err) {
    console.error('[API][GET /api/builder/leads] Failed to fetch leads:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching your leads. Please try again later.' },
      { status: 500 }
    )
  }
}
