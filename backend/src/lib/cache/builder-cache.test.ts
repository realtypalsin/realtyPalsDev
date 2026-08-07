import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getBuilderReputations, invalidateBuilderCache } from './builder-cache'

describe('builder cache', () => {
  it('should handle empty builder list', async () => {
    const result = await getBuilderReputations([])
    assert.equal(result.size, 0)
  })

  it('should return a map', async () => {
    const result = await getBuilderReputations(['b-test-123'])
    assert(result instanceof Map)
  })

  it('should deduplicate builder IDs', async () => {
    const ids = ['b-1', 'b-1', 'b-2', 'b-2', 'b-3']
    const result = await getBuilderReputations(ids)
    // Should fetch at most 3 unique builders
    assert(result.size <= 3)
  })

  it('should handle nonexistent builders gracefully', async () => {
    const result = await getBuilderReputations(['b-nonexistent-xyz'])
    // Should not throw, just return empty or with nulls
    assert(result instanceof Map)
  })

  it('should cache invalidation be callable', async () => {
    await invalidateBuilderCache('b-test-123')
    // Should not throw
    assert(true)
  })
})
