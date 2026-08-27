'use client'

import { ClockCounterClockwise, SealCheck, Warning } from '@phosphor-icons/react'
import { freshnessLabel, type FreshnessPolicy, type FreshnessLevel } from '@/lib/freshness'

/**
 * When we last checked this, stated plainly.
 *
 * For a product whose whole claim is verification, an undated fact is a weaker
 * claim than a dated one — even when the date is old. Showing "last verified 5
 * months ago" costs less trust than showing nothing and being found out.
 */

const STYLE: Record<FreshnessLevel, { cls: string; Icon: React.ElementType }> = {
  fresh:   { cls: 'text-emerald-700 dark:text-emerald-400', Icon: SealCheck },
  ageing:  { cls: 'text-amber-700 dark:text-amber-400',     Icon: ClockCounterClockwise },
  stale:   { cls: 'text-rose-700 dark:text-rose-400',       Icon: Warning },
  unknown: { cls: 'text-slate-500 dark:text-zinc-400',      Icon: ClockCounterClockwise },
}

export default function FreshnessBadge({
  date,
  policy,
  className = '',
}: {
  date: string | Date | null | undefined
  policy: FreshnessPolicy
  className?: string
}) {
  const { text, level } = freshnessLabel(date, policy)
  const { cls, Icon } = STYLE[level]

  return (
    <p className={`inline-flex items-center gap-1.5 text-[11px] sm:text-[11.5px] font-medium ${cls} ${className}`}>
      <Icon size={12} weight="bold" aria-hidden="true" className="shrink-0" />
      <span>{text}</span>
    </p>
  )
}
