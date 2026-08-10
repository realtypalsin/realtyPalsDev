import { prisma } from '../db'
import type { RouteDecision } from './queryRouter'

const BASE_CONFIDENCE: Record<string, number> = {
  payment_plans: 95,
  cost_sheet: 90,
  builder: 85,
  location: 75,
  possession: 80
}

export function calculateConfidence(
  source: string,
  data: Record<string, unknown>,
  legal_risk: boolean = false,
  litigation_count: number = 0
): number {
  let base = BASE_CONFIDENCE[source] || 75

  // Freshness penalty: -5% per week old
  if (data.verified_at || data.updated_at) {
    const verifiedDate = new Date((data.verified_at || data.updated_at) as string | number)
    const now = new Date()
    const daysOld = (now.getTime() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24)
    const weeksOld = Math.floor(daysOld / 7)
    base -= weeksOld * 5
  }

  // Legal adjustments
  if (legal_risk) base -= 20
  if (litigation_count > 2) base -= 15

  return Math.max(0, Math.min(100, base))
}

export async function fetchProjectData(
  projectId: string,
  table: string
) {
  try {
    switch (table) {
      case 'PaymentPlan':
        return await prisma.paymentPlan.findMany({
          where: { project_id: projectId },
          orderBy: { sort_order: 'asc' }
        })

      case 'CostSheet': {
        const costSheet = await prisma.costSheet.findUnique({
          where: { project_id: projectId }
        })
        return costSheet ? [costSheet] : []
      }

      case 'Builder': {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          include: { builder: true }
        })
        return project ? [project.builder] : []
      }

      case 'Project': {
        const proj = await prisma.project.findUnique({
          where: { id: projectId }
        })
        return proj ? [proj] : []
      }

      default:
        return []
    }
  } catch (error) {
    console.error(`[DataFetcher] Error fetching ${table}:`, error)
    return []
  }
}

export async function fetchWeightedData(projectId: string, route: RouteDecision) {
  const primaryData = await fetchProjectData(projectId, route.primary_table)

  let secondaryData: Record<string, unknown>[] = []
  if (route.secondary_tables.length > 0) {
    for (const table of route.secondary_tables) {
      const data = await fetchProjectData(projectId, table)
      secondaryData = [...secondaryData, ...data]
    }
  }

  return {
    primary: primaryData.map((item) => ({
      data: item,
      confidence: calculateConfidence(
        route.primary_table.toLowerCase(),
        item,
        (item as Record<string, unknown>).legal_flag !== 'none',
        Number((item as Record<string, unknown>).litigation_count) || 0
      )
    })),
    secondary: secondaryData.map((item) => ({
      data: item,
      confidence: calculateConfidence(
        route.primary_table.toLowerCase(),
        item,
        (item as Record<string, unknown>).legal_flag !== 'none',
        Number((item as Record<string, unknown>).litigation_count) || 0
      )
    }))
  }
}
