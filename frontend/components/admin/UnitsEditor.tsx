'use client'

import { useState } from 'react'
import { Plus, Trash2, Save, Loader2, Check } from 'lucide-react'
import { API_BASE } from '@/lib/env'

interface UnitRow {
  id: string
  bhk: number
  name: string
  super_area_sqft: number | null
  carpet_area_sqft: number | null
  balcony_area_sqft: number | null
  bathrooms: number | null
  price_min_cr: number | null
  price_max_cr: number | null
  price_label: string | null
  price_is_estimated: boolean
}

interface LocalRow extends UnitRow {
  _bhk: string
  _super: string
  _carpet: string
  _balcony: string
  _baths: string
  _min: string
  _max: string
  _label: string
}

function toLocal(u: UnitRow): LocalRow {
  return {
    ...u,
    _bhk:    u.bhk?.toString() ?? '',
    _super:  u.super_area_sqft?.toString() ?? '',
    _carpet: u.carpet_area_sqft?.toString() ?? '',
    _balcony: u.balcony_area_sqft?.toString() ?? '',
    _baths:  u.bathrooms?.toString() ?? '',
    _min:    u.price_min_cr?.toString() ?? '',
    _max:    u.price_max_cr?.toString() ?? '',
    _label:  u.price_label ?? '',
  }
}

function inp(cls?: string) {
  return `w-full border border-zinc-200/80 rounded-xl px-3 py-2 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-200 ${cls ?? ''}`
}

const EMPTY_ADD = {
  name: '', bhk: '', super_area_sqft: '', carpet_area_sqft: '',
  balcony_area_sqft: '', bathrooms: '', price_min_cr: '', price_max_cr: '',
  price_label: '', price_is_estimated: true,
}

