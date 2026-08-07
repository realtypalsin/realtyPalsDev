'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import UniversalLoader from '@/components/ui/universal-loader'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Search, Plus, CheckCircle2, Clock, Zap, Trash2, Building2, ChevronRight, CornerDownLeft } from 'lucide-react'

import { toast } from 'sonner'
import { adminFetch } from '@/lib/adminFetch'
import { API_BASE } from '@/lib/env'
import { adminAuthHeaders } from '@/lib/authedFetch'


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
      <div className="w-8 h-8 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center flex-shrink-0">
        <Building2 size={14} className="text-zinc-600" />
      </div>
    )
  }
  return (
    <div className="w-8 h-8 rounded-md overflow-hidden relative border border-zinc-200 flex-shrink-0">
      <Image src={src} alt={alt} fill sizes="32px" className="object-cover" onError={() => setError(true)} />
    </div>
  )
}

function quickHealth(p: Project): { score: number; missing: string[] } {
  const images = p.images || []
  const unitTypes = p.unit_types || []
  const hasImage = images.length > 0 || !!p.hero_image_url
  const checks = [
    { ok: hasImage, label: 'Hero image' },
    { ok: !!p.rera_number, label: 'RERA number' },
    { ok: !!p.builder?.name, label: 'Builder' },
    { ok: unitTypes.length > 0, label: 'Unit types' },
    { ok: unitTypes.some(u => u.price_min_cr != null), label: 'Pricing' },
    { ok: !!p.description, label: 'Description' },
    { ok: (p.amenities?.length || 0) >= 3, label: 'Amenities' },
    { ok: (p.connectivity?.length || 0) >= 3, label: 'Connectivity' },
  ]
  const missing = checks.filter(c => !c.ok).map(c => c.label)
  const scorePct = Math.round((checks.filter(c => c.ok).length / checks.length) * 100)
  return { score: scorePct, missing }
}


const STATUS_MAP: Record<string, { label: string; chip: string; icon: typeof CheckCircle2 }> = {
  ready_to_move:      { label: 'Ready to Move',       chip: 'bg-emerald-50 text-emerald-600 border-emerald-100',  icon: CheckCircle2 },
  under_construction: { label: 'Under Construction',  chip: 'bg-amber-50 text-amber-600 border-amber-100',       icon: Clock },
  new_launch:         { label: 'New Launch',          chip: 'bg-blue-50 text-blue-600 border-blue-100',          icon: Zap },

}

