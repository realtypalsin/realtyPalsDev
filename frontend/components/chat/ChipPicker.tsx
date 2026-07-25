'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { CaretDown } from '@phosphor-icons/react'
import type { ChipAction } from './types'

interface ChipPickerProps {
  chips: ChipAction[]
  onAction: (chip: ChipAction) => void
  className?: string
  /** If true, show as an inline horizontal scroll row; default is horizontal scroll */
  variant?: 'inline' | 'wrap'
}

/**
 * ChipPicker — Renders contextual conversation suggestion chips.
 */
export default function ChipPicker({ chips, onAction, className = '', variant = 'inline' }: ChipPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Dedupe by id (first wins), then sort by priority with NaN safety
  const deduped = useMemo(() => {
    const seen = new Set<string>()
    const out: ChipAction[] = []
    for (const c of chips) {
      if (!c || !c.id || seen.has(c.id)) continue
      seen.add(c.id)
      out.push(c)
    }
    return out
  }, [chips])
  const sorted = useMemo(
    () => [...deduped].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999)),
    [deduped]
  )

  const grouped = useMemo(() => {
    const map = new Map<string, ChipAction[]>()
    for (const chip of sorted) {
      const key = chip.group?.label ?? '__default__'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(chip)
    }
    return map
  }, [sorted])

  if (!sorted.length) return null

  return (
    <AnimatePresence mode="popLayout">
      <m.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={`w-full ${className}`}
      >
        <div
          ref={scrollRef}
          className={
            variant === 'wrap'
              ? 'flex flex-wrap gap-2'
              : 'flex gap-2 overflow-x-auto scrollbar-hide pb-0.5'
          }
          style={variant === 'inline' ? { WebkitOverflowScrolling: 'touch' } : undefined}
        >
          {variant === 'wrap' ? (
            sorted.map((chip) => <ChipButton key={chip.id} chip={chip} onAction={onAction} />)
          ) : (
            <div className="flex flex-col gap-3 pb-1">
              {[...grouped.entries()].map(([label, groupChips]) => (
                <div key={label} className="flex flex-col gap-1.5">
                  {label !== '__default__' && (
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 px-1">{label}</span>
                  )}
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {groupChips.map(chip => <ChipButton key={chip.id} chip={chip} onAction={onAction} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </m.div>
    </AnimatePresence>
  )
}

function ChipButton({ chip, onAction }: { chip: ChipAction; onAction: (chip: ChipAction) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastClickRef = useRef<number>(0)

  const projects = chip.payload?.projects as { id: string; name: string }[] | undefined
  const hasDropdown = projects && projects.length > 1

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Guard AFTER hooks — rules-of-hooks: hooks must run in the same order every render.
  if (!chip.label || !chip.label.trim()) return null

  const handleClick = () => {
    // Debounce: ignore clicks within 500ms of the last one
    const now = Date.now()
    if (now - lastClickRef.current < 500) return
    lastClickRef.current = now

    if (hasDropdown) {
      setIsOpen(!isOpen)
    } else if (projects && projects.length === 1) {
      const prefix = chip.payload?.actionPrefix ? `${chip.payload.actionPrefix} ` : ''
      const suffix = chip.payload?.actionSuffix ? ` ${chip.payload.actionSuffix}` : ''
      onAction({
        ...chip,
        payload: {
          ...chip.payload,
          text: `${prefix}${projects[0].name}${suffix}`.trim()
        }
      })
    } else {
      onAction({
        ...chip,
        payload: {
          ...chip.payload,
          text: chip.payload?.text || chip.label
        }
      })
    }
  }

  const handleSelect = (project: { id: string; name: string }) => {
    const now = Date.now()
    if (now - lastClickRef.current < 500) return
    lastClickRef.current = now
    setIsOpen(false)
    const prefix = chip.payload?.actionPrefix ? `${chip.payload.actionPrefix} ` : ''
    const suffix = chip.payload?.actionSuffix ? ` ${chip.payload.actionSuffix}` : ''
    onAction({
      ...chip,
      payload: {
        ...chip.payload,
        text: `${prefix}${project.name}${suffix}`.trim()
      }
    })
  }

  // Ultra-premium glass pill style
  const baseClass = 'flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium transition-all duration-200 cursor-pointer select-none max-w-[280px] outline-none'

  const styleClass = `
    bg-white/90 dark:bg-[#18181b]/90 backdrop-blur-md
    text-zinc-700 dark:text-zinc-200
    border border-zinc-200/90 dark:border-zinc-800/90
    hover:bg-white dark:hover:bg-[#222226]
    hover:border-blue-400/60 dark:hover:border-blue-500/50
    hover:text-zinc-950 dark:hover:text-white
    shadow-[0_2px_8px_rgba(0,0,0,0.03)]
    hover:shadow-[0_4px_18px_rgba(59,130,246,0.12)]
    dark:hover:shadow-[0_4px_20px_rgba(59,130,246,0.22)]
  `.replace(/\n\s+/g, ' ').trim()

  return (
    <div className="relative inline-block" ref={containerRef}>
      <m.button
        whileHover={{ y: -1.5, scale: 1.015 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 450, damping: 25 }}
        onClick={handleClick}
        className={`${baseClass} ${styleClass} ${isOpen ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 shadow-[0_4px_16px_rgba(37,99,235,0.35)]' : ''}`}
        title={chip.label}
      >
        <span className="truncate min-w-0 tracking-tight font-medium">{chip.label}</span>
        {hasDropdown && <CaretDown weight="bold" className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'text-blue-200 rotate-180' : 'text-zinc-400 dark:text-zinc-500 group-hover:text-blue-500'}`} />}
      </m.button>

      <AnimatePresence>
        {isOpen && hasDropdown && (
          <m.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute bottom-full left-0 mb-2 min-w-[200px] max-w-xs bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-xl border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col p-1.5"
          >
            {projects.map((project, idx) => (
              <button
                key={project.id}
                onClick={() => handleSelect(project)}
                className={`text-left px-3.5 py-2 rounded-xl text-[13px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${
                  idx !== projects.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800/60' : ''
                }`}
              >
                {project.name}
              </button>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

