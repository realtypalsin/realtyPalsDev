import { prisma } from './db'

export interface JourneyEvent {
  timestamp: Date
  type: 'search' | 'view' | 'save' | 'compare' | 'download' | 'action'
  projectName?: string
  projectSlug?: string
  query?: string
  action?: string
  details?: Record<string, any>
}

export interface Objection {
  projectSlug: string
  projectName: string
  reason: string
  messageIndex?: number
  quote?: string
  timestamp: Date
}

export interface FinancingProfile {
  loanPreApproved: boolean
  emiQuestionCount: number
  costSheetViews: number
  stampDutyQueries: number
  affordabilityFocus: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface EngagementMetrics {
  totalMessages: number
  totalSessionTime: number
  messageVelocity: 'ACCELERATING' | 'STEADY' | 'COOLING'
  depthAnalysis: {
    browsing: number // < 2min
    evaluation: number // 2-7min
    deepDive: number // > 7min
  }
  sessionCount: number
  timeToFirstSave: number | null
}

export interface LeadDossier {
  // Lead basics
  id: string
  name: string
  phone: string
  projectName: string
  projectSlug: string
  createdAt: Date

  // Buyer profile
  buyerArchetype: 'nri' | 'retiree' | 'risk_averse' | 'first_time_buyer' | 'standard'
  purpose: 'endUse' | 'investment' | 'unknown'
  familyStage: 'single' | 'family_with_kids' | 'planning_kids' | 'unknown'
  workLocation?: string
  timeline?: {
    months: number
    urgency: 'URGENT' | 'MODERATE' | 'EXPLORING'
  }

  // Budget & intent
  budgetMin: number | null
  budgetMax: number | null
  budgetFlexibility: 'LOW' | 'MEDIUM' | 'HIGH'
  bhkPreference: number[]
  lifestyleSignals: string[]

  // Financing
  financing: FinancingProfile

  // Engagement
  engagement: EngagementMetrics

  // Journey
  journeyTimeline: JourneyEvent[]

  // Objections & rejections
  objections: Objection[]
  rejectedProjects: Array<{
    slug: string
    name: string
    viewCount: number
  }>

  // Conversion signals
  conversionSignals: {
    saved: number
    compared: number
    callbackRequested: boolean
    siteVisitRequested: boolean
  }

