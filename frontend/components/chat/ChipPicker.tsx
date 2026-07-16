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

  // Sort chips by priority (lower number = higher priority)
  const sorted = [...chips].sort((a, b) => a.priority - b.priority)

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
    <AnimatePresence mode="wait">
      <m.div
        key={sorted.map(c => c.id).join(',')}
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

  // Clean ChatGPT/NotebookLM style pills
  const baseClass = 'flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[13px] transition-colors duration-200 cursor-pointer whitespace-nowrap select-none'

  const styleClass = `
    bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md
    text-zinc-700 dark:text-zinc-200
    border border-zinc-200/70 dark:border-zinc-700/60
    hover:bg-white dark:hover:bg-zinc-800
    hover:border-violet-300 dark:hover:border-violet-700
    hover:text-violet-700 dark:hover:text-violet-300
    hover:shadow-[0_0_0_1px_theme(colors.violet.200)]
    dark:hover:shadow-[0_0_0_1px_theme(colors.violet.800)]
    shadow-sm font-medium
  `.replace(/\n\s+/g, ' ').trim()

  return (
    <div className="relative inline-block" ref={containerRef}>
      <m.button
        whileTap={{ scale: 0.96 }}
        whileHover={{ y: -1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        onClick={handleClick}
        className={`${baseClass} ${styleClass} ${isOpen ? 'ring-2 ring-violet-300 dark:ring-violet-700 bg-white dark:bg-zinc-800' : ''}`}
        title={chip.label}
      >
        <span>{chip.label}</span>
        {hasDropdown && <CaretDown weight="bold" className={`w-3 h-3 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />}
      </m.button>

      <AnimatePresence>
        {isOpen && hasDropdown && (
          <m.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2 min-w-[200px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden z-50 flex flex-col"
          >
            {projects.map((project, idx) => (
              <button
                key={project.id}
                onClick={() => handleSelect(project)}
                className={`text-left px-4 py-2.5 text-[13px] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
                  idx !== projects.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800/50' : ''
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
