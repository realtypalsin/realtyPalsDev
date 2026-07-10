import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [
      totalChats,
      totalSearches,
      totalClicks,
      totalSaves,
      totalConversions,
      avgSessionDuration,
      uniqueUsers,
      repeatedUsers,
      topSectors,
    ] = await Promise.all([
      // Total chats
      prisma.chatSession.count(),

      // Total searches
      prisma.queryMetrics.count(),

      // Total clicks
      prisma.chatAnalytics.aggregate({
        _sum: { projects_clicked: true }
      }),

      // Total saves
      prisma.chatAnalytics.aggregate({
        _sum: { projects_saved: true }
      }),

      // Total conversions
      prisma.chatAnalytics.count({
        where: { conversion_at: { not: null } }
      }),

      // Average session duration
      prisma.chatAnalytics.aggregate({
        _avg: { time_spent_seconds: true }
      }),

      // Total unique users
      prisma.chatSession.count({
        where: { user_id: { not: null } }
      }),

      // Users with multiple sessions
      prisma.chatSession.groupBy({
        by: ['user_id'],
        having: {
          user_id: {
            _count: { gt: 1 }
          }
        },
        _count: { id: true },
        where: { user_id: { not: null } }
      }),

      // Top searched sectors
      prisma.queryMetrics.groupBy({
        by: ['sector'],
        _count: { id: true },
        where: { sector: { not: null } },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ])

    return NextResponse.json({
      totalUsers: uniqueUsers,
      avgSessionDuration: avgSessionDuration._avg.time_spent_seconds || 0,
      avgQueriesPerUser: totalChats > 0 ? totalSearches / totalChats : 0,
      totalConversions,
      repeatedVisitors: repeatedUsers.length,
      conversionFunnel: {
        chats: totalChats,
        searches: totalSearches,
        clicks: totalClicks._sum.projects_clicked || 0,
        saves: totalSaves._sum.projects_saved || 0,
        conversions: totalConversions,
      },
      mostActiveSectors: topSectors.map(s => ({
        sector: s.sector || 'Unknown',
        searches: s._count.id
      })),
    })
  } catch (err) {
    console.error('[ADMIN] User behavior error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch user behavior' },
      { status: 500 }
    )
  }
}
