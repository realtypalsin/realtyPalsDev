import { describe, it, expect } from 'node:test'
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

    expect(state.chips.length).toBeLessThanOrEqual(4)
  })

  it('should generate deterministic chip IDs (same input = same ID)', async () => {
    const state1 = await computeConversationState(
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

    const state2 = await computeConversationState(
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

    const ids1 = state1.chips.map(c => c.id).sort()
    const ids2 = state2.chips.map(c => c.id).sort()

    expect(ids1).toEqual(ids2)
  })

  it('should rank clarifying chips higher than exploratory', async () => {
    const incompleteIntent: Intent = {
      sector: null,
      city: 'Noida',
      bhk: null,
      purpose: 'buy',
    }

    const state = await computeConversationState(
      incompleteIntent,
      { sector: 'missing', city: 'found', bhk: 'missing' },
      [],
      false,
      [],
      undefined,
      undefined,
      undefined,
      null,
      true
    )

    // First chips should be clarifying (lower priority = higher relevance)
    if (state.chips.length > 0) {
      expect(state.chips[0].priority).toBeLessThanOrEqual(3)
    }
  })

  it('should not generate compare chip with single result', async () => {
    const singleResult = [mockResults[0]]

    const state = await computeConversationState(
      mockIntent,
      { sector: 'found', city: 'found' },
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
    expect(compareChips.length).toBe(0)
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
    expect(ids.length).toBe(uniqueIds.size)
  })
})
