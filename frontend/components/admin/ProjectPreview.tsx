'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  CheckCircle2, Clock, Zap, Shield, MapPin, Building2,
  BedDouble, ExternalLink, RefreshCw, Eye, Sparkles, Layers
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
  const displayImageUrl = project.images?.find(i => i.type === 'hero')?.url || 
    project.images?.[0]?.url || 
    project.hero_image_url

  const isDark = previewTheme === 'dark'

  return (
    <div className="sticky top-20 space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
          <Sparkles size={14} className="text-blue-600 animate-pulse" />
          <span>Real-Time Buyer Preview</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-zinc-800 rounded-lg border border-slate-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setPreviewTheme('light')}
              className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                !isDark ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setPreviewTheme('dark')}
              className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                isDark ? 'bg-zinc-900 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Dark
            </button>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center gap-1 text-[11px] text-slate-700 dark:text-zinc-300 hover:text-slate-900 border border-slate-200 dark:border-zinc-700 px-2 py-1 rounded-lg bg-white dark:bg-zinc-800 transition-colors"
            >
              <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
            </button>
          )}
          {project.slug && (
            <Link
              href={`/discover?project=${project.slug}`}
              target="_blank"
              className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 border border-blue-200 dark:border-blue-800 px-2 py-1 rounded-lg bg-blue-50/50 dark:bg-blue-950/40 transition-colors font-bold"
            >
              <ExternalLink size={10} />
              <span>Public View</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main Luxury Preview Card */}
      <div className={`${isDark ? 'dark' : ''} rounded-2xl border shadow-md overflow-hidden transition-all duration-300 ${
        isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200/90 text-slate-900'
      }`}>
        {/* Image Frame */}
        <div className="relative w-full bg-slate-100" style={{ height: 170 }}>
          {displayImageUrl ? (
            <Image
              src={displayImageUrl}
              alt={project.name || 'Property'}
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
              <Building2 size={36} />
              <span className="text-[11px] mt-1 font-medium">Hero Image Not Uploaded</span>
            </div>
          )}
          
          <div className="absolute top-3 left-3">
            <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${status.cls}`}>
              <status.icon size={11} />
              {status.label}
            </span>
          </div>

          <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[11px] font-black">
            {priceRange(units)}
          </div>
        </div>

        {/* Card Details */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
              {project.name || <span className="text-slate-300">Project Name Required</span>}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
              {project.tagline || `${project.sector || 'Sector'}, ${project.city || 'City'}`}
            </p>
          </div>

          {/* Key Facts Pills */}
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
              <MapPin size={11} className="text-blue-500" /> {project.sector}, {project.city}
            </span>
            {project.builder?.name && (
              <span className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                <Building2 size={11} className="text-purple-500" /> {project.builder.name}
              </span>
            )}
          </div>

          {/* Unit BHK Badges */}
          {units.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {bhkList(units).map((b) => (
                <span key={b} className="flex items-center gap-1 text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 px-2 py-0.5 rounded-md">
                  <BedDouble size={10} /> {b}
                </span>
              ))}
            </div>
          )}

          {/* RERA & Possession Bar */}
          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 dark:border-zinc-800 text-slate-500 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1 text-emerald-600 font-bold">
              <Shield size={12} /> {project.rera_number ? 'RERA Approved' : 'RERA Verification'}
            </span>
            {(project.possession_label || project.possession_date) && (
              <span className="flex items-center gap-1 font-semibold">
                <Clock size={11} /> {project.possession_label || 'Handover Timeline'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Compact Project Stats Strip */}
      {(project.total_units || project.total_towers || project.land_area_acres) && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800 p-3 shadow-2xs">
          <div className="grid grid-cols-3 gap-2 text-center">
            {project.total_towers && (
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">{project.total_towers}</p>
                <p className="text-[9.5px] font-bold text-slate-400 uppercase">Towers</p>
              </div>
            )}
            {project.total_units && (
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">{project.total_units}</p>
                <p className="text-[9.5px] font-bold text-slate-400 uppercase">Units</p>
              </div>
            )}
            {project.land_area_acres && (
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">{project.land_area_acres}</p>
                <p className="text-[9.5px] font-bold text-slate-400 uppercase">Acres</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
