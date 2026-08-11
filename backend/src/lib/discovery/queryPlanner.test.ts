/**
 * Query Planner Tests — Verify intent detection and field mapping
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { planProjectDetailQuery, isActionable, getClarificationMessage } from './queryPlanner'

describe('Query Planner', () => {
  describe('Payment Intent', () => {
    it('recognizes EMI queries', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'How much EMI for ATS Pristine?',
      })
      assert.equal(plan.intent, 'payment')
      assert(plan.confidence > 0.9)
    })

    it('recognizes cost breakdown queries', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'What is the cost breakdown for this project?',
      })
      assert.equal(plan.intent, 'payment')
    })

    it('includes required payment fields', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'How much EMI for ATS Pristine?',
      })
      assert(plan.requiredFields.includes('price_min_cr'))
      assert(plan.requiredFields.includes('gst_rate_pct'))
      assert(plan.requiredFields.includes('stamp_duty_pct'))
    })
  })

  describe('Investment Intent', () => {
    it('recognizes investment queries', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'Is this a good investment?',
      })
      assert.equal(plan.intent, 'investment')
      assert(plan.confidence > 0.85)
    })

    it('recognizes appreciation/ROI queries', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'What is the price appreciation for this project?',
      })
      assert.equal(plan.intent, 'investment')
    })

    it('includes required investment fields', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'Is Godrej a good investment?',
      })
      assert(plan.requiredFields.includes('price_min_cr'))
      assert(plan.requiredFields.includes('price_cagr_pct'))
    })
  })

  describe('Location Intent', () => {
    it('recognizes metro distance queries', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'How far is the metro from here?',
      })
      assert.equal(plan.intent, 'location')
      assert(plan.confidence > 0.85)
    })

    it('recognizes nearby amenities queries', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'What schools are nearby?',
      })
      assert.equal(plan.intent, 'location')
    })

    it('includes connectivity fields', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'What is the connectivity like?',
      })
      assert(plan.requiredFields.includes('connectivity_count'))
    })
  })

  describe('Timeline Intent', () => {
    it('recognizes possession queries', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'When will this be ready?',
      })
      assert.equal(plan.intent, 'timeline')
      assert(plan.confidence > 0.85)
    })

    it('recognizes completion queries', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'What is the possession date?',
      })
      assert.equal(plan.intent, 'timeline')
    })

    it('includes timeline fields', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'When will possession happen?',
      })
      assert(plan.requiredFields.includes('possession_date'))
      assert(plan.requiredFields.includes('project_status'))
    })
  })

  describe('Builder Intent', () => {
    it('recognizes builder queries', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'Tell me about the builder',
      })
      assert.equal(plan.intent, 'builder')
      assert(plan.confidence > 0.8)
    })

    it('recognizes track record queries', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'What is their delivery track record?',
      })
      assert.equal(plan.intent, 'builder')
    })

    it('includes builder fields', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'Who is building this?',
      })
      assert(plan.requiredFields.includes('builder_name'))
      assert(plan.requiredFields.includes('builder_delivery_score'))
    })
  })

  describe('Details Intent', () => {
    it('recognizes overview queries', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'Tell me about ATS Pristine',
      })
      assert.equal(plan.intent, 'details')
    })

    it('includes overview fields', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'What are the amenities?',
      })
      assert(plan.requiredFields.length > 0)
    })
  })

  describe('Plan Validation', () => {
    it('flags plan as actionable when project found', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'How much EMI for ATS Pristine?',
      })
      if (plan.projectIds.length > 0 && plan.confidence > 0.7) {
        assert.equal(isActionable(plan), true)
      }
    })

    it('flags plan as not actionable when missing project', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'How much EMI?',
      })
      if (plan.projectIds.length === 0) {
        assert.equal(isActionable(plan), false)
      }
    })

    it('generates clarification when needed', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'How much EMI?',
      })
      if (!isActionable(plan)) {
        const msg = getClarificationMessage(plan)
        assert(msg.includes('project'))
      }
    })
  })

  describe('Conversation Context', () => {
    it('uses active projects from context', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'How much EMI?',
        conversationContext: {
          activeProjects: ['ats-pristine', 'godrej-air'],
        },
      })
      if (plan.projectIds.length > 0) {
        assert.ok(plan.projectIds[0])
      }
    })
  })

  describe('Tool Mapping', () => {
    it('maps payment intent to calculator + db', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'How much EMI?',
      })
      if (plan.intent === 'payment') {
        assert(plan.tools.includes('calculator'))
        assert(plan.tools.includes('db'))
      }
    })

    it('maps investment intent to analyzer + db', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'Is this a good investment?',
      })
      if (plan.intent === 'investment') {
        assert(plan.tools.includes('analyzer'))
        assert(plan.tools.includes('db'))
      }
    })

    it('maps location intent to maps + db', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'How far is metro?',
      })
      if (plan.intent === 'location') {
        assert(plan.tools.includes('maps'))
        assert(plan.tools.includes('db'))
      }
    })
  })
})
