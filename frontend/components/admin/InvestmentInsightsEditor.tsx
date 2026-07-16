'use client'

import { useState } from 'react'
import { Save, TrendingUp, BarChart2 } from 'lucide-react'
import { API_BASE } from '@/lib/env'
import { toast } from 'sonner'
import JsonEditor from './JsonEditor'

export default function InvestmentInsightsEditor({ projectId, initialData }: { projectId: string, initialData?: any }) {
  const [appreciationAnnual, setAppreciationAnnual] = useState(initialData?.appreciation_annual ?? '')
  const [appreciationDesc, setAppreciationDesc] = useState(initialData?.appreciation_desc ?? '')
  const [rentalYield, setRentalYield] = useState(initialData?.rental_yield ?? '')
  const [rentalDesc, setRentalDesc] = useState(initialData?.rental_desc ?? '')
  const [marketTrend, setMarketTrend] = useState(initialData?.market_trend ?? '')
  const [marketDesc, setMarketDesc] = useState(initialData?.market_desc ?? '')
  const [liquidityScore, setLiquidityScore] = useState(initialData?.liquidity_score ?? '')
  const [liquidityDesc, setLiquidityDesc] = useState(initialData?.liquidity_desc ?? '')
  
  const [investmentReport, setInvestmentReport] = useState<any>(
    initialData?.decision_profile?.intelligence_data?.investmentReport || {}
  )

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/projects/${projectId}/investment-insights`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appreciation_annual: appreciationAnnual || null,
          appreciation_desc: appreciationDesc || null,
          rental_yield: rentalYield || null,
          rental_desc: rentalDesc || null,
          market_trend: marketTrend || null,
          market_desc: marketDesc || null,
          liquidity_score: liquidityScore || null,
          liquidity_desc: liquidityDesc || null,
        }),
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to save basic insights')

      // Also save investmentReport to decision_profile.intelligence_data
      const decisionRes = await fetch(`${API_BASE}/admin/projects/${projectId}/decision-profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intelligence_data: {
            ...initialData?.decision_profile?.intelligence_data,
            investmentReport: investmentReport
          }
        }),
        credentials: 'include'
      })
      if (!decisionRes.ok) throw new Error('Failed to save investment report')

      toast.success('Investment insights saved successfully')
    } catch (e) {
      toast.error('Error saving investment insights')
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <TrendingUp size={18} />
        </div>
        <div>
          <h3 className="text-[16px] font-black text-gray-900">Investment Insights</h3>
          <p className="text-[13px] text-gray-500">Configure appreciation, rental yield, and liquidity metrics.</p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Price Appreciation</label>
            <input value={appreciationAnnual} onChange={(e) => setAppreciationAnnual(e.target.value)} className="w-full bg-slate-50/80 rounded-xl px-4 py-2 text-[14px] mb-2" placeholder="12-15%" />
            <input value={appreciationDesc} onChange={(e) => setAppreciationDesc(e.target.value)} className="w-full bg-slate-50/80 rounded-xl px-4 py-2 text-[13px]" placeholder="Annual growth estimate" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rental Yield</label>
            <input value={rentalYield} onChange={(e) => setRentalYield(e.target.value)} className="w-full bg-slate-50/80 rounded-xl px-4 py-2 text-[14px] mb-2" placeholder="4-5%" />
            <input value={rentalDesc} onChange={(e) => setRentalDesc(e.target.value)} className="w-full bg-slate-50/80 rounded-xl px-4 py-2 text-[13px]" placeholder="Expected annual rental yield" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Market Trend</label>
            <input value={marketTrend} onChange={(e) => setMarketTrend(e.target.value)} className="w-full bg-slate-50/80 rounded-xl px-4 py-2 text-[14px] mb-2" placeholder="Bullish" />
            <input value={marketDesc} onChange={(e) => setMarketDesc(e.target.value)} className="w-full bg-slate-50/80 rounded-xl px-4 py-2 text-[13px]" placeholder="Strong demand in Sector 150" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Liquidity Score</label>
            <input value={liquidityScore} onChange={(e) => setLiquidityScore(e.target.value)} className="w-full bg-slate-50/80 rounded-xl px-4 py-2 text-[14px] mb-2" placeholder="High" />
            <input value={liquidityDesc} onChange={(e) => setLiquidityDesc(e.target.value)} className="w-full bg-slate-50/80 rounded-xl px-4 py-2 text-[13px]" placeholder="Easy exit options available" />
          </div>
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <BarChart2 size={18} />
          </div>
          <div>
            <h3 className="text-[16px] font-black text-gray-900">Advanced Investment Report</h3>
            <p className="text-[13px] text-gray-500">Edit the detailed investmentReport JSON used by the AI.</p>
          </div>
        </div>
        <JsonEditor
          value={investmentReport}
          onChange={setInvestmentReport}
          label="Investment Report JSON"
          description="Use valid JSON. This updates the frontend arrays directly."
        />
      </div>

      <div className="flex justify-end pt-6 mt-6 border-t border-gray-100">
        <button onClick={handleSave} className="bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-full text-[13px] font-bold flex items-center gap-2">
          <Save size={16} /> Save All Changes
        </button>
      </div>
    </div>
  )
}
