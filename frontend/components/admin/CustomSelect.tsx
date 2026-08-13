'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  dotColor?: string
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  className = '',
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((o) => o.value === value)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 bg-slate-50/80 dark:bg-zinc-800/80 border text-left rounded-2xl transition-all duration-200 shadow-2xs select-none cursor-pointer text-[14px] font-semibold ${
          isOpen
            ? 'border-blue-500 ring-4 ring-blue-500/10 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100'
            : 'border-slate-200/80 dark:border-zinc-700/80 hover:border-slate-300 dark:hover:border-zinc-600 hover:bg-slate-100/70 dark:hover:bg-zinc-800 text-slate-900 dark:text-zinc-100'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.dotColor && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${selectedOption.dotColor}`} />
          )}
          <span className={selectedOption ? 'text-slate-900 dark:text-zinc-100 font-semibold' : 'text-slate-400 dark:text-zinc-500 font-normal'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 dark:text-zinc-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
          }`}
        />
      </button>

      {/* Custom Floating Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-zinc-800 rounded-2xl shadow-xl shadow-slate-950/10 dark:shadow-black/40 p-1.5 space-y-0.5 max-h-60 overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-150 hide-scrollbar">
          {options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value)
                  setIsOpen(false)
                }}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium transition-colors cursor-pointer select-none ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                    : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-100'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {opt.dotColor && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotColor}`} />
                  )}
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check size={14} className="text-blue-600 dark:text-blue-400 shrink-0 ml-2" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
