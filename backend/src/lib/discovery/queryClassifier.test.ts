/**
 * Phase 0: Query Classifier Tests
 *
 * Verifies deterministic classification and fallback behavior.
 */

import { classifyQueryDeterministic, classifyQuery, getRenderTarget } from './queryClassifier'
import type { Intent } from './types'

describe('Query Classifier', () => {
  describe('classifyQueryDeterministic', () => {
    it('detects COMPARISON queries', () => {
      const result = classifyQueryDeterministic(
        'Compare Pristine vs Godrej Green Glades',
        { projectNames: ['Pristine', 'Godrej Green Glades'] } as Partial<Intent>
      )
      expect(result?.queryKind).toBe('COMPARISON')
      expect(result?.renderTarget).toBe('both')
    })

    it('detects DRILLDOWN with attribute keywords', () => {
      const result = classifyQueryDeterministic(
        'What is the payment plan for it?',
        {} as Partial<Intent>
      )
      expect(result?.queryKind).toBe('DRILLDOWN')
      expect(result?.renderTarget).toBe('text')
    })

    it('detects RANKING queries', () => {
      const result = classifyQueryDeterministic(
        'What are the best projects under 1.5 crore in Sector 62?',
        {} as Partial<Intent>
      )
      expect(result?.queryKind).toBe('RANKING')
      expect(result?.renderTarget).toBe('both')
    })

    it('detects SUMMARY queries', () => {
      const result = classifyQueryDeterministic(
        'Give me a summary of available projects',
        {} as Partial<Intent>
      )
      expect(result?.queryKind).toBe('SUMMARY')
      expect(result?.renderTarget).toBe('text')
    })

    it('returns null for uncertain queries (fallback)', () => {
      const result = classifyQueryDeterministic(
        'Tell me about 3BHK properties',
        {} as Partial<Intent>
      )
      expect(result).toBeNull()
    })
  })

  describe('getRenderTarget', () => {
    it('maps DISCOVERY to cards', () => {
      expect(getRenderTarget('DISCOVERY')).toBe('cards')
    })

    it('maps COMPARISON to both', () => {
      expect(getRenderTarget('COMPARISON')).toBe('both')
    })

    it('maps DRILLDOWN to text', () => {
      expect(getRenderTarget('DRILLDOWN')).toBe('text')
    })
  })

  describe('classifyQuery', () => {
    it('uses deterministic classification when available', () => {
      const result = classifyQuery(
        'Compare Pristine vs Godrej',
        { projectNames: ['Pristine', 'Godrej'] } as Partial<Intent>
      )
      expect(result.confidence).toBe('HIGH')
    })

    it('falls back to LLM-provided queryKind', () => {
      const result = classifyQuery(
        'Some query',
        { queryKind: 'DISCOVERY' } as Partial<Intent>
      )
      expect(result.queryKind).toBe('DISCOVERY')
    })

    it('defaults to DISCOVERY when queryKind is absent', () => {
      const result = classifyQuery(
        'Some query',
        {} as Partial<Intent>
      )
      expect(result.queryKind).toBe('DISCOVERY')
    })
  })
})
