'use client'

import { useState } from 'react'
import { Plus, X, Save, IndianRupee, Layers, ShieldCheck, Zap, Info } from 'lucide-react'
import { API_BASE } from '@/lib/env'
import { toast } from 'sonner'
import { adminAuthHeaders } from '@/lib/authedFetch'

export default function CostSheetEditor({ projectId, initialData }: { projectId: string; initialData?: any }) {
  const [bsp, setBsp] = useState(initialData?.base_price_per_sqft ?? '')
  const [floorRise, setFloorRise] = useState(initialData?.floor_rise_per_floor ?? '')
  
  const [gstPct, setGstPct] = useState(initialData?.gst_rate_pct ?? '')
  const [gstNote, setGstNote] = useState(initialData?.gst_note ?? '')
  const [stampDutyPct, setStampDutyPct] = useState(initialData?.stamp_duty_pct ?? '')
  const [regPct, setRegPct] = useState(initialData?.registration_pct ?? '')

  const [parkingCost, setParkingCost] = useState(initialData?.parking_cost ?? '')
  const [clubMembership, setClubMembership] = useState(initialData?.club_membership ?? '')
  const [ifms, setIfms] = useState(initialData?.ifms ?? '')
  const [electricity, setElectricity] = useState(initialData?.electricity_connection ?? '')
  const [waterSewer, setWaterSewer] = useState(initialData?.water_sewer_connection ?? '')
  const [maintenancePsf, setMaintenancePsf] = useState(initialData?.maintenance_psf_monthly ?? '')

  const [plcCharges, setPlcCharges] = useState<any[]>(initialData?.plc_charges || [])
  const [otherCharges, setOtherCharges] = useState<any[]>(initialData?.other_charges || [])
  const [assumptions, setAssumptions] = useState<string[]>(initialData?.assumptions || [])
  const [newAssumption, setNewAssumption] = useState('')

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/projects/${projectId}/cost-sheet`, {
        method: 'PUT',
        headers: { ...adminAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_price_per_sqft: bsp ? parseFloat(bsp) : null,
          floor_rise_per_floor: floorRise ? parseFloat(floorRise) : null,
          gst_rate_pct: gstPct ? parseFloat(gstPct) : null,
          gst_note: gstNote || null,
          stamp_duty_pct: stampDutyPct ? parseFloat(stampDutyPct) : null,
          registration_pct: regPct ? parseFloat(regPct) : null,
          parking_cost: parkingCost ? parseFloat(parkingCost) : null,
          club_membership: clubMembership ? parseFloat(clubMembership) : null,
          ifms: ifms ? parseFloat(ifms) : null,
          electricity_connection: electricity ? parseFloat(electricity) : null,
          water_sewer_connection: waterSewer ? parseFloat(waterSewer) : null,
          maintenance_psf_monthly: maintenancePsf ? parseFloat(maintenancePsf) : null,
          plc_charges: plcCharges,
          other_charges: otherCharges,
          assumptions: assumptions
        }),
      })
      if (!res.ok) throw new Error('Failed to save cost sheet')
      toast.success('Complete cost sheet breakdown saved')
    } catch (e: any) {
      toast.error(e.message || 'Error saving cost sheet')
    }
  }

  const addAssumption = () => {
    if (!newAssumption.trim()) return
    setAssumptions([...assumptions, newAssumption.trim()])
    setNewAssumption('')
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <IndianRupee size={18} />
          </div>
          <div>
            <h3 className="text-[16px] font-black text-gray-900">Cost Sheet Breakdown</h3>
            <p className="text-[13px] text-gray-500">Configure base price, floor rise, utility charges, PLC, and tax assumptions.</p>
          </div>
        </div>
        <button onClick={handleSave} className="bg-slate-900 hover:bg-black text-white px-5 py-2 rounded-full text-[13px] font-bold flex items-center gap-2">
          <Save size={15} /> Save Cost Sheet
        </button>
      </div>

      {/* 1. Base Pricing & Taxes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
        <div>
          <label className="block text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-1">Base Price / Sqft (₹)</label>
          <input value={bsp} onChange={(e) => setBsp(e.target.value)} className="w-full bg-white rounded-lg px-3 py-2 text-[13px] font-bold border border-gray-200" type="number" placeholder="6800" />
        </div>
        <div>
          <label className="block text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-1">Floor Rise / Floor (₹)</label>
          <input value={floorRise} onChange={(e) => setFloorRise(e.target.value)} className="w-full bg-white rounded-lg px-3 py-2 text-[13px] font-medium border border-gray-200" type="number" placeholder="25" />
        </div>
        <div>
          <label className="block text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-1">GST Rate %</label>
          <input value={gstPct} onChange={(e) => setGstPct(e.target.value)} className="w-full bg-white rounded-lg px-3 py-2 text-[13px] font-medium border border-gray-200" type="number" placeholder="5" />
        </div>
        <div>
          <label className="block text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-1">Stamp Duty + Reg %</label>
          <div className="flex gap-1">
            <input value={stampDutyPct} onChange={(e) => setStampDutyPct(e.target.value)} className="w-1/2 bg-white rounded-lg px-2 py-2 text-[12px] border border-gray-200" type="number" placeholder="6%" />
            <input value={regPct} onChange={(e) => setRegPct(e.target.value)} className="w-1/2 bg-white rounded-lg px-2 py-2 text-[12px] border border-gray-200" type="number" placeholder="1%" />
          </div>
        </div>
        <div className="col-span-2 md:col-span-4">
          <label className="block text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-1">GST Application Note</label>
          <input value={gstNote} onChange={(e) => setGstNote(e.target.value)} className="w-full bg-white rounded-lg px-3 py-1.5 text-[12px] border border-gray-200" placeholder="e.g. 0% GST applicable for ready-to-move projects with Occupancy Certificate." />
        </div>
      </div>

      {/* 2. Possession & Utility Charges */}
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Possession & Utility One-Time Charges (₹)</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <span className="text-[11px] text-gray-500 font-medium">Parking Charge</span>
            <input value={parkingCost} onChange={(e) => setParkingCost(e.target.value)} className="w-full bg-slate-50 rounded-lg px-3 py-1.5 text-[13px] font-medium border border-gray-200" type="number" placeholder="400000" />
          </div>
          <div>
            <span className="text-[11px] text-gray-500 font-medium">Club Membership</span>
            <input value={clubMembership} onChange={(e) => setClubMembership(e.target.value)} className="w-full bg-slate-50 rounded-lg px-3 py-1.5 text-[13px] font-medium border border-gray-200" type="number" placeholder="250000" />
          </div>
          <div>
            <span className="text-[11px] text-gray-500 font-medium">IFMS Deposit</span>
            <input value={ifms} onChange={(e) => setIfms(e.target.value)} className="w-full bg-slate-50 rounded-lg px-3 py-1.5 text-[13px] font-medium border border-gray-200" type="number" placeholder="50000" />
          </div>
          <div>
            <span className="text-[11px] text-gray-500 font-medium">Electricity Meter</span>
            <input value={electricity} onChange={(e) => setElectricity(e.target.value)} className="w-full bg-slate-50 rounded-lg px-3 py-1.5 text-[13px] font-medium border border-gray-200" type="number" placeholder="35000" />
          </div>
          <div>
            <span className="text-[11px] text-gray-500 font-medium">Water & Sewer</span>
            <input value={waterSewer} onChange={(e) => setWaterSewer(e.target.value)} className="w-full bg-slate-50 rounded-lg px-3 py-1.5 text-[13px] font-medium border border-gray-200" type="number" placeholder="25000" />
          </div>
          <div>
            <span className="text-[11px] text-gray-500 font-medium">Monthly Maint. (₹/sqft)</span>
            <input value={maintenancePsf} onChange={(e) => setMaintenancePsf(e.target.value)} className="w-full bg-slate-50 rounded-lg px-3 py-1.5 text-[13px] font-medium border border-gray-200" type="number" step="0.1" placeholder="3.5" />
          </div>
        </div>
      </div>

      {/* 3. PLC Charges */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">PLC Charges (₹ / Sq.ft)</label>
          <button onClick={() => setPlcCharges([...plcCharges, { label: '', amount_per_sqft: '' }])} className="text-[12px] font-bold text-blue-600">Add PLC Tier</button>
        </div>
        <div className="space-y-2">
          {plcCharges.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input value={p.label} onChange={(e) => { const n = [...plcCharges]; n[i].label = e.target.value; setPlcCharges(n) }} placeholder="Park / Green Facing" className="flex-1 bg-slate-50 rounded-lg px-3 py-1.5 text-[13px] border border-gray-200" />
              <input value={p.amount_per_sqft} onChange={(e) => { const n = [...plcCharges]; n[i].amount_per_sqft = e.target.value ? parseFloat(e.target.value) : ''; setPlcCharges(n) }} placeholder="150" type="number" className="w-32 bg-slate-50 rounded-lg px-3 py-1.5 text-[13px] border border-gray-200" />
              <button onClick={() => setPlcCharges(plcCharges.filter((_, idx) => idx !== i))} className="p-1.5 text-gray-400 hover:text-red-500"><X size={15} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Cost Assumptions List */}
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cost Sheet Assumptions & Guidelines</label>
        <div className="space-y-2 mb-2">
          {assumptions.map((a, i) => (
            <div key={i} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[12px] font-medium text-slate-700">
              <span>• {a}</span>
              <button onClick={() => setAssumptions(assumptions.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 p-1"><X size={14} /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newAssumption}
            onChange={(e) => setNewAssumption(e.target.value)}
            className="flex-1 bg-slate-50 rounded-lg px-3 py-1.5 text-[13px] border border-gray-200"
            placeholder="Add new assumption guideline..."
          />
          <button onClick={addAssumption} className="bg-slate-900 text-white px-4 py-1.5 rounded-lg text-[12px] font-bold">Add</button>
        </div>
      </div>
    </div>
  )
}
