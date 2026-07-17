'use client'

import { useState } from 'react'
import { m } from 'framer-motion'
import type { ChipAction } from './types'

interface CardSelectorChipProps {
  chip: ChipAction
  projects: Array<{ id: string; name: string }>
  onSelect: (chip: ChipAction, projectId: string) => void
  disabled?: boolean
}

/** Multi-project chip that shows dropdown to select which card to apply action to */
export function CardSelectorChip({ chip, projects, onSelect, disabled }: CardSelectorChipProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (projects.length <= 1) {
    return null // Use regular chip if only 1 project
  }

  const handleProjectSelect = (projectId: string) => {
    setIsOpen(false)
    onSelect(chip, projectId)
  }

  return (
    <div className="relative inline-block">
      <m.button
        whileTap={{ scale: 0.96 }}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-[16px] text-[13px] font-medium
          transition-all duration-200 border outline-none max-w-full
          ${disabled ? 'opacity-50 pointer-events-none' : ''}
          ${
            isOpen
              ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-700 dark:border-blue-600 shadow-[0_4px_12px_rgba(37,99,235,0.25)]'
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 hover:border-blue-400'
          }
        `}
        title={chip.label}
        aria-label={chip.label}
        role="button"
        aria-pressed={isOpen}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {chip.icon && <span className="text-[14px] leading-none flex-shrink-0" aria-hidden="true">{chip.icon}</span>}
        <span className="truncate min-w-0">{chip.label}</span>
        <span className={`text-[10px] ml-0.5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
      </m.button>

      {/* Dropdown menu */}
      {isOpen && (
        <m.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="absolute top-full mt-2 left-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 min-w-max max-w-xs"
          role="listbox"
        >
          <div className="p-1">
            {projects.map((project, idx) => (
              <button
                key={project.id}
                onClick={() => handleProjectSelect(project.id)}
                role="option"
                aria-selected={false}
                className={`
                  w-full text-left px-3 py-2 rounded-md text-sm transition-colors
                  hover:bg-blue-100 dark:hover:bg-blue-900
                  focus:outline-none focus:bg-blue-100 dark:focus:bg-blue-900
                  ${idx > 0 ? 'border-t border-gray-200 dark:border-gray-700' : ''}
                `}
              >
                <span className="font-medium text-gray-900 dark:text-white">{project.name}</span>
              </button>
            ))}
          </div>
        </m.div>
      )}
    </div>
  )
}
