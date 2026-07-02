'use client'

import { useState } from 'react'
import { Plus, Trash, FloppyDisk, Spinner } from '@phosphor-icons/react'
import { API_BASE } from '@/lib/env'

type AmenityCategory = 'sports' | 'lifestyle' | 'wellness' | 'kids' | 'security' | 'parking'

interface Amenity {
  id: string
  name: string
  category: AmenityCategory
}

interface Props {
  amenities: Amenity[]
  projectId: string
  onSaved: () => Promise<void>
}

const CATEGORIES: AmenityCategory[] = ['sports', 'lifestyle', 'wellness', 'kids', 'security', 'parking']

const CATEGORY_LABELS: Record<AmenityCategory, string> = {
  sports:    'Sports',
  lifestyle: 'Lifestyle',
  wellness:  'Wellness',
  kids:      'Kids',
  security:  'Security',
  parking:   'Parking',
}

interface NewRow {
  name: string
  category: AmenityCategory
}

export default function AmenitiesEditor({ amenities: initial, projectId, onSaved }: Props) {
  const [rows, setRows]     = useState<Amenity[]>(initial)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [newRow, setNewRow] = useState<NewRow>({ name: '', category: 'lifestyle' })

  const handleDelete = async (id: string) => {
    setRows(r => r.filter(x => x.id !== id))
    try {
      const res = await fetch(`${API_BASE}/admin/amenities/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error('Delete failed')
      await onSaved()
    } catch {
      setError('Delete failed')
      const res = await fetch(`${API_BASE}/admin/projects/${projectId}`, { credentials: 'include' })
      const json = await res.json()
      setRows(json.project?.amenities ?? initial)
    }
  }

  const handleAdd = async () => {
    if (!newRow.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/admin/projects/${projectId}/amenities`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ name: newRow.name.trim(), category: newRow.category }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Add failed') }
      const { amenity } = await res.json()
      setRows(r => [...r, amenity])
      setNewRow({ name: '', category: 'lifestyle' })
      setAdding(false)
      await onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Add failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-[20px] border border-zinc-200/80 shadow-sm p-7">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[15px] font-bold text-zinc-900">Amenities</h2>
          <p className="text-[12px] text-zinc-400 mt-0.5">{rows.length} entries</p>
        </div>
        <button
          onClick={() => setAdding(v => !v)}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={13} weight="bold" />
          Add
        </button>
      </div>

      {error && (
        <p className="text-[12px] text-red-500 mb-3">{error}</p>
      )}

      {/* Add row */}
      {adding && (
        <div className="flex gap-2 mb-4 p-3 bg-blue-50/60 rounded-xl border border-blue-100">
          <input
            value={newRow.name}
            onChange={e => setNewRow(r => ({ ...r, name: e.target.value }))}
            placeholder="Amenity name (e.g. Swimming Pool)"
            className="flex-1 text-[13px] bg-white border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
          />
          <select
            value={newRow.category}
            onChange={e => setNewRow(r => ({ ...r, category: e.target.value as AmenityCategory }))}
            className="text-[13px] bg-white border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={saving || !newRow.name.trim()}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-2 rounded-lg transition-colors"
          >
            {saving ? <Spinner size={13} className="animate-spin" /> : <FloppyDisk size={13} />}
            Save
          </button>
        </div>
      )}

      {/* Existing rows */}
      {rows.length === 0 ? (
        <p className="text-[12px] text-zinc-400 text-center py-6">No amenities added yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {rows.map(a => (
            <div
              key={a.id}
              className="group flex items-center gap-2 text-[12px] font-medium text-zinc-700 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-full"
            >
              <span>{a.name}</span>
              <span className="text-[10px] text-zinc-400">{CATEGORY_LABELS[a.category]}</span>
              <button
                onClick={() => handleDelete(a.id)}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
              >
                <Trash size={11} weight="bold" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
