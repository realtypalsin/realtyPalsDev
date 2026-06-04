'use client'

import { useEffect, useState } from 'react'
import { Plus, Building2, Globe, CheckCircle2, Pencil, X, Save, Loader2, Trash2 } from 'lucide-react'

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
        <label htmlFor="credai" className="text-sm text-gray-600 font-medium">CREDAI Member</label>
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
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
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
            </button>
          </div>
        </form>
      )}

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
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors"
                            title="Website"
                          >
                            <Globe size={13} />
                          </a>
                        )}
                        <button
                          onClick={() => editingId === b.id ? setEditingId(null) : startEdit(b)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
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
    </div>
  )
}
