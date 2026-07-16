import { test, describe } from 'node:test'
import { strict as assert } from 'node:assert'
import { computeConversationState, chip, ConversationStage } from '../conversationEngine'
import type { Intent, ScoredProject } from '../types'
import type { ChipInventory } from '../chipInventory'

const mockInventory: ChipInventory = {
  sectors: [
    { sector: 'Sector 150', projectCount: 5 },
    { sector: 'Sector 79', projectCount: 3 },
  ],
  bhkOptions: [2, 3, 4],
  budgetBuckets: [
    { label: 'Under ₹1.1 Cr', min: 0, max: 1.1 },
    { label: '₹1.1–1.9 Cr', min: 1.1, max: 1.9 },
  ],
  city: 'Noida',
  cachedAt: new Date(),
}

const mockProject: ScoredProject = {
  id: '1',
  slug: 'ace-hanei',
  name: 'ACE Hanei',
  sector: 'Sector 12',
  city: 'Greater Noida West',
  builder: { name: 'ACE Group', slug: 'ace-group' },
  status: 'under_construction',
  price_range_label: '₹3.11–5.70 Cr',
  unit_types: [],
  top_amenities: [],
  top_connectivity: [],
  images: [],
  possession_date: null,
  marketing_claims: [],
  matchScore: 95,
  matchReason: 'Budget + BHK match',
  matchReasons: ['3 BHK', 'Under ₹2Cr'],
  concerns: [],
}

describe('ConversationEngine: Stage Transitions', () => {
  test('DISCOVERY stage on empty chat, no intent', async () => {
    const intent: Intent = {}
    const state = await computeConversationState(intent, 'COLD', [], false, [], undefined, undefined, undefined, mockInventory, false)
    assert.equal(state.stage, 'DISCOVERY')
  })

  test('CLARIFYING stage when user has sent message with partial intent', async () => {
    const intent: Intent = { bhk: [3] }
    const chatHistory = [{ role: 'user', content: 'show me 3 BHK' }]
    const state = await computeConversationState(intent, 'GATHERING', [], false, chatHistory, undefined, undefined, undefined, mockInventory, true)
    assert.equal(state.stage, 'CLARIFYING')
  })

  test('SEARCHING stage when intent is ready to search', async () => {
    const intent: Intent = { sector: 'Sector 150', bhk: [3], budgetMax: 2 }
    const state = await computeConversationState(intent, 'READY_TO_SEARCH', [], false, [], undefined, undefined, undefined, mockInventory, false)
    assert.equal(state.stage, 'SEARCHING')
  })

  test('RESEARCH stage when results available', async () => {
    const intent: Intent = { sector: 'Sector 150', bhk: [3], budgetMax: 2 }
    const results = [mockProject]
    const state = await computeConversationState(intent, 'READY_TO_SEARCH', results, false, [], undefined, undefined, undefined, mockInventory, false)
    assert.equal(state.stage, 'RESEARCH')
  })

  test('COMPARING stage when comparison flag set', async () => {
    const intent: Intent = { sector: 'Sector 150' }
    const results = [mockProject, { ...mockProject, id: '2', name: 'Second Project' }]
    const state = await computeConversationState(intent, 'READY_TO_SEARCH', results, true, [], undefined, undefined, undefined, mockInventory, false)
    assert.equal(state.stage, 'COMPARING')
  })

  test('DECIDING stage when shortlisted with results', async () => {
    const intent: Intent = { sector: 'Sector 150' }
    const results = [mockProject]
    const state = await computeConversationState(intent, 'SHORTLISTED', results, false, [], undefined, undefined, undefined, mockInventory, false)
    assert.equal(state.stage, 'DECIDING')
  })
})

