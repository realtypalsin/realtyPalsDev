// Detect query context and generate contextual chips with actionable options

import { prisma } from '../db'

export type QueryContext =
  | 'PAYMENT_PLANS'
  | 'AMENITIES'
  | 'COMPARISON'
  | 'CONNECTIVITY'
  | 'LEGAL_RERA'
  | 'TIMELINE'
  | 'BUDGET'
  | 'BUILDER_INFO'
  | 'DISCOVERY'
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
    /payment\s*option/i,
  ],
  AMENITIES: [
    /amenities?/i,
    /facility|facilities/i,
    /gym|pool|park|green/i,
  ],
  COMPARISON: [
    /compare|versus|vs\.|differ|which.*better/i,
    /side.?by.?side/i,
  ],
  CONNECTIVITY: [
    /connectivity|metro|transport|access|distance/i,
    /school|hospital|mall|market/i,
  ],
  LEGAL_RERA: [
    /rera|legal|compliance|registration|possession/i,
    /approval|pending/i,
  ],
  TIMELINE: [
    /timeline|possession|when|ready|launch|deliver/i,
    /year|month|date/i,
  ],
  BUDGET: [
    /budget|price|afford|cost|crore|lakh/i,
    /expensive|cheap|range|within/i,
  ],
  BUILDER_INFO: [
    /builder|developer|company|track record/i,
    /delivered|litigation|credai/i,
  ],
  DISCOVERY: [
    /find|search|show|recommend|suggest/i,
    /bhk|flat|apartment/i,
  ],
  UNKNOWN: [],
}

/**
 * Detect primary query context from user message
 */
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
 * Get payment plan type options
 */
export async function getPaymentPlanOptions(
  projectIds?: string[]
): Promise<ContextualChip> {
  const plans = new Set<string>()

  if (projectIds?.length) {
    const dbPlans = await prisma.paymentPlan.findMany({
      where: { project_id: { in: projectIds } },
      select: { plan_type: true, plan_name: true },
      distinct: ['plan_type'],
      take: 10,
    })
    dbPlans.forEach(p => {
      if (p.plan_type) plans.add(p.plan_type)
      if (p.plan_name) plans.add(p.plan_name)
    })
  }

  // Fallback to standard payment plan types
  if (plans.size === 0) {
    plans.add('Flexi Payment')
    plans.add('Construction Linked')
    plans.add('On-Time Payment')
  }

  return {
    context: 'PAYMENT_PLANS',
    actionPrefix: 'Which payment plan type interests you?',
    options: Array.from(plans).map(plan => ({
      label: plan,
      value: plan,
    })),
    multiSelect: false,
  }
}

/**
 * Get amenity category options
 */
export async function getAmenityOptions(
  projectIds?: string[]
): Promise<ContextualChip> {
  const categories = new Set<string>()

  if (projectIds?.length) {
    const dbAmenities = await prisma.amenity.findMany({
      where: { project_id: { in: projectIds } },
      select: { category: true },
      distinct: ['category'],
      take: 15,
    })
    dbAmenities.forEach(a => {
      if (a.category) categories.add(a.category)
    })
  }

  // Fallback categories
  if (categories.size === 0) {
    return {
      context: 'AMENITIES',
      actionPrefix: 'Which amenities are most important to you?',
      options: [
        { label: 'Sports & Recreation', value: 'sports' },
        { label: 'Health & Wellness', value: 'health' },
        { label: 'Green & Landscape', value: 'green' },
        { label: 'Security & Access', value: 'security' },
        { label: 'Entertainment', value: 'entertainment' },
      ],
      multiSelect: true,
    }
  }

  return {
    context: 'AMENITIES',
    actionPrefix: 'Which amenity categories interest you?',
    options: Array.from(categories)
      .filter(cat => cat && cat.length > 0)
      .map(cat => ({
        label: cat,
        value: cat.toLowerCase().replace(/\s+/g, '_'),
      })),
    multiSelect: true,
  }
}

/**
 * Get connectivity type options (metro, school, hospital, etc.)
 */
