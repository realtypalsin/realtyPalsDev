// Live activity strip for a project's Overview tab.
// Every number here is a real-time count from actual events — never simulated.
// Numbers below their threshold are hidden (null) rather than shown as a weak/zero value.

import { prisma } from './db'

export interface LiveActivity {
  viewing_now: number | null
  visits_booked_last_hour: number | null
  units_left: number | null
}

const VIEWING_NOW_WINDOW_MINUTES = 15
const VIEWING_NOW_MIN_TO_SHOW = 2 // "1 person viewing" reads as empty, not exciting
const VISITS_MIN_TO_SHOW = 1
const UNITS_LEFT_MIN_TO_SHOW = 1

export function applyActivityThresholds(
  viewingNowRaw: number,
  visitsBookedRaw: number,
  unitsLeftRaw: number | null,
): LiveActivity {
  return {
    viewing_now: viewingNowRaw >= VIEWING_NOW_MIN_TO_SHOW ? viewingNowRaw : null,
    visits_booked_last_hour: visitsBookedRaw >= VISITS_MIN_TO_SHOW ? visitsBookedRaw : null,
    units_left: unitsLeftRaw != null && unitsLeftRaw >= UNITS_LEFT_MIN_TO_SHOW ? unitsLeftRaw : null,
  }
}

export async function computeLiveActivity(projectId: string): Promise<LiveActivity> {
  const windowStart = new Date(Date.now() - VIEWING_NOW_WINDOW_MINUTES * 60 * 1000)
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000)

  const [viewingSessions, visitsBooked, unitTypes] = await Promise.all([
    prisma.propertyEvent.findMany({
      where: { project_id: projectId, action: 'view', created_at: { gte: windowStart } },
      select: { session_id: true },
      distinct: ['session_id'],
    }),
    prisma.siteVisitRequest.count({
      where: { project_id: projectId, created_at: { gte: hourAgo } },
    }),
    prisma.unitType.findMany({
      where: { project_id: projectId },
      select: { inventory_left: true },
    }),
  ])

  const unitsLeftTotal = unitTypes.some((u) => u.inventory_left != null)
    ? unitTypes.reduce((sum, u) => sum + (u.inventory_left ?? 0), 0)
    : null

  return applyActivityThresholds(viewingSessions.length, visitsBooked, unitsLeftTotal)
}
