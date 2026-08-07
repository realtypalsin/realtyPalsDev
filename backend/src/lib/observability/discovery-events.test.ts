import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { trackDiscoveryBranch, trackGuardrailTrigger, trackTokenUsage } from './discovery-events'

describe('discovery events', () => {
  it('should track discovery branch without error', () => {
    const result = {
      exactResults: [{ id: 'p1' }],
      nearbyResults: [],
    }
    // Should not throw
    trackDiscoveryBranch('B2_HARD_FILTER', result, {
      sector: 'Sector 150',
      bhk: [3],
      budgetMax: 2.0,
    })
    assert(true)
  })

  it('should track guardrail trigger without error', () => {
    const violations = [
      { type: 'name_fabrication', detail: 'test' },
      { type: 'price_fabrication', detail: 'test' },
    ]
    // Should not throw
    trackGuardrailTrigger(violations, true, 250)
    assert(true)
  })

  it('should track token usage without error', () => {
    // Should not throw
    trackTokenUsage(40_000, 30_000, 100_000)
    assert(true)
  })

  it('should handle empty violations', () => {
    // Should not throw
    trackGuardrailTrigger([], false, 100)
    assert(true)
  })

  it('should handle all discovery branches', () => {
    const branches: Array<'B1_EXACT' | 'B2_HARD_FILTER' | 'B2_FALLBACK' | 'B3_EXPANSION' | 'B4_CITYWIDE'> = [
      'B1_EXACT',
      'B2_HARD_FILTER',
      'B2_FALLBACK',
      'B3_EXPANSION',
      'B4_CITYWIDE',
    ]
    const result = { exactResults: [], nearbyResults: [] }
    for (const branch of branches) {
      trackDiscoveryBranch(branch, result, {})
    }
    assert(true)
  })
})
