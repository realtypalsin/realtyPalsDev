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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Construction & Material Specifications</h3>
        <button
          type="button"
          onClick={addSpec}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition"
        >
          <Plus size={14} /> Add Spec
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {localSpecs.map((spec, idx) => (
          <div key={idx} className="bg-gray-50 p-3 rounded border border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600">Spec {idx + 1}</span>
              <button
                type="button"
                onClick={() => deleteSpec(idx)}
                className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={spec.category}
                  onChange={e => updateSpec(idx, 'category', e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tier</label>
                <select
                  value={spec.tier || ''}
                  onChange={e => updateSpec(idx, 'tier', e.target.value || null)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white"
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Label *</label>
              <input
                type="text"
                placeholder="e.g., Structure Type"
                value={spec.label}
                onChange={e => updateSpec(idx, 'label', e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Value *</label>
              <input
                type="text"
                placeholder="e.g., Mivan RCC, Seismic Zone 4"
                value={spec.value}
                onChange={e => updateSpec(idx, 'value', e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Brand (Optional)</label>
              <input
                type="text"
                placeholder="e.g., Kohler, Grohe"
                value={spec.brand || ''}
                onChange={e => updateSpec(idx, 'brand', e.target.value || null)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`highlight-${idx}`}
                checked={spec.is_highlight || false}
                onChange={e => updateSpec(idx, 'is_highlight', e.target.checked)}
                className="rounded"
              />
              <label htmlFor={`highlight-${idx}`} className="text-xs text-gray-700">
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
        className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-500 disabled:text-gray-100 transition flex items-center justify-center gap-2"
      >
        {saving ? 'Saving...' : <>
          <Check size={14} />
          Save Specifications
        </>}
      </button>
    </div>
  )
}
