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

    // The demo failure class: an attribute keyword with no project in scope.
    // Each of these matched `attributeKeywords` on the keyword alone, was
    // classified DRILLDOWN, reached the project-detail lane with no project id
    // and was answered with "I need a project name to answer that."
    for (const q of [
      'What maintenance should I expect in Noida?',
      'How is the security in Noida societies?',
      'What is the AQI like in Greater Noida?',
      'Where do most families prefer to buy in Noida?',
      'Is parking usually included in Noida apartments?',
      'How much construction delay is normal in Noida?',
    ]) {
      it(`does not claim DRILLDOWN with no project in scope: "${q}"`, () => {
        const result = classifyQueryDeterministic(q, {} as Partial<Intent>)
        assert.notEqual(
          result?.queryKind,
          'DRILLDOWN',
          `"${q}" names no project, so the project-detail lane cannot answer it`,
        )
      })
    }

    it('still claims DRILLDOWN when the session is focused on a project', () => {
      const result = classifyQueryDeterministic(
        'What is the maintenance?',
        { focus_project_id: 'abc-123' } as unknown as Partial<Intent>,
      )
      assert.equal(result?.queryKind, 'DRILLDOWN')
    })

    it('still claims DRILLDOWN for a verified named project', () => {
      const result = classifyQueryDeterministic(
        'Nirala Estate maintenance charges',
        { projectNames: ['Nirala Estate'] } as Partial<Intent>,
        { hasVerifiedProjectNames: true },
      )
      assert.equal(result?.queryKind, 'DRILLDOWN')
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

    // Both of these used to assert DISCOVERY for a message with no BHK, no
    // budget, no sector and no project name. That is what put property cards
    // under "hi", "explain capital gains tax on property sale" and "should i
    // buy now or wait for rates to drop" — three turns of a demo answered with
    // a shortlist nobody asked for. DISCOVERY now requires a search signal.
    it('honours an LLM DISCOVERY when there is something to search for', () => {
      const result = classifyQuery(
        'Some query',
        { queryKind: 'DISCOVERY', sector: 'Sector 150', bhk: [3] } as Partial<Intent>
      )
      assert.equal(result.queryKind, 'DISCOVERY')
    })

    it('overrides an LLM DISCOVERY that has no search signal', () => {
      const result = classifyQuery(
        'Some query',
        { queryKind: 'DISCOVERY' } as Partial<Intent>
      )
      assert.equal(result.queryKind, 'OPEN')
    })

    it('falls open to OPEN, not DISCOVERY, when queryKind is absent', () => {
      const result = classifyQuery(
        'Some query',
        {} as Partial<Intent>
      )
      assert.equal(result.queryKind, 'OPEN')
      assert.equal(result.renderTarget, 'text', 'cards are for buyers who are shopping')
    })
  })
})
