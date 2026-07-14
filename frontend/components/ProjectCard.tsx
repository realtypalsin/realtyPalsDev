'use client'

import { useState, useCallback } from 'react'

import Image from 'next/image'
import {
  ClockCountdown, CheckCircle, ShieldCheck, SealCheck,
  Subway, AirplaneTakeoff, Path,
  Leaf, Baby, Heart,
  MapPin, ArrowRight, BookmarkSimple,
  CaretLeft, CaretRight,
  Car, GraduationCap, ShoppingBag, Bank, BookOpen,
  Barbell, Star, Buildings, Bed, Phone, ShareNetwork, Sparkle,
} from '@phosphor-icons/react'
import type { ProjectCard as ProjectCardType, AmenitySummary, ConnSummary } from '@/types/project'
import { API_BASE } from '@/lib/env'
import { track, trackPropertyEvent } from '@/lib/analytics'
import { authHeaders } from '@/lib/authedFetch'
import { resolveImgUrl } from '@/lib/utils'
import { usePreferredImages } from '@/lib/hooks'


interface Props {
  project: ProjectCardType
  userId: string | null
  index?: number
  onDetailOpen?: (project: ProjectCardType) => void
  onToast?: (message: string) => void
  onAskAI?: (project: ProjectCardType) => void
  onSetSiteVisit?: (project: ProjectCardType) => void
  onCall?: (project: ProjectCardType) => void
  onShare?: (project: ProjectCardType) => void
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

export default function ProjectCard({ project, userId, index = 0, onDetailOpen, onToast, onAskAI, onSetSiteVisit, onCall, onShare, quickActions }: Props) {
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedUnits, setExpandedUnits] = useState(false)
  const { activeUrl, workingImages, allFailed, hasMultiple, imgIdx, markImageFailed, prevImg, nextImg } = usePreferredImages(project)

  const isTopPick = index === 0
  const isRTM = project.status === 'ready_to_move'
  const isNew = project.status === 'new_launch'
  const statusLabel = isRTM ? 'Ready to Move' : isNew ? 'New Launch' : 'Under Construction'

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
        trackPropertyEvent(project.id, 'save', undefined, userId).catch(() => {})

        onToast?.('Property saved! ✓')
      }
    } catch (err) {
      console.error('[ProjectCard] save failed:', err)
      setSaved(wasSaved)

      onToast?.('Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCardClick = () => {
    trackPropertyEvent(project.id, 'card_click', undefined, userId).catch(() => {})
    onDetailOpen?.(project)

  }

  return (
    <div
      onClick={handleCardClick}
      className={`group relative w-full h-full flex flex-col rounded-[16px] overflow-hidden bg-white dark:bg-[#111] transition-all duration-300 ease-out cursor-pointer ${
        isTopPick
          ? 'ring-1 ring-inset ring-amber-500/50 shadow-[0_4px_20px_rgba(245,158,11,0.15)] hover:shadow-[0_8px_30px_rgba(245,158,11,0.2)]'
          : 'ring-1 ring-inset ring-black/5 dark:ring-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]'
      } md:hover:-translate-y-1 active:scale-[0.98]`}
    >
      {/* ── Hero image ── */}
      <div className="relative h-[220px] overflow-hidden bg-gray-50 dark:bg-gray-900 flex-shrink-0">
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
                  i === imgIdx ? 'opacity-100 scale-100' : 'opacity-0 scale-105 absolute inset-0'
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
                  className={`rounded-full transition-all ${i === imgIdx ? 'w-3 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'}`}

                />
              ))}
            </div>
          </>
        )}

        {/* Status tag overlaid on image top-left */}
        <div className="absolute top-3 left-3 z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-sm">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isRTM ? 'bg-emerald-500' : isNew ? 'bg-blue-500' : 'bg-amber-500'}`} />
            <span className={`text-[10px] font-medium tracking-wide text-white`}>
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Save button */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          <button
            onClick={handleSave}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-[0_2px_8px_rgba(0,0,0,0.15)] ${
              saved ? 'bg-black/40 backdrop-blur-md text-white' : 'bg-black/40 backdrop-blur-md text-white hover:bg-black/60 hover:scale-105'

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
      <div className="px-5 pt-4 pb-5 flex-1 flex flex-col bg-white dark:bg-[#111]">

        {/* Name row + RERA */}
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <h3 className="text-[17px] font-semibold text-gray-900 dark:text-gray-100 tracking-tight leading-snug truncate">
            {project.name}
          </h3>
          {project.rera_number && (
            <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 tracking-wide uppercase">
              <ShieldCheck size={12} weight="fill" className="text-emerald-500" />
              RERA
            </span>
          )}
        </div>

        {/* Builder · Sector · Possession */}
        <div className="flex items-center justify-between text-[12px] text-gray-600 dark:text-gray-300 mb-3 gap-2">
          <div className="flex items-center gap-1.5 truncate flex-1">
            <span className="font-medium truncate">{project.builder.name}</span>
            <span className="opacity-40">·</span>
            <span className="truncate opacity-80">{project.sector}</span>
          </div>
          {project.possession_label && !isRTM && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap flex-shrink-0">
              Possession: {project.possession_label}
            </span>
          )}
        </div>

        {/* Price — big hero number */}
        <div className="mb-4">
          <p className="text-[24px] font-medium text-gray-900 dark:text-gray-50 tracking-tight leading-none">
            {project.price_range_label}
          </p>
        </div>

        {/* Configurations */}
        <div className="flex flex-col gap-1.5 mb-5">
          {(expandedUnits ? bhkGroups : bhkGroups.slice(0, 2)).map(g => (
            <div key={g.bhk} className="flex items-end text-[13px] group">
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-medium text-gray-800 dark:text-gray-200">{g.bhk} BHK</span>
              </div>
              <div className="flex-1 mx-2 mb-[4px] border-b border-dotted border-gray-300 dark:border-gray-700/50 group-hover:border-gray-400 dark:group-hover:border-gray-600 transition-colors" />
              {g.areas.length > 0 && (
                <span className="text-[12px] text-gray-500 dark:text-gray-400 font-medium text-right truncate flex-shrink-0">
                  {g.areas.join(', ')}
                </span>
              )}
            </div>
          ))}
          {bhkGroups.length > 2 && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpandedUnits(prev => !prev) }}
              className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 hover:underline text-left"
            >
              {expandedUnits ? 'Show less ↑' : `+ ${bhkGroups.length - 2} more configurations`}
            </button>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          {onAskAI ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                trackPropertyEvent(project.id, 'ask_ai', undefined, userId).catch(() => {})
                onAskAI(project)
              }}
              className="flex-1 flex items-center justify-center gap-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 py-2.5 px-4 rounded-[12px] text-[13px] font-medium transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95"
            >
              <Sparkle size={14} weight="fill" />
              Ask AI
            </button>
          ) : (
            <div className="flex-1" />
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                trackPropertyEvent(project.id, 'call', undefined, userId).catch(() => {})
                onCall?.(project)
              }}
              className="w-10 h-10 rounded-full bg-transparent text-gray-700 dark:text-gray-300 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
              title="Call builder"
            >
              <Phone size={16} className="text-gray-500 dark:text-gray-400" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onShare?.(project)
              }}
              className="w-10 h-10 rounded-full bg-transparent text-gray-700 dark:text-gray-300 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
              title="Share project"
            >
              <ShareNetwork size={16} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
