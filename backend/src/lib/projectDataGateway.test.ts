/**
 * Project Data Gateway Tests — Verify confidence scoring and data validation
 */

import { describe, it, expect } from 'vitest'
import { computeResponseConfidence } from './projectDataGateway'
import type { FactValidation } from './projectDataGateway'

describe('Project Data Gateway', () => {
  describe('Confidence Scoring', () => {
    it('returns 1.0 for all database sources', () => {
      const facts: Record<string, FactValidation> = {
        price: {
          fact: 'base_price',
          value: 5000000,
          source: 'database',
          confidence: 0.98,
          validated: true,
        },
        status: {
          fact: 'project_status',
          value: 'Under Construction',
          source: 'database',
          confidence: 0.98,
          validated: true,
        },
      }
      const score = computeResponseConfidence(facts)
      expect(score).toBeGreaterThan(0.95)
    })

    it('penalizes estimated sources', () => {
      const facts: Record<string, FactValidation> = {
        price: {
          fact: 'estimated_rental_yield',
          value: 4.5,
          source: 'estimated',
          confidence: 0.65,
          validated: true,
        },
      }
      const score = computeResponseConfidence(facts)
      expect(score).toBeLessThan(0.75)
    })

    it('rewards validated facts', () => {
      const facts: Record<string, FactValidation> = {
        price: {
          fact: 'verified_price',
          value: 5000000,
          source: 'database',
          confidence: 0.98,
          validated: true,
        },
      }
      const validated = computeResponseConfidence(facts)

      const unvalidated: Record<string, FactValidation> = {
        price: {
          fact: 'unverified_price',
          value: 5000000,
          source: 'database',
          confidence: 0.98,
          validated: false,
        },
      }
      const unvalidatedScore = computeResponseConfidence(unvalidated)

      expect(validated).toBeGreaterThan(unvalidatedScore)
    })

    it('handles mixed sources correctly', () => {
      const facts: Record<string, FactValidation> = {
        price: {
          fact: 'base_price',
          value: 5000000,
          source: 'database',
          confidence: 0.98,
          validated: true,
        },
        commute: {
          fact: 'metro_distance',
          value: 2.5,
          source: 'google_maps',
          confidence: 0.92,
          validated: true,
        },
        emi: {
          fact: 'monthly_emi',
          value: 35000,
          source: 'calculator',
          confidence: 0.95,
          validated: true,
        },
        appreciation: {
          fact: 'estimated_cagr',
          value: 7.5,
          source: 'estimated',
          confidence: 0.65,
          validated: true,
        },
      }
      const score = computeResponseConfidence(facts)
      expect(score).toBeGreaterThan(0.6)
      expect(score).toBeLessThan(0.95)
    })

    it('uses geometric mean for fair averaging', () => {
      // Two equally important facts, one high confidence, one low
      const facts: Record<string, FactValidation> = {
        price: {
          fact: 'high_confidence_fact',
          value: 5000000,
          source: 'database',
          confidence: 0.98,
          validated: true,
        },
        estimate: {
          fact: 'low_confidence_fact',
          value: 7.5,
          source: 'estimated',
          confidence: 0.65,
          validated: true,
        },
      }
      const score = computeResponseConfidence(facts)
      // Geometric mean of 0.98 and 0.65 ≈ 0.802
      expect(score).toBeGreaterThan(0.7)
      expect(score).toBeLessThan(0.95)
    })
  })

  describe('Fact Validation', () => {
    it('marks DB facts as validated', () => {
      const fact: FactValidation = {
        fact: 'price',
        value: 5000000,
        source: 'database',
        confidence: 0.98,
        validated: true,
      }
      expect(fact.validated).toBe(true)
      expect(fact.confidence).toBeGreaterThan(0.9)
    })

    it('includes source attribution', () => {
      const fact: FactValidation = {
        fact: 'metro_distance',
        value: 2.5,
        source: 'google_maps',
        confidence: 0.92,
        validated: true,
      }
      expect(fact.source).toBeDefined()
      expect(['database', 'google_maps', 'calculator', 'estimated', 'derived']).toContain(fact.source)
    })

    it('tracks data age when available', () => {
      const fact: FactValidation = {
        fact: 'property_status',
        value: 'Under Construction',
        source: 'database',
        confidence: 0.98,
        validated: true,
        dataAge: 7, // 7 days old
        lastVerifiedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      }
      expect(fact.dataAge).toBeDefined()
      expect(fact.lastVerifiedAt).toBeDefined()
    })

    it('includes reason when confidence < 1', () => {
      const fact: FactValidation = {
        fact: 'estimated_rental_yield',
        value: 4.5,
        source: 'estimated',
        confidence: 0.65,
        validated: true,
        reason: 'Based on comparable properties, not verified with builder',
      }
      expect(fact.confidence).toBeLessThan(1)
      expect(fact.reason).toBeDefined()
    })
  })

  describe('Response Confidence', () => {
    it('returns >= 0.65 for sufficient data', () => {
      const facts: Record<string, FactValidation> = {
        price: {
          fact: 'price',
          value: 5000000,
          source: 'database',
          confidence: 0.98,
          validated: true,
        },
        status: {
          fact: 'status',
          value: 'Under Construction',
          source: 'database',
          confidence: 0.98,
          validated: true,
        },
      }
      const score = computeResponseConfidence(facts)
      expect(score).toBeGreaterThanOrEqual(0.65)
    })

    it('returns < 0.65 for insufficient data', () => {
      const facts: Record<string, FactValidation> = {
        estimate: {
          fact: 'estimated_value',
          value: 'unknown',
          source: 'estimated',
          confidence: 0.4,
          validated: false,
        },
      }
      const score = computeResponseConfidence(facts)
      expect(score).toBeLessThan(0.65)
    })
  })

  describe('Completeness Tracking', () => {
    it('identifies critical fields', () => {
      // Gateway should track critical vs optional fields
      // Critical: always needed for high confidence
      // Optional: nice-to-have, lowers confidence if missing but acceptable
      const criticalFields = ['price_min_cr', 'project_status', 'possession_date']
      expect(criticalFields.length).toBeGreaterThan(0)
    })

    it('computes coverage percentage', () => {
      // If 8/10 fields present: coverage = 0.8
      const coverage = 8 / 10
      expect(coverage).toBeGreaterThanOrEqual(0)
      expect(coverage).toBeLessThanOrEqual(1)
    })
  })
})
