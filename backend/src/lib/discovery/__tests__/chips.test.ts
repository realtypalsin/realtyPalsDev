import { describe, it } from 'node:test'
import { strict as assert } from 'node:assert'
import { computeConversationState } from '../conversationEngine'
import { Intent, ScoredProject } from '../types'
import { ChipInventory } from '../chipInventory'

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
  city: 'Noida',
  cachedAt: new Date(),
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
    possession_date: null,
    marketing_claims: [],
    matchScore: 95,
    matchReason: 'Budget + BHK match',
    matchReasons: ['3 BHK', 'Under ₹2Cr'],
    concerns: [],
  },
]

describe('Chips: Adaptive & Predictive', () => {
  describe('Stage 1: DISCOVERY (no chat history, empty input)', () => {
    it('', async () => {
      const intent: Intent = {}
      const state = await computeConversationState(intent, 'COLD', [], false, [], undefined, undefined, undefined, mockInventory, false)
      assert.equal(state.stage, 'DISCOVERY')
      assert.ok(state.chips.length > 0, 'DISCOVERY stage should show chips')
      assert.ok(
        state.chips.some((c) => c.actionType === 'INTENT_PATCH'),
        'Should show sector/BHK/budget chips'
      )
    })

    it('', async () => {
      const intent: Intent = { sector: 'Sector 150', bhk: [3] }
      const state = await computeConversationState(intent, 'READY_TO_SEARCH', [], false, [], undefined, undefined, undefined, mockInventory, true, undefined, { allowLlmChips: false })
      assert.equal(state.stage, 'SEARCHING')
      assert.ok(
        !state.chips.some((c) => c.actionType === 'INTENT_PATCH' && c.label.includes('Sector')),
        'SEARCHING stage should not repeat sector chips'
      )
    })
  })

  describe('Stage 2: CLARIFYING (chat history, partial intent)', () => {
    it('', async () => {
      const intent: Intent = { bhk: [3] }
      const chatHistory = [{ role: 'user', content: 'show me 3 BHK' }]
      const state = await computeConversationState(intent, 'GATHERING', [], false, chatHistory, undefined, undefined, undefined, mockInventory, true, undefined, { allowLlmChips: false })
      assert.equal(state.stage, 'CLARIFYING')
      assert.ok(
        state.chips.some((c) => c.label.includes('Sector')),
        'Should ask for missing sector'
      )
    })

    it('', async () => {
      const intent: Intent = {} // Empty intent from "Lorem ipsum × 100"
      const chatHistory = [
        { role: 'user', content: 'what all are the amenities in ace hanei' },
        { role: 'assistant', content: 'Here are the amenities...' },
        { role: 'user', content: 'Lorem ipsum × 100' },
      ]
      const state = await computeConversationState(intent, 'COLD', [], false, chatHistory, undefined, undefined, undefined, mockInventory, true, undefined, { allowLlmChips: false })
      assert.equal(state.stage, 'CLARIFYING')
      assert.ok(state.chips.length > 0, 'Should show chips for garbage input to guide the user')
    })

    it('', async () => {
      const intent: Intent = {} // Empty intent from "🏠🏘️🏢"
      const chatHistory = [
        { role: 'user', content: 'what about nearby metro?' },
        { role: 'assistant', content: '...' },
        { role: 'user', content: '🏠🏘️🏢' },
      ]
      const state = await computeConversationState(intent, 'COLD', [], false, chatHistory, undefined, undefined, undefined, mockInventory, true, undefined, { allowLlmChips: false })
      assert.ok(state.chips.length > 0, 'Emoji-only input should show chips')
    })
  })

  describe('Stage 3: SEARCHING (discovery running)', () => {
    it('', async () => {
      const intent: Intent = { sector: 'Sector 150' }
      const chatHistory = [{ role: 'user', content: 'properties in Sector 150' }]
      const state = await computeConversationState(intent, 'READY_TO_SEARCH', [], false, chatHistory, undefined, undefined, undefined, mockInventory, true, undefined, { allowLlmChips: false })
      assert.equal(state.stage, 'SEARCHING')
      assert.ok(state.chips.length > 0, 'Should offer refinement chips while searching')
    })
  })

  describe('Stage 4: RESEARCH (results found)', () => {
    it('', async () => {
      const intent: Intent = { sector: 'Sector 150', bhk: [3], budgetMax: 2 }
      const chatHistory = [{ role: 'user', content: 'properties in sector 150' }]
      const state = await computeConversationState(intent, 'READY_TO_SEARCH', mockProjects, false, chatHistory, undefined, undefined, undefined, mockInventory, true, undefined, { allowLlmChips: false })
      assert.equal(state.stage, 'RESEARCH')
      assert.ok(state.chips.length > 0, 'RESEARCH should show action chips')
      assert.ok(
        state.chips.some((c) => ['TEXT_MESSAGE'].includes(c.actionType)),
        'Should suggest price trends or builder risk next steps'
      )
    })
  })

  describe('Stage 5: COMPARING (user compared projects)', () => {
    it('', async () => {
      const intent: Intent = {
        projectNames: ['ACE Hanei', 'Elite X'],
        is_comparison_query: true,
      }
      const state = await computeConversationState(intent, 'READY_TO_SEARCH', mockProjects, true, [], undefined, undefined, undefined, mockInventory, true, undefined, { allowLlmChips: false })
      assert.equal(state.stage, 'COMPARING')
      assert.ok(
        state.chips.some((c) => c.actionType === 'TEXT_MESSAGE'),
        'Should show comparison action chips'
      )
    })
  })

  describe('Stage 6: DECIDING (ready to commit)', () => {
    it('', async () => {
      const intent: Intent = { sector: 'Sector 12', bhk: [3] }
      const state = await computeConversationState(intent, 'SHORTLISTED', mockProjects, false, [], undefined, undefined, undefined, mockInventory, true, undefined, { allowLlmChips: false })
      assert.equal(state.stage, 'DECIDING')
      assert.ok(
        state.chips.some((c) => ['TEXT_MESSAGE', 'COMPARE_PROPERTIES'].includes(c.actionType)),
        'Should show booking/callback chips'
      )
    })
  })

  describe('Chips: Data-Driven (not hardcoded)', () => {
    it('', async () => {
      const state0 = await computeConversationState({ sector: 'Sector 150' }, 'GATHERING', [], false, [{ role: 'user', content: 'sector 150' }], undefined, undefined, undefined, mockInventory, true, undefined, { allowLlmChips: false })
      const state5 = await computeConversationState({ sector: 'Sector 150' }, 'READY_TO_SEARCH', mockProjects, false, [{ role: 'user', content: 'sector 150' }], undefined, undefined, undefined, mockInventory, true, undefined, { allowLlmChips: false })

      assert.notStrictEqual(
        state0.chips[0].actionType,
        state5.chips[0].actionType,
        'Chips should differ based on result count'
      )
    })

    it('', async () => {
      const intent: Intent = { bhk: [3] }
      const state = await computeConversationState(intent, 'GATHERING', [], false, [{ role: 'user', content: '3 BHK' }], undefined, undefined, undefined, mockInventory, true, undefined, { allowLlmChips: false })
      const sectorChips = state.chips.filter((c) => c.icon === '📍')
      assert.ok(
        sectorChips.every((c) => ['Sector 150', 'Sector 79'].includes(c.label)),
        'Sector chips should come from inventory, not hardcoded'
      )
    })
  })

  describe('Chips: Avoid Repetition', () => {
    it('', async () => {
      const intent: Intent = { bhk: [3] }
      const chatHistory = [
        { role: 'user', content: '3 BHK' },
        { role: 'assistant', content: 'Which sector? Sector 150, Sector 79, or other?' },
      ]
      const state = await computeConversationState(intent, 'GATHERING', [], false, chatHistory, undefined, undefined, undefined, mockInventory, true, undefined, { allowLlmChips: false })
      const sectorChips = state.chips.filter((c) => c.icon === '📍')
      assert.ok(
        sectorChips.length <= 3,
        'Should not repeat already-suggested sectors'
      )
    })
  })

  describe('Chips: Predict Next Step', () => {
    it('', async () => {
      const scenarios = [
        { stage: 'GATHERING' as const, expects: 'missing field suggestions' },
        { stage: 'READY_TO_SEARCH' as const, expects: 'compare/analyze actions' },
        { stage: 'SHORTLISTED' as const, expects: 'booking/contact actions' },
      ]

      for (const scenario of scenarios) {
        const intent: Intent = { sector: 'Sector 150', bhk: [3] }
        const state = await computeConversationState(intent, scenario.stage, mockProjects.slice(0, 1), false, [{ role: 'user', content: 'test' }], undefined, undefined, undefined, mockInventory, true, undefined, { allowLlmChips: false })
        assert.ok(
          state.chips.length > 0,
          `Stage ${scenario.stage} should suggest ${scenario.expects}`
        )
      }
    })
  })

  describe('Chips: Filter by Project Name', () => {
    it('', async () => {
      const intent: Intent = { projectNames: ['ACE Hanei'] }
      const state = await computeConversationState(intent, 'READY_TO_SEARCH', mockProjects, false, [{ role: 'user', content: 'tell me about ace hanei' }], undefined, undefined, undefined, mockInventory, true, undefined, { allowLlmChips: false })
      assert.ok(
        !state.chips.some((c) => c.label.includes('Sector')),
        'Should not show sector chips when specific project requested'
      )
    })
  })

  describe('Chips: Ground LLM Predictions (C5)', () => {
    it('Single-result turn never shows compare-chip suggestion', async () => {
      const intent: Intent = { sector: 'Sector 150', bhk: [3] }
      const state = await computeConversationState(intent, 'SHORTLISTED', mockProjects.slice(0, 1), false, [{ role: 'user', content: 'tell me about this project' }], undefined, undefined, undefined, mockInventory, true, undefined, { allowLlmChips: false })
      assert.ok(
        !state.chips.some(c => c.label.toLowerCase().includes('compare')),
        'Single-result RESEARCH stage should not suggest comparison chips'
      )
    })
  })

  describe('Chips: Stable Semantic IDs (C1+C2)', () => {
    it('Sector clarify chips have stable IDs', async () => {
      const intent1: Intent = { bhk: [3] }
      const state1 = await computeConversationState(intent1, 'GATHERING', [], false, [{ role: 'user', content: '3 BHK' }], undefined, undefined, undefined, mockInventory, true, undefined, { allowLlmChips: false })
      const sectorChip1 = state1.chips.find((c) => c.label.includes('Sector 150'))

      const intent2: Intent = { bhk: [3] }
      const state2 = await computeConversationState(intent2, 'GATHERING', [], false, [{ role: 'user', content: '3 BHK' }], undefined, undefined, undefined, mockInventory, true, undefined, { allowLlmChips: false })
      const sectorChip2 = state2.chips.find((c) => c.label.includes('Sector 150'))

      assert.strictEqual(sectorChip1?.id, sectorChip2?.id, 'Same sector clarify chip should have identical ID across calls')
      assert.ok(!sectorChip1?.id.includes('Date.now()'), 'Chip ID should not contain timestamp')
    })

    it('BHK clarify chips have stable IDs', async () => {
      const intent1: Intent = { sector: 'Sector 150' }
      const state1 = await computeConversationState(intent1, 'GATHERING', [], false, [{ role: 'user', content: 'Sector 150' }], undefined, undefined, undefined, mockInventory, true, undefined, { allowLlmChips: false })
      const bhkChip1 = state1.chips.find((c) => c.label === '3 BHK')

      const intent2: Intent = { sector: 'Sector 150' }
      const state2 = await computeConversationState(intent2, 'GATHERING', [], false, [{ role: 'user', content: 'Sector 150' }], undefined, undefined, undefined, mockInventory, true, undefined, { allowLlmChips: false })
      const bhkChip2 = state2.chips.find((c) => c.label === '3 BHK')

      assert.strictEqual(bhkChip1?.id, bhkChip2?.id, 'Same BHK clarify chip should have identical ID across calls')
    })

    it('Budget clarify chips have stable IDs', async () => {
      const intent1: Intent = { sector: 'Sector 150', bhk: [3] }
      const state1 = await computeConversationState(intent1, 'GATHERING', [], false, [{ role: 'user', content: 'Sector 150, 3 BHK' }], undefined, undefined, undefined, mockInventory, true, undefined, { allowLlmChips: false })
      const budgetChip1 = state1.chips.find((c) => c.label === 'Under ₹1.1 Cr')

      const intent2: Intent = { sector: 'Sector 150', bhk: [3] }
      const state2 = await computeConversationState(intent2, 'GATHERING', [], false, [{ role: 'user', content: 'Sector 150, 3 BHK' }], undefined, undefined, undefined, mockInventory, true, undefined, { allowLlmChips: false })
      const budgetChip2 = state2.chips.find((c) => c.label === 'Under ₹1.1 Cr')

      assert.strictEqual(budgetChip1?.id, budgetChip2?.id, 'Same budget clarify chip should have identical ID across calls')
    })
  })

  describe('chip pipeline: never emits zero (regression)', () => {
    it('emits floor chips when no candidates survive filtering', async () => {
      // COLD intent, no results, no inventory — every normal path returns []
      const state = await computeConversationState(
        {} as never, 'COLD' as never, [], false, [], undefined, undefined, undefined, null as never, true,
      )
      assert(state.chips.length > 0, 'Floor chips must be emitted when pipeline returns empty')
    })

    it('emits grounded chips when results exist but history mentions every label', async () => {
      const results = [
        { id: 'p1', name: 'Alpha Heights', sector: 'Sector 75', city: 'Noida', slug: 'alpha', builder: { name: 'Builder A', slug: 'builder-a' }, status: 'under_construction' as const, price_range_label: '₹1–2 Cr', unit_types: [], top_amenities: [], top_connectivity: [], images: [], possession_date: null, marketing_claims: [], matchScore: 85, matchReason: 'Budget match', matchReasons: ['Budget'], concerns: [] },
        { id: 'p2', name: 'Beta Greens', sector: 'Sector 79', city: 'Noida', slug: 'beta', builder: { name: 'Builder B', slug: 'builder-b' }, status: 'ready_to_move' as const, price_range_label: '₹2–3 Cr', unit_types: [], top_amenities: [], top_connectivity: [], images: [], possession_date: null, marketing_claims: [], matchScore: 80, matchReason: 'Location match', matchReasons: ['Location'], concerns: [] },
      ] as never
      const history = [{ role: 'user', content: 'I want a 3BHK near Sector 75' }, { role: 'assistant', content: 'amenities connectivity payment plans RERA legal exit strategy' }]
      const state = await computeConversationState(
        {} as never, 'READY_TO_SEARCH' as never, results, false, history, undefined, undefined, undefined, null as never, true,
      )
      // assistant-only history must NOT starve the row (Task 2.2 + 2.4)
      assert(state.chips.length > 0, 'Chips must survive even when history matches all labels')
    })

    it('capChips fills all four slots even when every priority is >= 4', async () => {
      const results = Array.from({ length: 8 }, (_, i) => ({
        id: `p${i}`,
        name: `Project ${i}`,
        sector: 'Sector 75',
        city: 'Noida',
        slug: `proj-${i}`,
        builder: { name: `Builder ${i}`, slug: `builder-${i}` },
        status: 'under_construction' as const,
        price_range_label: '₹1.5–2 Cr',
        unit_types: [],
        top_amenities: [],
        top_connectivity: [],
        images: [],
        possession_date: null,
        marketing_claims: [],
        matchScore: 70 + i,
        matchReason: 'Match',
        matchReasons: ['Match'],
        concerns: [],
      })) as never
      const state = await computeConversationState(
        { sector: 'Sector 75' } as never, 'READY_TO_SEARCH' as never, results, false, [],
        undefined, undefined, undefined, null as never, true,
      )
      assert(state.chips.length > 0, 'Chips must be emitted')
      assert(state.chips.length <= 4, 'Chip count must not exceed 4')
    })
  })
})
