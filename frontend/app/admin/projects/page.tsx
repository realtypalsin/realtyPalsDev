'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Plus, CheckCircle2, Clock, Zap, Pencil, Trash2, ImageOff, ShieldOff, Building2 } from 'lucide-react'

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
    </div>
  )
}
