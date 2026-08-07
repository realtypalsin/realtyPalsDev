import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeEvalMetrics, scoreHallucination } from './metrics'

describe('eval metrics', () => {
  it('should compute hallucination rate correctly', () => {
    const result = computeEvalMetrics({
      hallucinated: 1,
      total: 20,
      discoveryQueriesRun: 0,
      discoveryCorrect: 0,
    })
    assert.strictEqual(result.hallucination_rate, 0.05)
  })

  it('should compute precision at 5 correctly', () => {
    const result = computeEvalMetrics({
      hallucinated: 0,
      total: 10,
      discoveryQueriesRun: 10,
      discoveryCorrect: 7,
    })
    assert.strictEqual(result.discoveryPrecisionAt5, 0.7)
  })

  it('should mark passed when both metrics meet threshold', () => {
    const result = computeEvalMetrics({
      hallucinated: 0,
      total: 20,
      discoveryQueriesRun: 10,
      discoveryCorrect: 8,
    })
    assert.strictEqual(result.passed, true)
    assert.strictEqual(result.issues.length, 0)
  })

  it('should mark failed when hallucination rate too high', () => {
    const result = computeEvalMetrics({
      hallucinated: 2,
      total: 20,
      discoveryQueriesRun: 10,
      discoveryCorrect: 8,
    })
    assert.strictEqual(result.passed, false)
    assert(result.issues.includes('high hallucination rate'))
  })

  it('should return false when response only mentions expected projects', () => {
    const systemPrompt = 'Verified projects: Godrej Palm Retreat'
    const expectedProjects = new Set(['Godrej Palm Retreat'])

    const hallucinated = scoreHallucination(
      'Godrej Palm Retreat is a great option.',
      systemPrompt,
      expectedProjects
    )
    assert.strictEqual(hallucinated, false)
  })

  it('should handle zero total queries', () => {
    const result = computeEvalMetrics({
      hallucinated: 0,
      total: 0,
      discoveryQueriesRun: 0,
      discoveryCorrect: 0,
    })
    assert.strictEqual(result.hallucination_rate, 0)
    assert.strictEqual(result.discoveryPrecisionAt5, 0)
  })
})