describe('ConversationEngine: Chip Generation', () => {
  test('DISCOVERY chips ≤4 total (2 sectors max + 1 budget + 1 BHK)', async () => {
    const intent: Intent = {}
    const state = await computeConversationState(intent, 'COLD', [], false, [], undefined, undefined, undefined, mockInventory, false)
    assert(state.chips.length <= 4, `Expected ≤4 chips, got ${state.chips.length}`)
  })

  test('CLARIFYING chips do not repeat previously suggested', async () => {
    const intent: Intent = { bhk: [3] }
    const chatHistory = [
      { role: 'user', content: 'I need 3 BHK in Sector 150' },
      { role: 'assistant', content: 'Sector 150 has...' },
    ]
    const state = await computeConversationState(intent, 'GATHERING', [], false, chatHistory, undefined, undefined, undefined, mockInventory, true)
    const sectorChips = state.chips.filter(c => c.label.includes('Sector'))
    const hasSector150 = sectorChips.some(c => c.label.includes('Sector 150'))
    assert(!hasSector150, 'Should not repeat Sector 150 when already in history')
  })

  test('Chip IDs are stable across calls (same intent → same IDs)', async () => {
    const intent: Intent = { bhk: [3] }
    const chatHistory = [{ role: 'user', content: 'show me 3 BHK' }]

    const state1 = await computeConversationState(intent, 'GATHERING', [], false, chatHistory, undefined, undefined, undefined, mockInventory, true)
    const state2 = await computeConversationState(intent, 'GATHERING', [], false, chatHistory, undefined, undefined, undefined, mockInventory, true)

    const ids1 = state1.chips.map(c => c.id).sort()
    const ids2 = state2.chips.map(c => c.id).sort()

    assert.deepEqual(ids1, ids2, 'Chip IDs should be stable for same intent')
  })

  test('Clarifying chips dedup by label (C2)', async () => {
    const intent: Intent = { sector: 'Sector 150' }
    const chatHistory = [
      { role: 'user', content: 'show me 2 BHK and also 3 BHK' },
      { role: 'assistant', content: 'Here are options...' },
    ]
    const state = await computeConversationState(intent, 'GATHERING', [], false, chatHistory, undefined, undefined, undefined, mockInventory, true)

    const labels = state.chips.map(c => c.label)
    const uniqueLabels = new Set(labels)
    assert.equal(labels.length, uniqueLabels.size, 'Should have no duplicate chip labels')
  })

  test('Does not show hardcoded lifestyle chips (C4)', async () => {
    const intent: Intent = { sector: 'Sector 150', bhk: [3], budgetMax: 2 }
    const state = await computeConversationState(intent, 'READY_TO_SEARCH', [], false, [], undefined, undefined, undefined, mockInventory, false)

    const lifestyleChips = state.chips.filter(c =>
      c.label.match(/metro|school|mall|gym|park/i)
    )
    assert.equal(lifestyleChips.length, 0, 'Should not show hardcoded lifestyle chips')
  })

  test('Single result in SEARCH stage does not offer compare chip', async () => {
    const intent: Intent = { sector: 'Sector 150', bhk: [3] }
    const results = [mockProject] // Only 1 result
    const state = await computeConversationState(intent, 'READY_TO_SEARCH', results, false, [], undefined, undefined, undefined, mockInventory, false)

    const compareChips = state.chips.filter(c => c.actionType === 'COMPARE_PROPERTIES')
    assert.equal(compareChips.length, 0, 'Single result should not offer comparison')
  })

  test('Chip priority ordering is sequential and correct', async () => {
    const intent: Intent = {}
    const state = await computeConversationState(intent, 'COLD', [], false, [], undefined, undefined, undefined, mockInventory, false)

    const priorities = state.chips.map(c => c.priority)
    for (let i = 1; i < priorities.length; i++) {
      assert(priorities[i] > priorities[i - 1], `Priority should be ascending: ${priorities}`)
    }
  })
})

describe('ConversationEngine: Chip Factory', () => {
  test('chip() helper creates valid action', () => {
    const action = chip(
      'C1',
      'INTENT_PATCH',
      'Test Label',
      '📍',
      { patch: { sector: 'Sector 150' } },
      1
    )
    assert.equal(action.id, 'C1')
    assert.equal(action.label, 'Test Label')
    assert.equal(action.actionType, 'INTENT_PATCH')
    assert.equal(action.analyticsId, 'C1')
  })

  test('chip() with group preserves group data', () => {
    const group = { id: 'sectors', label: 'Popular Sectors', order: 0, emphasis: 'primary' as const }
    const action = chip(
      'C2',
      'INTENT_PATCH',
      'Sector 150',
      '📍',
      { patch: { sector: 'Sector 150' } },
      1,
      group
    )
    assert.deepEqual(action.group, group)
  })
})

describe('ConversationEngine: Missing Fields', () => {
  test('identifies all missing fields on COLD intent', async () => {
    const intent: Intent = {}
    const state = await computeConversationState(intent, 'COLD', [], false, [], undefined, undefined, undefined, mockInventory, false)
    assert(state.missingFields.includes('location') || state.missingFields.includes('sector'), 'Should indicate missing location')
  })

  test('no missing fields when full intent provided', async () => {
    const intent: Intent = {
      sector: 'Sector 150',
      bhk: [3],
      budgetMax: 2,
      purpose: 'residential'
    }
    const state = await computeConversationState(intent, 'READY_TO_SEARCH', [], false, [], undefined, undefined, undefined, mockInventory, false)
    assert.equal(state.missingFields.length, 0, 'Should have no missing fields')
  })
})
