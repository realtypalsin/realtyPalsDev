import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SuggestionChip } from './SuggestionChip'
import type { ChipAction } from './types'

const mockChip = {
  id: 'test-chip-1',
  actionType: 'TEXT_MESSAGE',
  label: 'Show me results',
  icon: null,
  priority: 1,
  group: undefined,
  payload: { text: 'Show me results' },
} as unknown as ChipAction

describe('SuggestionChip', () => {
  it('should render chip label', () => {
    render(
      <SuggestionChip
        chip={mockChip}
        onAction={() => {}}
        chipPicker={null}
        onSetChipPicker={() => {}}
      />
    )
    expect(screen.getByText('Show me results')).toBeTruthy()
  })

  it('should have aria-label for accessibility', () => {
    render(
      <SuggestionChip
        chip={mockChip}
        onAction={() => {}}
        chipPicker={null}
        onSetChipPicker={() => {}}
      />
    )
    const button = screen.getByRole('button')
    expect(button.getAttribute('aria-label')).toBe('Show me results')
  })

  it('should have aria-pressed reflecting active state', () => {
    const { rerender } = render(
      <SuggestionChip
        chip={mockChip}
        onAction={() => {}}
        chipPicker={null}
        onSetChipPicker={() => {}}
      />
    )
    let button = screen.getByRole('button')
    expect(button.getAttribute('aria-pressed')).toBe('false')

    rerender(
      <SuggestionChip
        chip={mockChip}
        onAction={() => {}}
        chipPicker={{ mode: 'single', label: mockChip.label, action: 'test', selected: [], isModal: false }}
        onSetChipPicker={() => {}}
      />
    )
    button = screen.getByRole('button')
    expect(button.getAttribute('aria-pressed')).toBe('true')
  })

  it('should call onClick when clicked', async () => {
    const onClick = jest.fn()
    const user = userEvent.setup()
    render(
      <SuggestionChip
        chip={mockChip}
        onAction={onClick}
        chipPicker={null}
        onSetChipPicker={() => {}}
      />
    )
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledWith(mockChip)
  })
})
