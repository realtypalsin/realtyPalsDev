'use client'

<<<<<<< HEAD
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Plus, CheckCircle2, Clock, Zap, Pencil, Trash2, ImageOff, ShieldOff, Building2 } from 'lucide-react'
=======
import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Search, Plus, CheckCircle2, Clock, Zap, Trash2, Building2, User, MapPin, ChevronRight, CornerDownLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { API_BASE } from '@/lib/env'
import { adminAuthHeaders } from '@/lib/authedFetch'
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172

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
<<<<<<< HEAD
=======
  images?: { url: string; type: string }[]
}

function ProjectThumbnail({ src, alt }: { src?: string | null, alt: string }) {
  const [error, setError] = useState(false)
  if (!src || error) {
    return (
      <div className="w-8 h-8 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center flex-shrink-0">
        <Building2 size={14} className="text-zinc-400" />
      </div>
    )
  }
  return (
    <div className="w-8 h-8 rounded-md overflow-hidden relative border border-zinc-200 flex-shrink-0">
      <Image src={src} alt={alt} fill unoptimized className="object-cover" onError={() => setError(true)} />
    </div>
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
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
}

type StatusFilter = 'all' | 'ready_to_move' | 'under_construction' | 'new_launch'

const STATUS_MAP: Record<string, { label: string; chip: string; icon: typeof CheckCircle2 }> = {
<<<<<<< HEAD
  ready_to_move:      { label: 'Ready to Move',       chip: 'bg-emerald-100 text-emerald-700 border-emerald-200',  icon: CheckCircle2 },
  under_construction: { label: 'Under Construction',  chip: 'bg-amber-100 text-amber-700 border-amber-200',       icon: Clock },
  new_launch:         { label: 'New Launch',          chip: 'bg-blue-100 text-blue-700 border-blue-200',          icon: Zap },
=======
  ready_to_move:      { label: 'Ready to Move',       chip: 'bg-emerald-50 text-emerald-600 border-emerald-100',  icon: CheckCircle2 },
  under_construction: { label: 'Under Construction',  chip: 'bg-amber-50 text-amber-600 border-amber-100',       icon: Clock },
  new_launch:         { label: 'New Launch',          chip: 'bg-blue-50 text-blue-600 border-blue-100',          icon: Zap },
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
}

function priceRange(units: UnitType[]): string {
  const mins = units.map((u) => u.price_min_cr).filter((v): v is number => v !== null)
  const maxs = units.map((u) => u.price_max_cr).filter((v): v is number => v !== null)
  if (!mins.length) return '—'
  const lo = Math.min(...mins)
  const hi = maxs.length ? Math.max(...maxs) : null
  return hi ? `₹${lo}–${hi} Cr` : `₹${lo}+ Cr`
}

<<<<<<< HEAD
function bhkList(units: UnitType[]): string {
  return [...new Set(units.map((u) => `${u.bhk}BHK`))].sort().join('  ·  ') || '—'
}

export default function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function load(q = '') {
    setLoading(true)
    const res  = await fetch(`/api/v1/admin/projects?q=${encodeURIComponent(q)}`)
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
    await fetch(`/api/v1/admin/projects/${id}`, { method: 'DELETE' })
    setProjects((p) => p.filter((x) => x.id !== id))
    setDeleting(null)
  }

  const filtered = statusFilter === 'all'
    ? projects
    : projects.filter((p) => p.status === statusFilter)

  const counts = {
    all:                projects.length,
    ready_to_move:      projects.filter((p) => p.status === 'ready_to_move').length,
    under_construction: projects.filter((p) => p.status === 'under_construction').length,
    new_launch:         projects.filter((p) => p.status === 'new_launch').length,
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Projects</h1>
          <p className="text-sm text-gray-400 mt-0.5">{projects.length} properties in database</p>
        </div>
        <Link
          href="/admin/projects/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-200"
        >
          <Plus size={15} /> Add Project
        </Link>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or sector…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-white"
          />
        </div>

        {/* Status chips */}
        <div className="flex gap-1.5">
          {(['all', 'ready_to_move', 'under_construction', 'new_launch'] as StatusFilter[]).map((s) => {
            const active = statusFilter === s
            const meta = s === 'all' ? null : STATUS_MAP[s]
            const label = s === 'all' ? 'All' : meta!.label
            const count = counts[s]
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap ${
                  active
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-white/20' : 'bg-gray-100'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No projects found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  {['', 'Project', 'Builder', 'Sector', 'Status', 'BHKs', 'Price', 'Flags', ''].map((h, i) => (
                    <th
                      key={i}
                      className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => {
                  const s = STATUS_MAP[p.status] ?? STATUS_MAP.ready_to_move
                  return (
                    <tr key={p.id} className="hover:bg-blue-50/30 transition-colors group">

                      {/* Thumbnail */}
                      <td className="pl-4 pr-2 py-3">
                        <div className="w-12 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {p.hero_image_url ? (
                            <Image
                              src={p.hero_image_url}
                              alt={p.name}
                              width={48}
                              height={36}
                              unoptimized
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 size={14} className="text-gray-300" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900 leading-tight">{p.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{p.slug}</p>
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{p.builder.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{p.sector}</td>

                      {/* Status badge */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${s.chip}`}>
                          <s.icon size={9} />
                          {s.label}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{bhkList(p.unit_types)}</td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-700 whitespace-nowrap">{priceRange(p.unit_types)}</td>

                      {/* Flags */}
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {!p.hero_image_url && (
                            <span title="Missing hero image" className="w-5 h-5 bg-red-50 border border-red-100 rounded-full flex items-center justify-center">
                              <ImageOff size={9} className="text-red-400" />
                            </span>
                          )}
                          {!p.rera_number && (
                            <span title="Missing RERA number" className="w-5 h-5 bg-orange-50 border border-orange-100 rounded-full flex items-center justify-center">
                              <ShieldOff size={9} className="text-orange-400" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            href={`/admin/projects/${p.id}`}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            disabled={deleting === p.id}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-right">
          Showing {filtered.length} of {projects.length} projects
        </p>
      )}
=======
function SkeletonRow() {
  return (
    <div className="flex items-center px-4 py-3 border-b border-zinc-100 gap-4">
      <div className="w-8 h-8 bg-zinc-100 rounded-md animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-zinc-100 rounded w-1/3 animate-pulse" />
        <div className="h-3 bg-zinc-50 rounded w-1/4 animate-pulse" />
      </div>
      <div className="w-24 h-4 bg-zinc-100 rounded animate-pulse shrink-0" />
      <div className="w-16 h-4 bg-zinc-100 rounded animate-pulse shrink-0" />
      <div className="w-8 h-8 bg-zinc-50 rounded-md animate-pulse shrink-0" />
    </div>
  )
}

export default function AdminProjects() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  
  // Keyboard nav
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)

  async function load(q = '') {
    setLoading(true)
    try {
      const res  = await fetch(`${API_BASE}/admin/projects?q=${encodeURIComponent(q)}`, { headers: adminAuthHeaders() })
      const data = await res.json()
      setProjects(data.projects ?? [])
    } catch (e) {
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Notion-style smart filter parsing
  const smartFilter = useCallback((p: Project) => {
    if (!query) return true
    const q = query.toLowerCase()
    
    // Check for status: prefix
    if (q.includes('status:new') && p.status === 'new_launch') return true
    if (q.includes('status:ready') && p.status === 'ready_to_move') return true
    if (q.includes('status:under') && p.status === 'under_construction') return true
    
    // Clean string search
    const cleanQ = q.replace(/status:\w+/g, '').trim()
    if (!cleanQ) return q.includes('status:') // if only status was typed, filter by status logic handled above
    
    return p.name.toLowerCase().includes(cleanQ) || 
           p.sector.toLowerCase().includes(cleanQ) || 
           p.builder.name.toLowerCase().includes(cleanQ)
  }, [query])

  const filtered = projects.filter(smartFilter)

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is inside input unless it's ArrowDown/Up
      if (document.activeElement?.tagName === 'INPUT' && !['ArrowDown', 'ArrowUp'].includes(e.key)) return

      if (e.key === '/') {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(filtered.length - 1, prev + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(0, prev - 1))
      } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < filtered.length) {
        e.preventDefault()
        router.push(`/admin/projects/${filtered[selectedIndex].id}`)
      } else if (e.key === 'Escape') {
        searchInputRef.current?.blur()
        setSelectedIndex(-1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filtered, selectedIndex, router])

  // Reset selection on filter
  useEffect(() => setSelectedIndex(-1), [query])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeleting(id)
    const promise = fetch(`${API_BASE}/admin/projects/${id}`, { method: 'DELETE', headers: adminAuthHeaders() })
    
    toast.promise(promise, {
      loading: 'Deleting project...',
      success: () => {
        setProjects((p) => p.filter((x) => x.id !== id))
        setDeleting(null)
        return `Deleted ${name}`
      },
      error: () => {
        setDeleting(null)
        return 'Failed to delete project'
      }
    })
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Projects</h1>
          <p className="text-sm text-zinc-500 mt-1">{projects.length} total properties</p>
        </div>
        <Link
          href="/admin/projects/new"
          className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-black text-white px-4 py-2 rounded-lg text-[13px] font-medium transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.2)]"
        >
          <Plus size={15} /> New Project
        </Link>
      </div>

      {/* Notion-style Unified Command Bar */}
      <div className="group flex items-center gap-3 px-4 py-3 bg-white border border-zinc-200/80 rounded-xl shadow-sm mb-6 focus-within:border-zinc-300 focus-within:shadow-md transition-all">
        <Search size={16} className="text-zinc-400 group-focus-within:text-zinc-600 transition-colors" />
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter projects or use tags like status:ready..."
          className="flex-1 bg-transparent border-none outline-none text-[14px] text-zinc-900 placeholder:text-zinc-400"
        />
        <div className="hidden sm:flex items-center gap-1.5 opacity-50">
          <kbd className="px-1.5 py-0.5 rounded border border-zinc-200 bg-zinc-50 text-[10px] font-medium font-sans">/</kbd>
          <span className="text-[11px] font-medium">to focus</span>
        </div>
      </div>

      {/* Data-Dense Tabular List (Linear Style) */}
      <div className="bg-white rounded-xl border border-zinc-200/80 shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center px-4 py-3 bg-zinc-50/50 border-b border-zinc-200/80 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          <div className="w-8 mr-4" /> {/* Thumbnail space */}
          <div className="flex-1">Property Name</div>
          <div className="w-[120px] hidden md:block">Status</div>
          <div className="w-[100px] hidden sm:block text-right">Pricing</div>
          <div className="w-[80px] hidden sm:block text-right">Health</div>
          <div className="w-[60px]" /> {/* Actions */}
        </div>

        {/* Table Body */}
        <div className="divide-y divide-zinc-100">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
          ) : filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <Building2 size={32} className="text-zinc-200 mb-3" />
              <p className="text-[14px] font-medium text-zinc-900">No projects found</p>
              <p className="text-[13px] text-zinc-500 mt-1">Try adjusting your filters.</p>
            </div>
          ) : (
            filtered.map((p, idx) => {
              const s = STATUS_MAP[p.status] ?? STATUS_MAP.ready_to_move
              const { score, missing } = quickHealth(p)
              const pct = Math.round((score / 5) * 100)
              const isSelected = selectedIndex === idx

              return (
                <Link 
                  key={p.id}
                  href={`/admin/projects/${p.id}`}
                  className={`group flex items-center px-4 py-3 transition-colors outline-none ${
                    isSelected ? 'bg-zinc-50' : 'hover:bg-zinc-50/80'
                  }`}
                  onClick={() => setSelectedIndex(idx)}
                >
                  {/* Thumbnail */}
                  <div className="mr-4">
                    <ProjectThumbnail 
                      src={p.images?.find(i => i.type === 'hero')?.url || p.images?.[0]?.url || p.hero_image_url} 
                      alt={p.name} 
                    />
                  </div>
                  
                  {/* Title & Location */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-medium text-zinc-900 truncate group-hover:text-black">{p.name}</p>
                      {isSelected && <CornerDownLeft size={12} className="text-zinc-300 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[12px] text-zinc-500 truncate">
                      <span className="truncate">{p.builder.name}</span>
                      <span className="w-[3px] h-[3px] bg-zinc-300 rounded-full" />
                      <span className="truncate">{p.sector}</span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="w-[120px] hidden md:flex items-center">
                    <div className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${s.chip}`}>
                      {s.label}
                    </div>
                  </div>

                  {/* Pricing (Tabular) */}
                  <div className="w-[100px] hidden sm:block text-right pr-4">
                    <span className="text-[13px] font-medium text-zinc-600 font-mono tracking-tight">
                      {priceRange(p.unit_types)}
                    </span>
                  </div>

                  {/* Health */}
                  <div className="w-[80px] hidden sm:flex justify-end pr-4">
                    <div 
                      className={`flex items-center gap-1.5 text-[12px] font-semibold tabular-nums ${
                        pct === 100 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-rose-500'
                      }`}
                      title={missing.length > 0 ? `Missing: ${missing.join(', ')}` : 'Perfect Health'}
                    >
                      {pct === 100 && <CheckCircle2 size={12} className="text-emerald-500" strokeWidth={2.5} />}
                      {pct}%
                    </div>
                  </div>

                  {/* Actions (Appear on Hover/Select) */}
                  <div className="w-[60px] flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.preventDefault()
                        handleDelete(p.id, p.name)
                      }} 
                      disabled={deleting === p.id}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="p-1.5 text-zinc-400">
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>
      
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
    </div>
  )
}
