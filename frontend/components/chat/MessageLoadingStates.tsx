'use client'

import { m } from 'framer-motion'

interface MessageLoadingStatesProps {
  phase: 'searching' | 'generating' | null
  resultCount?: number | null
  intentLabel?: string
  sublabel?: string
}

export function MessageLoadingStates({ phase, resultCount, intentLabel, sublabel }: MessageLoadingStatesProps) {
  if (phase === 'searching') {
    return (
      <m.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start gap-3 mb-4"
      >
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-blue-600 dark:text-blue-400 font-medium mb-1">
            {intentLabel || 'Searching for properties…'}
          </p>
          {sublabel && (
            <p className="text-[12px] text-blue-500 dark:text-blue-500/80 truncate">
              {sublabel}
            </p>
          )}
        </div>
      </m.div>
    )
  }

  if (phase === 'generating') {
    return (
      <m.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-2 mb-4"
      >
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-[12px] text-blue-600 dark:text-blue-400 font-medium">
          Analyzing {resultCount != null && resultCount > 0 ? `${resultCount} ${resultCount === 1 ? 'property' : 'properties'}` : 'results'}…
        </span>
      </m.div>
    )
  }

  return null
}
