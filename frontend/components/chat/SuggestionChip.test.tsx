import { describe, it, expect } from 'node:test'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SuggestionChip } from './SuggestionChip'
import type { ChipAction } from '@/components/chat/MessageBubble'

const mockChip: ChipAction = {
  id: 'test-chip-1',
  actionType: 'TEXT_MESSAGE',
  label: 'Show me results',
  icon: null,
  priority: 1,
  group: undefined,
  payload: { text: 'Show me results' },
}

describe('SuggestionChip', () => {
  it('should render chip label', () => {
    render(
      <SuggestionChip
        chip={mockChip}
        onChipClick={() => {}}
        isActive={false}
      />
    )
    expect(screen.getByText('Show me results')).toBeTruthy()
  })

  it('should have aria-label for accessibility', () => {
    render(
      <SuggestionChip
        chip={mockChip}
        onChipClick={() => {}}
        isActive={false}
      />
    )
    const button = screen.getByRole('button')
    expect(button.getAttribute('aria-label')).toBe('Show me results')
  })

  it('should have aria-pressed reflecting active state', () => {
    const { rerender } = render(
      <SuggestionChip
        chip={mockChip}
        onChipClick={() => {}}
        isActive={false}
      />
    )
    let button = screen.getByRole('button')
    expect(button.getAttribute('aria-pressed')).toBe('false')

    rerender(
      <SuggestionChip
        chip={mockChip}
        onChipClick={() => {}}
        isActive={true}
      />
    )
    button = screen.getByRole('button')
    expect(button.getAttribute('aria-pressed')).toBe('true')
  })

  it('should call onClick when clicked', async () => {
    const onClick = expect.fn()
    const user = userEvent.setup()
    render(
      <SuggestionChip
        chip={mockChip}
        onChipClick={onClick}
        isActive={false}
      />
    )
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledWith(mockChip)
  })
})