  // Recommended action
  recommendedAction?: {
    type: 'send_payment_plan' | 'send_finance_preapproval' | 'show_construction_proof' | 'show_commute_data' | 'rera_clarity'
    reason: string
    priority: 'HIGH' | 'MEDIUM'
  }
}

export async function buildLeadDossier(leadId: string, builderId: string): Promise<LeadDossier | null> {
  // Fetch callback request (the lead)
  const lead = await prisma.callbackRequest.findUnique({
    where: { id: leadId },
  })

  if (!lead) return null

  // Fetch chat session(s) associated with this lead
  // Try to find by guest_token first (most reliable before source_session field is migrated)
  let primarySession = lead.guest_token
    ? await prisma.chatSession.findFirst({
        where: { guest_token: lead.guest_token },
        include: {
          messages: {
            orderBy: { created_at: 'asc' },
          },
        },
      })
    : null

  // Fallback: try to find any session for this user
  if (!primarySession && lead.user_id) {
    const sessions = await prisma.chatSession.findMany({
      where: {
        messages: {
          some: {
            /* empty - just to get sessions with messages */
          },
        },
      },
      include: {
        messages: {
          orderBy: { created_at: 'asc' },
        },
      },
      take: 1,
    })
    primarySession = sessions[0] || null
  }

  if (!primarySession) {
    // No session found, return minimal dossier
    return buildMinimalDossier(lead)
  }

  const sessionId = primarySession.id
  const sessionMessages = primarySession.messages || []

  // Fetch property events for this session
  const propertyEvents = await prisma.propertyEvent.findMany({
    where: { session_id: sessionId },
    orderBy: { created_at: 'asc' },
  })

  // Fetch query metrics for this session
  const queryMetrics = await prisma.queryMetrics.findMany({
    where: { session_id: sessionId },
    orderBy: { created_at: 'asc' },
  })

  // Fetch user memory if user is authenticated
  const userMemory = lead.user_id
    ? await prisma.userMemory.findUnique({
        where: { user_id: lead.user_id },
      })
    : null

  // Extract intent from chat messages
  const intents = sessionMessages
    .map((m) => (m.intent_snapshot as any) || {})
    .filter((i) => Object.keys(i).length > 0)
  const lastIntent = intents[intents.length - 1] || {}

  // Build journey timeline
  const journeyTimeline = buildJourneyTimeline(propertyEvents, queryMetrics, sessionMessages)

  // Extract objections from rejected projects
  const objections = extractObjections(userMemory?.rejected_slugs || [], primarySession.messages)

  // Calculate engagement metrics
  const engagementMetrics = calculateEngagementMetrics(
    propertyEvents,
    sessionMessages,
    primarySession.created_at
  )

  // Calculate financing profile
  const financingProfile = analyzeFinancingFocus(sessionMessages, queryMetrics)

  // Build budget flexibility analysis
  const budgetFlexibility = analyzeBudgetFlexibility(intents)

  // Determine buyer archetype
  const buyerArchetype = (lastIntent.riskProfile as any) || 'standard'

  // Extract recommended action
  const recommendedAction = deriveRecommendedAction(objections, financingProfile, lastIntent)

  // Conversion signals
  const conversionSignals = {
    saved: propertyEvents.filter((e) => e.action === 'save').length,
    compared: propertyEvents.filter((e) => e.action === 'compare').length,
    callbackRequested: !!lead,
    siteVisitRequested: false, // Would need to check SiteVisitRequest table
  }

  return {
    id: leadId,
    name: lead.name,
    phone: lead.phone,
    projectName: lead.project_name || '',
    projectSlug: lead.project_slug || '',
    createdAt: lead.created_at,

    buyerArchetype,
    purpose: (lastIntent.purpose as any) || 'unknown',
    familyStage: inferFamilyStage(lastIntent),
    workLocation: userMemory?.work_location || undefined,
    timeline: userMemory?.timeline_months
      ? {
          months: userMemory.timeline_months,
          urgency: deriveUrgency(userMemory.timeline_months),
        }
      : undefined,

    budgetMin: lead.budget_min_cr,
    budgetMax: lead.budget_max_cr,
    budgetFlexibility,
    bhkPreference: lastIntent.bhk || (userMemory?.bhk_preference ? [userMemory.bhk_preference] : []),
    lifestyleSignals: lastIntent.lifestyleKeywords || [],

    financing: financingProfile,
    engagement: engagementMetrics,
    journeyTimeline,
    objections,

    rejectedProjects: (userMemory?.rejected_slugs || []).map((slug) => ({
      slug,
      name: slug,
      viewCount: propertyEvents.filter((e) => e.project_id === slug).length,
    })),

    conversionSignals,
    recommendedAction,
  }
}

function buildMinimalDossier(lead: any): LeadDossier {
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    projectName: lead.project_name || '',
    projectSlug: lead.project_slug || '',
    createdAt: lead.created_at,

    buyerArchetype: 'standard',
    purpose: 'unknown',
    familyStage: 'unknown',

    budgetMin: lead.budget_min_cr,
    budgetMax: lead.budget_max_cr,
    budgetFlexibility: 'MEDIUM',
    bhkPreference: [],
    lifestyleSignals: [],

    financing: {
      loanPreApproved: lead.loan_pre_approved || false,
      emiQuestionCount: 0,
      costSheetViews: 0,
      stampDutyQueries: 0,
      affordabilityFocus: 'MEDIUM',
    },
    engagement: {
      totalMessages: 0,
      totalSessionTime: 0,
      messageVelocity: 'STEADY',
      depthAnalysis: { browsing: 0, evaluation: 0, deepDive: 0 },
      sessionCount: 0,
      timeToFirstSave: null,
    },
    journeyTimeline: [],
    objections: [],
    rejectedProjects: [],
    conversionSignals: {
      saved: 0,
      compared: 0,
      callbackRequested: true,
      siteVisitRequested: false,
    },
  }
}

function buildJourneyTimeline(
  propertyEvents: any[],
  queryMetrics: any[],
  messages: any[]
): JourneyEvent[] {
  const events: JourneyEvent[] = []

  // Add query events
  queryMetrics.forEach((q) => {
    events.push({
      timestamp: q.created_at,
      type: 'search',
      query: q.query_text,
      details: {
        resultsCount: q.results_count,
        hadResults: q.had_results,
      },
    })
  })

  // Add property events
  propertyEvents.forEach((e) => {
    const eventType: 'view' | 'save' | 'compare' | 'download' | 'action' =
      e.action === 'save'
        ? 'save'
        : e.action === 'compare'
          ? 'compare'
          : e.action === 'brochure'
            ? 'download'
            : e.action === 'view'
              ? 'view'
              : 'action'

    events.push({
      timestamp: e.created_at,
      type: eventType,
      projectSlug: e.project_id,
      action: e.action,
    })
  })

  // Sort by timestamp
  events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  return events
}

