// Dynamic context-aware chips — 100% from data, zero hardcoding

import { prisma } from '../db'

export type QueryContext =
  | 'PAYMENT_PLANS'
  | 'AMENITIES'
  | 'PROJECT_SELECT'
  | 'COMPARISON'
  | 'CONNECTIVITY'
  | 'BUILDER_INFO'
  | 'UNKNOWN'

export interface ContextualChip {
  context: QueryContext
  actionPrefix: string
  options: Array<{ label: string; value: string }>
  multiSelect: boolean
}

// Pattern matching for query contexts
const CONTEXT_PATTERNS: Record<QueryContext, RegExp[]> = {
  PAYMENT_PLANS: [
    /payment\s*plan/i,
    /flexi|construction|on.time|flexible/i,
    /installment|emi/i,
  ],
  AMENITIES: [
    /amenities?|facility|facilities/i,
    /gym|pool|park|green|what\s+have/i,
  ],
  PROJECT_SELECT: [],
  COMPARISON: [
    /compare|versus|vs\.|side.?by.?side/i,
  ],
  CONNECTIVITY: [
    /connectivity|metro|school|hospital|distance/i,
  ],
  BUILDER_INFO: [
    /builder|developer|track\s+record|delivered|litigation/i,
  ],
  UNKNOWN: [],
}

export function detectQueryContext(message: string): QueryContext {
  const msgLower = message.toLowerCase()
  let bestMatch: QueryContext = 'UNKNOWN'
  let bestScore = 0

  for (const [context, patterns] of Object.entries(CONTEXT_PATTERNS)) {
    let score = 0
    for (const pattern of patterns) {
      if (pattern.test(msgLower)) score++
    }
    if (score > bestScore) {
      bestScore = score
      bestMatch = context as QueryContext
    }
  }

  return bestMatch
}

/**
 * Get projects as options for selection
 * Used when user asks about amenities/details of multiple projects
 */
export async function getProjectSelector(
  projectIds?: string[]
): Promise<ContextualChip | null> {
  if (!projectIds?.length || projectIds.length <= 1) return null

  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, name: true, sector: true },
    take: 10,
  })

  if (projects.length === 0) return null

  return {
    context: 'PROJECT_SELECT',
    actionPrefix: 'Which project would you like to explore?',
    options: projects.map(p => ({
      label: `${p.name} (${p.sector})`,
      value: p.id,
    })),
    multiSelect: false,
  }
}

/**
 * Get amenities for a specific project (only dynamic data)
 * First shows project selector, then amenities when project selected
 */
export async function getAmenityOptions(
  projectId: string
): Promise<ContextualChip | null> {
  if (!projectId) return null

  const amenities = await prisma.amenity.findMany({
    where: { project_id: projectId },
    select: { name: true, id: true },
    take: 20,
  })

  if (amenities.length === 0) return null

  return {
    context: 'AMENITIES',
    actionPrefix: 'Available amenities:',
    options: amenities.map(a => ({
      label: a.name,
      value: a.id,
    })),
    multiSelect: true,
  }
}

/**
 * Get payment plan types for specific projects (only dynamic data)
 */
export async function getPaymentPlanOptions(
  projectIds?: string[]
): Promise<ContextualChip | null> {
  if (!projectIds?.length) return null

  const plans = await prisma.paymentPlan.findMany({
    where: { project_id: { in: projectIds } },
    select: { plan_type: true, plan_name: true, id: true },
    distinct: ['plan_type'],
    take: 15,
  })

  if (plans.length === 0) return null

  // Use plan_type if available, otherwise plan_name
  const uniquePlans = new Map<string, string>()
  plans.forEach(p => {
    const key = p.plan_type || p.plan_name || `Plan ${p.id}`
    if (key && !uniquePlans.has(key)) {
      uniquePlans.set(key, p.id)
    }
  })

  return {
    context: 'PAYMENT_PLANS',
    actionPrefix: 'Available payment plans:',
    options: Array.from(uniquePlans.entries()).map(([label, value]) => ({
      label,
      value,
    })),
    multiSelect: false,
  }
}

/**
 * Get connectivity options for specific projects (only dynamic data)
 */
export async function getConnectivityOptions(
  projectIds?: string[]
): Promise<ContextualChip | null> {
  if (!projectIds?.length) return null

  const connectivity = await prisma.connectivity.findMany({
    where: { project_id: { in: projectIds } },
    select: { type: true, name: true, distance_km: true },
    distinct: ['type'],
    take: 15,
  })

  if (connectivity.length === 0) return null

  return {
    context: 'CONNECTIVITY',
    actionPrefix: 'Nearby connectivity:',
    options: connectivity.map(c => {
      const label = c.distance_km
        ? `${c.name} (${c.distance_km} km)`
        : c.name
      return {
        label,
        value: c.type,
      }
    }),
    multiSelect: true,
  }
}

/**
 * Get builder info options for specific projects (only dynamic data)
 */
export async function getBuilderOptions(
  projectIds?: string[]
): Promise<ContextualChip | null> {
  if (!projectIds?.length) return null

  const builders = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: {
      builder: {
        select: {
          id: true,
          name: true,
          credai_member: true,
          delivered_units: true,
        },
      },
    },
    take: 10,
  })

  const uniqueBuilders = new Map<string, any>()
  builders.forEach(p => {
    if (p.builder) {
      uniqueBuilders.set(p.builder.id, p.builder)
    }
  })

  if (uniqueBuilders.size === 0) return null

  return {
    context: 'BUILDER_INFO',
    actionPrefix: 'Builder details:',
    options: Array.from(uniqueBuilders.values()).map(b => ({
      label: `${b.name}${b.credai_member ? ' (CREDAI)' : ''}`,
      value: b.id,
    })),
    multiSelect: false,
  }
}

/**
 * Get context-aware chips based on detected query
 * ONLY returns chips with data from database
 * Returns empty array if no matching data found
 */
export async function getContextualChips(
  message: string,
  projectIds?: string[]
): Promise<ContextualChip[]> {
  const context = detectQueryContext(message)
  const chips: ContextualChip[] = []

  try {
    switch (context) {
      case 'PAYMENT_PLANS':
        if (projectIds?.length) {
          const chip = await getPaymentPlanOptions(projectIds)
          if (chip) chips.push(chip)
        }
        break

      case 'AMENITIES':
        // For multiple projects, show selector first
        if (projectIds?.length) {
          if (projectIds.length > 1) {
            const selector = await getProjectSelector(projectIds)
            if (selector) chips.push(selector)
          } else {
            // Single project, show amenities directly
            const amenities = await getAmenityOptions(projectIds[0])
            if (amenities) chips.push(amenities)
          }
        }
        break

      case 'COMPARISON':
        // Will be handled separately in chat route with dedicated comparison logic
        break

      case 'CONNECTIVITY':
        if (projectIds?.length) {
          const chip = await getConnectivityOptions(projectIds)
          if (chip) chips.push(chip)
        }
        break

      case 'BUILDER_INFO':
        if (projectIds?.length) {
          const chip = await getBuilderOptions(projectIds)
          if (chip) chips.push(chip)
        }
        break

      default:
        // No chips for unknown context
        break
    }
  } catch (err) {
    console.error('[CHIP_CONTEXT] Error generating chips:', err)
    // Graceful degradation — return empty array, no chips
  }

  return chips
}
