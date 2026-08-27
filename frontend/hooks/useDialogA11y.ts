'use client'

import { useEffect, useRef } from 'react'

/**
 * The three things every dialog owes a keyboard.
 *
 * We had overlays that a mouse could open and a keyboard could not leave. Tab
 * walked straight out of the compare sheet and into the chat behind it, still
 * invisible under the backdrop, so the focus ring vanished and the buyer was
 * typing into a form they could not see. Escape did nothing. Closing dropped
 * focus onto <body>, which sends a screen reader back to the top of the page
 * and loses the buyer's place in the conversation.
 *
 *   trap     Tab and Shift+Tab cycle inside the dialog
 *   escape   Escape closes it
 *   restore  focus returns to whatever opened it
 *
 * Attach the returned ref to the dialog element, and pair it with
 * `role="dialog" aria-modal="true"` plus an `aria-label`.
 *
 * ponytail: focus is trapped, not `inert`. Marking the rest of the page inert
 * is the more complete answer and needs a polyfill for Safari — worth doing
 * when a dialog ships something a screen reader can still reach behind it.
 */
export function useDialogA11y<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  onClose: () => void,
) {
  const ref = useRef<T>(null)
  const restoreTo = useRef<HTMLElement | null>(null)

  // Remember who opened it, before focus moves inside.
  useEffect(() => {
    if (!open) return
    restoreTo.current = document.activeElement as HTMLElement | null
    return () => {
      // Only take focus back if it is still inside the dialog we are closing;
      // if something else has claimed it since, stealing it is the bug.
      const active = document.activeElement
      const stillInside = !active || active === document.body || ref.current?.contains(active)
      if (stillInside && restoreTo.current?.isConnected) restoreTo.current.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const node = ref.current
    if (!node) return

    const focusable = (): HTMLElement[] =>
      Array.from(
        node.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(el => el.offsetParent !== null || el === document.activeElement)

    // Move focus in. The dialog itself when it holds nothing focusable yet —
    // a panel still loading must not leave focus behind on the page.
    const first = focusable()[0]
    if (first) {
      first.focus()
    } else {
      node.setAttribute('tabindex', '-1')
      node.focus()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const items = focusable()
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      const active = document.activeElement

      // Wrap at both ends, and pull focus back if it has already escaped.
      if (e.shiftKey && (active === firstItem || !node.contains(active))) {
        e.preventDefault()
        lastItem.focus()
      } else if (!e.shiftKey && (active === lastItem || !node.contains(active))) {
        e.preventDefault()
        firstItem.focus()
      }
    }

    node.addEventListener('keydown', onKeyDown)
    return () => node.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return ref
}
