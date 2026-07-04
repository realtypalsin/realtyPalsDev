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
    <div className={`rounded-[28px] border border-gray-100 bg-white shadow-[0_2px_20px_rgba(0,0,0,0.04)] p-7 md:p-8 ${className}`}>
      {title && (
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="text-[20px] font-serif font-bold text-[#111] tracking-tight">{title}</h3>
            {description && <p className="text-[12.5px] text-gray-400 mt-0.5">{description}</p>}
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
