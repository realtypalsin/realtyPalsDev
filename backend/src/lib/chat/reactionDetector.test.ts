// backend/src/lib/chat/reactionDetector.test.ts
import { describe, it, expect } from 'vitest'
import { detectPropertyReactions } from './reactionDetector'

describe('reactionDetector', () => {
  it('detects interested sentiment', () => {
    const message = 'I love this property, it is perfect!'
    const reactions = detectPropertyReactions(message, 'DRILLDOWN', ['proj-1'])
    expect(reactions).toHaveLength(1)
    expect(reactions[0].sentiment).toBe('interested')
    expect(reactions[0].signals).toContain('love')
    expect(reactions[0].signals).toContain('perfect')
  })

  it('detects concerned sentiment', () => {
    const message = "I'm worried about the expensive cost and too long possession"
    const reactions = detectPropertyReactions(message, 'DRILLDOWN', ['proj-2'])
    expect(reactions).toHaveLength(1)
    expect(reactions[0].sentiment).toBe('concerned')
    expect(reactions[0].signals).toContain('worried')
    expect(reactions[0].signals).toContain('expensive')
  })

  it('detects rejected sentiment (highest priority)', () => {
    const message = 'No way, ruled out for sure'
    const reactions = detectPropertyReactions(message, 'COMPARISON', ['proj-3'])
    expect(reactions).toHaveLength(1)
    expect(reactions[0].sentiment).toBe('rejected')
    expect(reactions[0].signals).toContain('ruled out')
  })

  it('returns empty for non-DRILLDOWN/COMPARISON queries', () => {
    const message = 'I love this property'
    const reactions = detectPropertyReactions(message, 'DISCOVERY', ['proj-1'])
    expect(reactions).toHaveLength(0)
  })

  it('applies sentiment to all mentioned projects', () => {
    const message = 'This is amazing'
    const reactions = detectPropertyReactions(message, 'DRILLDOWN', ['proj-1', 'proj-2', 'proj-3'])
    expect(reactions).toHaveLength(3)
    expect(reactions.every(r => r.sentiment === 'interested')).toBe(true)
  })
})
