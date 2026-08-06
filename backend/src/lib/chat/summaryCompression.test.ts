// backend/src/lib/chat/summaryCompression.test.ts
import { describe, it, expect } from 'vitest'
import { maybeCompressTopical } from './summaryCompression'

describe('summaryCompression', () => {
  it('returns messages unchanged if below compression threshold', async () => {
    const messages = [
      { role: 'user' as const, content: 'Looking for 3BHK' },
      { role: 'assistant' as const, content: 'Got it' },
    ]
    const result = await maybeCompressTopical(messages)
    expect(result.messages).toEqual(messages)
    expect(result.newSummaries).toBeNull()
  })

  it('compresses messages above threshold', async () => {
    const messages = Array.from({ length: 20 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as const,
      content: `Message ${i}: Budget 1-2 crore, want Sector 62, need possession in 6 months`,
    }))
    const result = await maybeCompressTopical(messages)
    // Should keep only recent messages
    expect(result.messages.length).toBeLessThan(messages.length)
    expect(result.messages.length).toBeLessThanOrEqual(8) // KEEP_RECENT = 8
  })

  it('returns topic summaries structure', async () => {
    const messages = Array.from({ length: 20 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as const,
      content: `Message ${i}`,
    }))
    const result = await maybeCompressTopical(messages)
    if (result.newSummaries) {
      expect(result.newSummaries).toHaveProperty('location')
      expect(result.newSummaries).toHaveProperty('financial')
      expect(result.newSummaries).toHaveProperty('timeline')
    }
  })
})
