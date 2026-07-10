'use client'

import { motion } from 'framer-motion'
import type { ChipAction, ChipPickerState } from './types'

interface SuggestionChipProps {
  chip: ChipAction
  chipPicker: ChipPickerState | null
  onSetChipPicker: (picker: ChipPickerState | null) => void
  onAction: (chip: ChipAction) => void
  disabled?: boolean
}

/**
 * Unified SuggestionChip — premium NotebookLM-style design.
 * Filled dark surface, 14-18px border radius, fit-content width, vertical layout.
 * All chips use same premium, subtle aesthetic regardless of type.
 */
export function SuggestionChip({ chip, chipPicker, onSetChipPicker, onAction, disabled }: SuggestionChipProps) {
  const isActive = chipPicker?.label === chip.label
  const hasDropdown = chip.actionType === 'COMPARE_PROPERTIES' || chip.actionType === 'CALCULATE_EMI' || chip.actionType === 'BOOK_VISIT'

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      key={chip.id}
      onClick={() => {
        if (isActive) {
          onSetChipPicker(null)
          return
        }
        onAction(chip)
      }}
      className={`
        flex items-center gap-2 px-4 py-2.5 rounded-[16px] text-[13px] font-medium
        transition-all duration-200 border outline-none whitespace-nowrap
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
        ${
          isActive
            ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-700 dark:border-blue-600 shadow-[0_4px_12px_rgba(37,99,235,0.25)]'
            : 'bg-[#2a2a2a] dark:bg-[#1a1a1a] text-gray-200 dark:text-gray-300 border-[#3a3a3a] dark:border-[#2a2a2a] hover:bg-[#363636] dark:hover:bg-[#252525] hover:border-[#464646] dark:hover:border-[#353535] shadow-[0_2px_8px_rgba(0,0,0,0.2)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.5)]'
        }
      `}
      title={chip.label}
    >
      {chip.icon && <span className="text-[14px] leading-none flex-shrink-0">{chip.icon}</span>}
      <span className="flex-shrink-0">{chip.label}</span>
      {hasDropdown && (
        <span className={`text-[10px] ml-0.5 flex-shrink-0 ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>
          ▾
        </span>
      )}
    </motion.button>
  )
}
