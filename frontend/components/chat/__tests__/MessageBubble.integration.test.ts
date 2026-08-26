// node:test, matching the rest of components/chat/__tests__ — this directory is run
// by `npm run test:node`, not by jest (jest ignores it in testPathIgnorePatterns).
// The file previously used jest's global describe/it/expect and threw
// "describe is not defined" on every run of that script.
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { ChatMessage } from '@/types/property'

describe('ChatMessage shape', () => {
  const createMockMessage = (overrides?: Partial<ChatMessage>): ChatMessage => ({
    id: 'msg-1',
    type: 'ai' as const,
    content: 'Test message',
    isSearching: false,
    responseMode: 'chat',
    timestamp: new Date(),
    ...overrides,
  })

  it('defaults to an ai message with content', () => {
    const message = createMockMessage({ type: 'ai' })
    assert.equal(message.type, 'ai')
    assert.equal(message.content, 'Test message')
  })

  it('carries a user message type', () => {
    assert.equal(createMockMessage({ type: 'user' }).type, 'user')
  })

  it('carries comparison projects when showComparisonTable is set', () => {
    const message = createMockMessage({
      showComparisonTable: true,
      comparisonProjects: [
        { id: '1', name: 'Project A', slug: 'proj-a' } as any,
        { id: '2', name: 'Project B', slug: 'proj-b' } as any,
      ],
    })

    assert.equal(message.showComparisonTable, true)
    assert.equal(message.comparisonProjects?.length, 2)
  })

  it('carries responseMode comparison', () => {
    const message = createMockMessage({
      responseMode: 'comparison',
      showComparisonTable: true,
    })

    assert.equal(message.responseMode, 'comparison')
    assert.equal(message.showComparisonTable, true)
  })

  it('carries project cards', () => {
    const message = createMockMessage({
      projectCards: [{ id: 'p1', name: 'Project 1', slug: 'proj-1' } as any],
    })

    assert.ok(message.projectCards)
    assert.equal(message.projectCards?.[0].id, 'p1')
  })

  it('carries chips', () => {
    const message = createMockMessage({
      chips: [{ id: 'chip-1', label: 'Budget', actionType: 'filter' } as any],
    })

    assert.equal(message.chips?.length, 1)
    assert.equal(message.chips?.[0].label, 'Budget')
  })
})
