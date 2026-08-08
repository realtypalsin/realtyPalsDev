import { describe, it, expect } from 'vitest'
import { routeQuery } from '../queryRouter'

describe('Query Router', () => {
  it('should route "payment plans" to PaymentPlan table with 100% weight', () => {
    const route = routeQuery('PAYMENT_PLANS', 'Show me payment options for Kingston')
    expect(route.primary_table).toBe('PaymentPlan')
    expect(route.weight).toBe(100)
  })

  it('should route "costs" query to CostSheet with 100% weight and secondary Cost context', () => {
    const route = routeQuery('COSTS', 'What is the total cost of this project?')
    expect(route.primary_table).toBe('CostSheet')
    expect(route.secondary_tables).toContain('Project')
  })

  it('should route "builder" query to Builder table', () => {
    const route = routeQuery('BUILDER_HISTORY', 'Tell me about the builder')
    expect(route.primary_table).toBe('Builder')
  })
})
