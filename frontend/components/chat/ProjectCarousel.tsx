'use client'

import { useState, useEffect } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import { resolveImgUrl } from '@/lib/utils'

interface ProjectCarouselProps {
  images: string[]
  projectName: string
  onImageChange?: (index: number) => void
  onImageError?: (index: number) => void
  activeIndex: number
}

export function ProjectCarousel({
  images,
  projectName,
  onImageChange,
  onImageError,
  activeIndex,
}: ProjectCarouselProps) {
  const [isAutoplay, setIsAutoplay] = useState(true)
  const validImages = images.filter(Boolean)
  const hasMultiple = validImages.length > 1

  // Auto-advance every 5s. Declared before the early return below so the hook
  // order stays identical on every render.
  useEffect(() => {
    if (!isAutoplay || !hasMultiple) return
    const timer = setInterval(() => {
      const nextIndex = (activeIndex + 1) % validImages.length
      onImageChange?.(nextIndex)
    }, 5000)
    return () => clearInterval(timer)
  }, [isAutoplay, activeIndex, validImages.length, hasMultiple, onImageChange])

  if (!validImages.length) {
    return (
      <div className="w-full h-64 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No images available</p>
        </div>
      </div>
    )
  }

  const currentImage = validImages[activeIndex % validImages.length]

  const handleNext = () => {
    setIsAutoplay(false)
    const nextIndex = (activeIndex + 1) % validImages.length
    onImageChange?.(nextIndex)
  }

  const handlePrev = () => {
    setIsAutoplay(false)
    const prevIndex = (activeIndex - 1 + validImages.length) % validImages.length
    onImageChange?.(prevIndex)
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
      <AnimatePresence mode="wait">
        <m.div
          key={activeIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="relative w-full aspect-video"
        >
          <Image
            src={resolveImgUrl(currentImage)}
            alt={`${projectName} image ${activeIndex + 1}`}
            fill
            className="object-cover"
            onError={() => onImageError?.(activeIndex)}
            priority={activeIndex === 0}
          />
        </m.div>
      </AnimatePresence>

      {hasMultiple && (
        <>
          <button
            onClick={handlePrev}
            className="tap-target absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleNext}
            className="tap-target absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
            aria-label="Next image"
          >
            <ChevronRight size={16} />
          </button>

          {/* Indicator dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
            {validImages.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setIsAutoplay(false)
                  onImageChange?.(i)
                }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === activeIndex
                    ? 'bg-white w-3'
                    : 'bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Image ${i + 1}`}
              />
            ))}
          </div>

          {/* Counter */}
          <div className="absolute top-3 right-3 z-10 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
            {activeIndex + 1} / {validImages.length}
          </div>
        </>
      )}
    </div>
  )
}
