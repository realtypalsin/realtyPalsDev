import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { NEUTRAL_TOOLS, toOpenAITools, toGeminiTools, validateToolArgs, capToolResult } from './tools'

describe('toOpenAITools', () => {
  it('wraps every neutral tool in the OpenAI function-call shape', () => {
    const tools = toOpenAITools()
    assert.equal(tools.length, NEUTRAL_TOOLS.length)
    for (const [i, t] of tools.entries()) {
      assert.equal(t.type, 'function')
      assert.equal(t.function.name, NEUTRAL_TOOLS[i].name)
      assert.equal(t.function.description, NEUTRAL_TOOLS[i].description)
      assert.deepEqual(t.function.parameters, NEUTRAL_TOOLS[i].parameters)
    }
  })
})

describe('toGeminiTools', () => {
  it('wraps every neutral tool in a single functionDeclarations block', () => {
    const [wrapper] = toGeminiTools()
    assert.equal(wrapper.functionDeclarations.length, NEUTRAL_TOOLS.length)
    for (const [i, decl] of wrapper.functionDeclarations.entries()) {
      assert.equal(decl.name, NEUTRAL_TOOLS[i].name)
      assert.equal(decl.description, NEUTRAL_TOOLS[i].description)
      assert.deepEqual(decl.parameters, NEUTRAL_TOOLS[i].parameters)
    }
  })
})

describe('validateToolArgs', () => {
  it('truncates over-limit string args for tools with declared limits', () => {
    const longQuery = 'x'.repeat(500)
    const result = validateToolArgs('web_search', { query: longQuery })
    assert.equal((result.query as string).length, 200)
  })

  it('passes args through unchanged for tools with no declared limits', () => {
    const args = { project_name: 'x'.repeat(500) }
    assert.deepEqual(validateToolArgs('payment_plan_lookup', args), args)
  })
})

describe('capToolResult', () => {
  it('leaves short results untouched', () => {
    assert.equal(capToolResult({ found: true }, 'builder_lookup'), JSON.stringify({ found: true }))
  })

  it('truncates results over the char budget with a marker', () => {
    const big = { text: 'y'.repeat(7000) }
    const capped = capToolResult(big, 'web_search')
    assert.ok(capped.endsWith('…[truncated for token budget]'))
    assert.ok(capped.length < JSON.stringify(big).length)
  })
})
