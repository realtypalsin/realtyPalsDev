import { buildPickerMessage } from '@/components/chat/MessageBubble'
import type { ProjectCard } from '@/types/project'

describe('Compare feature', () => {
  it('builds correct message for 2 properties', () => {
    const props: ProjectCard[] = [
      { id: '1', name: 'Fusion The Brook', slug: 'fusion-brook', builder: { name: 'Fusion' }, unit_types: [] } as any,
      { id: '2', name: 'Ace Hanei', slug: 'ace-hanei', builder: { name: 'Ace' }, unit_types: [] } as any,
    ]
    const msg = buildPickerMessage('compare', props)
    expect(msg).toContain('Fusion The Brook')
    expect(msg).toContain('Ace Hanei')
    expect(msg).toContain('Compare')
    expect(msg).toContain('vs')
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
    expect(msg).toContain('Project 0')
    expect(msg).toContain('Project 3')
    expect(msg).toContain('Compare')
  })
})
