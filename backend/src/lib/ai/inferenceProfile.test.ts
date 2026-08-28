import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { classifyShape, profileFor, estimateTurnCostUsd } from './inferenceProfile'

describe('inference profile — shape classification', () => {
  it('treats a bare head term as a lookup', () => {
    // 62% of the corpus. No verb, no question mark, nothing to reason about.
    for (const q of ['2 bhk in noida', 'property rates in sector 75', 'flats in sector 75 noida']) {
      assert.equal(classifyShape(q), 'lookup', q)
    }
  })

  it('treats a typo\'d head term as a lookup, not a puzzle', () => {
    assert.equal(classifyShape('propertiesinnoida_extaion'), 'lookup')
  })

  it('sends comparisons to the reasoning tier', () => {
    for (const q of [
      'sector 150 vs sector 128 noida',
      'Compare Sector 75 and Sector 137 for a 3 BHK end-user',
      'which is better for investment, sector 150 or noida extension',
    ]) {
      assert.equal(classifyShape(q), 'reasoning', q)
    }
  })

  it('sends a stated life situation to the reasoning tier', () => {
    const q =
      'I have ₹1.25 crore. I work near Sector 62, my wife works near Sector 135, we have one child'
    assert.equal(classifyShape(q), 'reasoning')
  })

  it('sends a yes/no judgement to the advisory tier', () => {
    assert.equal(classifyShape('is sector 150 good for investment'), 'advisory')
    assert.equal(classifyShape('should I buy under construction or ready to move'), 'advisory')
  })

  it('sends a wh-question to the factual tier', () => {
    assert.equal(classifyShape('which noida sectors have the best metro connectivity'), 'factual')
  })
})

describe('inference profile — the saving is real', () => {
  // The whole point of the profile is that output dominates the bill. If a
  // lookup ever stops being materially cheaper than a reasoning turn, the
  // profile has been flattened and is costing money for nothing.
  const PROMPT = 10_346
  const CACHED = 8_095 // 78.2%, the measured implicit-cache hit rate

  it('a lookup costs a fraction of a reasoning turn', () => {
    const lookup = estimateTurnCostUsd(profileFor('2 bhk in noida'), PROMPT, CACHED)
    const reasoning = estimateTurnCostUsd(
      profileFor('sector 150 vs sector 128 noida'),
      PROMPT,
      CACHED,
    )
    assert.ok(
      lookup < reasoning / 3,
      `lookup $${lookup.toFixed(5)} should be well under a third of reasoning $${reasoning.toFixed(5)}`,
    )
  })

  it('thinking is the dominant line on a reasoning turn', () => {
    const p = profileFor('sector 150 vs sector 128 noida')
    const withThinking = estimateTurnCostUsd(p, PROMPT, CACHED)
    const withoutThinking = estimateTurnCostUsd({ ...p, thinkingBudget: 0 }, PROMPT, CACHED)
    const thinkingShare = (withThinking - withoutThinking) / withThinking
    assert.ok(
      thinkingShare > 0.25,
      `thinking is ${(thinkingShare * 100).toFixed(0)}% of the turn — if this drops below a quarter the cost model in inferenceProfile.ts needs re-deriving`,
    )
  })

  it('a lookup spends nothing on thinking', () => {
    assert.equal(profileFor('2 bhk in noida').thinkingBudget, 0)
  })

  it('force overrides the guess', () => {
    // The comparison handler always reasons, whatever the phrasing looks like.
    assert.equal(profileFor('2 bhk in noida', 'reasoning').thinkingBudget, 1024)
  })
})
