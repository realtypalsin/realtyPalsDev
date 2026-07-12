'use client'

<<<<<<< HEAD
import { useEffect, useState } from 'react'
import { Plus, Building2, Globe, CheckCircle2, Pencil, X, Save, Loader2 } from 'lucide-react'
=======
import { useEffect, useState, useRef, useCallback } from 'react'
import { Plus, Building2, Globe, CheckCircle2, Pencil, X, Save, Loader2, Trash2, Search, CornerDownLeft } from 'lucide-react'
import { toast } from 'sonner'
import { API_BASE } from '@/lib/env'
import { adminAuthHeaders } from '@/lib/authedFetch'
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172

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
}

const EMPTY_FORM: FormState = {
  name: '', slug: '', founded_year: '', headquarters: '', website: '', credai_member: false,
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
  ]

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {fields.map(({ label, key, ph, type }) => (
        <div key={key}>
<<<<<<< HEAD
          <label className="text-xs font-semibold text-gray-500 block mb-1">{label}</label>
=======
          <label className="text-xs font-semibold text-zinc-500 block mb-1">{label}</label>
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
          <input
            type={type ?? 'text'}
            value={String(form[key])}
            onChange={(e) => {
              const v = e.target.value
              set(key)(v)
              if (key === 'name') onChange({ ...form, name: v, slug: toSlug(v) })
            }}
            placeholder={ph}
<<<<<<< HEAD
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 transition-colors"
          />
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="credai"
          checked={form.credai_member}
          onChange={(e) => set('credai_member')(e.target.checked)}
          className="w-4 h-4 rounded accent-blue-600"
        />
        <label htmlFor="credai" className="text-sm text-gray-700 font-medium">CREDAI Member</label>
=======
            className="w-full border border-zinc-200 rounded-md px-3 py-2 text-[13px] text-zinc-900 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition-all bg-white shadow-sm"
          />
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1 mt-6">
        <input
          type="checkbox"
          id={`credai-${form.slug}`}
          checked={form.credai_member}
          onChange={(e) => set('credai_member')(e.target.checked)}
          className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 accent-zinc-800"
        />
        <label htmlFor={`credai-${form.slug}`} className="text-[13px] text-zinc-700 font-medium cursor-pointer">CREDAI Member</label>
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
      </div>
    </div>
  )
}

<<<<<<< HEAD
export default function AdminBuilders() {
  const [builders, setBuilders]     = useState<Builder[]>([])
  const [loading, setLoading]       = useState(true)
  const [showAdd, setShowAdd]       = useState(false)
  const [addForm, setAddForm]       = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
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
      <div className="w-32 h-4 bg-zinc-100 rounded animate-pulse shrink-0" />
      <div className="w-16 h-4 bg-zinc-100 rounded animate-pulse shrink-0" />
      <div className="w-16 h-4 bg-zinc-50 rounded-md animate-pulse shrink-0" />
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
  
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editForm, setEditForm]     = useState<FormState>(EMPTY_FORM)
  const [editSaving, setEditSaving] = useState(false)

<<<<<<< HEAD
  useEffect(() => {
    fetch('/api/v1/admin/builders')
      .then((r) => r.json())
      .then((d) => { setBuilders(d.builders ?? []); setLoading(false) })
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/v1/admin/builders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:          addForm.name,
        slug:          addForm.slug,
        founded_year:  addForm.founded_year ? parseInt(addForm.founded_year) : undefined,
        headquarters:  addForm.headquarters || undefined,
        website:       addForm.website || undefined,
        credai_member: addForm.credai_member,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setBuilders((b) => [...b, { ...data.builder, _count: { projects: 0 } }])
      setShowAdd(false)
      setAddForm(EMPTY_FORM)
    }
    setSaving(false)
=======
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
  }, [filtered, selectedIndex, editingId, showAdd])

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
        }),
      })
      if (!res.ok) throw new Error('Failed to create')
      const created = await res.json()
      setBuilders((prev) => [created, ...prev])
      setShowAdd(false)
      setAddForm(EMPTY_FORM)
      toast.success('Builder created successfully')
    } catch (err: any) {
      toast.error(err.message || 'Error creating builder')
    } finally {
      setSaving(false)
    }
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
  }

  function startEdit(b: Builder) {
    setEditingId(b.id)
    setEditForm({
<<<<<<< HEAD
      name:          b.name,
      slug:          b.slug,
      founded_year:  b.founded_year?.toString() ?? '',
      headquarters:  b.headquarters ?? '',
      website:       b.website ?? '',
=======
      name: b.name,
      slug: b.slug,
      founded_year: b.founded_year ? String(b.founded_year) : '',
      headquarters: b.headquarters || '',
      website: b.website || '',
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
      credai_member: b.credai_member,
    })
  }

  async function saveEdit(id: string) {
    setEditSaving(true)
<<<<<<< HEAD
    const res = await fetch(`/api/v1/admin/builders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:          editForm.name,
        slug:          editForm.slug,
        founded_year:  editForm.founded_year ? parseInt(editForm.founded_year) : null,
        headquarters:  editForm.headquarters || null,
        website:       editForm.website || null,
        credai_member: editForm.credai_member,
      }),
    })
    if (res.ok) {
      setBuilders((bs) => bs.map((b) =>
        b.id === id
          ? {
              ...b,
              name:          editForm.name,
              slug:          editForm.slug,
              founded_year:  editForm.founded_year ? parseInt(editForm.founded_year) : null,
              headquarters:  editForm.headquarters || null,
              website:       editForm.website || null,
              credai_member: editForm.credai_member,
            }
          : b,
      ))
      setEditingId(null)
    }
    setEditSaving(false)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Builders</h1>
          <p className="text-sm text-gray-400 mt-0.5">{builders.length} builder profiles</p>
        </div>
        <button
          onClick={() => { setShowAdd(!showAdd); setEditingId(null) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-200"
        >
          {showAdd ? <X size={15} /> : <Plus size={15} />}
          {showAdd ? 'Cancel' : 'Add Builder'}
=======
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
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
<<<<<<< HEAD
          className="bg-white rounded-2xl border border-blue-100 p-5 shadow-sm space-y-4"
        >
          <h3 className="text-sm font-bold text-gray-700">New Builder</h3>
          <BuilderFormFields form={addForm} onChange={setAddForm} />
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {saving ? 'Adding…' : 'Add Builder'}
=======
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
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
            </button>
          </div>
        </form>
      )}

<<<<<<< HEAD
      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : builders.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No builders yet</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                {['Builder', 'Founded', 'HQ', 'Projects', ''].map((h, i) => (
                  <th key={i} className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {builders.map((b) => (
                <>
                  <tr key={b.id} className="hover:bg-gray-50/50 group transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 size={14} className="text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{b.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-gray-400 font-mono">{b.slug}</span>
                            {b.credai_member && (
                              <span className="flex items-center gap-0.5 text-[9px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                                <CheckCircle2 size={8} /> CREDAI
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-500">{b.founded_year ?? '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-500 max-w-[140px] truncate">{b.headquarters ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-bold text-gray-900">{b._count.projects}</span>
                      <span className="text-xs text-gray-400 ml-1">projects</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {b.website && (
                          <a
                            href={b.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-500 transition-colors"
                            title="Website"
                          >
                            <Globe size={13} />
                          </a>
                        )}
                        <button
                          onClick={() => editingId === b.id ? setEditingId(null) : startEdit(b)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Inline edit row */}
                  {editingId === b.id && (
                    <tr key={`${b.id}-edit`}>
                      <td colSpan={5} className="px-4 py-4 bg-blue-50/30 border-b border-blue-100">
                        <div className="space-y-4">
                          <BuilderFormFields form={editForm} onChange={setEditForm} />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => saveEdit(b.id)}
                              disabled={editSaving}
                              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors"
                            >
                              {editSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                              {editSaving ? 'Saving…' : 'Save Changes'}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
=======
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
      
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
    </div>
  )
}
