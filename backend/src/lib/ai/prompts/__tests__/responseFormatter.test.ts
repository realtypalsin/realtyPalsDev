import { describe, it, expect } from 'vitest'
import { buildResponseFormatterPrompt } from '../responseFormatter'

describe('Response Formatter', () => {
  it('should build a prompt that instructs LLM to format payment plans', () => {
    const paymentPlans = [
      {
        plan_type: 'construction_linked',
        down_payment_pct: 20,
        total_duration_months: 60,
        best_for: 'Those seeking certainty'
      }
    ]

    const prompt = buildResponseFormatterPrompt('PAYMENT_PLANS', paymentPlans, 95, {
      user_budget_min_cr: 50,
      user_budget_max_cr: 75
    })

    expect(prompt).toContain('payment plans')
    expect(prompt).toContain('decision framework')
    expect(prompt).toContain('₹')
  })

  it('should build prompt for COSTS query', () => {
    const costSheet = [{
      base_price_per_sqft: 5000,
      parking_cost: 1500000,
      gst_rate: 5
    }]

    const prompt = buildResponseFormatterPrompt('COSTS', costSheet, 90, {})
    expect(prompt).toContain('cost breakdown')
    expect(prompt).toContain('included')
  })

  it('should build prompt for BUILDER_HISTORY', () => {
    const builder = [{
      projects_delivered_count: 7,
      delivery_score: 95,
      average_delay_months: 2
    }]

    const prompt = buildResponseFormatterPrompt('BUILDER_HISTORY', builder, 85, {})
    expect(prompt).toContain('track record')
    expect(prompt).toContain('narrative')
  })
})
