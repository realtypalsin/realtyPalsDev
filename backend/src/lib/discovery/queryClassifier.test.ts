import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { classifyQueryDeterministic, classifyQuery, getRenderTarget } from './queryClassifier'
import type { Intent } from './types'

describe('Query Classifier', () => {
  describe('classifyQueryDeterministic', () => {
    it('detects COMPARISON queries', () => {
      const result = classifyQueryDeterministic(
        'Compare Pristine vs Godrej Green Glades',
        { projectNames: ['Pristine', 'Godrej Green Glades'] } as Partial<Intent>
      )
      assert.equal(result?.queryKind, 'COMPARISON')
      assert.equal(result?.renderTarget, 'both')
    })

    it('detects DRILLDOWN with attribute keywords', () => {
      const result = classifyQueryDeterministic(
        'What is the payment plan for it?',
        {} as Partial<Intent>
      )
      assert.equal(result?.queryKind, 'DRILLDOWN')
      assert.equal(result?.renderTarget, 'text')
    })

    it('detects RANKING queries', () => {
      const result = classifyQueryDeterministic(
        'What are the best projects under 1.5 crore in Sector 62?',
        {} as Partial<Intent>
      )
      assert.equal(result?.queryKind, 'RANKING')
      assert.equal(result?.renderTarget, 'both')
    })

    it('detects SUMMARY queries', () => {
      const result = classifyQueryDeterministic(
        'Give me a summary of available projects',
        {} as Partial<Intent>
      )
      assert.equal(result?.queryKind, 'SUMMARY')
      assert.equal(result?.renderTarget, 'text')
    })

    it('returns null for uncertain queries (fallback)', () => {
      const result = classifyQueryDeterministic(
        'Tell me about 3BHK properties',
        {} as Partial<Intent>
      )
      assert.equal(result, null)
    })
  })

  describe('getRenderTarget', () => {
    it('maps DISCOVERY to cards', () => {
      assert.equal(getRenderTarget('DISCOVERY'), 'cards')
    })

    it('maps COMPARISON to both', () => {
      assert.equal(getRenderTarget('COMPARISON'), 'both')
    })

    it('maps DRILLDOWN to text', () => {
      assert.equal(getRenderTarget('DRILLDOWN'), 'text')
    })
  })

  describe('classifyQuery', () => {
    it('uses deterministic classification when available', () => {
      const result = classifyQuery(
        'Compare Pristine vs Godrej',
        { projectNames: ['Pristine', 'Godrej'] } as Partial<Intent>
      )
      assert.equal(result.confidence, 'HIGH')
    })

    it('falls back to LLM-provided queryKind', () => {
      const result = classifyQuery(
        'Some query',
        { queryKind: 'DISCOVERY' } as Partial<Intent>
      )
      assert.equal(result.queryKind, 'DISCOVERY')
    })

    it('defaults to DISCOVERY when queryKind is absent', () => {
      const result = classifyQuery(
        'Some query',
        {} as Partial<Intent>
      )
      assert.equal(result.queryKind, 'DISCOVERY')
    })
  })
})
