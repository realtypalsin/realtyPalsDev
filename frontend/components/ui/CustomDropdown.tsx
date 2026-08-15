'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { m, AnimatePresence } from 'framer-motion'

export interface DropdownOption {
  value: string
  label: string
  icon?: React.ReactNode
  description?: string
  disabled?: boolean
}

export interface CustomDropdownProps {
  value: string
  onChange: (value: string) => void
  options: (DropdownOption | string)[]
  placeholder?: string
  label?: string
  className?: string
  triggerClassName?: string
  menuClassName?: string
  align?: 'left' | 'right' | 'center'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  disabled?: boolean
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select option',
  label,
  className = '',
  triggerClassName = '',
  menuClassName = '',
  align = 'left',
  size = 'sm',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Normalize options to DropdownOption objects
  const normalizedOptions: DropdownOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  )

  const selectedOption = normalizedOptions.find((opt) => opt.value === value)

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  // Size styling
  const sizeClasses = {
    xs: 'px-2.5 py-1.5 text-[11px] rounded-lg gap-1.5',
    sm: 'px-3 py-2 text-[12px] rounded-xl gap-2',
    md: 'px-4 py-2.5 text-[13px] rounded-xl gap-2.5',
    lg: 'px-5 py-3 text-[14px] rounded-2xl gap-3',
  }[size]

  const alignClasses = {
    left: 'left-0 origin-top-left',
    right: 'right-0 origin-top-right',
    center: 'left-1/2 -translate-x-1/2 origin-top',
  }[align]

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {label && (
        <span className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
          {label}
        </span>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`
          group flex items-center justify-between select-none
          border border-gray-200/90 dark:border-white/10
          bg-white/90 dark:bg-[#14161d]/90
          backdrop-blur-md
          text-gray-800 dark:text-gray-100 font-bold
          shadow-[0_1px_3px_rgba(0,0,0,0.05)]
          hover:bg-gray-50 dark:hover:bg-[#1a1d26]
          hover:border-gray-300 dark:hover:border-white/20
          focus:outline-none focus:ring-2 focus:ring-blue-500/20
          active:scale-[0.98]
          transition-all duration-150
          disabled:opacity-50 disabled:cursor-not-allowed
          ${sizeClasses}
          ${triggerClassName}
        `}
      >
        <span className="truncate flex items-center gap-1.5">
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </span>

        <m.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 ml-1"
        >
          <ChevronDown size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} />
        </m.span>
      </button>

      {/* Dropdown Menu Portal / Floating Layer */}
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            role="listbox"
            className={`
              absolute top-full mt-1.5 z-[100]
              min-w-[140px] max-w-[280px] w-max
              bg-white/95 dark:bg-[#161820]/95
              backdrop-blur-xl
              border border-gray-200/90 dark:border-white/10
              shadow-[0_12px_32px_-4px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.08)]
              dark:shadow-[0_16px_36px_-4px_rgba(0,0,0,0.5)]
              rounded-xl sm:rounded-2xl p-1.5
              max-h-64 overflow-y-auto overscroll-contain
              divide-y divide-gray-100 dark:divide-white/5
              ${alignClasses}
              ${menuClassName}
            `}
          >
            <div className="py-0.5 space-y-0.5">
              {normalizedOptions.map((option) => {
                const isSelected = option.value === value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    onClick={() => {
                      if (!option.disabled) {
                        onChange(option.value)
                        setIsOpen(false)
                      }
                    }}
                    className={`
                      w-full flex items-center justify-between gap-3 text-left
                      px-3 py-2 rounded-lg sm:rounded-xl text-[12px] sm:text-[12.5px]
                      transition-colors duration-150 select-none
                      ${option.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                      ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400 font-bold'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/10 font-medium'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {option.icon && <span className="shrink-0">{option.icon}</span>}
                      <div className="truncate">
                        <span className="block truncate">{option.label}</span>
                        {option.description && (
                          <span className="block text-[10px] text-gray-400 font-normal truncate">
                            {option.description}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check
                        size={14}
                        className="shrink-0 text-blue-600 dark:text-blue-400 stroke-[2.5]"
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
