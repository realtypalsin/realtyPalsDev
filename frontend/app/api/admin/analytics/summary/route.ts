import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get summary statistics
    const [
      totalChats,
      totalQueries,
      zeroResultQueries,
      topSectors,
      topBuilders,
      conversions,
      avgClarifications,
    ] = await Promise.all([
      // Total chats
      prisma.chatSession.count(),

      // Total searches
      prisma.queryMetrics.count(),

      // Zero-result searches
      prisma.queryMetrics.count({
        where: { had_results: false }
      }),

      // Top sectors
      prisma.queryMetrics.groupBy({
        by: ['sector'],
        _count: { id: true },
        where: { sector: { not: null } },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),

      // Top builders
      prisma.queryMetrics.groupBy({
        by: ['builder'],
        _count: { id: true },
        where: { builder: { not: null } },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),

      // Conversion count
      prisma.chatAnalytics.count({
        where: { conversion_at: { not: null } }
      }),

      // Average clarifications
      prisma.queryMetrics.aggregate({
        _avg: { clarification_count: true }
      }),
    ])

    const totalQueryCount = totalQueries
    const conversionRate = totalQueryCount > 0
      ? ((conversions / totalQueryCount) * 100).toFixed(1) + '%'
      : '0%'

    const zeroResultRate = totalQueryCount > 0
      ? ((zeroResultQueries / totalQueryCount) * 100).toFixed(1) + '%'
      : '0%'

    const avgQueriesPerChat = totalChats > 0 ? (totalQueryCount / totalChats).toFixed(1) : '0'

    return NextResponse.json({
      totalChats,
      totalQueries: totalQueryCount,
      zeroResultSearches: zeroResultQueries,
      zeroResultSearchRate: zeroResultRate,
      conversionRate,
      avgQueriesPerChat,
      avgClarifications: avgClarifications._avg.clarification_count?.toFixed(2) || '0',
      topSectors: topSectors.map(s => ({
        sector: s.sector || 'Unknown',
        count: s._count.id
      })),
      topBuilders: topBuilders.map(b => ({
        builder: b.builder || 'Unknown',
        count: b._count.id
      })),
    })
  } catch (err) {
    console.error('[ADMIN] Analytics summary error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch analytics summary' },
      { status: 500 }
    )
  }
}
