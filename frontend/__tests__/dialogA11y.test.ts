import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { nextTabForKey } from '@/components/ProjectDetailPanel'

/**
 * Keyboard access to the things a buyer opens.
 *
 * The audit scored accessibility 6 with "keyboard nav untested", and it was
 * worse than untested — the overlays had no focus management at all. Tab
 * walked out of the compare sheet into the chat behind the backdrop, where the
 * focus ring is invisible and the buyer is typing into a form they cannot see.
 * Escape did nothing. Closing dropped focus on <body>, which sends a screen
 * reader back to the top of the page.
 *
 * The behavioural half is asserted here; the wiring half is asserted against
 * the source, because jsdom does not lay out and `offsetParent` is null for
 * everything, which makes a rendered focus-trap test pass for the wrong reason.
 */

const src = (...p: string[]) => readFileSync(join(__dirname, '..', ...p), 'utf8')

describe('project detail tabs — arrow key navigation', () => {
  it('moves right and left through the tabs', () => {
    expect(nextTabForKey('ArrowRight', 'Overview')).toBe('Analysis')
    expect(nextTabForKey('ArrowLeft', 'Analysis')).toBe('Overview')
  })

  it('treats up and down the same as left and right', () => {
    // A tablist that scrolls horizontally on a phone is still navigated
    // vertically by some assistive tech.
    expect(nextTabForKey('ArrowDown', 'Overview')).toBe('Analysis')
    expect(nextTabForKey('ArrowUp', 'Analysis')).toBe('Overview')
  })

  it('wraps at both ends rather than dead-ending', () => {
    expect(nextTabForKey('ArrowRight', 'Builder')).toBe('Overview')
    expect(nextTabForKey('ArrowLeft', 'Overview')).toBe('Builder')
  })

  it('jumps to the ends with Home and End', () => {
    expect(nextTabForKey('Home', 'Pricing')).toBe('Overview')
    expect(nextTabForKey('End', 'Overview')).toBe('Builder')
  })

  it('ignores every other key', () => {
    // Typing must not steal the tab selection.
    for (const k of ['a', 'Enter', ' ', 'Tab', 'Escape', 'PageDown']) {
      expect(nextTabForKey(k, 'Pricing')).toBeNull()
    }
  })
})

describe('the dialog hook', () => {
  const hook = src('hooks', 'useDialogA11y.ts')

  it('wraps focus at both ends of the dialog', () => {
    expect(hook).toMatch(/e\.shiftKey && \(active === firstItem/)
    expect(hook).toMatch(/!e\.shiftKey && \(active === lastItem/)
  })

  it('pulls focus back if it has already escaped the dialog', () => {
    expect(hook).toMatch(/!node\.contains\(active\)/)
  })

  it('closes on Escape', () => {
    expect(hook).toMatch(/e\.key === 'Escape'/)
  })

  it('returns focus to whatever opened it', () => {
    expect(hook).toMatch(/restoreTo\.current\.focus\(\)/)
    // Only if it is still in the document — restoring to a removed node throws
    // focus onto <body>, which is the thing we are trying to avoid.
    expect(hook).toMatch(/isConnected/)
  })

  it('does not steal focus back from something else that claimed it', () => {
    expect(hook).toMatch(/stillInside/)
  })

  it('focuses the dialog itself when it holds nothing focusable yet', () => {
    // A panel still loading must not leave focus behind on the page.
    expect(hook).toMatch(/node\.setAttribute\('tabindex', '-1'\)/)
  })
})

describe('dialogs declare themselves', () => {
  const cases: Array<[string, string[]]> = [
    ['compare selector', ['components', 'chat', 'CompareSelectorOverlay.tsx']],
    ['filter dock', ['components', 'chat', 'FilterDock.tsx']],
    ['project detail panel', ['components', 'ProjectDetailPanel.tsx']],
  ]

  it.each(cases)('%s is a modal dialog with a name', (_label, path) => {
    const file = src(...path)
    expect(file).toMatch(/role="dialog"/)
    expect(file).toMatch(/aria-modal="true"/)
    expect(file).toMatch(/aria-label(ledby)?=/)
  })

  it.each(cases)('%s traps focus', (_label, path) => {
    expect(src(...path)).toMatch(/useDialogA11y/)
  })
})

describe('project detail tabs declare themselves', () => {
  const panel = src('components', 'ProjectDetailPanel.tsx')

  it('is a tablist, not six loose buttons', () => {
    // A screen reader announced "Overview, button" with no hint that it was
    // one of six or which was showing.
    expect(panel).toMatch(/role="tablist"/)
    expect(panel).toMatch(/role="tab"/)
    expect(panel).toMatch(/aria-selected=\{isActive\}/)
  })

  it('points each tab at the panel it controls', () => {
    expect(panel).toMatch(/aria-controls=\{PANEL_ID\}/)
    expect(panel).toMatch(/role="tabpanel"/)
    expect(panel).toMatch(/aria-labelledby=/)
  })

  it('uses a roving tabindex so the set is one tab stop', () => {
    expect(panel).toMatch(/tabIndex=\{isActive \? 0 : -1\}/)
  })

  it('keeps the inline render out of the focus trap', () => {
    // Inline is part of the page, not a dialog. Trapping there would strand
    // the keyboard on /property/[slug].
    expect(panel).toMatch(/const isDialog = !inline/)
  })
})
