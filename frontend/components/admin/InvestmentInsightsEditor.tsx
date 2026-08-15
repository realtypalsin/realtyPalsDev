'use client'

import { useState } from 'react'
import { Save, TrendingUp, BarChart2 } from 'lucide-react'
import { API_BASE } from '@/lib/env'
import { adminAuthHeaders } from '@/lib/authedFetch'
import { toast } from 'sonner'
import JsonEditor from './JsonEditor'

interface InvestmentInsightsData {
  appreciation_annual?: string
  appreciation_desc?: string
  rental_yield?: string
  rental_desc?: string
  market_trend?: string
  market_desc?: string
  liquidity_score?: string
  liquidity_desc?: string
  pricing?: {
    investment_insights?: {
      appreciation_annual?: string
      appreciation_desc?: string
      rental_yield?: string
      rental_desc?: string
      market_trend?: string
      market_desc?: string
      liquidity_score?: string
      liquidity_desc?: string
    }
  }
  decision_profile?: {
    financial_intelligence?: Record<string, unknown>
    intelligence_data?: Record<string, unknown>
  }
}

export default function InvestmentInsightsEditor({ projectId, initialData }: { projectId: string, initialData?: InvestmentInsightsData }) {
  const [appreciationAnnual, setAppreciationAnnual] = useState(initialData?.appreciation_annual ?? initialData?.pricing?.investment_insights?.appreciation_annual ?? '12-15%')
  const [appreciationDesc, setAppreciationDesc] = useState(initialData?.appreciation_desc ?? initialData?.pricing?.investment_insights?.appreciation_desc ?? 'Annual capital growth estimate')
  const [rentalYield, setRentalYield] = useState(initialData?.rental_yield ?? initialData?.pricing?.investment_insights?.rental_yield ?? '4.2-4.8%')
  const [rentalDesc, setRentalDesc] = useState(initialData?.rental_desc ?? initialData?.pricing?.investment_insights?.rental_desc ?? 'Expected annual rental yield')
  const [marketTrend, setMarketTrend] = useState(initialData?.market_trend ?? initialData?.pricing?.investment_insights?.market_trend ?? 'Bullish')
  const [marketDesc, setMarketDesc] = useState(initialData?.market_desc ?? initialData?.pricing?.investment_insights?.market_desc ?? 'Strong demand')
  const [liquidityScore, setLiquidityScore] = useState(initialData?.liquidity_score ?? initialData?.pricing?.investment_insights?.liquidity_score ?? 'High')
  const [liquidityDesc, setLiquidityDesc] = useState(initialData?.liquidity_desc ?? initialData?.pricing?.investment_insights?.liquidity_desc ?? 'Active resale market')
  
  const [investmentReport, setInvestmentReport] = useState<Record<string, unknown>>(
    (initialData?.decision_profile?.financial_intelligence as any)?.investmentReport ||
    (initialData?.decision_profile?.intelligence_data as any)?.investmentReport ||
    {
      appreciation_annual: '12-15%',
      appreciation_desc: 'Annual capital growth estimate based on regional infrastructure expansion',
      rental_yield: '4.2-4.8%',
      rental_desc: 'Expected annual rental yield driven by corporate tenant demand',
      market_trend: 'Bullish',
      market_desc: 'Strong buyer demand and high absorption rate',
      liquidity_score: 'High',
      liquidity_desc: 'Active resale market with multiple exit options'
    }
  )

  const handleSave = async () => {
    try {
      const parsedYield = parseFloat(String(rentalYield).replace(/[^0-9.]/g, '')) || null
      const parsedAppreciation = parseFloat(String(appreciationAnnual).replace(/[^0-9.]/g, '')) || null

      if (parsedYield !== null && (parsedYield < 0 || parsedYield > 20)) {
        toast.error('Rental yield should be between 0-20%')
        return
      }
      if (parsedAppreciation !== null && (parsedAppreciation < 0 || parsedAppreciation > 50)) {
        toast.error('Appreciation should be between 0-50%')
        return
      }

      const projectRes = await fetch(`${API_BASE}/admin/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
        body: JSON.stringify({
          rental_yield_annual_percent: parsedYield,
          appreciation_potential_5yr: parsedAppreciation ? parsedAppreciation * 5 : null,
          market_demand_score: marketTrend === 'Bullish' ? 92 : 82,
        })
      })
      if (!projectRes.ok) throw new Error('Failed to save project metrics')

      const res = await fetch(`${API_BASE}/admin/projects/${projectId}/investment-insights`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
        body: JSON.stringify({
          appreciation_annual: appreciationAnnual || null,
          appreciation_desc: appreciationDesc || null,
          rental_yield: rentalYield || null,
          rental_desc: rentalDesc || null,
          market_trend: marketTrend || null,
          market_desc: marketDesc || null,
          liquidity_score: liquidityScore || null,
          liquidity_desc: liquidityDesc || null,
        })
      })
      if (!res.ok) throw new Error('Failed to save investment insights')

      const existingIntelligence = initialData?.decision_profile?.intelligence_data ?? {}
      const decisionRes = await fetch(`${API_BASE}/admin/projects/${projectId}/decision-profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
        body: JSON.stringify({
          intelligence_data: {
            ...existingIntelligence,
            investmentReport
          }
        })
      })
      if (!decisionRes.ok) throw new Error('Failed to save investment report')

      toast.success('Investment insights saved successfully')
    } catch (e) {
      console.error('[InvestmentInsightsEditor] Save failed:', e)
      toast.error(e instanceof Error ? e.message : 'Error saving investment insights')
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
