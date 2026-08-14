'use client'

import { useState } from 'react'
import { Plus, Trash2, Check, AlertCircle } from 'lucide-react'
import { API_BASE } from '@/lib/env'
import { adminAuthHeaders } from '@/lib/authedFetch'

const CATEGORIES = [
  'structure',
  'flooring',
  'kitchen',
  'bathrooms',
  'doors_windows',
  'electrical',
  'plumbing',
  'lifts',
  'security',
  'sustainability',
  'parking',
] as const

const TIERS = ['standard', 'premium', 'luxury'] as const

interface SpecItem {
  id?: string
  category: string
  label: string
  value: string
  brand?: string | null
  tier?: string | null
  is_highlight?: boolean
  verified_at?: Date | null
}

interface SpecEditorProps {
  projectId: string
  specs: SpecItem[]
  onSpecsChange: (specs: SpecItem[]) => void
}

export default function SpecEditor({ projectId, specs, onSpecsChange }: SpecEditorProps) {
  const [localSpecs, setLocalSpecs] = useState<SpecItem[]>(specs)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addSpec = () => {
    setLocalSpecs([
      ...localSpecs,
      {
        category: 'structure',
        label: '',
        value: '',
        brand: null,
        tier: null,
        is_highlight: false,
      },
    ])
  }

  const deleteSpec = (idx: number) => {
    setLocalSpecs(localSpecs.filter((_, i) => i !== idx))
  }

  const updateSpec = (idx: number, field: keyof SpecItem, val: any) => {
    setLocalSpecs(
      localSpecs.map((s, i) =>
        i === idx ? { ...s, [field]: val } : s
      )
    )
  }

  const saveSpecs = async () => {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/specs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders(),
        },
        body: JSON.stringify({ specs: localSpecs }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to save specs')
      }

      const result = await response.json()
      onSpecsChange(result.specs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 text-gray-900 dark:text-gray-100">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Construction & Material Specifications</h3>
        <button
          type="button"
          onClick={addSpec}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-100 dark:hover:bg-blue-950/70 transition border border-blue-200/60 dark:border-blue-800/60"
        >
          <Plus size={14} /> Add Spec
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {localSpecs.map((spec, idx) => (
          <div key={idx} className="bg-gray-50 dark:bg-slate-800 p-3 rounded border border-gray-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Spec {idx + 1}</span>
              <button
                type="button"
                onClick={() => deleteSpec(idx)}
                className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
                <select
                  value={spec.category}
                  onChange={e => updateSpec(idx, 'category', e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tier</label>
                <select
                  value={spec.tier || ''}
                  onChange={e => updateSpec(idx, 'tier', e.target.value || null)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                >
                  <option value="">None</option>
                  {TIERS.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Label *</label>
              <input
                type="text"
                placeholder="e.g., Structure Type"
                value={spec.label}
                onChange={e => updateSpec(idx, 'label', e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Value *</label>
              <input
                type="text"
                placeholder="e.g., Mivan RCC, Seismic Zone 4"
                value={spec.value}
                onChange={e => updateSpec(idx, 'value', e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Brand (Optional)</label>
              <input
                type="text"
                placeholder="e.g., Kohler, Grohe"
                value={spec.brand || ''}
                onChange={e => updateSpec(idx, 'brand', e.target.value || null)}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`highlight-${idx}`}
                checked={spec.is_highlight || false}
                onChange={e => updateSpec(idx, 'is_highlight', e.target.checked)}
                className="rounded dark:bg-slate-900 dark:border-slate-600"
              />
              <label htmlFor={`highlight-${idx}`} className="text-xs text-gray-700 dark:text-gray-300">
                Show in showcase grid
              </label>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={saveSpecs}
        disabled={saving}
        className="w-full px-3 py-2 bg-green-600 dark:bg-green-700 text-white text-sm rounded hover:bg-green-700 dark:hover:bg-green-800 disabled:bg-gray-500 dark:disabled:bg-gray-600 disabled:text-gray-100 transition flex items-center justify-center gap-2"
      >
        {saving ? 'Saving...' : <>
          <Check size={14} />
          Save Specifications
        </>}
      </button>
    </div>
  )
}
