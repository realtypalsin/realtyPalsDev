'use client'

<<<<<<< HEAD
import { useState, useCallback, useEffect, useRef } from 'react'
=======
import { useState, useCallback } from 'react'
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
import Image from 'next/image'
import {
  ClockCountdown, CheckCircle, SealCheck,
  Subway, AirplaneTakeoff, Path,
  Leaf, Baby, Heart,
<<<<<<< HEAD
  MapPin, ArrowRight, Sparkle, BookmarkSimple,
  CaretLeft, CaretRight, Phone,
  Car, GraduationCap, ShoppingBag, Bank, BookOpen,
  Barbell, Star, Buildings,
} from '@phosphor-icons/react'
import type { ProjectCard as ProjectCardType, AmenitySummary, ConnSummary } from '@/types/project'
import { API_BASE } from '@/lib/env'
import { buildWhatsAppUrl } from '@/lib/whatsapp'
=======
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
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172

interface Props {
  project: ProjectCardType
  userId: string | null
  index?: number
  onDetailOpen?: (project: ProjectCardType) => void
<<<<<<< HEAD
  onCallback?: (project: ProjectCardType) => void
  onToast?: (message: string) => void
=======
  onToast?: (message: string) => void
  onAskAI?: (project: ProjectCardType) => void
  onSetSiteVisit?: (project: ProjectCardType) => void
  onCall?: (project: ProjectCardType) => void
  onShare?: (project: ProjectCardType) => void
  quickActions?: React.ReactNode
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
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
<<<<<<< HEAD
=======
  expressway: Path,
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
  school:     GraduationCap,
  hospital:   Heart,
  mall:       ShoppingBag,
  landmark:   Bank,
  university: BookOpen,
}

<<<<<<< HEAD
const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

// Prefer carpet area for ₹/sqft (trust signal: carpet is what buyer gets)
// Falls back to super area if carpet not available
function getPricePerSqft(project: ProjectCardType): { label: string; isCarpet: boolean } | null {
  const carpetCandidates = project.unit_types.filter(
    (u) => u.price_min_cr && u.carpet_area_sqft && u.carpet_area_sqft > 0,
  )
  if (carpetCandidates.length > 0) {
    const min = Math.min(
      ...carpetCandidates.map((u) => Math.round((u.price_min_cr! * 1e7) / u.carpet_area_sqft!)),
    )
    return { label: `₹${(min / 1000).toFixed(1)}K/sqft`, isCarpet: true }
  }
  const superCandidates = project.unit_types.filter(
    (u) => u.price_min_cr && u.super_area_sqft && u.super_area_sqft > 0,
  )
  if (superCandidates.length === 0) return null
  const min = Math.min(
    ...superCandidates.map((u) => Math.round((u.price_min_cr! * 1e7) / u.super_area_sqft!)),
  )
  return { label: `₹${(min / 1000).toFixed(1)}K/sqft`, isCarpet: false }
}

export default function ProjectCard({ project, userId, index = 0, onDetailOpen, onCallback, onToast }: Props) {
  const [imgIdx, setImgIdx] = useState(0)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const visibleRef = useRef(false)

  const isRTM = project.status === 'ready_to_move'
  const isNew = project.status === 'new_launch'
  const statusLabel = isRTM ? 'Ready to Move' : isNew ? 'New Launch' : 'Under Construction'
  const StatusIcon = isRTM ? CheckCircle : ClockCountdown

  const uniqueBhk = [...new Set(project.unit_types.map((u) => `${u.bhk}BHK`))]
  const sqftInfo = getPricePerSqft(project)

  // Build image list: hero first, then other exterior/hero images
  const cardImages = [
    ...(project.hero_image_url ? [project.hero_image_url] : []),
    ...(project.images ?? [])
      .filter((i) => (i.type === 'exterior' || i.type === 'hero') && i.url !== project.hero_image_url)
      .map((i) => i.url),
  ].filter(Boolean) as string[]
  const hasMultiple = cardImages.length > 1

  // Only auto-advance carousel when card is visible (saves CPU for off-screen cards)
  useEffect(() => {
    if (!hasMultiple) return
    const el = cardRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting },
      { threshold: 0.3 },
    )
    observer.observe(el)
    const timer = setInterval(() => {
      if (visibleRef.current) setImgIdx((i) => (i + 1) % cardImages.length)
    }, 3500)
    return () => { observer.disconnect(); clearInterval(timer) }
  }, [hasMultiple, cardImages.length])

  const prevImg = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setImgIdx((i) => (i - 1 + cardImages.length) % cardImages.length)
  }, [cardImages.length])

  const nextImg = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setImgIdx((i) => (i + 1) % cardImages.length)
  }, [cardImages.length])