export default function UnitsEditor({
  unitTypes,
  projectId,
  onSaved,
}: {
  unitTypes: UnitRow[]
  projectId: string
  onSaved: () => Promise<void>
}) {
  const [rows, setRows]       = useState<LocalRow[]>(() => unitTypes.map(toLocal))
  const [dirty, setDirty]     = useState<Set<string>>(new Set())
  const [saving, setSaving]   = useState<Set<string>>(new Set())
  const [saved, setSaved]     = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState<Set<string>>(new Set())
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_ADD)
  const [addSaving, setAddSaving] = useState(false)
  const [err, setErr]         = useState<string | null>(null)

  function patchRow(id: string, key: keyof LocalRow, val: string | boolean) {
    setRows(rs => rs.map(r => r.id === id ? { ...r, [key]: val } : r))
    setDirty(s => new Set(s).add(id))
    setSaved(s => { const n = new Set(s); n.delete(id); return n })
  }

  async function saveRow(row: LocalRow) {
    setSaving(s => new Set(s).add(row.id))
    setErr(null)
    const body = {
      name:               row.name,
      bhk:                row._bhk  ? parseInt(row._bhk, 10) : row.bhk,
      super_area_sqft:    row._super  ? parseInt(row._super, 10)  : null,
      carpet_area_sqft:   row._carpet ? parseInt(row._carpet, 10) : null,
      balcony_area_sqft:  row._balcony ? parseInt(row._balcony, 10) : null,
      bathrooms:          row._baths  ? parseInt(row._baths, 10)  : null,
      price_min_cr:       row._min  ? parseFloat(row._min)  : null,
      price_max_cr:       row._max  ? parseFloat(row._max)  : null,
      price_label:        row._label || null,
      price_is_estimated: row.price_is_estimated,
    }
    const res = await fetch(`${API_BASE}/admin/units/${row.id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErr(j.error ?? 'Save failed')
    } else {
      setDirty(s => { const n = new Set(s); n.delete(row.id); return n })
      setSaved(s => new Set(s).add(row.id))
    }
    setSaving(s => { const n = new Set(s); n.delete(row.id); return n })
  }

  async function deleteRow(id: string) {
    if (!confirm('Delete this unit type?')) return
    setDeleting(s => new Set(s).add(id))
    const res = await fetch(`${API_BASE}/admin/units/${id}`, {
      method: 'DELETE', credentials: 'include',
    })
    if (res.ok) {
      setRows(rs => rs.filter(r => r.id !== id))
      setDirty(s => { const n = new Set(s); n.delete(id); return n })
      await onSaved()
    } else {
      setErr('Delete failed')
    }
    setDeleting(s => { const n = new Set(s); n.delete(id); return n })
  }

  async function addUnit() {
    setAddSaving(true)
    setErr(null)
    const body = {
      name:               addForm.name,
      bhk:                addForm.bhk ? parseInt(addForm.bhk, 10) : 0,
      super_area_sqft:    addForm.super_area_sqft  ? parseInt(addForm.super_area_sqft, 10)  : null,
      carpet_area_sqft:   addForm.carpet_area_sqft ? parseInt(addForm.carpet_area_sqft, 10) : null,
      balcony_area_sqft:  addForm.balcony_area_sqft ? parseInt(addForm.balcony_area_sqft, 10) : null,
      bathrooms:          addForm.bathrooms    ? parseInt(addForm.bathrooms, 10)    : null,
      price_min_cr:       addForm.price_min_cr ? parseFloat(addForm.price_min_cr)   : null,
      price_max_cr:       addForm.price_max_cr ? parseFloat(addForm.price_max_cr)   : null,
      price_label:        addForm.price_label || null,
      price_is_estimated: addForm.price_is_estimated,
    }
    const res = await fetch(`${API_BASE}/admin/projects/${projectId}/units`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const { unit } = await res.json()
      setRows(rs => [...rs, toLocal(unit)])
      setAddForm(EMPTY_ADD)
      setShowAdd(false)
      await onSaved()
    } else {
      const j = await res.json().catch(() => ({}))
      setErr(j.error ?? 'Add failed')
    }
    setAddSaving(false)
  }

  return (
    <div className="bg-white rounded-[20px] border border-zinc-200/80 shadow-sm p-7">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Unit Types</span>
          <div className="h-px w-16 bg-zinc-200/60" />
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 transition-colors"
        >
          <Plus size={13} />
          Add Unit Type
        </button>
      </div>

      {err && (
        <p className="text-[12px] text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{err}</p>
      )}

      {rows.length === 0 && !showAdd && (
        <p className="text-[13px] text-zinc-400 text-center py-8">No unit types. Add one above.</p>
      )}

      <div className="space-y-4">
        {rows.map(row => (
          <div key={row.id} className="border border-zinc-200/80 rounded-xl p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">BHK</label>
                <input
                  type="number" min="0" step="1"
                  value={row._bhk}
                  onChange={e => patchRow(row.id, '_bhk', e.target.value)}
                  className={inp()}
                  placeholder="e.g. 3"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">Name</label>
                <input
                  type="text"
                  value={row.name}
                  onChange={e => patchRow(row.id, 'name', e.target.value)}
                  className={inp()}
                  placeholder="e.g. 3 BHK Premium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">Super Area (sqft)</label>
                <input
                  type="number" min="0" step="1"
                  value={row._super}
                  onChange={e => patchRow(row.id, '_super', e.target.value)}
                  className={inp()}
                  placeholder="e.g. 1850"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">Carpet Area (sqft)</label>
                <input
                  type="number" min="0" step="1"
                  value={row._carpet}
                  onChange={e => patchRow(row.id, '_carpet', e.target.value)}
                  className={inp()}
                  placeholder="e.g. 1350"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">Balcony Area (sqft)</label>
                <input
                  type="number" min="0" step="1"
                  value={row._balcony}
                  onChange={e => patchRow(row.id, '_balcony', e.target.value)}
                  className={inp()}
                  placeholder="e.g. 120"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">Bathrooms</label>
                <input
                  type="number" min="0" step="1"
                  value={row._baths}
                  onChange={e => patchRow(row.id, '_baths', e.target.value)}
                  className={inp()}
                  placeholder="e.g. 3"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">Price Min (Cr)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={row._min}
                  onChange={e => patchRow(row.id, '_min', e.target.value)}
                  className={inp()}
                  placeholder="e.g. 1.50"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">Price Max (Cr)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={row._max}
                  onChange={e => patchRow(row.id, '_max', e.target.value)}
                  className={inp()}
                  placeholder="e.g. 1.80"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">Price Label (optional)</label>
                <input
                  type="text"
                  value={row._label}
                  onChange={e => patchRow(row.id, '_label', e.target.value)}
                  className={inp()}
                  placeholder="e.g. ₹1.5 Cr onwards"
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  id={`est-${row.id}`}
                  type="checkbox"
                  checked={row.price_is_estimated}
                  onChange={e => patchRow(row.id, 'price_is_estimated', e.target.checked)}
                  className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor={`est-${row.id}`} className="text-[12px] text-zinc-600 cursor-pointer select-none">
                  Price estimated
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
              <button
                onClick={() => deleteRow(row.id)}
                disabled={deleting.has(row.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting.has(row.id) ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Delete
              </button>

              <button
                onClick={() => saveRow(row)}
                disabled={!dirty.has(row.id) || saving.has(row.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-40 transition-colors"
              >
                {saving.has(row.id) ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : saved.has(row.id) ? (
                  <Check size={13} />
                ) : (
                  <Save size={13} />
                )}
                {saved.has(row.id) ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="mt-4 border border-blue-200 bg-blue-50/40 rounded-xl p-4">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">New Unit Type</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-1">BHK *</label>
              <input
                type="number" min="0" step="1"
                value={addForm.bhk}
                onChange={e => setAddForm(f => ({ ...f, bhk: e.target.value }))}
                className={inp()}
                placeholder="e.g. 3"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-1">Name *</label>
              <input
                type="text"
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                className={inp()}
                placeholder="e.g. 3 BHK Premium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-1">Super Area (sqft)</label>
              <input
                type="number" min="0" step="1"
                value={addForm.super_area_sqft}
                onChange={e => setAddForm(f => ({ ...f, super_area_sqft: e.target.value }))}
                className={inp()}
                placeholder="e.g. 1850"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-1">Carpet Area (sqft)</label>
              <input
                type="number" min="0" step="1"
                value={addForm.carpet_area_sqft}
                onChange={e => setAddForm(f => ({ ...f, carpet_area_sqft: e.target.value }))}
                className={inp()}
                placeholder="e.g. 1350"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-1">Balcony Area (sqft)</label>
              <input
                type="number" min="0" step="1"
                value={addForm.balcony_area_sqft}
                onChange={e => setAddForm(f => ({ ...f, balcony_area_sqft: e.target.value }))}
                className={inp()}
                placeholder="e.g. 120"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-1">Bathrooms</label>
              <input
                type="number" min="0" step="1"
                value={addForm.bathrooms}
                onChange={e => setAddForm(f => ({ ...f, bathrooms: e.target.value }))}
                className={inp()}
                placeholder="e.g. 3"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-1">Price Min (Cr)</label>
              <input
                type="number" min="0" step="0.01"
                value={addForm.price_min_cr}
                onChange={e => setAddForm(f => ({ ...f, price_min_cr: e.target.value }))}
                className={inp()}
                placeholder="e.g. 1.50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-1">Price Max (Cr)</label>
              <input
                type="number" min="0" step="0.01"
                value={addForm.price_max_cr}
                onChange={e => setAddForm(f => ({ ...f, price_max_cr: e.target.value }))}
                className={inp()}
                placeholder="e.g. 1.80"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-medium text-zinc-500 mb-1">Price Label (optional)</label>
              <input
                type="text"
                value={addForm.price_label}
                onChange={e => setAddForm(f => ({ ...f, price_label: e.target.value }))}
                className={inp()}
                placeholder="e.g. ₹1.5 Cr onwards"
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                id="est-add"
                type="checkbox"
                checked={addForm.price_is_estimated}
                onChange={e => setAddForm(f => ({ ...f, price_is_estimated: e.target.checked }))}
                className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="est-add" className="text-[12px] text-zinc-600 cursor-pointer select-none">
                Price estimated
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-blue-200/60">
            <button
              onClick={() => { setShowAdd(false); setAddForm(EMPTY_ADD) }}
              className="px-3 py-1.5 text-[12px] font-medium text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={addUnit}
              disabled={addSaving || !addForm.name || !addForm.bhk}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-40 transition-colors"
            >
              {addSaving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Add Unit Type
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
