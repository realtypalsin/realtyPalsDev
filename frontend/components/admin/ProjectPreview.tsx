'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  CheckCircle2, Clock, Zap, Shield, MapPin, Building2,
  BedDouble, ExternalLink, RefreshCw, Smartphone, Layers
} from 'lucide-react'

interface UnitType {
  bhk: number
  price_min_cr: number | null
  price_max_cr: number | null
  super_area_sqft: number | null
}

interface ProjectData {
  id?: string
  slug: string
  name: string
  tagline?: string
  sector: string
  city: string
  status: string
  hero_image_url?: string
  rera_number?: string
  possession_label?: string
  possession_date?: string
  total_units?: number
  total_towers?: number
  land_area_acres?: number
  description?: string
  marketing_claims?: string[]
  builder?: { name: string }
  builder_name?: string
  builder_detail?: { name: string }
  unit_types?: UnitType[]
  amenities?: { name: string; category: string }[]
  images?: { url: string; type: string }[]
}

const STATUS_CFG: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  ready_to_move:      { label: 'Ready to Move',      cls: 'bg-emerald-500/90 text-white backdrop-blur-md shadow-xs', icon: CheckCircle2 },
  under_construction: { label: 'Under Construction', cls: 'bg-amber-500/90 text-white backdrop-blur-md shadow-xs',   icon: Clock },
  new_launch:         { label: 'New Launch',         cls: 'bg-blue-600/90 text-white backdrop-blur-md shadow-xs',     icon: Zap },
}

function priceRange(units: UnitType[]): string {
  const mins = units.map((u) => u.price_min_cr).filter((v): v is number => v !== null)
  const maxs = units.map((u) => u.price_max_cr).filter((v): v is number => v !== null)
  if (!mins.length) return 'Price TBA'
  const lo = Math.min(...mins)
  const hi = maxs.length ? Math.max(...maxs) : null
  return hi ? `₹${lo} – ${hi} Cr` : `from ₹${lo} Cr`
}

function bhkList(units: UnitType[]): string[] {
  return [...new Set(units.map((u) => `${u.bhk} BHK`))].sort()
}

interface Props {
  project: ProjectData
  onRefresh?: () => void
  refreshing?: boolean
}

