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
  Download, Upload, AlertTriangle, FileSpreadsheet, FileText, Copy, CheckCheck, FileJson, Sliders,
  CheckSquare, Square, SlidersHorizontal, ArrowRight, ShieldAlert, Cpu
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

interface UnitType { bhk: number; price_min_cr: number | null; price_max_cr: number | null; super_area_sqft?: number | null; carpet_area_sqft?: number | null }

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
  address?: string | null
  possession_label?: string | null
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

export type ProjectTabKey = 'core' | 'specifications' | 'pricing' | 'location' | 'intelligence' | 'updates' | 'partners'

const PROPERTY_TABS_CONFIG: Array<{ id: ProjectTabKey; label: string; description: string }> = [
  { id: 'core', label: 'Core Info', description: 'Name, Builder, UP RERA No., Tagline, Overview' },
  { id: 'specifications', label: 'Specifications', description: 'BHK Units, Carpet Area, Super Area, Bathrooms' },
  { id: 'pricing', label: 'Pricing & Cost Sheet', description: 'Price Range, Base Rate, EDC/IDC, Parking, Payment Plans' },
  { id: 'location', label: 'Location & Connectivity', description: 'Address, GPS Coordinates, Metro, Highway Distance' },
  { id: 'intelligence', label: 'Intelligence & Analysis', description: 'Sector Stage, 5-Yr CAGR, Livability, Why Buy/Avoid' },
  { id: 'updates', label: 'Updates & Timeline', description: 'Launch Date, Possession Date, Construction Stage, RERA Expiry' },
  { id: 'partners', label: 'Channel Partners', description: 'Direct Sales Office, Broker Commission Schedule' },
]

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
  return typeof p.completenessScore === 'number' ? p.completenessScore : quickHealth(p).score
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
  return { score: typeof p.completenessScore === 'number' ? p.completenessScore : scorePct, missing }
}

