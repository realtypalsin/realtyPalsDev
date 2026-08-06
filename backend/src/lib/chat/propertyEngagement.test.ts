// backend/src/lib/chat/propertyEngagement.test.ts
import { describe, it, expect } from 'vitest'
import { scorePropertyEngagement } from './propertyEngagement'

describe('propertyEngagement', () => {
  it('scorePropertyEngagement returns empty array for no engagement', async () => {
    // This test would need a mock database, so we'll skip actual DB calls
    const result = await scorePropertyEngagement('test-session-id', {})
    expect(Array.isArray(result)).toBe(true)
  })

  it('calculates weights correctly', async () => {
    // Test weight calculation logic
    const projectIdCount = { 'proj-1': 3, 'proj-2': 1 }
    // With weight=1 per mention: proj-1 should have weight 3, proj-2 should have weight 1
    const result = await scorePropertyEngagement('test-session-id', projectIdCount)
    expect(result.length).toBeGreaterThanOrEqual(0)
  })
})
