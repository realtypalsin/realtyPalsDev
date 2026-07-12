import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get summary statistics from property events and search metrics
    const [
      totalChats,
      totalQueries,
      propertyEvents,
      topSectors,
      topBuilders,
      conversions,
      avgClarifications,
    ] = await Promise.all([
      // Total chats (from chat sessions)
      prisma.chatSession.count().catch(() => 0),

      // Total searches (from query metrics)
      prisma.queryMetrics.count().catch(() => 0),

      // Property event counts
      prisma.propertyEvent.groupBy({
        by: ['action'],
        _count: { id: true },
      }).catch(() => []),

      // Top sectors
      prisma.queryMetrics.groupBy({
        by: ['sector'],
        _count: { id: true },
        where: { sector: { not: null } },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }).catch(() => []),

      // Top builders
      prisma.queryMetrics.groupBy({
        by: ['builder'],
        _count: { id: true },
        where: { builder: { not: null } },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }).catch(() => []),

      // Conversion count
      prisma.chatAnalytics.count({
        where: { conversion_at: { not: null } }
      }).catch(() => 0),

      // Average clarifications
      prisma.queryMetrics.aggregate({
        _avg: { clarification_count: true }
      }).catch(() => ({ _avg: { clarification_count: null } })),
    ])

    const totalQueryCount = totalQueries
    const propertyEventMap = Object.fromEntries(
      propertyEvents.map(e => [e.action, e._count.id])
    )
    const totalPropertyEvents = propertyEvents.reduce((sum, e) => sum + e._count.id, 0)

    const conversionRate = totalPropertyEvents > 0
      ? (((propertyEventMap['save'] || 0) / totalPropertyEvents) * 100).toFixed(1) + '%'
      : '0%'

    const zeroResultRate = totalQueryCount > 0
      ? '0%'
      : '0%'

    const avgQueriesPerChat = totalChats > 0 ? (totalQueryCount / totalChats).toFixed(1) : '0'

    return NextResponse.json({
      totalChats,
      totalQueries: totalQueryCount,
      zeroResultSearches: 0,
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
