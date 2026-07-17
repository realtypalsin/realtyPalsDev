'use client'

import { useState, useEffect, useRef } from 'react'
import {  m, AnimatePresence  } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

const SEARCH_STEPS = [
  'Reading your requirements',
  'Scanning Noida inventory',
  'Shortlisting best matches',
  'Preparing recommendations',
]

const WEB_STEPS = [
  'Searching the web',
  'Reading latest news',
  'Summarising findings',
]

const COMMUTE_STEPS = [
  'Calculating route',
  'Checking traffic conditions',
]

const RERA_STEPS = [
  'Connecting to UP-RERA portal',
  'Verifying registration',
]

const GENERAL_STEPS = [
  'Thinking',
  'Preparing your answer',
]

const TOOL_STEPS: Record<string, string[]> = {
  search_properties: SEARCH_STEPS,
  search_web: WEB_STEPS,
  commute: COMMUTE_STEPS,
  rera: RERA_STEPS,
}

interface Props {
  userQuery: string
  isSearching: boolean
  searchingTool?: 'search_properties' | 'search_web' | 'commute' | 'rera'
}

export default function ChatLoader({ isSearching, searchingTool }: Props) {
  const steps = searchingTool && TOOL_STEPS[searchingTool]
    ? TOOL_STEPS[searchingTool]
    : isSearching
    ? SEARCH_STEPS
    : GENERAL_STEPS

  const [activeStep, setActiveStep] = useState(0)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  // Advance steps on a timer
  useEffect(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    steps.forEach((_, i) => {
      if (i === 0) return
      const t = setTimeout(() => setActiveStep(i), i * 750)
      timersRef.current.push(t)
    })
    return () => timersRef.current.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length])

  // When backend fires 'searching' event, jump to scanning step
  useEffect(() => {
    if (!isSearching) return
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    setActiveStep(1)
    const t = setTimeout(() => setActiveStep(2), 650)
    timersRef.current.push(t)
    return () => clearTimeout(t)
  }, [isSearching])

  return (
    <div className="flex flex-col gap-3 py-0.5">
      {/* Progress steps */}
      <div className="flex flex-col gap-2.5">
        {steps.map((label, i) => {
          const done   = i < activeStep
          const active = i === activeStep

          return (
            <m.div
              key={label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.11, duration: 0.22, ease: 'easeOut' }}
              className="flex items-center gap-2.5"
            >
              {/* State icon */}
              <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {done ? (
                    <m.div
                      key="check"
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                    >
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    </m.div>
                  ) : active ? (
                    <m.div
                      key="spin"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="relative w-5 h-5"
                    >
                      <div className="absolute inset-0 rounded-full border-2 border-blue-100 dark:border-blue-900 border-t-blue-500 dark:border-t-blue-400 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                      </div>
                    </m.div>
                  ) : (
                    <m.div
                      key="idle"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-4 h-4 rounded-full border-2 border-gray-200 dark:border-gray-700"
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Label */}
              <span className={`text-[13px] font-medium transition-colors duration-300 ${
                active
                  ? 'text-gray-900 dark:text-white'
                  : done
                  ? 'text-gray-400 dark:text-gray-500'
                  : 'text-gray-300 dark:text-gray-700'
              }`}>
                {label}
                {active && (
                  <m.span
                    animate={{ opacity: [1, 0.15, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="ml-0.5"
                  >
                    ...
                  </m.span>
                )}
              </span>
            </m.div>
          )
        })}
      </div>
    </div>
  )
}

