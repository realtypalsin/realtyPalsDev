'use client'

import { m } from 'framer-motion'
import { CaretDown, ArrowsLeftRight, CurrencyInr, ShieldCheck, MapPin, Sliders } from '@phosphor-icons/react'
import { renderChipIcon, stripEmojis } from '@/lib/chipIconUtils'
import type { ChipAction, ChipPickerState, ChipTone } from './types'

interface SuggestionChipProps {
  chip: ChipAction
  chipPicker: ChipPickerState | null
  onSetChipPicker: (picker: ChipPickerState | null) => void
  onAction: (chip: ChipAction) => void
  disabled?: boolean
}

/**
 * A suggested next step.
 *
 * Chips used to render as a row of identical grey pills, which made three
 * genuinely different offers — compare these two, what does it cost, is it
 * legally clean — look like one repeated button. The backend now tags each with
 * the kind of question it asks, and the kind is what the colour and the icon
 * carry. A chip with no tone renders in the neutral style, which is every chip
 * built outside the adaptive set.
 */
const TONE: Record<ChipTone, { idle: string; hover: string; icon: typeof CaretDown }> = {
  compare: {
    idle: 'border-violet-200/80 bg-violet-50/80 text-violet-900 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-200',
    hover: 'hover:border-violet-400 hover:bg-violet-100/90 dark:hover:bg-violet-400/20',
    icon: ArrowsLeftRight,
  },
  money: {
    idle: 'border-emerald-200/80 bg-emerald-50/80 text-emerald-900 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200',
    hover: 'hover:border-emerald-400 hover:bg-emerald-100/90 dark:hover:bg-emerald-400/20',
    icon: CurrencyInr,
  },
  trust: {
    idle: 'border-amber-200/80 bg-amber-50/80 text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200',
    hover: 'hover:border-amber-400 hover:bg-amber-100/90 dark:hover:bg-amber-400/20',
    icon: ShieldCheck,
  },
  place: {
    idle: 'border-sky-200/80 bg-sky-50/80 text-sky-900 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-200',
    hover: 'hover:border-sky-400 hover:bg-sky-100/90 dark:hover:bg-sky-400/20',
    icon: MapPin,
  },
  ask: {
    idle: 'border-zinc-200/90 bg-white/95 text-zinc-800 dark:border-zinc-700/80 dark:bg-zinc-800/90 dark:text-zinc-200',
    hover: 'hover:border-zinc-400 hover:bg-white dark:hover:border-zinc-500 dark:hover:bg-zinc-700',
    icon: Sliders,
  },
}

const NEUTRAL =
  'border-zinc-200/90 bg-white/95 text-zinc-800 hover:border-zinc-400 hover:bg-white hover:text-zinc-950 ' +
  'dark:border-zinc-700/80 dark:bg-zinc-800/90 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-white'

export function SuggestionChip({ chip, chipPicker, onSetChipPicker, onAction, disabled }: SuggestionChipProps) {
  if (!chip.label || !chip.label.trim()) return null
  const cleanLabel = stripEmojis(chip.label)
  const isActive = chipPicker?.label === chip.label || chipPicker?.label === cleanLabel
  const hasDropdown = chip.actionType === 'COMPARE_PROPERTIES' || chip.actionType === 'CALCULATE_EMI' || chip.actionType === 'BOOK_VISIT'
  const tone = chip.tone ? TONE[chip.tone] : null
  const ToneIcon = tone?.icon

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
        group relative inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-full text-[11.5px] sm:text-xs font-semibold
        border backdrop-blur-md shadow-2xs transition-all duration-200 outline-none max-w-full select-none cursor-pointer shrink-0
        focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-500
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
        ${
          isActive
            ? 'bg-zinc-900 text-white border-zinc-800 dark:bg-white dark:text-zinc-900 dark:border-zinc-200 shadow-xs'
            : tone
              ? `${tone.idle} ${tone.hover} hover:shadow-xs active:scale-95`
              : `${NEUTRAL} hover:shadow-xs active:scale-95`
        }
      `}
      title={cleanLabel}
      aria-label={cleanLabel}
      role="button"
      aria-pressed={isActive}
    >
      {ToneIcon
        ? <ToneIcon size={13} weight="bold" className="flex-shrink-0 opacity-80" />
        : renderChipIcon(cleanLabel, isActive)}
      <span className="truncate min-w-0 font-medium tracking-tight">{cleanLabel}</span>
      {hasDropdown && (
        <CaretDown
          size={13}
          weight="bold"
          className={`flex-shrink-0 transition-transform duration-200 ${
            isActive ? 'rotate-180' : 'opacity-50 group-hover:opacity-90'
          }`}
        />
      )}
    </m.button>
  )
}
