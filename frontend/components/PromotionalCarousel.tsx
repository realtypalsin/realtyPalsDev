'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface Promotion {
  id: string
  title: string
  description?: string
  type: 'button' | 'toast_text' | 'news_feature'
  content: string
  link_type?: string
  link_target?: string
  image_url?: string
  icon_url?: string
  starts_at: string
  ends_at: string
}

interface PromotionalCarouselProps {
  promotions: Promotion[]
  sessionId?: string
  userId?: string
  guestToken?: string
  onTrackImpression?: (promotionalId: string) => void
  onTrackClick?: (promotionalId: string) => void
}

export default function PromotionalCarousel({
  promotions,
  sessionId,
  userId,
  guestToken,
  onTrackImpression,
  onTrackClick
}: PromotionalCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const carouselRef = useRef<HTMLDivElement>(null)
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null)

  // Track impression on mount and when index changes
  useEffect(() => {
    if (promotions.length === 0 || dismissed.size === promotions.length) return

    const current = promotions[currentIndex]
    if (current && !dismissed.has(current.id)) {
      onTrackImpression?.(current.id)
    }
  }, [currentIndex, promotions, dismissed, onTrackImpression])

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    if (promotions.length === 0) return

    autoPlayRef.current = setInterval(() => {
      setCurrentIndex(prev => {
        let next = (prev + 1) % promotions.length
        // Skip dismissed items
        while (dismissed.has(promotions[next].id) && dismissed.size < promotions.length) {
          next = (next + 1) % promotions.length
        }
        return next
      })
    }, 5000)

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current)
    }
  }, [promotions, dismissed])

  const handleNext = () => {
    let next = (currentIndex + 1) % promotions.length
    while (dismissed.has(promotions[next].id) && dismissed.size < promotions.length) {
      next = (next + 1) % promotions.length
    }
    setCurrentIndex(next)
  }

  const handlePrev = () => {
    let prev = (currentIndex - 1 + promotions.length) % promotions.length
    while (dismissed.has(promotions[prev].id) && dismissed.size < promotions.length) {
      prev = (prev - 1 + promotions.length) % promotions.length
    }
    setCurrentIndex(prev)
  }

  const handleDismiss = (id: string) => {
    setDismissed(new Set([...dismissed, id]))
    handleNext()
  }

  const handlePromotionalClick = (promotional: Promotion) => {
    onTrackClick?.(promotional.id)

    if (promotional.link_type === 'project' && promotional.link_target) {
      // Navigate to project
      window.location.href = `/property/${promotional.link_target}`
    } else if (promotional.link_type === 'builder' && promotional.link_target) {
      // Navigate to builder
      window.location.href = `/builder/${promotional.link_target}`
    } else if (promotional.link_type === 'external_url' && promotional.link_target) {
      // Open external link
      window.open(promotional.link_target, '_blank')
    }
  }

  if (promotions.length === 0 || dismissed.size === promotions.length) {
    return null
  }

  const current = promotions[currentIndex]

  return (
    <div className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 border-b border-blue-100 dark:border-slate-700">
      <div ref={carouselRef} className="max-w-7xl mx-auto px-4 py-4">
        {current.type === 'button' && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">{current.title}</h3>
              {current.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{current.description}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handlePromotionalClick(current)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
              >
                {current.content}
              </button>

              <button
                onClick={() => handleDismiss(current.id)}
                className="p-2 hover:bg-white/50 dark:hover:bg-slate-700 rounded-lg transition"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {current.type === 'toast_text' && (
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-gray-900 dark:text-white animate-marquee whitespace-nowrap">
                {current.content}
              </p>
            </div>

            <button
              onClick={() => handleDismiss(current.id)}
              className="p-1 hover:bg-white/50 dark:hover:bg-slate-700 rounded transition flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {current.type === 'news_feature' && (
          <div className="flex gap-4 items-start">
            {current.image_url && (
              <div className="relative w-32 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                <Image
                  src={current.image_url}
                  alt={current.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{current.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{current.description}</p>
              </div>

              <button
                onClick={() => handlePromotionalClick(current)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-2 self-start"
              >
                Learn more →
              </button>
            </div>

            <button
              onClick={() => handleDismiss(current.id)}
              className="p-1 hover:bg-white/50 dark:hover:bg-slate-700 rounded transition flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {promotions.length > 1 && dismissed.size < promotions.length && (
          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-2">
              {promotions.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2 h-2 rounded-full transition ${
                    idx === currentIndex ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'
                  }`}
                  aria-label={`Go to promotion ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handlePrev}
                className="p-2 hover:bg-white/50 dark:hover:bg-slate-700 rounded-lg transition"
                aria-label="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                className="p-2 hover:bg-white/50 dark:hover:bg-slate-700 rounded-lg transition"
                aria-label="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 15s linear infinite;
        }
      `}</style>
    </div>
  )
}
