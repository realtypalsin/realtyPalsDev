// backend/src/lib/chat/summaryCompression.test.ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { maybeCompressTopical } from './summaryCompression'

describe('summaryCompression', () => {
  it('returns messages unchanged if below compression threshold', async () => {
    const messages = [
      { role: 'user' as const, content: 'Looking for 3BHK' },
      { role: 'assistant' as const, content: 'Got it' },
    ]
    const result = await maybeCompressTopical(messages)
    assert.deepEqual(result.messages, messages)
    assert.equal(result.newSummaries, null)
  })

  it('compresses messages above threshold', async () => {
    const messages = Array.from({ length: 20 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as const,
      content: `Message ${i}: Budget 1-2 crore, want Sector 62, need possession in 6 months`,
    }))
    const result = await maybeCompressTopical(messages)
    assert(result.messages.length < messages.length)
    assert(result.messages.length <= 8)
  })

  it('returns topic summaries structure', async () => {
    const messages = Array.from({ length: 20 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as const,
      content: `Message ${i}`,
    }))
    const result = await maybeCompressTopical(messages)
    if (result.newSummaries) {
      assert.ok('location' in result.newSummaries)
      assert.ok('financial' in result.newSummaries)
      assert.ok('timeline' in result.newSummaries)
    }
  })
})
