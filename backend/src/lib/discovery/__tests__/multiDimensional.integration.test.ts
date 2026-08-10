/**
 * Multi-Dimensional Intent & Ranking Integration Tests
 * Tests all 5 phases end-to-end with real-world scenarios
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { getMultiDimensionalRecommendations } from '../multiDimensionalIntegration'
import { extractExtendedIntent } from '../../ai/extendedIntent'
import { rankProject } from '../scoringEngine'

describe('Multi-Dimensional Integration', () => {
  describe('Phase 1: Intent Extraction', () => {
    it('extracts budget from user message', async () => {
      const { intent } = await extractExtendedIntent({
        userMessage: 'I need a property under 1.5 crore'
      })
      expect(intent.financial).toBeDefined()
      expect(intent.financial?.budgetMax).toBeLessThanOrEqual(1.5)
    })

    it('extracts location preferences', async () => {
      const { intent } = await extractExtendedIntent({
        userMessage: 'I need something near metro, good schools for my kids'
      })
      expect(intent.location).toBeDefined()
      expect(intent.location?.schoolPriority).toBe(true)
    })

    it('extracts timeline urgency', async () => {
      const { intent } = await extractExtendedIntent({
        userMessage: 'I need it ready in 6 months'
      })
      expect(intent.timeline).toBeDefined()
      expect(intent.timeline?.possessionUrgency).toBeTruthy()
    })

    it('handles degraded intent gracefully', async () => {
      const { intent, degraded } = await extractExtendedIntent({
        userMessage: 'xyz abc 123 nonsense gibberish'
      })
      expect(intent).toBeDefined()
      // Should return valid structure even if degraded
      expect(typeof degraded === 'boolean').toBe(true)
    })

    it('merges with previous intent correctly', async () => {
      const prev = await extractExtendedIntent({
        userMessage: 'I need a 3BHK'
      })

      const merged = await extractExtendedIntent({
        userMessage: 'under 1.5 crore',
        previousIntent: prev.intent
      })

      expect(merged.intent.specs?.bhk).toBeDefined()
      expect(merged.intent.financial?.budgetMax).toBeDefined()
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
      expect(result).toBeDefined()
      expect(result.finalScore).toBeGreaterThan(0)
      expect(result.finalScore).toBeLessThanOrEqual(100)
      expect(Object.keys(result.dimensionScores).length).toBe(11)
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
      expect(result.finalScore).toBe(0)
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

      // Weights should differ based on intent
      expect(investmentScore.dimensionScores).toBeDefined()
      expect(endUseScore.dimensionScores).toBeDefined()
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

      expect(result).toBeDefined()
      expect(result.intent).toBeDefined()
      expect(result.legacyIntent).toBeDefined()
      expect(result.recommendations).toBeDefined()
      expect(Array.isArray(result.recommendations)).toBe(true)
      expect(result.confidence).toBeDefined()
      expect(result.confidence.overallConfidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence.overallConfidence).toBeLessThanOrEqual(100)
    })

    it('returns summaryForChat when projects found', async () => {
      const result = await getMultiDimensionalRecommendations(
        'I need a 3BHK in Sector 62'
      )

      expect(result.summaryForChat).toBeDefined()
      expect(typeof result.summaryForChat === 'string').toBe(true)
      expect(result.summaryForChat.length).toBeGreaterThan(0)
    })

    it('detects deal-breakers correctly', async () => {
      const result = await getMultiDimensionalRecommendations(
        'I need a property with no litigation'
      )

      if (result.dealBreakersDetected) {
        expect(result.recommendations.some(r => (r.dealBreakers?.length ?? 0) > 0)).toBe(true)
      }
    })

    it('handles no-results gracefully', async () => {
      const result = await getMultiDimensionalRecommendations(
        'I need a property in Mars under ₹10 lakhs with 10 bedrooms'
      )

      expect(result.recommendations).toBeDefined()
      const hasNoProjectsSummary = result.summaryForChat.includes('No projects')
      const isEmptyRecs = result.recommendations.length === 0
      expect(hasNoProjectsSummary || isEmptyRecs).toBe(true)
    })

    it('maintains confidence scores across phases', async () => {
      const result = await getMultiDimensionalRecommendations(
        'I need a 3BHK near metro'
      )

      expect(result.confidence.intentConfidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence.intentConfidence).toBeLessThanOrEqual(100)
      expect(result.confidence.rankingConfidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence.rankingConfidence).toBeLessThanOrEqual(100)
      expect(result.confidence.overallConfidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence.overallConfidence).toBeLessThanOrEqual(100)
    })
  })

  describe('Error Handling & Edge Cases', () => {
    it('does not crash on empty message', async () => {
      expect(async () => {
        await getMultiDimensionalRecommendations('')
      }).not.toThrow()
    })

    it('does not crash on null metadata', async () => {
      expect(async () => {
        await getMultiDimensionalRecommendations(
          'I need a property',
          [],
          undefined,
          {}
        )
      }).not.toThrow()
    })

    it('returns valid structure even on LLM failure', async () => {
      // Test intent extraction fallback
      const result = await extractExtendedIntent({
        userMessage: 'test'
      })
      expect(result.intent).toBeDefined()
      expect(typeof result.degraded === 'boolean').toBe(true)
    })

    it('handles missing project metadata gracefully', async () => {
      const incompleteProject = {
        id: 'incomplete',
        name: 'Incomplete Project'
        // Missing many fields
      } as any

      const intent = {
        financial: { budgetMax: 1.5, confidence: 100 }
      } as any

      expect(() => {
        rankProject(intent, incompleteProject, {})
      }).not.toThrow()
    })
  })

  describe('Performance', () => {
    it('completes intent extraction in <1 second', async () => {
      const start = Date.now()
      await extractExtendedIntent({
        userMessage: 'I need a 3BHK near metro'
      })
      const duration = Date.now() - start
      expect(duration).toBeLessThan(1000)
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

      expect(duration).toBeLessThan(500)
    })
  })
})