=======
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

>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!userId || saving) return
    setSaving(true)
    const wasSaved = saved
<<<<<<< HEAD
    setSaved(!wasSaved) // optimistic
=======
    setSaved(!wasSaved)
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
    try {
      if (wasSaved) {
        const res = await fetch(`${API_BASE}/saved/${project.id}`, {
          method: 'DELETE',
<<<<<<< HEAD
          headers: { 'X-User-Id': userId },
=======
          headers: await authHeaders(),
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
        })
        if (!res.ok) throw new Error('Delete failed')
        onToast?.('Removed from saved')
      } else {
        const res = await fetch(`${API_BASE}/saved`, {
          method: 'POST',
<<<<<<< HEAD
          headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
          body: JSON.stringify({ project_id: project.id }),
        })
        if (!res.ok) throw new Error('Save failed')
=======
          headers: await authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ project_id: project.id }),
        })
        if (!res.ok) throw new Error('Save failed')
        track('property_saved', { project_slug: project.slug, project_name: project.name })
        trackPropertyEvent(project.id, 'save', undefined, userId).catch(() => {})
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
        onToast?.('Property saved! ✓')
      }
    } catch (err) {
      console.error('[ProjectCard] save failed:', err)
<<<<<<< HEAD
      setSaved(wasSaved) // revert on error
=======
      setSaved(wasSaved)
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
      onToast?.('Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

<<<<<<< HEAD
  const handleAskAI = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.dispatchEvent(
      new CustomEvent('realtypals:ask-ai', {
        detail: { text: `Tell me more about ${project.name} by ${project.builder.name}` },
      }),
    )
=======
  const handleCardClick = () => {
    trackPropertyEvent(project.id, 'card_click', undefined, userId).catch(() => {})
    onDetailOpen?.(project)
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
  }

  return (
    <div
<<<<<<< HEAD
      ref={cardRef}
      onClick={() => onDetailOpen?.(project)}
      className="group relative w-full rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-100/80 dark:border-gray-700 shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 cursor-pointer"
    >
      {/* ── Hero image carousel ── */}
      <div className="relative h-[220px] overflow-hidden bg-gray-100 dark:bg-gray-800">
        {cardImages.length > 0 ? (
          <>
            {cardImages.map((src, i) => (
              <Image
                key={src}
                src={src}
                alt={project.name}
                fill
                unoptimized
                priority={index < 4 && i === 0}
                className={`object-cover transition-all duration-500 ${
                  i === imgIdx ? 'opacity-100 scale-100' : 'opacity-0 scale-105 absolute inset-0'
                } ${i === imgIdx ? 'group-hover:scale-105' : ''}`}
=======
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
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ))}
          </>
        ) : (
<<<<<<< HEAD
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <Buildings size={40} weight="duotone" className="text-blue-200" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

=======
          <div className="w-full h-full flex items-center justify-center bg-[#f5f5f5] dark:bg-[#111]">
            <Buildings size={44} weight="duotone" className="text-gray-300 dark:text-gray-700" />
          </div>
        )}

>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
        {/* Carousel controls */}
        {hasMultiple && (
          <>
            <button
              onClick={prevImg}
<<<<<<< HEAD
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
=======
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-full flex items-center justify-center text-gray-900 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
            >
              <CaretLeft size={14} weight="bold" />
            </button>
            <button
              onClick={nextImg}
<<<<<<< HEAD
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <CaretRight size={14} weight="bold" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {cardImages.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setImgIdx(i) }}
                  className={`rounded-full transition-all ${i === imgIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`}
=======
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-full flex items-center justify-center text-gray-900 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <CaretRight size={14} weight="bold" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10 px-2 py-1 bg-black/40 rounded-full">
              {workingImages.map((_, i) => (
                <button
                  key={i}
                  className={`rounded-full transition-all ${i === imgIdx ? 'w-3 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'}`}
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
                />
              ))}
            </div>
          </>
        )}

<<<<<<< HEAD
        {/* Rank badge — top pick only */}
        {index === 0 && (
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm shadow-amber-500/30">
            ✦ Top Pick
          </div>
        )}

        {/* Status badge */}
        <div className={`absolute ${index === 0 ? 'bottom-3 left-3' : 'top-3 left-3'} flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg backdrop-blur-sm ${
          isRTM ? 'bg-emerald-500/90 text-white' : isNew ? 'bg-blue-500/90 text-white' : 'bg-amber-500/90 text-white'
        }`}>
          <StatusIcon size={10} weight="fill" />
          {statusLabel}
        </div>

        {/* RERA + Save */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          {project.rera_number && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-white bg-blue-600/90 backdrop-blur-sm px-2 py-1.5 rounded-lg">
              <SealCheck size={10} weight="fill" />
              RERA
            </div>
          )}
          <button
            onClick={handleSave}
            className={`w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center transition-all ${
              saved ? 'bg-red-500 text-white' : 'bg-black/30 hover:bg-black/50 text-white'
=======


        {/* Status tag overlaid on image bottom-left */}
        <div className="absolute bottom-3 left-3 z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isRTM ? 'bg-emerald-500' : isNew ? 'bg-blue-500' : 'bg-amber-500'}`} />
            <span className={`text-[10px] font-semibold tracking-wide ${isRTM ? 'text-emerald-400' : isNew ? 'text-blue-400' : 'text-amber-400'}`}>
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
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
            }`}
            title={saved ? 'Unsave' : 'Save property'}
          >
            {saved
              ? <BookmarkSimple size={15} weight="fill" />
<<<<<<< HEAD
              : <BookmarkSimple size={15} weight="regular" />
=======
              : <BookmarkSimple size={15} weight="bold" />
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
            }
          </button>
        </div>
      </div>

      {/* ── Body ── */}
<<<<<<< HEAD
      <div className="p-5">
        {/* Name */}
        <div className="mb-3">
          <h3 className="text-[17px] font-bold text-gray-900 dark:text-white tracking-tight leading-snug">
            {project.name}
          </h3>
          {project.tagline && (
            <p className="text-[11px] text-blue-600 font-semibold mt-0.5 line-clamp-1">{project.tagline}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-400 dark:text-gray-500">
            <MapPin size={10} weight="duotone" />
            <span>{project.builder.name} · {project.sector}, {project.city}</span>
          </div>
        </div>

        {/* Price */}
        <div className="mb-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[22px] font-black text-gray-900 dark:text-white tracking-tight leading-none">
              {project.price_range_label}
            </p>
            {sqftInfo && (
              <span
                className="text-[10.5px] font-semibold text-gray-400 dark:text-gray-500 mt-1.5 whitespace-nowrap bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-2 py-0.5 rounded-full"
                title={sqftInfo.isCarpet ? 'Price per carpet sq ft' : 'Price per super built-up sq ft'}
              >
                {sqftInfo.label}
                {sqftInfo.isCarpet && <span className="ml-0.5 opacity-60"> carpet</span>}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-1.5">
            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">{uniqueBhk.join(' · ')}</span>
            {isRTM ? (
              <span className="flex items-center gap-1 text-[10.5px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 px-2 py-0.5 rounded-full">
                <CheckCircle size={9} weight="fill" />
                Ready Now
              </span>
            ) : project.possession_label ? (
              <span className="flex items-center gap-1 text-[10.5px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 px-2 py-0.5 rounded-full">
                <ClockCountdown size={9} weight="fill" />
                {project.possession_label}
              </span>
            ) : null}
            {project.rera_number && (
              <span className="flex items-center gap-1 text-[10.5px] font-semibold text-gray-500 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-full">
                <SealCheck size={9} weight="fill" />
                RERA ✓
              </span>
            )}
          </div>
        </div>

        {/* Design credit */}
        {project.architect && (
          <p className="text-[10.5px] text-indigo-500 font-semibold mb-3 flex items-center gap-1">
            <Sparkle size={10} weight="duotone" />
            {project.architect}{project.interior_designer ? ` × ${project.interior_designer}` : ''}
          </p>
        )}

        {/* Amenities */}
        {project.top_amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {project.top_amenities.slice(0, 5).map((a) => {
              const Icon = AMENITY_ICONS[a.category] ?? Buildings
              return (
                <span key={a.name} className="flex items-center gap-1 text-[10.5px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-2 py-1 rounded-full font-medium">
                  <Icon size={10} weight="duotone" />
                  {a.name}
                </span>
              )
            })}
          </div>
        )}

        {/* Connectivity */}
        {project.top_connectivity.length > 0 && (
          <div className="flex flex-wrap gap-3 pb-3 border-b border-gray-50 dark:border-gray-700">
            {project.top_connectivity.slice(0, 2).map((c) => {
              const Icon = CONN_ICONS[c.type] ?? Path
              return (
                <span key={c.name} className="flex items-center gap-1 text-[10.5px] text-gray-400 dark:text-gray-500">
                  <Icon size={12} weight="duotone" />
                  {c.name}
                </span>
              )
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-3">
          <button
            onClick={() => onDetailOpen?.(project)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-[12px] font-bold py-2.5 rounded-xl transition-colors"
          >
            View Details
            <ArrowRight size={12} weight="bold" />
          </button>

          {onCallback && (
            <button
              onClick={(e) => { e.stopPropagation(); onCallback(project) }}
              className="flex items-center justify-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 px-3 py-2.5 rounded-xl transition-colors"
              title="Request callback"
            >
              <Phone size={14} weight="fill" />
            </button>
          )}

          {(() => {
            const waUrl = buildWhatsAppUrl(project)
            return waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center bg-[#25D366] hover:bg-[#1da851] text-white px-3 py-2.5 rounded-xl transition-colors"
                title="WhatsApp enquiry"
              >
                <WhatsAppIcon size={15} />
              </a>
            ) : null
          })()}

          <button
            onClick={handleAskAI}
            className="flex items-center justify-center gap-1 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 text-[11px] font-semibold px-3 py-2.5 rounded-xl transition-colors border border-gray-100 dark:border-gray-700 hover:border-blue-100"
            title="Ask AI about this"
          >
            <Sparkle size={14} weight="duotone" />
          </button>
=======
      <div className="px-5 pt-4 pb-5 flex-1 flex flex-col bg-white dark:bg-[#111]">

        {/* Name row + RERA */}
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <h3 className="text-[17px] font-semibold text-gray-900 dark:text-gray-100 tracking-tight leading-snug truncate">
            {project.name}
          </h3>
          {project.rera_number && (
            <span className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-[9px] font-bold text-blue-600 dark:text-blue-400 tracking-wide uppercase">
              <CheckCircle size={10} weight="fill" className="text-blue-500" />
              RERA
            </span>
          )}
        </div>

        {/* Builder · Sector · Possession */}
        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-3">
          <div className="flex items-center gap-1 truncate">
            <span className="font-medium truncate">{project.builder.name}</span>
            <span className="opacity-40">·</span>
            <span className="truncate">{project.sector}</span>
          </div>
          {project.possession_label && !isRTM && (
            <span className="text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap ml-2">
              Possession: {project.possession_label}
            </span>
          )}
        </div>

        {/* Price — big hero number */}
        <div className="mb-4">
          <p className="text-[26px] font-semibold text-gray-900 dark:text-gray-50 tracking-tight leading-none">
            {project.price_range_label}
          </p>
        </div>

        {/* Configurations */}
        <div className="flex flex-col gap-3 mb-5">
          {(expandedUnits ? bhkGroups : bhkGroups.slice(0, 2)).map(g => (
            <div key={g.bhk} className="flex items-center justify-between text-[13px]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                  <Bed size={14} className="text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-bold text-gray-900 dark:text-gray-100">{g.bhk} BHK</span>
              </div>
              {g.areas.length > 0 && (
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium text-right truncate pl-2">
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
              className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-[12px] text-[13px] font-semibold transition-all shadow-[0_2px_8px_rgba(37,99,235,0.15)] hover:shadow-[0_4px_12px_rgba(37,99,235,0.25)] hover:-translate-y-0.5 active:scale-95"
            >
              <Sparkle size={14} weight="fill" />
              Ask AI
            </button>
          ) : (
            <div className="flex-1" />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                trackPropertyEvent(project.id, 'call', undefined, userId).catch(() => {})
                onCall?.(project)
              }}
              className="w-10 h-10 rounded-[12px] ring-1 ring-inset ring-black/5 dark:ring-white/10 bg-white dark:bg-[#111] text-gray-700 dark:text-gray-300 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-[#222] transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)] active:scale-95"
              title="Call builder"
            >
              <Phone size={16} className="text-gray-500 dark:text-gray-400" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onShare?.(project)
              }}
              className="w-10 h-10 rounded-[12px] ring-1 ring-inset ring-black/5 dark:ring-white/10 bg-white dark:bg-[#111] text-gray-700 dark:text-gray-300 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-[#222] transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)] active:scale-95"
              title="Share project"
            >
              <ShareNetwork size={16} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
        </div>
      </div>
    </div>
  )
}
