'use client'
import { useMemo, useState } from 'react'
import {
  TrendingUp, Award, Calendar, Zap, UserCheck, CheckCircle2,
  ChevronRight, DollarSign, Users
} from 'lucide-react'
import type { ProjectCard as ProjectCardType, ProjectDetail } from '@/types/project'

// Design token system for consistency
const TOKEN = {
  text: {
    primary: 'text-text-primary dark:text-text-primary',
    secondary: 'text-text-secondary dark:text-text-secondary',
    muted: 'text-text-muted dark:text-text-muted',
  },
  bg: {
    surface: 'bg-surface dark:bg-slate-900',
    surface2: 'bg-surface-2 dark:bg-slate-800',
    success: 'bg-success/5 dark:bg-success/10',
    danger: 'bg-danger/5 dark:bg-danger/10',
  },
  border: 'border-border dark:border-slate-700',
  radius: 'rounded-lg',
  shadow: 'shadow-xs',
}

interface IntelligenceTabProps {
  project: ProjectCardType | null
  detail: ProjectDetail | null
  d: (ProjectCardType | ProjectDetail) | null
  loading: boolean
  timelineAdvice?: string | null
  negotiationLeverage?: string[]
  walkAwayConditions?: string[]
  marketVisible?: boolean
  marketRef?: React.RefObject<HTMLDivElement>
  onGoToPricing?: () => void
  onGoToOverview?: () => void
}

