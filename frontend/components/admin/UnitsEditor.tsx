'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Plus, Trash2, Save, Loader2, Check, Compass, Sparkles, X } from 'lucide-react'
import { API_BASE } from '@/lib/env'
import { adminAuthHeaders } from '@/lib/authedFetch'

const PRESET_ORIENTATIONS = [
  { id: 'east_facing', label: 'East Facing 🌅' },
  { id: 'north_facing', label: 'North Facing 🧭' },
  { id: 'north_east_facing', label: 'NE Facing (Vastu) ☀️' },
  { id: 'park_facing', label: 'Park View 🌳' },
  { id: 'garden_view', label: 'Garden View 🌿' },
  { id: 'pool_view', label: 'Pool View 🏊' },
  { id: 'golf_view', label: 'Golf View ⛳' },
  { id: 'corner_unit', label: 'Corner Unit 🏢' },
  { id: 'wide_balcony', label: 'Wide Balcony 🌄' },
  { id: 'road_facing', label: 'Expressway View 🛣️' },
]

interface UnitRow {
  id: string
  bhk: number
  name: string
  super_area_sqft: number | null
  carpet_area_sqft: number | null
  built_up_area_sqft?: number | null
  carpet_to_super_ratio_pct?: number | null
  unit_orientations?: string[]
  balconies: number | null
  balcony_area_sqft: number | null
  bathrooms: number | null
  price_min_cr: number | null
  price_max_cr: number | null
  price_label: string | null
  price_is_estimated: boolean
  layout_variant_name?: string | null
  towers?: string[]
  views?: any
}

interface LocalRow extends UnitRow {
  _bhk: string
  _super: string
  _carpet: string
  _built_up: string
  _ratio: string
  _orientations: string[]
  _balconies_count: string
  _balcony: string
  _baths: string
  _min: string
  _max: string
  _label: string
  _variant: string
  _towers_str: string
  _views: any[]
}

function calculateRatio(superSqft: string, carpetSqft: string): string {
  const s = parseFloat(superSqft)
  const c = parseFloat(carpetSqft)
  if (s > 0 && c > 0 && c <= s) {
    return (Math.round((c / s) * 1000) / 10).toString()
  }
  return ''
}

function toLocal(u: UnitRow): LocalRow {
  const superStr = u.super_area_sqft?.toString() ?? ''
  const carpetStr = u.carpet_area_sqft?.toString() ?? ''
  const computedRatio = u.carpet_to_super_ratio_pct?.toString() || calculateRatio(superStr, carpetStr)

  return {
    ...u,
    _bhk:    u.bhk?.toString() ?? '',
    _super:  superStr,
    _carpet: carpetStr,
    _built_up: u.built_up_area_sqft?.toString() ?? (carpetStr ? Math.round(parseFloat(carpetStr) * 1.15).toString() : ''),
    _ratio:  computedRatio,
    _orientations: Array.isArray(u.unit_orientations) ? u.unit_orientations : ['east_facing', 'north_facing'],
    _balconies_count: u.balconies?.toString() ?? '',
    _balcony: u.balcony_area_sqft?.toString() ?? '',
    _baths:  u.bathrooms?.toString() ?? '',
    _min:    u.price_min_cr?.toString() ?? '',
    _max:    u.price_max_cr?.toString() ?? '',
    _label:  u.price_label ?? '',
    _variant: u.layout_variant_name ?? 'Type A',
    _towers_str: Array.isArray(u.towers) ? u.towers.join(', ') : '',
    _views:  u.views || [],
  }
}

function inp(cls?: string) {
  return `w-full border border-zinc-200/80 rounded-xl px-3 py-2 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-200 ${cls ?? ''}`
}

