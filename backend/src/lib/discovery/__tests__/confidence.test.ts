import { test, describe } from 'node:test'
import { strict as assert } from 'node:assert'
import { computeConfidence } from '../confidence'
import type { Intent } from '../types'

describe('Confidence: Scoring', () => {
  test('HIGH confidence (0.95) on specific project name', () => {
    const intent: Intent = { projectNames: ['ACE Hanei'] }
    const result = computeConfidence(intent)
    assert.equal(result.level, 'HIGH')
    assert.equal(result.score, 0.95)
  })

  test('HIGH confidence (0.90) on specific builder name', () => {
    const intent: Intent = { builderName: 'ACE Group' }
    const result = computeConfidence(intent)
    assert.equal(result.level, 'HIGH')
    assert.equal(result.score, 0.90)
  })

  test('HIGH confidence (0.88) on 3 strong signals (sector, BHK, budget)', () => {
    const intent: Intent = {
      sector: 'Sector 150',
      bhk: [3],
      budgetMax: 2
    }
    const result = computeConfidence(intent)
    assert.equal(result.level, 'HIGH')
    assert.equal(result.score, 0.88)
  })

  test('MEDIUM confidence (0.72) on 2 strong signals', () => {
    const intent: Intent = {
      sector: 'Sector 150',
      bhk: [3]
    }
    const result = computeConfidence(intent)
    assert.equal(result.level, 'MEDIUM')
    assert.equal(result.score, 0.72)
  })

  test('MEDIUM confidence (0.60) on 1 signal + lifestyle', () => {
    const intent: Intent = {
      sector: 'Sector 150',
      lifestyleKeywords: ['metro', 'mall']
    }
    const result = computeConfidence(intent)
    assert.equal(result.level, 'MEDIUM')
    assert.equal(result.score, 0.60)
  })

  test('LOW confidence (0.30) on single signal, no lifestyle', () => {
    const intent: Intent = {
      bhk: [3]
    }
    const result = computeConfidence(intent)
    assert.equal(result.level, 'LOW')
    assert.equal(result.score, 0.30)
  })

  test('LOW confidence (0.30) on empty intent', () => {
    const intent: Intent = {}
    const result = computeConfidence(intent)
    assert.equal(result.level, 'LOW')
  })

  test('ignores city-level terms for confidence (city-level not a strong signal)', () => {
    const intent: Intent = {
      sector: 'Noida' // city-level, not a real signal
    }
    const result = computeConfidence(intent)
    assert.equal(result.level, 'LOW')
  })

  test('confidence reason field is non-empty', () => {
    const intent: Intent = { sector: 'Sector 150', bhk: [3], budgetMax: 2 }
    const result = computeConfidence(intent)
    assert(result.reason.length > 0, 'Reason should be provided')
  })

  test('score is between 0.0 and 1.0', () => {
    const testIntents: Intent[] = [
      {},
      { sector: 'Sector 150' },
      { sector: 'Sector 150', bhk: [3] },
      { sector: 'Sector 150', bhk: [3], budgetMax: 2 },
      { projectNames: ['ACE Hanei'] },
    ]

    for (const intent of testIntents) {
      const result = computeConfidence(intent)
      assert(result.score >= 0.0 && result.score <= 1.0, `Score ${result.score} out of bounds`)
    }
  })
})

describe('Confidence: Reasoning', () => {
  test('project name returns highest score reason', () => {
    const intent: Intent = { projectNames: ['ACE Hanei'], sector: 'Sector 150' }
    const result = computeConfidence(intent)
    assert(result.reason.includes('project'), 'Should mention project')
  })

  test('builder name returns high score reason', () => {
    const intent: Intent = { builderName: 'ACE Group' }
    const result = computeConfidence(intent)
    assert(result.reason.includes('builder') || result.reason.includes('Builder'), 'Should mention builder')
  })
})
