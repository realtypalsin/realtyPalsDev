'use client'

import { useState } from 'react'
import { Plus, X, Save, FileText, CheckCircle2 } from 'lucide-react'
import { API_BASE } from '@/lib/env'
import { toast } from 'sonner'
import { adminAuthHeaders } from '@/lib/authedFetch'

export default function PaymentPlanEditor({ projectId, initialData }: { projectId: string, initialData?: any }) {
  const [planName, setPlanName] = useState(initialData?.plan_name || 'Construction Linked Plan')
  const [milestones, setMilestones] = useState<any[]>(initialData?.milestones || [])

  const addMilestone = () => {
    setMilestones([...milestones, { milestone: '', pct: '', amt: '', due: '', done: false }])
  }

  const updateMilestone = (i: number, key: string, val: any) => {
    const updated = [...milestones]
    updated[i][key] = val
    setMilestones(updated)
  }

  const removeMilestone = (i: number) => {
    setMilestones(milestones.filter((_, idx) => idx !== i))
  }

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/projects/${projectId}/payment-plan`, {
        method: 'PUT',
        headers: { ...adminAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_name: planName,
          milestones
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Payment plan saved successfully')
    } catch (e) {
      toast.error('Error saving payment plan')
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <FileText size={18} />
        </div>
        <div>
          <h3 className="text-[16px] font-black text-gray-900">Payment Plan</h3>
          <p className="text-[13px] text-gray-500">Configure the payment schedule milestones.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-6">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Plan Name</label>
          <input
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            className="w-full bg-slate-50/80 rounded-xl px-4 py-3 text-[14px]"
            placeholder="Construction Linked Plan"
          />
        </div>
      </div>

      <div className="space-y-3 mb-6 overflow-x-auto pb-2">
        <div className="min-w-[700px] space-y-3">
          {milestones.map((m, i) => (
            <div key={i} className="grid grid-cols-[auto_minmax(180px,3fr)_minmax(80px,1fr)_minmax(100px,1.5fr)_minmax(120px,2fr)_auto] items-center gap-3 bg-gray-50/80 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors">
              <button
                onClick={() => updateMilestone(i, 'done', !m.done)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${m.done ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-200' : 'border-gray-300 hover:border-gray-400 bg-white'}`}
              >
                {m.done && <CheckCircle2 size={14} />}
              </button>
              <input
                value={m.milestone || m.label || ''}
                onChange={(e) => updateMilestone(i, 'milestone', e.target.value)}
                className="w-full bg-white rounded-lg px-3 py-2.5 text-[13px] font-medium border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-400"
                placeholder="Milestone (e.g. On Booking)"
              />
              <input
                value={m.pct}
                onChange={(e) => updateMilestone(i, 'pct', e.target.value)}
                className="w-full bg-white rounded-lg px-3 py-2.5 text-[13px] font-medium border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-400"
                placeholder="10%"
              />
              <input
                value={m.amt}
                onChange={(e) => updateMilestone(i, 'amt', e.target.value)}
                className="w-full bg-white rounded-lg px-3 py-2.5 text-[13px] font-medium border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-400"
                placeholder="₹5 Lakhs"
              />
              <input
                value={m.due}
                onChange={(e) => updateMilestone(i, 'due', e.target.value)}
                className="w-full bg-white rounded-lg px-3 py-2.5 text-[13px] font-medium border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-400"
                placeholder="Jan 2024"
              />
              <button onClick={() => removeMilestone(i)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors flex-shrink-0">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <button onClick={addMilestone} className="text-[13px] font-bold text-blue-600 flex items-center gap-1 hover:bg-blue-50 px-3 py-1.5 rounded-lg">
          <Plus size={14} /> Add Milestone
        </button>
        <button onClick={handleSave} className="bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-full text-[13px] font-bold flex items-center gap-2">
          <Save size={16} /> Save Plan
        </button>
      </div>
    </div>
  )
}
