/**
 * Admin Promotional Management API
 * GET /api/admin/promotions — list all promotions
 * POST /api/admin/promotions — create new promotion
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const userId = await verifyAdminUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const promotions = await prisma.promotional.findMany({
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
        is_active: true,
        impressions: true,
        clicks: true,
        conversions: true,
        target_sectors: true,
        target_bhk: true,
        created_at: true,
        created_by: true
      },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json(promotions)
  } catch (err) {
    console.error('[API] Failed to list promotions:', err)
    return NextResponse.json(
      { error: 'Failed to list promotions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const userId = await verifyAdminUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      description,
      type,
      content,
      link_type,
      link_target,
      image_url,
      icon_url,
      builder_id,
      starts_at,
      ends_at,
      target_sectors = [],
      target_bhk = []
    } = body

    if (!title || !content || !type || !starts_at || !ends_at) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const promotion = await prisma.promotional.create({
      data: {
        title,
        description,
        type,
        content,
        link_type,
        link_target,
        image_url,
        icon_url,
        builder_id,
        starts_at: new Date(starts_at),
        ends_at: new Date(ends_at),
        target_sectors: target_sectors || [],
        target_bhk: target_bhk || [],
        created_by: userId
      }
    })

    return NextResponse.json(promotion, { status: 201 })
  } catch (err) {
    console.error('[API] Failed to create promotion:', err)
    return NextResponse.json(
      { error: 'Failed to create promotion' },
      { status: 500 }
    )
  }
}
