'use client'
import { useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import StatusSteps from '@/components/chat/StatusSteps'

type Variant = 'chat-thinking' | 'skeleton-page' | 'skeleton-list' | 'inline'

interface UniversalLoaderProps {
  variant?: Variant
  label?: string
  sublabel?: string
  rows?: number
  showCards?: boolean
  className?: string
  // chat-thinking only: when provided, shows a collapsible chevron that expands
  // into the real pipeline trace (extracting -> searching -> generating), not
  // just decorative labels — reuses the same streaming state MessageBubble
  // already tracks.
  phase?: 'extracting' | 'searching' | 'generating' | null
  intent?: Record<string, unknown> | null
  resultCount?: number | null
}

function Spinner() {
  return (
    <div className="relative w-5 h-5 flex-shrink-0">
      <div className="absolute inset-0 rounded-full border-2 border-blue-100 dark:border-blue-900 border-t-blue-500 dark:border-t-blue-400 animate-spin" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-[24px] overflow-hidden bg-white dark:bg-gray-800 border border-gray-100/80 dark:border-gray-700/60 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
      <div className="h-[220px] bg-gray-100 dark:bg-gray-700 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full w-3/4 animate-pulse" />
        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full w-1/2 animate-pulse" />
        <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-full w-1/3 animate-pulse" />
        <div className="h-9 bg-gray-100 dark:bg-gray-700 rounded-xl w-full animate-pulse mt-1" />
      </div>
    </div>
  )
}

export default function UniversalLoader({
  variant = 'inline',
  label,
  sublabel,
  rows = 6,
  showCards = false,
  className = '',
  phase,
  intent,
  resultCount,
}: UniversalLoaderProps) {
  const [expanded, setExpanded] = useState(false)

  if (variant === 'chat-thinking') {
    const canExpand = !!phase
    return (
      <div className={`py-2 space-y-3 ${className}`}>
        <div className="flex items-center gap-2.5">
          <Spinner />
          <span className="text-[13px] font-medium text-blue-600 dark:text-blue-400">
            {label ?? 'Thinking'}
            <m.span animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.4, repeat: Infinity }} className="ml-0.5">…</m.span>
          </span>
          {canExpand && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-label={expanded ? 'Hide reasoning steps' : 'Show reasoning steps'}
              className="ml-auto flex items-center justify-center w-6 h-6 rounded-full text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            >
              <ChevronDown size={14} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
        {sublabel && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-3.5 py-2.5 border border-blue-100 dark:border-blue-800/60">
            <p className="text-[13px] text-blue-700 dark:text-blue-300 font-medium leading-snug">{sublabel}</p>
          </div>
        )}
        <AnimatePresence>
          {expanded && canExpand && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 bg-white/60 dark:bg-black/20"
            >
              <StatusSteps phase={phase ?? null} intent={intent} resultCount={resultCount} />
            </m.div>
          )}
        </AnimatePresence>
        {showCards && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
          </div>
        )}
      </div>
    )
  }

  if (variant === 'skeleton-list') {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-gray-200/50 dark:bg-zinc-800/50 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
    )
  }

  if (variant === 'skeleton-page') {
    return (
      <div className={`flex flex-col items-center justify-center gap-6 p-8 ${className}`}>
        <div className="w-14 h-14 rounded-2xl bg-gray-200/60 dark:bg-zinc-800/60 animate-pulse" />
        <div className="space-y-3 w-full max-w-md">
          <div className="h-5 w-3/4 mx-auto rounded-full bg-gray-200/60 dark:bg-zinc-800/60 animate-pulse" />
          <div className="h-4 w-1/2 mx-auto rounded-full bg-gray-200/40 dark:bg-zinc-800/40 animate-pulse" />
        </div>
        {label && <p className="text-sm text-gray-500 dark:text-zinc-400">{label}</p>}
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Spinner />
      {label && <span className="text-[13px] font-medium text-gray-600 dark:text-gray-300">{label}</span>}
    </div>
  )
}
