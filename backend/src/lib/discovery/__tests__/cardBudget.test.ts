import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { cardBudgetFor } from '../cardBudget'

describe('a question about the conversation', () => {
  it('earns no cards even when the buyer has narrowed a lot', () => {
    // Measured: "what did I ask you first?" was answered correctly and then
    // had six project cards rendered under it, because by that point two
    // constraints were on the intent and the budget only read the intent.
    const narrowed = { sector: 'Sector 79', bhk: [3], budgetMax: 2 } as never
    assert.equal(cardBudgetFor(narrowed, 'what did I ask you first?').limit, 0)
    assert.equal(cardBudgetFor(narrowed, 'what have I told you so far?').limit, 0)
    assert.equal(cardBudgetFor(narrowed, 'what was my first budget again?').limit, 0)
    // An ordinary inventory turn is untouched.
    assert.equal(cardBudgetFor(narrowed, 'show me 3bhk in sector 79').limit, 6)
  })
})
