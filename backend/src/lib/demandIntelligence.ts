import { prisma } from './db'

const MIN_SAMPLE_SIZE = 10 // k-anonymity floor

interface PriceElasticity {
  yourEntry: number
  searchBelowBudget: number // searches with max < your entry
  searchAboveBudget: number // searches with max >= your entry
  opportunityGap: number // searches between your entry and next tier
}

interface DemandAnalysis {
  projectId: string
  projectName: string
  period: { start: string; end: string }

  // Demand signals
  totalSearchesMatched: number
  avgBudgetMin: number | null
  avgBudgetMax: number | null
  topBhkDemand: Array<{ bhk: number; count: number; pct: number }>

  // Price elasticity
  priceElasticity?: PriceElasticity

  // Product mix
  productMixDemand: Array<{ type: string; demand: number; pct: number }>
  yourInventory: Array<{ type: string; units: number }>
  productGap?: string

  // Win/loss analysis
  winRate: number // conversions / searches
  loseToCompetitors: Array<{ competitor: string; lossCount: number }>

  // Unanswered questions (top query patterns not addressed in project info)
  unansweredQuestions: Array<{ question: string; frequency: number }>

  // Quality signals
  kAnonymityMet: boolean
  sampleSize: number
}

export async function analyzeProjectDemand(projectId: string): Promise<DemandAnalysis | null> {
  const now = new Date()
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Fetch the project
  const project = await prisma.project.findUnique({
    where: { slug: projectId },
  })

  if (!project) return null

  // Find all searches that matched this project
  const matchingQueries = await prisma.queryMetrics.findMany({
    where: {
      sector: project.sector || undefined,
      created_at: { gte: oneMonthAgo },
    },
  })

  const sampleSize = matchingQueries.length

  // If below k-anonymity, suppress details
  if (sampleSize < MIN_SAMPLE_SIZE) {
    return {
      projectId,
      projectName: project.name,
      period: { start: oneMonthAgo.toISOString(), end: now.toISOString() },
      totalSearchesMatched: sampleSize,
      avgBudgetMin: null,
      avgBudgetMax: null,
      topBhkDemand: [],
      productMixDemand: [],
      yourInventory: [],
      winRate: 0,
      loseToCompetitors: [],
      unansweredQuestions: [],
      kAnonymityMet: false,
      sampleSize,
    }
  }

  // Aggregate budget data
  const budgets = matchingQueries
    .map((q) => ({ min: q.budget_min_cr, max: q.budget_max_cr }))
    .filter((b) => b.min || b.max)

  const avgBudgetMin = budgets.length > 0 ? budgets.reduce((sum, b) => sum + (b.min || 0), 0) / budgets.length : null
  const avgBudgetMax = budgets.length > 0 ? budgets.reduce((sum, b) => sum + (b.max || 0), 0) / budgets.length : null

  // Top BHK demand
  const bhkCounts = new Map<number, number>()
  matchingQueries.forEach((q) => {
    if (q.bhk) {
      bhkCounts.set(q.bhk, (bhkCounts.get(q.bhk) || 0) + 1)
    }
  })

  const topBhkDemand = Array.from(bhkCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([bhk, count]) => ({
      bhk,
      count,
      pct: (count / sampleSize) * 100,
    }))

  // Conversions (callback requests for this project)
  const conversions = await prisma.callbackRequest.count({
    where: { project_slug: projectId },
  })

  const winRate = (conversions / sampleSize) * 100

  // Unanswered questions - extract common patterns from queries
  const queryTexts = matchingQueries.map((q) => q.query_text || '').filter(Boolean)

  const questionPatterns = extractCommonQuestions(queryTexts)

  return {
    projectId,
    projectName: project.name,
    period: { start: oneMonthAgo.toISOString(), end: now.toISOString() },

    totalSearchesMatched: sampleSize,
    avgBudgetMin: avgBudgetMin || null,
    avgBudgetMax: avgBudgetMax || null,
    topBhkDemand,

    productMixDemand: inferProductMix(topBhkDemand),
    yourInventory: [], // Would need to fetch from ProjectUnitType

    winRate,
    loseToCompetitors: [], // Would need competitive data

    unansweredQuestions: questionPatterns.slice(0, 5),

    kAnonymityMet: sampleSize >= MIN_SAMPLE_SIZE,
    sampleSize,
  }
}

function extractCommonQuestions(texts: string[]): Array<{ question: string; frequency: number }> {
  const patterns = [
    { pattern: /possession|ready|when|launch/i, question: '📅 When is possession?' },
    { pattern: /school|education|kids|family/i, question: '🏫 Which schools are nearby?' },
    { pattern: /metro|transport|commute/i, question: '🚇 How far from metro?' },
    { pattern: /price|cost|rate|per sqft/i, question: '💰 Exact pricing?' },
    { pattern: /payment|plan|emi|loan/i, question: '💳 Payment plan options?' },
    { pattern: /rera|legal|dispute|safe/i, question: '⚖️ Is this RERA registered?' },
    { pattern: /oc|completion|hand/i, question: '✓ When is handover?' },
    { pattern: /size|sqft|carpet|buildup/i, question: '📐 Exact unit size?' },
    { pattern: /amenity|gym|pool|park/i, question: '🏊 What amenities are included?' },
    { pattern: /site visit|office|contact|call/i, question: '📞 Can I visit the site?' },
  ]

  const matches = new Map<string, number>()

  texts.forEach((text) => {
    patterns.forEach(({ pattern, question }) => {
      if (pattern.test(text)) {
        matches.set(question, (matches.get(question) || 0) + 1)
      }
    })
  })

  return Array.from(matches.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([question, frequency]) => ({ question, frequency }))
}

function inferProductMix(bhkDemand: Array<{ bhk: number; count: number; pct: number }>) {
  return bhkDemand.map(({ bhk, pct }) => ({
    type: `${bhk} BHK`,
    demand: bhk,
    pct: pct,
  }))
}

export async function getDemandSnapshot(): Promise<{ sectors: any[]; builders: any[] }> {
  // High-level demand by sector
  const sectorDemand = await prisma.queryMetrics.groupBy({
    by: ['sector'],
    _count: true,
    where: {
      created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
    },
  })

  // Top searched builders
  const builderDemand = await prisma.queryMetrics.groupBy({
    by: ['builder'],
    _count: true,
    where: {
      created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      builder: { not: null },
    },
  })

  return {
    sectors: (sectorDemand as any[]).slice(0, 10),
    builders: (builderDemand as any[]).slice(0, 10),
  }
}
