'use client'

import { memo } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { ChevronRight, Edit2 } from 'lucide-react'
import type { Intent } from '@/types/property'

interface IntentConfirmationProps {
  intent: Intent
  onConfirm: () => void
  onEdit: () => void
  isLoading?: boolean
}

const BHK_DISPLAY: Record<number, string> = { 1: '1BHK', 2: '2BHK', 3: '3BHK', 4: '4BHK', 5: '5+ BHK' }

export const IntentConfirmation = memo(function IntentConfirmation({
  intent,
  onConfirm,
  onEdit,
  isLoading = false,
}: IntentConfirmationProps) {
  const details: Array<{ label: string; value: string | null }> = [
    { label: 'Property type', value: intent.bhk ? intent.bhk.map(b => BHK_DISPLAY[b] || `${b}BHK`).join(' / ') : null },
    { label: 'Location', value: intent.sector || intent.location || null },
    { label: 'Budget', value: intent.budgetMin || intent.budgetMax ? `₹${intent.budgetMin || 0}–${intent.budgetMax || '∞'}Cr` : null },
    { label: 'Possession', value: intent.possession === 'immediate' ? 'Ready to move' : intent.possession === 'flexible' ? 'Flexible' : null },
  ].filter(d => d.value)

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3 }}
        className="mx-4 my-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm mb-3">Got it. You're looking for:</h3>
            <div className="space-y-2">
              {details.map(({ label, value }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                  <span className="font-medium text-blue-600 dark:text-blue-400">{label}:</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={onEdit}
              disabled={isLoading}
              className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors disabled:opacity-50"
              title="Edit"
            >
              <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </button>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            Confirm
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={onEdit}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 font-medium text-sm transition-colors disabled:opacity-50"
          >
            Change something
          </button>
        </div>
      </m.div>
    </AnimatePresence>
  )
})

IntentConfirmation.displayName = 'IntentConfirmation'
