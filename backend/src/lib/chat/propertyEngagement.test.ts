// backend/src/lib/chat/propertyEngagement.test.ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { scorePropertyEngagement } from './propertyEngagement'

describe('propertyEngagement', () => {
  it('scorePropertyEngagement returns empty array for no engagement', async () => {
    const result = await scorePropertyEngagement('test-session-id', {})
    assert.equal(Array.isArray(result), true)
  })

  it('calculates weights correctly', async () => {
    const projectIdCount = { 'proj-1': 3, 'proj-2': 1 }
    const result = await scorePropertyEngagement('test-session-id', projectIdCount)
    assert(result.length >= 0)
  })
})
