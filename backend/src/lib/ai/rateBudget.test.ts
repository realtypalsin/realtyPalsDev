import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { wouldExceed, recordAttempt, recordRateLimited, remaining, limitFor, resetRateBudget } from './rateBudget'

describe('rate budget — skip a leg before it refuses us', () => {
  beforeEach(() => resetRateBudget())

  it('allows a leg until its per-minute allowance is spent', () => {
    const limit = limitFor('cohere')
    for (let i = 0; i < limit; i++) {
      assert.equal(wouldExceed('COHERE_API_KEY', 'cohere'), false, `refused at request ${i + 1} of ${limit}`)
      recordAttempt('COHERE_API_KEY')
    }
    assert.equal(wouldExceed('COHERE_API_KEY', 'cohere'), true, 'should be spent')
    assert.equal(remaining('COHERE_API_KEY', 'cohere'), 0)
  })

  it('budgets per KEY, so two legs sharing one key share one allowance', () => {
    // The two NVIDIA legs differ only by model. Counting them separately would
    // authorise twice the requests the key actually has.
    const limit = limitFor('nvidia')
    for (let i = 0; i < limit; i++) recordAttempt('NVIDIA_API_KEY')
    assert.equal(wouldExceed('NVIDIA_API_KEY', 'nvidia'), true)
  })

  it('keeps separate keys of one provider independent', () => {
    const limit = limitFor('groq')
    for (let i = 0; i < limit; i++) recordAttempt('GROQ_API_KEY')
    assert.equal(wouldExceed('GROQ_API_KEY', 'groq'), true)
    assert.equal(wouldExceed('GROQ_API_KEY1', 'groq'), false, 'a second key is a second allowance')
  })

  it('believes a real 429 over our own constant', () => {
    // The published limit is a guess about someone else's system. When the
    // provider actually refuses, park the leg rather than keep probing it.
    assert.equal(wouldExceed('GEMINI_API_KEY1', 'gemini'), false)
    recordRateLimited('GEMINI_API_KEY1', 'gemini')
    assert.equal(wouldExceed('GEMINI_API_KEY1', 'gemini'), true)
    assert.equal(remaining('GEMINI_API_KEY1', 'gemini'), 0)
  })

  it('gives an unknown vendor a generous default rather than throttling it', () => {
    // Not knowing a limit is not a reason to invent a tight one.
    assert.ok(limitFor('some-new-vendor') >= 60)
  })

  it('counts only the last minute', () => {
    const key = 'GEMINI_API_KEY2'
    const limit = limitFor('gemini')
    for (let i = 0; i < limit; i++) recordAttempt(key)
    assert.equal(wouldExceed(key, 'gemini'), true)

    // Rewind the clock past the window rather than sleeping 60s in a test.
    const realNow = Date.now
    try {
      Date.now = () => realNow() + 61_000
      assert.equal(wouldExceed(key, 'gemini'), false, 'the window should have rolled over')
      assert.equal(remaining(key, 'gemini'), limit)
    } finally {
      Date.now = realNow
    }
  })
})
