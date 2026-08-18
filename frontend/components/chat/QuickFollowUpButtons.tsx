'use client'

import { memo } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { track } from '@/lib/analytics'

interface QuickButton {
  label: string
  emoji: string
  action: string
  description: string
}

interface QuickFollowUpButtonsProps {
  buttons: QuickButton[]
  onButtonClick: (buttonLabel: string) => void
  isLoading?: boolean
}

export const QuickFollowUpButtons = memo(function QuickFollowUpButtons({
  buttons,
  onButtonClick,
  isLoading = false,
}: QuickFollowUpButtonsProps) {
  if (!buttons || buttons.length === 0) return null

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.3 }}
        className="flex flex-wrap gap-2 px-4 py-3 bg-gradient-to-b from-slate-50 to-transparent dark:from-slate-900/50 dark:to-transparent"
      >
        {buttons.map((btn, idx) => (
          <m.button
            key={btn.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => {
              track('quick_button_clicked', { label: btn.label })
              onButtonClick(btn.label)
            }}
            disabled={isLoading}
            title={btn.description}
            className="px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-sm transition-all text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>{btn.emoji}</span>
            <span>{btn.label}</span>
          </m.button>
        ))}
      </m.div>
    </AnimatePresence>
  )
})

QuickFollowUpButtons.displayName = 'QuickFollowUpButtons'
