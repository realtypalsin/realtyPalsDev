// backend/src/lib/chat/reactionDetector.test.ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { detectPropertyReactions } from './reactionDetector'

describe('reactionDetector', () => {
  it('detects interested sentiment', () => {
    const message = 'I love this property, it is perfect!'
    const reactions = detectPropertyReactions(message, 'DRILLDOWN', ['proj-1'])
    assert.equal(reactions.length, 1)
    assert.equal(reactions[0].sentiment, 'interested')
    assert(reactions[0].signals.includes('love'))
    assert(reactions[0].signals.includes('perfect'))
  })

  it('detects concerned sentiment', () => {
    const message = "I'm worried about the expensive cost and too long possession"
    const reactions = detectPropertyReactions(message, 'DRILLDOWN', ['proj-2'])
    assert.equal(reactions.length, 1)
    assert.equal(reactions[0].sentiment, 'concerned')
    assert(reactions[0].signals.includes('worried'))
    assert(reactions[0].signals.includes('expensive'))
  })

  it('detects rejected sentiment (highest priority)', () => {
    const message = 'No way, ruled out for sure'
    const reactions = detectPropertyReactions(message, 'COMPARISON', ['proj-3'])
    assert.equal(reactions.length, 1)
    assert.equal(reactions[0].sentiment, 'rejected')
    assert(reactions[0].signals.includes('ruled out'))
  })

  it('returns empty for non-DRILLDOWN/COMPARISON queries', () => {
    const message = 'I love this property'
    const reactions = detectPropertyReactions(message, 'DISCOVERY', ['proj-1'])
    assert.equal(reactions.length, 0)
  })

  it('applies sentiment to all mentioned projects', () => {
    const message = 'This is amazing'
    const reactions = detectPropertyReactions(message, 'DRILLDOWN', ['proj-1', 'proj-2', 'proj-3'])
    assert.equal(reactions.length, 3)
    assert.equal(reactions.every(r => r.sentiment === 'interested'), true)
  })
})
