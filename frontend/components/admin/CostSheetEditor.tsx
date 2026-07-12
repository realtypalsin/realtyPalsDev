'use client'

import { useState } from 'react'
import { Plus, X, Save, IndianRupee, CheckCircle2 } from 'lucide-react'
import { API_BASE } from '@/lib/env'
import { toast } from 'sonner'

export default function CostSheetEditor({ projectId, initialData }: { projectId: string, initialData?: any }) {
  const [gstPct, setGstPct] = useState(initialData?.gst_rate_pct ?? '')
  const [stampDutyPct, setStampDutyPct] = useState(initialData?.stamp_duty_pct ?? '')
  const [regPct, setRegPct] = useState(initialData?.registration_pct ?? '')
  
  const [parkingCost, setParkingCost] = useState(initialData?.parking_cost ?? '')
  const [clubMembership, setClubMembership] = useState(initialData?.club_membership ?? '')
  const [ifms, setIfms] = useState(initialData?.ifms ?? '')

  const [plcCharges, setPlcCharges] = useState<any[]>(initialData?.plc_charges || [])
  const [otherCharges, setOtherCharges] = useState<any[]>(initialData?.other_charges || [])

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/projects/${projectId}/cost-sheet`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gst_rate_pct: gstPct ? parseFloat(gstPct) : null,
          stamp_duty_pct: stampDutyPct ? parseFloat(stampDutyPct) : null,
          registration_pct: regPct ? parseFloat(regPct) : null,
          parking_cost: parkingCost ? parseFloat(parkingCost) : null,
          club_membership: clubMembership ? parseFloat(clubMembership) : null,
          ifms: ifms ? parseFloat(ifms) : null,
          plc_charges: plcCharges,
          other_charges: otherCharges
        }),
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Cost sheet saved successfully')
    } catch (e) {
      toast.error('Error saving cost sheet')
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
          <IndianRupee size={18} />
        </div>
        <div>
          <h3 className="text-[16px] font-black text-gray-900">Cost Sheet Breakdown</h3>
          <p className="text-[13px] text-gray-500">Configure taxes, PLC, and other charges.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">GST %</label>
          <input value={gstPct} onChange={(e) => setGstPct(e.target.value)} className="w-full bg-slate-50/80 rounded-xl px-4 py-2 text-[14px]" type="number" placeholder="5" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Stamp Duty %</label>
          <input value={stampDutyPct} onChange={(e) => setStampDutyPct(e.target.value)} className="w-full bg-slate-50/80 rounded-xl px-4 py-2 text-[14px]" type="number" placeholder="7" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Registration %</label>
          <input value={regPct} onChange={(e) => setRegPct(e.target.value)} className="w-full bg-slate-50/80 rounded-xl px-4 py-2 text-[14px]" type="number" placeholder="1" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6 pt-4 border-t border-gray-50">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Parking Cost (₹)</label>
          <input value={parkingCost} onChange={(e) => setParkingCost(e.target.value)} className="w-full bg-slate-50/80 rounded-xl px-4 py-2 text-[14px]" type="number" placeholder="400000" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Club Membership (₹)</label>
          <input value={clubMembership} onChange={(e) => setClubMembership(e.target.value)} className="w-full bg-slate-50/80 rounded-xl px-4 py-2 text-[14px]" type="number" placeholder="250000" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">IFMS (₹)</label>
          <input value={ifms} onChange={(e) => setIfms(e.target.value)} className="w-full bg-slate-50/80 rounded-xl px-4 py-2 text-[14px]" type="number" placeholder="50000" />
        </div>
      </div>

      {/* PLC Charges */}
      <div className="mb-6 pt-4 border-t border-gray-50">
        <div className="flex justify-between items-center mb-3">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">PLC Charges (Per Sq.ft)</label>
          <button onClick={() => setPlcCharges([...plcCharges, { label: '', amount_per_sqft: '' }])} className="text-[12px] font-bold text-blue-600">Add PLC</button>
        </div>
        <div className="space-y-2">
          {plcCharges.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input value={p.label} onChange={(e) => { const n = [...plcCharges]; n[i].label = e.target.value; setPlcCharges(n) }} placeholder="Park Facing" className="flex-[2] bg-slate-50/80 rounded-lg px-3 py-2 text-[13px]" />
              <input value={p.amount_per_sqft} onChange={(e) => { const n = [...plcCharges]; n[i].amount_per_sqft = e.target.value ? parseFloat(e.target.value) : ''; setPlcCharges(n) }} placeholder="200" type="number" className="flex-1 bg-slate-50/80 rounded-lg px-3 py-2 text-[13px]" />
              <button onClick={() => setPlcCharges(plcCharges.filter((_, idx) => idx !== i))} className="p-2 text-gray-400 hover:text-red-500"><X size={16} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Other Charges */}
      <div className="mb-6 pt-4 border-t border-gray-50">
        <div className="flex justify-between items-center mb-3">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Other One-Time Charges</label>
          <button onClick={() => setOtherCharges([...otherCharges, { label: '', description: '', amount: '' }])} className="text-[12px] font-bold text-blue-600">Add Charge</button>
        </div>
        <div className="space-y-2">
          {otherCharges.map((c, i) => (
            <div key={i} className="flex gap-2">
              <input value={c.label} onChange={(e) => { const n = [...otherCharges]; n[i].label = e.target.value; setOtherCharges(n) }} placeholder="Power Backup" className="flex-[1] bg-slate-50/80 rounded-lg px-3 py-2 text-[13px]" />
              <input value={c.description} onChange={(e) => { const n = [...otherCharges]; n[i].description = e.target.value; setOtherCharges(n) }} placeholder="Description (Optional)" className="flex-[2] bg-slate-50/80 rounded-lg px-3 py-2 text-[13px]" />
              <input value={c.amount} onChange={(e) => { const n = [...otherCharges]; n[i].amount = e.target.value ? parseFloat(e.target.value) : ''; setOtherCharges(n) }} placeholder="Amount" type="number" className="flex-[1] bg-slate-50/80 rounded-lg px-3 py-2 text-[13px]" />
              <button onClick={() => setOtherCharges(otherCharges.filter((_, idx) => idx !== i))} className="p-2 text-gray-400 hover:text-red-500"><X size={16} /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-100">
        <button onClick={handleSave} className="bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-full text-[13px] font-bold flex items-center gap-2">
          <Save size={16} /> Save Cost Sheet
        </button>
      </div>
    </div>
  )
}
