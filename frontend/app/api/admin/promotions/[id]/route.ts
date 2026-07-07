/**
 * Admin Promotional Management API
 * GET /api/admin/promotions/[id] — get single promotion
 * PATCH /api/admin/promotions/[id] — update promotion
 * DELETE /api/admin/promotions/[id] — delete promotion
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await verifyAdminUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const promotion = await prisma.promotional.findUnique({
      where: { id: params.id }
    })

    if (!promotion) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(promotion)
  } catch (err) {
    console.error('[API] Failed to get promotion:', err)
    return NextResponse.json(
      { error: 'Failed to get promotion' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await verifyAdminUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const promotion = await prisma.promotional.update({
      where: { id: params.id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.type && { type: body.type }),
        ...(body.content && { content: body.content }),
        ...(body.link_type && { link_type: body.link_type }),
        ...(body.link_target !== undefined && { link_target: body.link_target }),
        ...(body.image_url !== undefined && { image_url: body.image_url }),
        ...(body.icon_url !== undefined && { icon_url: body.icon_url }),
        ...(body.builder_id !== undefined && { builder_id: body.builder_id }),
        ...(body.starts_at && { starts_at: new Date(body.starts_at) }),
        ...(body.ends_at && { ends_at: new Date(body.ends_at) }),
        ...(body.is_active !== undefined && { is_active: body.is_active }),
        ...(body.target_sectors && { target_sectors: body.target_sectors }),
        ...(body.target_bhk && { target_bhk: body.target_bhk })
      }
    })

    return NextResponse.json(promotion)
  } catch (err) {
    console.error('[API] Failed to update promotion:', err)
    return NextResponse.json(
      { error: 'Failed to update promotion' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await verifyAdminUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.promotional.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[API] Failed to delete promotion:', err)
    return NextResponse.json(
      { error: 'Failed to delete promotion' },
      { status: 500 }
    )
  }
}
