'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Plus, Building2, Globe, CheckCircle2, Pencil, X, Save, Loader2, Search, CornerDownLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { toast } from 'sonner'
import { API_BASE } from '@/lib/env'
import { adminAuthHeaders } from '@/lib/authedFetch'

interface Builder {
  id: string
  name: string
  slug: string
  founded_year: number | null
  headquarters: string | null
  website: string | null
  credai_member: boolean
  delivered_units: number | null
  _count: { projects: number }
}

type FormState = {
  name: string
  slug: string
  founded_year: string
  headquarters: string
  website: string
  credai_member: boolean
  company_overview: string
  delivered_units: string
  rera_compliance_score: string
  iso_certified: boolean
  logo_url: string
}

const EMPTY_FORM: FormState = {
  name: '', slug: '', founded_year: '', headquarters: '', website: '', credai_member: false,
  company_overview: '', delivered_units: '', rera_compliance_score: '', iso_certified: false, logo_url: ''
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function BuilderFormFields({
  form,
  onChange,
}: {
  form: FormState
  onChange: (f: FormState) => void
}) {
  function set(key: keyof FormState) {
    return (v: string | boolean) => onChange({ ...form, [key]: v })
  }

  const fields: { label: string; key: keyof FormState; ph: string; type?: string }[] = [
    { label: 'Name',         key: 'name',          ph: 'ATS Infrastructure' },
    { label: 'Slug',         key: 'slug',          ph: 'ats-infrastructure' },
    { label: 'Founded Year', key: 'founded_year',  ph: '1998',              type: 'number' },
    { label: 'Headquarters', key: 'headquarters',  ph: 'Noida, UP' },
    { label: 'Website',      key: 'website',       ph: 'https://ats.co.in', type: 'url' },
    { label: 'Company Overview', key: 'company_overview', ph: 'Leading real estate developer...' },
    { label: 'Delivered Units', key: 'delivered_units', ph: '5000', type: 'number' },
    { label: 'RERA Score', key: 'rera_compliance_score', ph: '95', type: 'number' },
    { label: 'Logo URL', key: 'logo_url', ph: 'https://...', type: 'url' }
  ]

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {fields.map(({ label, key, ph, type }) => (
        <div key={key}>
          <label className="text-xs font-semibold text-zinc-500 block mb-1">{label}</label>
          <input
            type={type ?? 'text'}
            value={String(form[key])}
            onChange={(e) => {
              const v = e.target.value
              set(key)(v)
              if (key === 'name') onChange({ ...form, name: v, slug: toSlug(v) })
            }}
            placeholder={ph}
            className="w-full border border-zinc-200 rounded-md px-3 py-2 text-[13px] text-zinc-900 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition-all bg-white shadow-sm"
          />
        </div>
      ))}
      <div className="flex items-center gap-6 pt-1 mt-6">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`credai-${form.slug}`}
            checked={form.credai_member}
            onChange={(e) => set('credai_member')(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 accent-zinc-800"
          />
          <label htmlFor={`credai-${form.slug}`} className="text-[13px] text-zinc-700 font-medium cursor-pointer">CREDAI Member</label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`iso-${form.slug}`}
            checked={form.iso_certified}
            onChange={(e) => set('iso_certified')(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 accent-zinc-800"
          />
          <label htmlFor={`iso-${form.slug}`} className="text-[13px] text-zinc-700 font-medium cursor-pointer">ISO Certified</label>
        </div>
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center px-4 py-3 border-b border-zinc-100 gap-4">
      <Skeleton className="w-8 h-8 rounded-md shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 rounded w-1/3" />
        <Skeleton className="h-3 rounded w-1/4" />
      </div>
      <Skeleton className="w-24 h-4 rounded shrink-0" />
      <Skeleton className="w-32 h-4 rounded shrink-0" />
      <Skeleton className="w-16 h-4 rounded shrink-0" />
      <Skeleton className="w-16 h-4 rounded-md shrink-0" />
    </div>
  )
}

export default function AdminBuilders() {
  const [builders, setBuilders]     = useState<Builder[]>([])
  const [loading, setLoading]       = useState(true)
  const [query, setQuery]           = useState('')
  
  const [showAdd, setShowAdd]       = useState(false)
  const [addForm, setAddForm]       = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editForm, setEditForm]     = useState<FormState>(EMPTY_FORM)
  const [editSaving, setEditSaving] = useState(false)

  // Keyboard nav
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)

  useEffect(() => {
    fetch(`${API_BASE}/admin/builders`, { headers: adminAuthHeaders() })
      .then((r) => r.json())
      .then((d) => { setBuilders(d.builders ?? []) })
      .catch(() => toast.error('Failed to load builders'))
      .finally(() => setLoading(false))
  }, [])

  const smartFilter = useCallback((b: Builder) => {
    if (!query) return true
    const q = query.toLowerCase()
    
    // Check for specific tags
    if (q.includes('is:credai') && !b.credai_member) return false
    
    // Clean string search
    const cleanQ = q.replace(/is:\w+/g, '').trim()
    if (!cleanQ) return true
    
    return b.name.toLowerCase().includes(cleanQ) || 
           b.slug.toLowerCase().includes(cleanQ) || 
           (b.headquarters && b.headquarters.toLowerCase().includes(cleanQ))
  }, [query])

  const filtered = builders.filter(smartFilter)

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' && !['ArrowDown', 'ArrowUp', 'Escape'].includes(e.key)) return

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
        const b = filtered[selectedIndex]
        if (editingId === b.id) {
          saveEdit(b.id)
        } else {
          startEdit(b)
        }
      } else if (e.key === 'Escape') {
        if (editingId) setEditingId(null)
        else if (showAdd) setShowAdd(false)
        else {
          searchInputRef.current?.blur()
          setSelectedIndex(-1)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filtered, selectedIndex, editingId, showAdd, saveEdit])

  useEffect(() => setSelectedIndex(-1), [query])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/admin/builders`, {
        method: 'POST',
        headers: { ...adminAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name,
          slug: addForm.slug,
          founded_year: addForm.founded_year ? parseInt(addForm.founded_year) : null,
          headquarters: addForm.headquarters || null,
          website: addForm.website || null,
          credai_member: addForm.credai_member,
          company_overview: addForm.company_overview || null,
          delivered_units: addForm.delivered_units ? parseInt(addForm.delivered_units) : null,
          rera_compliance_score: addForm.rera_compliance_score ? parseInt(addForm.rera_compliance_score) : null,
          iso_certified: addForm.iso_certified,
          logo_url: addForm.logo_url || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to create')
      const created = await res.json()
      setBuilders((prev) => [created.builder, ...prev])
      setShowAdd(false)
      setAddForm(EMPTY_FORM)
      toast.success('Builder created successfully')
    } catch (err: any) {
      toast.error(err.message || 'Error creating builder')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(b: Builder) {
    setEditingId(b.id)
    setEditForm({
      name: b.name,
      slug: b.slug,
      founded_year: b.founded_year ? String(b.founded_year) : '',
      headquarters: b.headquarters || '',
      website: b.website || '',
      credai_member: b.credai_member,
      company_overview: (b as any).company_overview || '',
      delivered_units: (b as any).delivered_units ? String((b as any).delivered_units) : '',
      rera_compliance_score: (b as any).rera_compliance_score ? String((b as any).rera_compliance_score) : '',
      iso_certified: (b as any).iso_certified || false,
      logo_url: (b as any).logo_url || '',
    })
  }

  async function saveEdit(id: string) {
    setEditSaving(true)
    try {
      const res = await fetch(`${API_BASE}/admin/builders/${id}`, {
        method: 'PATCH',
        headers: { ...adminAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          slug: editForm.slug,
          founded_year: editForm.founded_year ? parseInt(editForm.founded_year) : null,
          headquarters: editForm.headquarters || null,
          website: editForm.website || null,
          credai_member: editForm.credai_member,
          company_overview: editForm.company_overview || null,
          delivered_units: editForm.delivered_units ? parseInt(editForm.delivered_units) : null,
          rera_compliance_score: editForm.rera_compliance_score ? parseInt(editForm.rera_compliance_score) : null,
          iso_certified: editForm.iso_certified,
          logo_url: editForm.logo_url || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to update')
      const updated = await res.json()
      setBuilders((prev) => prev.map((x) => x.id === id ? updated : x))
      setEditingId(null)
      toast.success('Changes saved')
    } catch (err: any) {
      toast.error(err.message || 'Error updating builder')
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Builders</h1>
          <p className="text-sm text-zinc-500 mt-1">{builders.length} registered partners</p>
        </div>
        <button
          onClick={() => { setShowAdd(!showAdd); setEditingId(null) }}
          className="flex items-center gap-2 bg-zinc-900 hover:bg-black text-white px-4 py-2 rounded-lg text-[13px] font-medium transition-all shadow-sm"
        >
          {showAdd ? <X size={15} /> : <Plus size={15} />}
          {showAdd ? 'Cancel' : 'New Builder'}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="bg-zinc-50 rounded-xl border border-zinc-200/80 p-6 mb-6 shadow-inner"
        >
          <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3 mb-4">
            <h3 className="text-sm font-semibold text-zinc-900">New Builder Profile</h3>
          </div>
          <BuilderFormFields form={addForm} onChange={setAddForm} />
          <div className="flex justify-end gap-3 pt-4 mt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-zinc-900 hover:bg-black text-white rounded-md text-[13px] font-medium disabled:opacity-40 transition-colors shadow-sm"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      )}

      {/* Notion-style Unified Command Bar */}
      <div className="group flex items-center gap-3 px-4 py-3 bg-white border border-zinc-200/80 rounded-xl shadow-sm mb-6 focus-within:border-zinc-300 focus-within:shadow-md transition-all">
        <Search size={16} className="text-zinc-400 group-focus-within:text-zinc-600 transition-colors" />
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter builders or use tags like is:credai..."
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
          <div className="w-8 mr-4" /> {/* Icon space */}
          <div className="flex-1">Builder Name</div>
          <div className="w-[100px] hidden sm:block text-right">Founded</div>
          <div className="w-[180px] hidden md:block">Headquarters</div>
          <div className="w-[100px] hidden sm:block text-right">Projects</div>
          <div className="w-[80px]" /> {/* Actions */}
        </div>

        {/* Table Body */}
        <div className="divide-y divide-zinc-100">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
          ) : filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <Building2 size={32} className="text-zinc-200 mb-3" />
              <p className="text-[14px] font-medium text-zinc-900">No builders found</p>
              <p className="text-[13px] text-zinc-500 mt-1">Try adjusting your filters.</p>
            </div>
          ) : (
            filtered.map((b, idx) => {
              const isSelected = selectedIndex === idx
              const isEditing = editingId === b.id

              return (
                <div key={b.id} className="flex flex-col">
                  <div 
                    className={`group flex items-center px-4 py-3 transition-colors ${
                      isSelected ? 'bg-zinc-50' : 'hover:bg-zinc-50/80'
                    } ${isEditing ? 'bg-zinc-50/80' : ''}`}
                    onClick={() => {
                      setSelectedIndex(idx)
                      if (!isEditing && selectedIndex === idx) startEdit(b)
                    }}
                  >
                    {/* Icon */}
                    <div className="w-8 h-8 mr-4 bg-white border border-zinc-200 rounded-md shadow-sm flex items-center justify-center flex-shrink-0 text-zinc-400 group-hover:text-zinc-900 transition-colors">
                      <Building2 size={14} />
                    </div>
                    
                    {/* Title & Badge */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-medium text-zinc-900 truncate group-hover:text-black">{b.name}</p>
                        {isSelected && !isEditing && <CornerDownLeft size={12} className="text-zinc-300 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-zinc-400 font-mono tracking-tight">{b.slug}</span>
                        {b.credai_member && (
                          <span className="flex items-center gap-0.5 text-[9px] text-emerald-600 font-bold tracking-wider uppercase bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded shadow-sm">
                            <CheckCircle2 size={10} /> CREDAI
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Founded (Tabular) */}
                    <div className="w-[100px] hidden sm:block text-right pr-4">
                      <span className="text-[13px] font-medium text-zinc-500 font-mono tracking-tight">
                        {b.founded_year ?? '—'}
                      </span>
                    </div>

                    {/* HQ */}
                    <div className="w-[180px] hidden md:flex items-center pr-4">
                      <span className="text-[13px] font-medium text-zinc-600 truncate">
                        {b.headquarters ?? '—'}
                      </span>
                    </div>

                    {/* Projects count */}
                    <div className="w-[100px] hidden sm:flex justify-end pr-4">
                      <span className="text-[13px] font-semibold tabular-nums text-zinc-900">
                        {b._count.projects} <span className="font-normal text-zinc-400 text-[11px]">proj</span>
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="w-[80px] flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {b.website && (
                        <a
                          href={b.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-md border border-transparent hover:border-zinc-200 transition-all shadow-none hover:shadow-sm"
                          title="Website"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Globe size={14} />
                        </a>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (editingId === b.id) setEditingId(null)
                          else startEdit(b)
                        }}
                        className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-md border border-transparent hover:border-zinc-200 transition-all shadow-none hover:shadow-sm"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Inline edit row */}
                  {isEditing && (
                    <div className="px-16 py-4 bg-zinc-50 border-t border-b border-zinc-100 shadow-inner">
                      <BuilderFormFields form={editForm} onChange={setEditForm} />
                      <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-zinc-200/50">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-4 py-1.5 bg-white border border-zinc-200 rounded-md text-[12px] font-medium text-zinc-600 hover:bg-zinc-50 transition-colors shadow-sm"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(b.id)}
                          disabled={editSaving}
                          className="flex items-center gap-2 px-5 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-md text-[12px] font-medium disabled:opacity-40 transition-colors shadow-sm"
                        >
                          {editSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                          {editSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
      
    </div>
  )
}
