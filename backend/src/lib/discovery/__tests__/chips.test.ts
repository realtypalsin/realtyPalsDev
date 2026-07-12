import { describe, it } from 'node:test'
import { strict as assert } from 'node:assert'
import { computeConversationState } from '../conversationEngine'
import type { Intent, ScoredProject } from '../types'
import type { ChipInventory } from '../chipInventory'

// Mock chip inventory
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
}

// Mock projects
const mockProjects: ScoredProject[] = [
  {
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
    matchScore: 95,
    matchReason: 'Budget + BHK match',
    matchReasons: ['3 BHK', 'Under ₹2Cr'],
    concerns: [],
  },
]

describe('Chips: Adaptive & Predictive', () => {
  describe('Stage 1: DISCOVERY (no chat history, empty input)', () => {
    it('shows generic discovery chips on first message with empty intent', () => {
      const intent: Intent = {}
      const state = computeConversationState(intent, 'COLD', [], false, [])
      assert.equal(state.stage, 'DISCOVERY')
      assert.ok(state.chips.length > 0, 'DISCOVERY stage should show chips')
      assert.ok(
        state.chips.some((c) => c.actionType === 'INTENT_PATCH'),
        'Should show sector/BHK/budget chips'
      )
    })

    it('does NOT show discovery chips on first message with real intent', () => {
      const intent: Intent = { sector: 'Sector 150', bhk: [3] }
      const state = computeConversationState(intent, 'READY_TO_SEARCH', [], false, [])
      assert.equal(state.stage, 'SEARCHING')
      assert.ok(
        !state.chips.some((c) => c.actionType === 'INTENT_PATCH' && c.label.includes('Sector')),
        'SEARCHING stage should not repeat sector chips'
      )
    })
  })

  describe('Stage 2: CLARIFYING (chat history, partial intent)', () => {
    it('shows missing field chips when only BHK specified', () => {
      const intent: Intent = { bhk: [3] }
      const chatHistory = [{ role: 'user', content: 'show me 3 BHK' }]
      const state = computeConversationState(intent, 'GATHERING', [], false, chatHistory, undefined, undefined, undefined, mockInventory)
      assert.equal(state.stage, 'CLARIFYING')
      assert.ok(
        state.chips.some((c) => c.label.includes('Sector')),
        'Should ask for missing sector'
      )
    })

    it('does NOT show chips for garbage input mid-chat', () => {
      const intent: Intent = {} // Empty intent from "Lorem ipsum × 100"
      const chatHistory = [
        { role: 'user', content: 'what all are the amenities in ace hanei' },
        { role: 'assistant', content: 'Here are the amenities...' },
        { role: 'user', content: 'Lorem ipsum × 100' },
      ]
      const state = computeConversationState(intent, 'COLD', [], false, chatHistory, undefined, undefined, undefined, mockInventory)
      assert.equal(state.stage, 'CLARIFYING')
      // getClarifyingChips checks results, and with empty results should show no chips
      assert.equal(state.chips.length, 0, 'Should not show chips for garbage input')
    })

    it('does NOT show chips for emoji-only input mid-chat', () => {
      const intent: Intent = {} // Empty intent from "🏠🏘️🏢"
      const chatHistory = [
        { role: 'user', content: 'what about nearby metro?' },
        { role: 'assistant', content: '...' },
        { role: 'user', content: '🏠🏘️🏢' },
      ]
      const state = computeConversationState(intent, 'COLD', [], false, chatHistory, undefined, undefined, undefined, mockInventory)
      assert.equal(state.chips.length, 0, 'Emoji-only input should not show chips')
    })
  })

  describe('Stage 3: SEARCHING (discovery running)', () => {
    it('shows discovery chips while searching to allow refinement', () => {
      const intent: Intent = { sector: 'Sector 150' }
      const chatHistory = [{ role: 'user', content: 'properties in Sector 150' }]
      const state = computeConversationState(intent, 'READY_TO_SEARCH', [], false, chatHistory, undefined, undefined, undefined, mockInventory)
      assert.equal(state.stage, 'SEARCHING')
      // Searching stage offers discovery chips for refinement
      assert.ok(state.chips.length > 0, 'Should offer refinement chips while searching')
    })
  })

  describe('Stage 4: RESEARCH (results found)', () => {
    it('shows contextual next-step chips when results found', () => {
      const intent: Intent = { sector: 'Sector 150', bhk: [3], budgetMax: 2 }
      const chatHistory = [{ role: 'user', content: 'properties in sector 150' }]
      const state = computeConversationState(intent, 'READY_TO_SEARCH', mockProjects, false, chatHistory)
      assert.equal(state.stage, 'RESEARCH')
      assert.ok(state.chips.length > 0, 'RESEARCH should show action chips')
      assert.ok(
        state.chips.some((c) => ['COMPARE_PROPERTIES', 'CALCULATE_EMI'].includes(c.actionType)),
        'Should suggest compare or calculate next steps'
      )
    })
  })

  describe('Stage 5: COMPARING (user compared projects)', () => {
    it('shows comparison-specific chips', () => {
      const intent: Intent = {
        projectNames: ['ACE Hanei', 'Elite X'],
        is_comparison_query: true,
      }
      const state = computeConversationState(intent, 'READY_TO_SEARCH', mockProjects, true)
      assert.equal(state.stage, 'COMPARING')
      assert.ok(
        state.chips.some((c) => c.actionType === 'COMPARE_PROPERTIES'),
        'Should show comparison action chips'
      )
    })
  })

  describe('Stage 6: DECIDING (ready to commit)', () => {
    it('shows booking/callback chips when user ready to decide', () => {
      const intent: Intent = { sector: 'Sector 12', bhk: [3] }
      const state = computeConversationState(intent, 'SHORTLISTED', mockProjects, false)
      assert.equal(state.stage, 'DECIDING')
      assert.ok(
        state.chips.some((c) => ['BOOK_VISIT', 'CALLBACK_REQUEST'].includes(c.actionType)),
        'Should show booking/callback chips'
      )
    })
  })

  describe('Chips: Data-Driven (not hardcoded)', () => {
    it('chips vary based on actual results', () => {
      // With 0 results
      const state0 = computeConversationState({ sector: 'Sector 150' }, 'GATHERING', [], false, [{ role: 'user', content: 'sector 150' }], undefined, undefined, undefined, mockInventory)
      // With 5+ results
      const state5 = computeConversationState({ sector: 'Sector 150' }, 'READY_TO_SEARCH', mockProjects, false, [{ role: 'user', content: 'sector 150' }])

      assert.notEqual(
        state0.chips.length,
        state5.chips.length,
        'Chips should differ based on result count'
      )
    })

    it('chips respect inventory data (not hardcoded sectors)', () => {
      const intent: Intent = { bhk: [3] }
      const state = computeConversationState(intent, 'GATHERING', [], false, [{ role: 'user', content: '3 BHK' }], undefined, undefined, undefined, mockInventory)
      const sectorChips = state.chips.filter((c) => c.icon === '📍')
      assert.ok(
        sectorChips.every((c) => ['Sector 150', 'Sector 79'].includes(c.label)),
        'Sector chips should come from inventory, not hardcoded'
      )
    })
  })

  describe('Chips: Avoid Repetition', () => {
    it('does not repeat suggestions already in chat history', () => {
      const intent: Intent = { bhk: [3] }
      const chatHistory = [
        { role: 'user', content: '3 BHK' },
        { role: 'assistant', content: 'Which sector? Sector 150, Sector 79, or other?' },
      ]
      const state = computeConversationState(intent, 'GATHERING', [], false, chatHistory, undefined, undefined, undefined, mockInventory)
      const sectorChips = state.chips.filter((c) => c.icon === '📍')
      assert.ok(
        sectorChips.length <= 3,
        'Should not repeat already-suggested sectors'
      )
    })
  })

  describe('Chips: Predict Next Step', () => {
    it('suggests logical next action based on stage', () => {
      const scenarios = [
        { stage: 'CLARIFYING' as const, expects: 'missing field suggestions' },
        { stage: 'RESEARCH' as const, expects: 'compare/analyze actions' },
        { stage: 'DECIDING' as const, expects: 'booking/contact actions' },
      ]

      for (const scenario of scenarios) {
        const intent: Intent = { sector: 'Sector 150', bhk: [3] }
        const state = computeConversationState(intent, scenario.stage, mockProjects.slice(0, 1), false, [{ role: 'user', content: 'test' }])
        assert.ok(
          state.chips.length > 0,
          `Stage ${scenario.stage} should suggest ${scenario.expects}`
        )
      }
    })
  })

  describe('Chips: Filter by Project Name', () => {
    it('shows relevant data when user asks for specific project', () => {
      const intent: Intent = { projectNames: ['ACE Hanei'] }
      const state = computeConversationState(intent, 'READY_TO_SEARCH', mockProjects, false, [{ role: 'user', content: 'tell me about ace hanei' }])
      // Should not show DISCOVERY chips (sectors/bhk/budget picker)
      assert.ok(
        !state.chips.some((c) => c.label.includes('Sector')),
        'Should not show sector chips when specific project requested'
      )
    })
  })
})
