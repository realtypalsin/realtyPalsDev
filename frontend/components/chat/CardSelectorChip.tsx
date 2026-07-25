'use client'

import { useState, useRef, useEffect } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { ChevronDown, Building2, Wallet, Scale, MapPin, Trees, MessageSquare, ShieldCheck, FileText } from 'lucide-react'
import type { ChipAction } from './types'

interface CardSelectorChipProps {
  chip: ChipAction
  projects: Array<{ id: string; name: string }>
  onSelect: (chip: ChipAction, projectId: string) => void
  disabled?: boolean
}

/** Render topic-matched contextual icon instead of generic star icons */
function renderChipIcon(chip: ChipAction, isActive: boolean) {
  if (chip.icon) {
    return <span className="text-[14px] leading-none flex-shrink-0" aria-hidden="true">{chip.icon}</span>
  }

  const label = chip.label.toLowerCase()
  const iconClass = `flex-shrink-0 transition-colors ${
    isActive
      ? 'text-blue-200'
      : 'text-blue-500/80 dark:text-blue-400/80 group-hover:text-blue-600 dark:group-hover:text-blue-300'
  }`

  if (/cost|price|budget|emi|payment|crore|lakh|₹|financial|loan/.test(label)) {
    return <Wallet size={13.5} className={iconClass} />
  }
  if (/bhk|project|apartment|house|home|villa|society|building|flat/.test(label)) {
    return <Building2 size={13.5} className={iconClass} />
  }
  if (/compare|vs|difference|tradeoff/.test(label)) {
    return <Scale size={13.5} className={iconClass} />
  }
  if (/amenit|park|pool|gym|clubhouse|garden|green/.test(label)) {
    return <Trees size={13.5} className={iconClass} />
  }
  if (/sector|metro|location|area|distance|near/.test(label)) {
    return <MapPin size={13.5} className={iconClass} />
  }
  if (/builder|developer|rera|legal|risk|track/.test(label)) {
    return <ShieldCheck size={13.5} className={iconClass} />
  }
  if (/plan|document|review/.test(label)) {
    return <FileText size={13.5} className={iconClass} />
  }

  return <MessageSquare size={13.5} className={iconClass} />
}

/** Multi-project chip that shows dropdown to select which card to apply action to */
export function CardSelectorChip({ chip, projects, onSelect, disabled }: CardSelectorChipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!isOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen])

  if (projects.length <= 1) {
    return null // Use regular chip if only 1 project
  }

  const handleProjectSelect = (projectId: string) => {
    setIsOpen(false)
    onSelect(chip, projectId)
  }

  return (
    <div className="relative inline-block group" ref={containerRef}>
      <m.button
        whileHover={{ y: -1.5, scale: 1.015 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 450, damping: 25 }}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium
          transition-all duration-200 outline-none max-w-full select-none cursor-pointer
          ${disabled ? 'opacity-50 pointer-events-none' : ''}
          ${
            isOpen
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border border-blue-500 shadow-[0_4px_16px_rgba(37,99,235,0.35)] dark:shadow-[0_4px_20px_rgba(59,130,246,0.4)]'
              : 'bg-white/90 dark:bg-[#18181b]/90 backdrop-blur-md text-zinc-700 dark:text-zinc-200 border border-zinc-200/90 dark:border-zinc-800/90 hover:bg-white dark:hover:bg-[#222226] hover:border-blue-400/60 dark:hover:border-blue-500/50 hover:text-zinc-950 dark:hover:text-white shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_18px_rgba(59,130,246,0.12)] dark:hover:shadow-[0_4px_20px_rgba(59,130,246,0.22)]'
          }
        `}
        title={chip.label}
        aria-label={chip.label}
        role="button"
        aria-pressed={isOpen}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {renderChipIcon(chip, isOpen)}
        <span className="truncate min-w-0 font-medium tracking-tight">{chip.label}</span>
        <ChevronDown
          size={13}
          className={`flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'text-blue-200 rotate-180' : 'text-zinc-400 dark:text-zinc-500 group-hover:text-blue-500 group-hover:translate-y-[1px]'
          }`}
        />
      </m.button>

      {/* Dropdown menu — floating dark glass container */}
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute bottom-full mb-2 left-0 bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-xl border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl shadow-2xl z-[9999] min-w-[220px] max-w-xs p-1.5 overflow-hidden"
            role="listbox"
          >
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-800/60 mb-1">
              Select Property
            </div>
            <div className="space-y-0.5 max-h-48 overflow-y-auto scrollbar-hide">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleProjectSelect(project.id)}
                  role="option"
                  aria-selected={false}
                  className="w-full text-left px-3 py-2 rounded-xl text-[13px] font-medium text-zinc-700 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 group/item"
                >
                  <Building2 size={13} className="text-zinc-400 group-hover/item:text-blue-500 shrink-0" />
                  <span className="truncate">{project.name}</span>
                </button>
              ))}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

