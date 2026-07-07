/**
 * GET /api/promotions/active
 * Returns active promotions for the current user's criteria (sector, BHK)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sector = searchParams.get('sector')
    const bhk = searchParams.get('bhk') ? parseInt(searchParams.get('bhk')!) : undefined

    const now = new Date()

    // Find active promotions matching user criteria
    const promotions = await prisma.promotional.findMany({
      where: {
        is_active: true,
        starts_at: { lte: now },
        ends_at: { gte: now },
        // If target_sectors is empty, show to all; otherwise filter
        OR: [
          { target_sectors: { equals: [] } },
          {
            target_sectors: {
              has: sector || 'all'
            }
          }
        ]
      },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        content: true,
        link_type: true,
        link_target: true,
        image_url: true,
        icon_url: true,
        builder_id: true,
        starts_at: true,
        ends_at: true,
        impressions: true,
        clicks: true,
        conversions: true,
        target_bhk: true
      },
      orderBy: { created_at: 'desc' },
      take: 10
    })

    // Filter by BHK if provided
    let filtered = promotions
    if (bhk && bhk > 0) {
      filtered = promotions.filter((p: any) => {
        return p.target_bhk.length === 0 || p.target_bhk.includes(bhk)
      })
    }

    return NextResponse.json({
      success: true,
      data: filtered,
      count: filtered.length
    })
  } catch (err) {
    console.error('[API] Failed to fetch active promotions:', err)
    return NextResponse.json(
      { error: 'Failed to fetch promotions' },
      { status: 500 }
    )
  }
}
