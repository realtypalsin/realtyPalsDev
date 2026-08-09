/**
 * Phase 4 Ranking Formatter Tests
 * Verifies human-readable recommendation generation from Phase 3 scores.
 */

import { formatRankedResults, generateRecommendationSummary } from './rankingFormatter'
import { RankingResult, ProjectWithMetadata } from './scoringEngine'
import { Intent } from './types'

describe('rankingFormatter', () => {
  // Mock Phase 3 ranking result
  const mockRankedResult: RankingResult & { projectId: string; projectName: string } = {
    projectId: 'proj-001',
    projectName: 'Test Project A',
    finalScore: 85,
    dimensionScores: {
      budget: { score: 90, explanation: '₹1.35Cr within budget' },
      location: { score: 88, explanation: 'Sector 62 metro 800m' },
      timeline: { score: 75, explanation: 'Dec 2027, builder avg +6mo' },
      specs: { score: 92, explanation: '3BHK match, 72% carpet ratio' },
      builder: { score: 85, explanation: '85% on-time, no litigation' },
      legal: { score: 100, explanation: 'RERA-compliant, no flags' },
      amenities: { score: 80, explanation: 'Pool, gym, clubhouse' },
      pricing: { score: 70, explanation: '₹6.5k/sqft (sector avg 2% below)' },
      personal: { score: 82, explanation: '2.2km to top schools' },
      drivers: { score: 88, explanation: 'Strong investment potential' },
      gaps: { score: 100, explanation: 'No critical gaps identified' }
    },
    dealBreakers: []
  }

  const mockProject: ProjectWithMetadata = {
    id: 'proj-001',
    name: 'Test Project A',
    sector: '62',
    possession_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    status: 'under_construction',
    price_min_cr: 1.35,
    price_max_cr: 1.65,
    unit_types: [
      {
        bhk: 3,
        carpet_area_sqft: 1200,
        price_min_cr: 1.35,
        price_max_cr: 1.5
      }
    ],
    has_pool: true,
    has_gym: true,
    has_clubhouse: true,
    is_gated: true,
    rera_number: 'RERA-123',
    builder: {
      name: 'Prestige Constructions',
      delivery_score: 85,
      credai_member: true,
      litigation_count: 0
    },
    builderHistory: {
      onTimePercent: 85,
      avgDelayMonths: 2,
      litigationCount: 0,
      reraCompliant: true,
      financialStability: 90
    },
    nearbyMetro: {
      name: 'Sector 62 Metro',
      distance_km: 0.8
    },
    nearbySchools: [
      { name: 'Delhi Public School', distance_km: 2.2, rating: 4.2 },
      { name: 'St. Xavier School', distance_km: 2.5, rating: 4.0 }
    ]
  }

  const mockIntent: Intent = {
    bhk: [3],
    budgetMax: 1.5,
    possession: '1year',
    sector: '62',
    purpose: 'endUse',
    riskProfile: 'first_time_buyer',
    lifestyleKeywords: ['pool', 'gym', 'schools']
  }

  test('formatRankedResults returns formatted recommendations', () => {
    const result = formatRankedResults([mockRankedResult], [mockProject], mockIntent, 3)

    expect(result).toHaveLength(1)
    expect(result[0]).toBeDefined()
    expect(result[0].projectId).toBe('proj-001')
    expect(result[0].projectName).toBe('Test Project A')
  })

  test('finalScore and percentile are calculated', () => {
    const result = formatRankedResults([mockRankedResult], [mockProject], mockIntent, 3)
    const rec = result[0]

    expect(rec.finalScore).toBe(85)
    expect(rec.scorePercentile).toMatch(/Top.*match/)
  })

  test('dimensionExplanations includes all 11 dimensions', () => {
    const result = formatRankedResults([mockRankedResult], [mockProject], mockIntent, 3)
    const rec = result[0]

    expect(rec.dimensionExplanations).toHaveLength(11)

    // Check for each dimension
    const labels = rec.dimensionExplanations.map((d) => d.label)
    expect(labels).toContain('Budget fit')
    expect(labels).toContain('Location')
    expect(labels).toContain('Possession timeline')
    expect(labels).toContain('Property specs')
    expect(labels).toContain('Builder track record')
    expect(labels).toContain('Legal & compliance')
  })

  test('emojis are correctly mapped by score', () => {
    const result = formatRankedResults([mockRankedResult], [mockProject], mockIntent, 3)
    const rec = result[0]

    // Score 90 → ✅
    const budgetDim = rec.dimensionExplanations.find((d) => d.label === 'Budget fit')
    expect(budgetDim?.emoji).toBe('✅')
    expect(budgetDim?.score).toBe(90)

    // Score 75 → ⚠️
    const timelineDim = rec.dimensionExplanations.find((d) => d.label === 'Possession timeline')
    expect(timelineDim?.emoji).toBe('⚠️')
    expect(timelineDim?.score).toBe(75)
  })

  test('whyMatch contains top-scoring dimensions', () => {
    const result = formatRankedResults([mockRankedResult], [mockProject], mockIntent, 3)
    const rec = result[0]

    expect(rec.whyMatch.length).toBeGreaterThan(0)
    expect(rec.whyMatch[0]).toMatch(/✅.*Budget fit/)
  })

  test('summary is generated from top dimensions', () => {
    const result = formatRankedResults([mockRankedResult], [mockProject], mockIntent, 3)
    const rec = result[0]

    expect(rec.summary).toBeDefined()
    expect(rec.summary.length).toBeGreaterThan(0)
  })

  test('tradeOffs pairs high with low scores', () => {
    const result = formatRankedResults([mockRankedResult], [mockProject], mockIntent, 3)
    const rec = result[0]

    // Timeline (75) is lower, should pair with a high score
    if (rec.tradeOffs.length > 0) {
      const tradeOff = rec.tradeOffs[0]
      expect(tradeOff.positive).toBeDefined()
      expect(tradeOff.negative).toBeDefined()
    }
  })

  test('nextSteps are generated', () => {
    const result = formatRankedResults([mockRankedResult], [mockProject], mockIntent, 3)
    const rec = result[0]

    expect(rec.nextSteps.length).toBeGreaterThan(0)
    expect(rec.nextSteps.length).toBeLessThanOrEqual(5)
  })

  test('sorts by finalScore descending', () => {
    const result1 = mockRankedResult
    const result2 = {
      ...mockRankedResult,
      projectId: 'proj-002',
      projectName: 'Test Project B',
      finalScore: 75
    }

    const result = formatRankedResults([result1, result2], [mockProject], mockIntent, 10)

    expect(result[0].finalScore).toBeGreaterThanOrEqual(result[1].finalScore)
  })

  test('respects topN limit', () => {
    const results = [
      mockRankedResult,
      { ...mockRankedResult, projectId: 'proj-002', projectName: 'Project B', finalScore: 80 },
      { ...mockRankedResult, projectId: 'proj-003', projectName: 'Project C', finalScore: 70 }
    ]

    const formatted = formatRankedResults(results, [mockProject], mockIntent, 2)
    expect(formatted).toHaveLength(2)
  })

  test('caps topN at 10', () => {
    const results = Array.from({ length: 20 }, (_, i) => ({
      ...mockRankedResult,
      projectId: `proj-${i}`,
      projectName: `Project ${i}`,
      finalScore: 100 - i
    }))

    const formatted = formatRankedResults(results, [mockProject], mockIntent, 50)
    expect(formatted.length).toBeLessThanOrEqual(10)
  })

  test('handles empty input gracefully', () => {
    const result = formatRankedResults([], [mockProject], mockIntent, 3)
    expect(result).toEqual([])
  })

  test('includeComparison adds matrix when multiple projects', () => {
    const results = [
      mockRankedResult,
      { ...mockRankedResult, projectId: 'proj-002', projectName: 'Project B', finalScore: 80 }
    ]

    const formatted = formatRankedResults(results, [mockProject], mockIntent, 10, true)

    if (formatted.length > 1) {
      expect(formatted[0].comparisonMatrix).toBeDefined()
      expect(formatted[0].comparisonMatrix?.length).toBe(11) // 11 dimensions
    }
  })

  test('generateRecommendationSummary creates concise chat text', () => {
    const result = formatRankedResults([mockRankedResult], [mockProject], mockIntent, 3)
    const summary = generateRecommendationSummary(result)

    expect(summary).toBeDefined()
    expect(summary.length).toBeGreaterThan(0)
    expect(summary).toMatch(/Test Project A/)
  })

  test('handles deal-breakers for risk-averse users', () => {
    const resultWithBreaker: RankingResult & { projectId: string; projectName: string } = {
      ...mockRankedResult,
      dealBreakers: [
        {
          score: 0,
          explanation: 'Project has pending litigation',
          dealBreaker: true
        }
      ]
    }

    const riskAverseIntent: Intent = {
      ...mockIntent,
      riskProfile: 'risk_averse'
    }

    // Should filter out deal-breaker for risk-averse
    const result = formatRankedResults([resultWithBreaker], [mockProject], riskAverseIntent, 10)
    expect(result).toHaveLength(0)

    // Should NOT filter for first-time buyer
    const result2 = formatRankedResults([resultWithBreaker], [mockProject], mockIntent, 10)
    expect(result2.length).toBeGreaterThan(0)
    expect(result2[0].dealBreakers.length).toBeGreaterThan(0)
  })

  test('builderName is extracted from project metadata', () => {
    const result = formatRankedResults([mockRankedResult], [mockProject], mockIntent, 3)
    const rec = result[0]

    expect(rec.builderName).toBe('Prestige Constructions')
  })

  test('dimensionExplanations include weight information', () => {
    const result = formatRankedResults([mockRankedResult], [mockProject], mockIntent, 3)
    const rec = result[0]

    rec.dimensionExplanations.forEach((dim) => {
      expect(dim.weight).toBeGreaterThan(0)
      expect(dim.weight).toBeLessThanOrEqual(1)
    })

    // Weights should sum to ~1.0
    const totalWeight = rec.dimensionExplanations.reduce((sum, d) => sum + d.weight, 0)
    expect(totalWeight).toBeCloseTo(1.0, 1)
  })
})