function priceRange(units: UnitType[] = []): string {
  const safeUnits = units || []
  const mins = safeUnits.map((u) => u.price_min_cr).filter((v): v is number => v !== null)
  const maxs = safeUnits.map((u) => u.price_max_cr).filter((v): v is number => v !== null)
  if (!mins.length) return '—'
  const lo = Math.min(...mins)
  const hi = maxs.length ? Math.max(...maxs) : null
  return hi ? `₹${lo}–${hi} Cr` : `₹${lo}+ Cr`
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
      const res = await adminFetch(`/admin/projects?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setProjects(data.projects ?? [])
    } catch {
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
    const promise = adminFetch(`/admin/projects/${id}`, { method: 'DELETE' })
    
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
    <div className="max-w-6xl mx-auto">

      <div className="flex items-center justify-between mb-lg">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">Projects</h1>
          <p className="text-sm text-text-secondary mt-md">{projects.length} total properties</p>
        </div>
        <Link
          href="/admin/projects/new"
          className="flex items-center gap-md bg-primary hover:bg-primary-dark text-white px-lg py-md rounded-md text-xs font-medium transition-all shadow-xs"
        >
          <Plus size={15} strokeWidth={2.5} /> New Project
        </Link>
      </div>

      {/* Notion-style Unified Command Bar */}
      <div className="group flex items-center gap-md px-lg py-md bg-surface border border-border rounded-md shadow-xs mb-lg focus-within:border-border-heavy focus-within:shadow-sm transition-all">
        <Search size={16} className="text-text-muted group-focus-within:text-text-secondary transition-colors" />
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter projects or use tags like status:ready..."
          className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-muted"
        />
        <div className="hidden sm:flex items-center gap-md opacity-50">
          <kbd className="px-md py-xs rounded border border-border bg-surface-2 text-xs font-medium font-sans">/</kbd>
          <span className="text-xs font-medium">to focus</span>
        </div>
      </div>

      {/* Data-Dense Tabular List (Linear Style) */}
      <div className="bg-surface rounded-lg border border-border shadow-xs overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center px-lg py-md bg-surface-2 border-b border-border text-xs font-semibold text-text-muted uppercase tracking-wider">
          <div className="w-8 mr-4" /> {/* Thumbnail space */}
          <div className="flex-1">Property Name</div>
          <div className="w-[120px] hidden md:block">Status</div>
          <div className="w-[100px] hidden sm:block text-right">Pricing</div>
          <div className="w-[80px] hidden sm:block text-right">Health</div>
          <div className="w-[60px]" /> {/* Actions */}
        </div>

        {/* Table Body */}
        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-lg"><UniversalLoader variant="skeleton-list" rows={10} /></div>
          ) : filtered.length === 0 ? (
            <div className="py-3xl flex flex-col items-center justify-center text-center">
              <Building2 size={32} className="text-text-muted mb-md" />
              <p className="text-sm font-medium text-text-primary">No projects found</p>
              <p className="text-xs text-text-secondary mt-md">Try adjusting your filters.</p>
            </div>
          ) : (
            filtered.map((p, idx) => {
              const s = STATUS_MAP[p.status] ?? STATUS_MAP.ready_to_move
              const { score, missing } = quickHealth(p)
              const pct = score
              const isSelected = selectedIndex === idx

              return (
                <Link
                  key={p.id}
                  href={`/admin/projects/${p.id}`}
                  className={`group flex items-center px-lg py-md transition-colors outline-none ${
                    isSelected ? 'bg-surface-2' : 'hover:bg-surface-2/50'
                  }`}
                  onClick={() => setSelectedIndex(idx)}
                >
                  {/* Thumbnail */}
                  <div className="mr-lg">
                    <ProjectThumbnail 
                      src={p.images?.find(i => i.type === 'hero')?.url || p.images?.[0]?.url || p.hero_image_url} 
                      alt={p.name} 
                    />
                  </div>
                  
                  {/* Title & Location */}
                  <div className="flex-1 min-w-0 pr-lg">
                    <div className="flex items-center gap-md">
                      <p className="text-sm font-medium text-text-primary truncate group-hover:text-text-primary">{p.name}</p>
                      {isSelected && <CornerDownLeft size={12} className="text-text-muted flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-md mt-xs text-xs text-text-secondary truncate">
                      <span className="truncate">{p.builder.name}</span>
                      <span className="w-0.5 h-0.5 bg-border rounded-full" />
                      <span className="truncate">{p.sector}</span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="w-[120px] hidden md:flex items-center">
                    <div className={`px-md py-xs rounded-sm text-xs font-medium border ${s.chip}`}>
                      {s.label}
                    </div>
                  </div>

                  {/* Pricing (Tabular) */}
                  <div className="w-[100px] hidden sm:block text-right pr-lg">
                    <span className="text-sm font-medium text-text-secondary font-mono tracking-tight">
                      {priceRange(p.unit_types)}
                    </span>
                  </div>

                  {/* Health */}
                  <div className="w-[80px] hidden sm:flex justify-end pr-lg">
                    <div
                      className={`flex items-center gap-md text-xs font-semibold tabular-nums ${
                        pct === 100 ? 'text-success' : pct >= 60 ? 'text-warning' : 'text-danger'
                      }`}
                      title={missing.length > 0 ? `Missing: ${missing.join(', ')}` : 'Perfect Health'}
                    >
                      {pct === 100 && <CheckCircle2 size={12} className="text-success" strokeWidth={2.5} />}
                      {pct}%
                    </div>
                  </div>

                  {/* Actions (Appear on Hover/Select) */}
                  <div className="w-[60px] flex items-center justify-end gap-md opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.preventDefault()
                        handleDelete(p.id, p.name)
                      }} 
                      disabled={deleting === p.id}
                      className="p-md text-text-secondary hover:text-danger hover:bg-danger/5 rounded-md transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="p-md text-text-muted">
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>
      

    </div>
  )
}
