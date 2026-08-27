'use client'

import { useState } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import type { ProjectCard as ProjectCardType } from '@/types/project'

/**
 * Cards first, collapsed, on mobile.
 *
 * On a phone the answer's table pushed every project card below the fold, so
 * the one thing the buyer can act on — save, open, compare — was the hardest
 * thing to reach. They had to scroll past the whole response to find out
 * anything had been found at all.
 *
 * The shelf goes above the response and starts collapsed, but its header
 * carries the summary (how many, what price band) so the collapsed state is
 * still an answer rather than a chevron with nothing behind it. The response
 * below stays expanded: the buyer just asked a question, and hiding the reply
 * behind a second tap reads as broken.
 *
 * Mobile only. Desktop has the width to show cards beside the answer and keeps
 * the existing grid.
 */

function priceBand(projects: ProjectCardType[]): string | null {
  const mins = projects.map(p => p.price_min_cr).filter((n): n is number => typeof n === 'number' && n > 0)
  const maxs = projects.map(p => p.price_max_cr).filter((n): n is number => typeof n === 'number' && n > 0)
  if (mins.length === 0 && maxs.length === 0) return null
  const lo = mins.length ? Math.min(...mins) : Math.min(...maxs)
  const hi = maxs.length ? Math.max(...maxs) : Math.max(...mins)
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, ''))
  return lo === hi ? `₹${fmt(lo)} Cr` : `₹${fmt(lo)}–${fmt(hi)} Cr`
}

export function MobileCardShelf({
  projects,
  children,
}: {
  projects: ProjectCardType[]
  /** The card grid, rendered only once expanded so collapsed costs nothing. */
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  if (projects.length === 0) return null

  const band = priceBand(projects)
  const noun = projects.length === 1 ? 'project' : 'projects'

  return (
    <div className="sm:hidden mb-3 w-full rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left active:bg-zinc-50 dark:active:bg-zinc-800/60 transition-colors"
      >
        <CaretDown
          size={15}
          weight="bold"
          className={`shrink-0 text-zinc-400 transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`}
        />
        <span className="text-[13.5px] font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
          {projects.length} {noun}
        </span>
        {band && (
          <>
            <span className="text-zinc-300 dark:text-zinc-700" aria-hidden>·</span>
            <span className="text-[13px] font-semibold text-zinc-600 dark:text-zinc-400 tabular-nums">{band}</span>
          </>
        )}
        <span className="ml-auto text-[11.5px] font-semibold text-blue-600 dark:text-blue-400">
          {open ? 'Hide' : 'View'}
        </span>
      </button>

      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

export default MobileCardShelf
