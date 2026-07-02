'use client'

import { useEffect, useState } from 'react'
import { Plus, Building2, Globe, CheckCircle2, Pencil, X, Save, Loader2, Trash2 } from 'lucide-react'
import { API_BASE } from '@/lib/env'

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
          <label className="text-xs font-semibold text-gray-500 block mb-1">{label}</label>
          <input
            type={type ?? 'text'}
            value={String(form[key])}
            onChange={(e) => {
              const v = e.target.value
              set(key)(v)
              if (key === 'name') onChange({ ...form, name: v, slug: toSlug(v) })
            }}
            placeholder={ph}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all bg-white shadow-sm"
          />
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="credai"
          checked={form.credai_member}
          onChange={(e) => set('credai_member')(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-slate-900 focus:ring-slate-900 accent-slate-800"
        />
        <label htmlFor="credai" className="text-sm text-slate-700 font-medium">CREDAI Member</label>
      </div>
    </div>
  )
}

export default function AdminBuilders() {
  const [builders, setBuilders]     = useState<Builder[]>([])
  const [loading, setLoading]       = useState(true)
  const [showAdd, setShowAdd]       = useState(false)
  const [addForm, setAddForm]       = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editForm, setEditForm]     = useState<FormState>(EMPTY_FORM)
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/admin/builders`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { setBuilders(d.builders ?? []); setLoading(false) })
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch(`${API_BASE}/admin/builders`, {
      credentials: 'include',
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
  }

  function startEdit(b: Builder) {
    setEditingId(b.id)
    setEditForm({
      name:          b.name,
      slug:          b.slug,
      founded_year:  b.founded_year?.toString() ?? '',
      headquarters:  b.headquarters ?? '',
      website:       b.website ?? '',
      credai_member: b.credai_member,
    })
  }

  async function saveEdit(id: string) {
    setEditSaving(true)
    const res = await fetch(`${API_BASE}/admin/builders/${id}`, {
      credentials: 'include',
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
    <div className="max-w-5xl mx-auto space-y-6 pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black text-slate-900 tracking-tight">Builder Profiles</h1>
          <p className="text-sm text-slate-500 mt-1">{builders.length} registered partners</p>
        </div>
        <button
          onClick={() => { setShowAdd(!showAdd); setEditingId(null) }}
          className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-full text-sm font-semibold transition-all shadow-md hover:shadow-lg"
        >
          {showAdd ? <X size={16} /> : <Plus size={16} />}
          {showAdd ? 'Cancel' : 'Add Builder'}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6"
        >
          <h3 className="text-lg font-serif font-bold text-slate-900 border-b border-gray-100 pb-3">New Builder Profile</h3>
          <BuilderFormFields form={addForm} onChange={setAddForm} />
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-5 py-2.5 border border-gray-200 rounded-full text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-black text-white rounded-full text-[13px] font-bold disabled:opacity-40 transition-colors shadow-sm"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : builders.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm font-medium">No builders registered yet</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-slate-50/50">
                {['Builder', 'Founded', 'HQ', 'Projects', ''].map((h, i) => (
                  <th key={i} className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-6 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {builders.map((b) => (
                <>
                  <tr key={b.id} className="hover:bg-slate-50/50 group transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white border border-gray-100 shadow-sm rounded-xl flex items-center justify-center flex-shrink-0 text-slate-300 group-hover:text-slate-900 transition-colors">
                          <Building2 size={18} />
                        </div>
                        <div>
                          <p className="text-[16px] font-serif font-bold text-slate-900">{b.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-slate-400 font-medium font-mono">{b.slug}</span>
                            {b.credai_member && (
                              <span className="flex items-center gap-1 text-[9px] text-emerald-700 font-black tracking-wider uppercase bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md shadow-sm">
                                <CheckCircle2 size={10} /> CREDAI
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[13px] font-medium text-slate-500">{b.founded_year ?? '—'}</td>
                    <td className="px-6 py-4 text-[13px] font-medium text-slate-500 max-w-[180px] truncate">{b.headquarters ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className="text-[15px] font-black text-slate-900">{b._count.projects}</span>
                      <span className="text-xs text-slate-400 ml-1.5 font-medium">projects</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {b.website && (
                          <a
                            href={b.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm text-slate-400 hover:text-slate-900 hover:border-gray-200 transition-all"
                            title="Website"
                          >
                            <Globe size={14} />
                          </a>
                        )}
                        <button
                          onClick={() => editingId === b.id ? setEditingId(null) : startEdit(b)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm text-slate-400 hover:text-slate-900 hover:border-gray-200 transition-all"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Inline edit row */}
                  {editingId === b.id && (
                    <tr key={`${b.id}-edit`}>
                      <td colSpan={5} className="px-6 py-6 bg-slate-50/50 border-b border-gray-100">
                        <div className="space-y-6">
                          <BuilderFormFields form={editForm} onChange={setEditForm} />
                          <div className="flex justify-end gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="px-5 py-2.5 border border-gray-200 bg-white rounded-full text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => saveEdit(b.id)}
                              disabled={editSaving}
                              className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-black text-white rounded-full text-[13px] font-bold disabled:opacity-40 transition-colors shadow-sm"
                            >
                              {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                              {editSaving ? 'Saving...' : 'Save Changes'}
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
    </div>
  )
}
