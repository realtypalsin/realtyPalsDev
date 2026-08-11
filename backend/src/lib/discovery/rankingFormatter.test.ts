import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatRankedResults, generateRecommendationSummary } from './rankingFormatter'
import { RankingResult, ProjectWithMetadata } from './scoringEngine'
import { Intent } from './types'

describe('rankingFormatter', () => {
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
    possession_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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

  it('formatRankedResults returns formatted recommendations', () => {
    const result = formatRankedResults([mockRankedResult], [mockProject], mockIntent, 3)

    assert.equal(result.length, 1)
    assert.ok(result[0])
    assert.equal(result[0].projectId, 'proj-001')
    assert.equal(result[0].projectName, 'Test Project A')
  })

  it('finalScore and percentile are calculated', () => {
    const result = formatRankedResults([mockRankedResult], [mockProject], mockIntent, 3)
    const rec = result[0]

    assert.equal(rec.finalScore, 85)
    assert(rec.scorePercentile.includes('match') || rec.scorePercentile.length > 0)
  })

  it('dimensionExplanations includes all 11 dimensions', () => {
    const result = formatRankedResults([mockRankedResult], [mockProject], mockIntent, 3)
    const rec = result[0]

    assert.equal(rec.dimensionExplanations.length, 11)

    const labels = rec.dimensionExplanations.map((d) => d.label)
    assert(labels.includes('Budget fit'))
    assert(labels.includes('Location'))
    assert(labels.includes('Possession timeline'))
    assert(labels.includes('Property specs'))
    assert(labels.includes('Builder track record'))
    assert(labels.includes('Legal & compliance'))
  })

  it('emojis are correctly mapped by score', () => {
    const result = formatRankedResults([mockRankedResult], [mockProject], mockIntent, 3)
    const rec = result[0]

    const budgetDim = rec.dimensionExplanations.find((d) => d.label === 'Budget fit')
    assert.equal(budgetDim?.emoji, '✅')
    assert.equal(budgetDim?.score, 90)

    const timelineDim = rec.dimensionExplanations.find((d) => d.label === 'Possession timeline')
    assert.equal(timelineDim?.emoji, '⚠️')
    assert.equal(timelineDim?.score, 75)
  })

  it('whyMatch contains top-scoring dimensions', () => {
    const result = formatRankedResults([mockRankedResult], [mockProject], mockIntent, 3)
    const rec = result[0]

    assert(rec.whyMatch.length > 0)
    assert(rec.whyMatch[0].includes('Budget fit'))
  })

  it('summary is generated from top dimensions', () => {
    const result = formatRankedResults([mockRankedResult], [mockProject], mockIntent, 3)
    const rec = result[0]

    assert.ok(rec.summary)
    assert(rec.summary.length > 0)
  })

  it('tradeOffs pairs high with low scores', () => {
    const result = formatRankedResults([mockRankedResult], [mockProject], mockIntent, 3)
    const rec = result[0]

    if (rec.tradeOffs.length > 0) {
      const tradeOff = rec.tradeOffs[0]
      assert.ok(tradeOff.positive)
      assert.ok(tradeOff.negative)
    }
  })

  it('nextSteps are generated', () => {
    const result = formatRankedResults([mockRankedResult], [mockProject], mockIntent, 3)
    const rec = result[0]

    assert(rec.nextSteps.length > 0)
    assert(rec.nextSteps.length <= 5)
  })

  it('sorts by finalScore descending', () => {
    const result1 = mockRankedResult
    const result2 = {
      ...mockRankedResult,
      projectId: 'proj-002',
      projectName: 'Test Project B',
      finalScore: 75
    }

    const result = formatRankedResults([result1, result2], [mockProject], mockIntent, 10)

    assert(result[0].finalScore >= result[1].finalScore)
  })

  it('respects topN limit', () => {
    const results = [
      mockRankedResult,
      { ...mockRankedResult, projectId: 'proj-002', projectName: 'Project B', finalScore: 80 },
      { ...mockRankedResult, projectId: 'proj-003', projectName: 'Project C', finalScore: 70 }
    ]

    const formatted = formatRankedResults(results, [mockProject], mockIntent, 2)
    assert.equal(formatted.length, 2)
  })

  it('caps topN at 10', () => {
    const results = Array.from({ length: 20 }, (_, i) => ({
      ...mockRankedResult,
      projectId: `proj-${i}`,
      projectName: `Project ${i}`,
      finalScore: 100 - i
    }))

    const formatted = formatRankedResults(results, [mockProject], mockIntent, 50)
    assert(formatted.length <= 10)
  })

  it('handles empty input gracefully', () => {
    const result = formatRankedResults([], [mockProject], mockIntent, 3)
    assert.deepEqual(result, [])
  })

  it('includeComparison adds matrix when multiple projects', () => {
    const results = [
      mockRankedResult,
      { ...mockRankedResult, projectId: 'proj-002', projectName: 'Project B', finalScore: 80 }
    ]

    const formatted = formatRankedResults(results, [mockProject], mockIntent, 10, true)

    if (formatted.length > 1) {
      assert.ok(formatted[0].comparisonMatrix)
      assert.equal(formatted[0].comparisonMatrix?.length, 11)
    }
  })

  it('generateRecommendationSummary creates concise chat text', () => {
    const result = formatRankedResults([mockRankedResult], [mockProject], mockIntent, 3)
    const summary = generateRecommendationSummary(result)

    assert.ok(summary)
    assert(summary.length > 0)
    assert(summary.includes('Test Project A'))
  })

  it('handles deal-breakers for risk-averse users', () => {
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

    const result = formatRankedResults([resultWithBreaker], [mockProject], riskAverseIntent, 10)
    assert.equal(result.length, 0)

    const result2 = formatRankedResults([resultWithBreaker], [mockProject], mockIntent, 10)
    assert(result2.length > 0)
    assert(result2[0].dealBreakers.length > 0)
  })

  it('builderName is extracted from project metadata', () => {
    const result = formatRankedResults([mockRankedResult], [mockProject], mockIntent, 3)
    const rec = result[0]

    assert.equal(rec.builderName, 'Prestige Constructions')
  })

  it('dimensionExplanations include weight information', () => {
    const result = formatRankedResults([mockRankedResult], [mockProject], mockIntent, 3)
    const rec = result[0]

    rec.dimensionExplanations.forEach((dim) => {
      assert(dim.weight > 0)
      assert(dim.weight <= 1)
    })

    const totalWeight = rec.dimensionExplanations.reduce((sum, d) => sum + d.weight, 0)
    assert(Math.abs(totalWeight - 1.0) < 0.1)
  })
})
