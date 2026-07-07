/**
 * Update lead status
 * PATCH /api/builder/leads/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { verifyUser } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await verifyUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Verify user is a builder
    const account = await prisma.builderAccount.findFirst({
      where: { user_id: userId }
    })
    if (!account) {
      return NextResponse.json({ error: 'Builder account not found' }, { status: 404 })
    }

    const lead = await prisma.builderLead.update({
      where: { id: params.id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.follow_up_date && { contacted_at: new Date(body.follow_up_date) })
      }
    })

    return NextResponse.json(lead)
  } catch (err) {
    console.error('[API] Failed to update lead:', err)
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 }
    )
  }
}
