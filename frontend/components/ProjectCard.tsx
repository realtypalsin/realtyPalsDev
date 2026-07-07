'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import {
  CheckCircle, SealCheck,
  BookmarkSimple,
  CaretLeft, CaretRight, CaretRight as ChevronRight,
  Buildings, Phone, ShareNetwork, Robot, Bed,
} from '@phosphor-icons/react'
import type { ProjectCard as ProjectCardType } from '@/types/project'
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
  onAskAI?: (project: ProjectCardType) => void
  onSetSiteVisit?: (project: ProjectCardType) => void
  quickActions?: React.ReactNode
}

export default function ProjectCard({ project, userId, index = 0, onDetailOpen, onToast, onAskAI, onSetSiteVisit, quickActions }: Props) {
  const [imgIdx, setImgIdx] = useState(0)
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showAllConfigs, setShowAllConfigs] = useState(false)

  const isRTM = project.status === 'ready_to_move'
  const isNew = project.status === 'new_launch'

  // Status badge config
  const statusCfg = isRTM
    ? { label: 'Ready to Move', dot: 'bg-emerald-400', bg: 'bg-emerald-950/70', text: 'text-emerald-300' }
    : isNew
    ? { label: 'New Launch', dot: 'bg-blue-400', bg: 'bg-blue-950/70', text: 'text-blue-300' }
    : { label: 'Under Construction', dot: 'bg-amber-400', bg: 'bg-amber-950/70', text: 'text-amber-300' }

  // Deduplicated BHK configuration rows
  const unitsByBhk = project.unit_types.reduce((acc, u) => {
    if (!acc[u.bhk]) acc[u.bhk] = new Set<string>()
    const area = u.carpet_area_sqft || u.super_area_sqft
    if (area) acc[u.bhk].add(`${area} sqft`)
    return acc
  }, {} as Record<number, Set<string>>)

  const bhkRows = Object.entries(unitsByBhk)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([bhk, areas]) => ({
      bhk: Number(bhk),
      area: [...areas].sort((a, b) => parseInt(a) - parseInt(b)).join(', ') || null,
    }))

  // Images
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
      console.error('[ProjectCard] save failed:', err)
      setSaved(wasSaved)
      onToast?.('Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleAskAI = (e: React.MouseEvent) => {
    e.stopPropagation()
    track('ask_ai_tapped', { project_slug: project.slug, project_name: project.name })
    onAskAI?.(project)
  }

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation()
    track('call_tapped', { project_slug: project.slug })
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    track('share_tapped', { project_slug: project.slug })
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: project.name,
          text: `${project.name} — ${project.price_range_label}`,
          url: window.location.href,
        })
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(window.location.href)
      onToast?.('Link copied!')
    }
  }

  return (
    <div
      onClick={() => onDetailOpen?.(project)}
      className="group relative w-full h-full flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-[#111] cursor-pointer ring-1 ring-inset ring-gray-200/70 dark:ring-white/8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)] dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 md:hover:scale-[1.01]"
    >

      {/* ── Hero Image ── */}
      <div className="relative h-[220px] overflow-hidden bg-gray-100 dark:bg-gray-900 flex-shrink-0">
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
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
            <Buildings size={48} weight="duotone" className="text-gray-300 dark:text-gray-600" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

        {/* Status badge — bottom left on image */}
        <div className={`absolute bottom-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-sm ${statusCfg.bg} border border-white/10`}>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusCfg.dot}`} />
          <span className={`text-[11px] font-semibold tracking-wide ${statusCfg.text}`}>{statusCfg.label}</span>
        </div>

        {/* Carousel controls */}
        {hasMultiple && (
          <>
            <button
              onClick={prevImg}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <CaretLeft size={13} weight="bold" />
            </button>
            <button
              onClick={nextImg}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <CaretRight size={13} weight="bold" />
            </button>
            <div className="absolute bottom-3 right-3 flex gap-1 z-10">
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

        {/* Save button — top right */}
        <button
          onClick={handleSave}
          className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm backdrop-blur-sm ${
            saved
              ? 'bg-red-500 text-white'
              : 'bg-black/40 text-white hover:bg-black/60 hover:scale-105'
          }`}
          title={saved ? 'Unsave' : 'Save property'}
        >
          <BookmarkSimple size={15} weight={saved ? 'fill' : 'bold'} />
        </button>
      </div>

      {/* ── Body ── */}
      <div className="px-4 pt-3.5 pb-0 flex-1 flex flex-col bg-white dark:bg-[#111]">

        {/* Project name + RERA */}
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <h3 className="text-[15px] font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-snug line-clamp-1">
            {project.name}
          </h3>
          {project.rera_number && (
            <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 border border-blue-200/70 dark:border-blue-700/50 text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-wide">
              <SealCheck size={10} weight="fill" className="text-blue-500" />
              RERA
            </span>
          )}
        </div>

        {/* Builder · Sector · Possession */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="text-[12px] text-gray-500 dark:text-gray-400 truncate">
            <span className="font-medium">{project.builder.name}</span>
            <span className="opacity-40 mx-1">·</span>
            <span>{project.sector}</span>
          </span>
          {project.possession_label && !isRTM && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap flex-shrink-0">
              Possession: {project.possession_label}
            </span>
          )}
        </div>

        {/* Price */}
        <p className="text-[23px] font-black text-gray-900 dark:text-white tracking-tight leading-none mb-3">
          {project.price_range_label}
        </p>

        {/* Divider */}
        <div className="border-t border-gray-100 dark:border-white/6 mb-2" />

        {/* Configuration rows — tappable with chevron */}
        {/* Configuration rows */}
        <div className="flex flex-col mb-4">
          {bhkRows.slice(0, showAllConfigs ? undefined : 2).map((row, idx, arr) => {
            const isLast = idx === arr.length - 1 && (!showAllConfigs ? bhkRows.length <= 2 : true);
            return (
              <div
                key={row.bhk}
                className={`flex items-center justify-between py-2.5 ${isLast ? '' : 'border-b border-gray-100 dark:border-gray-800'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[10px] bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                    <Bed size={16} weight="regular" className="text-[#3061F2] dark:text-blue-400" />
                  </div>
                  <span className="text-[14px] font-bold text-gray-900 dark:text-white">
                    {row.bhk} BHK
                  </span>
                </div>
                {row.area && (
                  <span className="text-[12.5px] font-medium text-gray-500 dark:text-gray-400 text-right max-w-[50%] leading-snug">
                    {row.area}
                  </span>
                )}
              </div>
            );
          })}
          {!showAllConfigs && bhkRows.length > 2 && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowAllConfigs(true); }}
              className="text-[11.5px] font-medium text-[#3061F2] dark:text-blue-400 pt-2 px-1 text-left w-max hover:underline"
            >
              +{bhkRows.length - 2} more configurations
            </button>
          )}
        </div>
      </div>

      {/* ── Bottom CTA Bar ── */}
      {quickActions ? (
        <div onClick={(e) => e.stopPropagation()} className="px-4 pb-4">
          {quickActions}
        </div>
      ) : (
        <div className="px-4 pb-4 pt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {/* Ask AI — primary full-width pill */}
          <button
            onClick={handleAskAI}
            className="flex-1 flex items-center justify-center gap-2 h-10 bg-[#3061F2] hover:bg-[#2451d4] active:scale-[0.98] rounded-full text-white text-[13px] font-semibold transition-all shadow-[0_2px_8px_rgba(48,97,242,0.35)] hover:shadow-[0_4px_16px_rgba(48,97,242,0.45)]"
          >
            <Robot size={16} weight="fill" />
            Ask AI
          </button>

          {/* Call icon button */}
          <button
            onClick={handleCall}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/8 hover:bg-gray-200 dark:hover:bg-white/12 text-gray-600 dark:text-gray-300 transition-all"
            title="Request a callback"
          >
            <Phone size={16} weight="fill" />
          </button>

          {/* Share icon button */}
          <button
            onClick={handleShare}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/8 hover:bg-gray-200 dark:hover:bg-white/12 text-gray-600 dark:text-gray-300 transition-all"
            title="Share"
          >
            <ShareNetwork size={16} weight="fill" />
          </button>
        </div>
      )}
    </div>
  )
}
