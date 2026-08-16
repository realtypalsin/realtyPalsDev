'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import UniversalLoader from '@/components/ui/universal-loader'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Search, Plus, CheckCircle2, Clock, Zap, Trash2, Building2, ChevronRight, CornerDownLeft,
  X, ArrowUpDown, ArrowUp, ArrowDown, MapPin, Layers, Filter, RefreshCw, ChevronDown, Check,
  Download, Upload, AlertTriangle, FileSpreadsheet, FileText
} from 'lucide-react'
import { toast } from 'sonner'
import { adminFetch } from '@/lib/adminFetch'

function CustomSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string; icon?: React.ReactNode }[]
  onChange: (val: T) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const selected = options.find((o) => o.value === value) || options[0]

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-200 rounded-xl shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-600 transition-all cursor-pointer select-none active:scale-[0.98] ${
          isOpen ? 'ring-2 ring-blue-500/20 border-blue-500' : ''
        }`}
      >
        {selected.icon}
        <span>{selected.label}</span>
        <ChevronDown size={13} className={`text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 min-w-[170px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl shadow-xl z-50 p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  {opt.icon}
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check size={13} className="text-blue-600 dark:text-blue-400" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

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
  description?: string | null
  builder: { name: string }
  unit_types: UnitType[]
  amenities?: { id: string }[]
  connectivity?: { id: string }[]
  images?: { url: string; type: string }[]
  completenessScore?: number
  tabScores?: Record<string, number>
}

export interface FilterToken {
  id: string
  type: 'builder' | 'sector' | 'name'
  value: string
  label: string
}

type SortField = 'name' | 'builder' | 'status' | 'price' | 'health'
type SortOrder = 'asc' | 'desc'

function getNonMediaScore(p: Project): number {
  if (p.tabScores) {
    const ts = p.tabScores
    return Math.round(
      ((ts.core ?? 100) * 0.20) +
      ((ts.pricing ?? 100) * 0.25) +
      ((ts.intelligence ?? 100) * 0.25) +
      ((ts.updates ?? 100) * 0.15) +
      ((ts.partners ?? 100) * 0.15)
    )
  }
  return p.completenessScore ?? 100
}

function ProjectThumbnail({ src, alt }: { src?: string | null; alt: string }) {
  const [error, setError] = useState(false)
  if (!src || error) {
    return (
      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center flex-shrink-0">
        <Building2 size={14} className="text-zinc-400" />
      </div>
    )
  }
  return (
    <div className="w-8 h-8 rounded-lg overflow-hidden relative border border-zinc-200 dark:border-zinc-700 flex-shrink-0 shadow-2xs">
      <Image src={src} alt={alt} fill sizes="32px" className="object-cover" onError={() => setError(true)} />
    </div>
  )
}

