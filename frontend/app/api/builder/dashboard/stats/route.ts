/**
 * GET /api/builder/dashboard/stats
 * Get builder dashboard stats (projects, leads, conversion rate)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { verifyUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get builder for this user via BuilderAccount
    const account = await prisma.builderAccount.findFirst({
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
      prisma.builderNews.count({ where: { builder_id: builder.id, status: 'published' } }),
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
      profile_views: views, // TODO: Replace with actual analytics view tracking
      lead_conversion_rate: leads > 0 ? ((conversions / leads) * 100).toFixed(1) : 0,
      average_response_time_hours: 0 // TODO: Implement actual response time calculation
    })
  } catch (err) {
    console.error('[API][GET /api/builder/dashboard/stats] Failed to fetch dashboard stats:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching your dashboard statistics. Please try again later.' },
      { status: 500 }
    )
  }
}
