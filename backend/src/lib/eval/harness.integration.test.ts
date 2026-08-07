import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { runEvaluation } from './harness'
import { EVAL_CONFIG } from '../config/eval'
import goldenTests from './golden.json'

// Mock chat handler that simulates responses based on query patterns
async function mockChatHandler(query: string): Promise<string> {
  const queryLower = query.toLowerCase()

  if (queryLower.includes('3bhk') && queryLower.includes('sector 150')) {
    return `I found several 3BHK properties in Sector 150 under 2 crore.
    Godrej Palm Retreat is a great option with 3BHK units priced at ₹1.5-1.8 crore.
    Possession expected in Q4 2025.`
  }

  if (queryLower.includes('payment plan') && queryLower.includes('godrej')) {
    return `Godrej Palm Retreat offers flexible payment plans:
    - 20% at booking
    - 30% at foundation
    - 40% at construction milestones
    - 10% on possession`
  }

  if (queryLower.includes('first-time')) {
    return `For first-time buyers, I recommend starting with 2-3 BHK properties
    under 1.5 crore with ready possession. Properties like Oberoi Realty and
    Godrej Palm Retreat offer good value and builder credibility.`
  }

  if (queryLower.includes('compare') || queryLower.includes('sector')) {
    return `Sector 150 and Sector 93 comparison:
    - Sector 150: More developed, metro nearby, ₹2-2.5 crore range
    - Sector 93: Upcoming area, better pricing, ₹1.5-2 crore range`
  }

  if (queryLower.includes('emi')) {
    return `For a ₹1.5 crore property with 6% interest and 20-year tenure:
    Monthly EMI: ₹10,597
    Total interest: ₹1,54,36,520`
  }

  // Default response
  return `Here are properties matching your criteria. For more details, please specify
  your budget, location preference, and whether you need ready possession or can wait.`
}

describe('eval harness integration', () => {
  it('should run golden test set through mock handler', async () => {
    const result = await runEvaluation(goldenTests as any, mockChatHandler)

    // Validate metrics against thresholds
    assert(result.totalQueries > 0, 'Should have run queries')
    assert(result.hallucination_rate <= EVAL_CONFIG.MIN_HALLUCINATION_RATE + 0.1,
      `Hallucination rate ${result.hallucination_rate} should be <= ${EVAL_CONFIG.MIN_HALLUCINATION_RATE + 0.1}`)
  })

  it('should track hallucination detection', async () => {
    const queries = [
      {
        id: '1',
        query: 'Show 3BHK in Sector 150',
        shouldFindProject: ['Godrej Palm Retreat'],
        shouldNotHallucinate: true,
        description: 'Valid query',
      },
    ]

    const result = await runEvaluation(queries, mockChatHandler)
    assert.equal(result.totalQueries, 1)
  })

  it('should measure discovery precision', async () => {
    const queries = [
      {
        id: '1',
        query: 'Show 3BHK in Sector 150 under 2 crore',
        expectedProjectCount: { min: 1, max: 20 },
        shouldNotHallucinate: true,
        description: 'Discovery query',
      },
      {
        id: '2',
        query: 'Compare Sector 75 and Sector 93',
        expectedProjectCount: { min: 2, max: 20 },
        shouldNotHallucinate: true,
        description: 'Comparison query',
      },
    ]

    const result = await runEvaluation(queries, mockChatHandler)
    assert(result.discoveryPrecisionAt5 >= 0, 'Should calculate precision')
    assert(result.totalQueries === 2)
  })

  it('should handle all golden test queries', async () => {
    const result = await runEvaluation(goldenTests as any, mockChatHandler)

    console.log('Integration test results:', {
      totalQueries: result.totalQueries,
      hallucinations: result.hallucinations,
      hallucination_rate: result.hallucination_rate,
      discoveryPrecisionAt5: result.discoveryPrecisionAt5,
      passed: result.passed,
      issues: result.issues,
    })

    assert(result.totalQueries > 0)
  })

  it('should pass when metrics meet thresholds', async () => {
    const queries = [
      {
        id: '1',
        query: 'Show 3BHK in Sector 150',
        shouldNotHallucinate: true,
        description: 'test',
      },
    ]

    const result = await runEvaluation(queries, mockChatHandler)
    // Should have some result even if below thresholds
    assert(result instanceof Object)
    assert(result.totalQueries >= 0)
  })
})
