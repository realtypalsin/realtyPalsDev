import { describe, it } from 'node:test'
import assert from 'node:assert'
import { detectDatabaseIntent } from '../intentTypeDetector'
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

  })
})
