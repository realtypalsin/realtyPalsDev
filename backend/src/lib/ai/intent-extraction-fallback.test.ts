import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { extractIntent } from './intent'

describe('intent extraction resilience', () => {
  it('should extract BHK from heuristic pattern', async () => {
    // Disable OpenAI to force fallback
    const oldKey = process.env.OPENAI_API_KEY
    const oldGroqKey = process.env.GROQ_API_KEY
    delete process.env.OPENAI_API_KEY
    delete process.env.GROQ_API_KEY

    try {
      const result = await extractIntent('Show me 3BHK properties', {})
      assert(result.degraded === true)
      assert.deepStrictEqual(result.intent.bhk, [3])
    } finally {
      if (oldKey) process.env.OPENAI_API_KEY = oldKey
      if (oldGroqKey) process.env.GROQ_API_KEY = oldGroqKey
    }
  })

  it('should extract budget from heuristic pattern', async () => {
    const oldKey = process.env.OPENAI_API_KEY
    const oldGroqKey = process.env.GROQ_API_KEY
    delete process.env.OPENAI_API_KEY
    delete process.env.GROQ_API_KEY

    try {
      const result = await extractIntent('Properties under 2.5 crore', {})
      assert(result.degraded === true)
      assert.equal(result.intent.budgetMax, 2.5)
    } finally {
      if (oldKey) process.env.OPENAI_API_KEY = oldKey
      if (oldGroqKey) process.env.GROQ_API_KEY = oldGroqKey
    }
  })

  it('should extract sector from heuristic pattern', async () => {
    const oldKey = process.env.OPENAI_API_KEY
    const oldGroqKey = process.env.GROQ_API_KEY
    delete process.env.OPENAI_API_KEY
    delete process.env.GROQ_API_KEY

    try {
      const result = await extractIntent('Properties in Sector 150', {})
      assert(result.degraded === true)
      assert.equal(result.intent.sector, 'Sector 150')
    } finally {
      if (oldKey) process.env.OPENAI_API_KEY = oldKey
      if (oldGroqKey) process.env.GROQ_API_KEY = oldGroqKey
    }
  })

  it('should preserve previous intent when heuristic matches nothing', async () => {
    const oldKey = process.env.OPENAI_API_KEY
    const oldGroqKey = process.env.GROQ_API_KEY
    delete process.env.OPENAI_API_KEY
    delete process.env.GROQ_API_KEY

    try {
      const previousIntent = { sector: 'Sector 75', bhk: [2] }
      const result = await extractIntent('Tell me more', previousIntent)
      assert(result.degraded === true)
      // Should preserve previous intent
      assert.deepStrictEqual(result.intent.sector, previousIntent.sector)
      assert.deepStrictEqual(result.intent.bhk, previousIntent.bhk)
    } finally {
      if (oldKey) process.env.OPENAI_API_KEY = oldKey
      if (oldGroqKey) process.env.GROQ_API_KEY = oldGroqKey
    }
  })
})
