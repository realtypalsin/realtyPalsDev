import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get all projects and their property events
    const events = await prisma.propertyEvent.groupBy({
      by: ['project_id'],
      _count: {
        id: true,
        action: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 100,
    })

    // Get project names and aggregate by action type
    const eventsByProject = await Promise.all(
      events.map(async (event) => {
        const project = await prisma.project.findUnique({
          where: { id: event.project_id },
          select: { name: true },
        })

        const actionCounts = await prisma.propertyEvent.groupBy({
          by: ['action'],
          where: { project_id: event.project_id },
          _count: { id: true },
        })

        const actionMap = Object.fromEntries(
          actionCounts.map((a) => [a.action, a._count.id])
        )

        return {
          projectId: event.project_id,
          projectName: project?.name || 'Unknown Project',
          views: actionMap['view'] || 0,
          saves: actionMap['save'] || 0,
          comparisons: actionMap['compare'] || 0,
          shares: actionMap['share'] || 0,
          brochures: actionMap['brochure'] || 0,
          gallery: actionMap['gallery'] || 0,
          location: actionMap['location'] || 0,
          calls: actionMap['call'] || 0,
          whatsappInquiries: actionMap['whatsapp'] || 0,
          siteVisits: actionMap['site_visit'] || 0,
          removedSaves: actionMap['remove_saved'] || 0,
        }
      })
    )

    return NextResponse.json({
      properties: eventsByProject.sort(
        (a, b) =>
          (b.views + b.saves + b.comparisons + b.shares + b.whatsappInquiries) -
          (a.views + a.saves + a.comparisons + a.shares + a.whatsappInquiries)
      ),
      total: eventsByProject.length,
    })
  } catch (err) {
    console.error('[ADMIN] Property events error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch property events' },
      { status: 500 }
    )
  }
}
