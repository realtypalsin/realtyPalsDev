'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, m } from 'framer-motion'

export interface AdminInfoTooltipProps {
  title: string
  description: string
  details?: string[]
  whyItMatters?: string
  align?: 'left' | 'right' | 'center'
}

export function AdminInfoTooltip({
  title,
  description,
  details,
  whyItMatters,
  align = 'left',
}: AdminInfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const popoverWidth = 280
      let left = rect.left

      if (align === 'right') {
        left = rect.right - popoverWidth
      } else if (align === 'center') {
        left = rect.left + rect.width / 2 - popoverWidth / 2
      }

      // Ensure inside viewport bounds
      if (left < 16) left = 16
      if (typeof window !== 'undefined' && left + popoverWidth > window.innerWidth - 16) {
        left = window.innerWidth - popoverWidth - 16
      }

      setCoords({
        top: rect.bottom + 6,
        left: left,
      })
    }
  }

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    updateCoords()
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 120)
  }

  const popoverContent = (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
          style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
          className="fixed z-[99999] w-72 p-3.5 rounded-xl bg-zinc-900/95 dark:bg-zinc-950/95 text-zinc-100 border border-zinc-800/90 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-md pointer-events-auto"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Title */}
          <h4 className="text-[12px] font-semibold text-white tracking-tight leading-snug mb-1">
            {title}
          </h4>

          {/* Description */}
          <p className="text-[11px] text-zinc-300 font-normal leading-relaxed">
            {description}
          </p>

          {/* Bullet Details */}
          {details && details.length > 0 && (
            <ul className="mt-2 space-y-1 pt-2 border-t border-zinc-800/80">
              {details.map((item, idx) => (
                <li key={idx} className="text-[10.5px] text-zinc-400 font-normal flex items-start gap-1.5 leading-snug">
                  <span className="text-blue-400 font-bold shrink-0 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Why It Matters */}
          {whyItMatters && (
            <div className="mt-2 pt-2 border-t border-zinc-800/60 text-[10.5px] font-medium text-blue-300/90 leading-snug">
              <span className="text-blue-400 font-semibold">Impact: </span>
              {whyItMatters}
            </div>
          )}
        </m.div>
      )}
    </AnimatePresence>
  )

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex items-center align-middle ml-1.5 cursor-help"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`w-4 h-4 rounded-full inline-flex items-center justify-center text-[10px] font-mono font-medium normal-case transition-all select-none ${
          isOpen
            ? 'bg-blue-600 text-white shadow-xs scale-105'
            : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 border border-zinc-200/60 dark:border-zinc-700/60'
        }`}
        aria-label={`Info: ${title}`}
      >
        i
      </div>

      {mounted ? createPortal(popoverContent, document.body) : null}
    </div>
  )
}

export default AdminInfoTooltip
