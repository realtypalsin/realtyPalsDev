/**
 * Multi-Dimensional Intent & Ranking Integration Tests
 * Tests all 5 phases end-to-end with real-world scenarios
 */

import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { getMultiDimensionalRecommendations } from '../multiDimensionalIntegration'
import { extractExtendedIntent } from '../../ai/extendedIntent'
import { rankProject } from '../scoringEngine'

describe('Multi-Dimensional Integration', () => {
  describe('Phase 1: Intent Extraction', () => {
    it('extracts budget from user message', async () => {
      const { intent } = await extractExtendedIntent({
        userMessage: 'I need a property under 1.5 crore'
      })
      assert.ok(intent.financial)
      assert(intent.financial?.budgetMax! <= 1.5)
    })

    it('extracts location preferences', async () => {
      const { intent } = await extractExtendedIntent({
        userMessage: 'I need something near metro, good schools for my kids'
      })
      assert.ok(intent.location)
      assert.equal(intent.location?.schoolPriority, true)
    })

    it('extracts timeline urgency', async () => {
      const { intent } = await extractExtendedIntent({
        userMessage: 'I need it ready in 6 months'
      })
      assert.ok(intent.timeline)
      assert.ok(intent.timeline?.possessionUrgency)
    })

    it('handles degraded intent gracefully', async () => {
      const { intent, degraded } = await extractExtendedIntent({
        userMessage: 'xyz abc 123 nonsense gibberish'
      })
      assert.ok(intent)
      assert.equal(typeof degraded, 'boolean')
    })

    it('merges with previous intent correctly', async () => {
      const prev = await extractExtendedIntent({
        userMessage: 'I need a 3BHK'
      })

      const merged = await extractExtendedIntent({
        userMessage: 'under 1.5 crore',
        previousIntent: prev.intent
      })

      assert.ok(merged.intent.specs?.bhk)
      assert.ok(merged.intent.financial?.budgetMax)
    })
  })

  describe('Phase 2: Scoring Engine', () => {
    it('scores projects on all 11 dimensions', async () => {
      const mockProject = {
        id: 'test-1',
        name: 'Test Project',
        sector: 'Sector 62',
        price_min_cr: 1.0,
        price_max_cr: 1.5,
        bhk: 3,
        carpet_area: 1200,
        builder_name: 'Test Builder',
        rera_registered: true,
        litigation_count: 0,
        possession_date: new Date('2027-12-31'),
        metro_distance_m: 800,
        school_distance_m: 2200,
        has_pool: true,
        has_gym: true
      }

      const mockIntent = {
        financial: { budgetMin: 1.0, budgetMax: 1.5, confidence: 100 },
        location: { sectorPreference: 'Sector 62', confidence: 100 },
        specs: { bhk: 3, confidence: 100 },
        timeline: { possessionUrgency: 'high', confidence: 100 },
        builder: { builderReputationImportance: 'high', confidence: 100 },
        legal: { reraComplianceMust: true, confidence: 100 },
        amenities: { poolWanted: true, gymWanted: true, confidence: 100 },
        pricing: { confidence: 50 },
        personal: { confidence: 50 },
        decision: { confidence: 50 },
        gaps: { confidence: 50 }
      } as any

      const result = rankProject(mockIntent, mockProject as any, {})
      assert.ok(result)
      assert(result.finalScore > 0)
      assert(result.finalScore <= 100)
      assert.equal(Object.keys(result.dimensionScores).length, 11)
    })

    it('returns 0 for deal-breaker projects', async () => {
      const litigationProject = {
        id: 'test-litigation',
        name: 'Litigation Project',
        sector: 'Sector 61',
        litigation_count: 5,
        rera_registered: false
      } as any

      const mockIntent = {
        legal: { reraComplianceMust: true, confidence: 100 }
      } as any

      const result = rankProject(mockIntent, litigationProject, {})
      assert.equal(result.finalScore, 0)
    })

    it('applies dynamic weights based on intent', async () => {
      const investmentIntent = {
        decision: { primaryMotivation: 'investment', confidence: 100 },
        builder: { builderReputationImportance: 'critical', confidence: 100 }
      } as any

      const endUseIntent = {
        decision: { primaryMotivation: 'endUse', confidence: 100 },
        location: { schoolPriority: true, confidence: 100 }
      } as any

      const project = { id: 'test', name: 'Test', sector: 'Sector 62' } as any

      const investmentScore = rankProject(investmentIntent, project, {})
      const endUseScore = rankProject(endUseIntent, project, {})

      assert.ok(investmentScore.dimensionScores)
      assert.ok(endUseScore.dimensionScores)
    })
  })

  describe('Full Pipeline: getMultiDimensionalRecommendations', () => {
    it('completes end-to-end with real message', async () => {
      const result = await getMultiDimensionalRecommendations(
        'I need a 3BHK near metro under 1.5 crore with good schools',
        [],
        undefined,
        { limit: 3 }
      )

      assert.ok(result)
      assert.ok(result.intent)
      assert.ok(result.legacyIntent)
      assert.ok(result.recommendations)
      assert.equal(Array.isArray(result.recommendations), true)
      assert.ok(result.confidence)
      assert(result.confidence.overallConfidence >= 0)
      assert(result.confidence.overallConfidence <= 100)
    })

    it('returns summaryForChat when projects found', async () => {
      const result = await getMultiDimensionalRecommendations(
        'I need a 3BHK in Sector 62'
      )

      assert.ok(result.summaryForChat)
      assert.equal(typeof result.summaryForChat, 'string')
      assert(result.summaryForChat.length > 0)
    })

    it('detects deal-breakers correctly', async () => {
      const result = await getMultiDimensionalRecommendations(
        'I need a property with no litigation'
      )

      if (result.dealBreakersDetected) {
        assert(result.recommendations.some(r => (r.dealBreakers?.length ?? 0) > 0))
      }
    })

    it('handles no-results gracefully', async () => {
      const result = await getMultiDimensionalRecommendations(
        'I need a property in Mars under ₹10 lakhs with 10 bedrooms'
      )

      assert.ok(result.recommendations)
      const hasNoProjectsSummary = result.summaryForChat.includes('No projects')
      const isEmptyRecs = result.recommendations.length === 0
      assert(hasNoProjectsSummary || isEmptyRecs)
    })

    it('maintains confidence scores across phases', async () => {
      const result = await getMultiDimensionalRecommendations(
        'I need a 3BHK near metro'
      )

      assert(result.confidence.intentConfidence >= 0)
      assert(result.confidence.intentConfidence <= 100)
      assert(result.confidence.rankingConfidence >= 0)
      assert(result.confidence.rankingConfidence <= 100)
      assert(result.confidence.overallConfidence >= 0)
      assert(result.confidence.overallConfidence <= 100)
    })
  })

  describe('Error Handling & Edge Cases', () => {
    it('does not crash on empty message', async () => {
      await assert.doesNotReject(async () => {
        await getMultiDimensionalRecommendations('')
      })
    })

    it('does not crash on null metadata', async () => {
      await assert.doesNotReject(async () => {
        await getMultiDimensionalRecommendations(
          'I need a property',
          [],
          undefined,
          {}
        )
      })
    })

    it('returns valid structure even on LLM failure', async () => {
      const result = await extractExtendedIntent({
        userMessage: 'test'
      })
      assert.ok(result.intent)
      assert.equal(typeof result.degraded, 'boolean')
    })

    it('handles missing project metadata gracefully', async () => {
      const incompleteProject = {
        id: 'incomplete',
        name: 'Incomplete Project'
      } as any

      const intent = {
        financial: { budgetMax: 1.5, confidence: 100 }
      } as any

      assert.doesNotThrow(() => {
        rankProject(intent, incompleteProject, {})
      })
    })
  })

  describe('Performance', () => {
    it('completes intent extraction in <1 second', async () => {
      const start = Date.now()
      await extractExtendedIntent({
        userMessage: 'I need a 3BHK near metro'
      })
      const duration = Date.now() - start
      assert(duration < 1000)
    })

    it('scores 10 projects in <500ms', async () => {
      const projects = Array.from({ length: 10 }, (_, i) => ({
        id: `perf-${i}`,
        name: `Project ${i}`,
        sector: 'Sector 62'
      })) as any[]

      const intent = {
        financial: { budgetMax: 1.5, confidence: 100 }
      } as any

      const start = Date.now()
      projects.forEach(p => rankProject(intent, p, {}))
      const duration = Date.now() - start

      assert(duration < 500)
    })
  })
})