const EMPTY_ADD = {
  name: '', bhk: '', super_area_sqft: '', carpet_area_sqft: '', built_up_area_sqft: '',
  carpet_to_super_ratio_pct: '', unit_orientations: ['east_facing', 'north_facing'] as string[],
  balconies: '', balcony_area_sqft: '', bathrooms: '', price_min_cr: '', price_max_cr: '',
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
  const [uploadingView, setUploadingView] = useState<string | null>(null)
  const [err, setErr]         = useState<string | null>(null)
  const [customTagInput, setCustomTagInput] = useState<{ [rowId: string]: string }>({})

  function patchRow(id: string, key: keyof LocalRow, val: any) {
    setRows(rs => rs.map(r => {
      if (r.id !== id) return r
      const updated = { ...r, [key]: val }
      
      // Auto-recalculate ratio when super or carpet changes
      if (key === '_super' || key === '_carpet') {
        const sup = key === '_super' ? val : r._super
        const carp = key === '_carpet' ? val : r._carpet
        const newRatio = calculateRatio(sup, carp)
        if (newRatio) updated._ratio = newRatio
      }
      return updated
    }))
    setDirty(s => new Set(s).add(id))
    setSaved(s => { const n = new Set(s); n.delete(id); return n })
  }

  function toggleOrientation(rowId: string, orientationId: string) {
    setRows(rs => rs.map(r => {
      if (r.id !== rowId) return r
      const current = r._orientations || []
      const next = current.includes(orientationId)
        ? current.filter(o => o !== orientationId)
        : [...current, orientationId]
      return { ...r, _orientations: next }
    }))
    setDirty(s => new Set(s).add(rowId))
    setSaved(s => { const n = new Set(s); n.delete(rowId); return n })
  }

  function addCustomOrientation(rowId: string) {
    const tag = (customTagInput[rowId] || '').trim().toLowerCase().replace(/\s+/g, '_')
    if (!tag) return
    setRows(rs => rs.map(r => {
      if (r.id !== rowId) return r
      const current = r._orientations || []
      if (current.includes(tag)) return r
      return { ...r, _orientations: [...current, tag] }
    }))
    setCustomTagInput(prev => ({ ...prev, [rowId]: '' }))
    setDirty(s => new Set(s).add(rowId))
    setSaved(s => { const n = new Set(s); n.delete(rowId); return n })
  }

  async function saveRow(row: LocalRow) {
    setSaving(s => new Set(s).add(row.id))
    setErr(null)
    const body = {
      name:                      row.name,
      bhk:                       row._bhk  ? parseInt(row._bhk, 10) : row.bhk,
      super_area_sqft:           row._super  ? parseInt(row._super, 10)  : null,
      carpet_area_sqft:          row._carpet ? parseInt(row._carpet, 10) : null,
      built_up_area_sqft:        row._built_up ? parseInt(row._built_up, 10) : null,
      carpet_to_super_ratio_pct: row._ratio ? parseFloat(row._ratio) : null,
      layout_efficiency_pct:     row._ratio ? parseFloat(row._ratio) : null,
      unit_orientations:         row._orientations,
      balconies:                 row._balconies_count ? parseInt(row._balconies_count, 10) : null,
      balcony_area_sqft:         row._balcony ? parseInt(row._balcony, 10) : null,
      bathrooms:                 row._baths  ? parseInt(row._baths, 10)  : null,
      price_min_cr:              row._min  ? parseFloat(row._min)  : null,
      price_max_cr:              row._max  ? parseFloat(row._max)  : null,
      price_label:               row._label || null,
      price_is_estimated:        row.price_is_estimated,
      layout_variant_name:       row._variant || 'Type A',
      towers:                    row._towers_str ? row._towers_str.split(',').map(s => s.trim()).filter(Boolean) : [],
      views:                     row._views,
    }
    const res = await fetch(`${API_BASE}/admin/units/${row.id}`, {
      method: 'PATCH',
      headers: { ...adminAuthHeaders(), 'Content-Type': 'application/json' },
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
      method: 'DELETE',
      headers: adminAuthHeaders(),
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

  async function handleUploadView(e: React.ChangeEvent<HTMLInputElement>, rowId: string) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingView(rowId)
    setErr(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('slug', 'unit-view')
      const upRes = await fetch(`${API_BASE}/admin/upload-image`, {
        method: 'POST',
        headers: adminAuthHeaders(),
        body: form,
      })
      if (!upRes.ok) throw new Error('Upload failed')
      const { url } = await upRes.json()
      
      const newView = { image_url: url, title: 'Unit View', subtitle: 'Actual view from this tower/floor' }
      setRows(rs => rs.map(r => r.id === rowId ? { ...r, _views: [...r._views, newView] } : r))
      setDirty(s => new Set(s).add(rowId))
      setSaved(s => { const n = new Set(s); n.delete(rowId); return n })
    } catch (err: any) {
      setErr(err.message)
    } finally {
      setUploadingView(null)
      e.target.value = ''
    }
  }

  function removeView(rowId: string, viewIdx: number) {
    setRows(rs => rs.map(r => r.id === rowId ? { ...r, _views: r._views.filter((_: any, i: number) => i !== viewIdx) } : r))
    setDirty(s => new Set(s).add(rowId))
    setSaved(s => { const n = new Set(s); n.delete(rowId); return n })
  }

  async function addUnit() {
    setAddSaving(true)
    setErr(null)
    const superArea = addForm.super_area_sqft ? parseInt(addForm.super_area_sqft, 10) : null
    const carpetArea = addForm.carpet_area_sqft ? parseInt(addForm.carpet_area_sqft, 10) : null
    const ratio = addForm.carpet_to_super_ratio_pct ? parseFloat(addForm.carpet_to_super_ratio_pct) : (superArea && carpetArea ? Math.round((carpetArea / superArea) * 1000) / 10 : null)

    const body = {
      name:                      addForm.name,
      bhk:                       addForm.bhk ? parseInt(addForm.bhk, 10) : 0,
      super_area_sqft:           superArea,
      carpet_area_sqft:          carpetArea,
      built_up_area_sqft:        addForm.built_up_area_sqft ? parseInt(addForm.built_up_area_sqft, 10) : (carpetArea ? Math.round(carpetArea * 1.15) : null),
      carpet_to_super_ratio_pct: ratio,
      layout_efficiency_pct:     ratio,
      unit_orientations:         addForm.unit_orientations,
      balconies:                 addForm.balconies ? parseInt(addForm.balconies, 10) : null,
      balcony_area_sqft:         addForm.balcony_area_sqft ? parseInt(addForm.balcony_area_sqft, 10) : null,
      bathrooms:                 addForm.bathrooms    ? parseInt(addForm.bathrooms, 10)    : null,
      price_min_cr:              addForm.price_min_cr ? parseFloat(addForm.price_min_cr)   : null,
      price_max_cr:              addForm.price_max_cr ? parseFloat(addForm.price_max_cr)   : null,
      price_label:               addForm.price_label || null,
      price_is_estimated:        addForm.price_is_estimated,
    }
    const res = await fetch(`${API_BASE}/admin/projects/${projectId}/units`, {
      method: 'POST',
      headers: { ...adminAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErr(j.error ?? 'Failed to add unit type')
    } else {
      setShowAdd(false)
      setAddForm(EMPTY_ADD)
      await onSaved()
    }
    setAddSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-zinc-900 flex items-center gap-2">
            Unit Configurations & Floor Plans
            <span className="text-[12px] font-medium bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full border border-purple-200">
              {rows.length} Configs
            </span>
          </h2>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            Manage carpet area efficiency, sunlight orientation, Vastu layout direction, prices, and tower mappings.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-all shadow-sm"
        >
          <Plus size={15} />
          {showAdd ? 'Cancel' : 'Add Unit Type'}
        </button>
      </div>

      {err && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-[13px]">
          {err}
        </div>
      )}

      {/* List of Units */}
      <div className="space-y-4">
        {rows.map(row => {
          const ratioNum = parseFloat(row._ratio)
          const isHealthyRatio = !isNaN(ratioNum) && ratioNum >= 62 && ratioNum <= 78

          return (
            <div
              key={row.id}
              className={`p-5 rounded-2xl border transition-all duration-200 bg-white ${
                dirty.has(row.id)
                  ? 'border-amber-300 shadow-md ring-2 ring-amber-100'
                  : 'border-zinc-200/80 shadow-sm hover:border-zinc-300'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <span className="text-[15px] font-bold text-zinc-900">{row.name || `${row.bhk} BHK Unit`}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700">
                    {row._bhk} BHK
                  </span>
                  {row._ratio && (
                    <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                      isHealthyRatio
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      <Sparkles size={11} />
                      {row._ratio}% Efficiency ({isHealthyRatio ? 'Optimal' : 'Check Loading'})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => saveRow(row)}
                    disabled={!dirty.has(row.id) || saving.has(row.id)}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-bold rounded-xl bg-zinc-900 text-white hover:bg-black disabled:opacity-40 transition-all shadow-sm"
                  >
                    {saving.has(row.id) ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : saved.has(row.id) ? (
                      <Check size={13} className="text-emerald-400" />
                    ) : (
                      <Save size={13} />
                    )}
                    {saved.has(row.id) ? 'Saved' : 'Save Changes'}
                  </button>

                  <button
                    onClick={() => deleteRow(row.id)}
                    disabled={deleting.has(row.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    {deleting.has(row.id) ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  </button>
                </div>
              </div>

              {/* Core Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 mb-1">BHK</label>
                  <input
                    type="number" min="1" max="10"
                    value={row._bhk}
                    onChange={e => patchRow(row.id, '_bhk', e.target.value)}
                    className={inp()}
                    placeholder="3"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-zinc-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={row.name}
                    onChange={e => patchRow(row.id, 'name', e.target.value)}
                    className={inp()}
                    placeholder="3 BHK Premium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 mb-1">Super Area (sqft)</label>
                  <input
                    type="number" min="0" step="1"
                    value={row._super}
                    onChange={e => patchRow(row.id, '_super', e.target.value)}
                    className={inp('font-bold')}
                    placeholder="1850"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 mb-1">Carpet Area (sqft)</label>
                  <input
                    type="number" min="0" step="1"
                    value={row._carpet}
                    onChange={e => patchRow(row.id, '_carpet', e.target.value)}
                    className={inp('font-bold')}
                    placeholder="1350"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-purple-700 mb-1">Carpet Efficiency %</label>
                  <input
                    type="number" min="0" max="100" step="0.1"
                    value={row._ratio}
                    onChange={e => patchRow(row.id, '_ratio', e.target.value)}
                    className={inp('bg-purple-50/50 font-black text-purple-900 border-purple-200')}
                    placeholder="68.5"
                  />
                </div>
              </div>

              {/* Second Row: Balconies, Baths, Price, Towers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1">Built-Up Area (sqft)</label>
                  <input
                    type="number" min="0" step="1"
                    value={row._built_up}
                    onChange={e => patchRow(row.id, '_built_up', e.target.value)}
                    className={inp()}
                    placeholder="1550"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1">Balconies</label>
                  <input
                    type="number" min="0"
                    value={row._balconies_count}
                    onChange={e => patchRow(row.id, '_balconies_count', e.target.value)}
                    className={inp()}
                    placeholder="3"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1">Bathrooms</label>
                  <input
                    type="number" min="1"
                    value={row._baths}
                    onChange={e => patchRow(row.id, '_baths', e.target.value)}
                    className={inp()}
                    placeholder="3"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1">Price Min (₹ Cr)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={row._min}
                    onChange={e => patchRow(row.id, '_min', e.target.value)}
                    className={inp()}
                    placeholder="1.50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1">Price Max (₹ Cr)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={row._max}
                    onChange={e => patchRow(row.id, '_max', e.target.value)}
                    className={inp()}
                    placeholder="1.80"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1">Towers Association</label>
                  <input
                    type="text"
                    value={row._towers_str}
                    onChange={e => patchRow(row.id, '_towers_str', e.target.value)}
                    className={inp()}
                    placeholder="Tower A, Tower B"
                  />
                </div>
              </div>

              {/* Sun Orientation & Vastu Layout Direction Section */}
              <div className="pt-4 mt-4 border-t border-zinc-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Compass size={14} className="text-purple-600" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-zinc-700">
                      Sun Orientation, Vastu & Views
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400">Click chips to toggle orientations</span>
                </div>

                <div className="flex flex-wrap gap-1.5 items-center">
                  {PRESET_ORIENTATIONS.map(preset => {
                    const isSelected = row._orientations.includes(preset.id)
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => toggleOrientation(row.id, preset.id)}
                        className={`text-[11px] font-bold px-3 py-1.5 rounded-full transition-all flex items-center gap-1 border ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                        }`}
                      >
                        {preset.label}
                        {isSelected && <Check size={11} className="stroke-[3]" />}
                      </button>
                    )
                  })}

                  {/* Custom Orientations */}
                  {row._orientations
                    .filter(o => !PRESET_ORIENTATIONS.some(p => p.id === o))
                    .map(custom => (
                      <span
                        key={custom}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1.5"
                      >
                        {custom.replace(/_/g, ' ')}
                        <button
                          type="button"
                          onClick={() => toggleOrientation(row.id, custom)}
                          className="hover:text-red-600"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}

                  {/* Custom Tag Adder */}
                  <div className="flex items-center gap-1 ml-1">
                    <input
                      type="text"
                      placeholder="+ Custom orientation"
                      value={customTagInput[row.id] || ''}
                      onChange={e => setCustomTagInput({ ...customTagInput, [row.id]: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addCustomOrientation(row.id)
                        }
                      }}
                      className="border border-zinc-200 rounded-full px-3 py-1 text-[11px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-purple-500 w-36 bg-zinc-50"
                    />
                    {(customTagInput[row.id] || '').trim() && (
                      <button
                        type="button"
                        onClick={() => addCustomOrientation(row.id)}
                        className="bg-purple-600 text-white rounded-full p-1 hover:bg-purple-700"
                      >
                        <Plus size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Unit Views (Images) */}
              <div className="pt-4 mt-4 border-t border-zinc-100">
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Unit Views & Floor Plan Images</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {row._views.map((vw: any, idx: number) => (
                    <div key={idx} className="relative w-24 h-24 rounded-xl bg-zinc-100 flex-shrink-0 group overflow-hidden border border-zinc-200">
                      {vw.image_url && <Image src={vw.image_url} alt="View" fill sizes="96px" className="absolute inset-0 w-full h-full object-cover" />}
                      <button 
                        onClick={() => removeView(row.id, idx)}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <label className="flex flex-col items-center justify-center w-24 h-24 rounded-xl border-2 border-dashed border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 cursor-pointer flex-shrink-0 transition-all text-zinc-400 hover:text-zinc-600">
                    {uploadingView === row.id ? <Loader2 size={16} className="animate-spin mb-1" /> : <Plus size={16} className="mb-1" />}
                    <span className="text-[10px] font-bold">Add View</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadView(e, row.id)} disabled={uploadingView === row.id} />
                  </label>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add New Unit Type Modal / Drawer */}
      {showAdd && (
        <div className="mt-4 border border-purple-200 bg-purple-50/30 rounded-2xl p-6 shadow-sm">
          <p className="text-[13px] font-black text-purple-950 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Plus size={16} className="text-purple-600" />
            Add New Unit Configuration
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">BHK *</label>
              <input
                type="number" min="1" max="10"
                value={addForm.bhk}
                onChange={e => setAddForm(f => ({ ...f, bhk: e.target.value }))}
                className={inp()}
                placeholder="e.g. 3"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">Name *</label>
              <input
                type="text"
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                className={inp()}
                placeholder="e.g. 3 BHK Ultra Luxury"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">Super Area (sqft)</label>
              <input
                type="number" min="0"
                value={addForm.super_area_sqft}
                onChange={e => {
                  const sup = e.target.value
                  const carp = addForm.carpet_area_sqft
                  const ratio = calculateRatio(sup, carp)
                  setAddForm(f => ({ ...f, super_area_sqft: sup, carpet_to_super_ratio_pct: ratio }))
                }}
                className={inp()}
                placeholder="e.g. 1850"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">Carpet Area (sqft)</label>
              <input
                type="number" min="0"
                value={addForm.carpet_area_sqft}
                onChange={e => {
                  const carp = e.target.value
                  const sup = addForm.super_area_sqft
                  const ratio = calculateRatio(sup, carp)
                  setAddForm(f => ({ ...f, carpet_area_sqft: carp, carpet_to_super_ratio_pct: ratio }))
                }}
                className={inp()}
                placeholder="e.g. 1350"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-purple-700 mb-1">Efficiency %</label>
              <input
                type="number"
                value={addForm.carpet_to_super_ratio_pct}
                onChange={e => setAddForm(f => ({ ...f, carpet_to_super_ratio_pct: e.target.value }))}
                className={inp('bg-purple-50 font-black text-purple-900')}
                placeholder="Auto-calculated"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-600 mb-1">Price Min (₹ Cr)</label>
              <input
                type="number" step="0.01"
                value={addForm.price_min_cr}
                onChange={e => setAddForm(f => ({ ...f, price_min_cr: e.target.value }))}
                className={inp()}
                placeholder="1.50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-600 mb-1">Price Max (₹ Cr)</label>
              <input
                type="number" step="0.01"
                value={addForm.price_max_cr}
                onChange={e => setAddForm(f => ({ ...f, price_max_cr: e.target.value }))}
                className={inp()}
                placeholder="1.80"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-600 mb-1">Bathrooms</label>
              <input
                type="number"
                value={addForm.bathrooms}
                onChange={e => setAddForm(f => ({ ...f, bathrooms: e.target.value }))}
                className={inp()}
                placeholder="3"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-purple-200/60">
            <button
              onClick={() => { setShowAdd(false); setAddForm(EMPTY_ADD) }}
              className="px-4 py-2 text-[13px] font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={addUnit}
              disabled={addSaving || !addForm.name || !addForm.bhk}
              className="flex items-center gap-1.5 px-5 py-2 text-[13px] font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 transition-all shadow-sm"
            >
              {addSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create Unit Configuration
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
