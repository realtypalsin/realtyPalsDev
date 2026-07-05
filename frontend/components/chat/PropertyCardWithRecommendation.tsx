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
  Barbell, Star, Buildings, Bed,
} from '@phosphor-icons/react'
import type { ProjectCard as ProjectCardType, AmenitySummary, ConnSummary } from '@/types/project'
import { API_BASE } from '@/lib/env'
import { track } from '@/lib/analytics'
import { authHeaders } from '@/lib/authedFetch'
import { resolveImgUrl } from '@/lib/utils'

interface Props {
  project: ProjectCardType
  userId: string | null
  onDetailOpen?: (project: ProjectCardType) => void
  onToast?: (message: string) => void
  quickActions?: React.ReactNode
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

const tierLabel: Record<string, string> = { STRONG_BUY: 'Strong Buy', BUY: 'Buy', HOLD: 'Hold', WATCH: 'Watch', AVOID: 'Avoid' }
const tierColor: Record<string, string> = {
  STRONG_BUY: 'text-emerald-700 dark:text-emerald-400',
  BUY: 'text-blue-700 dark:text-blue-400',
  HOLD: 'text-amber-700 dark:text-amber-400',
  WATCH: 'text-orange-700 dark:text-orange-400',
  AVOID: 'text-red-700 dark:text-red-400',
}

export default function PropertyCardWithRecommendation({ project, userId, onDetailOpen, onToast, quickActions }: Props) {
  const [imgIdx, setImgIdx] = useState(0)
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedUnits, setExpandedUnits] = useState(false)

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
    setSaved(!wasSaved)
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
      console.error('[PropertyCardWithRecommendation] save failed:', err)
      setSaved(wasSaved)
      onToast?.('Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const intel = project.decisionIntelligence
  const tier = intel?.tier
  const headline = project.matchReason ?? intel?.bottomLine ?? null
  const reasons = (project.matchReasons && project.matchReasons.length > 0)
    ? project.matchReasons.slice(0, 3)
    : (intel?.topStrengths ?? []).slice(0, 3)
  const concerns = (project.concerns ?? []).slice(0, 2)

  return (
    <div
      onClick={() => onDetailOpen?.(project)}
      className="group relative w-full h-full flex flex-col rounded-[32px] overflow-hidden bg-white dark:bg-[#0a0a0a] transition-all duration-400 ease-out cursor-pointer border border-gray-200/80 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1"
    >
      {/* ── Hero image ── */}
      <div className="relative h-[440px] overflow-hidden bg-gray-50 dark:bg-gray-900 flex-shrink-0">
        {workingImages.length > 0 && !allFailed ? (
          <>
            {workingImages.map((src, i) => (
              <Image
                key={src}
                src={resolveImgUrl(src) || '/placeholder.png'}
                alt={project.name}
                fill
                priority={i === 0}
                onError={() => markImageFailed(src)}
                className={`object-cover transition-all duration-500 ${
                  i === activeIdx ? 'opacity-100 scale-100' : 'opacity-0 scale-105 absolute inset-0'
                }`}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ))}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#f5f5f5] dark:bg-[#111]">
            <Buildings size={44} weight="duotone" className="text-gray-300 dark:text-gray-700" />
          </div>
        )}



        {/* Tier badge (top-right) */}
        {tier && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
            <span className={`text-[11px] font-bold tracking-wide ${tierColor[tier] || 'text-gray-700'}`}>
              {tierLabel[tier]}
            </span>
          </div>
        )}

        {/* Carousel controls */}
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

        {/* Save button */}
        <div className="absolute top-5 right-5 flex items-center gap-1.5 z-10">
          <button
            onClick={handleSave}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-sm ${
              saved ? 'bg-red-500 text-white' : 'bg-white text-gray-900 hover:scale-105'
            }`}
            title={saved ? 'Unsave' : 'Save property'}
          >
            {saved
              ? <BookmarkSimple size={18} weight="fill" />
              : <BookmarkSimple size={18} weight="bold" />
            }
          </button>
        </div>

        {/* Status Badge (Ready to Move / New Launch) at Bottom-Left of Image */}
        <div className="absolute bottom-5 left-5 z-10 flex items-center gap-2">
          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium tracking-wide backdrop-blur-md shadow-sm bg-black/60 text-white`}>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${project.status === 'ready_to_move' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {project.status === 'ready_to_move' ? 'Ready to Move' : project.status === 'new_launch' ? 'New Launch' : 'Under Construction'}
          </span>
          {project.possession_label && project.status !== 'ready_to_move' && (
            <span className="px-3 py-1.5 bg-black/60 backdrop-blur-md text-white rounded-full text-[13px] font-medium shadow-sm">
              {project.possession_label}
            </span>
          )}
        </div>
      </div>

      {/* ── Recommendation Section (Hidden for aesthetic match) ── */}
      {/* ── Body ── */}
      <div className="px-6 pt-5 pb-6 flex-1 flex flex-col bg-white dark:bg-[#0a0a0a]">
        {/* Name row + RERA */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="text-[36px] font-extrabold text-[#0a192f] dark:text-gray-100 tracking-tight leading-none truncate" style={{ fontFamily: 'Georgia, serif' }}>
            {project.name}
          </h3>
          {project.rera_number && (
            <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-700 text-[12px] font-bold text-blue-600 dark:text-blue-400 tracking-wide mt-1">
              <SealCheck size={14} weight="fill" className="text-blue-500" />
              RERA
            </span>
          )}
        </div>

        {/* Builder · Sector */}
        <div className="flex items-center gap-2 text-[15px] font-medium text-gray-500 dark:text-gray-400 mb-6">
          <span className="truncate">{project.builder.name}</span>
          <span className="opacity-40">·</span>
          <span className="truncate">{project.sector}</span>
        </div>

        {/* Price — big hero number */}
        <div className="mb-6">
          <span className="text-[14px] text-gray-500 font-medium tracking-wide block mb-1">Price Range</span>
          <p className="text-[38px] font-black text-[#0a192f] dark:text-gray-50 tracking-tight leading-none">
            {project.price_range_label}
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 dark:border-white/5 mb-3" />

        {/* Configurations */}
        <div className="flex flex-col mb-4">
          {(expandedUnits ? bhkGroups : bhkGroups.slice(0, 2)).map((g, idx) => (
            <div key={g.bhk} className="flex flex-col">
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-50">
                    <Bed size={22} weight="regular" />
                  </div>
                  <span className="font-bold text-[#0a192f] dark:text-gray-100 text-[18px] whitespace-nowrap">{g.bhk} BHK</span>
                </div>
                {g.areas.length > 0 && (
                  <span className="text-gray-500 dark:text-gray-400 text-[15px] font-medium truncate text-right">
                    {g.areas.join(', ')}
                  </span>
                )}
              </div>
              {idx < (expandedUnits ? bhkGroups : bhkGroups.slice(0, 2)).length - 1 && (
                <div className="border-t border-gray-100 dark:border-white/5 my-1" />
              )}
            </div>
          ))}
          {bhkGroups.length > 2 && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpandedUnits(prev => !prev) }}
              className="text-[12px] font-semibold text-[#3061F2] dark:text-blue-400 hover:underline text-center mt-2"
            >
              {expandedUnits ? 'Show less ↑' : `+ ${bhkGroups.length - 2} more configurations`}
            </button>
          )}
        </div>

        {/* Quick Actions */}
        {quickActions && (
          <div onClick={(e) => e.stopPropagation()} className="mt-auto z-10 relative">
            {quickActions}
          </div>
        )}

        {/* Clickable Indicator Arrow */}
        <div className="absolute right-4 bottom-4 transition-all duration-300 pointer-events-none opacity-80 group-hover:opacity-100 group-hover:translate-x-1">
          <div className="w-8 h-8 rounded-full bg-gray-900/50 dark:bg-white/50 backdrop-blur-sm group-hover:bg-gray-900 group-hover:dark:bg-white text-white dark:text-gray-900 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300">
            <ArrowRight size={14} weight="bold" />
          </div>
        </div>
      </div>
    </div>
  )
}