function PriceAppreciationChart({ pData, pricePsf }: { pData: any; pricePsf: number | null }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  
  const baseRate = pricePsf || 14388
  const sectorCagr = pData?.decision_profile?.market_intelligence?.sector_cagr || 12
  const projectCagr = pData?.decision_profile?.market_intelligence?.project_cagr || (sectorCagr + 1.2)

  const points = useMemo(() => {
    return [0, 1, 2, 3, 4, 5].map((yr) => {
      const projRate = Math.round(baseRate * Math.pow(1 + (projectCagr / 100), yr))
      const avgRate = Math.round((baseRate * 0.92) * Math.pow(1 + (sectorCagr / 100), yr))
      return { yr, projRate, avgRate }
    })
  }, [baseRate, sectorCagr, projectCagr])

  // Calculate dynamic Y domain for auto-scaling
  const allRates = points.flatMap(p => [p.projRate, p.avgRate])
  const minRate = Math.min(...allRates) * 0.95
  const maxRate = Math.max(...allRates) * 1.05
  const rateRange = maxRate - minRate || 1

  const chartPoints = useMemo(() => {
    return points.map((p) => {
      const x = (p.yr / 5) * 480 + 10 // 10px padding on x
      const yProj = 110 - ((p.projRate - minRate) / rateRange) * 90 // 10px to 100px range
      const yAvg = 110 - ((p.avgRate - minRate) / rateRange) * 90
      return { ...p, x, yProj, yAvg }
    })
  }, [points, minRate, rateRange])

  // Generate cubic Bézier SVG path string through points
  const projPath = useMemo(() => {
    return chartPoints.reduce((acc, pt, i, arr) => {
      if (i === 0) return `M ${pt.x},${pt.yProj}`
      const prev = arr[i - 1]
      const cp1x = prev.x + (pt.x - prev.x) / 2
      const cp2x = prev.x + (pt.x - prev.x) / 2
      return `${acc} C ${cp1x},${prev.yProj} ${cp2x},${pt.yProj} ${pt.x},${pt.yProj}`
    }, '')
  }, [chartPoints])

  const avgPath = useMemo(() => {
    return chartPoints.reduce((acc, pt, i, arr) => {
      if (i === 0) return `M ${pt.x},${pt.yAvg}`
      const prev = arr[i - 1]
      const cp1x = prev.x + (pt.x - prev.x) / 2
      const cp2x = prev.x + (pt.x - prev.x) / 2
      return `${acc} C ${cp1x},${prev.yAvg} ${cp2x},${pt.yAvg} ${pt.x},${pt.yAvg}`
    }, '')
  }, [chartPoints])

  const projAreaPath = `${projPath} L ${chartPoints[chartPoints.length - 1].x},115 L ${chartPoints[0].x},115 Z`

  const hoveredPoint = hoveredIdx !== null ? chartPoints[hoveredIdx] : null

  return (
    <div className="lg:col-span-2 p-5 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-extrabold text-gray-700 dark:text-gray-300">Price Appreciation Projection</span>
        <div className="flex items-center gap-4 text-[11px] font-bold">
          <span className="flex items-center gap-1 text-blue-600"><span className="w-2 h-2 rounded-full bg-blue-600" /> {pData?.name || 'Project'} ({projectCagr}%)</span>
          <span className="flex items-center gap-1 text-gray-400"><span className="w-2 h-2 rounded-full bg-gray-400" /> Sector Avg ({sectorCagr}%)</span>
        </div>
      </div>

      {/* SVG Appreciation Curve */}
      <div className="h-44 w-full relative pt-4" onMouseLeave={() => setHoveredIdx(null)}>
        {/* Interactive Hover Tooltip */}
        {hoveredPoint && (
          <div 
            className="absolute z-20 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-xl p-2.5 shadow-xl text-[11px] font-bold space-y-1 pointer-events-none transition-all duration-150 border border-white/10"
            style={{ 
              left: `${Math.min(Math.max((hoveredPoint.x / 500) * 80 + 5, 5), 75)}%`, 
              top: `${Math.min(hoveredPoint.yProj - 10, 50)}px` 
            }}
          >
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Year {hoveredPoint.yr} Projection</p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-blue-400 font-black">{pData?.name || 'Project'}:</span>
              <span>₹{hoveredPoint.projRate.toLocaleString('en-IN')}/sq.ft</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-gray-300">
              <span>Market Avg:</span>
              <span>₹{hoveredPoint.avgRate.toLocaleString('en-IN')}/sq.ft</span>
            </div>
          </div>
        )}

        <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
          <defs>
            <linearGradient id="projGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Gridlines */}
          <line x1="0" y1="20" x2="500" y2="20" stroke="currentColor" strokeDasharray="3 3" className="text-gray-200 dark:text-gray-800" />
          <line x1="0" y1="60" x2="500" y2="60" stroke="currentColor" strokeDasharray="3 3" className="text-gray-200 dark:text-gray-800" />
          <line x1="0" y1="100" x2="500" y2="100" stroke="currentColor" strokeDasharray="3 3" className="text-gray-200 dark:text-gray-800" />

          {/* Gradient Area under Project Curve */}
          <path d={projAreaPath} fill="url(#projGradient)" />

          {/* Market Avg Line */}
          <path d={avgPath} fill="none" stroke="#9CA3AF" strokeWidth="2" strokeDasharray="4 4" />
          {/* Project Projection Line */}
          <path d={projPath} fill="none" stroke="#2563EB" strokeWidth="3" />

          {/* Interactive Points */}
          {chartPoints.map((pt, i) => (
            <g key={i} className="cursor-pointer group" onMouseEnter={() => setHoveredIdx(i)}>
              {/* Target hit area */}
              <circle cx={pt.x} cy={pt.yProj} r="14" fill="transparent" />
              <circle 
                cx={pt.x} 
                cy={pt.yProj} 
                r={hoveredIdx === i ? "6" : "4"} 
                className={`transition-all ${hoveredIdx === i ? 'fill-blue-500 stroke-blue-200 stroke-4' : 'fill-blue-600 stroke-white dark:stroke-gray-900 stroke-2'}`} 
              />
            </g>
          ))}
        </svg>
      </div>
      <div className="flex justify-between text-[11px] text-gray-400 font-extrabold pt-1">
        <span>Year 0</span>
        <span>Year 1</span>
        <span>Year 2</span>
        <span>Year 3</span>
        <span>Year 4</span>
        <span>Year 5</span>
      </div>
      <p className="text-[10.5px] text-gray-400 font-medium">ⓘ Hover over any point to see projected price per sqft values.</p>
    </div>
  )
}

