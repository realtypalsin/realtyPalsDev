'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, RefreshCw, CheckCircle2, Clock, Calendar, Rss } from 'lucide-react'
import { toast } from 'sonner'
import { adminAuthHeaders } from '@/lib/authedFetch'
import { API_BASE } from '@/lib/env'
import CustomSelect from './CustomSelect'

export interface UpdateItem {
  id?: string
  name: string
  status: 'completed' | 'in_progress' | 'upcoming'
  date_label: string
  sort_order: number
}

interface Props {
  projectId: string
  projectStatus?: 'under_construction' | 'ready_to_move' | 'new_launch'
}

const DEFAULT_UNDER_CONSTRUCTION = [
  { name: 'RERA Registration & Site Clearing', status: 'completed' as const, date_label: 'Q1 2024', sort_order: 1 },
  { name: 'Tower Raft & Basement Slab Casting', status: 'completed' as const, date_label: 'Q4 2024', sort_order: 2 },
  { name: 'Superstructure Slab Casting (20th Floor)', status: 'in_progress' as const, date_label: 'Q2 2025', sort_order: 3 },
  { name: 'Internal Brickwork & Plastering', status: 'in_progress' as const, date_label: 'Q4 2025', sort_order: 4 },
  { name: 'MEP, Plumbing & Elevator Installation', status: 'upcoming' as const, date_label: 'Q2 2026', sort_order: 5 },
  { name: 'Occupancy Certificate Inspection & Keys Handover', status: 'upcoming' as const, date_label: 'Q4 2026', sort_order: 6 },
]

const DEFAULT_READY_TO_MOVE = [
  { name: 'Occupancy Certificate (OC) Verified', status: 'completed' as const, date_label: 'Granted', sort_order: 1 },
  { name: 'Resident Flat Possession & Key Handover', status: 'completed' as const, date_label: 'Active', sort_order: 2 },
  { name: 'Grand Clubhouse & Swimming Pool Launch', status: 'completed' as const, date_label: 'Operational', sort_order: 3 },
  { name: 'Annual Society Maintenance & Security Audit', status: 'in_progress' as const, date_label: 'Ongoing', sort_order: 4 },
  { name: 'EV Charging Basement Station Installation', status: 'upcoming' as const, date_label: 'Q3 2025', sort_order: 5 },
]

export default function ProjectUpdatesEditor({ projectId, projectStatus = 'under_construction' }: Props) {
  const [updates, setUpdates] = useState<UpdateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const isUnderConstruction = projectStatus === 'under_construction'
  const defaults = isUnderConstruction ? DEFAULT_UNDER_CONSTRUCTION : DEFAULT_READY_TO_MOVE
  const sectionTitle = isUnderConstruction ? 'Construction Site Log & Media Feed' : 'Society Lifecycle & Resident Feed'
  const sectionDescription = isUnderConstruction
    ? 'Public site progress feed broadcasted to buyers'
    : 'Resident announcements, AOA updates, and society highlights'

  const fetchUpdates = async () => {
    setLoading(true)
    try {
      const endpoint = isUnderConstruction ? 'milestones' : 'updates'
      const res = await fetch(`${API_BASE}/admin/projects/${projectId}/${endpoint}`, {
        headers: adminAuthHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        const key = isUnderConstruction ? 'milestones' : 'updates'
        if (Array.isArray(data[key]) && data[key].length > 0) {
          setUpdates(data[key])
        } else {
          setUpdates(defaults)
        }
      } else {
        setUpdates(defaults)
      }
    } catch {
      setUpdates(defaults)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUpdates()
  }, [projectId, projectStatus])

  const handleSave = async () => {
    setSaving(true)
    try {
      const endpoint = isUnderConstruction ? 'milestones' : 'updates'
      const key = isUnderConstruction ? 'milestones' : 'updates'
      const res = await fetch(`${API_BASE}/admin/projects/${projectId}/${endpoint}`, {
        method: 'PUT',
        headers: adminAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ [key]: updates }),
      })

      if (!res.ok) throw new Error('Failed to save')
      toast.success(`${sectionTitle} saved successfully`)
      await fetchUpdates()
    } catch (err: any) {
      toast.error(err.message || 'Error saving updates')
    } finally {
      setSaving(false)
    }
  }

  const addUpdate = () => {
    const newSort = Math.max(0, ...updates.map(u => u.sort_order)) + 1
    setUpdates([...updates, { name: '', status: 'upcoming', date_label: '', sort_order: newSort }])
  }

  if (loading) {
    return <div className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            <Rss size={18} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">{sectionTitle}</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{sectionDescription}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={addUpdate}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus size={14} /> Add Log Entry
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-full text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{saving ? 'Saving...' : 'Save Feed'}</span>
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {updates.map((update, i) => (
          <div key={i} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-3 bg-slate-50/70 dark:bg-zinc-800/40 rounded-xl border border-slate-200/60 dark:border-zinc-700/60 hover:bg-slate-50 dark:hover:bg-zinc-800/70 transition-all">
            <CustomSelect
              value={update.status}
              onChange={(val) => {
                const newUpdates = [...updates]
                newUpdates[i].status = val as any
                setUpdates(newUpdates)
              }}
              options={[
                { value: 'completed', label: 'Completed', dotColor: 'bg-emerald-500' },
                { value: 'in_progress', label: 'In Progress', dotColor: 'bg-amber-500' },
                { value: 'upcoming', label: 'Upcoming', dotColor: 'bg-zinc-400' },
              ]}
              size="sm"
              className="w-40 shrink-0"
            />

            <input
              type="text"
              placeholder="Update headline / milestone entry..."
              value={update.name}
              onChange={(e) => {
                const newUpdates = [...updates]
                newUpdates[i].name = e.target.value
                setUpdates(newUpdates)
              }}
              className="flex-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white text-slate-900"
            />

            <input
              type="text"
              placeholder="Quarter (Q1 2025)"
              value={update.date_label}
              onChange={(e) => {
                const newUpdates = [...updates]
                newUpdates[i].date_label = e.target.value
                setUpdates(newUpdates)
              }}
              className="w-32 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white text-slate-900"
            />

            <button
              onClick={() => setUpdates(updates.filter((_, idx) => idx !== i))}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors self-end sm:self-center"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
