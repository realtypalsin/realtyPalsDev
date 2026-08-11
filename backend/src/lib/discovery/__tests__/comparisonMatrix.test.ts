import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { rankPaymentPlans } from '../comparisonMatrix'
import type { ConversationMemory } from '../types'

describe('Comparison Matrix', () => {
  it('should rank by upfront cost when budget constraint detected', () => {
    const memory: Partial<ConversationMemory> = {
      user_budget_min_cr: 50,
      user_budget_max_cr: 75,
      user_pain_points: ['want low upfront']
    }
    const plans = [
      { id: '1', plan_type: 'construction_linked', down_payment_pct: 30, duration_months: 60, monthly_emi: 50000 },
      { id: '2', plan_type: 'possession_linked', down_payment_pct: 20, duration_months: 60, monthly_emi: 55000 },
      { id: '3', plan_type: 'balance', down_payment_pct: 25, duration_months: 60, monthly_emi: 52500 }
    ]
    const result = rankPaymentPlans(plans as any, memory)
    assert.equal(result.matrix.rows[0].name, 'possession_linked')
    assert.equal(result.winner, 'possession_linked')
    assert(result.reason.includes('budget'))
  })

  it('should rank by flexibility when timeline concerns detected', () => {
    const memory: Partial<ConversationMemory> = {
      user_timeline: '5 years',
      user_pain_points: ['need flexibility', 'timeline important']
    }
    const plans = [
      { id: '1', plan_type: 'fixed', duration_months: 60, down_payment_pct: 20, monthly_emi: 50000 },
      { id: '2', plan_type: 'flexible', duration_months: null, down_payment_pct: 25, monthly_emi: 48000 },
      { id: '3', plan_type: 'construction_linked', duration_months: null, down_payment_pct: 30, monthly_emi: 45000 }
    ]
    const result = rankPaymentPlans(plans as any, memory)
    assert(result.winner.includes('flexible'))
  })

  it('should include reason in ranking decision', () => {
    const memory: Partial<ConversationMemory> = {
      user_budget_min_cr: 50,
      user_budget_max_cr: 75
    }
    const plans = [
      { id: '1', plan_type: 'low_upfront', down_payment_pct: 15, duration_months: 60, monthly_emi: 50000 }
    ]
    const result = rankPaymentPlans(plans as any, memory)
    assert(result.reason.length > 0)
    assert(result.reason.includes('budget'))
  })

  it('should build comparison matrix with correct structure', () => {
    const memory: Partial<ConversationMemory> = {
      user_budget_min_cr: 50,
      user_budget_max_cr: 75
    }
    const plans = [
      { id: '1', plan_type: 'plan_a', down_payment_pct: 20, duration_months: 60, monthly_emi: 50000 },
      { id: '2', plan_type: 'plan_b', down_payment_pct: 25, duration_months: 60, monthly_emi: 48000 }
    ]
    const result = rankPaymentPlans(plans as any, memory)
    assert(result.matrix.dimensions.length > 0)
    assert(result.matrix.rows.length > 0)
    assert.ok(result.matrix.rows[0].values)
  })
})
