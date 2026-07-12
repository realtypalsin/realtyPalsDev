'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

// ── Parse user message client-side for display chips (no AI, instant) ──
interface Chip {
  label: string
  variant: 'blue' | 'indigo' | 'emerald' | 'violet' | 'amber' | 'purple' | 'pink'
}

function parseQuery(q: string): Chip[] {
  const lo = q.toLowerCase()
  const chips: Chip[] = []

  const bhk = lo.match(/(\d)\s*bhk/)
  if (bhk) chips.push({ label: `${bhk[1]} BHK`, variant: 'blue' })

  const sector = lo.match(/sector\s*(\d+)/)
  if (sector) chips.push({ label: `Sector ${sector[1]}`, variant: 'indigo' })

  const crore = lo.match(/(\d+\.?\d*)\s*(?:cr(?:ore)?)\b/)
  if (crore) chips.push({ label: `₹${crore[1]} Cr`, variant: 'emerald' })
  else {
    const lakh = lo.match(/(\d+)\s*(?:lac|lakh)\b/)
    if (lakh) chips.push({ label: `₹${lakh[1]}L`, variant: 'emerald' })
  }

  if (/ready\s*to\s*move|rtm/.test(lo)) chips.push({ label: 'Ready to Move', variant: 'violet' })
  else if (/new\s*launch/.test(lo)) chips.push({ label: 'New Launch', variant: 'purple' })
  else if (/under\s*const/.test(lo)) chips.push({ label: 'Under Construction', variant: 'amber' })

  if (/luxury|premium|ultra/.test(lo)) chips.push({ label: 'Luxury', variant: 'purple' })
  if (/3\s*side\s*open|corner|penthouse/.test(lo)) chips.push({ label: 'Special Unit', variant: 'pink' })

  return chips
}

const CHIP_STYLE: Record<string, string> = {
  blue:    'bg-blue-50   border-blue-100   text-blue-700   dark:bg-blue-900/30   dark:border-blue-800/60   dark:text-blue-300',
  indigo:  'bg-indigo-50 border-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800/60 dark:text-indigo-300',
  emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800/60 dark:text-emerald-300',
  violet:  'bg-violet-50 border-violet-100 text-violet-700 dark:bg-violet-900/30 dark:border-violet-800/60 dark:text-violet-300',
  amber:   'bg-amber-50  border-amber-100  text-amber-700  dark:bg-amber-900/30  dark:border-amber-800/60  dark:text-amber-300',
  purple:  'bg-purple-50 border-purple-100 text-purple-700 dark:bg-purple-900/30 dark:border-purple-800/60 dark:text-purple-300',
  pink:    'bg-pink-50   border-pink-100   text-pink-700   dark:bg-pink-900/30   dark:border-pink-800/60   dark:text-pink-300',
}

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

export default function ChatLoader({ userQuery, isSearching, searchingTool }: Props) {
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
    setActiveStep(1)
    const t = setTimeout(() => setActiveStep(2), 650)
    timersRef.current.push(t)
  }, [isSearching])

  return (
    <div className="flex flex-col gap-3 py-0.5">
      {/* Progress steps */}
      <div className="flex flex-col gap-2.5">
        {steps.map((label, i) => {
          const done   = i < activeStep
          const active = i === activeStep

          return (
            <motion.div
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
                    <motion.div
                      key="check"
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                    >
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    </motion.div>
                  ) : active ? (
                    <motion.div
                      key="spin"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="relative w-5 h-5"
                    >
                      <div className="absolute inset-0 rounded-full border-2 border-blue-100 dark:border-blue-900 border-t-blue-500 dark:border-t-blue-400 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
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
                  <motion.span
                    animate={{ opacity: [1, 0.15, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="ml-0.5"
                  >
                    ...
                  </motion.span>
                )}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