export default function ProjectPreview({ project, onRefresh, refreshing }: Props) {
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light')
  const status = STATUS_CFG[project.status] ?? STATUS_CFG.ready_to_move
  const units  = project.unit_types ?? []
  
  let rawImageUrl = project.images?.find(i => i.type === 'hero')?.url ||
    project.images?.[0]?.url ||
    project.hero_image_url

  const fallbackImageUrl = 'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?auto=format&fit=crop&w=1200&q=80'
  const isValidImageUrl = rawImageUrl ? (() => {
    try {
      const url = new URL(rawImageUrl)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  })() : false
  const displayImageUrl: string = (isValidImageUrl && rawImageUrl) ? rawImageUrl : fallbackImageUrl

  const builderName = project.builder?.name ?? project.builder_name ?? project.builder_detail?.name ?? 'Unknown Builder'
  const isDark = previewTheme === 'dark'

  return (
    <div className="space-y-3.5">
      {/* Sleek Header Bar */}
      <div className="p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-2xs shrink-0">
            <Smartphone size={16} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">Real-Time Buyer Card</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">Live property presentation preview</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Segmented Light/Dark Toggle */}
          <div className="flex items-center p-0.5 bg-zinc-200/60 dark:bg-zinc-800 rounded-xl border border-zinc-300/50 dark:border-zinc-700/60">
            <button
              type="button"
              onClick={() => setPreviewTheme('light')}
              className={`px-2.5 py-1 text-[10.5px] font-bold rounded-lg transition-all cursor-pointer ${
                !isDark ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setPreviewTheme('dark')}
              className={`px-2.5 py-1 text-[10.5px] font-bold rounded-lg transition-all cursor-pointer ${
                isDark ? 'bg-zinc-900 text-white shadow-xs' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              Dark
            </button>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              title="Refresh Preview Data"
              className="w-7 h-7 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin text-blue-600' : ''} />
            </button>
          )}

          {project.slug && (
            <Link
              href={`/discover?project=${project.slug}`}
              target="_blank"
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-800/80 px-2.5 py-1 rounded-xl transition-all shadow-2xs active:scale-95"
            >
              <ExternalLink size={12} />
              <span>Public View</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main Luxury Preview Card Container */}
      <div className={`rounded-3xl border shadow-lg overflow-hidden transition-all duration-300 ${
        isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100 shadow-black/40' : 'bg-white border-zinc-200/90 text-zinc-900 shadow-zinc-200/60'
      }`}>
        {/* Image Frame */}
        <div className="relative w-full bg-zinc-900" style={{ height: 195 }}>
          <Image
            src={displayImageUrl}
            alt={project.name || 'Property'}
            fill
            unoptimized
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />
          
          <div className="absolute top-3 left-3">
            <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl backdrop-blur-md shadow-xs ${status.cls}`}>
              <status.icon size={12} />
              {status.label}
            </span>
          </div>

          <div className="absolute bottom-3 right-3 bg-zinc-900/90 backdrop-blur-md text-white border border-white/20 px-3 py-1 rounded-xl text-[11px] font-black tracking-tight shadow-md">
            {priceRange(units)}
          </div>
        </div>

        {/* Card Details */}
        <div className="p-4 space-y-3.5">
          <div>
            <h3 className={`text-base font-extrabold leading-snug tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {project.name || <span className="text-zinc-400 font-normal">Project Name Required</span>}
            </h3>
            <p className={`text-xs mt-0.5 line-clamp-1 font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {project.tagline || `${project.sector || 'Sector'}, ${project.city || 'City'}`}
            </p>
          </div>

          {/* Key Facts Pills */}
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-semibold">
            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border ${
              isDark ? 'bg-zinc-900 text-zinc-300 border-zinc-800' : 'bg-zinc-100 text-zinc-700 border-zinc-200/80'
            }`}>
              <MapPin size={12} className="text-blue-500 shrink-0" /> {project.sector || 'Sector'}, {project.city || 'Noida'}
            </span>
            {builderName && (
              <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border ${
                isDark ? 'bg-purple-950/40 text-purple-300 border-purple-800/60' : 'bg-purple-50 text-purple-700 border-purple-200/60'
              }`}>
                <Building2 size={12} className="text-purple-500 shrink-0" /> {builderName}
              </span>
            )}
          </div>

          {/* Unit BHK Badges */}
          {units.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {bhkList(units).map((b) => (
                <span key={b} className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                  isDark ? 'bg-blue-950/60 text-blue-300 border-blue-800/80' : 'bg-blue-50 text-blue-700 border-blue-200/70'
                }`}>
                  <BedDouble size={11} /> {b}
                </span>
              ))}
            </div>
          )}

          {/* Top Amenities Chips */}
          {project.amenities && project.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {project.amenities.slice(0, 3).map((am: any, idx: number) => (
                <span key={idx} className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  isDark ? 'bg-zinc-900 text-emerald-400 border-zinc-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                }`}>
                  ✓ {typeof am === 'string' ? am : am.name}
                </span>
              ))}
            </div>
          )}

          {/* RERA & Possession Bar */}
          <div className={`flex items-center justify-between text-[11px] pt-3 border-t font-medium ${
            isDark ? 'border-zinc-800/80 text-zinc-400' : 'border-zinc-100 text-zinc-500'
          }`}>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
              <Shield size={13} /> {project.rera_number ? 'RERA Approved' : 'RERA Verification'}
            </span>
            {(project.possession_label || project.possession_date) && (
              <span className="flex items-center gap-1.5 font-semibold">
                <Clock size={12} /> {project.possession_label || 'Ready to Move'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Compact Project Stats Strip */}
      {(project.total_units || project.total_towers || project.land_area_acres) && (
        <div className={`rounded-2xl border p-3 shadow-xs ${
          isDark ? 'bg-zinc-900/80 border-zinc-800 text-white' : 'bg-white border-zinc-200/80 text-zinc-900'
        }`}>
          <div className="grid grid-cols-3 gap-2 text-center">
            {project.total_towers && (
              <div>
                <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-zinc-900'}`}>{project.total_towers}</p>
                <p className="text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider">Towers</p>
              </div>
            )}
            {project.total_units && (
              <div>
                <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-zinc-900'}`}>{project.total_units}</p>
                <p className="text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider">Units</p>
              </div>
            )}
            {project.land_area_acres && (
              <div>
                <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-zinc-900'}`}>{project.land_area_acres}</p>
                <p className="text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider">Acres</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
