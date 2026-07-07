/**
 * Builder News API
 * GET /api/builder/news — list builder's news
 * POST /api/builder/news — create new news
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
      include: { builder: true }
    })

    if (!account?.builder) {
      return NextResponse.json({ error: 'Builder not found' }, { status: 404 })
    }

    const builder = account.builder

    if (!builder) {
      return NextResponse.json({ error: 'Builder not found' }, { status: 404 })
    }

    const news = await prisma.builderNews.findMany({
      where: { builder_id: builder.id },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json(news)
  } catch (err) {
    console.error('[API] Failed to fetch news:', err)
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await verifyUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, image_url, link_type, link_target, status } = body

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description' },
        { status: 400 }
      )
    }

    // Get builder for this user via BuilderAccount
    const account = await prisma.builderAccount.findFirst({
      where: { user_id: userId },
      include: { builder: true }
    })

    if (!account?.builder) {
      return NextResponse.json({ error: 'Builder not found' }, { status: 404 })
    }

    const builder = account.builder

    if (!builder) {
      return NextResponse.json({ error: 'Builder not found' }, { status: 404 })
    }

    const news = await prisma.builderNews.create({
      data: {
        builder_id: builder.id,
        title,
        description,
        image_url: image_url || null,
        link_type: link_type || null,
        link_target: link_target || null,
        status: status || 'draft',
        submitted_by: userId
      }
    })

    return NextResponse.json(news, { status: 201 })
  } catch (err) {
    console.error('[API] Failed to create news:', err)
    return NextResponse.json(
      { error: 'Failed to create news' },
      { status: 500 }
    )
  }
}
