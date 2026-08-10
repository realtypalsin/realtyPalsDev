'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Save, FileText, CheckCircle2, Award, Zap, Percent, Clock } from 'lucide-react'
import { API_BASE } from '@/lib/env'
import { toast } from 'sonner'
import { adminAuthHeaders } from '@/lib/authedFetch'

const PLAN_TYPES = [
  { id: 'construction_linked', name: 'Construction Linked (CLP)' },
  { id: 'flexi', name: 'Flexi Payment Plan' },
  { id: 'down_payment', name: 'Down Payment Plan' },
  { id: 'investor', name: 'Investor Plan' },
  { id: 'possession_linked', name: 'Possession Linked (PLP)' },
  { id: 'nri', name: 'NRI Remittance Plan' }
]

export default function PaymentPlanEditor({ projectId, initialData }: { projectId: string; initialData?: any }) {
  const [plans, setPlans] = useState<any[]>([])
  const [activeType, setActiveType] = useState<string>('construction_linked')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchPlans = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/admin/projects/${projectId}/payment-plans`, {
        headers: adminAuthHeaders()
      })
      if (res.ok) {
        const d = await res.json()
        if (Array.isArray(d.payment_plans) && d.payment_plans.length > 0) {
          setPlans(d.payment_plans)
          return
        }
      }
      if (initialData) setPlans([initialData])
    } catch {
      if (initialData) setPlans([initialData])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [projectId])

  const currentPlan = plans.find(p => p.plan_type === activeType) || {
    plan_type: activeType,
    plan_name: PLAN_TYPES.find(t => t.id === activeType)?.name || 'Custom Plan',
    description: '',
    milestones: [],
    down_payment_pct: 10,
    booking_amount_lakh: 5,
    discount_offered_pct: 0,
    best_for: '',
    watch_out: ''
  }

  const updateCurrentPlan = (field: string, val: any) => {
    const exists = plans.some(p => p.plan_type === activeType)
    let updated: any[]
    if (exists) {
      updated = plans.map(p => p.plan_type === activeType ? { ...p, [field]: val } : p)
    } else {
      updated = [...plans, { ...currentPlan, [field]: val }]
    }
    setPlans(updated)
  }

  const addMilestone = () => {
    const ms = currentPlan.milestones || []
    updateCurrentPlan('milestones', [...ms, { milestone: '', pct: '', amt: '', due: '', done: false }])
  }

  const updateMilestone = (i: number, key: string, val: any) => {
    const ms = [...(currentPlan.milestones || [])]
    ms[i] = { ...ms[i], [key]: val }
    updateCurrentPlan('milestones', ms)
  }

  const removeMilestone = (i: number) => {
    const ms = (currentPlan.milestones || []).filter((_: any, idx: number) => idx !== i)
    updateCurrentPlan('milestones', ms)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/admin/projects/${projectId}/payment-plans`, {
        method: 'PUT',
        headers: adminAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ payment_plans: plans }),
      })
      if (!res.ok) throw new Error('Failed to save payment plans')
      toast.success('All payment plans saved successfully')
    } catch (e: any) {
      toast.error(e.message || 'Error saving payment plans')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText size={18} />
          </div>
          <div>
            <h3 className="text-[16px] font-black text-gray-900">Payment Plans Arsenal ({plans.length} Configured)</h3>
            <p className="text-[13px] text-gray-500">Configure multi-plan structures, upfront discounts, and stage milestones.</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="bg-slate-900 hover:bg-black text-white px-5 py-2 rounded-full text-[13px] font-bold flex items-center gap-2 transition-all">
          <Save size={15} /> Save All Plans
        </button>
      </div>

      {/* Plan Type Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-100">
        {PLAN_TYPES.map(t => {
          const isConfigured = plans.some(p => p.plan_type === t.id)
          const isActive = activeType === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveType(t.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                  : isConfigured
                  ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  : 'bg-slate-50 text-slate-400 hover:text-slate-600'
              }`}
            >
              <span>{t.name}</span>
              {isConfigured && <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-emerald-500'}`} />}
            </button>
          )
        })}
      </div>

      {/* Selected Plan Details Form */}
      <div className="space-y-4 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-1.5">Plan Display Name</label>
            <input
              value={currentPlan.plan_name || ''}
              onChange={(e) => updateCurrentPlan('plan_name', e.target.value)}
              className="w-full bg-white rounded-lg px-3 py-2 text-[13px] font-semibold border border-gray-200"
              placeholder="e.g. Construction Linked Plan (10:90 CLP)"
            />
          </div>
          <div>
            <label className="block text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-1.5">Description Summary</label>
            <input
              value={currentPlan.description || ''}
              onChange={(e) => updateCurrentPlan('description', e.target.value)}
              className="w-full bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200"
              placeholder="Standard stage-by-stage schedule tied to site progress."
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Down Payment %</label>
            <input
              type="number"
              value={currentPlan.down_payment_pct ?? ''}
              onChange={(e) => updateCurrentPlan('down_payment_pct', parseFloat(e.target.value) || 0)}
              className="w-full bg-white rounded-lg px-3 py-1.5 text-[13px] font-medium border border-gray-200"
              placeholder="10"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Booking Amt (Lakhs)</label>
            <input
              type="number"
              value={currentPlan.booking_amount_lakh ?? ''}
              onChange={(e) => updateCurrentPlan('booking_amount_lakh', parseFloat(e.target.value) || 0)}
              className="w-full bg-white rounded-lg px-3 py-1.5 text-[13px] font-medium border border-gray-200"
              placeholder="5.0"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Discount Offered %</label>
            <input
              type="number"
              value={currentPlan.discount_offered_pct ?? ''}
              onChange={(e) => updateCurrentPlan('discount_offered_pct', parseFloat(e.target.value) || 0)}
              className="w-full bg-white rounded-lg px-3 py-1.5 text-[13px] font-medium border border-gray-200"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tenure (Months)</label>
            <input
              type="number"
              value={currentPlan.total_duration_months ?? 36}
              onChange={(e) => updateCurrentPlan('total_duration_months', parseInt(e.target.value) || 36)}
              className="w-full bg-white rounded-lg px-3 py-1.5 text-[13px] font-medium border border-gray-200"
              placeholder="36"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Best For (Target Persona)</label>
            <input
              value={currentPlan.best_for || ''}
              onChange={(e) => updateCurrentPlan('best_for', e.target.value)}
              className="w-full bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200"
              placeholder="End users seeking risk-mitigated payments."
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Watch Out / Caveat</label>
            <input
              value={currentPlan.watch_out || ''}
              onChange={(e) => updateCurrentPlan('watch_out', e.target.value)}
              className="w-full bg-white rounded-lg px-3 py-2 text-[13px] border border-gray-200"
              placeholder="Late payment penalty SBI MCLR + 2% applies."
            />
          </div>
        </div>
      </div>

      {/* Milestone List */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Stage Milestones ({currentPlan.milestones?.length || 0})</label>
          <button onClick={addMilestone} className="text-[12px] font-bold text-blue-600 flex items-center gap-1">
            <Plus size={14} /> Add Stage Milestone
          </button>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {(currentPlan.milestones || []).map((m: any, i: number) => (
            <div key={i} className="grid grid-cols-[auto_minmax(180px,3fr)_minmax(80px,1fr)_minmax(100px,1.5fr)_minmax(120px,2fr)_auto] items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <button
                onClick={() => updateMilestone(i, 'done', !m.done)}
                className={`w-5 h-5 rounded-full border flex items-center justify-center ${m.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white'}`}
              >
                {m.done && <CheckCircle2 size={12} />}
              </button>
              <input
                value={m.milestone || m.label || ''}
                onChange={(e) => updateMilestone(i, 'milestone', e.target.value)}
                className="bg-white rounded px-2.5 py-1.5 text-[12px] font-medium border border-gray-200"
                placeholder="Milestone description"
              />
              <input
                value={m.pct || ''}
                onChange={(e) => updateMilestone(i, 'pct', e.target.value)}
                className="bg-white rounded px-2.5 py-1.5 text-[12px] font-medium border border-gray-200"
                placeholder="10%"
              />
              <input
                value={m.amt || ''}
                onChange={(e) => updateMilestone(i, 'amt', e.target.value)}
                className="bg-white rounded px-2.5 py-1.5 text-[12px] font-medium border border-gray-200"
                placeholder="₹12.5 Lakhs"
              />
              <input
                value={m.due || ''}
                onChange={(e) => updateMilestone(i, 'due', e.target.value)}
                className="bg-white rounded px-2.5 py-1.5 text-[12px] font-medium border border-gray-200"
                placeholder="Milestone 1 / Date"
              />
              <button onClick={() => removeMilestone(i)} className="text-gray-400 hover:text-red-500 p-1.5">
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
