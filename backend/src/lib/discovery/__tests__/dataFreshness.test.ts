import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  calculateDaysOld,
  formatFreshness,
  isDataStale,
  needsReverification,
  generateFreshnessWarning,
  buildFreshnessInfo,
  buildDataFreshness,
  buildMissingDataWarnings,
  shouldShowReverificationChips,
  getAggregateFreshness
} from '../dataFreshness'

describe('Data Freshness Module', () => {
  describe('calculateDaysOld', () => {
    it('calculates days from verified_at', () => {
      const now = new Date()
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

      const daysOld = calculateDaysOld(threeDaysAgo)
      assert.strictEqual(daysOld, 3)
    })

    it('handles null/undefined gracefully', () => {
      assert.strictEqual(calculateDaysOld(null), 0)
      assert.strictEqual(calculateDaysOld(undefined), 0)
    })

    it('returns 0 for today', () => {
      const now = new Date()
      assert.strictEqual(calculateDaysOld(now), 0)
    })

    it('handles future dates as 0', () => {
      const future = new Date(Date.now() + 1000)
      assert.strictEqual(calculateDaysOld(future), 0)
    })
  })

  describe('formatFreshness', () => {
    it('returns "just now" for today', () => {
      const now = new Date()
      const formatted = formatFreshness(now)
      assert.ok(formatted.includes('just now'))
    })

    it('returns "X days ago" for recent dates', () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      const formatted = formatFreshness(fiveDaysAgo)
      assert.ok(formatted.includes('5 days ago'))
    })

    it('returns "X weeks ago" for older dates', () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      const formatted = formatFreshness(twoWeeksAgo)
      assert.ok(formatted.includes('2 weeks ago'))
    })

    it('returns "X months ago" for very old dates', () => {
      const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      const formatted = formatFreshness(twoMonthsAgo)
      assert.ok(formatted.includes('2 months ago'))
    })

    it('handles null/undefined', () => {
      const formatted = formatFreshness(null)
      assert.ok(formatted.includes('unknown'))
    })
  })

  describe('isDataStale', () => {
    it('returns false for data < 30 days old', () => {
      const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
      assert.strictEqual(isDataStale(twentyDaysAgo), false)
    })

    it('returns true for data > 30 days old', () => {
      const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
      assert.strictEqual(isDataStale(fortyDaysAgo), true)
    })

    it('returns false for null/undefined', () => {
      assert.strictEqual(isDataStale(null), false)
      assert.strictEqual(isDataStale(undefined), false)
    })
  })

  describe('needsReverification', () => {
    it('returns true when confidence < 50%', () => {
      assert.strictEqual(needsReverification(45), true)
      assert.strictEqual(needsReverification(0), true)
    })

    it('returns false when confidence >= 50%', () => {
      assert.strictEqual(needsReverification(50), false)
      assert.strictEqual(needsReverification(95), false)
    })

    it('handles edge case: exactly 50%', () => {
      assert.strictEqual(needsReverification(50), false)
    })
  })

  describe('generateFreshnessWarning', () => {
    it('returns critical warning for very old data (> 120 days)', () => {
      const warning = generateFreshnessWarning(150, 75, 'builder')
      assert.ok(warning)
      assert.strictEqual(warning.severity, 'critical')
      assert.ok(warning.message.includes('outdated'))
    })

    it('returns critical warning for very low confidence (< 30%)', () => {
      const warning = generateFreshnessWarning(10, 20, 'payment_plans')
      assert.ok(warning)
      assert.strictEqual(warning.severity, 'critical')
    })

    it('returns warning for stale data (30-120 days)', () => {
      const warning = generateFreshnessWarning(60, 75, 'location')
      assert.ok(warning)
      assert.strictEqual(warning.severity, 'warning')
      assert.ok(warning.message.includes('60 days'))
    })

    it('returns warning for low confidence (30-50%)', () => {
      const warning = generateFreshnessWarning(10, 40, 'builder')
      assert.ok(warning)
      assert.strictEqual(warning.severity, 'warning')
    })

    it('returns info for moderately aged data (7-30 days)', () => {
      const warning = generateFreshnessWarning(15, 80, 'payment_plans')
      assert.ok(warning)
      assert.strictEqual(warning.severity, 'info')
    })

    it('returns null for fresh data', () => {
      const warning = generateFreshnessWarning(2, 95, 'costs')
      assert.strictEqual(warning, null)
    })
  })

  describe('buildFreshnessInfo', () => {
    it('builds complete freshness info', () => {
      const data = {
        verified_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        name: 'Project A'
      }

      const info = buildFreshnessInfo('payment_plans', data, 85)

      assert.strictEqual(info.source, 'payment_plans')
      assert.strictEqual(info.days_old, 5)
      assert.strictEqual(info.is_stale, false)
      assert.strictEqual(info.needs_reverification, false)
      assert.ok(info.freshness_display.includes('5 days'))
    })

    it('flags stale data and low confidence', () => {
      const data = {
        verified_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      }

      const info = buildFreshnessInfo('builder', data, 40)

      assert.strictEqual(info.is_stale, true)
      assert.strictEqual(info.needs_reverification, true)
    })
  })

  describe('buildDataFreshness', () => {
    it('builds data_freshness object for multiple sources', () => {
      const sources = [
        {
          name: 'payment_plans',
          data: { verified_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
        },
        {
          name: 'builder',
          data: { verified_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) }
        }
      ]

      const freshness = buildDataFreshness(sources)

      assert.ok(freshness.payment_plans)
      assert.ok(freshness.builder)
      assert.ok(freshness.payment_plans.includes('2 days'))
      assert.ok(freshness.builder.includes('weeks')) // 20 days = ~2-3 weeks
    })
  })

  describe('buildMissingDataWarnings', () => {
    it('adds warnings for very old data', () => {
      const sources = [
        {
          name: 'location',
          data: { verified_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          confidence: 75
        }
      ]

      const warnings = buildMissingDataWarnings(sources)

      assert.ok(warnings.length > 0)
      assert.ok(warnings[0].includes('outdated'))
    })

    it('adds warnings for low confidence', () => {
      const sources = [
        {
          name: 'builder',
          data: { verified_at: new Date() },
          confidence: 45
        }
      ]

      const warnings = buildMissingDataWarnings(sources)

      assert.ok(warnings.length > 0)
      assert.ok(warnings[0].includes('incomplete'))
    })

    it('adds warnings for incomplete data', () => {
      const sources = [
        {
          name: 'possession',
          data: { verified_at: new Date() },
          confidence: 80,
          isIncomplete: true
        }
      ]

      const warnings = buildMissingDataWarnings(sources)

      assert.ok(warnings.length > 0)
      assert.ok(warnings[0].includes('missing fields'))
    })
  })

  describe('shouldShowReverificationChips', () => {
    it('returns true if any source has confidence < 50%', () => {
      const sources = [
        { confidence: 80 },
        { confidence: 45 },
        { confidence: 90 }
      ]

      assert.strictEqual(shouldShowReverificationChips(sources), true)
    })

    it('returns false if all sources have confidence >= 50%', () => {
      const sources = [
        { confidence: 80 },
        { confidence: 75 },
        { confidence: 60 }
      ]

      assert.strictEqual(shouldShowReverificationChips(sources), false)
    })
  })

  describe('getAggregateFreshness', () => {
    it('calculates freshness stats', () => {
      const sources = [
        { verified_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
        { verified_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
        { verified_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) }
      ]

      const stats = getAggregateFreshness(sources)

      assert.strictEqual(stats.freshest_days, 3)
      assert.strictEqual(stats.stalest_days, 15)
      assert.ok(stats.average_days > 8 && stats.average_days < 10)
    })

    it('handles empty sources', () => {
      const stats = getAggregateFreshness([])

      assert.strictEqual(stats.freshest_days, 0)
      assert.strictEqual(stats.stalest_days, 0)
      assert.strictEqual(stats.average_days, 0)
    })
  })
})
