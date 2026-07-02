'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Plus, CheckCircle2, Clock, Zap, Pencil, Trash2, Building2, MoreHorizontal, MapPin, User, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { API_BASE } from '@/lib/env'

interface UnitType { bhk: number; price_min_cr: number | null; price_max_cr: number | null }

interface Project {
  id: string
  slug: string
  name: string
  sector: string
  city: string
  status: string
  hero_image_url: string | null
  rera_number: string | null
  builder: { name: string }
  unit_types: UnitType[]
  images?: { url: string; type: string }[]
}

function ProjectThumbnail({ src, alt }: { src?: string | null, alt: string }) {
  const [error, setError] = useState(false)
  if (!src || error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Building2 size={16} className="text-zinc-300" />
      </div>
    )
  }
  return (
    <Image 
      src={src} 
      alt={alt} 
      fill 
      unoptimized 
      className="object-cover" 
      onError={() => setError(true)} 
    />
  )
}

function quickHealth(p: Project): { score: number; missing: string[] } {
  const hasImage = (p.images && p.images.length > 0) || !!p.hero_image_url
  const checks = [
    { ok: hasImage,                                        label: 'Hero image' },
    { ok: !!p.rera_number,                                 label: 'RERA number' },
    { ok: !!p.builder?.name,                               label: 'Builder' },
    { ok: p.unit_types.length > 0,                         label: 'Unit types' },
    { ok: p.unit_types.some(u => u.price_min_cr != null),  label: 'Pricing' },
  ]
  const missing = checks.filter(c => !c.ok).map(c => c.label)
  return { score: checks.filter(c => c.ok).length, missing }
}

type StatusFilter = 'all' | 'ready_to_move' | 'under_construction' | 'new_launch'

const STATUS_MAP: Record<string, { label: string; chip: string; icon: typeof CheckCircle2 }> = {
  ready_to_move:      { label: 'Ready to Move',       chip: 'bg-emerald-100 text-emerald-700 border-emerald-200',  icon: CheckCircle2 },
  under_construction: { label: 'Under Construction',  chip: 'bg-amber-100 text-amber-700 border-amber-200',       icon: Clock },
  new_launch:         { label: 'New Launch',          chip: 'bg-blue-100 text-blue-700 border-blue-200',          icon: Zap },
}

function priceRange(units: UnitType[]): string {
  const mins = units.map((u) => u.price_min_cr).filter((v): v is number => v !== null)
  const maxs = units.map((u) => u.price_max_cr).filter((v): v is number => v !== null)
  if (!mins.length) return '—'
  const lo = Math.min(...mins)
  const hi = maxs.length ? Math.max(...maxs) : null
  return hi ? `₹${lo}–${hi} Cr` : `₹${lo}+ Cr`
}

function bhkList(units: UnitType[]): string {
  return [...new Set(units.map((u) => `${u.bhk}BHK`))].sort().join('  ·  ') || '—'
}

