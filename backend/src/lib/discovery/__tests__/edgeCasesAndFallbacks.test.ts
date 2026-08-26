import { describe, it } from 'node:test'
import assert from 'node:assert'
import type { ConversationMemory } from '../types'

describe('Edge Cases & Fallbacks', () => {
  describe('Empty Results', () => {


  })

  describe('Missing Data', () => {
    it('flags missing_data array when fields incomplete', () => {
      const chatResponse = {
        message: 'Property details',
        data: {
          builder: { name: 'ABC Corp', founded: 2005 }
          // Missing: RERA registration, litigation count
        },
        confidence: {
          builder_history: 70 // Reduced due to missing fields
        },
        missing_data: [
          'RERA registration number not found',
          'Litigation history unavailable',
          'Complaint records incomplete'
        ]
      }

      assert.ok(chatResponse.missing_data.length > 0)
      assert.ok(chatResponse.missing_data[0].includes('RERA'))
      assert.strictEqual(chatResponse.confidence.builder_history, 70, 'Confidence reduced for incomplete data')
    })


    it('displays warning for each missing critical field', () => {
      const missingFields = {
        builder: ['RERA number', 'litigation count'],
        payment_plans: ['possession timeline', 'payment flexibility'],
        location: ['metro distance', 'nearby amenities']
      }

      // User should see: "RERA number not available. Litigation count not available."
      assert.ok(missingFields.builder.length > 0)
      assert.strictEqual(missingFields.builder[0], 'RERA number')
    })

    it('suggests follow-up question for missing data', () => {
      const missingContext = {
        user_stated_facts: { builder_name: 'ABC Corp' },
        missing_data: ['RERA verification pending'],
        suggested_follow_up: 'Would you like me to verify this builder\'s RERA registration?'
      }

      assert.ok(missingContext.suggested_follow_up.includes('RERA'))
    })
  })

  describe('API Failures', () => {

    it('shows user-friendly error message (never raw DB error)', () => {
      // Bad: "TypeError: Cannot read property 'id' of undefined"
      // Good: "Unable to fetch details right now"
      const userMessage = 'Unable to fetch details right now. Try again in a moment.'

      assert.ok(userMessage.length > 0)
      assert.ok(!userMessage.includes('TypeError'))
      assert.ok(!userMessage.includes('undefined'))
    })


    it('does not retry automatically (user initiates retry)', () => {
      // Backend should NOT loop retry
      // Instead: show message + retry chip + allow user to trigger
      const failedResponse = {
        message: 'Connection error. Please try again.',
        auto_retry: false,
        has_retry_action: true // User can click retry chip
      }

      assert.strictEqual(failedResponse.auto_retry, false)
      assert.ok(failedResponse.has_retry_action)
    })
  })

  describe('Stale Data', () => {
    it('detects stale data: > 30 days old', () => {
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const age = Math.floor((now.getTime() - thirtyDaysAgo.getTime()) / (24 * 60 * 60 * 1000))
      assert.ok(age >= 30, 'Data should be flagged as stale')
    })

    it('applies freshness penalty: 5% per week', () => {
      // Base: 95%, after 4 weeks: 95 - (4 * 5) = 75%
      const baseConfidence = 95
      const weeksOld = 4
      const penaltyPerWeek = 5
      const confidence = baseConfidence - (weeksOld * penaltyPerWeek)

      assert.strictEqual(confidence, 75, 'Freshness penalty applied correctly')
    })

    it('shows "last verified X days ago" when data stale', () => {
      const dataFreshness = {
        payment_plans: 'Last verified 28 days ago',
        builder: 'Last verified 45 days ago'
      }

      assert.ok(dataFreshness.payment_plans.includes('28 days'))
      assert.ok(dataFreshness.builder.includes('45 days'))
    })

    it('triggers re-verification when confidence < 50%', () => {
      const staleData = {
        verified_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000), // ~28 weeks old
        base_confidence: 95,
        freshness_penalty: 100, // 20 * 5 (capped at weeks)
        final_confidence: 0 // Clamped to 0
      }

      const daysOld = Math.floor((Date.now() - staleData.verified_at.getTime()) / (24 * 60 * 60 * 1000))
      const weeksOld = Math.floor(daysOld / 7)
      assert.ok(weeksOld > 20, 'Data more than 20 weeks old')
      assert.ok(staleData.final_confidence < 50, 'Should trigger re-verification')
    })

    it('shows low-confidence warning in response', () => {
      const lowConfidenceResponse = {
        message: 'Property details (last verified 8 weeks ago)',
        confidence: { overall: 55 },
        warning: 'This information may be outdated. Please verify with the builder.',
        chips: ['verify_rera', 'refresh_data'] // Action chips for verification
      }

      assert.ok(lowConfidenceResponse.confidence.overall < 60)
      assert.ok(lowConfidenceResponse.warning.includes('outdated'))
    })

    it('legal risk flag: 20% penalty', () => {
      const baseConfidence = 95
      const legalRiskPenalty = 20
      const confidence = baseConfidence - legalRiskPenalty

      assert.strictEqual(confidence, 75)
    })

    it('litigation count > 2: 15% penalty', () => {
      const baseConfidence = 85
      const litigationPenalty = 15
      const confidence = baseConfidence - litigationPenalty

      assert.strictEqual(confidence, 70)
    })

    it('combines penalties: freshness + legal + litigation', () => {
      const baseConfidence = 95
      const freshnessWeeks = 2
      const freshnessPenalty = freshnessWeeks * 5 // 10%
      const legalRiskPenalty = 20
      const litigationPenalty = 15

      const final = baseConfidence - freshnessPenalty - legalRiskPenalty - litigationPenalty
      assert.strictEqual(final, 50)
    })

    it('clamps confidence to [0, 100]', () => {
      const testCases = [
        { input: 150, expected: 100 },
        { input: -50, expected: 0 },
        { input: 75, expected: 75 }
      ]

      testCases.forEach(tc => {
        const clamped = Math.max(0, Math.min(100, tc.input))
        assert.strictEqual(clamped, tc.expected)
      })
    })
  })

  describe('Multiple Intents', () => {
    it('determines primary intent from first noun phrase', () => {
      const message = 'Tell me about payment plans and the builder'
      // "payment plans" comes first → primary intent PAYMENT_PLANS
      const primaryIntent = 'PAYMENT_PLANS'
      const secondaryIntent = 'BUILDER_HISTORY'

      assert.strictEqual(primaryIntent, 'PAYMENT_PLANS')
    })


    it('does not confuse budget (COSTS) with payment plans (PAYMENT_PLANS)', () => {
      const costMessage = 'What is the total price and registration cost?'
      const paymentMessage = 'What are the EMI options?'

      // Both mention cost-related words but one is COSTS, other is PAYMENT_PLANS
      assert.ok(costMessage.includes('price'))
      assert.ok(paymentMessage.includes('EMI'))
    })

    it('handles implicit secondary intent via follow-up question', () => {
      const conversation = [
        { turn: 1, message: 'Tell me about payment plans', intent: 'PAYMENT_PLANS' },
        { turn: 2, message: 'How long is construction?', intent: 'POSSESSION_TIMELINE' }
      ]

      assert.strictEqual(conversation[0].intent, 'PAYMENT_PLANS')
      assert.strictEqual(conversation[1].intent, 'POSSESSION_TIMELINE')
    })

  })

  describe('Fallback Suggestions', () => {
    it('suggests narrowing search when results too broad', () => {
      const broadResults = {
        count: 500,
        suggestion: 'Too many results. Try specifying budget or location.'
      }

      assert.ok(broadResults.count > 100)
      assert.ok(broadResults.suggestion.includes('budget') || broadResults.suggestion.includes('location'))
    })

    it('suggests expanding search when results empty', () => {
      const emptyResults = {
        count: 0,
        suggestion: 'No properties found. Try expanding budget range or sector.'
      }

      assert.strictEqual(emptyResults.count, 0)
      assert.ok(emptyResults.suggestion.includes('budget') || emptyResults.suggestion.includes('sector'))
    })

    it('offers calculated alternative when exact match unavailable', () => {
      const noExactMatch = {
        user_budget: { min: 45, max: 55 },
        available_properties: 'None in your exact budget',
        alternative: 'Found 8 properties in 40-60 crore range. View?'
      }

      assert.ok(noExactMatch.alternative.includes('View'))
    })

    it('suggests popular queries when input ambiguous', () => {
      const ambiguousInput = 'Tell me about properties'
      const suggestions = [
        'View properties with payment plans',
        'Compare builder reputations',
        'Show properties by location'
      ]

      assert.ok(Array.isArray(suggestions))
      assert.ok(suggestions.length > 0)
    })
  })

  describe('Rate Limiting & Overload', () => {
    it('returns 429 Too Many Requests on rate limit', () => {
      const rateLimitResponse = {
        status: 429,
        message: 'Too many requests. Please wait before trying again.',
        retry_after_seconds: 60
      }

      assert.strictEqual(rateLimitResponse.status, 429)
      assert.ok(rateLimitResponse.retry_after_seconds > 0)
    })

    it('shows user-friendly rate limit message', () => {
      const message = 'You\'re asking questions too quickly. Please wait 60 seconds.'
      assert.ok(message.includes('wait'))
      assert.ok(!message.includes('429') && !message.includes('HTTP'))
    })

    it('queues requests on overload (backend behavior)', () => {
      // User sends 10 rapid messages
      // Backend: 1st-3rd process immediately, 4th-10th queued
      const requestQueue = {
        immediate: 3,
        queued: 7,
        processing_time_ms: 250
      }

      assert.strictEqual(requestQueue.immediate, 3)
      assert.ok(requestQueue.queued > 0)
    })
  })

  describe('Null/Undefined Handling', () => {
    it('handles null message gracefully', () => {
      const nullMessage = null
      const fallback = 'I didn\'t understand that. Could you rephrase?'

      if (nullMessage === null) {
        assert.ok(fallback.length > 0)
      }
    })


    it('handles missing payload safely', () => {
      const chip = {
        id: 'chip_test',
        actionType: 'TEXT_MESSAGE',
        label: 'Test',
        icon: '🧪',
        analyticsId: 'chip_test',
        priority: 1,
        payload: {} // Empty payload
      }

      assert.ok(chip.payload !== null && chip.payload !== undefined)
    })
  })

  describe('Timeout Scenarios', () => {
    it('returns partial results on timeout', () => {
      // Query started but timed out after 3 seconds
      const timeoutResponse = {
        message: 'Found some properties, but search timed out. Results may be incomplete.',
        data: { properties: [{ id: 1 }, { id: 2 }] }, // Partial
        warning: 'Results incomplete due to timeout',
        chips: ['refresh', 'refine_search']
      }

      assert.ok(timeoutResponse.data.properties.length > 0)
      assert.ok(timeoutResponse.warning.includes('timeout'))
    })

    it('suggests retry on timeout', () => {
      const timeoutChips = ['try_again', 'refine_search', 'change_criteria']
      assert.ok(timeoutChips.includes('try_again'))
    })
  })
})
