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
      className="group relative w-full h-full flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-[#0a0a0a] ring-1 ring-inset ring-gray-200/60 dark:ring-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.02)] md:hover:scale-[1.01] transition-all duration-300 ease-out cursor-pointer"
    >
      {/* ── Mobile Layout (Image Filled Card) ── */}
      <div className="block md:hidden relative w-full h-[260px] bg-gray-900">
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
          <div className="w-full h-full flex items-center justify-center bg-[#111]">
            <Buildings size={48} weight="duotone" className="text-gray-700" />
          </div>
        )}

        {/* Gradient Overlay for Text Readability (Solid gradient, no blur) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
          {index === 0 && (
            <div className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md bg-white text-black shadow-sm">
              ★ Top Pick
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all z-10 shadow-sm ${
            saved ? 'bg-red-500 text-white' : 'bg-black/60 border border-white/10 text-white hover:bg-black'
          }`}
        >
          {saved
            ? <BookmarkSimple size={15} weight="fill" />
            : <BookmarkSimple size={15} weight="regular" />
          }
        </button>

        {/* Bottom Text Info */}
        <div className="absolute bottom-0 left-0 w-full p-4 flex flex-col z-10">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-white text-[20px] font-semibold tracking-tight truncate pr-2">
              {project.name}
            </h3>
            <p className="text-white text-[16px] font-bold tracking-tight whitespace-nowrap">
              {project.price_range_label}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-gray-300 text-[11px] font-medium mb-3">
            <span className="truncate">{project.builder.name}</span>
            <span className="opacity-40">•</span>
            <span className="truncate">{project.sector}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 px-2.5 py-1 rounded-md text-white text-[10px] font-medium tracking-wide">
              {uniqueBhk.join(' · ')}
            </div>
            {project.rera_number && (
              <div className="flex items-center gap-1 bg-black/60 border border-white/10 px-2.5 py-1 rounded-md text-white text-[10px] font-medium tracking-wide">
                <CheckCircle size={10} weight="fill" />
                RERA
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Desktop Layout ── */}
      <div className="hidden md:flex flex-col flex-1">
        {/* ── Hero image carousel ── */}
        <div className="relative h-[200px] overflow-hidden bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-white/5">
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
                  }`}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ))}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#fafafa] dark:bg-[#111]">
              <Buildings size={40} weight="duotone" className="text-gray-300 dark:text-gray-700" />
            </div>
          )}

          {/* Carousel controls - Solid, no glassmorphism */}
          {hasMultiple && (
            <>
              <button
                onClick={prevImg}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-full flex items-center justify-center text-gray-900 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <CaretLeft size={14} weight="bold" />
              </button>
              <button
                onClick={nextImg}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-full flex items-center justify-center text-gray-900 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <CaretRight size={14} weight="bold" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10 px-2 py-1 bg-black/40 rounded-full">
                {workingImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setImgIdx(i) }}
                    className={`rounded-full transition-all ${i === activeIdx ? 'w-3 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'}`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Rank badge — Solid high-contrast */}
          {index === 0 && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-1 text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-md bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm">
              ★ Top Pick
            </div>
          )}

          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            <button
              onClick={handleSave}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${
                saved ? 'bg-red-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:scale-105'
              }`}
              title={saved ? 'Unsave' : 'Save property'}
            >
              {saved
                ? <BookmarkSimple size={15} weight="fill" />
                : <BookmarkSimple size={15} weight="bold" />
              }
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="p-4 flex-1 flex flex-col justify-between bg-white dark:bg-[#0a0a0a]">
          <div>
            {/* Header row: Name + Price */}
            <div className="flex justify-between items-start mb-2">
              <div className="min-w-0 pr-3">
                <h3 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 tracking-tight leading-snug truncate">
                  {project.name}
                </h3>
                <div className="flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                  <span className="font-medium truncate">{project.builder.name}</span>
                  <span className="opacity-50">·</span>
                  <span className="truncate">{project.sector}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                  {project.price_range_label}
                </p>
                {project.possession_label && !isRTM && (
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">{project.possession_label}</p>
                )}
              </div>
            </div>

            {/* Badges / Micro-tags */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-gray-50 dark:bg-gray-800/50 ring-1 ring-inset ring-gray-200 dark:ring-gray-700 text-[10px] font-medium text-gray-600 dark:text-gray-300 tracking-wide">
                <div className={`w-1.5 h-1.5 rounded-full ${isRTM ? 'bg-emerald-500' : isNew ? 'bg-blue-500' : 'bg-amber-500'}`} />
                {statusLabel}
              </span>
              {project.rera_number && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-gray-50 dark:bg-gray-800/50 ring-1 ring-inset ring-gray-200 dark:ring-gray-700 text-[10px] font-medium text-gray-600 dark:text-gray-300 tracking-wide">
                  <CheckCircle size={10} weight="fill" />
                  RERA
                </span>
              )}
            </div>
            
            {/* Configurations (Collapsed/Dense Key-Value) */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
               <div className="flex flex-wrap gap-1.5">
                 {(expandedUnits ? bhkGroups : bhkGroups.slice(0, 2)).map(g => (
                   <div key={g.bhk} className="px-2 py-1 rounded-[6px] bg-[#f7f7f7] dark:bg-gray-800/40 text-[11px] text-gray-600 dark:text-gray-400 font-medium">
                     <span className="text-gray-900 dark:text-gray-200 font-semibold">{g.bhk} BHK</span>
                     {g.areas.length > 0 && <span className="ml-1 opacity-70">({g.areas.join(', ')})</span>}
                   </div>
                 ))}
                 {bhkGroups.length > 2 && (
                   <button 
                     onClick={(e) => { e.stopPropagation(); setExpandedUnits(prev => !prev); }}
                     className="px-2 py-1 rounded-[6px] hover:bg-gray-100 dark:hover:bg-gray-800 text-[11px] text-gray-500 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                   >
                     {expandedUnits ? 'Less ↑' : `+${bhkGroups.length - 2} more`}
                   </button>
                 )}
               </div>
            </div>
          </div>
          
          {/* Subtle Hover Action indicator replacing huge button */}
          <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">
            <div className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center shadow-md">
              <ArrowRight size={14} weight="bold" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
