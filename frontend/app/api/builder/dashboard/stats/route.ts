/**
 * GET /api/builder/dashboard/stats
 * Get builder dashboard stats (projects, leads, conversion rate)
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

    // Get builder for this user via BuilderAccount
    const account = await prisma.builderAccount.findUnique({
      where: { user_id: userId },
      include: { builder: true }
    })

    if (!account?.builder) {
      return NextResponse.json({ error: 'Builder not found' }, { status: 404 })
    }

    const builder = account.builder

    // Get stats
    const [projects, leads, news, views] = await Promise.all([
      prisma.project.count({ where: { builder_id: builder.id } }),
      prisma.builderLead.count({ where: { builder_id: builder.id } }),
      prisma.builderNews.count({ where: { builder_id: builder.id, status: 'approved' } }),
      prisma.builderLead.count({ where: { builder_id: builder.id } }) // Replace with actual view tracking
    ])

    const conversions = await prisma.builderLead.count({
      where: {
        builder_id: builder.id,
        status: { in: ['qualified'] }
      }
    })

    return NextResponse.json({
      total_projects: projects,
      total_leads: leads,
      news_published: news,
      profile_views: views * 2.5, // Placeholder calculation
      lead_conversion_rate: leads > 0 ? ((conversions / leads) * 100).toFixed(1) : 0,
      average_response_time_hours: 24
    })
  } catch (err) {
    console.error('[API] Failed to fetch dashboard stats:', err)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
