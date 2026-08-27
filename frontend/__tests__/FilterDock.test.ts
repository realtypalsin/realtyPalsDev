import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The dock's panel must escape every container that clips it, and the pills
 * must never hide behind a scroll gesture.
 *
 * Two defects, one file. The pills used to sit in an `overflow-x: auto` rail,
 * which (a) hid budget and possession off the right edge on a phone with no
 * affordance that they existed, and (b) establishes a clipping context in BOTH
 * axes — the CSS spec resolves the other axis to `auto` rather than leaving it
 * visible — so a panel positioned `absolute bottom-full` inside it was clipped
 * away completely: every pill opened, aria-expanded flipped, nothing appeared.
 *
 * The pills now wrap. The panel still goes through a portal anchored to the
 * pill's measured rect, because the input dock above it is rounded and
 * backdrop-blurred and clips just as well. Both are the kind of detail that
 * gets "simplified" back by someone who cannot see why it was done.
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

  it('does not position the panel relative to a clipping container', () => {
    // absolute + bottom-full inside a clipped ancestor is the exact bug.
    expect(SRC).not.toMatch(/absolute bottom-full/)
  })

  it('wraps the pills instead of scrolling them', () => {
    // A horizontal rail put budget and possession off-screen on a phone,
    // reachable only by a swipe nothing advertised.
    expect(SRC).toMatch(/flex flex-wrap items-center/)
    expect(SRC).not.toMatch(/overflow-x-auto/)
    expect(SRC).not.toMatch(/flex-nowrap/)
  })

  it('names the field and the new value in the label it dispatches', () => {
    // "[User selected UI option: updated search]" told the model nothing, so
    // changing the sector came back as an answer about the old one.
    expect(SRC).toMatch(/onPatch\(patch, label\)/)
    expect(SRC).toMatch(/Change \$\{spec\.title\.toLowerCase\(\)\} to \$\{v\}/)
    expect(SRC).toMatch(/Change \$\{spec\.title\.toLowerCase\(\)\} to \$\{choice\.label\}/)
  })

  it('clears a multi-field pill in one dispatch', () => {
    // Budget clears budgetMin and budgetMax; two dispatches meant the second
    // lost to the submit lock.
    expect(SRC).toMatch(/onRemove\(p\.clears, /)
    expect(SRC).not.toMatch(/clears\.forEach\(onRemove\)/)
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
