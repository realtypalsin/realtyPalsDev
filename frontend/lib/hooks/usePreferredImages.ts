import { useState, useCallback, useEffect } from 'react'
import type { ProjectCard } from '@/types/project'

interface UsePreferredImagesReturn {
  activeUrl: string | null
  workingImages: string[]
  allFailed: boolean
  hasMultiple: boolean
  imgIdx: number
  markImageFailed: (src: string) => void
  prevImg: (e: React.MouseEvent) => void
  nextImg: (e: React.MouseEvent) => void
  setImgIdx: (idx: number) => void
}

/**
 * Hook for managing project images with preference (hero/exterior) + fallback to hero_image_url
 * Tracks failed URLs and provides image rotation (next/prev).
 * If detailImages provided, uses those first, otherwise falls back to project.images.
 */
export function usePreferredImages(project: ProjectCard | null, detailImages?: any[]): UsePreferredImagesReturn {
  const [imgIdx, setImgIdx] = useState(0)
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())

  // Use detail images if provided, else fall back to project images
  const imageSource = detailImages ?? project?.images ?? []

  // Extract hero + exterior images, sorted by preference
  const imageTypeRank = (type: string) => {
    const t = type.toLowerCase()
    return t === 'hero' ? 0 : t === 'exterior' ? 1 : 2
  }
  const sortedImages = [...imageSource].sort((a: any, b: any) => imageTypeRank(a.type) - imageTypeRank(b.type))

  const heroImages = sortedImages
    .filter((i: any) => i.type.toLowerCase() === 'hero')
    .map((i: any) => i.url)

  const exteriorImages = sortedImages
    .filter((i: any) => i.type.toLowerCase() === 'exterior')
    .map((i: any) => i.url)

  // Combine uploaded images; fallback to legacy hero_image_url if empty
  const uploadedImages = [...heroImages, ...exteriorImages]
  const cardImages = [
    ...uploadedImages,
    ...(uploadedImages.length === 0 && project?.hero_image_url ? [project.hero_image_url] : []),
  ].filter(Boolean) as string[]

  // Filter out failed images
  const workingImages = cardImages.filter((src) => !failedUrls.has(src))
  const allFailed = cardImages.length > 0 && workingImages.length === 0
  const activeIdx = workingImages.length > 0 ? imgIdx % workingImages.length : 0
  const hasMultiple = workingImages.length > 1

  // Auto-rotate on hover (desktop only)
  useEffect(() => {
    if (!hasMultiple) return
    if (typeof window !== 'undefined' && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const timer = setInterval(() => setImgIdx((i) => (i + 1) % workingImages.length), 3500)
    return () => clearInterval(timer)
  }, [hasMultiple, workingImages.length])

  const prevImg = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setImgIdx((i) => (i - 1 + workingImages.length) % workingImages.length)
  }, [workingImages.length])

  const nextImg = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setImgIdx((i) => (i + 1) % workingImages.length)
  }, [workingImages.length])

  const markImageFailed = useCallback((src: string) => {
    setFailedUrls((prev) => (prev.has(src) ? prev : new Set(prev).add(src)))
  }, [])

  return {
    activeUrl: workingImages[activeIdx] ?? null,
    workingImages,
    allFailed,
    hasMultiple,
    imgIdx: activeIdx,
    markImageFailed,
    prevImg,
    nextImg,
    setImgIdx,
  }
}
