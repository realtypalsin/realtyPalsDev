'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import {
  ClockCountdown, CheckCircle, SealCheck,
  Subway, AirplaneTakeoff, Path,
  Leaf, Baby, Heart,
  MapPin, ArrowRight, BookmarkSimple,
  CaretLeft, CaretRight,
  Car, GraduationCap, ShoppingBag, Bank, BookOpen,
  Barbell, Star, Buildings,
} from '@phosphor-icons/react'
import type { ProjectCard as ProjectCardType, AmenitySummary, ConnSummary } from '@/types/project'
import { API_BASE } from '@/lib/env'
import { track } from '@/lib/analytics'
import { authHeaders } from '@/lib/authedFetch'
import { resolveImgUrl } from '@/lib/utils'

interface Props {
  project: ProjectCardType
  userId: string | null
  index?: number
  onDetailOpen?: (project: ProjectCardType) => void
  onToast?: (message: string) => void
}

const tierStyle: Record<string, string> = {
  STRONG_BUY: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  BUY: 'bg-blue-50 text-blue-700 border-blue-100',
  HOLD: 'bg-amber-50 text-amber-700 border-amber-100',
  WATCH: 'bg-orange-50 text-orange-700 border-orange-100',
  AVOID: 'bg-red-50 text-red-700 border-red-100',
}

const AMENITY_ICONS: Record<AmenitySummary['category'], React.ElementType> = {
  sports:    Barbell,
  lifestyle: Star,
  wellness:  Leaf,
  kids:      Baby,
  security:  SealCheck,
  parking:   Car,
}

const CONN_ICONS: Record<ConnSummary['type'], React.ElementType> = {
  metro:      Subway,
  airport:    AirplaneTakeoff,
  road:       Path,
  expressway: Path,
  school:     GraduationCap,
  hospital:   Heart,
  mall:       ShoppingBag,
  landmark:   Bank,
  university: BookOpen,
}