export default function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sectorFilter, setSectorFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function load(q = '') {
    setLoading(true)
    const res  = await fetch(`${API_BASE}/admin/projects?q=${encodeURIComponent(q)}`, { credentials: 'include' })
    const data = await res.json()
    setProjects(data.projects ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const t = setTimeout(() => load(query), 300)
    return () => clearTimeout(t)
  }, [query])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeleting(id)
    await fetch(`${API_BASE}/admin/projects/${id}`, { method: 'DELETE', credentials: 'include' })
    setProjects((p) => p.filter((x) => x.id !== id))
    setDeleting(null)
  }

  const sectors = [...new Set(projects.map((p) => p.sector))].sort((a, b) => a.localeCompare(b))

  const filtered = projects
    .filter((p) => statusFilter === 'all' || p.status === statusFilter)
    .filter((p) => sectorFilter === 'all' || p.sector === sectorFilter)

  const counts = {
    all:                projects.length,
    ready_to_move:      projects.filter((p) => p.status === 'ready_to_move').length,
    under_construction: projects.filter((p) => p.status === 'under_construction').length,
    new_launch:         projects.filter((p) => p.status === 'new_launch').length,
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black text-slate-900 tracking-tight">Projects Directory</h1>
          <p className="text-sm text-slate-500 mt-1">{projects.length} properties in database</p>
        </div>
        <Link
          href="/admin/projects/new"
          className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-full text-sm font-semibold transition-all shadow-md hover:shadow-lg"
        >
          <Plus size={16} /> Add Project
        </Link>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-4 items-center pt-2 pb-4 border-b border-gray-200/60">
        {/* Search */}
        <div className="relative flex-1 w-full max-w-md">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search properties by name or sector..."
            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-full text-[13px] font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 bg-white shadow-sm transition-all"
          />
        </div>

        {/* Sector filter */}
        <div className="relative w-full sm:w-auto">
          <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="w-full sm:w-auto appearance-none pl-10 pr-8 py-3 border border-gray-200 rounded-full text-[13px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 bg-white shadow-sm transition-all cursor-pointer"
          >
            <option value="all">All Sectors ({projects.length})</option>
            {sectors.map((s) => (
              <option key={s} value={s}>{s} ({projects.filter((p) => p.sector === s).length})</option>
            ))}
          </select>
        </div>

        {/* Status chips (Segmented Control) */}
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar scroll-smooth">
          {(['all', 'ready_to_move', 'under_construction', 'new_launch'] as StatusFilter[]).map((s) => {
            const active = statusFilter === s
            const meta = s === 'all' ? null : STATUS_MAP[s]
            const label = s === 'all' ? 'All' : meta!.label
            const count = counts[s]
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold transition-all whitespace-nowrap border ${
                  active ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-600 border-gray-200 hover:border-gray-300 hover:bg-slate-50 shadow-sm'
                }`}
              >
                <span className="relative z-10 tracking-wide">{label}</span>
                <span className={`relative z-10 text-[10px] px-2 py-0.5 rounded-full font-black transition-colors ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* List View */}
      <div className="space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-[14px] border border-dashed border-zinc-200">
            <Building2 size={32} className="text-zinc-200 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm font-medium">No projects found</p>
          </div>
        ) : (
          filtered.map((p) => {
            const s = STATUS_MAP[p.status] ?? STATUS_MAP.ready_to_move
            const { score, missing } = quickHealth(p)
            const pct = Math.round((score / 5) * 100)

            return (
              <div key={p.id} className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 mb-4 rounded-2xl bg-white border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-gray-200 transition-all cursor-pointer overflow-hidden">
                {/* Click target spanning the whole card */}
                <Link href={`/admin/projects/${p.id}`} className="absolute inset-0 z-0" aria-label={`Edit ${p.name}`} />
                
                <div className="relative z-10 flex items-center gap-5 flex-1 min-w-0 pointer-events-none">
                  {/* Thumbnail */}
                  <div className="w-[100px] h-[72px] rounded-xl overflow-hidden bg-slate-50 flex-shrink-0 relative shadow-sm border border-gray-100/50">
                    <ProjectThumbnail 
                      src={p.images?.find(i => i.type === 'hero')?.url || p.images?.[0]?.url || p.hero_image_url} 
                      alt={p.name} 
                    />
                  </div>
                  
                  {/* Title & Metadata */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-[17px] font-bold text-slate-900 leading-tight truncate font-serif tracking-tight group-hover:text-blue-600 transition-colors">{p.name}</p>
                      
                      {/* Premium Status Badge */}
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border ${s.chip}`}>
                        {p.status === 'ready_to_move' && <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>}
                        {s.label}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3.5 mt-1 text-[13px] font-medium text-slate-500 truncate">
                      <span className="flex items-center gap-1.5 truncate">
                        <User size={13} className="text-slate-400" />
                        {p.builder.name}
                      </span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full flex-shrink-0" />
                      <span className="flex items-center gap-1.5 truncate">
                        <MapPin size={13} className="text-slate-400" />
                        {p.sector}
                      </span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full flex-shrink-0" />
                      <span className="truncate text-slate-900 font-bold bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                        {priceRange(p.unit_types)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side stats & actions */}
                <div className="relative z-10 flex items-center justify-between sm:justify-end gap-6 mt-5 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-gray-100 flex-shrink-0">
                  {/* Circular Health Bar */}
                  <div className="flex items-center gap-3 pointer-events-none" title={missing.length > 0 ? `Missing: ${missing.join(', ')}` : 'Perfect Health'}>
                    <div className="flex flex-col items-end justify-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Health</span>
                      <span className={`text-[12px] font-black tabular-nums ${pct === 100 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-rose-500'}`}>{pct}%</span>
                    </div>
                    
                    <div className="relative w-10 h-10 flex items-center justify-center">
                      <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" className="stroke-slate-100" strokeWidth="3" fill="none" />
                        <circle
                          cx="18"
                          cy="18"
                          r="15"
                          className={`stroke-current ${pct === 100 ? 'text-emerald-500' : pct >= 60 ? 'text-amber-500' : 'text-rose-500'} transition-all duration-1000`}
                          strokeWidth="3"
                          fill="none"
                          strokeDasharray="94.2"
                          strokeDashoffset={94.2 - (pct / 100) * 94.2}
                          strokeLinecap="round"
                        />
                      </svg>
                      {pct === 100 && <CheckCircle2 size={12} className="absolute text-emerald-500" strokeWidth={3} />}
                    </div>
                  </div>

                  {/* Actions context menu replacement */}
                  <div className="flex items-center gap-2 sm:opacity-0 sm:-translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    <button 
                      onClick={(e) => {
                        e.preventDefault()
                        handleDelete(p.id, p.name)
                      }} 
                      disabled={deleting === p.id} 
                      className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 border border-transparent rounded-xl transition-colors disabled:opacity-30 relative z-20" 
                      title="Delete Project"
                    >
                      <Trash2 size={15} />
                    </button>
                    <div className="w-8 h-8 rounded-full bg-slate-50 border border-gray-200 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:border-blue-200 group-hover:text-blue-600 transition-colors pointer-events-none">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-right">
          Showing {filtered.length} of {projects.length} projects
        </p>
      )}
    </div>
  )
}
