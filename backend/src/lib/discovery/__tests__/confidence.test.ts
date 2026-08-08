import { describe, it } from 'node:test'
import assert from 'node:assert'
import { calculateConfidence } from '../dataFetcher'

describe('Confidence Scoring', () => {
  it('should apply 5% penalty per week of age', () => {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const data1Week = { verified_at: oneWeekAgo }
    const data2Weeks = { verified_at: twoWeeksAgo }

    const confidence1Week = calculateConfidence('payment_plans', data1Week)
    const confidence2Weeks = calculateConfidence('payment_plans', data2Weeks)

    // 95 - (1 * 5) = 90
    assert.strictEqual(confidence1Week, 90)
    // 95 - (2 * 5) = 85
    assert.strictEqual(confidence2Weeks, 85)
  })

  it('should apply 20% penalty for legal risk flag', () => {
    const data = { verified_at: new Date() }

    const confidence = calculateConfidence('payment_plans', data, true, 0)

    // 95 - 20 = 75
    assert.strictEqual(confidence, 75)
  })

  it('should apply 15% penalty if litigation count > 2', () => {
    const data = { verified_at: new Date() }

    const confidence = calculateConfidence('payment_plans', data, false, 3)

    // 95 - 15 = 80
    assert.strictEqual(confidence, 80)
  })

  it('should combine penalties: freshness + legal + litigation', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const data = { verified_at: twoWeeksAgo }

    const confidence = calculateConfidence('payment_plans', data, true, 4)

    // 95 - (2 * 5) - 20 - 15 = 95 - 10 - 20 - 15 = 50
    assert.strictEqual(confidence, 50)
  })

  it('should never go below 0%', () => {
    const veryOldDate = new Date('2000-01-01')
    const data = { verified_at: veryOldDate }

    const confidence = calculateConfidence('cost_sheet', data, true, 10)

    assert.ok(confidence >= 0)
    assert.ok(confidence <= 100)
  })

  it('should never exceed 100%', () => {
    const data = { verified_at: new Date() }

    const confidence = calculateConfidence('payment_plans', data, false, 0)

    assert.ok(confidence <= 100)
  })

  it('should clamp to [0, 100] on overage', () => {
    const veryOldDate = new Date('1990-01-01')
    const data = { verified_at: veryOldDate }

    const confidence = calculateConfidence('payment_plans', data, true, 20)

    assert.ok(confidence >= 0)
    assert.ok(confidence <= 100)
  })

  it('should use updated_at if verified_at not present', () => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const data = { updated_at: oneWeekAgo }

    const confidence = calculateConfidence('builder', data)

    // builder base: 85 - (1 * 5) = 80
    assert.strictEqual(confidence, 80)
  })

  it('should use source-based confidence from BASE_CONFIDENCE', () => {
    const data = { verified_at: new Date() }

    const paymentConfidence = calculateConfidence('payment_plans', data)
    const costConfidence = calculateConfidence('cost_sheet', data)
    const builderConfidence = calculateConfidence('builder', data)

    // Base values from BASE_CONFIDENCE: payment_plans=95, cost_sheet=90, builder=85
    assert.strictEqual(paymentConfidence, 95)
    assert.strictEqual(costConfidence, 90)
    assert.strictEqual(builderConfidence, 85)
  })
})
