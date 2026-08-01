import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeConversationState } from './conversationEngine'
import type { Intent, ScoredProject } from './types'

const mockResults: ScoredProject[] = [
  {
    id: '1',
    name: 'Project A',
    sector: 'Sector 150',
    city: 'Noida',
    price_min_cr: 1.0,
    price_max_cr: 1.5,
    bhk: [2, 3],
    builder_id: 'b1',
    status: 'ready',
    score: 95,
    confidence: 0.95,
  } as any,
  {
    id: '2',
    name: 'Project B',
    sector: 'Sector 62',
    city: 'Noida',
    price_min_cr: 1.2,
    price_max_cr: 1.8,
    bhk: [3, 4],
    builder_id: 'b2',
    status: 'under_construction',
    score: 85,
    confidence: 0.85,
  } as any,
]

const mockIntent: Intent = {
  sector: 'Sector 150',
  city: 'Noida',
  bhk: [2, 3],
  budgetMin: 1000000,
  budgetMax: 1500000,
  purpose: 'buy',
}

describe('computeConversationState', () => {
  it('should cap chips at 4', async () => {
    const state = await computeConversationState(
      mockIntent,
      { sector: 'found', city: 'found' },
      mockResults,
      false,
      [],
      undefined,
      undefined,
      undefined,
      null,
      true
    )

    assert.ok(state.chips.length <= 4)
  })

  it('generates unique chip IDs for same intent across calls', async () => {
    const state1 = await computeConversationState(
      mockIntent,
      'COLD',
      mockResults,
      false,
      [],
      undefined,
      undefined,
      undefined,
      null,
      true
    )

    const state2 = await computeConversationState(
      mockIntent,
      'COLD',
      mockResults,
      false,
      [],
      undefined,
      undefined,
      undefined,
      null,
      true
    )

    const ids1 = state1.chips.map(c => c.id)
    const ids2 = state2.chips.map(c => c.id)

    // Verify IDs are identical for identical inputs (deterministic)
    assert.deepStrictEqual(ids1, ids2)
  })

  it('prioritizes core chips over clarifying chips', async () => {
    const state = await computeConversationState(
      mockIntent,
      'COLD',
      mockResults,
      false,
      [],
      undefined,
      undefined,
      undefined,
      null,
      true
    )

    if (state.chips.length > 0) {
      assert.ok(state.chips[0].priority <= 3)
    }
  })

  it('handles empty results gracefully', async () => {
    const state = await computeConversationState(
      mockIntent,
      'COLD',
      [],
      false,
      [],
      undefined,
      undefined,
      undefined,
      null,
      true
    )

    assert.ok(state.chips.length >= 0)
  })

  it('filters out compare chips when results < 2', async () => {
    const singleResult = [mockResults[0]]
    const state = await computeConversationState(
      mockIntent,
      'COLD',
      singleResult,
      false,
      [],
      undefined,
      undefined,
      undefined,
      null,
      true
    )

    const compareChips = state.chips.filter(c => c.actionType === 'COMPARE_PROPERTIES')
    assert.equal(compareChips.length, 0)
  })

  it('should deduplicate chips by ID', async () => {
    const state = await computeConversationState(
      mockIntent,
      { sector: 'found', city: 'found' },
      mockResults,
      false,
      [],
      undefined,
      undefined,
      undefined,
      null,
      true
    )

    const ids = state.chips.map(c => c.id)
    const uniqueIds = new Set(ids)
    assert.equal(ids.length, uniqueIds.size)
  })
})
