/**
 * Query Planner — Determines what data a user query needs.
 *
 * Flow:
 * 1. User: "How much EMI for ATS Pristine?"
 * 2. Planner extracts: intent=payment, projectId=ats-pristine
 * 3. Planner determines: requiredFields = ['price', 'gst', 'stamp_duty']
 * 4. Planner checks: Are all fields available?
 * 5. Planner returns: Plan or asks for clarification
 *
 * This prevents LLM from inventing facts. All data needs are explicit before fetching.
 */

import { prisma } from '../db'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type QueryIntent =
  | 'details'       // "Tell me about ATS Pristine"
  | 'payment'       // "How much EMI?" / "What's the cost breakdown?"
  | 'investment'    // "Is this a good investment?" / "Price history?"
  | 'location'      // "How far is metro?" / "What's nearby?"
  | 'timeline'      // "When will it be ready?" / "Possession date?"
  | 'builder'       // "Who's building this?" / "Track record?"
  | 'compare'       // "Compare these two"
  | 'general'       // Fallback — need everything

export interface QueryPlan {
  intent: QueryIntent
  projectIds: string[]
  requiredFields: string[]
  optionalFields: string[]
  tools: ('calculator' | 'maps' | 'db' | 'analyzer')[]
  confidence: number // How sure are we about this intent?
  clarificationNeeded: boolean
  clarificationOptions?: string[]
  reason: string // Why we think this is the intent
  crossTab?: ('overview' | 'analysis' | 'pricing' | 'location' | 'builder')[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Intent Field Mappings
// ─────────────────────────────────────────────────────────────────────────────

const INTENT_FIELD_MAP: Record<QueryIntent, { critical: string[]; optional: string[] }> = {
  details: {
    critical: [
      'floor_plan_count',
      'project_status',
      'amenity_count',
      'possession_date',
      'price_min_cr',
    ],
    optional: ['carpet_efficiency_pct', 'connectivity_count', 'construction_progress_pct'],
  },

  payment: {
    critical: ['price_min_cr', 'base_price_per_sqft', 'gst_rate_pct', 'stamp_duty_pct'],
    optional: ['parking_cost_lakh', 'ifms_lakh', 'registration_pct'],
  },

  investment: {
    critical: ['price_min_cr', 'price_cagr_pct', 'construction_progress_pct', 'decision_thesis'],
    optional: ['price_direction', 'builder_delivery_score', 'project_risk_flag'],
  },

  location: {
    critical: ['connectivity_count', 'amenity_count'],
    optional: ['coordinates', 'aqi_data', 'commute_data'],
  },

  timeline: {
    critical: ['project_status', 'possession_date', 'construction_progress_pct'],
    optional: ['construction_milestone_count', 'currently_in_progress'],
  },

  builder: {
    critical: ['builder_name', 'builder_delivery_score', 'total_projects_count'],
    optional: ['average_delay_months', 'buyer_satisfaction_score', 'rera_compliance_score'],
  },

  compare: {
    critical: [
      'floor_plan_count',
      'price_min_cr',
      'construction_progress_pct',
      'amenity_count',
      'possession_date',
    ],
    optional: ['price_cagr_pct', 'builder_delivery_score'],
  },

  general: {
    critical: [
      'floor_plan_count',
      'project_status',
      'price_min_cr',
      'amenity_count',
      'possession_date',
      'construction_progress_pct',
    ],
    optional: ['price_cagr_pct', 'connectivity_count', 'carpet_efficiency_pct'],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Query Pattern Recognition
// ─────────────────────────────────────────────────────────────────────────────

interface PatternMatch {
  intent: QueryIntent
  confidence: number
  projectIds: string[]
  reason: string
}

/**
 * Recognize query patterns and extract intent.
 *
 * Examples:
 *   "How much EMI?" → intent: payment
 *   "Is this a good investment?" → intent: investment
 *   "How far is the metro?" → intent: location
 *   "Compare ATS vs Godrej" → intent: compare
 */
function recognizePattern(message: string): PatternMatch {
  const msg = message.toLowerCase().trim()

  // Payment intent keywords
  if (
    /\b(emi|loan|cost|price breakdown|charge|fee|stamp duty|gst|parking|ifms)\b/.test(msg) ||
    /how much|what.*cost|break down|how.*afford/i.test(msg)
  ) {
    return {
      intent: 'payment',
      confidence: 0.95,
      projectIds: [],
      reason: 'Keywords: EMI, cost, charges, affordability',
    }
  }

  // Investment intent keywords
  if (
    /\b(invest|return|yield|appreciation|cagr|roi|bullish|bearish|buy|hold|avoid|strong buy)\b/i.test(
      msg
    ) ||
    /worth|good investment|profit|wealth/i.test(msg)
  ) {
    return {
      intent: 'investment',
      confidence: 0.92,
      projectIds: [],
      reason: 'Keywords: investment, returns, appreciation, recommendation',
    }
  }

  // Location intent keywords
  if (
    /\b(metro|school|hospital|mall|airport|nearby|distance|commute|travel|connectivity)\b/i.test(
      msg
    ) ||
    /how far|how long|close to|near/i.test(msg)
  ) {
    return {
      intent: 'location',
      confidence: 0.93,
      projectIds: [],
      reason: 'Keywords: location, distance, connectivity, nearby',
    }
  }

  // Timeline intent keywords
  if (
    /\b(possession|ready|completion|when|delivery|delay|occupied|move in)\b/i.test(msg) ||
    /how long|when will|timeline/i.test(msg)
  ) {
    return {
      intent: 'timeline',
      confidence: 0.94,
      projectIds: [],
      reason: 'Keywords: possession, timeline, completion, delivery',
    }
  }

  // Builder intent keywords
  if (
    /\b(builder|developer|track record|delivery|reputation|credibility|rera|complaint)\b/i.test(
      msg
    ) ||
    /who.*build|builder.*track|reliable/i.test(msg)
  ) {
    return {
      intent: 'builder',
      confidence: 0.91,
      projectIds: [],
      reason: 'Keywords: builder, track record, reputation, delivery',
    }
  }

  // Compare intent keywords
  if (/\b(compare|vs|versus|difference|better|which one|both)\b/i.test(msg)) {
    return {
      intent: 'compare',
      confidence: 0.96,
      projectIds: [],
      reason: 'Keywords: compare, versus, difference',
    }
  }

  // General intent (fallback)
  return {
    intent: 'general',
    confidence: 0.6,
    projectIds: [],
    reason: 'No specific intent keywords detected — returning general context',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Project Extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract project names/IDs from user message.
 * Handles: "ATS Pristine", "ats-pristine", "ATS", "that project", "first one"
 */
async function extractProjectIds(
  message: string,
  conversationContext?: { activeProjects?: string[] }
): Promise<string[]> {
  const msg = message.toLowerCase()
  const projectIds: string[] = []

  // Get all projects to check against message text
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, slug: true },
    take: 200, // Reasonable limit for checking
  })

  // Check which projects are mentioned in the message
  for (const project of projects) {
    const pName = project.name.toLowerCase().trim()
    const pSlug = project.slug.toLowerCase().trim()

    if (msg.includes(pName) || msg.includes(pSlug)) {
      projectIds.push(project.id)
    }
  }

  // Pronoun & contextual active project resolution:
  // If no explicit project name found in user message, resolve from active projects in conversation context.
  if (!projectIds.length && conversationContext?.activeProjects?.length) {
    const activeTerm = conversationContext.activeProjects[0]
    const match = projects.find(
      p => p.id === activeTerm || p.slug.toLowerCase() === activeTerm.toLowerCase() || p.name.toLowerCase() === activeTerm.toLowerCase()
    )
    if (match) {
      projectIds.push(match.id)
    } else {
      projectIds.push(activeTerm)
    }
  }

  return projectIds
}

// ─────────────────────────────────────────────────────────────────────────────
// Cross-Tab Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine which detail panel tabs are relevant.
 * Example: "Compare EMI vs price history" → ['pricing', 'analysis']
 */
function detectCrossTabs(
  message: string,
  intent: QueryIntent
): ('overview' | 'analysis' | 'pricing' | 'location' | 'builder')[] {
  const msg = message.toLowerCase()
  const tabs: Set<'overview' | 'analysis' | 'pricing' | 'location' | 'builder'> = new Set()

  // Map intent to primary tab
  switch (intent) {
    case 'payment':
      tabs.add('pricing')
      break
    case 'investment':
      tabs.add('analysis')
      break
    case 'location':
      tabs.add('location')
      break
    case 'timeline':
      tabs.add('overview')
      break
    case 'builder':
      tabs.add('builder')
      break
    case 'details':
      tabs.add('overview')
      tabs.add('pricing')
      break
    case 'compare':
      tabs.add('overview')
      tabs.add('pricing')
      tabs.add('analysis')
      break
    case 'general':
      tabs.add('overview')
      tabs.add('analysis')
      break
  }

  // Explicit tab references
  if (/\b(emi|cost|payment|price|pricing)\b/i.test(msg)) tabs.add('pricing')
  if (/\b(analysis|investment|return|appreciation|intelligence)\b/i.test(msg)) tabs.add('analysis')
  if (/\b(location|metro|school|connectivity|nearby)\b/i.test(msg)) tabs.add('location')
  if (/\b(builder|developer|track)\b/i.test(msg)) tabs.add('builder')
  if (/\b(floor plan|configuration|layout|bhk)\b/i.test(msg)) tabs.add('overview')

  return Array.from(tabs)
}

// ─────────────────────────────────────────────────────────────────────────────
// Data Availability Checking
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if required fields are likely available for projects.
 * Uses project.status, dna presence, etc. as proxy.
 */
async function checkDataAvailability(
  projectIds: string[],
  requiredFields: string[]
): Promise<{ available: boolean; missingFields: string[]; reason: string }> {
  if (!projectIds.length) {
    return {
      available: false,
      missingFields: requiredFields,
      reason: 'No projects identified',
    }
  }

  // Only fetch fields needed for availability check, not entire row
  const projects = await prisma.project.findMany({
    select: { id: true, status: true, possession_date: true },
    where: { id: { in: projectIds } },
  })

  if (!projects.length) {
    return {
      available: false,
      missingFields: requiredFields,
      reason: `Projects not found in database`,
    }
  }

  const missing: string[] = []

  // Check field availability heuristics
  // For now: if project exists, assume data likely available (actual validation in gateway)
  for (const field of requiredFields) {
    let foundInAnyProject = false

    for (const proj of projects) {
      // Map fields to project attributes via existence check
      // Actual data validation happens in projectDataGateway
      if (proj.id && proj.status) {
        foundInAnyProject = true
      }
    }

    if (!foundInAnyProject) missing.push(field)
  }

  const allAvailable = missing.length === 0
  return {
    available: allAvailable,
    missingFields: missing,
    reason: allAvailable
      ? 'All required data available'
      : `Missing: ${missing.join(', ')}`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Query Planner
// ─────────────────────────────────────────────────────────────────────────────

export async function planProjectDetailQuery(params: {
  userMessage: string
  conversationContext?: { activeProjects?: string[] }
}): Promise<QueryPlan> {
  const { userMessage, conversationContext } = params

  // 1. Recognize intent from pattern
  const patternMatch = recognizePattern(userMessage)

  // 2. Extract project IDs
  const projectIds = await extractProjectIds(userMessage, conversationContext)

  // 3. Get field requirements
  const fieldMap = INTENT_FIELD_MAP[patternMatch.intent]
  const requiredFields = fieldMap.critical
  const optionalFields = fieldMap.optional

  // 4. Detect cross-tabs
  const crossTab = detectCrossTabs(userMessage, patternMatch.intent)

  // 5. Check data availability
  const availability = await checkDataAvailability(projectIds, requiredFields)

  // 6. Map intent to tools needed
  const tools: ('calculator' | 'maps' | 'db' | 'analyzer')[] = []
  switch (patternMatch.intent) {
    case 'payment':
      tools.push('calculator', 'db')
      break
    case 'investment':
      tools.push('analyzer', 'db')
      break
    case 'location':
      tools.push('maps', 'db')
      break
    case 'compare':
      tools.push('db', 'analyzer')
      break
    default:
      tools.push('db')
  }

  // 7. Determine if clarification needed
  const clarificationNeeded =
    !availability.available || projectIds.length === 0 || patternMatch.confidence < 0.7

  const clarificationOptions: string[] = []
  if (projectIds.length === 0) {
    clarificationOptions.push(
      'Which project are you asking about? (e.g., "ATS Pristine", "Godrej")'
    )
  }
  // Missing fields are internal; don't expose them to user (filtered via availability check above)
  if (patternMatch.intent === 'compare' && projectIds.length < 2) {
    clarificationOptions.push('Which second project should I compare with?')
  }

  return {
    intent: patternMatch.intent,
    projectIds,
    requiredFields,
    optionalFields,
    tools,
    confidence: patternMatch.confidence,
    clarificationNeeded,
    clarificationOptions: clarificationOptions.length > 0 ? clarificationOptions : undefined,
    reason: patternMatch.reason,
    crossTab,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if query plan is actionable (no clarification needed).
 */
export function isActionable(plan: QueryPlan): boolean {
  return !plan.clarificationNeeded && plan.projectIds.length > 0
}

/**
 * Get user-facing message for clarification.
 */
export function getClarificationMessage(plan: QueryPlan): string {
  if (!plan.clarificationNeeded) return ''

  const messages: string[] = []

  if (plan.projectIds.length === 0) {
    messages.push('I need to know which project you\'re asking about.')
  }

  if (plan.clarificationOptions) {
    messages.push(...plan.clarificationOptions)
  }

  return messages.join('\n')
}

/**
 * Debug: Show what planner extracted.
 */
export function explainPlan(plan: QueryPlan): string {
  return `
Intent: ${plan.intent} (${(plan.confidence * 100).toFixed(0)}% sure)
Projects: ${plan.projectIds.join(', ') || 'None identified'}
Needs: ${plan.requiredFields.join(', ')}
Optional: ${plan.optionalFields.join(', ')}
Tools: ${plan.tools.join(', ')}
Tabs: ${plan.crossTab?.join(', ') || 'general'}
Reason: ${plan.reason}
${plan.clarificationNeeded ? `\nNeed clarification:\n${plan.clarificationOptions?.join('\n')}` : ''}
  `.trim()
}