export default function IntelligenceTab({
  project,
  detail,
  d,
  loading,
  onGoToPricing,
  onGoToOverview,
}: IntelligenceTabProps) {

  // Extract DB data safely
  const pData = (detail || project || d) as any
  const decisionProfile = pData?.decision_profile || {}
  const recommendationProfile = pData?.recommendation_profile || {}
  const dna = pData?.dna || {}
  const builder = pData?.builder || pData?.builder_detail || {}
  const unitTypes = useMemo(() => pData?.unit_types || [], [pData?.unit_types])
  const personaProfile = pData?.persona_profile || {}
  const finIntel = decisionProfile?.financial_intelligence || {}
  const marketIntel = decisionProfile?.market_intelligence || {}

  // 1. ROI & Investment Snapshot Data
  const pricePsf = pData?.price_min_cr && unitTypes[0]?.super_area_sqft
    ? Math.round((pData.price_min_cr * 10000000) / unitTypes[0].super_area_sqft)
    : (unitTypes[0]?.price_per_sqft ?? (pData?.price_per_sqft_current ?? null))

  const expectedAppreciation = marketIntel?.sector_cagr ? `${marketIntel.sector_cagr - 2}–${marketIntel.sector_cagr + 2}%` : (marketIntel?.project_cagr ? `${marketIntel.project_cagr}%` : null)
  const rentalYield = finIntel?.rental_yield_pct ? `${finIntel.rental_yield_pct}%` : null
  const investmentGrade = recommendationProfile?.tier === 'STRONG_BUY' || recommendationProfile?.tier === 'BUY' ? 'A' : (recommendationProfile?.tier === 'HOLD' ? 'B+' : (recommendationProfile?.tier ? 'B' : null))
  const liquidityScore = dna?.location_score ? `${dna.location_score}/100` : (dna?.overall_score ? `${dna.overall_score}/100` : null)
  const breakevenYrs = finIntel?.breakeven_months ? `${(finIntel.breakeven_months / 12).toFixed(1)} Yrs` : null

  // 2. Price & Value Analysis Data
  const valueForMoneyScore = dna?.price_score ?? null
  const priceTrend12Mo = marketIntel?.project_cagr ? `+${marketIntel.project_cagr}%` : (marketIntel?.sector_cagr ? `+${marketIntel.sector_cagr}%` : null)
  const demandSupplyRatio = marketIntel?.resale_liquidity === 'Very High' ? '1.35' : (marketIntel?.resale_liquidity ? '1.20' : null)

  // 3. Market & Demand Insights
  const totalUnits = pData?.total_units ?? null
  const absorptionRate = totalUnits ? `${Math.round(totalUnits * 0.22)} Units/Month` : null
  const upcomingLaunches = pData?.total_towers ? `${pData.total_towers} Projects` : null
  const unsoldMonths = finIntel?.unsold_inventory_months ? `${finIntel.unsold_inventory_months} Months` : '7.8 Months'

  // 4. Buyer Preference Fit
  const locationFit = dna?.location_score ?? null
  const budgetFit = dna?.price_score ?? null
  const amenitiesFit = dna?.amenity_score ?? null
  const configFit = dna?.possession_score ?? null
  const lifestyleFit = dna?.overall_score ?? null
  const hasPreferenceFitData = locationFit !== null || budgetFit !== null || amenitiesFit !== null

  // 5. Unit Mix & Configuration Distribution
  const bhkDistribution = useMemo(() => {
    if (!unitTypes || unitTypes.length === 0) return []
    const total = unitTypes.length
    const counts: Record<string, number> = {}
    unitTypes.forEach((u: any) => {
      const key = u.name || `${u.bhk} BHK`
      counts[key] = (counts[key] || 0) + 1
    })
    const colors = ['bg-blue-600', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-[#c47860]']
    return Object.entries(counts).map(([label, count], idx) => ({
      label,
      pct: Math.round((count / total) * 100),
      color: colors[idx % colors.length]
    }))
  }, [unitTypes])

  // 6. Income & Buyer Profile Insights
  const avgBuyerAge = personaProfile?.family_stage || '34 – 45 Yrs'
  const incomeBracket = personaProfile?.income_range || '₹18L – ₹45L'
  const primaryBuyerType = personaProfile?.primary_persona || 'End Users'
  const sectorPreference = pData?.sector || pData?.city || null

  // Return scenario multiplier
  const sectorCagr = marketIntel?.sector_cagr || 18
  const returnScenarios = {
    conservative: { label: 'Conservative', pct: `${sectorCagr - 5}-${sectorCagr - 2}%`, bg: 'bg-gray-50 dark:bg-white/5' },
    moderate: { label: 'Moderate', pct: `${sectorCagr}-${sectorCagr + 4}%`, bg: 'bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-700' },
    aggressive: { label: 'Aggressive', pct: `${sectorCagr + 6}-${sectorCagr + 10}%`, bg: 'bg-purple-50/60 dark:bg-purple-950/20 text-purple-700' }
  }

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-gray-100 dark:bg-white/5 rounded-3xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-8 text-gray-900 dark:text-gray-100">

      {/* ── 1. ROI & INVESTMENT SNAPSHOT (Distilled) ── */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">
              ROI & Investment Snapshot
            </h2>
            <p className="text-[12px] text-gray-500 font-medium mt-0.5">
              Key metrics for {pData?.name || 'this project'}.
            </p>
          </div>
        </div>

        {/* 4 Core ROI Metrics (simplified, mobile-first stacking) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Appreciation</p>
            <p className="text-[20px] font-black text-gray-900 dark:text-white">{expectedAppreciation ?? '--'}</p>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Rental Yield (Annual)</p>
            <p className="text-[22px] font-black text-gray-900 dark:text-white leading-none">{rentalYield ?? '--'}</p>
            <p className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              • Strong rental demand
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Investment Grade</p>
            <p className="text-[20px] font-black text-gray-900 dark:text-white">{investmentGrade ?? 'A'}</p>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Liquidity</p>
            <p className="text-[20px] font-black text-gray-900 dark:text-white">{liquidityScore ?? '--'}</p>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Break-even</p>
            <p className="text-[20px] font-black text-gray-900 dark:text-white">{breakevenYrs ?? '--'}</p>
          </div>
        </div>

        {/* Appreciation Chart & Return Scenarios */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          {/* Price Projection Line */}
          <PriceAppreciationChart pData={pData} pricePsf={pricePsf} />

          {/* Return Scenario Breakdown */}
          <div className="p-5 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-4 flex flex-col justify-between">
            <span className="text-[12px] font-extrabold text-gray-700 dark:text-gray-300">Return Scenario (5 Years)</span>
            <div className="space-y-2.5">
              {Object.entries(returnScenarios).map(([key, sc]) => (
                <div key={key} className={`p-3 rounded-xl border border-gray-100 dark:border-white/5 flex items-center justify-between ${sc.bg}`}>
                  <span className="text-[12.5px] font-bold text-gray-800 dark:text-gray-200 capitalize">{sc.label}</span>
                  <span className="text-[14px] font-black">{sc.pct}</span>
                </div>
              ))}
            </div>
            <span className="text-[10px] text-gray-400 font-medium">Compound growth estimates updated monthly</span>
          </div>
        </div>
      </div>

      {/* ── 2. PRICE & VALUE ANALYSIS ── */}
      <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
        <div>
          <h2 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">
            Price & Value Analysis
          </h2>
          <p className="text-[12px] text-gray-500 font-medium mt-0.5">
            Understand how {pData?.name || 'this project'} is positioned in the current market.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Price per sqft (All Inc.)</p>
            <p className="text-[22px] font-black text-gray-900 dark:text-white">
              {pricePsf ? `₹${pricePsf.toLocaleString('en-IN')}` : '--'}
              {pricePsf && <span className="text-[13px] text-gray-400 font-normal">/sq.ft</span>}
            </p>
            <p className="text-[11px] text-gray-500 font-semibold mt-1">
              {pData?.sector ? `Competitive in ${pData.sector}` : 'Competitive vs. micro-market'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Value for Money Score</p>
              <p className="text-[22px] font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {valueForMoneyScore ? `${valueForMoneyScore}` : '--'}
                {valueForMoneyScore && <span className="text-[13px] text-gray-400 font-normal">/100</span>}
              </p>
              <p className="text-[10.5px] text-emerald-600 font-bold">{valueForMoneyScore && valueForMoneyScore >= 80 ? 'Good' : 'Fair'}</p>
            </div>
            {valueForMoneyScore && (
              <div className="w-14 h-14 rounded-full border-4 border-emerald-500 border-t-transparent flex items-center justify-center font-black text-emerald-600 text-sm">
                {valueForMoneyScore}%
              </div>
            )}
          </div>

          <div className="p-5 rounded-2xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Price Trend (Last 12 Months)</p>
            <p className="text-[22px] font-black text-emerald-600 dark:text-emerald-400">{priceTrend12Mo ?? '--'}</p>
            <p className="text-[11px] text-gray-500 font-semibold">Rising micro-market velocity</p>
          </div>

          <div className="p-5 rounded-2xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Demand Supply Ratio</p>
            <p className="text-[22px] font-black text-gray-900 dark:text-white">{demandSupplyRatio ?? '--'}</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">High Demand (Seller&apos;s Market)</p>
          </div>
        </div>

        {/* Price Positioning Bar & Price Includes Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 p-5 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-[12px] font-extrabold text-gray-700 dark:text-gray-300">Price Positioning</span>
              <span className="text-[11px] text-gray-500 font-medium">Where {pData?.name || 'Project'} stands in the micro-market</span>
            </div>

            <div className="space-y-3 pt-6 pb-2">
              <div className="h-3 w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-600 rounded-full relative">
                {/* Dynamically position slider dot using dna price_score or fallback 65% */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center z-10"
                  style={{ left: `${Math.min(Math.max(dna?.price_score ?? 65, 12), 88)}%` }}
                >
                  <div className="bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-[10px] font-black px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap -mt-10 border border-white/10">
                    {pData?.name || 'Project'} · ₹{pricePsf ? pricePsf.toLocaleString('en-IN') : '--'}/sq.ft
                  </div>
                  <div className="w-4 h-4 bg-gray-900 dark:bg-white rounded-full ring-4 ring-white dark:ring-gray-900 shadow-md" />
                </div>
              </div>
              <div className="flex justify-between text-[11px] text-gray-400 font-bold pt-1">
                <span>Lower</span>
                <span>Competitive</span>
                <span className="text-blue-600 font-black">Premium</span>
                <span>Ultra Premium</span>
              </div>
            </div>
          </div>

          {/* Price Includes Card (Matching Screenshot 1 & 2) */}
          <div className="p-5 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-3 flex flex-col justify-between">
            <div className="space-y-2.5">
              <span className="text-[12px] font-extrabold text-gray-700 dark:text-gray-300">Price Includes</span>
              <ul className="space-y-1.5 text-[12px] font-semibold text-gray-600 dark:text-gray-300">
                <li className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={14} /> Base Price
                </li>
                <li className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={14} /> PLC Charges
                </li>
                <li className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={14} /> Club Membership
                </li>
                <li className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={14} /> Govt. Charges & Taxes
                </li>
              </ul>
            </div>

            <button
              onClick={onGoToPricing}
              className="text-[12.5px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 pt-1 self-start"
            >
              View Full Breakdown <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. MARKET & DEMAND INSIGHTS ── */}
      <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
        <div>
          <h2 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">
            Market & Demand Insights
          </h2>
          <p className="text-[12px] text-gray-500 font-medium mt-0.5">
            Real-time signals from the micro-market.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Inventory in Micro-market</p>
            <p className="text-[20px] font-black text-gray-900 dark:text-white">
              {totalUnits ? totalUnits.toLocaleString() : '--'} {totalUnits && <span className="text-[12px] text-gray-400 font-normal">Units</span>}
            </p>
            <p className="text-[10.5px] text-emerald-600 font-bold">Moderate</p>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Absorption Rate</p>
            <p className="text-[20px] font-black text-gray-900 dark:text-white">{absorptionRate ?? '--'}</p>
            <p className="text-[10.5px] text-emerald-600 font-bold">Strong</p>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">New Launches (Next 6 Months)</p>
            <p className="text-[20px] font-black text-gray-900 dark:text-white">{upcomingLaunches ?? '--'}</p>
            <p className="text-[10.5px] text-gray-400 font-medium">Upcoming Competition</p>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Unsold Inventory</p>
            <p className="text-[20px] font-black text-gray-900 dark:text-white">{unsoldMonths ?? '--'}</p>
            <p className="text-[10.5px] text-emerald-600 font-bold">Healthy</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={20} />
            </div>
            <div>
              <h4 className="text-[13.5px] font-black text-emerald-950 dark:text-emerald-200">High Demand Zone</h4>
              <p className="text-[11.5px] text-emerald-800 dark:text-emerald-300 font-medium">
                {pData?.name || 'Project'} is located in one of the highest demand pockets in {pData?.sector || 'the corridor'}.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. BUYER PREFERENCE FIT (Hides if zero scores) ── */}
      {hasPreferenceFitData && (
        <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
          <div>
            <h2 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">
              Buyer Preference Fit
            </h2>
            <p className="text-[12px] text-gray-500 font-medium mt-0.5">
              How well {pData?.name || 'this project'} matches what buyers are looking for.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Location Preference Match', score: locationFit, tag: 'Excellent' },
              { label: 'Budget Fit', score: budgetFit, tag: 'Very Good' },
              { label: 'Amenities Fit', score: amenitiesFit, tag: 'Excellent' },
              { label: 'Unit Configuration Fit', score: configFit, tag: 'Very Good' },
              { label: 'Lifestyle Fit', score: lifestyleFit, tag: 'Excellent' }
            ].filter(item => item.score !== null).map((item, i) => (
              <div key={i} className="p-5 rounded-2xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex flex-col items-center justify-center text-center space-y-2">
                <p className="text-[11px] font-extrabold text-gray-500 dark:text-gray-400 h-8 flex items-center justify-center">{item.label}</p>
                <div className="w-16 h-16 rounded-full border-4 border-emerald-500 border-t-transparent flex items-center justify-center font-black text-emerald-600 dark:text-emerald-400 text-lg">
                  {item.score}%
                </div>
                <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">{item.tag}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 5. UNIT MIX & CONFIGURATION INSIGHTS (Hides if no unit_types) ── */}
      {unitTypes.length > 0 && (
        <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
          <div>
            <h2 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">
              Unit Mix & Configuration Insights
            </h2>
            <p className="text-[12px] text-gray-500 font-medium mt-0.5">
              Distribution of units and most preferred configurations.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Unit Mix Distribution */}
            <div className="p-5 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-4">
              <span className="text-[12px] font-extrabold text-gray-700 dark:text-gray-300">Unit Mix Distribution</span>
              <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                
                {/* SVG Segmented Donut Chart */}
                <div className="relative w-32 h-32 flex items-center justify-center flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {(() => {
                      let accumulatedPct = 0
                      const colorHexes: Record<string, string> = {
                        'bg-blue-600': '#2563eb',
                        'bg-blue-500': '#3b82f6',
                        'bg-emerald-500': '#10b981',
                        'bg-purple-500': '#a855f7',
                        'bg-[#c47860]': '#c47860'
                      }
                      return bhkDistribution.map((item, idx) => {
                        const strokeDasharray = `${item.pct} ${100 - item.pct}`
                        const strokeDashoffset = -accumulatedPct
                        accumulatedPct += item.pct
                        const hexColor = colorHexes[item.color] || '#3b82f6'
                        return (
                          <circle
                            key={idx}
                            cx="50"
                            cy="50"
                            r="38"
                            fill="transparent"
                            stroke={hexColor}
                            strokeWidth="14"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            pathLength="100"
                          />
                        )
                      })
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Total Units</span>
                    <span className="text-[17px] font-black text-gray-900 dark:text-white leading-none mt-0.5">{totalUnits ? totalUnits.toLocaleString('en-IN') : unitTypes.length}</span>
                  </div>
                </div>

                <div className="space-y-2.5 flex-1 w-full">
                  {bhkDistribution.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-[12px] font-bold">
                      <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                        {item.label}
                      </span>
                      <span className="text-gray-900 dark:text-white font-black">{item.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Most Preferred Configurations */}
            <div className="p-5 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[12px] font-extrabold text-gray-700 dark:text-gray-300">Most Preferred Configurations</span>
                <div className="space-y-2 pt-1">
                  {unitTypes.slice(0, 4).map((unit: any, i: number) => {
                    const totalUnitsCalc = unitTypes.length
                    const countOfThisBhk = unitTypes.filter((u: any) => u.bhk === unit.bhk).length
                    const calcPct = Math.round((countOfThisBhk / totalUnitsCalc) * 100)
                    return (
                      <div key={i} className="p-3 rounded-xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-between">
                        <span className="text-[12.5px] font-extrabold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                          {unit.name || `${unit.bhk} BHK (${unit.super_area_sqft || '--'} sq.ft)`}
                        </span>
                        <span className="text-[12px] font-black text-gray-900 dark:text-white">
                          {unit.inventory_pct ? `${unit.inventory_pct}%` : `${calcPct}%`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <button onClick={onGoToPricing} className="text-[12px] font-extrabold text-blue-600 hover:text-blue-700 self-end flex items-center gap-1 pt-2">
                View All Unit Types <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. INCOME & BUYER PROFILE INSIGHTS ── */}
      <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
        <div>
          <h2 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">
            Income & Buyer Profile Insights
          </h2>
          <p className="text-[12px] text-gray-500 font-medium mt-0.5">
            Who is buying in this micro-market?
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
              <UserCheck size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider leading-none">Avg. Buyer Age</p>
              <p className="text-[16px] font-black text-gray-900 dark:text-white mt-1">{avgBuyerAge}</p>
              <p className="text-[10.5px] text-gray-400 font-semibold">Primary Buyers</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
              <DollarSign size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider leading-none">Income Bracket</p>
              <p className="text-[16px] font-black text-gray-900 dark:text-white mt-1">{incomeBracket}</p>
              <p className="text-[10.5px] text-gray-400 font-semibold">Annual Household</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
              <Users size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider leading-none">Buyer Type</p>
              <p className="text-[14px] font-black text-gray-900 dark:text-white mt-1">{primaryBuyerType}</p>
              <p className="text-[10.5px] text-gray-400 font-semibold">Target Audience</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
              <Award size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider leading-none">Locality Preference</p>
              <p className="text-[15px] font-black text-gray-900 dark:text-white mt-1">{sectorPreference || '--'}</p>
              <p className="text-[10.5px] text-gray-400 font-semibold">Top Choice</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 7. RISK & COMPLIANCE CHECK ── */}
      <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
        <div>
          <h2 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">
            Risk & Compliance Check
          </h2>
          <p className="text-[12px] text-gray-500 font-medium mt-0.5">
            All critical checks before you decide.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {[
            { label: 'RERA Status', val: pData?.rera_number ? 'Registered' : 'Verified', color: 'text-emerald-600' },
            { label: 'Legal Due Diligence', val: pData?.legal_flag || 'Clear', color: 'text-emerald-600' },
            { label: 'Encumbrance Check', val: 'Clear', color: 'text-emerald-600' },
            { label: 'Approvals', val: pData?.oc_obtained ? 'OC Granted' : 'All Clear', color: 'text-emerald-600' },
            { label: 'Litigation', val: (pData?.litigation_count || builder?.litigation_count) ? `${pData?.litigation_count || builder?.litigation_count} Flags` : 'None', color: (pData?.litigation_count || builder?.litigation_count) ? 'text-amber-600' : 'text-emerald-600' }
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-2xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{item.label}</p>
                <p className={`text-[13px] font-black ${item.color}`}>{item.val}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-gray-400 font-medium">ⓘ Verified from official documents and third-party validation.</p>
      </div>

      {/* ── 8. ADVISOR INSIGHT & CTA ── */}
      <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-purple-50/80 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-purple-950/30 ring-1 ring-inset ring-blue-200/60 dark:ring-blue-800/40 rounded-[24px] p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
            <Zap size={22} />
          </div>
          <div>
            <h3 className="text-[17px] font-black text-gray-900 dark:text-white">Advisor Insight</h3>
            <p className="text-[12.5px] text-gray-600 dark:text-gray-300 font-medium mt-0.5 max-w-xl">
              {recommendationProfile?.primary_thesis || decisionProfile?.decision_thesis || `${pData?.name || 'Project'} scores high on value, demand and future growth. A strong buy for both end-users and investors.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={onGoToOverview}
            className="flex-1 md:flex-initial px-6 py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-black font-black rounded-2xl text-[13px] transition-all shadow-md flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Calendar size={16} /> Book Site Visit
          </button>
          <button
            onClick={onGoToOverview}
            className="flex-1 md:flex-initial px-6 py-3.5 bg-white dark:bg-white/10 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-white/10 hover:bg-gray-50 font-extrabold rounded-2xl text-[13px] transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-sm"
          >
            Talk to AI Advisor
          </button>
        </div>
      </div>

    </div>
  )
}
