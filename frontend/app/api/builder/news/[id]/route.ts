/**
 * Individual news item operations
 * PATCH /api/builder/news/[id]
 * DELETE /api/builder/news/[id]
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    // Get caller's builder account
    const account = await prisma.builderAccount.findFirst({
      where: { user_id: userId }
    })
    if (!account) {
      return NextResponse.json({ error: 'Builder account not found' }, { status: 404 })
    }

    // Check ownership before updating (prevent IDOR)
    const existingNews = await prisma.builderNews.findUnique({
      where: { id: params.id }
    })
    if (!existingNews || existingNews.builder_id !== account.builder_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const news = await prisma.builderNews.update({
      where: { id: params.id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.description && { description: body.description }),
        ...(body.image_url !== undefined && { image_url: body.image_url })
      }
    })

    return NextResponse.json(news)
  } catch (err) {
    console.error('[API] Failed to update news:', err)
    return NextResponse.json(
      { error: 'Failed to update news' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await verifyUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get caller's builder account
    const account = await prisma.builderAccount.findFirst({
      where: { user_id: userId }
    })
    if (!account) {
      return NextResponse.json({ error: 'Builder account not found' }, { status: 404 })
    }

    // Check ownership before deleting (prevent IDOR)
    const existingNews = await prisma.builderNews.findUnique({
      where: { id: params.id }
    })
    if (!existingNews || existingNews.builder_id !== account.builder_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.builderNews.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[API] Failed to delete news:', err)
    return NextResponse.json(
      { error: 'Failed to delete news' },
      { status: 500 }
    )
  }
}
