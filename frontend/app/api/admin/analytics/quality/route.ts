import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [
      totalSearches,
      zeroResultCount,
      searchWithResultsCount,
      searchWithoutResultsCount,
      avgClarifications,
      avgResults,
    ] = await Promise.all([
      // Total searches
      prisma.queryMetrics.count().catch(() => 0),

      // Zero-result searches
      prisma.queryMetrics.count({
        where: { had_results: false }
      }).catch(() => 0),

      // Searches with results
      prisma.queryMetrics.count({
        where: { had_results: true }
      }).catch(() => 0),

      // Searches without results
      prisma.queryMetrics.count({
        where: { had_results: false }
      }).catch(() => 0),

      // Average clarifications
      prisma.queryMetrics.aggregate({
        _avg: { clarification_count: true }
      }).catch(() => ({ _avg: { clarification_count: null } })),

      // Average results count
      prisma.queryMetrics.aggregate({
        _avg: { results_count: true }
      }).catch(() => ({ _avg: { results_count: null } })),
    ])

    const zeroResultRate = totalSearches > 0
      ? ((zeroResultCount / totalSearches) * 100).toFixed(1) + '%'
      : '0%'

    return NextResponse.json({
      totalSearches,
      zeroResultSearches: zeroResultCount,
      zeroResultRate,
      searchWithResults: searchWithResultsCount,
      searchWithoutResults: searchWithoutResultsCount,
      avgClarifications: avgClarifications._avg.clarification_count || 0,
      avgResultsCount: avgResults._avg.results_count || 0,
    })
  } catch (err) {
    console.error('[ADMIN] Quality metrics error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch quality metrics' },
      { status: 500 }
    )
  }
}