export default function ProjectCard({ project, userId, index = 0, onDetailOpen, onToast }: Props) {
  const [imgIdx, setImgIdx] = useState(0)
  // Tracks individual broken image URLs (stale DB refs, 404s) so ONE bad image
  // in the list doesn't blank the whole card — only shows the placeholder when
  // every candidate has failed.
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedUnits, setExpandedUnits] = useState(false)

  const isRTM = project.status === 'ready_to_move'
  const isNew = project.status === 'new_launch'
  const statusLabel = isRTM ? 'Ready to Move' : isNew ? 'New Launch' : 'Under Construction'
  const StatusIcon = isRTM ? CheckCircle : ClockCountdown

  // Group units for display
  const unitsByBhk = project.unit_types.reduce((acc, u) => {
    if (!acc[u.bhk]) acc[u.bhk] = []
    const area = u.carpet_area_sqft || u.super_area_sqft
    if (area) acc[u.bhk].push(`${area}sqft`)
    return acc
  }, {} as Record<number, string[]>)

  const bhkGroups = Object.entries(unitsByBhk)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([bhk, areas]) => ({
      bhk: Number(bhk),
      areas: [...new Set(areas)].sort((a, b) => parseInt(a) - parseInt(b))
    }))

  const uniqueBhk = bhkGroups.map(g => `${g.bhk}BHK`)

  // Build image list: new uploaded images first. hero_image_url is a legacy
  // column that can go stale once real images are uploaded — only fall back
  // to it when there's nothing else, so a dead legacy path never rides along
  // next to a perfectly good uploaded image and blanks the card on error.
  const uploadedImages = (project.images ?? [])
    .filter((i) => (i.type === 'exterior' || i.type === 'hero'))
    .map((i) => i.url)
  const cardImages = [
    ...uploadedImages,
    ...(uploadedImages.length === 0 && project.hero_image_url ? [project.hero_image_url] : []),
  ].filter(Boolean) as string[]

  const workingImages = cardImages.filter((src) => !failedUrls.has(src))
  const allFailed = cardImages.length > 0 && workingImages.length === 0
  const activeIdx = workingImages.length > 0 ? imgIdx % workingImages.length : 0
  const hasMultiple = workingImages.length > 1

  // Auto-advance carousel only on pointer devices (desktop). Touch devices rely on
  // manual swipe/tap — concurrent intervals on mobile grids cause layout jank.
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

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!userId || saving) return
    setSaving(true)
    const wasSaved = saved
    setSaved(!wasSaved) // optimistic
    try {
      if (wasSaved) {
        const res = await fetch(`${API_BASE}/saved/${project.id}`, {
          method: 'DELETE',
          headers: await authHeaders(),
        })
        if (!res.ok) throw new Error('Delete failed')
        onToast?.('Removed from saved')
      } else {
        const res = await fetch(`${API_BASE}/saved`, {
          method: 'POST',
          headers: await authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ project_id: project.id }),
        })
        if (!res.ok) throw new Error('Save failed')
        track('property_saved', { project_slug: project.slug, project_name: project.name })
        onToast?.('Property saved! ✓')
      }
    } catch (err) {
      console.error('[ProjectCard] save failed:', err)
      setSaved(wasSaved) // revert on error
      onToast?.('Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const intel = project.decisionIntelligence

  return (
    <div
      onClick={() => onDetailOpen?.(project)}
      className="group relative w-full h-full flex flex-col rounded-[24px] overflow-hidden bg-white dark:bg-gray-900 border border-gray-100/80 dark:border-gray-800 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] md:hover:-translate-y-1 transition-all duration-300 cursor-pointer"
    >
      {/* ── Mobile Layout (Image Filled Card) ── */}
      <div className="block md:hidden relative w-full h-[260px] bg-gray-900">
        {/* Background Image */}
        {workingImages.length > 0 && !allFailed ? (
          <Image
            src={resolveImgUrl(workingImages[activeIdx]) || '/placeholder.png'}
            alt={project.name}
            fill
            onError={() => markImageFailed(workingImages[activeIdx])}
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-blue-900/40">
            <Buildings size={48} weight="duotone" className="text-blue-300" />
          </div>
        )}

        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
          {index === 0 && (
            <div className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 rounded-lg bg-white/20 backdrop-blur-md text-white border border-white/30">
              ✦ Top Pick
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all z-10 ${
            saved ? 'bg-red-500/90 text-white' : 'bg-black/30 border border-white/20 text-white'
          }`}
        >
          {saved
            ? <BookmarkSimple size={15} weight="fill" />
            : <BookmarkSimple size={15} weight="regular" />
          }
        </button>

        {/* Bottom Text Info */}
        <div className="absolute bottom-0 left-0 w-full p-4 flex flex-col z-10">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white text-[22px] font-bold leading-tight tracking-tight drop-shadow-sm truncate">
              {project.name}
            </h3>
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isRTM ? 'bg-emerald-400' : isNew ? 'bg-blue-400' : 'bg-amber-400'}`} />
          </div>
          <div className="flex items-center gap-1.5 text-white/80 text-[11px] font-medium mb-1 drop-shadow-sm">
            <MapPin size={11} weight="duotone" />
            <span>{project.builder.name}</span>
            <span className="opacity-50">•</span>
            <span>{project.sector}</span>
            {project.rera_number && (
              <>
                <span className="opacity-50">•</span>
                <span className="flex items-center gap-0.5 font-semibold text-white/90">
                  <CheckCircle size={10} weight="fill" />
                  RERA
                </span>
              </>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-white text-[20px] font-black tracking-tight drop-shadow-md">
              {project.price_range_label}
            </p>
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full text-white text-[11px] font-bold">
              {uniqueBhk.join(' · ')}
            </div>
          </div>

        </div>
      </div>

      {/* ── Desktop Layout ── */}
      <div className="hidden md:flex flex-col flex-1">
        {/* ── Hero image carousel ── */}
        <div className="relative h-[220px] overflow-hidden bg-gray-100 dark:bg-gray-800">
          {workingImages.length > 0 && !allFailed ? (
            <>
              {workingImages.map((src, i) => (
                <Image
                  key={src}
                  src={resolveImgUrl(src) || '/placeholder.png'}
                  alt={project.name}
                  fill
                  priority={index < 4 && i === 0}
                  onError={() => markImageFailed(src)}
                  className={`object-cover transition-all duration-500 ${
                    i === activeIdx ? 'opacity-100 scale-100' : 'opacity-0 scale-105 absolute inset-0'
                  } ${i === activeIdx ? 'group-hover:scale-105' : ''}`}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ))}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <Buildings size={40} weight="duotone" className="text-blue-200" />
            </div>
          )}

          {/* Gradient overlay to fade smoothly into the card body */}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent dark:from-gray-900 dark:via-gray-900/40 pointer-events-none" />

          {/* Carousel controls */}
          {hasMultiple && (
            <>
              <button
                onClick={prevImg}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <CaretLeft size={14} weight="bold" />
              </button>
              <button
                onClick={nextImg}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <CaretRight size={14} weight="bold" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                {workingImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setImgIdx(i) }}
                    className={`rounded-full transition-all ${i === activeIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Rank badge — top pick only */}
          {index === 0 && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm shadow-amber-500/30">
              ✦ Top Pick
            </div>
          )}

          {/* Save button only (removed RERA badge) */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            <button
              onClick={handleSave}
              className={`w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center transition-all ${
                saved ? 'bg-red-500 text-white' : 'bg-black/30 hover:bg-black/50 text-white'
              }`}
              title={saved ? 'Unsave' : 'Save property'}
            >
              {saved
                ? <BookmarkSimple size={15} weight="fill" />
                : <BookmarkSimple size={15} weight="regular" />
              }
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="p-5 flex-1 flex flex-col">
          {/* Name + location */}
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-[17px] font-black text-gray-900 dark:text-white tracking-tight leading-snug truncate">
                {project.name}
              </h3>
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isRTM ? 'bg-emerald-500' : isNew ? 'bg-blue-500' : 'bg-amber-500'}`} />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-gray-400 dark:text-gray-500">
              <MapPin size={10} weight="duotone" />
              <span>{project.builder.name}</span>
              <span>·</span>
              <span>{project.sector}, {project.city}</span>
              {project.rera_number && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-0.5 text-blue-600 font-semibold">
                    <CheckCircle size={10} weight="fill" />
                    RERA
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Price + configs */}
          <div className="mb-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[22px] font-black text-gray-900 dark:text-white tracking-tight leading-none">
                {project.price_range_label}
              </p>

            </div>
            <div className="flex flex-col gap-1.5 mt-2">
              {/* BHK configs with area if available */}
              {(expandedUnits ? bhkGroups : bhkGroups.slice(0, 2)).map((g) => (
                <div key={g.bhk} className="text-[11.5px] text-gray-500 dark:text-gray-400 font-medium leading-none">
                  <strong className="text-gray-700 dark:text-gray-300 mr-1.5">{g.bhk} BHK:</strong>
                  {g.areas.length > 0 ? g.areas.join(', ') : 'Details on request'}
                </div>
              ))}
              
              {bhkGroups.length > 2 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setExpandedUnits(prev => !prev); }}
                  className="self-start text-[10.5px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline"
                >
                  {expandedUnits ? 'View Less ↑' : `+ ${bhkGroups.length - 2} more configurations`}
                </button>
              )}

              {!isRTM && project.possession_label && (
                <div className="mt-1 flex items-center gap-1 text-[10.5px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 px-2 py-1 rounded-full self-start">
                  <ClockCountdown size={10} weight="fill" />
                  {project.possession_label}
                </div>
              )}
            </div>
          </div>

          {/* Action */}
          <div className="pt-3 mt-auto">
            <button
              onClick={() => onDetailOpen?.(project)}
              className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-[12px] font-bold py-2.5 rounded-xl transition-colors"
            >
              View Details
              <ArrowRight size={12} weight="bold" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
