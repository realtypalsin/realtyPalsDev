// Ported from jest/vitest globals to node:test — this file previously threw
// "describe is not defined" on load and had never executed.
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { extractIntentHeuristic } from '../intent'
import type { Intent } from '../../discovery'

describe('Intent Heuristic Extraction', () => {
  const baseIntent: Intent = {}

  it('extracts BHK from message', () => {
    const result = extractIntentHeuristic('Looking for 3 BHK', baseIntent)
    assert.deepEqual(result.bhk, [3])
  })

  it('extracts budget in crore', () => {
    const result = extractIntentHeuristic('under 2 crore', baseIntent)
    assert.strictEqual(result.budgetMax, 2)
  })

  it('extracts budget in lakh and converts to crore', () => {
    const result = extractIntentHeuristic('150 lakh budget', baseIntent)
    assert.strictEqual(result.budgetMax, 1.5)
  })

  it('extracts sector', () => {
    const result = extractIntentHeuristic('in Sector 150', baseIntent)
    assert.ok(result.sector?.includes('150'), `expected sector to contain 150, got ${result.sector}`)
  })

  it('extracts immediate possession', () => {
    const result = extractIntentHeuristic('ready to move', baseIntent)
    assert.strictEqual(result.possession, 'immediate')
  })

  it('extracts 1 year possession', () => {
    const result = extractIntentHeuristic('within 1 year', baseIntent)
    assert.strictEqual(result.possession, '1year')
  })

  it('extracts investment purpose', () => {
    const result = extractIntentHeuristic('for investment returns', baseIntent)
    assert.strictEqual(result.purpose, 'investment')
  })

  it('extracts end-use purpose', () => {
    const result = extractIntentHeuristic('to live in', baseIntent)
    assert.strictEqual(result.purpose, 'endUse')
  })

  it('extracts area range', () => {
    const result = extractIntentHeuristic('1000 to 1200 sqft', baseIntent)
    assert.strictEqual(result.areaMin, 1000)
    assert.strictEqual(result.areaMax, 1200)
  })

  it('returns previous intent if no matches', () => {
    const prev = { bhk: [2] }
    const result = extractIntentHeuristic('random text', prev as Intent)
    assert.deepEqual(result.bhk, [2])
  })

  it('handles multiple signals', () => {
    const result = extractIntentHeuristic('3 BHK under 2 crore in Sector 150 ready to move', baseIntent)
    assert.deepEqual(result.bhk, [3])
    assert.strictEqual(result.budgetMax, 2)
    assert.strictEqual(result.possession, 'immediate')
  })

  it('is case-insensitive', () => {
    const result1 = extractIntentHeuristic('3 bhk', baseIntent)
    const result2 = extractIntentHeuristic('3 BHK', baseIntent)
    assert.deepEqual(result1.bhk, result2.bhk)
  })
})
