'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, Home, CheckCircle2, Shield, Calendar, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { adminAuthHeaders } from '@/lib/authedFetch'
import { API_BASE } from '@/lib/env'
import CustomSelect from './CustomSelect'

export interface LifecycleItem {
  id?: string
  update_type: string
  title: string
  description?: string
  update_date?: string
  impact?: string
  maintenance_fee_monthly_psf?: number | string
  note?: string
}

const UPDATE_TYPES = [
  { id: 'possession_status_change', name: 'Possession & Resident Handover' },
  { id: 'maintenance_fee_update', name: 'Maintenance Fee Revision' },
  { id: 'amenity_addition', name: 'Amenity Launch' },
  { id: 'regulatory_compliance', name: 'Regulatory & Fire NOC' },
  { id: 'infrastructure_nearby', name: 'Nearby Infra Development' },
  { id: 'building_certification', name: 'Green Building / Safety Audit' }
]

export default function LifecycleUpdatesEditor({ projectId }: { projectId: string }) {
  const [updates, setUpdates] = useState<LifecycleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchUpdates = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/admin/projects/${projectId}/lifecycle-updates`, {
        headers: adminAuthHeaders(),
      })
      if (res.ok) {
        const d = await res.json()
        if (Array.isArray(d.updates)) {
          setUpdates(d.updates)
        }
      }
    } catch {
      toast.error('Failed to load post-delivery updates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUpdates()
  }, [projectId])

  const addUpdate = () => {
    setUpdates([
      ...updates,
      {
        update_type: 'possession_status_change',
        title: 'Resident Possession Active',
        description: 'Living society with functional AOA facility management.',
        maintenance_fee_monthly_psf: 3.50,
        impact: 'Positive'
      }
    ])
  }

  const updateItem = (i: number, key: string, val: any) => {
    const updated = [...updates]
    updated[i] = { ...updated[i], [key]: val }
    setUpdates(updated)
  }

  const removeUpdate = (i: number) => {
    setUpdates(updates.filter((_, idx) => idx !== i))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/admin/projects/${projectId}/lifecycle-updates`, {
        method: 'PUT',
        headers: adminAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ updates }),
      })
      if (!res.ok) throw new Error('Failed to save post-delivery updates')
      toast.success('Post-delivery society updates saved successfully')
    } catch (err: any) {
      toast.error(err.message || 'Error saving post-delivery updates')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Home size={18} />
          </div>
          <div>
            <h3 className="text-[16px] font-black text-gray-900">Post-Delivery & Society Feed ({updates.length} Updates)</h3>
            <p className="text-[13px] text-gray-500">Manage RWA/AOA maintenance fees, resident handover news, and amenity launches.</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-slate-900 hover:bg-black text-white px-5 py-2 rounded-full text-[13px] font-bold flex items-center gap-2"
        >
          <Save size={15} /> Save Society Updates
        </button>
      </div>

      <div className="space-y-3">
        {updates.map((item, i) => (
          <div key={i} className="p-3.5 bg-gray-50 dark:bg-zinc-800/40 rounded-2xl border border-gray-100 dark:border-zinc-700/60 space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-2">
              <CustomSelect
                value={item.update_type}
                onChange={(val) => updateItem(i, 'update_type', val)}
                options={UPDATE_TYPES.map(t => ({ value: t.id, label: t.name }))}
                size="sm"
                className="w-full sm:w-64 shrink-0"
              />
              <input
                type="text"
                placeholder="Update Title"
                value={item.title}
                onChange={(e) => updateItem(i, 'title', e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs font-bold border rounded-lg bg-white"
              />
              <button onClick={() => removeUpdate(i)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                <Trash2 size={15} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Description detail..."
                value={item.description || ''}
                onChange={(e) => updateItem(i, 'description', e.target.value)}
                className="md:col-span-2 px-3 py-1.5 text-xs border rounded-lg bg-white"
              />
              <input
                type="number"
                step="0.1"
                placeholder="Monthly Maint (₹/sqft)"
                value={item.maintenance_fee_monthly_psf ?? ''}
                onChange={(e) => updateItem(i, 'maintenance_fee_monthly_psf', e.target.value)}
                className="px-3 py-1.5 text-xs font-medium border rounded-lg bg-white"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2">
        <button
          onClick={addUpdate}
          className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1"
        >
          <Plus size={14} /> Add Society Update
        </button>
      </div>
    </div>
  )
}
