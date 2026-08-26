// node:test, matching the rest of components/__tests__ — this directory is run by
// `npm run test:node`, not by jest (jest ignores it in testPathIgnorePatterns).
// The file previously used jest's global describe/it/expect, so it threw
// "describe is not defined" on every run of that script.
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildPickerMessage } from '@/components/chat/MessageBubble'
import type { ProjectCard } from '@/types/project'

describe('Compare feature', () => {
  it('builds correct message for 2 properties', () => {
    const props: ProjectCard[] = [
      { id: '1', name: 'Fusion The Brook', slug: 'fusion-brook', builder: { name: 'Fusion' }, unit_types: [] } as any,
      { id: '2', name: 'Ace Hanei', slug: 'ace-hanei', builder: { name: 'Ace' }, unit_types: [] } as any,
    ]
    const msg = buildPickerMessage('compare', props)
    assert.match(msg, /Fusion The Brook/)
    assert.match(msg, /Ace Hanei/)
    assert.match(msg, /Compare/)
    assert.match(msg, /vs/)
  })

  it('builds correct message for 3+ properties', () => {
    const props = Array.from({ length: 4 }, (_, i) => ({
      id: String(i),
      name: `Project ${i}`,
      slug: `proj-${i}`,
      builder: { name: 'Builder' },
      unit_types: []
    })) as any

    const msg = buildPickerMessage('compare', props)
    assert.match(msg, /Project 0/)
    assert.match(msg, /Project 3/)
    assert.match(msg, /Compare/)
  })
})
