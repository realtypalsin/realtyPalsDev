import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest) {
  try {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const count = await prisma.siteVisitRequest.count({
      where: {
        created_at: { gte: startOfDay },
      },
    })

    return NextResponse.json({ count })
  } catch (err) {
    console.error('[leads/count]', err)
    return NextResponse.json({ count: 0 })
  }
}
