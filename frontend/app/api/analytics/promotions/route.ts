/**
 * Promotional tracking API endpoints
 * POST /api/analytics/promotions/impression
 * POST /api/analytics/promotions/click
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  trackPromotionalImpression,
  trackPromotionalClick
} from '@/backend/src/lib/analytics/tracking'

// Track promotional impression
export async function POST(request: NextRequest) {
  try {
    const { action, promotional_id, session_id, user_id, guest_token } = await request.json()

    if (!promotional_id) {
      return NextResponse.json({ error: 'promotional_id required' }, { status: 400 })
    }

    if (action === 'impression') {
      await trackPromotionalImpression(promotional_id, session_id, user_id, guest_token)
      return NextResponse.json({ success: true })
    }

    if (action === 'click') {
      await trackPromotionalClick(promotional_id, session_id, user_id, guest_token)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('[API] Promotional tracking failed:', err)
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 })
  }
}
