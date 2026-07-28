'use client'

import { AnimatePresence, m } from 'framer-motion'
import ProjectCard from '@/components/ProjectCard'
import type { ProjectCard as ProjectCardType } from '@/types/project'

interface PropertyCardsDisplayProps {
  properties: ProjectCardType[]
  carouselIndex: number
  userId: string | null
  sessionId: string
  lastShortlist: ProjectCardType[]
  onDetailOpen?: (project: ProjectCardType | null) => void
  onCallback?: (project: ProjectCardType) => void
  onAction?: (action: any) => void
  onSetCarouselIndex?: (msgIndex: number, imgIndex: number) => void
  onSetSiteVisit?: (project: ProjectCardType) => void
  onOpenCalculator?: () => void
  onOpenShareSheet?: () => void
  onToast?: (msg: string) => void
  messageIndex: number
}

export function PropertyCardsDisplay({
  properties,
  carouselIndex,
  userId,
  sessionId,
  lastShortlist,
  onDetailOpen,
  onCallback,
  onAction,
  onSetCarouselIndex,
  onSetSiteVisit,
  onOpenCalculator,
  onOpenShareSheet,
  onToast,
  messageIndex,
}: PropertyCardsDisplayProps) {
  if (!properties.length) return null

  return (
    <AnimatePresence mode="wait">
      <m.div
        key={`properties-${messageIndex}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3"
      >
        {properties.map((property, pi) => (
          <m.div
            key={property.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: pi * 0.05, duration: 0.2 }}
          >
            <ProjectCard
              project={property}
              userId={userId}
              sessionId={sessionId}
              index={pi}
              onDetailOpen={onDetailOpen}
              onToast={onToast}
              quickActions={
                <div className="flex gap-1 flex-wrap">
                  <button
                    onClick={() => onCallback?.(property)}
                    className="text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                  >
                    Callback
                  </button>
                  <button
                    onClick={() => onAction?.({ id: 'emi', label: 'EMI', actionType: 'CALCULATE_EMI', payload: { projects: [property] } })}
                    className="text-xs px-2 py-1 rounded bg-green-50 dark:bg-green-950/50 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900 transition-colors"
                  >
                    EMI
                  </button>
                  <button
                    onClick={() => onSetSiteVisit?.(property)}
                    className="text-xs px-2 py-1 rounded bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors"
                  >
                    Site Visit
                  </button>
                </div>
              }
            />
          </m.div>
        ))}
      </m.div>
    </AnimatePresence>
  )
}
