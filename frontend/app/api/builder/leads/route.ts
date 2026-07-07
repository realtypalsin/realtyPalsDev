/**
 * Builder Leads API
 * GET /api/builder/leads — list builder's leads
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const status = request.nextUrl.searchParams.get('status') || 'all'

    // Get builder for this user via BuilderAccount
    const account = await prisma.builderAccount.findUnique({
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
      orderBy: { created_at: 'desc' },
      include: {
        project: {
          select: { name: true }
        }
      }
    })

    const formatted = leads.map(lead => ({
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      lead_type: lead.lead_type,
      project_id: lead.project_id,
      project_name: lead.project?.name || 'Unknown',
      status: lead.status,
      created_at: lead.created_at,
      follow_up_date: lead.follow_up_date,
      notes: lead.notes
    }))

    return NextResponse.json(formatted)
  } catch (err) {
    console.error('[API] Failed to fetch leads:', err)
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    )
  }
}
