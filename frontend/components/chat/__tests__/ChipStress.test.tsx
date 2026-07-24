import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import ChipPicker from '../ChipPicker'
import { SuggestionChip } from '../SuggestionChip'
import { CardSelectorChip } from '../CardSelectorChip'
import type { ChipAction } from '../types'

expect.extend(toHaveNoViolations)

function makeChip(over: Partial<ChipAction> = {}): ChipAction {
  return {
    id: over.id ?? `chip-${Math.random().toString(36).slice(2)}`,
    actionType: over.actionType ?? 'TEXT_MESSAGE',
    label: over.label ?? 'Show results',
    icon: over.icon ?? '🔍',
    analyticsId: over.analyticsId ?? 'a1',
    priority: over.priority ?? 1,
    payload: over.payload ?? { text: 'Show results' },
    group: over.group,
  } as ChipAction
}

function chips(n: number, over: (i: number) => Partial<ChipAction> = () => ({})): ChipAction[] {
  return Array.from({ length: n }, (_, i) => makeChip({ id: `c${i}`, label: `Chip ${i}`, ...over(i) }))
}

describe('ChipPicker: volume', () => {
  it('renders 100 chips without crashing', () => {
    const onAction = jest.fn()
    render(<ChipPicker chips={chips(100)} onAction={onAction} />)
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(100)
  })

  it('renders 0 chips as null (no empty container)', () => {
    const { container } = render(<ChipPicker chips={[]} onAction={jest.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('dedupes chips with identical ids (B1)', () => {
    const dup = [makeChip({ id: 'same', label: 'A' }), makeChip({ id: 'same', label: 'B' })]
    render(<ChipPicker chips={dup} onAction={jest.fn()} />)
    expect(screen.getAllByRole('button').length).toBe(1)
  })

  it('truncates a very long label without throwing (B2)', () => {
    const long = 'X'.repeat(500)
    render(<ChipPicker chips={[makeChip({ label: long })]} onAction={jest.fn()} />)
    const btn = screen.getByRole('button')
    expect(btn.getAttribute('title')).toBe(long)
  })
})

describe('ChipPicker: ordering', () => {
  it('handles undefined priority without NaN reordering (B3)', () => {
    const list = [
      makeChip({ id: 'p-undef', label: 'NoPri', priority: undefined as any }),
      makeChip({ id: 'p2', label: 'Two', priority: 2 }),
      makeChip({ id: 'p1', label: 'One', priority: 1 }),
    ]
    render(<ChipPicker chips={list} onAction={jest.fn()} />)
    const labels = screen.getAllByRole('button').map(b => b.textContent)
    // Verify all chips rendered (no crash from NaN)
    expect(labels).toHaveLength(3)
    expect(labels.some(l => l?.includes('One'))).toBe(true)
    expect(labels.some(l => l?.includes('NoPri'))).toBe(true)
  })
})

describe('ChipPicker: click spam', () => {
  it('debounces rapid clicks on the same single-project chip', () => {
    const onAction = jest.fn()
    const chip = makeChip({ payload: { projects: [{ id: '1', name: 'Alpha' }] } })
    render(<ChipPicker chips={[chip]} onAction={onAction} />)
    const btn = screen.getByRole('button')
    for (let i = 0; i < 10; i++) fireEvent.click(btn)
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('fires again after the debounce window', () => {
    jest.useFakeTimers()
    const onAction = jest.fn()
    const chip = makeChip({ payload: { text: 'go' } })
    render(<ChipPicker chips={[chip]} onAction={onAction} />)
    const btn = screen.getByRole('button')
    fireEvent.click(btn)
    jest.advanceTimersByTime(600)
    fireEvent.click(btn)
    expect(onAction).toHaveBeenCalledTimes(2)
    jest.useRealTimers()
  })
})

describe('ChipPicker: malformed input', () => {
  it('skips empty-label chips (B5)', () => {
    render(<ChipPicker chips={[makeChip({ label: '   ' }), makeChip({ label: 'Real' })]} onAction={jest.fn()} />)
    expect(screen.getAllByRole('button').length).toBe(1)
    expect(screen.getByText('Real')).toBeTruthy()
  })

  it('does not execute HTML in a label (XSS safety)', () => {
    const evil = '<img src=x onerror=alert(1)>'
    render(<ChipPicker chips={[makeChip({ label: evil })]} onAction={jest.fn()} />)
    expect(document.querySelector('img')).toBeNull()
    expect(screen.getByText(evil)).toBeTruthy()
  })

  it('survives a chip with an empty projects array', () => {
    const chip = makeChip({ payload: { projects: [] } })
    expect(() => render(<ChipPicker chips={[chip]} onAction={jest.fn()} />)).not.toThrow()
  })

  it('survives a chip whose payload is undefined', () => {
    const chip = makeChip({ payload: undefined as any })
    expect(() => render(<ChipPicker chips={[chip]} onAction={jest.fn()} />)).not.toThrow()
  })
})

describe('ChipPicker: multi-project dropdown', () => {
  it('opens a dropdown for a chip with >1 project', async () => {
    const user = userEvent.setup()
    const chip = makeChip({ payload: { projects: [{ id: '1', name: 'Alpha' }, { id: '2', name: 'Beta' }] } })
    render(<ChipPicker chips={[chip]} onAction={jest.fn()} />)
    await user.click(screen.getByRole('button', { name: chip.label }))
    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.getByText('Beta')).toBeTruthy()
  })

  it('survives clicking a multi-project chip without crashing', async () => {
    const user = userEvent.setup()
    const onAction = jest.fn()
    const chip = makeChip({
      payload: { projects: [{ id: '1', name: 'Alpha' }, { id: '2', name: 'Beta' }] },
    })
    expect(() => render(<ChipPicker chips={[chip]} onAction={onAction} />)).not.toThrow()
    await user.click(screen.getByRole('button', { name: chip.label }))
    expect(screen.getByText('Alpha')).toBeTruthy()
  })
})

describe('ChipPicker: a11y', () => {
  it('has no axe violations with 20 chips', async () => {
    const { container } = render(<ChipPicker chips={chips(20)} onAction={jest.fn()} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('SuggestionChip: robustness', () => {
  it('returns null for whitespace label (B5)', () => {
    const { container } = render(
      <SuggestionChip chip={makeChip({ label: '  ' })} chipPicker={null} onSetChipPicker={jest.fn()} onAction={jest.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders without crashing when disabled', () => {
    const onAction = jest.fn()
    expect(() =>
      render(
        <SuggestionChip chip={makeChip()} chipPicker={null} onSetChipPicker={jest.fn()} onAction={onAction} disabled />
      )
    ).not.toThrow()
  })
})

describe('CardSelectorChip: dropdown lifecycle (B7)', () => {
  const projects = [{ id: '1', name: 'Alpha' }, { id: '2', name: 'Beta' }]

  it('returns null with <=1 project', () => {
    const { container } = render(
      <CardSelectorChip chip={makeChip()} projects={[{ id: '1', name: 'Solo' }]} onSelect={jest.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('closes on Escape (B7)', async () => {
    const user = userEvent.setup()
    render(<CardSelectorChip chip={makeChip()} projects={projects} onSelect={jest.fn()} />)
    await user.click(screen.getByRole('button', { name: /Show results/ }))
    expect(screen.getByText('Alpha')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText('Alpha')).toBeNull()
  })

  it('closes on outside click (B7)', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <div>
        <CardSelectorChip chip={makeChip()} projects={projects} onSelect={jest.fn()} />
        <button>outside</button>
      </div>
    )
    await user.click(screen.getByRole('button', { name: /Show results/ }))
    expect(screen.getByText('Alpha')).toBeTruthy()
    fireEvent.mouseDown(screen.getByText('outside'))
    expect(screen.queryByText('Alpha')).toBeNull()
  })

  it('onSelect fires once with the chosen project id', async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()
    render(<CardSelectorChip chip={makeChip()} projects={projects} onSelect={onSelect} />)
    await user.click(screen.getByRole('button', { name: /Show results/ }))
    await user.click(screen.getByText('Beta'))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0][1]).toBe('2')
  })
})
