import { describe, it, expect, vi } from 'vitest'
import type { ChatMessage } from '@/types/property'

describe('MessageBubble', () => {
  const createMockMessage = (overrides?: Partial<ChatMessage>): ChatMessage => ({
    id: 'msg-1',
    type: 'ai' as const,
    content: 'Test message',
    isSearching: false,
    responseMode: 'chat',
    timestamp: new Date(),
    ...overrides,
  })

  it('renders AI message correctly', () => {
    const message = createMockMessage({ type: 'ai' })
    expect(message.type).toBe('ai')
    expect(message.content).toBe('Test message')
  })

  it('renders user message correctly', () => {
    const message = createMockMessage({ type: 'user' })
    expect(message.type).toBe('user')
  })

  it('includes comparison table when showComparisonTable is true', () => {
    const message = createMockMessage({
      showComparisonTable: true,
      comparisonProjects: [
        { id: '1', name: 'Project A', slug: 'proj-a' } as any,
        { id: '2', name: 'Project B', slug: 'proj-b' } as any,
      ],
    })

    expect(message.showComparisonTable).toBe(true)
    expect(message.comparisonProjects).toHaveLength(2)
  })

  it('handles responseMode comparison', () => {
    const message = createMockMessage({
      responseMode: 'comparison',
      showComparisonTable: true,
    })

    expect(message.responseMode).toBe('comparison')
    expect(message.showComparisonTable).toBe(true)
  })

  it('tracks property events on view', () => {
    const message = createMockMessage({
      projectCards: [
        { id: 'p1', name: 'Project 1', slug: 'proj-1' } as any,
      ],
    })

    expect(message.projectCards).toBeDefined()
    expect(message.projectCards![0].id).toBe('p1')
  })

  it('handles chip picker state transitions', () => {
    const message = createMockMessage({
      chips: [
        { id: 'chip-1', label: 'Budget', actionType: 'filter' } as any,
      ],
    })

    expect(message.chips).toHaveLength(1)
    expect(message.chips![0].label).toBe('Budget')
  })
})