function extractObjections(rejectedSlugs: string[], messages: any[]): Objection[] {
  // For now, return empty — would need to implement rejection reason extraction
  // This is where Phase 2 (Gemini classification) gets added
  return []
}

function calculateEngagementMetrics(propertyEvents: any[], messages: any[], sessionStart: Date): EngagementMetrics {
  const timeSpent = propertyEvents.length > 0
    ? (new Date(propertyEvents[propertyEvents.length - 1].created_at).getTime() - sessionStart.getTime()) / 1000
    : 0

  // Infer depth from property event durations (very rough heuristic)
  const depths = { browsing: 0, evaluation: 0, deepDive: 0 }

  // Velocity: compare message frequency across time windows
  const velocity = messages.length > 10 ? 'ACCELERATING' : messages.length > 3 ? 'STEADY' : 'COOLING'

  // Time to first save
  const firstSave = propertyEvents.find((e) => e.action === 'save')
  const timeToFirstSave = firstSave ? (new Date(firstSave.created_at).getTime() - sessionStart.getTime()) / 1000 : null

  return {
    totalMessages: messages.length,
    totalSessionTime: timeSpent,
    messageVelocity: velocity as any,
    depthAnalysis: depths,
    sessionCount: 1,
    timeToFirstSave,
  }
}

function analyzeFinancingFocus(messages: any[], queryMetrics: any[]): FinancingProfile {
  const messageText = messages.map((m) => m.content).join(' ').toLowerCase()

  const emiMentions = (messageText.match(/emi|equated monthly|loan|affordab/gi) || []).length
  const costSheetMentions = (messageText.match(/cost sheet|price|payment plan/gi) || []).length
  const stampDutyMentions = (messageText.match(/stamp duty|registration|tax/gi) || []).length

  const totalFinanceQuestions = emiMentions + costSheetMentions + stampDutyMentions

  return {
    loanPreApproved: false, // Would come from profile
    emiQuestionCount: emiMentions,
    costSheetViews: costSheetMentions,
    stampDutyQueries: stampDutyMentions,
    affordabilityFocus: totalFinanceQuestions > messages.length * 0.3 ? 'HIGH' : totalFinanceQuestions > 2 ? 'MEDIUM' : 'LOW',
  }
}

function analyzeBudgetFlexibility(intents: any[]): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (intents.length < 2) return 'MEDIUM'

  const budgets = intents
    .map((i) => ({ min: i.budgetMin, max: i.budgetMax }))
    .filter((b) => b.min || b.max)

  if (budgets.length < 2) return 'MEDIUM'

  // If budget range expanded, they're flexible
  const firstBudget = budgets[0]
  const lastBudget = budgets[budgets.length - 1]

  const expansion = ((lastBudget.max || 0) - (firstBudget.max || 0)) / (firstBudget.max || 1)

  return expansion > 0.2 ? 'HIGH' : expansion < -0.1 ? 'LOW' : 'MEDIUM'
}

function inferFamilyStage(intent: any): 'single' | 'family_with_kids' | 'planning_kids' | 'unknown' {
  const keywords = (intent.lifestyleKeywords || []) as string[]
  const hasSchools = keywords.includes('school')
  const hasPlayground = keywords.includes('playground')

  if (hasSchools || hasPlayground) return 'family_with_kids'
  return 'unknown'
}

function deriveUrgency(months: number): 'URGENT' | 'MODERATE' | 'EXPLORING' {
  if (months <= 3) return 'URGENT'
  if (months <= 12) return 'MODERATE'
  return 'EXPLORING'
}

function deriveRecommendedAction(
  objections: Objection[],
  financing: FinancingProfile,
  intent: any
): any {
  // Heuristic: if many EMI questions, send payment plan
  if (financing.emiQuestionCount > 3) {
    return {
      type: 'send_payment_plan',
      reason: 'Buyer asked about affordability multiple times',
      priority: 'HIGH',
    }
  }

  // If possession concerns, show construction proof
  if (objections.some((o) => o.reason.includes('possession'))) {
    return {
      type: 'show_construction_proof',
      reason: 'Buyer concerned about possession timeline',
      priority: 'HIGH',
    }
  }

  return {
    type: 'send_finance_preapproval',
    reason: 'Default follow-up for qualified lead',
    priority: 'MEDIUM',
  }
}
