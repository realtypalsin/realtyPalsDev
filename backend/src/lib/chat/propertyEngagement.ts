// backend/src/lib/chat/propertyEngagement.ts
// Weighted engagement scoring from property_events table
// Weights: named=1, view=1, detail=3, drilldown=3, saved=5, callback/visit=10

import { prisma } from '../db'

export type PropertyEngagementScore = {
  projectId: string
  weight: number
  count: number // total times mentioned/interacted
  lastEngagedAt: Date
}

const ENGAGEMENT_WEIGHTS: Record<string, number> = {
  named: 1, // mentioned in intent_snapshot
  view: 1, // card_view action
  detail: 3, // detail_open action
  drilldown: 3, // via queryKind=DRILLDOWN + anchor
  saved: 5, // save action
  callback: 10, // callback_request action
  site_visit: 10, // site_visit_request action
}

export async function scorePropertyEngagement(
  sessionId: string,
  projectIdToCount?: Record<string, number> // from intent_snapshot named count
): Promise<PropertyEngagementScore[]> {
  const events = await prisma.propertyEvent.findMany({
    where: { session_id: sessionId },
    select: { project_id: true, action: true, created_at: true },
  })

  const scores = new Map<string, { weight: number; count: number; lastAt: Date }>()

  // Add weights from property_events
  for (const event of events) {
    const weight = ENGAGEMENT_WEIGHTS[event.action] ?? 0
    const key = event.project_id
    const existing = scores.get(key) || { weight: 0, count: 0, lastAt: event.created_at }
    scores.set(key, {
      weight: existing.weight + weight,
      count: existing.count + 1,
      lastAt: event.created_at > existing.lastAt ? event.created_at : existing.lastAt,
    })
  }

  // Add named mentions from intent snapshots (weight=1 per mention)
  if (projectIdToCount) {
    for (const [projectId, count] of Object.entries(projectIdToCount)) {
      const weight = count * ENGAGEMENT_WEIGHTS.named
      const existing = scores.get(projectId)
      if (existing) {
        scores.set(projectId, {
          weight: existing.weight + weight,
          count: existing.count + count,
          lastAt: existing.lastAt,
        })
      } else {
        scores.set(projectId, { weight, count, lastAt: new Date() })
      }
    }
  }

  return Array.from(scores.entries())
    .map(([projectId, { weight, count, lastAt }]) => ({
      projectId,
      weight,
      count,
      lastEngagedAt: lastAt,
    }))
    .sort((a, b) => b.weight - a.weight)
}
