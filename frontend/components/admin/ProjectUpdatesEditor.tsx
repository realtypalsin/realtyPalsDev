'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, RefreshCw, CheckCircle2, Clock, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { adminAuthHeaders } from '@/lib/authedFetch'
import { API_BASE } from '@/lib/env'

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
  { name: 'Excavation & Substructure', status: 'completed' as const, date_label: 'Q1 2024', sort_order: 1 },
  { name: 'Tower Structure (RCC Frame)', status: 'completed' as const, date_label: 'Q4 2024', sort_order: 2 },
  { name: 'Brickwork & Internal Plaster', status: 'in_progress' as const, date_label: 'Q2 2025', sort_order: 3 },
  { name: 'MEP, Plumbing & Electrical', status: 'in_progress' as const, date_label: 'Q4 2025', sort_order: 4 },
  { name: 'Facade, Windows & Painting', status: 'upcoming' as const, date_label: 'Q2 2026', sort_order: 5 },
  { name: 'Finishing, Lift & Handover', status: 'upcoming' as const, date_label: 'Q4 2026', sort_order: 6 },
]

const DEFAULT_READY_TO_MOVE = [
  { name: 'RERA Approval & Registration', status: 'completed' as const, date_label: 'Granted', sort_order: 1 },
  { name: 'Occupancy Certificate (OC)', status: 'completed' as const, date_label: 'Issued', sort_order: 2 },
  { name: 'Possession Handover', status: 'completed' as const, date_label: 'Active', sort_order: 3 },
  { name: 'Maintenance & Warranty Support', status: 'in_progress' as const, date_label: 'Ongoing', sort_order: 4 },
  { name: 'Community Features Activation', status: 'in_progress' as const, date_label: 'Q3 2025', sort_order: 5 },
  { name: 'Annual Maintenance News', status: 'upcoming' as const, date_label: 'Quarterly', sort_order: 6 },
]

export default function ProjectUpdatesEditor({ projectId, projectStatus = 'under_construction' }: Props) {
  const [updates, setUpdates] = useState<UpdateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const isUnderConstruction = projectStatus === 'under_construction'
  const defaults = isUnderConstruction ? DEFAULT_UNDER_CONSTRUCTION : DEFAULT_READY_TO_MOVE
  const sectionTitle = isUnderConstruction ? 'Construction Milestones' : 'Project Updates & Maintenance'
  const sectionDescription = isUnderConstruction
    ? 'Track project construction progress and key milestones'
    : 'Track handover, possession, maintenance, and community updates'

  const fetchUpdates = async () => {
    setLoading(true)
    try {
      const endpoint = isUnderConstruction ? 'milestones' : 'updates'
      const res = await fetch(`${API_BASE}/v1/admin/projects/${projectId}/${endpoint}`, {
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
      const res = await fetch(`${API_BASE}/v1/admin/projects/${projectId}/${endpoint}`, {
        method: 'PUT',
        headers: adminAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ [key]: updates }),
      })

      if (!res.ok) throw new Error('Failed to save')
      toast.success(`${sectionTitle} saved`)
      await fetchUpdates()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const addUpdate = () => {
    const newSort = Math.max(0, ...updates.map(u => u.sort_order)) + 1
    setUpdates([...updates, { name: '', status: 'upcoming', date_label: '', sort_order: newSort }])
  }

  if (loading) {
    return <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-gray-900">{sectionTitle}</h3>
        <p className="text-sm text-gray-500 mt-1">{sectionDescription}</p>
      </div>

      <div className="space-y-3">
        {updates.map((update, i) => (
          <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
            <select
              value={update.status}
              onChange={(e) => {
                const newUpdates = [...updates]
                newUpdates[i].status = e.target.value as any
                setUpdates(newUpdates)
              }}
              className="px-3 py-2 text-xs border rounded bg-white"
            >
              <option value="completed">✓ Completed</option>
              <option value="in_progress">⚙ In Progress</option>
              <option value="upcoming">○ Upcoming</option>
            </select>

            <input
              type="text"
              placeholder="Update name"
              value={update.name}
              onChange={(e) => {
                const newUpdates = [...updates]
                newUpdates[i].name = e.target.value
                setUpdates(newUpdates)
              }}
              className="flex-1 px-3 py-2 text-sm border rounded bg-white"
            />

            <input
              type="text"
              placeholder="Date label (Q1 2024, etc.)"
              value={update.date_label}
              onChange={(e) => {
                const newUpdates = [...updates]
                newUpdates[i].date_label = e.target.value
                setUpdates(newUpdates)
              }}
              className="w-32 px-3 py-2 text-sm border rounded bg-white"
            />

            <button
              onClick={() => setUpdates(updates.filter((_, idx) => idx !== i))}
              className="p-2 text-red-600 hover:bg-red-50 rounded"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={addUpdate}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold rounded-lg text-sm flex items-center gap-2"
        >
          <Plus size={16} /> Add Update
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm disabled:opacity-50 flex items-center gap-2"
        >
          <Save size={16} /> Save
        </button>
      </div>
    </div>
  )
}
