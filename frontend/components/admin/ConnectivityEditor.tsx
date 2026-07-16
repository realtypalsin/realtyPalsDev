'use client'

import { useState } from 'react'
import { Plus, Trash2, Save, Loader2 } from 'lucide-react'
import { API_BASE } from '@/lib/env'
import { adminAuthHeaders } from '@/lib/authedFetch'

type ConnType = 'metro' | 'road' | 'expressway' | 'school' | 'hospital' | 'mall' | 'landmark' | 'airport' | 'university'
type DataSource = 'brochure' | 'google' | 'estimated' | 'manual'

interface ConnEntry {
  id: string
  type: ConnType
  name: string
  distance_km: number | null
  data_source: DataSource
  notes: string | null
}

interface Props {
  connectivity: ConnEntry[]
  projectId: string
  onSaved: () => Promise<void>
}

const TYPES: ConnType[] = ['metro', 'road', 'expressway', 'school', 'hospital', 'mall', 'landmark', 'airport', 'university']
const SOURCES: DataSource[] = ['brochure', 'google', 'estimated', 'manual']

const TYPE_LABELS: Record<ConnType, string> = {
  metro:      'Metro',
  road:       'Road',
  expressway: 'Expressway',
  school:     'School',
  hospital:   'Hospital',
  mall:       'Mall',
  landmark:   'Landmark',
  airport:    'Airport',
  university: 'University',
}

interface NewRow {
  type: ConnType
  name: string
  distance_km: string
  data_source: DataSource
  notes: string
}

export default function ConnectivityEditor({ connectivity: initial, projectId, onSaved }: Props) {
  const [rows, setRows]     = useState<ConnEntry[]>(initial)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [newRow, setNewRow] = useState<NewRow>({ type: 'metro', name: '', distance_km: '', data_source: 'brochure', notes: '' })

  const handleDelete = async (id: string) => {
    setRows(r => r.filter(x => x.id !== id))
    try {
      const res = await fetch(`${API_BASE}/admin/connectivity/${id}`, { method: 'DELETE', headers: adminAuthHeaders() })
      if (!res.ok) throw new Error('Delete failed')
      await onSaved()
    } catch {
      setError('Delete failed')
      setRows(initial)
    }
  }

  const handleAdd = async () => {
    if (!newRow.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        type:        newRow.type,
        name:        newRow.name.trim(),
        data_source: newRow.data_source,
      }
      if (newRow.distance_km) body.distance_km = parseFloat(newRow.distance_km)
      if (newRow.notes.trim()) body.notes = newRow.notes.trim()
      const res = await fetch(`${API_BASE}/admin/projects/${projectId}/connectivity`, {
        method:      'POST',
        headers:     { ...adminAuthHeaders(), 'Content-Type': 'application/json' },
        body:        JSON.stringify(body),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Add failed') }
      const { entry } = await res.json()
      setRows(r => [...r, entry])
      setNewRow({ type: 'metro', name: '', distance_km: '', data_source: 'brochure', notes: '' })
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
          <h2 className="text-[15px] font-bold text-zinc-900">Connectivity</h2>
          <p className="text-[12px] text-zinc-400 mt-0.5">{rows.length} entries</p>
        </div>
        <button
          onClick={() => setAdding(v => !v)}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={13} />
          Add
        </button>
      </div>

      {error && <p className="text-[12px] text-red-500 mb-3">{error}</p>}

      {adding && (
        <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-blue-50/60 rounded-xl border border-blue-100">
          <select
            value={newRow.type}
            onChange={e => setNewRow(r => ({ ...r, type: e.target.value as ConnType }))}
            className="text-[13px] bg-white border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
          >
            {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
          <input
            value={newRow.name}
            onChange={e => setNewRow(r => ({ ...r, name: e.target.value }))}
            placeholder="Name (e.g. Botanical Garden Metro)"
            className="text-[13px] bg-white border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
          />
          <input
            value={newRow.distance_km}
            onChange={e => setNewRow(r => ({ ...r, distance_km: e.target.value }))}
            placeholder="Distance (km)"
            type="number"
            step="0.1"
            className="text-[13px] bg-white border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
          />
          <select
            value={newRow.data_source}
            onChange={e => setNewRow(r => ({ ...r, data_source: e.target.value as DataSource }))}
            className="text-[13px] bg-white border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
          >
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="col-span-2 flex gap-2">
            <input
              value={newRow.notes}
              onChange={e => setNewRow(r => ({ ...r, notes: e.target.value }))}
              placeholder="Notes (optional)"
              className="flex-1 text-[13px] bg-white border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
            />
            <button
              onClick={handleAdd}
              disabled={saving || !newRow.name.trim()}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-2 rounded-lg transition-colors"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save
            </button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-[12px] text-zinc-400 text-center py-6">No connectivity entries yet.</p>
      ) : (
        <div className="divide-y divide-zinc-100">
          {rows.map(c => (
            <div key={c.id} className="group flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                  {TYPE_LABELS[c.type]}
                </span>
                <span className="text-[13px] font-medium text-zinc-800">{c.name}</span>
                {c.distance_km != null && (
                  <span className="text-[11px] text-zinc-400">{c.distance_km} km</span>
                )}
              </div>
              <button
                onClick={() => handleDelete(c.id)}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

