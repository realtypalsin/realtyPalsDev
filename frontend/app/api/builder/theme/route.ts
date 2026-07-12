/**
 * Builder Theme API
 * GET /api/builder/theme — get current theme
 * PATCH /api/builder/theme — update theme colors
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get builder for this user via BuilderAccount
    const account = await prisma.builderAccount.findFirst({
      where: { user_id: userId },
      include: { builder: { include: { theme: true } } }
    })

    if (!account?.builder) {
      return NextResponse.json({ error: 'Builder not found' }, { status: 404 })
    }

    const builder = account.builder

    if (!builder.theme) {
      return NextResponse.json({ error: 'No theme assigned' }, { status: 404 })
    }

    return NextResponse.json({
      name: 'Builder Theme',
      colors: {
        primary: builder.theme.primary_color,
        secondary: builder.theme.secondary_color || '#e0e7ff'
      },
      active_until: builder.theme.active_until,
      is_active: builder.theme.is_active
    })
  } catch (err) {
    console.error('[API] Failed to fetch theme:', err)
    return NextResponse.json(
      { error: 'Failed to fetch theme' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await verifyUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Get builder for this user via BuilderAccount
    const account = await prisma.builderAccount.findFirst({
      where: { user_id: userId },
      include: { builder: true }
    })

    if (!account?.builder) {
      return NextResponse.json({ error: 'Builder not found' }, { status: 404 })
    }

    const builder = account.builder

    const theme = await prisma.builderTheme.update({
      where: { builder_id: builder.id },
      data: {
        ...(body.primary_color && { primary_color: body.primary_color }),
        ...(body.secondary_color && { secondary_color: body.secondary_color })
      }
    })

    return NextResponse.json({
      name: 'Builder Theme',
      colors: {
        primary: theme.primary_color,
        secondary: theme.secondary_color || '#e0e7ff'
      },
      active_until: theme.active_until,
      is_active: theme.is_active
    })
  } catch (err) {
    console.error('[API] Failed to update theme:', err)
    return NextResponse.json(
      { error: 'Failed to update theme' },
      { status: 500 }
    )
  }
}
