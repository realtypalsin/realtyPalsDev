'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  CheckCircle2, Clock, Zap, Shield, MapPin, Building2,
  BedDouble, ExternalLink, RefreshCw, Eye,
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
}

const STATUS_CFG: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  ready_to_move:      { label: 'Ready to Move',      cls: 'bg-emerald-100 text-emerald-700',  icon: CheckCircle2 },
  under_construction: { label: 'Under Construction', cls: 'bg-amber-100 text-amber-700',     icon: Clock },
  new_launch:         { label: 'New Launch',         cls: 'bg-blue-100 text-blue-700',       icon: Zap },
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
  const status = STATUS_CFG[project.status] ?? STATUS_CFG.ready_to_move
  const units  = project.unit_types ?? []

  return (
    <div className="sticky top-20 space-y-4">
      {/* Preview header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
          <Eye size={13} />
          Live Preview
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 border border-gray-200 px-2 py-1 rounded-lg bg-white transition-colors disabled:opacity-40"
            >
              <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          )}
          {project.slug && (
            <Link
              href={`/discover?project=${project.slug}`}
              target="_blank"
              className="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 border border-blue-200 px-2 py-1 rounded-lg bg-white transition-colors"
            >
              <ExternalLink size={10} /> Open on site
            </Link>
          )}
        </div>
      </div>

      {/* Card preview */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Hero image */}
        <div className="relative w-full bg-gray-100" style={{ height: 160 }}>
          {project.hero_image_url ? (
            <Image
              src={project.hero_image_url}
              alt={project.name}
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 size={32} className="text-gray-300" />
            </div>
          )}
          {/* Status badge overlay */}
          <div className="absolute top-3 left-3">
            <span className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${status.cls}`}>
              <status.icon size={10} />
              {status.label}
            </span>
          </div>
        </div>

        {/* Card body */}
        <div className="p-4 space-y-3">
          {/* Title */}
          <div>
            <h3 className="text-base font-black text-gray-900 leading-tight">
              {project.name || <span className="text-gray-300">Project Name</span>}
            </h3>
            {project.tagline && (
              <p className="text-xs text-gray-500 mt-0.5">{project.tagline}</p>
            )}
          </div>

          {/* Location + builder */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin size={11} /> {project.sector || '—'}, {project.city || '—'}
            </span>
            {project.builder?.name && (
              <span className="flex items-center gap-1">
                <Building2 size={11} /> {project.builder.name}
              </span>
            )}
          </div>

          {/* BHK chips */}
          {units.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {bhkList(units).map((b) => (
                <span key={b} className="flex items-center gap-1 text-[11px] bg-gray-50 border border-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                  <BedDouble size={10} /> {b}
                </span>
              ))}
            </div>
          )}

          {/* Price */}
          {units.length > 0 && (
            <p className="text-lg font-black text-gray-900">{priceRange(units)}</p>
          )}

          {/* RERA + Possession row */}
          <div className="flex items-center gap-3 text-xs text-gray-500 pt-1 border-t border-gray-50">
            {project.rera_number ? (
              <span className="flex items-center gap-1 text-emerald-600">
                <Shield size={10} /> RERA Registered
              </span>
            ) : (
              <span className="flex items-center gap-1 text-gray-300">
                <Shield size={10} /> No RERA
              </span>
            )}
            {(project.possession_label || project.possession_date) && (
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {project.possession_label || (project.possession_date ? new Date(project.possession_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' }) : '—')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Project stats */}
      {(project.total_units || project.total_towers || project.land_area_acres) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Project Stats</p>
          <div className="grid grid-cols-3 gap-3">
            {project.total_towers && (
              <div className="text-center">
                <p className="text-xl font-black text-gray-900">{project.total_towers}</p>
                <p className="text-[10px] text-gray-400">Towers</p>
              </div>
            )}
            {project.total_units && (
              <div className="text-center">
                <p className="text-xl font-black text-gray-900">{project.total_units}</p>
                <p className="text-[10px] text-gray-400">Units</p>
              </div>
            )}
            {project.land_area_acres && (
              <div className="text-center">
                <p className="text-xl font-black text-gray-900">{project.land_area_acres}</p>
                <p className="text-[10px] text-gray-400">Acres</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Marketing claims */}
      {project.marketing_claims && project.marketing_claims.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Highlights</p>
          <div className="flex flex-wrap gap-1.5">
            {project.marketing_claims.map((c) => (
              <span key={c} className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {project.description && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">AI Description</p>
          <p className="text-xs text-gray-600 leading-relaxed">{project.description}</p>
        </div>
      )}
    </div>
  )
}
