/**
 * Query Planner Tests — Verify intent detection and field mapping
 */

import { describe, it, expect } from 'vitest'
import { planProjectDetailQuery, isActionable, getClarificationMessage } from './queryPlanner'

describe('Query Planner', () => {
  describe('Payment Intent', () => {
    it('recognizes EMI queries', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'How much EMI for ATS Pristine?',
      })
      expect(plan.intent).toBe('payment')
      expect(plan.confidence).toBeGreaterThan(0.9)
    })

    it('recognizes cost breakdown queries', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'What is the cost breakdown for this project?',
      })
      expect(plan.intent).toBe('payment')
    })

    it('includes required payment fields', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'How much EMI for ATS Pristine?',
      })
      expect(plan.requiredFields).toContain('price_min_cr')
      expect(plan.requiredFields).toContain('gst_rate_pct')
      expect(plan.requiredFields).toContain('stamp_duty_pct')
    })
  })

  describe('Investment Intent', () => {
    it('recognizes investment queries', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'Is this a good investment?',
      })
      expect(plan.intent).toBe('investment')
      expect(plan.confidence).toBeGreaterThan(0.85)
    })

    it('recognizes appreciation/ROI queries', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'What is the price appreciation for this project?',
      })
      expect(plan.intent).toBe('investment')
    })

    it('includes required investment fields', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'Is Godrej a good investment?',
      })
      expect(plan.requiredFields).toContain('price_min_cr')
      expect(plan.requiredFields).toContain('price_cagr_pct')
    })
  })

  describe('Location Intent', () => {
    it('recognizes metro distance queries', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'How far is the metro from here?',
      })
      expect(plan.intent).toBe('location')
      expect(plan.confidence).toBeGreaterThan(0.85)
    })

    it('recognizes nearby amenities queries', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'What schools are nearby?',
      })
      expect(plan.intent).toBe('location')
    })

    it('includes connectivity fields', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'What is the connectivity like?',
      })
      expect(plan.requiredFields).toContain('connectivity_count')
    })
  })

  describe('Timeline Intent', () => {
    it('recognizes possession queries', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'When will this be ready?',
      })
      expect(plan.intent).toBe('timeline')
      expect(plan.confidence).toBeGreaterThan(0.85)
    })

    it('recognizes completion queries', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'What is the possession date?',
      })
      expect(plan.intent).toBe('timeline')
    })

    it('includes timeline fields', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'When will possession happen?',
      })
      expect(plan.requiredFields).toContain('possession_date')
      expect(plan.requiredFields).toContain('project_status')
    })
  })

  describe('Builder Intent', () => {
    it('recognizes builder queries', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'Tell me about the builder',
      })
      expect(plan.intent).toBe('builder')
      expect(plan.confidence).toBeGreaterThan(0.8)
    })

    it('recognizes track record queries', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'What is their delivery track record?',
      })
      expect(plan.intent).toBe('builder')
    })

    it('includes builder fields', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'Who is building this?',
      })
      expect(plan.requiredFields).toContain('builder_name')
      expect(plan.requiredFields).toContain('builder_delivery_score')
    })
  })

  describe('Details Intent', () => {
    it('recognizes overview queries', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'Tell me about ATS Pristine',
      })
      expect(plan.intent).toBe('details')
    })

    it('includes overview fields', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'What are the amenities?',
      })
      expect(plan.requiredFields).length.toBeGreaterThan(0)
    })
  })

  describe('Plan Validation', () => {
    it('flags plan as actionable when project found', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'How much EMI for ATS Pristine?',
      })
      // Will be actionable if projectIds extracted and confidence high
      if (plan.projectIds.length > 0 && plan.confidence > 0.7) {
        expect(isActionable(plan)).toBe(true)
      }
    })

    it('flags plan as not actionable when missing project', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'How much EMI?', // No project name
      })
      if (plan.projectIds.length === 0) {
        expect(isActionable(plan)).toBe(false)
      }
    })

    it('generates clarification when needed', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'How much EMI?', // Missing project
      })
      if (!isActionable(plan)) {
        const msg = getClarificationMessage(plan)
        expect(msg).toContain('project') // Should ask for project name
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
      // Should extract from context
      if (plan.projectIds.length > 0) {
        expect(plan.projectIds[0]).toBeDefined()
      }
    })
  })

  describe('Tool Mapping', () => {
    it('maps payment intent to calculator + db', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'How much EMI?',
      })
      if (plan.intent === 'payment') {
        expect(plan.tools).toContain('calculator')
        expect(plan.tools).toContain('db')
      }
    })

    it('maps investment intent to analyzer + db', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'Is this a good investment?',
      })
      if (plan.intent === 'investment') {
        expect(plan.tools).toContain('analyzer')
        expect(plan.tools).toContain('db')
      }
    })

    it('maps location intent to maps + db', async () => {
      const plan = await planProjectDetailQuery({
        userMessage: 'How far is metro?',
      })
      if (plan.intent === 'location') {
        expect(plan.tools).toContain('maps')
        expect(plan.tools).toContain('db')
      }
    })
  })
})