function quickHealth(p: Project): { score: number; missing: string[] } {
  if (typeof p.completenessScore === 'number') {
    return { score: p.completenessScore, missing: [] }
  }
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

function priceMinVal(units: UnitType[] = []): number {
  const safeUnits = units || []
  const mins = safeUnits.map((u) => u.price_min_cr).filter((v): v is number => v !== null)
  return mins.length ? Math.min(...mins) : 0
}

const STATUS_MAP: Record<string, { label: string; chip: string; icon: typeof CheckCircle2 }> = {
  ready_to_move:      { label: 'Ready to Move',       chip: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',  icon: CheckCircle2 },
  under_construction: { label: 'Under Construction',  chip: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',       icon: Clock },
  new_launch:         { label: 'New Launch',          chip: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',          icon: Zap },
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
  const [activeTokens, setActiveTokens] = useState<FilterToken[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready_to_move' | 'under_construction' | 'new_launch' | 'partially_filled'>('all')
  const [healthFilter, setHealthFilter] = useState<'all' | 'excellent' | 'good' | 'needs_fix'>('all')
  const [priceFilter, setPriceFilter] = useState<'all' | 'under_1cr' | '1_2cr' | '2_4cr' | 'above_4cr'>('all')

  // Sorting
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  
  // Bulk Import Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [bulkCsvText, setBulkCsvText] = useState('')
  const [bulkParsedRows, setBulkParsedRows] = useState<any[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [bulkImportResult, setBulkImportResult] = useState<{ updated: number; skipped: number; errors: any[] } | null>(null)

  // Autocomplete Popover
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)


  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch('/admin/projects?limit=1000')
      const data = await res.json()
      setProjects(data.projects ?? [])
    } catch {
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Autocomplete Suggestions (Builders, Sectors)
  const suggestions = useMemo(() => {
    if (!query || query.trim().length < 2) return []
    const q = query.toLowerCase().trim()
    const out: { type: 'builder' | 'sector' | 'name'; value: string; label: string; count?: number }[] = []
    
    // Unique Builders matching q
    const builderCounts = new Map<string, number>()
    const sectorCounts = new Map<string, number>()

    for (const p of projects) {
      if (p.builder?.name?.toLowerCase().includes(q)) {
        builderCounts.set(p.builder.name, (builderCounts.get(p.builder.name) || 0) + 1)
      }
      if (p.sector?.toLowerCase().includes(q)) {
        sectorCounts.set(p.sector, (sectorCounts.get(p.sector) || 0) + 1)
      }
    }

    builderCounts.forEach((count, name) => {
      out.push({ type: 'builder', value: name, label: `Builder: ${name}`, count })
    })

    sectorCounts.forEach((count, sector) => {
      out.push({ type: 'sector', value: sector, label: `Sector: ${sector}`, count })
    })

    return out.slice(0, 8)
  }, [query, projects])

  const addFilterToken = (token: { type: 'builder' | 'sector' | 'name'; value: string; label: string }) => {
    if (!activeTokens.some(t => t.type === token.type && t.value.toLowerCase() === token.value.toLowerCase())) {
      setActiveTokens(prev => [...prev, { id: `${token.type}_${Date.now()}`, ...token }])
    }
    setQuery('')
    setIsPopoverOpen(false)
  }

  const removeFilterToken = (id: string) => {
    setActiveTokens(prev => prev.filter(t => t.id !== id))
  }

  // Handle Outside Click for Popover
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Multi-faceted Filter Evaluation
  const filtered = useMemo(() => {
    return projects.filter(p => {
      // 1. Status Filter (including partially_filled)
      if (statusFilter === 'partially_filled') {
        if (getNonMediaScore(p) >= 70) return false
      } else if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false
      }

      // 2. Health Filter
      const score = typeof p.completenessScore === 'number' ? p.completenessScore : quickHealth(p).score
      if (healthFilter === 'excellent' && score < 95) return false
      if (healthFilter === 'good' && (score < 80 || score >= 95)) return false
      if (healthFilter === 'needs_fix' && score >= 80) return false

      // 3. Price Filter
      const minP = priceMinVal(p.unit_types)
      if (priceFilter === 'under_1cr' && (minP === 0 || minP >= 1.0)) return false
      if (priceFilter === '1_2cr' && (minP < 1.0 || minP >= 2.0)) return false
      if (priceFilter === '2_4cr' && (minP < 2.0 || minP >= 4.0)) return false
      if (priceFilter === 'above_4cr' && minP < 4.0) return false

      // 4. Token Filters
      for (const token of activeTokens) {
        if (token.type === 'builder' && p.builder?.name?.toLowerCase() !== token.value.toLowerCase()) return false
        if (token.type === 'sector' && p.sector?.toLowerCase() !== token.value.toLowerCase()) return false
        if (token.type === 'name' && !p.name?.toLowerCase().includes(token.value.toLowerCase())) return false
      }

      // 5. Query Search String
      if (query.trim()) {
        const q = query.toLowerCase().trim()
        const matchesName = p.name.toLowerCase().includes(q)
        const matchesSector = p.sector.toLowerCase().includes(q)
        const matchesBuilder = p.builder?.name?.toLowerCase().includes(q)
        if (!matchesName && !matchesSector && !matchesBuilder) return false
      }

      return true
    })
  }, [projects, statusFilter, healthFilter, priceFilter, activeTokens, query])

  // Sorting
  const sortedAndFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name)
      } else if (sortField === 'builder') {
        cmp = (a.builder?.name || '').localeCompare(b.builder?.name || '')
      } else if (sortField === 'status') {
        cmp = a.status.localeCompare(b.status)
      } else if (sortField === 'price') {
        cmp = priceMinVal(a.unit_types) - priceMinVal(b.unit_types)
      } else if (sortField === 'health') {
        cmp = quickHealth(a).score - quickHealth(b).score
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortField, sortOrder])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const getProjectImage = useCallback((p: Project): string | null => {
    return p.images?.find(i => i.type === 'hero')?.url
      ?? p.images?.[0]?.url
      ?? p.hero_image_url
      ?? null
  }, [])

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeleting(id)

    const deletePromise = async () => {
      try {
        const res = await adminFetch(`/admin/projects/${id}`, { method: 'DELETE' })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Failed to delete project')
        }
        setProjects((p) => p.filter((x) => x.id !== id))
        return `Deleted ${name}`
      } finally {
        setDeleting('')
      }
    }

    toast.promise(deletePromise(), {
      loading: 'Deleting project...',
      success: (msg) => {
        setDeleting(null)
        return msg
      },
      error: (err: any) => {
        setDeleting(null)
        return err?.message || 'Failed to delete project'
      }
    })
  }, [])

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      'Name', 'Slug', 'Builder', 'Sector', 'City', 'Status',
      'Min Price (Cr)', 'Price Range Display', 'RERA No', 'Non-Media Score (%)', 'Total Score (%)'
    ]
    const rows = sortedAndFiltered.map(p => [
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.slug || '').replace(/"/g, '""')}"`,
      `"${(p.builder?.name || '').replace(/"/g, '""')}"`,
      `"${(p.sector || '').replace(/"/g, '""')}"`,
      `"${(p.city || '').replace(/"/g, '""')}"`,
      `"${(p.status || '').replace(/"/g, '""')}"`,
      p.unit_types && p.unit_types.length ? Math.min(...p.unit_types.map(u => u.price_min_cr).filter((v): v is number => v !== null)) || '' : '',
      `"${priceRange(p.unit_types)}"`,
      `"${(p.rera_number || '').replace(/"/g, '""')}"`,
      getNonMediaScore(p),
      p.completenessScore ?? quickHealth(p).score
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `realtypals_projects_${statusFilter}_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Exported ${sortedAndFiltered.length} projects to CSV`)
  }

  // Handle CSV file drop or upload for Bulk Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setBulkCsvText(text)
      parseCsvData(text)
    }
    reader.readAsText(file)
  }

  const parseCsvData = (text: string) => {
    try {
      const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0)
      if (lines.length < 2) {
        setBulkParsedRows([])
        return
      }
      const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase())
      const rows = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/^["']|["']$/g, '').trim())
        const rowObj: any = {}
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] || ''
        })
        rows.push(rowObj)
      }
      setBulkParsedRows(rows)
    } catch (err) {
      toast.error('Failed to parse CSV data')
    }
  }

  const handleDownloadTemplate = () => {
    const headers = ['slug', 'price_min_cr', 'price_range_label', 'status', 'possession_label', 'rera_number']
    const sampleRows = [
      'mahagun-moderne-sector-78,1.45,₹1.45–2.80 Cr,ready_to_move,Ready to Move,UPRERAPRJ1234',
      'ats-kingston-heath-sector-150,2.10,₹2.10–4.50 Cr,under_construction,Q4 2026,UPRERAPRJ5678'
    ]
    const content = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...sampleRows].join('\n')
    const link = document.createElement('a')
    link.setAttribute('href', encodeURI(content))
    link.setAttribute('download', 'bulk_projects_update_template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExecuteBulkImport = async () => {
    if (bulkParsedRows.length === 0) return
    setIsImporting(true)
    setBulkImportResult(null)

    try {
      const res = await adminFetch('/admin/projects/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: bulkParsedRows })
      })
      const data = await res.json()
      if (res.ok) {
        setBulkImportResult(data)
        toast.success(`Successfully updated ${data.updated} projects!`)
        load()
      } else {
        toast.error(data.error || 'Bulk import failed')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Bulk import network error')
    } finally {
      setIsImporting(false)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null
      const isEditable = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA' || activeEl?.contentEditable === 'true'
      if (isEditable && !['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) return

      if (e.key === '/') {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(sortedAndFiltered.length - 1, prev + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(0, prev - 1))
      } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < sortedAndFiltered.length) {
        e.preventDefault()
        router.push(`/admin/projects/${sortedAndFiltered[selectedIndex].id}`)
      } else if (e.key === 'Escape') {
        searchInputRef.current?.blur()
        setIsPopoverOpen(false)
        setSelectedIndex(-1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sortedAndFiltered, selectedIndex, router])

  useEffect(() => setSelectedIndex(-1), [query, activeTokens, statusFilter])

  const counts = useMemo(() => {
    return {
      all: projects.length,
      ready: projects.filter(p => p.status === 'ready_to_move').length,
      under: projects.filter(p => p.status === 'under_construction').length,
      new: projects.filter(p => p.status === 'new_launch').length,
      partially: projects.filter(p => getNonMediaScore(p) < 70).length,
    }
  }, [projects])

  const clearAllFilters = () => {
    setQuery('')
    setActiveTokens([])
    setStatusFilter('all')
    setHealthFilter('all')
    setPriceFilter('all')
  }

  const isFilteringActive = activeTokens.length > 0 || statusFilter !== 'all' || healthFilter !== 'all' || priceFilter !== 'all' || query.trim() !== ''

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 p-4 md:p-8">

      {/* ── Sub-Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Projects Catalog</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 rounded-full">
              {sortedAndFiltered.length} of {projects.length} Listed
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
            Manage properties, completeness scores, pricing details, and RERA compliance.
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl shadow-xs hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer active:scale-[0.98]"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-blue-500' : 'text-zinc-500'} />
            <span>Reload</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl shadow-xs hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer active:scale-[0.98]"
            title="Export filtered project list as CSV"
          >
            <Download size={14} className="text-zinc-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 rounded-xl shadow-xs hover:bg-blue-100/80 transition-all cursor-pointer active:scale-[0.98]"
            title="Bulk upload spreadsheet to update prices, possession, and statuses"
          >
            <Upload size={14} className="text-blue-600 dark:text-blue-400" />
            <span>Bulk Update</span>
          </button>

          <Link
            href="/admin/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus size={15} />
            <span>New Project</span>
          </Link>
        </div>
      </div>


      {/* ── Tokenized Intelligent Search Bar ───────────────────────────────── */}
      <div className="relative" ref={popoverRef}>
        <div className="group flex items-center flex-wrap gap-2 px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
          <Search size={16} className="text-zinc-400 group-focus-within:text-blue-500 transition-colors shrink-0 ml-1" />
          
          {/* Active Token Chips */}
          {activeTokens.map(t => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 animate-in fade-in zoom-in duration-150"
            >
              {t.type === 'builder' && <Building2 size={12} className="text-blue-500" />}
              {t.type === 'sector' && <MapPin size={12} className="text-blue-500" />}
              <span>{t.label}</span>
              <button
                type="button"
                onClick={() => removeFilterToken(t.id)}
                className="p-0.5 rounded-md hover:bg-blue-200/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-300 transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            </span>
          ))}

          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onFocus={() => setIsPopoverOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsPopoverOpen(true)
            }}
            placeholder={activeTokens.length === 0 ? "Type builder name, sector (e.g. Mahagun, Sector 79), or project title..." : "Add filter..."}
            className="flex-1 min-w-[200px] bg-transparent border-none outline-none text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 py-1"
          />

          <div className="hidden sm:flex items-center gap-2 opacity-60 shrink-0 mr-1">
            <kbd className="px-2 py-0.5 text-[10px] font-bold font-mono rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">/</kbd>
            <span className="text-[11px] text-zinc-500">shortcut</span>
          </div>
        </div>

        {/* Autocomplete Suggestions Popover */}
        {isPopoverOpen && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden p-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 px-3 py-1.5">
              Suggested Filter Matches
            </div>
            {suggestions.map((s, idx) => (
              <button
                key={`${s.type}_${s.value}_${idx}`}
                type="button"
                onClick={() => addFilterToken(s)}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  {s.type === 'builder' && <Building2 size={14} className="text-zinc-600 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />}
                  {s.type === 'sector' && <MapPin size={14} className="text-zinc-600 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />}
                  <span>{s.label}</span>
                </div>
                {s.count && (
                  <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                    {s.count} properties
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Segmented Micro-Filter Bar ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 bg-zinc-100/80 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/60">
        
        {/* Status Segmented Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'all', label: 'All Statuses', count: counts.all },
            { id: 'ready_to_move', label: 'Ready to Move', count: counts.ready },
            { id: 'under_construction', label: 'Under Construction', count: counts.under },
            { id: 'new_launch', label: 'New Launch', count: counts.new },
            { id: 'partially_filled', label: '⚠ Partially Filled', count: counts.partially },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded-md ${
                statusFilter === tab.id
                  ? (tab.id === 'partially_filled' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white')
                  : 'bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Health & Price Custom Dropdowns */}
        <div className="flex items-center gap-2">
          {/* Health Filter */}
          <CustomSelect
            value={healthFilter}
            onChange={(val) => setHealthFilter(val)}
            options={[
              { value: 'all', label: 'Health: All' },
              { value: 'excellent', label: 'Excellent (95–100%)', icon: <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /> },
              { value: 'good', label: 'Good (80–94%)', icon: <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" /> },
              { value: 'needs_fix', label: 'Needs Action (<80%)', icon: <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" /> },
            ]}
          />

          {/* Price Range Filter */}
          <CustomSelect
            value={priceFilter}
            onChange={(val) => setPriceFilter(val)}
            options={[
              { value: 'all', label: 'Pricing: All' },
              { value: 'under_1cr', label: '< ₹1.0 Cr' },
              { value: '1_2cr', label: '₹1.0–2.0 Cr' },
              { value: '2_4cr', label: '₹2.0–4.0 Cr' },
              { value: 'above_4cr', label: '> ₹4.0 Cr' },
            ]}
          />

          {/* Reset Filters */}
          {isFilteringActive && (
            <button
              onClick={clearAllFilters}
              className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
            >
              <X size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>

      </div>

      {/* ── Table Container ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs overflow-hidden">
        
        {/* Table Header with Interactive Column Sorting */}
        <div className="flex items-center px-6 py-3 bg-zinc-50/80 dark:bg-zinc-800/50 border-b border-zinc-200/80 dark:border-zinc-800/80 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider select-none">
          <div className="w-8 mr-4" /> {/* Thumbnail space */}
          
          <button
            onClick={() => toggleSort('name')}
            className="flex-1 flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer text-left"
          >
            <span>Property & Developer</span>
            {sortField === 'name' ? (
              sortOrder === 'asc' ? <ArrowUp size={12} className="text-blue-500" /> : <ArrowDown size={12} className="text-blue-500" />
            ) : (
              <ArrowUpDown size={12} className="opacity-40" />
            )}
          </button>

          <button
            onClick={() => toggleSort('status')}
            className="w-[140px] hidden md:flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <span>Status</span>
            {sortField === 'status' ? (
              sortOrder === 'asc' ? <ArrowUp size={12} className="text-blue-500" /> : <ArrowDown size={12} className="text-blue-500" />
            ) : (
              <ArrowUpDown size={12} className="opacity-40" />
            )}
          </button>

          <button
            onClick={() => toggleSort('price')}
            className="w-[120px] hidden sm:flex items-center justify-end gap-1.5 pr-6 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <span>Pricing</span>
            {sortField === 'price' ? (
              sortOrder === 'asc' ? <ArrowUp size={12} className="text-blue-500" /> : <ArrowDown size={12} className="text-blue-500" />
            ) : (
              <ArrowUpDown size={12} className="opacity-40" />
            )}
          </button>

          <button
            onClick={() => toggleSort('health')}
            className="w-[90px] hidden sm:flex items-center justify-end gap-1.5 pr-6 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <span>Health</span>
            {sortField === 'health' ? (
              sortOrder === 'asc' ? <ArrowUp size={12} className="text-blue-500" /> : <ArrowDown size={12} className="text-blue-500" />
            ) : (
              <ArrowUpDown size={12} className="opacity-40" />
            )}
          </button>

          <div className="w-[60px]" /> {/* Actions */}
        </div>

        {/* Table Body */}
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {loading ? (
            <div className="p-6"><UniversalLoader variant="skeleton-list" rows={10} /></div>
          ) : sortedAndFiltered.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mb-3">
                <Building2 size={24} />
              </div>
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">No properties match active filters</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
                Try removing filter tags or expanding your price/status selections.
              </p>
              <button
                onClick={clearAllFilters}
                className="mt-4 px-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 rounded-xl hover:bg-blue-100 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            sortedAndFiltered.map((p, idx) => {
              const s = STATUS_MAP[p.status] ?? STATUS_MAP.ready_to_move
              const { score, missing } = quickHealth(p)
              const pct = score
              const isSelected = selectedIndex === idx

              return (
                <Link
                  key={p.id}
                  href={`/admin/projects/${p.id}`}
                  className={`group flex items-center px-6 py-3.5 transition-colors outline-none ${
                    isSelected ? 'bg-blue-50/50 dark:bg-blue-950/30' : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40'
                  }`}
                  onClick={() => setSelectedIndex(idx)}
                >
                  {/* Thumbnail */}
                  <div className="mr-4">
                    <ProjectThumbnail
                      src={getProjectImage(p)}
                      alt={p.name}
                    />
                  </div>
                  
                  {/* Title & Location */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {p.name}
                      </p>
                      {isSelected && <CornerDownLeft size={13} className="text-blue-500 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 truncate font-medium">
                      <span className="truncate">{p.builder?.name || 'Unknown Builder'}</span>
                      <span className="w-1 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                      <span className="truncate">{p.sector}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="w-[140px] hidden md:flex items-center">
                    <div className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${s.chip} flex items-center gap-1.5 shadow-2xs`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      <span>{s.label}</span>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="w-[120px] hidden sm:block text-right pr-6">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-mono tracking-tight">
                      {priceRange(p.unit_types)}
                    </span>
                  </div>

                  {/* Health Score */}
                  <div className="w-[100px] hidden sm:flex justify-end pr-6 relative group/health">
                    <div
                      className={`flex items-center gap-1.5 text-xs font-bold tabular-nums px-2.5 py-1 rounded-xl border shadow-2xs transition-all ${
                        pct >= 95
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60'
                          : pct >= 80
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60'
                          : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60'
                      }`}
                    >
                      {pct >= 95 && <CheckCircle2 size={12} className="text-emerald-500" strokeWidth={2.5} />}
                      <span>{pct}%</span>
                    </div>

                    {/* Section Breakdown Tooltip */}
                    <div className="absolute right-0 bottom-full mb-2 hidden group-hover/health:block w-48 bg-zinc-900 text-white rounded-2xl p-3 shadow-xl z-50 text-[10px] space-y-1.5 border border-zinc-700/60 animate-in fade-in duration-150">
                      <div className="font-bold border-b border-zinc-800 pb-1 text-zinc-400 uppercase tracking-wider flex justify-between">
                        <span>Section Health</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="flex justify-between font-medium"><span>Core Info:</span><span className="font-mono font-bold text-emerald-400">{(p as any).tabScores?.core ?? 100}%</span></div>
                      <div className="flex justify-between font-medium"><span>Pricing & Loc:</span><span className="font-mono font-bold text-emerald-400">{(p as any).tabScores?.pricing ?? 100}%</span></div>
                      <div className="flex justify-between font-medium"><span>Media:</span><span className="font-mono font-bold text-amber-400">{(p as any).tabScores?.media ?? 70}%</span></div>
                      <div className="flex justify-between font-medium"><span>Intelligence:</span><span className="font-mono font-bold text-emerald-400">{(p as any).tabScores?.intelligence ?? 100}%</span></div>
                      <div className="flex justify-between font-medium"><span>Updates:</span><span className="font-mono font-bold text-emerald-400">{(p as any).tabScores?.updates ?? 100}%</span></div>
                      <div className="flex justify-between font-medium"><span>Partners:</span><span className="font-mono font-bold text-emerald-400">{(p as any).tabScores?.partners ?? 100}%</span></div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="w-[60px] flex items-center justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.preventDefault()
                        handleDelete(p.id, p.name)
                      }} 
                      disabled={deleting === p.id}
                      className="p-1.5 text-zinc-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer dark:text-zinc-400"
                      aria-label="Delete"
                      title="Delete property"
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

      {/* ── Bulk CSV Import & Update Modal ──────────────────────────────────── */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Bulk Update Projects (CSV)
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Batch update Base Price, status, possession dates, or RERA numbers.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsBulkModalOpen(false)
                  setBulkParsedRows([])
                  setBulkCsvText('')
                  setBulkImportResult(null)
                }}
                className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Template Download Prompt */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 text-xs">
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                <FileText size={16} className="text-blue-500" />
                <span>Need the standard CSV format? Download the sample template.</span>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Download size={13} />
                <span>Template.csv</span>
              </button>
            </div>

            {/* File Upload / Paste Area */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Upload CSV File or Paste Data
              </label>

              <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 text-center hover:border-blue-500 transition-colors bg-zinc-50/50 dark:bg-zinc-800/30">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="bulk-csv-input"
                />
                <label
                  htmlFor="bulk-csv-input"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-200 shadow-2xs hover:bg-zinc-50 transition-all"
                >
                  <Upload size={14} className="text-blue-500" />
                  <span>Choose CSV File</span>
                </label>
                <p className="text-[11px] text-zinc-400 mt-2">
                  Columns: <code className="font-mono text-zinc-600 dark:text-zinc-300">slug, price_min_cr, price_range_label, status, possession_label, rera_number</code>
                </p>
              </div>
            </div>

            {/* Rows Preview */}
            {bulkParsedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    <span>Parsed {bulkParsedRows.length} project updates ready to apply</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkParsedRows([])
                      setBulkCsvText('')
                    }}
                    className="text-[11px] text-zinc-400 hover:text-rose-500"
                  >
                    Clear
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-700 text-[11px] divide-y divide-zinc-100 dark:divide-zinc-800">
                  {bulkParsedRows.slice(0, 5).map((row, idx) => (
                    <div key={idx} className="p-2 flex items-center justify-between bg-white dark:bg-zinc-900 font-mono">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{row.slug || row.id}</span>
                      <div className="flex items-center gap-2 text-zinc-500">
                        {row.price_min_cr && <span>₹{row.price_min_cr} Cr</span>}
                        {row.status && <span className="px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800">{row.status}</span>}
                      </div>
                    </div>
                  ))}
                  {bulkParsedRows.length > 5 && (
                    <div className="p-2 text-center text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                      + {bulkParsedRows.length - 5} more rows
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Import Result Notification */}
            {bulkImportResult && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
                <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 size={15} />
                  <span>Bulk update complete: {bulkImportResult.updated} updated, {bulkImportResult.skipped} skipped</span>
                </div>
                {bulkImportResult.errors?.length > 0 && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400">
                    {bulkImportResult.errors.length} rows had errors. Check audit changelog for details.
                  </p>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setIsBulkModalOpen(false)
                  setBulkParsedRows([])
                  setBulkImportResult(null)
                }}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={bulkParsedRows.length === 0 || isImporting}
                onClick={handleExecuteBulkImport}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Applying Updates...</span>
                  </>
                ) : (
                  <>
                    <Upload size={13} />
                    <span>Apply {bulkParsedRows.length} Updates</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

