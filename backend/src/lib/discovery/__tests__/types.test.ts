import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { ConversationMemory } from '../types'

describe('ConversationMemory types', () => {
  it('should accept user_budget_min_cr and max_cr', () => {
    const memory: ConversationMemory = {
      user_budget_min_cr: 50,
      user_budget_max_cr: 75,
      user_timeline: '5 years',
      user_pain_points: ['want flexibility'],
      user_priorities: ['affordability'],
      projects_discussed: ['Kingston'],
      stage: 'CLARIFYING',
      confident_facts: {}
    }
    assert.equal(memory.user_budget_min_cr, 50)
  })
})
