import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { fetchProjectData, calculateConfidence } from '../dataFetcher'

describe('Data Fetcher', () => {
  it('should calculate 95% confidence for recently verified payment plans', () => {
    const now = new Date()
    const verified = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

    const confidence = calculateConfidence('payment_plans', { verified_at: verified })
    assert.equal(confidence, 95)
  })

  it('should apply freshness penalty (-5% per week)', () => {
    const now = new Date()
    const verified = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const confidence = calculateConfidence('payment_plans', { verified_at: verified })
    assert.equal(confidence, 85)
  })

  it('should apply legal risk penalty (-20%)', () => {
    const now = new Date()
    const verified = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

    const confidence = calculateConfidence('payment_plans', { verified_at: verified }, true, 0)
    assert.equal(confidence, 75)
  })
})
