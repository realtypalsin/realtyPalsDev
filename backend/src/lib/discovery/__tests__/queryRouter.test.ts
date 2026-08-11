import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { routeQuery } from '../queryRouter'

describe('Query Router', () => {
  it('should route "payment plans" to PaymentPlan table with 100% weight', () => {
    const route = routeQuery('PAYMENT_PLANS', 'Show me payment options for Kingston')
    assert.equal(route.primary_table, 'PaymentPlan')
    assert.equal(route.weight, 100)
  })

  it('should route "costs" query to CostSheet with 100% weight and secondary Cost context', () => {
    const route = routeQuery('COSTS', 'What is the total cost of this project?')
    assert.equal(route.primary_table, 'CostSheet')
    assert(route.secondary_tables.includes('Project'))
  })

  it('should route "builder" query to Builder table', () => {
    const route = routeQuery('BUILDER_HISTORY', 'Tell me about the builder')
    assert.equal(route.primary_table, 'Builder')
  })
})
