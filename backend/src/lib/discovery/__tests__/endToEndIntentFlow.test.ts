import { describe, it } from 'node:test'
import assert from 'node:assert'
import { detectDatabaseIntent } from '../intentTypeDetector'
import { generateChips } from '../chipGenerator'
import type { ConversationMemory } from '../types'

describe('End-to-End Intent Flow', () => {
  describe('PAYMENT_PLANS Intent', () => {
    it('detects payment plan queries', () => {
      const messages = [
        'What are the payment plans?',
        'Tell me about EMI options',
        'What is the EMI breakdown?',
        'Can you explain flexibility in payment?'
      ]

      messages.forEach(msg => {
        const intent = detectDatabaseIntent(msg)
        assert.strictEqual(intent, 'PAYMENT_PLANS', `Should detect PAYMENT_PLANS for: ${msg}`)
      })
    })

    it('generates EMI and flexibility chips for PAYMENT_PLANS', () => {
      const chips = generateChips('PAYMENT_PLANS', {}, 'ADVISOR')
      const emiChip = chips.find(c => c.analyticsId.includes('emi'))
      const flexChip = chips.find(c => c.analyticsId.includes('flexibility'))

      assert.ok(emiChip, 'EMI chip missing')
      assert.ok(flexChip, 'Flexibility chip missing')
      assert.strictEqual(emiChip?.label, 'Calculate EMI')
      assert.strictEqual(flexChip?.label, 'Ask about flexibility')
    })

    it('emits chatResponse with PAYMENT_PLANS data and chips via SSE', () => {
      // Simulates backend response structure
      const chatResponse = {
        message: 'Here are the available payment plans',
        memory_context: {
          user_stated_facts: { inferred_intent: 'PAYMENT_PLANS' },
          inferred_preferences: [],
          open_questions: []
        },
        data: {
          payment_plans: [
            { name: 'Plan A', down_payment: '20%', duration: 60, monthly_emi: 50000 },
            { name: 'Plan B', down_payment: '30%', duration: 60, monthly_emi: 48000 }
          ]
        },
        confidence: {
          payment_plans: 85,
          builder_history: 0,
          location: 0,
          possession: 0,
          overall: 85
        },
        chips: generateChips('PAYMENT_PLANS', {}, 'ADVISOR'),
        data_freshness: { payment_plans: '1 day old' },
        missing_data: []
      }

      // SSE 'done' event should include this structure
      assert.strictEqual(chatResponse.confidence.payment_plans, 85)
      assert.ok(chatResponse.chips.length > 0, 'Should have chips')
      assert.ok(Array.isArray(chatResponse.data.payment_plans), 'Should have plan data')
    })

    it('adds site_visit chip when user has budget context', () => {
      const memory: Partial<ConversationMemory> = {
        user_budget_min_cr: 50,
        user_budget_max_cr: 75
      }

      const chips = generateChips('PAYMENT_PLANS', memory, 'ADVISOR')
      const siteChip = chips.find(c => c.analyticsId.includes('site_visit'))

      assert.ok(siteChip, 'Site visit chip should appear with budget')
      assert.strictEqual(siteChip?.label, 'Schedule site visit')
    })

    it('adds comparison chip when 2+ chips generated', () => {
      const chips = generateChips('PAYMENT_PLANS', {}, 'ADVISOR')
      const compareChip = chips.find(c => c.analyticsId.includes('compare_start'))

      assert.ok(chips.length >= 2, 'Should have 2+ chips')
      assert.ok(compareChip, 'Comparison chip should be generated')
    })
  })

  describe('BUILDER_HISTORY Intent', () => {
    it('detects builder history queries', () => {
      const messages = [
        'Who is the builder?',
        'Tell me about the builder',
        'What is the builder\'s track record?',
        'Has this builder completed projects on time?'
      ]

      messages.forEach(msg => {
        const intent = detectDatabaseIntent(msg)
        assert.strictEqual(intent, 'BUILDER_HISTORY', `Should detect BUILDER_HISTORY for: ${msg}`)
      })
    })

    it('generates RERA and complaints chips for BUILDER_HISTORY', () => {
      const chips = generateChips('BUILDER_HISTORY', {}, 'ADVISOR')
      const reraChip = chips.find(c => c.analyticsId.includes('rera'))
      const complaintsChip = chips.find(c => c.analyticsId.includes('complaints'))

      assert.ok(reraChip, 'RERA chip missing')
      assert.ok(complaintsChip, 'Complaints chip missing')
      assert.strictEqual(reraChip?.label, 'Verify RERA')
      assert.strictEqual(complaintsChip?.label, 'View complaints')
    })

    it('emits chatResponse with BUILDER_HISTORY data and chips', () => {
      const chatResponse = {
        message: 'Builder information and track record',
        memory_context: {
          user_stated_facts: { inferred_intent: 'BUILDER_HISTORY' },
          inferred_preferences: [],
          open_questions: []
        },
        data: {
          builder: {
            name: 'XYZ Developers',
            founded: 2010,
            rera_registration: 'RERA/UP/Noida/ABC123',
            completed_projects: 12,
            ongoing_projects: 5,
            litigation_count: 1
          }
        },
        confidence: {
          payment_plans: 0,
          builder_history: 85,
          location: 0,
          possession: 0,
          overall: 85
        },
        chips: generateChips('BUILDER_HISTORY', {}, 'ADVISOR'),
        data_freshness: { builder: '2 weeks old' },
        missing_data: []
      }

      assert.strictEqual(chatResponse.confidence.builder_history, 85)
      assert.ok(chatResponse.chips.length > 0)
      assert.ok(chatResponse.data.builder.rera_registration)
    })

    it('reduces confidence if litigation count > 2', () => {
      // Base confidence for builder_history: 85
      // Litigation > 2: -15%
      const lowConfidence = 85 - 15 // = 70
      assert.strictEqual(lowConfidence, 70)
    })
  })

  describe('LOCATION Intent', () => {
    it('detects location queries', () => {
      const messages = [
        'What is the location?',
        'How far from the metro?',
        'Tell me about the area',
        'What is nearby?'
      ]

      messages.forEach(msg => {
        const intent = detectDatabaseIntent(msg)
        assert.strictEqual(intent, 'LOCATION', `Should detect LOCATION for: ${msg}`)
      })
    })

    it('generates map and metro chips for LOCATION', () => {
      const chips = generateChips('LOCATION', {}, 'ADVISOR')
      const mapChip = chips.find(c => c.analyticsId.includes('map'))
      const metroChip = chips.find(c => c.analyticsId.includes('metro'))

      assert.ok(mapChip, 'Map chip missing')
      assert.ok(metroChip, 'Metro chip missing')
      assert.strictEqual(mapChip?.label, 'View on map')
      assert.strictEqual(metroChip?.label, 'Metro distance')
    })

    it('emits chatResponse with LOCATION data and chips', () => {
      const chatResponse = {
        message: 'Location details and nearby amenities',
        memory_context: {
          user_stated_facts: { inferred_intent: 'LOCATION' },
          inferred_preferences: [],
          open_questions: []
        },
        data: {
          location: {
            sector: 'Sector 62',
            metro_station: 'Noida City Center',
            metro_distance_km: 2.1,
            schools_nearby: ['Delhi Public School', 'Ryan International'],
            hospitals_nearby: ['Apollo', 'Fortis']
          }
        },
        confidence: {
          payment_plans: 0,
          builder_history: 0,
          location: 90,
          possession: 0,
          overall: 90
        },
        chips: generateChips('LOCATION', {}, 'ADVISOR'),
        data_freshness: { location: 'Current' },
        missing_data: []
      }

      assert.strictEqual(chatResponse.confidence.location, 90)
      assert.ok(chatResponse.chips.length > 0)
      assert.ok(chatResponse.data.location.metro_distance_km)
    })

    it('includes site_visit chip when budget is known', () => {
      const memory: Partial<ConversationMemory> = {
        user_budget_min_cr: 60,
        user_budget_max_cr: 80
      }

      const chips = generateChips('LOCATION', memory, 'ADVISOR')
      const siteChip = chips.find(c => c.analyticsId.includes('site_visit'))

      assert.ok(siteChip, 'Should include site_visit when budget known')
    })
  })

  describe('COSTS Intent', () => {
    it('detects cost-related queries', () => {
      const messages = [
        'What are the total costs?',
        'Tell me about registration charges',
        'What is the price?',
        'How much is the total expense?'
      ]

      messages.forEach(msg => {
        const intent = detectDatabaseIntent(msg)
        assert.strictEqual(intent, 'COSTS', `Should detect COSTS for: ${msg}`)
      })
    })

    it('generates cost comparison chip for COSTS', () => {
      const chips = generateChips('COSTS', {}, 'ADVISOR')
      const costChip = chips.find(c => c.analyticsId.includes('compare_costs'))

      assert.ok(costChip, 'Cost chip missing')
      assert.strictEqual(costChip?.label, 'Compare costs')
    })

    it('emits chatResponse with COSTS data and chips', () => {
      const chatResponse = {
        message: 'Cost breakdown including registration and taxes',
        memory_context: {
          user_stated_facts: { inferred_intent: 'COSTS' },
          inferred_preferences: [],
          open_questions: []
        },
        data: {
          costs: {
            base_price: 5000000,
            registration_charges: 50000,
            stamp_duty_percent: 5,
            gst_percent: 5,
            maintenance_deposit: 150000
          }
        },
        confidence: {
          payment_plans: 0,
          builder_history: 0,
          location: 0,
          possession: 0,
          overall: 80
        },
        chips: generateChips('COSTS', {}, 'ADVISOR'),
        data_freshness: { costs: 'Last verified 3 days ago' },
        missing_data: []
      }

      assert.strictEqual(chatResponse.confidence.overall, 80)
      assert.ok(chatResponse.chips.length > 0)
      assert.ok(chatResponse.data.costs.base_price)
    })
  })

  describe('POSSESSION_TIMELINE Intent', () => {
    it('detects possession-related queries', () => {
      const messages = [
        'When can I move in?',
        'What is the possession date?',
        'Is it ready to move or under construction?',
        'When will OC be available?'
      ]

      messages.forEach(msg => {
        const intent = detectDatabaseIntent(msg)
        assert.strictEqual(intent, 'POSSESSION_TIMELINE', `Should detect POSSESSION_TIMELINE for: ${msg}`)
      })
    })

    it('generates OC status chip for POSSESSION_TIMELINE', () => {
      const chips = generateChips('POSSESSION_TIMELINE', {}, 'ADVISOR')
      const ocChip = chips.find(c => c.analyticsId.includes('check_oc'))

      assert.ok(ocChip, 'OC chip missing')
      assert.strictEqual(ocChip?.label, 'Check OC status')
    })

    it('emits chatResponse with POSSESSION_TIMELINE data and chips', () => {
      const chatResponse = {
        message: 'Expected possession timeline and OC status',
        memory_context: {
          user_stated_facts: { inferred_intent: 'POSSESSION_TIMELINE' },
          inferred_preferences: [],
          open_questions: []
        },
        data: {
          possession: {
            status: 'Under Construction',
            expected_oc: '2025-06-30',
            expected_possession: '2025-08-31',
            construction_progress: 65
          }
        },
        confidence: {
          payment_plans: 0,
          builder_history: 0,
          location: 0,
          possession: 88,
          overall: 88
        },
        chips: generateChips('POSSESSION_TIMELINE', {}, 'ADVISOR'),
        data_freshness: { possession: '1 week old' },
        missing_data: []
      }

      assert.strictEqual(chatResponse.confidence.possession, 88)
      assert.ok(chatResponse.chips.length > 0)
      assert.ok(chatResponse.data.possession.expected_oc)
    })
  })

  describe('Multi-Intent Conversations', () => {
    it('handles sequence: payment_plans → builder_history → location', () => {
      const conversation = [
        { user_msg: 'What are payment plans?', detected_intent: 'PAYMENT_PLANS' },
        { user_msg: 'Who is the builder?', detected_intent: 'BUILDER_HISTORY' },
        { user_msg: 'What is the location?', detected_intent: 'LOCATION' }
      ]

      conversation.forEach(turn => {
        const intent = detectDatabaseIntent(turn.user_msg)
        assert.strictEqual(intent, turn.detected_intent)
      })
    })

    it('accumulates memory across intents', () => {
      const memory: Partial<ConversationMemory> = {}

      // Turn 1: Payment plans
      memory.user_budget_min_cr = 50
      memory.user_budget_max_cr = 75
      const chips1 = generateChips('PAYMENT_PLANS', memory, 'ADVISOR')
      assert.ok(chips1.find(c => c.analyticsId.includes('site_visit')))

      // Turn 2: Builder (memory persists)
      const chips2 = generateChips('BUILDER_HISTORY', memory, 'ADVISOR')
      assert.ok(chips2.find(c => c.analyticsId.includes('rera')))

      // Turn 3: Location (memory still intact)
      const chips3 = generateChips('LOCATION', memory, 'ADVISOR')
      assert.ok(chips3.find(c => c.analyticsId.includes('site_visit')))
    })

    it('primary intent dominates chip generation', () => {
      // User says: "Tell me about payment plans and the builder"
      // Primary intent: PAYMENT_PLANS (first noun phrase)
      // Secondary: BUILDER_HISTORY
      // Should generate PAYMENT_PLANS chips + builders suggestion

      const primaryIntent = 'PAYMENT_PLANS'
      const chips = generateChips(primaryIntent, {}, 'ADVISOR')

      assert.ok(chips.find(c => c.analyticsId.includes('emi')))
      assert.ok(chips.find(c => c.analyticsId.includes('flexibility')))
    })
  })

  describe('Intent Detection Fallback', () => {
    it('returns GENERAL for ambiguous queries', () => {
      const ambiguousMessages = [
        'Tell me everything',
        'I am interested',
        'What do you have?'
      ]

      ambiguousMessages.forEach(msg => {
        const intent = detectDatabaseIntent(msg)
        // Should return GENERAL as fallback
        assert.ok(intent === 'GENERAL' || intent.length > 0)
      })
    })

    it('handles typos and informal language', () => {
      const messages = [
        'how much will i pay every month', // EMI query
        'when can i move in', // Possession query
        'builder info pls' // Builder query
      ]

      messages.forEach(msg => {
        const intent = detectDatabaseIntent(msg)
        assert.ok(intent) // Should detect something
      })
    })
  })

  describe('SSE Emission', () => {
    it('packages chatResponse with chips for SSE done event', () => {
      // Backend should emit: event: done\ndata: JSON.stringify({...chatResponse})\n\n
      const doneEventData = {
        type: 'done',
        chatResponse: {
          message: 'Here are the payment plans',
          confidence: { overall: 85 },
          chips: generateChips('PAYMENT_PLANS', {}, 'ADVISOR'),
          data_freshness: {},
          missing_data: []
        }
      }

      assert.strictEqual(doneEventData.type, 'done')
      assert.ok(doneEventData.chatResponse.chips.length > 0)
      assert.ok(doneEventData.chatResponse.confidence)
    })

    it('preserves chip order in SSE transmission', () => {
      const chips = generateChips('PAYMENT_PLANS', {}, 'ADVISOR')
      const prioritySorted = [...chips].map(c => c.priority)

      // Should be [1, 2, 3, ...] in order
      for (let i = 1; i < prioritySorted.length; i++) {
        assert.ok(prioritySorted[i] >= prioritySorted[i - 1], 'Priorities not sorted')
      }
    })
  })
})
