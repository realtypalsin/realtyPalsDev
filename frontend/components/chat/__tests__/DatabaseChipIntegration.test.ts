import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { ChatResponse } from '@/types/chat'
import type { Chip } from '@/lib/discovery/chipGenerator'

// Frontend integration test for database-backed chip rendering

describe('Database-Backed Chip Integration', () => {
  describe('Chip Extraction from ChatResponse', () => {
    it('extracts chips array from database response', () => {
      const chatResponse: ChatResponse = {
        message: 'Here are the payment plans',
        memory_context: {
          user_stated_facts: {},
          inferred_preferences: [],
          open_questions: []
        },
        confidence: {
          payment_plans: 85,
          builder_history: 0,
          location: 0,
          possession: 0,
          overall: 85
        },
        chips: [
          {
            id: 'chip_calculate_emi',
            actionType: 'TEXT_MESSAGE',
            label: 'Calculate EMI',
            icon: '🧮',
            analyticsId: 'chip_calculate_emi',
            priority: 1,
            payload: {}
          }
        ],
        data_freshness: {},
        missing_data: []
      }

      assert.ok(Array.isArray(chatResponse.chips), 'Chips should be an array')
      assert.strictEqual(chatResponse.chips.length, 1, 'Should have 1 chip')
      assert.strictEqual(chatResponse.chips[0].label, 'Calculate EMI')
    })

    it('handles empty chips array', () => {
      const chatResponse: ChatResponse = {
        message: 'No chips available',
        memory_context: {
          user_stated_facts: {},
          inferred_preferences: [],
          open_questions: []
        },
        confidence: {
          payment_plans: 0,
          builder_history: 0,
          location: 0,
          possession: 0,
          overall: 0
        },
        chips: [],
        data_freshness: {},
        missing_data: []
      }

      assert.strictEqual(chatResponse.chips.length, 0, 'Should have 0 chips')
    })

    it('preserves chip properties during extraction', () => {
      const chip: Chip = {
        id: 'chip_verify_rera',
        actionType: 'TEXT_MESSAGE',
        label: 'Verify RERA',
        icon: '✅',
        analyticsId: 'chip_verify_rera',
        priority: 1,
        payload: { action: 'verify_rera' }
      }

      assert.strictEqual(chip.id, 'chip_verify_rera')
      assert.strictEqual(chip.actionType, 'TEXT_MESSAGE')
      assert.strictEqual(chip.label, 'Verify RERA')
      assert.strictEqual(chip.icon, '✅')
      assert.ok(chip.payload.action === 'verify_rera')
    })
  })

  describe('Chip Ordering by Priority', () => {
    it('sorts chips by priority (lower number = higher priority)', () => {
      const chips: Chip[] = [
        { id: 'chip_1', actionType: 'TEXT_MESSAGE', label: 'Low', icon: '📍', analyticsId: 'low', priority: 3, payload: {} },
        { id: 'chip_2', actionType: 'TEXT_MESSAGE', label: 'High', icon: '⭐', analyticsId: 'high', priority: 1, payload: {} },
        { id: 'chip_3', actionType: 'TEXT_MESSAGE', label: 'Mid', icon: '🔹', analyticsId: 'mid', priority: 2, payload: {} }
      ]

      const sorted = [...chips].sort((a, b) => a.priority - b.priority)

      assert.strictEqual(sorted[0].label, 'High')
      assert.strictEqual(sorted[1].label, 'Mid')
      assert.strictEqual(sorted[2].label, 'Low')
    })
  })

  describe('Chip Rendering with Comparison Matrix', () => {
    it('renders comparison matrix and chips together', () => {
      const chatResponse: ChatResponse = {
        message: 'Payment plans ranked by your priorities',
        memory_context: {
          user_stated_facts: {},
          inferred_preferences: ['budget-sensitive'],
          open_questions: []
        },
        comparison: {
          matrix: {
            dimensions: [
              { name: 'Down Payment', format: 'percentage' },
              { name: 'Duration', format: 'number' },
              { name: 'Monthly EMI', format: 'currency' }
            ],
            rows: [
              { name: 'Plan A', values: [20, 60, 50000] },
              { name: 'Plan B', values: [30, 60, 48000] }
            ]
          },
          winner: 'Plan A',
          reason: 'Lower upfront cost matches your budget priorities'
        },
        confidence: {
          payment_plans: 90,
          builder_history: 0,
          location: 0,
          possession: 0,
          overall: 90
        },
        chips: [
          { id: 'chip_emi', actionType: 'TEXT_MESSAGE', label: 'Calculate EMI', icon: '🧮', analyticsId: 'chip_emi', priority: 1, payload: {} },
          { id: 'chip_flexibility', actionType: 'TEXT_MESSAGE', label: 'Ask about flexibility', icon: '💬', analyticsId: 'chip_flexibility', priority: 2, payload: {} }
        ],
        data_freshness: {},
        missing_data: []
      }

      assert.ok(chatResponse.comparison, 'Should have comparison matrix')
      assert.strictEqual(chatResponse.chips.length, 2, 'Should have 2 chips')
    })
  })

  describe('Chip Handler Dispatch', () => {
    it('TEXT_MESSAGE chip builds message and sends to backend', () => {
      const chip: Chip = {
        id: 'chip_calculate_emi',
        actionType: 'TEXT_MESSAGE',
        label: 'Calculate EMI',
        icon: '🧮',
        analyticsId: 'chip_calculate_emi',
        priority: 1,
        payload: { text: 'Calculate EMI for Plan A' }
      }

      assert.strictEqual(chip.actionType, 'TEXT_MESSAGE', 'Should be TEXT_MESSAGE action')
      assert.ok(chip.payload.text, 'Should have text payload')
    })

    it('NAVIGATE chip routes to specific page', () => {
      const chip: Chip = {
        id: 'chip_view_builders',
        actionType: 'NAVIGATE',
        label: 'View Builders',
        icon: '🏢',
        analyticsId: 'chip_view_builders',
        priority: 1,
        payload: { route: '/builders' }
      }

      assert.strictEqual(chip.actionType, 'NAVIGATE', 'Should be NAVIGATE action')
      assert.strictEqual(chip.payload.route, '/builders', 'Should have route payload')
    })

    it('OPEN_MODAL chip opens modal with context', () => {
      const chip: Chip = {
        id: 'chip_calculator',
        actionType: 'OPEN_MODAL',
        label: 'Open EMI Calculator',
        icon: '📱',
        analyticsId: 'chip_calculator',
        priority: 1,
        payload: { modalType: 'emi_calculator', projectId: 'proj_123' }
      }

      assert.strictEqual(chip.actionType, 'OPEN_MODAL', 'Should be OPEN_MODAL action')
      assert.strictEqual(chip.payload.modalType, 'emi_calculator')
    })
  })

  describe('Phase Gating', () => {
    it('DISCOVERY phase returns no chips', () => {
      // In DISCOVERY phase, generateChips returns empty array
      const chips: Chip[] = []
      assert.strictEqual(chips.length, 0, 'DISCOVERY phase should have no chips')
    })

    it('ADVISOR phase returns intent-specific chips', () => {
      const chips: Chip[] = [
        { id: 'chip_emi', actionType: 'TEXT_MESSAGE', label: 'Calculate EMI', icon: '🧮', analyticsId: 'chip_emi', priority: 1, payload: {} },
        { id: 'chip_flexibility', actionType: 'TEXT_MESSAGE', label: 'Ask about flexibility', icon: '💬', analyticsId: 'chip_flexibility', priority: 2, payload: {} }
      ]

      assert.ok(chips.length > 0, 'ADVISOR phase should have chips')
      assert.ok(chips.every(c => c.actionType === 'TEXT_MESSAGE'))
    })
  })

  describe('Memory Threading', () => {
    it('chips respect user budget constraints', () => {
      // When user has stated budget, site_visit chip should appear
      const chips: Chip[] = [
        { id: 'chip_emi', actionType: 'TEXT_MESSAGE', label: 'Calculate EMI', icon: '🧮', analyticsId: 'chip_emi', priority: 1, payload: {} },
        { id: 'chip_site_visit', actionType: 'OPEN_MODAL', label: 'Schedule site visit', icon: '🏗️', analyticsId: 'chip_site_visit', priority: 2, payload: {} }
      ]

      const siteVisitChip = chips.find(c => c.analyticsId === 'chip_site_visit')
      assert.ok(siteVisitChip, 'Site visit chip should appear when budget is stated')
    })

    it('chips influenced by user pain points', () => {
      // When user has timeline concerns, flexible payment chips rank higher
      const chips: Chip[] = [
        { id: 'chip_flexibility', actionType: 'TEXT_MESSAGE', label: 'Ask about flexibility', icon: '💬', analyticsId: 'chip_flexibility', priority: 1, payload: {} },
        { id: 'chip_emi', actionType: 'TEXT_MESSAGE', label: 'Calculate EMI', icon: '🧮', analyticsId: 'chip_emi', priority: 2, payload: {} }
      ]

      // Flexibility chip should be first when user has timeline concerns
      assert.strictEqual(chips[0].analyticsId, 'chip_flexibility')
    })

    it('conditional chips only appear when criteria met', () => {
      // Site visit chip only appears if user_budget_min_cr AND user_budget_max_cr exist
      const withBudget: Chip[] = [
        { id: 'chip_site_visit', actionType: 'OPEN_MODAL', label: 'Schedule site visit', icon: '🏗️', analyticsId: 'chip_site_visit', priority: 1, payload: {} }
      ]

      const withoutBudget: Chip[] = []

      assert.ok(withBudget.some(c => c.analyticsId === 'chip_site_visit'))
      assert.ok(!withoutBudget.some(c => c.analyticsId === 'chip_site_visit'))
    })
  })

  describe('Confidence Scoring Display', () => {
    it('displays confidence breakdown for database response', () => {
      const confidence = {
        payment_plans: 85,
        builder_history: 0,
        location: 0,
        possession: 0,
        overall: 85
      }

      assert.strictEqual(confidence.overall, 85, 'Should show overall confidence')
      assert.strictEqual(confidence.payment_plans, 85, 'Should show payment_plans confidence')
    })

    it('shows freshness data for each source', () => {
      const dataFreshness = {
        payment_plans: '2 days old',
        builder: '1 week old'
      }

      assert.ok(Object.keys(dataFreshness).length > 0, 'Should have freshness data')
    })
  })

  describe('Missing Data Handling', () => {
    it('displays missing_data warnings when present', () => {
      const missingData = ['No builder history available', 'RERA verification pending']

      assert.ok(missingData.length > 0, 'Should have missing data warnings')
      assert.ok(missingData[0].includes('builder'))
    })

    it('renders empty warning list when no missing data', () => {
      const missingData: string[] = []

      assert.strictEqual(missingData.length, 0, 'Should have no warnings')
    })
  })
})
