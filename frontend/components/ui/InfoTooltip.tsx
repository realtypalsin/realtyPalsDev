'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'

export interface InfoTooltipProps {
  content: string
  title?: string
  className?: string
}

export default function InfoTooltip({ content, title, className = '' }: InfoTooltipProps) {
  const [open, setOpen] = useState(false)

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(!open)}
        className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-0.5 rounded-full focus:outline-none"
        aria-label="Score methodology info"
      >
        <Info size={13} />
      </button>

      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 sm:w-64 bg-gray-900 text-white dark:bg-slate-800 dark:text-slate-100 text-[11px] rounded-xl p-3 shadow-xl z-30 pointer-events-none border border-white/10 space-y-1 animate-in fade-in zoom-in-95 duration-150">
          {title && <p className="font-extrabold text-blue-400 uppercase tracking-widest text-[10px]">{title}</p>}
          <p className="font-medium text-gray-200 leading-snug">{content}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-slate-800" />
        </div>
      )}
    </span>
  )
}
