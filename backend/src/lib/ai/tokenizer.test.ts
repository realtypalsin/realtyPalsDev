import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { estimateTokensReal, estimateTokensWithBuffer, getTokenBudget } from './tokenizer'

describe('tokenizer', () => {
  it('should estimate tokens accurately for short text', () => {
    const shortText = 'Hello world'
    const est = estimateTokensReal(shortText)
    assert(est > 0)
    assert(est < 10)
  })

  it('should estimate tokens for medium text', () => {
    const mediumText = 'This is a medium length text with several words to estimate token count accurately'
    const est = estimateTokensReal(mediumText)
    assert(est > 10)
    assert(est < 50)
  })

  it('should handle large JSON structures', () => {
    const json = JSON.stringify({
      projects: Array.from({ length: 50 }, (_, i) => ({
        id: `p${i}`,
        name: `Project ${i}`,
        price: 2.5 + Math.random(),
      })),
    })
    const est = estimateTokensReal(json)
    assert(est > 100)
  })

  it('should add buffer correctly', () => {
    const text = 'Test text'
    const withoutBuffer = estimateTokensReal(text)
    const withBuffer = estimateTokensWithBuffer(text)
    assert.equal(withBuffer, withoutBuffer + 500)
  })

  it('should compute token budget correctly', () => {
    const budget = getTokenBudget(100_000)
    assert.equal(budget.totalAvailable, 100_000)
    assert.equal(budget.systemPromptBudget, 40_000)
    assert.equal(budget.messageBudget, 60_000)
  })

  it('should handle empty string', () => {
    const est = estimateTokensReal('')
    assert.equal(est, 0)
  })

  it('should be consistent across calls', () => {
    const text = 'Consistent text for testing'
    const est1 = estimateTokensReal(text)
    const est2 = estimateTokensReal(text)
    assert.equal(est1, est2)
  })
})
