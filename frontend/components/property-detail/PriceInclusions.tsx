'use client'

import type { ProjectDetail, ProjectCard } from '@/types/project'

/**
 * What the headline price does and does not include.
 *
 * Every card and detail page showed a figure like "₹3.11–5.70 Cr" with no
 * indication of whether it covered preferential-location charges, club
 * membership or taxes — while the database recorded all three per project. On a
 * ₹3 Cr purchase those are lakhs of rupees, and a buyer comparing an
 * all-inclusive quote against a bare one is comparing numbers that are not
 * comparable. Nothing on the page told them that.
 *
 * Renders nothing when we hold none of the three flags: silence is better than
 * a row of "unknown" against a price.
 */

type PriceFlags = Pick<
  ProjectDetail,
  'price_includes_plc' | 'price_includes_club' | 'price_includes_taxes'
>

const ITEMS: Array<{ key: keyof PriceFlags; label: string }> = [
  { key: 'price_includes_plc',   label: 'PLC' },
  { key: 'price_includes_club',  label: 'club membership' },
  { key: 'price_includes_taxes', label: 'taxes' },
]

export function summarisePriceInclusions(project: Partial<PriceFlags>): string | null {
  const known = ITEMS.filter(i => typeof project[i.key] === 'boolean')
  if (known.length === 0) return null

  const included = known.filter(i => project[i.key] === true).map(i => i.label)
  const excluded = known.filter(i => project[i.key] === false).map(i => i.label)

  const parts: string[] = []
  if (included.length) parts.push(`includes ${list(included)}`)
  if (excluded.length) parts.push(`${included.length ? 'excludes' : 'Excludes'} ${list(excluded)}`)
  if (parts.length === 0) return null

  const sentence = parts.join('; ')
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}

function list(items: string[]): string {
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

export default function PriceInclusions({
  project,
  className = '',
}: {
  project: Partial<PriceFlags> & Partial<Pick<ProjectCard, 'name'>>
  className?: string
}) {
  const summary = summarisePriceInclusions(project)
  if (!summary) return null

  return (
    <p
      className={`text-[11.5px] sm:text-xs text-slate-500 dark:text-zinc-400 leading-snug ${className}`}
    >
      {summary}.
    </p>
  )
}