function getMissingFieldsForSelectedTabs(p: Project, tabs: Set<ProjectTabKey>): string[] {
  const missing: string[] = []
  const unitTypes = p.unit_types || []

  if (tabs.has('core')) {
    if (!p.rera_number) missing.push('UP RERA Number')
    if (!p.builder?.name) missing.push('Builder / Developer Name')
    if (!p.description || p.description.length < 20) missing.push('Project Overview / Tagline')
  }
  if (tabs.has('specifications')) {
    if (unitTypes.length === 0) missing.push('BHK Unit Configurations & Floor Plans')
    else if (!unitTypes.some(u => u.super_area_sqft)) missing.push('Super Area & Carpet Area (sq.ft)')
  }
  if (tabs.has('pricing')) {
    if (!unitTypes.some(u => u.price_min_cr != null)) missing.push('Price Range & Base Rate per sq.ft')
  }
  if (tabs.has('location')) {
    if (!p.address) missing.push('Exact Plot Address & GPS Coordinates')
    if (!p.connectivity || p.connectivity.length < 2) missing.push('Nearest Metro & Expressway Connectivity')
  }
  if (tabs.has('intelligence')) {
    if (!p.amenities || p.amenities.length < 3) missing.push('Project Amenities & Lifestyle Highlights')
  }
  if (tabs.has('updates')) {
    if (p.status !== 'ready_to_move' && !p.possession_label) missing.push('Possession Timeline & Construction Milestone')
  }

  return Array.from(new Set(missing))
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
  const [healthFilter, setHealthFilter] = useState<'all' | 'under_60' | 'under_80' | 'under_90' | 'critical' | 'good' | 'excellent'>('all')
  const [priceFilter, setPriceFilter] = useState<'all' | 'under_1cr' | '1_2cr' | '2_4cr' | 'above_4cr'>('all')

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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

  // AI Data Enrichment Modal State
  const [isAgentExportOpen, setIsAgentExportOpen] = useState(false)
  const [healthThreshold, setHealthThreshold] = useState<number>(80)
  const [exportScope, setExportScope] = useState<'threshold' | 'selected'>('threshold')
  const [selectedTabs, setSelectedTabs] = useState<Set<ProjectTabKey>>(
    new Set(['core', 'specifications', 'pricing', 'location', 'intelligence', 'updates', 'partners'])
  )
  const [copiedPrompt, setCopiedPrompt] = useState(false)

  // Autocomplete Popover
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)

  // ── Session Storage Persistence ──────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('realtypals_admin_projects_filters')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.query !== undefined) setQuery(parsed.query)
        if (parsed.activeTokens) setActiveTokens(parsed.activeTokens)
        if (parsed.statusFilter) setStatusFilter(parsed.statusFilter)
        if (parsed.healthFilter) setHealthFilter(parsed.healthFilter)
        if (parsed.priceFilter) setPriceFilter(parsed.priceFilter)
        if (parsed.sortField) setSortField(parsed.sortField)
        if (parsed.sortOrder) setSortOrder(parsed.sortOrder)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const stateToSave = { query, activeTokens, statusFilter, healthFilter, priceFilter, sortField, sortOrder }
      sessionStorage.setItem('realtypals_admin_projects_filters', JSON.stringify(stateToSave))
    } catch {}
  }, [query, activeTokens, statusFilter, healthFilter, priceFilter, sortField, sortOrder])

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

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // ── Combined Filtering and Sorting ───────────────────────────────────────
  const sortedAndFiltered = useMemo(() => {
    return projects
      .filter((p) => {
        // Status filter
        if (statusFilter === 'partially_filled') {
          if (getNonMediaScore(p) >= 100) return false
        } else if (statusFilter !== 'all' && p.status !== statusFilter) {
          return false
        }

        // Health filter
        const health = getNonMediaScore(p)
        if (healthFilter === 'under_60' && health >= 60) return false
        if (healthFilter === 'under_80' && health >= 80) return false
        if (healthFilter === 'under_90' && health >= 90) return false
        if (healthFilter === 'critical' && health >= 70) return false
        if (healthFilter === 'good' && (health < 70 || health >= 90)) return false
        if (healthFilter === 'excellent' && health < 90) return false

        // Price filter
        const minP = priceMinVal(p.unit_types)
        if (priceFilter === 'under_1cr' && (minP === 0 || minP >= 1.0)) return false
        if (priceFilter === '1_2cr' && (minP < 1.0 || minP >= 2.0)) return false
        if (priceFilter === '2_4cr' && (minP < 2.0 || minP >= 4.0)) return false
        if (priceFilter === 'above_4cr' && minP < 4.0) return false

        // Active tokens filter
        for (const token of activeTokens) {
          if (token.type === 'builder' && p.builder?.name?.toLowerCase() !== token.value.toLowerCase()) return false
          if (token.type === 'sector' && p.sector?.toLowerCase() !== token.value.toLowerCase()) return false
          if (token.type === 'name' && !p.name.toLowerCase().includes(token.value.toLowerCase())) return false
        }

        // Plaintext query filter
        if (query.trim()) {
          const q = query.toLowerCase().trim()
          const matchName = p.name.toLowerCase().includes(q)
          const matchBuilder = p.builder?.name?.toLowerCase().includes(q)
          const matchSector = p.sector?.toLowerCase().includes(q)
          if (!matchName && !matchBuilder && !matchSector) return false
        }

        return true
      })
      .sort((a, b) => {
        let diff = 0
        if (sortField === 'name') diff = a.name.localeCompare(b.name)
        else if (sortField === 'builder') diff = (a.builder?.name || '').localeCompare(b.builder?.name || '')
        else if (sortField === 'status') diff = a.status.localeCompare(b.status)
        else if (sortField === 'price') diff = priceMinVal(a.unit_types) - priceMinVal(b.unit_types)
        else if (sortField === 'health') diff = getNonMediaScore(a) - getNonMediaScore(b)
        return sortOrder === 'asc' ? diff : -diff
      })
  }, [projects, statusFilter, healthFilter, priceFilter, activeTokens, query, sortField, sortOrder])

  // Multi-Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.size === sortedAndFiltered.length && sortedAndFiltered.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sortedAndFiltered.map(p => p.id)))
    }
  }

  const handleToggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAllDeficient = (threshold: number) => {
    const ids = projects.filter(p => getNonMediaScore(p) < threshold).map(p => p.id)
    setSelectedIds(new Set(ids))
    toast.success(`Selected ${ids.length} projects under ${threshold}% health`)
  }

  const toggleTabFilter = (tabId: ProjectTabKey) => {
    setSelectedTabs(prev => {
      const next = new Set(prev)
      if (next.has(tabId)) {
        if (next.size > 1) next.delete(tabId)
        else toast.error('At least one tab must remain selected')
      } else {
        next.add(tabId)
      }
      return next
    })
  }

  const counts = useMemo(() => {
    return {
      all: projects.length,
      ready: projects.filter(p => p.status === 'ready_to_move').length,
      under: projects.filter(p => p.status === 'under_construction').length,
      new: projects.filter(p => p.status === 'new_launch').length,
      partially: projects.filter(p => getNonMediaScore(p) < 100).length,
    }
  }, [projects])

  // ── AI Agent Enrichment Target Project Computation ───────────────────────
  const targetAgentProjects = useMemo(() => {
    let pool = projects
    if (exportScope === 'selected' && selectedIds.size > 0) {
      pool = projects.filter(p => selectedIds.has(p.id))
    } else {
      pool = projects.filter(p => getNonMediaScore(p) < healthThreshold)
    }

    return pool
      .map((p) => {
        const score = getNonMediaScore(p)
        const missing = getMissingFieldsForSelectedTabs(p, selectedTabs)
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          builder: p.builder?.name || 'Unknown Developer',
          sector: p.sector || 'Noida',
          city: p.city || 'Noida',
          status: p.status,
          priceRange: priceRange(p.unit_types),
          score,
          missingFields: missing.length > 0 ? missing : ['Specification & Detail Verification'],
        }
      })
      .sort((a, b) => a.score - b.score)
  }, [projects, healthThreshold, exportScope, selectedIds, selectedTabs])

  const generateAgentPromptText = useCallback(() => {
    const projectList = targetAgentProjects.map((p) => ({
      projectName: p.name,
      slug: p.slug,
      developer: p.builder,
      sector: p.sector,
      city: p.city,
      status: p.status,
      priceRange: p.priceRange,
      currentHealthScore: `${p.score}%`,
      missingOrIncompleteFields: p.missingFields,
    }))

    const tabNames = Array.from(selectedTabs).map(t => PROPERTY_TABS_CONFIG.find(c => c.id === t)?.label).filter(Boolean).join(', ')

    return `You are an Expert Real Estate Research Agent specializing in verified property intelligence for Noida and Greater Noida (NCR).

We have ${targetAgentProjects.length} property projects in our database requiring verified enrichment for the following property tabs:
[${tabNames}].

Please research and provide verified, RERA-compliant details strictly for the missing/incomplete fields listed for each project:

TARGET PROJECTS FOR ENRICHMENT (${targetAgentProjects.length}):
\`\`\`json
${JSON.stringify(projectList, null, 2)}
\`\`\`

OUTPUT FORMAT REQUIREMENT:
Provide structured JSON with the exact verified data for each project so it can be updated directly into the database.`
  }, [targetAgentProjects, selectedTabs])

  const handleCopyAgentPrompt = () => {
    const text = generateAgentPromptText()
    navigator.clipboard.writeText(text)
    setCopiedPrompt(true)
    toast.success(`Copied enrichment prompt for ${targetAgentProjects.length} projects!`)
    setTimeout(() => setCopiedPrompt(false), 2500)
  }

  const handleDownloadAgentJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(targetAgentProjects, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute("href", dataStr)
    downloadAnchor.setAttribute("download", `realtypals-enrichment-${targetAgentProjects.length}-projects.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
    toast.success(`Downloaded JSON for ${targetAgentProjects.length} projects`)
  }

  const handleDownloadAgentCSV = () => {
    const headers = ['Project Name', 'Slug', 'Developer', 'Sector', 'City', 'Status', 'Health Score %', 'Missing Fields']
    const rows = targetAgentProjects.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.slug}"`,
      `"${p.builder.replace(/"/g, '""')}"`,
      `"${p.sector}"`,
      `"${p.city}"`,
      `"${p.status}"`,
      `${p.score}%`,
      `"${p.missingFields.join('; ').replace(/"/g, '""')}"`,
    ])
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `realtypals-enrichment-${targetAgentProjects.length}-projects.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success(`Exported ${targetAgentProjects.length} projects to CSV`)
  }

  const handleExportCSV = () => {
    const headers = ['Name', 'Slug', 'Builder', 'Sector', 'Status', 'Pricing', 'Health %']
    const rows = sortedAndFiltered.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.slug}"`,
      `"${(p.builder?.name || '').replace(/"/g, '""')}"`,
      `"${p.sector}"`,
      `"${p.status}"`,
      `"${priceRange(p.unit_types)}"`,
      `${getNonMediaScore(p)}%`,
    ])
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `projects-catalog-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success(`Exported ${sortedAndFiltered.length} projects to CSV`)
  }

  const handleExecuteBulkImport = async () => {
    if (bulkParsedRows.length === 0) return
    setIsImporting(true)
    try {
      const res = await adminFetch('/admin/projects/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: bulkParsedRows }),
      })
      const result = await res.json()
      if (res.ok) {
        setBulkImportResult(result)
        toast.success(`Bulk updated ${result.updated} projects successfully!`)
        load()
      } else {
        toast.error(result.error || 'Bulk update failed')
      }
    } catch {
      toast.error('Network error during bulk update')
    } finally {
      setIsImporting(false)
    }
  }

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
            onClick={() => {
              setExportScope(selectedIds.size > 0 ? 'selected' : 'threshold')
              setIsAgentExportOpen(true)
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl shadow-xs hover:bg-indigo-100/80 dark:hover:bg-indigo-900/40 transition-all cursor-pointer active:scale-[0.98]"
            title="Export incomplete projects & missing tab fields for data enrichment"
          >
            <SlidersHorizontal size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span>Export Incomplete Data {selectedIds.size > 0 ? `(${selectedIds.size} Selected)` : ''}</span>
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
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs transition-all cursor-pointer active:scale-[0.98]"
          >
            <Plus size={14} />
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
            onChange={(e) => {
              setQuery(e.target.value)
              setIsPopoverOpen(true)
            }}
            onFocus={() => setIsPopoverOpen(true)}
            placeholder={activeTokens.length === 0 ? "Type builder name, sector (e.g. Mahagun, Sector 75), or project title..." : "Add more filters..."}
            className="flex-1 bg-transparent border-none outline-none text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 min-w-[200px]"
          />

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded">/ shortcut</span>
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Autocomplete Suggestions Popover */}
        {isPopoverOpen && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 p-2 space-y-1 animate-in fade-in duration-150">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Quick Filters</div>
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => addFilterToken(s)}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                  {s.type === 'builder' && <Building2 size={13} className="text-zinc-400 group-hover:text-blue-500" />}
                  {s.type === 'sector' && <MapPin size={13} className="text-zinc-400 group-hover:text-blue-500" />}
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
              { value: 'under_60', label: 'Target < 60% Health', icon: <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" /> },
              { value: 'under_80', label: 'Target < 80% Health', icon: <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" /> },
              { value: 'under_90', label: 'Target < 90% Health', icon: <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" /> },
              { value: 'excellent', label: 'Complete (90–100%)', icon: <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /> },
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
        
        {/* Table Header with Interactive Column Sorting & Master Checkbox */}
        <div className="flex items-center px-6 py-3 bg-zinc-50/80 dark:bg-zinc-800/50 border-b border-zinc-200/80 dark:border-zinc-800/80 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider select-none">
          
          {/* Select All Checkbox */}
          <button
            type="button"
            onClick={handleToggleSelectAll}
            className="mr-3 p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
            title="Select all visible projects"
          >
            {selectedIds.size > 0 && selectedIds.size === sortedAndFiltered.length ? (
              <CheckSquare size={16} className="text-blue-600 dark:text-blue-400" />
            ) : selectedIds.size > 0 ? (
              <div className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center text-[10px] font-black leading-none">
                -
              </div>
            ) : (
              <Square size={16} />
            )}
          </button>

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
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No properties found</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm">No properties match your current search and filter combination.</p>
              {isFilteringActive && (
                <button
                  onClick={clearAllFilters}
                  className="mt-4 px-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            sortedAndFiltered.map((project) => {
              const statusCfg = STATUS_MAP[project.status] || STATUS_MAP.ready_to_move
              const StatusIcon = statusCfg.icon
              const healthScore = getNonMediaScore(project)
              const isSelected = selectedIds.has(project.id)

              return (
                <div
                  key={project.id}
                  onClick={() => router.push(`/admin/projects/${project.id}`)}
                  className={`flex items-center px-6 py-3.5 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group ${
                    isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                  }`}
                >
                  {/* Row Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleSelectRow(project.id, e)}
                    className="mr-3 p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    {isSelected ? (
                      <CheckSquare size={16} className="text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>

                  {/* Thumbnail */}
                  <div className="mr-4">
                    <ProjectThumbnail src={project.hero_image_url} alt={project.name} />
                  </div>

                  {/* Name, Developer & Sector */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {project.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5 truncate">
                      <span>{project.builder?.name || 'Unknown Developer'}</span>
                      <span>•</span>
                      <span>{project.sector}, {project.city}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="w-[140px] hidden md:flex items-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg border ${statusCfg.chip}`}>
                      <StatusIcon size={12} />
                      <span>{statusCfg.label}</span>
                    </span>
                  </div>

                  {/* Pricing Range */}
                  <div className="w-[120px] hidden sm:flex items-center justify-end pr-6 text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">
                    {priceRange(project.unit_types)}
                  </div>

                  {/* Health Score */}
                  <div className="w-[90px] hidden sm:flex items-center justify-end pr-6">
                    <span className={`px-2 py-0.5 text-xs font-mono font-bold rounded-full border ${
                      healthScore >= 90
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60'
                        : healthScore >= 70
                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60'
                        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60'
                    }`}>
                      {healthScore}%
                    </span>
                  </div>

                  {/* Row Action Arrow */}
                  <div className="w-[60px] flex items-center justify-end">
                    <ChevronRight size={15} className="text-zinc-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Sticky Multi-Select Action Bar ─────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-5 py-3 rounded-2xl shadow-2xl border border-zinc-800 dark:border-zinc-200 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{selectedIds.size} Projects Selected</span>
          </div>

          <div className="h-4 w-px bg-zinc-700 dark:bg-zinc-300" />

          <button
            type="button"
            onClick={() => {
              setExportScope('selected')
              setIsAgentExportOpen(true)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <SlidersHorizontal size={13} />
            <span>Export Incomplete Data</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectAllDeficient(80)}
            className="text-xs font-semibold text-zinc-400 hover:text-white dark:hover:text-zinc-900 transition-colors"
          >
            Select All &lt;80%
          </button>

          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="p-1 text-zinc-400 hover:text-rose-400 transition-colors"
            title="Deselect all"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Catalog Data Enrichment & Export Modal (Refined & Spacious) ───── */}
      {isAgentExportOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsAgentExportOpen(false)}
        >
          <div 
            className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-2xs">
                  <SlidersHorizontal size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                    Catalog Data Enrichment & Export
                  </h3>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Select target projects and data categories to extract missing fields for research & bulk update
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAgentExportOpen(false)}
                className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Target Scope Selection & Quick Threshold Chips */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">Target Scope:</span>
                    <span className="text-[11px] text-zinc-400">Choose which projects to analyze</span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <button
                      type="button"
                      onClick={() => setExportScope('threshold')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        exportScope === 'threshold'
                          ? 'bg-indigo-600 text-white shadow-xs font-bold'
                          : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900'
                      }`}
                    >
                      By Health Threshold
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportScope('selected')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        exportScope === 'selected'
                          ? 'bg-indigo-600 text-white shadow-xs font-bold'
                          : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900'
                      }`}
                    >
                      Selected ({selectedIds.size})
                    </button>
                  </div>
                </div>

                {exportScope === 'threshold' && (
                  <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
                    <span className="text-[11px] font-bold text-zinc-500">Quick Thresholds:</span>
                    {[
                      { label: '< 60% (Critical)', val: 60 },
                      { label: '< 80% (Standard)', val: 80 },
                      { label: '< 90% (Refine)', val: 90 },
                      { label: '< 100% (All Incomplete)', val: 100 },
                    ].map((t) => (
                      <button
                        key={t.val}
                        type="button"
                        onClick={() => setHealthThreshold(t.val)}
                        className={`px-3 py-1 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                          healthThreshold === t.val
                            ? 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-200 dark:border-indigo-700 font-bold'
                            : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-indigo-200'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Granular Property Tab Selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Select Data Categories to Inspect:
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      Missing fields will be checked and exported only for the selected categories
                    </p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-md">
                    Media / Images Excluded
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {PROPERTY_TABS_CONFIG.map((tab) => {
                    const isChecked = selectedTabs.has(tab.id)
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => toggleTabFilter(tab.id)}
                        className={`p-3 text-left rounded-2xl border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-indigo-50/70 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800/80 text-zinc-900 dark:text-white shadow-2xs'
                            : 'bg-zinc-50/50 dark:bg-zinc-800/30 border-zinc-200/60 dark:border-zinc-800 text-zinc-400 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-bold ${isChecked ? 'text-indigo-900 dark:text-indigo-200' : 'text-zinc-500'}`}>
                            {tab.label}
                          </span>
                          <div className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                            isChecked ? 'bg-indigo-600 text-white' : 'border border-zinc-300 dark:border-zinc-600'
                          }`}>
                            {isChecked && <Check size={11} strokeWidth={3} />}
                          </div>
                        </div>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                          {tab.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Target Projects Preview List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Target Projects ({targetAgentProjects.length} Records)
                  </span>
                  <span className="text-[11px] text-zinc-400">Sorted by lowest health first</span>
                </div>

                <div className="max-h-72 overflow-y-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800/80 bg-white dark:bg-zinc-900">
                  {targetAgentProjects.length > 0 ? (
                    targetAgentProjects.map((p) => (
                      <div key={p.id} className="p-3.5 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{p.name}</span>
                            <span className="text-[11px] text-zinc-400 font-medium">• {p.builder} • {p.sector}</span>
                          </div>
                          <span className="px-2 py-0.5 text-xs font-mono font-black rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60">
                            {p.score}%
                          </span>
                        </div>
                        
                        {/* Missing Fields Pills */}
                        <div className="flex items-center flex-wrap gap-1.5">
                          {p.missingFields.map((f, i) => (
                            <span key={i} className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60">
                              ✕ {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-10 text-center text-xs text-zinc-400">
                      No projects match the current threshold and selection!
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/80 shrink-0">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleDownloadAgentJSON}
                  disabled={targetAgentProjects.length === 0}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
                  title="Download structured JSON"
                >
                  <FileJson size={14} className="text-zinc-500" />
                  <span>Download JSON</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadAgentCSV}
                  disabled={targetAgentProjects.length === 0}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
                  title="Download spreadsheet CSV"
                >
                  <FileSpreadsheet size={14} className="text-zinc-500" />
                  <span>Download CSV</span>
                </button>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsAgentExportOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  disabled={targetAgentProjects.length === 0}
                  onClick={handleCopyAgentPrompt}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl shadow-sm transition-all cursor-pointer active:scale-[0.98]"
                >
                  {copiedPrompt ? (
                    <>
                      <CheckCheck size={14} className="text-white" />
                      <span>Copied Prompt!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Enrichment Prompt ({targetAgentProjects.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Upload size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Bulk Update Projects</h3>
                  <p className="text-[11px] text-zinc-500">Paste CSV or JSON with slug, price, possession, or status</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600"
              >
                <X size={16} />
              </button>
            </div>

            <textarea
              value={bulkCsvText}
              onChange={(e) => {
                setBulkCsvText(e.target.value)
                try {
                  const lines = e.target.value.trim().split('\n')
                  const parsed = lines.map(line => {
                    const parts = line.split(',').map(s => s.trim())
                    return { slug: parts[0], price_min_cr: parts[1] ? parseFloat(parts[1]) : undefined, status: parts[2] }
                  }).filter(p => p.slug)
                  setBulkParsedRows(parsed)
                } catch {}
              }}
              placeholder="slug,price_min_cr,status&#10;ace-aspire-techzone-4,0.92,ready_to_move&#10;cleo-county-sector-121,1.65,ready_to_move"
              className="w-full h-40 p-3 font-mono text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkParsedRows.length === 0 || isImporting}
                onClick={handleExecuteBulkImport}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl disabled:opacity-50 flex items-center gap-1.5"
              >
                <Upload size={13} />
                <span>Apply {bulkParsedRows.length} Updates</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