export async function getConnectivityOptions(
  projectIds?: string[]
): Promise<ContextualChip> {
  const types = new Set<string>()

  if (projectIds?.length) {
    const dbConn = await prisma.connectivity.findMany({
      where: { project_id: { in: projectIds } },
      select: { type: true },
      distinct: ['type'],
      take: 10,
    })
    dbConn.forEach(c => {
      if (c.type) types.add(c.type)
    })
  }

  // Fallback types
  if (types.size === 0) {
    return {
      context: 'CONNECTIVITY',
      actionPrefix: 'What connectivity is most important?',
      options: [
        { label: 'Metro Station', value: 'metro' },
        { label: 'Schools & Colleges', value: 'school' },
        { label: 'Hospitals', value: 'hospital' },
        { label: 'Shopping Malls', value: 'mall' },
        { label: 'Highways & Roads', value: 'highway' },
      ],
      multiSelect: true,
    }
  }

  return {
    context: 'CONNECTIVITY',
    actionPrefix: 'Which connectivity matters most?',
    options: Array.from(types)
      .filter(t => t && t.length > 0)
      .map(t => ({
        label: t,
        value: t.toLowerCase().replace(/\s+/g, '_'),
      })),
    multiSelect: true,
  }
}

/**
 * Get comparison dimension options
 */
export function getComparisonOptions(): ContextualChip {
  return {
    context: 'COMPARISON',
    actionPrefix: 'What would you like to compare?',
    options: [
      { label: 'Price & EMI', value: 'price' },
      { label: 'Amenities & Features', value: 'amenities' },
      { label: 'Location & Connectivity', value: 'connectivity' },
      { label: 'Timeline & Possession', value: 'timeline' },
      { label: 'Builder Track Record', value: 'builder' },
    ],
    multiSelect: true,
  }
}

/**
 * Get timeline/possession options
 */
export function getTimelineOptions(): ContextualChip {
  return {
    context: 'TIMELINE',
    actionPrefix: 'What possession timeline suits you?',
    options: [
      { label: 'Immediate (Ready Now)', value: 'immediate' },
      { label: 'Within 1 Year', value: '1year' },
      { label: 'Within 2 Years', value: '2year' },
      { label: '3+ Years (Open)', value: '3year+' },
    ],
    multiSelect: false,
  }
}

/**
 * Get budget range options
 */
export function getBudgetOptions(): ContextualChip {
  return {
    context: 'BUDGET',
    actionPrefix: 'What\'s your budget range?',
    options: [
      { label: 'Under ₹1 Crore', value: 'under_1cr' },
      { label: '₹1-2 Crore', value: '1cr_2cr' },
      { label: '₹2-3 Crore', value: '2cr_3cr' },
      { label: '₹3-5 Crore', value: '3cr_5cr' },
      { label: '₹5+ Crore', value: '5cr_plus' },
    ],
    multiSelect: false,
  }
}

/**
 * Get context-aware chips based on detected query
 */
export async function getContextualChips(
  message: string,
  projectIds?: string[]
): Promise<ContextualChip[]> {
  const context = detectQueryContext(message)
  const chips: ContextualChip[] = []

  switch (context) {
    case 'PAYMENT_PLANS':
      chips.push(await getPaymentPlanOptions(projectIds))
      break

    case 'AMENITIES':
      chips.push(await getAmenityOptions(projectIds))
      break

    case 'COMPARISON':
      chips.push(getComparisonOptions())
      break

    case 'CONNECTIVITY':
      chips.push(await getConnectivityOptions(projectIds))
      break

    case 'TIMELINE':
      chips.push(getTimelineOptions())
      break

    case 'BUDGET':
      chips.push(getBudgetOptions())
      break

    case 'LEGAL_RERA':
      chips.push({
        context: 'LEGAL_RERA',
        actionPrefix: 'What legal information do you need?',
        options: [
          { label: 'RERA Registration', value: 'rera' },
          { label: 'Possession Timeline', value: 'possession' },
          { label: 'Approval Status', value: 'approval' },
        ],
        multiSelect: false,
      })
      break

    case 'BUILDER_INFO':
      chips.push({
        context: 'BUILDER_INFO',
        actionPrefix: 'What about the builder?',
        options: [
          { label: 'Track Record', value: 'track_record' },
          { label: 'Delivered Projects', value: 'delivered' },
          { label: 'Litigation History', value: 'litigation' },
          { label: 'CREDAI Membership', value: 'credai' },
        ],
        multiSelect: false,
      })
      break

    default:
      // Return discovery options for unknown context
      chips.push({
        context: 'DISCOVERY',
        actionPrefix: 'How can we help you today?',
        options: [
          { label: 'Find Properties', value: 'search' },
          { label: 'Compare Options', value: 'compare' },
          { label: 'Check Payments', value: 'payments' },
          { label: 'View Amenities', value: 'amenities' },
        ],
        multiSelect: false,
      })
  }

  return chips
}
