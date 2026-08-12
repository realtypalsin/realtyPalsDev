'use client'

import { m } from 'framer-motion'
import { ChevronDown, Building2, Wallet, Scale, MapPin, Trees, MessageSquare, ShieldCheck, FileText } from 'lucide-react'
import type { ChipAction, ChipPickerState } from './types'

interface SuggestionChipProps {
  chip: ChipAction
  chipPicker: ChipPickerState | null
  onSetChipPicker: (picker: ChipPickerState | null) => void
  onAction: (chip: ChipAction) => void
  disabled?: boolean
}

/** Render topic-matched contextual icon instead of generic star icons */
function renderChipIcon(chip: ChipAction, isActive: boolean) {
  // Backend might send an emoji in chip.icon, but we want to enforce the premium 
  // Lucide icons defined below for a more cohesive UI.

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

/**
 * Unified SuggestionChip — Ultra-premium glassmorphic pill button.
 * Features subtle translucent surface, topic-aware icons, glow hover borders,
 * and high-end typography matching top-tier AI assistants.
 */
export function SuggestionChip({ chip, chipPicker, onSetChipPicker, onAction, disabled }: SuggestionChipProps) {
  if (!chip.label || !chip.label.trim()) return null
  const cleanLabel = chip.label.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim()
  const isActive = chipPicker?.label === chip.label || chipPicker?.label === cleanLabel
  const hasDropdown = chip.actionType === 'COMPARE_PROPERTIES' || chip.actionType === 'CALCULATE_EMI' || chip.actionType === 'BOOK_VISIT'

  return (
    <m.button
      whileHover={{ y: -1.5, scale: 1.015 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
      key={chip.id}
      onClick={() => {
        if (isActive) {
          onSetChipPicker(null)
          return
        }
        onAction(chip)
      }}
      className={`
        group relative flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold
        transition-all duration-200 outline-none max-w-full select-none cursor-pointer
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
        ${
          isActive
            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border border-zinc-800 dark:border-zinc-200 shadow-sm'
            : 'bg-white/95 dark:bg-zinc-800/90 backdrop-blur-md text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/80 hover:bg-white dark:hover:bg-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-zinc-950 dark:hover:text-white shadow-2xs hover:shadow-xs'
        }
      `}
      title={cleanLabel}
      aria-label={cleanLabel}
      role="button"
      aria-pressed={isActive}
    >
      {renderChipIcon(chip, isActive)}
      <span className="truncate min-w-0 font-medium tracking-tight">{cleanLabel}</span>
      {hasDropdown && (
        <ChevronDown
          size={13}
          className={`flex-shrink-0 transition-transform duration-200 ${
            isActive ? 'text-blue-200 rotate-180' : 'text-zinc-400 dark:text-zinc-500 group-hover:text-blue-500 group-hover:translate-y-[1px]'
          }`}
        />
      )}
    </m.button>
  )
}


