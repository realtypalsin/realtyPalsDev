import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { toGeminiContents, GeminiStreamStallError } from './gemini'

describe('toGeminiContents', () => {
  it('maps assistant -> model and user -> user', () => {
    const result = toGeminiContents([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
    ])
    assert.deepEqual(result, [
      { role: 'user', parts: [{ text: 'hi' }] },
      { role: 'model', parts: [{ text: 'hello' }] },
    ])
  })

  it('drops system and tool role turns (handled separately for Gemini)', () => {
    const result = toGeminiContents([
      { role: 'system', content: 'you are an assistant' },
      { role: 'user', content: 'hi' },
      { role: 'tool', content: '{"result":true}' },
    ])
    assert.deepEqual(result, [{ role: 'user', parts: [{ text: 'hi' }] }])
  })

  it('treats a null content as empty text rather than throwing', () => {
    const result = toGeminiContents([{ role: 'user', content: null }])
    assert.deepEqual(result, [{ role: 'user', parts: [{ text: '' }] }])
  })
})

describe('GeminiStreamStallError', () => {
  it('carries the tokensSent flag and a name for instanceof-style checks', () => {
    const err = new GeminiStreamStallError('stalled', true)
    assert.equal(err.tokensSent, true)
    assert.equal(err.name, 'GeminiStreamStallError')
    assert.ok(err instanceof Error)
  })
})
