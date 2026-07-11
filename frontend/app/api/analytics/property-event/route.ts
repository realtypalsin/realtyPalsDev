import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { project_id, action, session_id, user_id, guest_token } = await req.json()

    if (!project_id || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Map action name to property_events action type (view, save, compare, share, whatsapp_inquiry)
    const validActions = ['view', 'save', 'compare', 'share', 'whatsapp_inquiry']
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    await prisma.propertyEvent.create({
      data: {
        session_id: session_id ?? null,
        user_id: user_id ?? null,
        guest_token: guest_token ?? null,
        project_id,
        action: action as any,
        created_at: new Date(),
      },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('[ANALYTICS] Property event error:', err)
    return NextResponse.json(
      { error: 'Failed to track property event' },
      { status: 500 }
    )
  }
}
