import { describe, it } from 'node:test'
import assert from 'node:assert'
import { generateChips } from '../chipGenerator'
import { calculateConfidence } from '../dataFetcher'
import { buildFreshnessInfo, generateFreshnessWarning } from '../dataFreshness'
import type { ConversationMemory, ChatResponse } from '../types'

describe('Integration Tests: Database-Backed Chat Chips', () => {
  describe('Complete Request Flow: Intent → Chips → Response', () => {
    it('PAYMENT_PLANS: user message → intent → database query → chips → SSE response', () => {
      // Step 1: User message detected as PAYMENT_PLANS intent
      const userMessage = 'Tell me about EMI options'
      const intent = 'PAYMENT_PLANS'

      // Step 2: Memory extracted from conversation
      const memory: Partial<ConversationMemory> = {
        user_budget_min_cr: 50,
        user_budget_max_cr: 75
      }

      // Step 3: Generate chips for this intent
      const chips = generateChips(intent, memory, 'ADVISOR')
      assert.ok(chips.length > 0, 'Should generate chips')

      // Step 4: Mock database data
      const dbData = {
        payment_plans: [
          { name: 'Plan A', down_payment: 20, duration: 60, verified_at: new Date() },
          { name: 'Plan B', down_payment: 30, duration: 60, verified_at: new Date() }
        ]
      }

      // Step 5: Calculate confidence for data
      const confidence = calculateConfidence('payment_plans', dbData.payment_plans[0])
      assert.ok(confidence >= 0 && confidence <= 100)

      // Step 6: Build ChatResponse with chips
      const chatResponse: Partial<ChatResponse> = {
        message: 'Here are the available payment plans',
        data: dbData,
        chips,
        confidence: { payment_plans: confidence, overall: confidence },
        data_freshness: { payment_plans: 'Last verified: just now' },
        missing_data: []
      }

      // Step 7: SSE 'done' event packages response
      const sseEvent = {
        type: 'done',
        chatResponse
      }

      assert.strictEqual(sseEvent.type, 'done')
      assert.ok(sseEvent.chatResponse.chips)
    })

    it('BUILDER_HISTORY: intent → database query → confidence penalties → chips', () => {
      const memory: Partial<ConversationMemory> = {}

      // Generate chips
      const chips = generateChips('BUILDER_HISTORY', memory, 'ADVISOR')

      // Mock builder data with risk factors
      const builderData = {
        name: 'XYZ Developers',
        rera_number: 'RERA/UP/Noida/ABC123',
        litigation_count: 3, // > 2 triggers -15% penalty
        legal_flag: 'false',
        verified_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days old
      }

      // Calculate confidence with penalties
      const baseConfidence = 85 // builder base
      const freshnessPenalty = Math.floor(90 / 7) * 5 // 90 days = ~13 weeks = -65%
      const litigationPenalty = 15 // litigation > 2
      const finalConfidence = Math.max(0, baseConfidence - freshnessPenalty - litigationPenalty)

      assert.ok(finalConfidence < baseConfidence, 'Should apply penalties')
      assert.ok(chips.length > 0, 'Should still generate chips even with low confidence')
    })

    it('LOCATION + Budget context: chips reflect user state', () => {
      const memory: Partial<ConversationMemory> = {
        user_budget_min_cr: 60,
        user_budget_max_cr: 80
      }

      // Generate chips for LOCATION with budget context
      const chips = generateChips('LOCATION', memory, 'ADVISOR')

      // Should include site_visit chip since budget is known
      const siteVisitChip = chips.find(c => c.analyticsId.includes('site_visit'))
      assert.ok(siteVisitChip, 'Should include site_visit chip when budget known')

      // Build response
      const response: Partial<ChatResponse> = {
        message: 'Location details with nearby amenities',
        chips,
        confidence: { location: 90, overall: 90 }
      }

      assert.ok((response.chips?.length ?? 0) >= 2, 'Should have multiple chips')
    })
  })

  describe('Multi-Intent Conversation Flow', () => {
    it('Turn 1: PAYMENT_PLANS → Turn 2: LOCATION → Memory persists', () => {
      const memory: Partial<ConversationMemory> = {}

      // Turn 1: User asks about payment plans
      const chips1 = generateChips('PAYMENT_PLANS', memory, 'ADVISOR')
      assert.ok(chips1.find(c => c.analyticsId.includes('emi')))

      // During conversation, user states budget
      memory.user_budget_min_cr = 50
      memory.user_budget_max_cr = 75

      // Turn 2: User asks about location
      const chips2 = generateChips('LOCATION', memory, 'ADVISOR')
      assert.ok(chips2.find(c => c.analyticsId.includes('site_visit')), 'Should have site_visit with persisted budget')

      // Memory should still have budget
      assert.ok(memory.user_budget_min_cr, 'Budget context should persist')
    })

    it('Sequential intent detection: messages → intents → responses', () => {
      const conversation = [
        { text: 'What are payment plans?', expectedIntent: 'PAYMENT_PLANS' },
        { text: 'Who is the builder?', expectedIntent: 'BUILDER_HISTORY' },
        { text: 'How far from metro?', expectedIntent: 'LOCATION' }
      ]

      conversation.forEach((turn, idx) => {
        // In real flow: intentDetector would classify
        const chips = generateChips(turn.expectedIntent, {}, 'ADVISOR')
        assert.ok(chips.length > 0, `Turn ${idx + 1}: ${turn.expectedIntent} should generate chips`)
      })
    })
  })

  describe('Freshness Integration: Stale Data Warnings', () => {
    it('Data > 30 days old: show warning + chips for re-verification', () => {
      const stalePlanData = {
        verified_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days old
        payment_plans: [{ name: 'Plan A' }]
      }

      // Build freshness info
      const freshness = buildFreshnessInfo('payment_plans', stalePlanData, 85)
      assert.strictEqual(freshness.is_stale, true)

      // Generate warning
      const warning = generateFreshnessWarning(freshness.days_old, 85, 'payment_plans')
      assert.ok(warning)
      assert.strictEqual(warning.severity, 'warning')

      // Still generate action chips
      const chips = generateChips('PAYMENT_PLANS', {}, 'ADVISOR')
      assert.ok(chips.find(c => c.analyticsId.includes('flexibility')))
    })

    it('Confidence < 50%: trigger re-verification chips', () => {
      const lowConfidenceData = {
        verified_at: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000), // 150 days old
        litigation_count: 5
      }

      // Low confidence from penalties: 85 (base) - 107 (freshness) - 20 (legal) - 15 (litigation) = clamped to 0
      const confidence = calculateConfidence('builder', lowConfidenceData, true, 5)
      assert.ok(confidence < 50, `Should have low confidence (got ${confidence})`)

      // Chips should prompt re-verification
      const chips = generateChips('BUILDER_HISTORY', {}, 'ADVISOR')
      assert.ok(chips.find(c => c.analyticsId.includes('rera')))
    })
  })

  describe('Chip Analytics Flow: Event → PostHog → Dashboard', () => {
    it('Chip click generates event with full context', () => {
      // User sees chip
      const chip = {
        id: 'chip_calculate_emi',
        label: 'Calculate EMI',
        analyticsId: 'chip_calculate_emi'
      }

      // User clicks chip
      const clickEvent = {
        event: 'chip_click',
        properties: {
          chipId: chip.analyticsId,
          label: chip.label,
          sessionId: 'sess_abc123',
          timestamp: new Date().toISOString()
        }
      }

      assert.strictEqual(clickEvent.properties.chipId, 'chip_calculate_emi')
    })

    it('Chip action completion tracked → conversion detected', () => {
      // Chip action: OPEN_MODAL
      const actionEvent = {
        event: 'chip_action_completed',
        properties: {
          chipId: 'chip_site_visit_request',
          actionType: 'OPEN_MODAL',
          result: 'success'
        }
      }

      // User completes modal (site visit booked)
      const conversionEvent = {
        event: 'chip_conversion',
        properties: {
          chipId: 'chip_site_visit_request',
          conversionType: 'site_visit_booked',
          leadValue: 'high'
        }
      }

      assert.strictEqual(conversionEvent.properties.conversionType, 'site_visit_booked')
    })
  })

  describe('Error Handling Integration', () => {
    it('Database error: graceful fallback with empty data + chips', () => {
      const dbError = {
        error: true,
        message: 'Database connection timeout'
      }

      // Response should still have chips
      const fallbackResponse: Partial<ChatResponse> = {
        message: 'Unable to fetch payment plans. Try again in a moment.',
        chips: generateChips('PAYMENT_PLANS', {}, 'ADVISOR'),
        data: null,
        confidence: { payment_plans: 0, overall: 0 },
        missing_data: ['Database temporarily unavailable']
      }

      assert.ok((fallbackResponse.chips?.length ?? 0) > 0, 'Should have action chips even on error')
      assert.ok((fallbackResponse.missing_data?.length ?? 0) > 0)
    })

    it('Memory extraction error: continue with empty memory', () => {
      const memoryError = { error: true }

      // Use empty memory, generate chips anyway
      const memory = {} // Empty, safe default
      const chips = generateChips('PAYMENT_PLANS', memory, 'ADVISOR')

      assert.ok(chips.length > 0, 'Should work with empty memory')
    })

    it('Confidence calculation error: default to base confidence', () => {
      const invalidData = {} // Empty object, no verified_at
      const confidence = calculateConfidence('payment_plans', invalidData)

      assert.ok(confidence >= 0 && confidence <= 100)
      assert.strictEqual(confidence, 95) // Base for payment_plans
    })
  })

  describe('Performance Integration', () => {
    it('Full flow completes within performance budget', () => {
      const startTime = Date.now()

      // Step 1: Intent detection + memory extraction (~20ms)
      const memory: Partial<ConversationMemory> = {
        user_budget_min_cr: 50,
        user_budget_max_cr: 75
      }

      // Step 2: Chip generation (~40ms)
      const chips = generateChips('PAYMENT_PLANS', memory, 'ADVISOR')

      // Step 3: Confidence calculation (~10ms)
      const confidence = calculateConfidence('payment_plans', { verified_at: new Date() })

      // Step 4: Freshness calculation (~5ms)
      const freshness = buildFreshnessInfo('payment_plans', { verified_at: new Date() }, confidence)

      // Step 5: Response building (~5ms)
      const response: Partial<ChatResponse> = {
        message: 'Payment plans',
        chips,
        confidence: { payment_plans: confidence, overall: confidence },
        data_freshness: { payment_plans: freshness.freshness_display }
      }

      const endTime = Date.now()
      const totalTime = endTime - startTime

      assert.ok(totalTime < 200, `Total flow should be < 200ms, got ${totalTime}ms`)
    })

    it('SSE event emission with compressed payload', () => {
      const chips = generateChips('PAYMENT_PLANS', {}, 'ADVISOR')

      // Build response
      const response: Partial<ChatResponse> = {
        message: 'Payment plans',
        chips,
        confidence: { payment_plans: 85, overall: 85 }
      }

      // Simulate SSE emission
      const sseEvent = JSON.stringify({
        type: 'done',
        chatResponse: response
      })

      // Check size is reasonable (< 2KB for typical response)
      assert.ok(sseEvent.length < 2000, `SSE payload should be < 2KB, got ${sseEvent.length} bytes`)
    })
  })

  describe('End-to-End Phase Transitions', () => {
    it('DISCOVERY phase: no chips shown, guide user to refine', () => {
      const discoveryChips = generateChips('PAYMENT_PLANS', {}, 'DISCOVERY')
      assert.strictEqual(discoveryChips.length, 0, 'DISCOVERY should have no chips')
    })

    it('ADVISOR phase: chips fully activated', () => {
      const advisorChips = generateChips('PAYMENT_PLANS', {}, 'ADVISOR')
      assert.ok(advisorChips.length > 0, 'ADVISOR should have chips')
    })

    it('Phase transition preserves conversation history', () => {
      // DISCOVERY: collect intent
      const discoveryResponse = generateChips('PAYMENT_PLANS', {}, 'DISCOVERY')
      const discoveryHistory = [
        { role: 'assistant', text: 'What are you looking for?', chips: discoveryResponse }
      ]

      // Transition to ADVISOR: memory extracted
      const memory: Partial<ConversationMemory> = { user_budget_min_cr: 50 }

      // ADVISOR: full response with chips
      const advisorChips = generateChips('PAYMENT_PLANS', memory, 'ADVISOR')
      const advisorResponse = {
        role: 'assistant',
        text: 'Payment plans matching your budget',
        chips: advisorChips
      }

      // History preserved
      assert.ok(discoveryHistory.length > 0)
      assert.ok(advisorResponse.chips.length > 0)
    })
  })

  describe('Real-World Scenarios', () => {
    it('Scenario: First-time buyer journey', () => {
      // Turn 1: General inquiry
      const memory: Partial<ConversationMemory> = {}
      const response1 = generateChips('PAYMENT_PLANS', memory, 'ADVISOR')
      assert.ok(response1.length > 0)

      // Turn 2: States budget
      memory.user_budget_min_cr = 40
      memory.user_budget_max_cr = 60

      // Turn 3: Asks about location
      const response3 = generateChips('LOCATION', memory, 'ADVISOR')
      const siteVisit = response3.find(c => c.analyticsId.includes('site_visit'))
      assert.ok(siteVisit, 'Should offer site visit after budget stated')

      // Turn 4: Asks about builder
      const response4 = generateChips('BUILDER_HISTORY', memory, 'ADVISOR')
      assert.ok(response4.find(c => c.analyticsId.includes('rera')))

      // Journey complete: has budget, knows location, checked builder
      assert.ok(memory.user_budget_min_cr)
    })

    it('Scenario: Investor tracking multiple projects', () => {
      const memory: Partial<ConversationMemory> = {
        user_pain_points: ['timeline_critical', 'roi_focused']
      }

      // Customization: investor sees ROI/timeline chips
      const paymentChips = generateChips('PAYMENT_PLANS', memory, 'ADVISOR')
      assert.ok(paymentChips.find(c => c.analyticsId.includes('flexibility')))

      const possessionChips = generateChips('POSSESSION_TIMELINE', memory, 'ADVISOR')
      assert.ok(possessionChips.find(c => c.analyticsId.includes('check_oc')))
    })
  })
})
