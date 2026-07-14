'use client'

import { useRef, useEffect, useState } from 'react'
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
          {sorted.map((chip) => (
            <ChipButton key={chip.id} chip={chip} onAction={onAction} />
          ))}
        </div>
      </m.div>
    </AnimatePresence>
  )
}

function ChipButton({ chip, onAction }: { chip: ChipAction; onAction: (chip: ChipAction) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
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
  const baseClass = 'flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[13px] transition-all duration-200 cursor-pointer active:scale-[0.98] whitespace-nowrap select-none'

  const styleClass = 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/80 shadow-sm font-normal'

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        onClick={handleClick}
        className={`${baseClass} ${styleClass} ${isOpen ? 'ring-2 ring-zinc-200 dark:ring-zinc-700 bg-zinc-50 dark:bg-zinc-700/80' : ''}`}
        title={chip.label}
      >
        <span>{chip.label}</span>
        {hasDropdown && <CaretDown weight="bold" className={`w-3 h-3 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />}
      </button>

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
