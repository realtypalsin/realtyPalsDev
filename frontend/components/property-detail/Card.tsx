'use client'
import type { ReactNode } from 'react'

// Shared card shell for the Overview dashboard — large radius, soft shadow,
// no heavy borders, consistent title treatment. Every Overview section uses
// this so spacing/typography stays uniform without repeating classes.
export function Card({
  title,
  description,
  action,
  children,
  className = '',
}: {
  title?: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[28px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-7 md:p-8 transition-all duration-300 ${className}`}>
      {title && (
        <div className="flex items-start justify-between gap-3 mb-5 border-b border-black/5 dark:border-white/5 pb-4">
          <div>
            <h3 className="text-[18px] font-black font-sans tracking-tight text-gray-900 dark:text-white leading-none">{title}</h3>
            {description && <p className="text-[12.5px] text-gray-400 mt-1">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

// Two-column responsive row — the layout unit every section pairing (1, 2, 4, 5, 7) uses.
export function CardRow({ left, right, leftClassName = '', rightClassName = '' }: {
  left: ReactNode
  right: ReactNode
  leftClassName?: string
  rightClassName?: string
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className={leftClassName}>{left}</div>
      <div className={rightClassName}>{right}</div>
    </div>
  )
}
