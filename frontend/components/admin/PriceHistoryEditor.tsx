'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, TrendingUp, Calendar, IndianRupee } from 'lucide-react'
import { toast } from 'sonner'
import { adminAuthHeaders } from '@/lib/authedFetch'
import { API_BASE } from '@/lib/env'

export interface PricePoint {
  id?: string
  quarter_label: string
  price_per_sqft: number | string
  total_price_cr?: number | string
  event_note?: string
}

export default function PriceHistoryEditor({ projectId }: { projectId: string }) {
  const [history, setHistory] = useState<PricePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/admin/projects/${projectId}/price-history`, {
        headers: adminAuthHeaders(),
      })
      if (res.ok) {
        const d = await res.json()
        if (Array.isArray(d.price_history)) {
          setHistory(d.price_history)
        }
      }
    } catch {
      toast.error('Failed to load price history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [projectId])

  const addPoint = () => {
    setHistory([...history, { quarter_label: 'Q1 2025', price_per_sqft: 7200, event_note: '' }])
  }

  const updatePoint = (i: number, key: string, val: any) => {
    const updated = [...history]
    updated[i] = { ...updated[i], [key]: val }
    setHistory(updated)
  }

  const removePoint = (i: number) => {
    setHistory(history.filter((_, idx) => idx !== i))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/admin/projects/${projectId}/price-history`, {
        method: 'PUT',
        headers: adminAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ price_history: history }),
      })
      if (!res.ok) throw new Error('Failed to save price history')
      toast.success('Price history saved successfully')
    } catch (err: any) {
      toast.error(err.message || 'Error saving price history')
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
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp size={18} />
          </div>
          <div>
            <h3 className="text-[16px] font-black text-gray-900">Price Appreciation History ({history.length} Points)</h3>
            <p className="text-[13px] text-gray-500">Track quarterly price-per-sqft growth and market milestones.</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-slate-900 hover:bg-black text-white px-5 py-2 rounded-full text-[13px] font-bold flex items-center gap-2"
        >
          <Save size={15} /> Save Price History
        </button>
      </div>

      <div className="space-y-2">
        {history.map((point, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
            <input
              type="text"
              placeholder="Q1 2025"
              value={point.quarter_label}
              onChange={(e) => updatePoint(i, 'quarter_label', e.target.value)}
              className="w-28 px-3 py-1.5 text-xs font-bold border rounded-lg bg-white"
            />
            <input
              type="number"
              placeholder="Price/Sqft (₹)"
              value={point.price_per_sqft}
              onChange={(e) => updatePoint(i, 'price_per_sqft', e.target.value)}
              className="w-36 px-3 py-1.5 text-xs font-bold border rounded-lg bg-white"
            />
            <input
              type="text"
              placeholder="Event Note (e.g. Metro Line Opened, Slab Cast)"
              value={point.event_note || ''}
              onChange={(e) => updatePoint(i, 'event_note', e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs border rounded-lg bg-white"
            />
            <button
              onClick={() => removePoint(i)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      <div className="pt-2">
        <button
          onClick={addPoint}
          className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1"
        >
          <Plus size={14} /> Add Price Snapshot Point
        </button>
      </div>
    </div>
  )
}
