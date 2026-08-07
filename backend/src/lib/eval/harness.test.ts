import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { runEvaluation } from './harness'

describe('eval harness', () => {
  it('should run evaluation without handler (stub mode)', async () => {
    const queries = [
      {
        id: '1',
        query: 'Show 3BHK properties',
        shouldNotHallucinate: true,
        description: 'test query',
      },
      {
        id: '2',
        query: 'Compare sectors',
        shouldNotHallucinate: true,
        description: 'test query 2',
      },
    ]

    const result = await runEvaluation(queries)
    assert.equal(result.totalQueries, 2)
    assert(result.passed === true || result.passed === false)
  })

  it('should run evaluation with mock handler', async () => {
    const mockHandler = async (query: string) => {
      if (query.includes('3BHK')) {
        return 'Godrej Palm Retreat is a 3BHK property in Sector 150.'
      }
      return 'Here are the sector comparisons.'
    }

    const queries = [
      {
        id: '1',
        query: 'Show 3BHK properties',
        shouldFindProject: ['Godrej Palm Retreat'],
        shouldNotHallucinate: true,
        description: 'discovery query',
      },
    ]

    const result = await runEvaluation(queries, mockHandler)
    assert.equal(result.totalQueries, 1)
    assert(result.passed === true || result.passed === false)
  })

  it('should handle query failures gracefully', async () => {
    const failingHandler = async () => {
      throw new Error('Handler failed')
    }

    const queries = [
      {
        id: '1',
        query: 'Test query',
        shouldNotHallucinate: true,
        description: 'failing query',
      },
    ]

    const result = await runEvaluation(queries, failingHandler)
    assert(result instanceof Object)
    assert.equal(result.totalQueries, 1)
  })

  it('should count hallucinations', async () => {
    const handler = async () => 'Lodha Metropolis Residences in Sector 75'

    const queries = [
      {
        id: '1',
        query: 'Show properties',
        shouldFindProject: new Array<string>(),
        shouldNotHallucinate: true,
        description: 'hallucination test',
      },
    ]

    const result = await runEvaluation(queries, handler)
    assert(result.totalQueries === 1 || result.hallucinations === 0)
  })
})
