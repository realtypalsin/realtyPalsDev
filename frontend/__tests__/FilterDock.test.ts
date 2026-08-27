import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The dock's panel must escape the rail that clips it.
 *
 * The pills scroll horizontally on narrow screens, and `overflow-x: auto`
 * establishes a clipping context in BOTH axes — the CSS spec resolves the other
 * axis to `auto` rather than leaving it visible. A panel positioned
 * `absolute bottom-full` inside that container is therefore clipped away
 * completely: every pill opened, its aria-expanded flipped, and nothing
 * appeared on screen.
 *
 * Rendering through a portal anchored to the pill's measured rect is what fixes
 * it, and it is the kind of detail that gets "simplified" back to an absolute
 * child by someone who cannot see why it was done. Hence this file.
 */

const SRC = readFileSync(
  join(__dirname, '..', 'components', 'chat', 'FilterDock.tsx'),
  'utf8',
)

describe('filter dock panel', () => {
  it('renders through a portal, not as a child of the scrolling rail', () => {
    expect(SRC).toContain("import { createPortal } from 'react-dom'")
    expect(SRC).toMatch(/createPortal\(/)
    expect(SRC).toMatch(/document\.body/)
  })

  it('does not position the panel relative to the clipping container', () => {
    // absolute + bottom-full inside overflow-x-auto is the exact bug.
    const railHasOverflow = /flex flex-nowrap items-center[^"]*overflow-x-auto/.test(SRC)
    expect(railHasOverflow).toBe(true)
    expect(SRC).not.toMatch(/absolute bottom-full/)
  })

  it('anchors to the pill it was opened from', () => {
    expect(SRC).toMatch(/getBoundingClientRect\(\)/)
    expect(SRC).toMatch(/pillRefs/)
  })

  it('keeps the panel inside the viewport', () => {
    // A pill near the right edge would otherwise open a panel that runs off it.
    expect(SRC).toMatch(/Math\.min\(Math\.max\(/)
    expect(SRC).toMatch(/window\.innerWidth/)
  })

  it('re-anchors when the rail scrolls or the viewport changes', () => {
    // The dock scrolls horizontally and the input moves when the mobile
    // keyboard opens; a panel pinned once would drift away from its pill.
    expect(SRC).toMatch(/addEventListener\('resize', reposition\)/)
    expect(SRC).toMatch(/addEventListener\('scroll', reposition, true\)/)
  })

  it('dismisses on an outside tap, in the capture phase', () => {
    // click and blur both lose to a tap that lands on another interactive
    // element, which made dismissal take two taps.
    expect(SRC).toMatch(/addEventListener\('pointerdown', onDown, true\)/)
    expect(SRC).toMatch(/key === 'Escape'/)
  })

  it('becomes a bottom sheet on a phone', () => {
    // A 224px popover pinned to a pill inside a scrolling rail is a target you
    // fight on a phone.
    expect(SRC).toMatch(/max-width: \$\{MOBILE_BREAKPOINT - 1\}px/)
    expect(SRC).toMatch(/rounded-t-2xl/)
    expect(SRC).toMatch(/env\(safe-area-inset-bottom\)/)
  })

  it('sizes its touch targets for a finger', () => {
    expect(SRC).toMatch(/min-h-\[42px\] sm:min-h-\[36px\]/)
    expect(SRC).toMatch(/min-h-\[32px\]/)
  })
})
