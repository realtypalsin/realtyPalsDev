/**
 * Promotional tracking API endpoints
 * POST /api/analytics/promotions/impression
 * POST /api/analytics/promotions/click
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

// Track promotional impression
export async function POST(request: NextRequest) {
  try {
    const { action, promotional_id, session_id, user_id, guest_token } = await request.json()

    if (!promotional_id) {
      return NextResponse.json({ error: 'promotional_id required' }, { status: 400 })
    }

    if (action === 'impression') {
      await Promise.all([
        prisma.promotionalInteraction.create({
          data: {
            promotional_id,
            session_id: session_id || null,
            user_id: user_id || null,
            guest_token: guest_token || null,
            interaction_type: 'impression',
          }
        }),
        prisma.promotional.update({
          where: { id: promotional_id },
          data: { impressions: { increment: 1 } }
        })
      ])
      return NextResponse.json({ success: true })
    }

    if (action === 'click') {
      await Promise.all([
        prisma.promotionalInteraction.create({
          data: {
            promotional_id,
            session_id: session_id || null,
            user_id: user_id || null,
            guest_token: guest_token || null,
            interaction_type: 'click',
          }
        }),
        prisma.promotional.update({
          where: { id: promotional_id },
          data: { clicks: { increment: 1 } }
        }),
        session_id ? prisma.chatAnalytics.updateMany({
          where: { session_id },
          data: {
            promotional_id,
            promo_clicked: true,
          }
        }) : Promise.resolve()
      ])
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('[API] Promotional tracking failed:', err)
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 })
  }
}
