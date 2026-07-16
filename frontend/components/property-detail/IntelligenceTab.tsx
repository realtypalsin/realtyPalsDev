/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
'use client'
import { useState, RefObject } from 'react'
import { createPortal } from 'react-dom'
import {
  Sparkles, Users, Briefcase, Gem, Globe, Home,
  TrendingUp, BarChart3, AlertTriangle, CheckCircle2,
  Building2, Scale, Lightbulb, User, Activity, Info,
  Shield, Download
} from 'lucide-react'
import {  m, AnimatePresence  } from 'framer-motion'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import type { ProjectCard as ProjectCardType, ProjectDetail } from '@/types/project'
import PropertyRadarChart from '@/components/PropertyRadarChart'
import dynamic from 'next/dynamic'

import { Skeleton } from '@/components/ui/skeleton'

const MarketComparison = dynamic(() => import('@/components/MarketComparison'), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />
})
import SocialProofAndTransparency from './SocialProofAndTransparency'
import { API_BASE } from '@/lib/env'

// Helper component for consistent paragraph rendering
const CollapsibleParagraph = ({ text }: { text: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = text.length > 120;
  return (
    <p className="text-[13px] text-gray-500 mt-1">
      {isExpanded ? text : (isLong ? `${text.substring(0, 120)}...` : text)}
      {isLong && (
        <button onClick={() => setIsExpanded(!isExpanded)} className="text-blue-600 font-bold ml-1 hover:underline">
          {isExpanded ? 'Read less' : 'Read more'}
        </button>
      )}
    </p>
  );
};

export interface IntelligenceTabProps {
  project: ProjectCardType | null
  detail: ProjectDetail | null
  d: (ProjectCardType | ProjectDetail) | null
  loading: boolean
  timelineAdvice: string | null
  negotiationLeverage: string[]
  walkAwayConditions: string[]
  marketVisible: boolean
  marketRef: RefObject<HTMLDivElement>
}

// ── Icon Map to resolve string names from DB JSON ──
const ICON_MAP: Record<string, any> = {
  TrendingUp, Home, Activity, BarChart3, Building2, Scale, Users, Briefcase, Gem, Globe, CheckCircle2, Sparkles, AlertTriangle, User
}

// Note: Fabricated defaults have been removed. Only real verified data from DB is shown.

export default function IntelligenceTab({
  project, detail, d, loading, marketRef
}: IntelligenceTabProps) {
  const [activeTab, setActiveTab] = useState('All')
  const [expandedPersona, setExpandedPersona] = useState<string | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)

  // Only use real verified data from DB; no fabricated defaults
  const decisionProfile = (d as any)?.decision_profile || {}
  const rawIntel = decisionProfile?.intelligence_data
  const dbIntel = typeof rawIntel === 'string' ? JSON.parse(rawIntel) : (rawIntel || {})
  console.log('DEBUG_INTEL: decisionProfile=', decisionProfile);
  console.log('DEBUG_INTEL: rawIntel=', rawIntel);
  console.log('DEBUG_INTEL: dbIntel=', dbIntel);

  const overallScore = dbIntel?.topLevelMetrics?.overallScore
  const tier = dbIntel?.topLevelMetrics?.tier

  const categoryPluralMap: Record<string, string> = {
    'Strength': 'Strengths',
    'Opportunity': 'Opportunities',
    'Risk': 'Risks',
    'Consideration': 'Considerations',
    'Strengths': 'Strengths',
    'Opportunities': 'Opportunities',
    'Risks': 'Risks',
    'Considerations': 'Considerations'
  }

  const detailedAnalysisArray = dbIntel?.detailedAnalysis || []
  const filteredAnalysis = activeTab === 'All'
    ? detailedAnalysisArray
    : detailedAnalysisArray.filter((a: any) => categoryPluralMap[a.category] === activeTab)

  // Build dimensions array from real DB data only; skip missing dimensions
  const dimensionsForChart = [
    dbIntel.dimensionScores?.builderTrust?.score ? { key: 'builder', label: 'Builder Trust', score: dbIntel.dimensionScores.builderTrust.score, value: dbIntel.dimensionScores.builderTrust.score, color: '#002663', stars: 3, description: '', basis: '', status: 'Verified' as const } : null,
    dbIntel.dimensionScores?.locationQuality?.score ? { key: 'location', label: 'Location Quality', score: dbIntel.dimensionScores.locationQuality.score, value: dbIntel.dimensionScores.locationQuality.score, color: '#00509E', stars: 3, description: '', basis: '', status: 'Verified' as const } : null,
    dbIntel.dimensionScores?.lifestyleAmenities?.score ? { key: 'amenities', label: 'Lifestyle & Amenities', score: dbIntel.dimensionScores.lifestyleAmenities.score, value: dbIntel.dimensionScores.lifestyleAmenities.score, color: '#0077C8', stars: 3, description: '', basis: '', status: 'Verified' as const } : null,
    dbIntel.dimensionScores?.valueForMoney?.score ? { key: 'value', label: 'Value for Money', score: dbIntel.dimensionScores.valueForMoney.score, value: dbIntel.dimensionScores.valueForMoney.score, color: '#60A3D9', stars: 3, description: '', basis: '', status: 'Verified' as const } : null,
    dbIntel.dimensionScores?.appreciationPotential?.score ? { key: 'appreciation', label: 'Appreciation Potential', score: dbIntel.dimensionScores.appreciationPotential.score, value: dbIntel.dimensionScores.appreciationPotential.score, color: '#9ED3F2', stars: 3, description: '', basis: '', status: 'Verified' as const } : null,
    dbIntel.dimensionScores?.legalSafety?.score ? { key: 'legal', label: 'Legal & Safety', score: dbIntel.dimensionScores.legalSafety.score, value: dbIntel.dimensionScores.legalSafety.score, color: '#003B73', stars: 3, description: '', basis: '', status: 'Verified' as const } : null,
  ].filter(Boolean)

  const getDimensionSummary = (label: string, score: number | undefined) => {
    // Only return real summary if score exists; otherwise return empty state
    if (score === undefined) return 'Data not verified yet'
    if (label === 'Builder Trust') return score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : 'Under Review'
    if (label === 'Location Quality') return score >= 85 ? 'Strategic' : score >= 70 ? 'Good' : 'Under Review'
    if (label === 'Lifestyle & Amenities') return score >= 90 ? 'Premium' : score >= 70 ? 'Good' : 'Under Review'
    if (label === 'Value for Money') return score >= 85 ? 'High Value' : score >= 70 ? 'Fair' : 'Under Review'
    if (label === 'Appreciation Potential') return score >= 90 ? 'High' : score >= 70 ? 'Moderate' : 'Under Review'
    if (label === 'Legal & Safety') return score >= 95 ? 'Secure (TCHFL Funding)' : 'Standard'
    return 'Verified'
  }

  const getGrade = (score: number) => {
    if (score >= 95) return 'A+'
    if (score >= 90) return 'A'
    if (score >= 85) return 'A-'
    if (score >= 80) return 'B+'
    if (score >= 75) return 'B'
    if (score >= 70) return 'B-'
    if (score >= 60) return 'C'
    return 'D'
  }

  const unitTypesList = d?.unit_types || []
  const computedProjectAvgNumber = unitTypesList.length > 0
    ? (() => {
      let totalRate = 0
      let count = 0
      unitTypesList.forEach((u: any) => {
        const area = u.super_area_sqft || u.carpet_area_sqft
        const priceMin = u.price_min_cr ? u.price_min_cr * 10000000 : 0
        if (area && priceMin) {
          totalRate += (priceMin / area)
          count++
        }
      })
      return count > 0 ? Math.round(totalRate / count) : Number(String(dbIntel?.pricingIntelligence?.projectAvg || '').replace(/[^0-9]/g, ''))
    })()
    : Number(String(dbIntel?.pricingIntelligence?.projectAvg || '').replace(/[^0-9]/g, ''))

  const computedProjectAvg = computedProjectAvgNumber ? `₹${computedProjectAvgNumber.toLocaleString('en-IN')} /sqft` : dbIntel?.pricingIntelligence?.projectAvg

  // Show fallback state if no AI intelligence data exists in DB but manual data exists
  if (!dbIntel?.topLevelMetrics) {
    const hasManualData = decisionProfile.decision_thesis || decisionProfile.why_buy || decisionProfile.why_avoid;

    return (
      <div className="p-4 md:p-8 bg-[#F7F9FB] dark:bg-[#0f0e0d] text-gray-900 dark:text-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Sparkles className="text-blue-600" size={16} />
          </div>
          <h2 className="text-[22px] font-bold text-gray-900 dark:text-white tracking-tight">AI-Powered Analysis</h2>
        </div>

        {hasManualData ? (
          <div className="mt-6 space-y-6">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
              <Info className="text-amber-500 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">AI Processing Pending</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Detailed AI metrics are currently being generated. Below is the preliminary manual analysis by our advisory team.</p>
              </div>
            </div>

            {decisionProfile.decision_thesis && (
              <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
                <h3 className="text-[14px] font-black text-gray-900 dark:text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Activity size={16} className="text-blue-600" />
                  Decision Thesis (AI Verdict)
                </h3>
                <p className="text-[15px] font-bold text-gray-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                  {decisionProfile.decision_thesis}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {decisionProfile.why_buy && (
                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-xl p-6 shadow-sm">
                  <h3 className="text-[14px] font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    Why Buy
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {decisionProfile.why_buy}
                  </p>
                </div>
              )}

              {decisionProfile.why_avoid && (
                <div className="bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30 rounded-xl p-6 shadow-sm">
                  <h3 className="text-[14px] font-black text-rose-900 dark:text-rose-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-rose-600" />
                    Why Avoid
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {decisionProfile.why_avoid}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-6 p-6 bg-white dark:bg-[#111] rounded-lg border border-gray-200 dark:border-gray-800 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Data not verified yet</p>
            <p className="text-gray-400 dark:text-gray-600 text-xs mt-2">Our AI analysis will be available once verified by our team.</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-8 bg-[#F7F9FB] dark:bg-[#0f0e0d] text-gray-900 dark:text-gray-100 font-sans">

      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Sparkles className="text-blue-600" size={16} />
          </div>
          <h2 className="text-[22px] font-bold text-gray-900 dark:text-white tracking-tight">AI-Powered Analysis</h2>
        </div>
        <p className="text-[13px] text-gray-500 -mt-5 max-w-xl">
          Our AI evaluates {d?.name || 'this project'} across 20+ parameters to give you <span className="font-bold text-blue-600">clarity, confidence & foresight.</span>
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center gap-4 transition-all hover:-translate-y-0.5">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <User className="text-blue-500" size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.1em] mb-1">Overall AI Score</p>
              <div className="flex items-baseline gap-1">
                <span className="text-[28px] font-black tracking-tight leading-none text-gray-900 dark:text-white">{overallScore}</span>
                <span className="text-[12px] font-bold text-gray-400">/100</span>
              </div>
              <div className="mt-2 inline-block px-2.5 py-0.5 rounded text-[10px] font-black bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 tracking-wider">{tier}</div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center gap-4 transition-all hover:-translate-y-0.5">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Briefcase className="text-blue-500" size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.1em] mb-1">Investment Grade</p>
              <p className="text-[28px] font-black tracking-tight leading-none text-gray-900 dark:text-white">{dbIntel.topLevelMetrics.investmentGrade}</p>
              <p className="text-[11px] text-gray-500 mt-2 font-medium">{dbIntel.topLevelMetrics.investmentGradeLabel}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center gap-4 transition-all hover:-translate-y-0.5">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="text-emerald-500" size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.1em] mb-1">Price Advantage</p>
              <p className="text-[28px] font-black tracking-tight leading-none text-gray-900 dark:text-white">{dbIntel.topLevelMetrics.priceAdvantage}</p>
              <p className="text-[11px] text-gray-500 mt-2 font-medium">{dbIntel.topLevelMetrics.priceAdvantageSubtext}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center gap-4 transition-all hover:-translate-y-0.5">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="text-emerald-500" size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.1em] mb-1">Confidence Level</p>
              <p className="text-[28px] font-black tracking-tight leading-none text-gray-900 dark:text-white">{dbIntel.topLevelMetrics.confidenceLevel}</p>
              <p className="text-[11px] text-gray-500 mt-2 font-medium">{dbIntel.topLevelMetrics.confidenceLabel}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111] rounded-[24px] p-6 md:p-8 ring-1 ring-inset ring-black/5 dark:ring-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300">
        <div className="flex items-center gap-2 mb-8">
          <h3 className="text-[18px] font-bold text-gray-900 dark:text-white">Score by Dimension</h3>
          <div className="group relative">
            <button className="text-gray-400 hover:text-blue-400 focus:outline-none">
              <Info size={14} />
            </button>
            <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-[12px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-xl border border-gray-800">
              <p className="font-bold mb-1 border-b border-gray-700 pb-1">Grading Scale</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2">
                <span>A+ (95-100)</span><span className="text-gray-400">Exceptional</span>
                <span>A  (90-94)</span><span className="text-gray-400">Excellent</span>
                <span>A- (85-89)</span><span className="text-gray-400">Very Good</span>
                <span>B+ (80-84)</span><span className="text-gray-400">Good</span>
                <span>B  (75-79)</span><span className="text-gray-400">Above Avg</span>
                <span>B- (70-74)</span><span className="text-gray-400">Average</span>
                <span>C  (60-69)</span><span className="text-gray-400">Fair</span>
                <span>D  (&lt;60)</span><span className="text-gray-400">Poor</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            {dimensionsForChart.map((dim, i) => dim && (
              <div key={i} className="flex flex-col gap-2 group">
                <div className="flex items-end justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-gray-900 dark:text-white">{dim.label}</span>
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-500 uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity">
                      <CheckCircle2 size={10} className="text-emerald-500" />
                      {dim.status}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[18px] font-black leading-none" style={{ color: dim.color }}>{dim.score}</span>
                    <span className="text-[11px] font-bold text-gray-400">/100</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="h-2.5 rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${dim.score}%`, backgroundColor: dim.color }}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-[11px] text-gray-500">
                  <span>Grade: <strong className="text-gray-900 dark:text-gray-100">{getGrade(dim.score)}</strong></span>
                  <span>{getDimensionSummary(dim.label, dim.score)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50/30 dark:bg-blue-950/20 rounded-xl p-4.5 flex gap-3 border border-blue-100/30 dark:border-blue-900/30">
            <Lightbulb className="text-blue-500 flex-shrink-0" size={18} />
            <div>
              <p className="text-[12px] font-bold text-gray-900 dark:text-white mb-0.5">AI Verdict (Key Takeaway)</p>
              <p className="text-[15px] font-bold text-gray-900 dark:text-white leading-relaxed">{dbIntel.keyTakeaway}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-[18px] font-bold text-gray-900 dark:text-white">What Matters Most to You?</h3>
          <CollapsibleParagraph text="We've analyzed this project from different buyer perspectives. The analysis includes detailed insights for families, investors, luxury seekers, NRIs, and end users. Click to expand see why each persona matters and how the project's features align with their priorities." />
        </div>

        <div className="columns-1 md:columns-2 gap-5 space-y-5 md:space-y-0">
          {(dbIntel.buyerPersonas || []).map((persona: any, idx: number) => {
            const Icon = ICON_MAP[persona.iconName] || Users
            const isExpanded = expandedPersona === persona.type
            return (
              <m.div
                layout
                key={idx}
                className={`break-inside-avoid mb-5 w-full bg-white dark:bg-[#111] ring-1 ring-inset rounded-[24px] p-6 transition-all duration-300 flex flex-col cursor-pointer overflow-hidden ${isExpanded ? 'ring-gray-300 dark:ring-gray-600 bg-gray-50/50 dark:bg-white/5 shadow-md' : 'ring-black/5 dark:ring-white/10 hover:ring-black/10 dark:hover:ring-white/20 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)]'}`}
                onClick={() => setExpandedPersona(isExpanded ? null : persona.type)}
              >
                <m.div layout="position" className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-gray-900 dark:text-gray-100" />
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-gray-900 dark:text-white leading-tight">{persona.type}</p>
                      <div className="flex gap-0.5 mt-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <svg key={star} width="12" height="12" viewBox="0 0 24 24" fill={star <= persona.stars ? '#F59E0B' : '#E5E7EB'} xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${persona.fitColor}`}>
                    {persona.fit}
                  </span>
                </m.div>

                <m.p layout="position" className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed mb-2">
                  {persona.reasons[0]?.split(':')[0] || 'Good overall fit.'}
                </m.p>

                <AnimatePresence initial={false}>
                {isExpanded && (
                  <m.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <ul className="flex flex-col gap-3">
                        {persona.reasons.map((r: string, i: number) => {
                          const split = r.split(':')
                          return (
                            <li key={i} className="text-[13px] text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-3.5 rounded-[16px] border border-gray-100 dark:border-gray-800 leading-relaxed">
                              <strong className="text-gray-900 dark:text-white font-bold mr-1.5">{split[0]}:</strong>
                              {split[1] || ''}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  </m.div>
                )}
                </AnimatePresence>

                <m.div layout="position" className="flex justify-start items-center mt-4 pt-4 border-t border-gray-50 dark:border-gray-800/30">
                  <span className="text-[12px] text-gray-900 dark:text-gray-100 font-bold hover:underline flex items-center gap-1.5 transition-colors">
                    {isExpanded ? 'Hide Details' : 'View Deep Dive'}
                    <span className={`text-[16px] leading-none transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'translate-x-0.5'}`}>↓</span>
                  </span>
                </m.div>
              </m.div>
            )
          })}
        </div>
      </div>

      <SocialProofAndTransparency
        social={(dbIntel as any)?.social_proof}
        transparency={(dbIntel as any)?.transparency_checks_additions}
      />

      {/* 4. Investment & Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-1 bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center">
          <h3 className="text-[14px] font-bold text-gray-900 dark:text-white mb-6 w-full text-center">Score Breakdown</h3>
          <PropertyRadarChart axes={dimensionsForChart as any} />
        </div>
        
        {/* Investment Snapshot */}
        <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-[24px] p-6">
          <h3 className="text-[16px] font-bold text-gray-900 mb-6">How this investment may perform</h3>
          <div className="space-y-4">
            {(dbIntel.investmentSnapshot || []).map((item: any, i: number) => {
              const Icon = ICON_MAP[item.iconName] || TrendingUp
              return (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center">
                      <Icon size={14} className="text-blue-500" />
                    </div>
                    <span className="text-[13px] text-gray-600">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-gray-900">{item.value}</span>
                    {item.trend === 'up' && (
                      <TrendingUp size={14} className="text-emerald-500" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <button
            onClick={() => setShowReportModal(true)}
            className="text-[12px] font-bold text-blue-600 mt-6 hover:underline flex items-center gap-1"
          >
            View Detailed Investment Report
            <span className="text-[16px] leading-none">→</span>
          </button>
        </div>

        {/* Pricing Intelligence */}
        {dbIntel.pricingIntelligence && (
        <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-[24px] p-6">
          <h3 className="text-[16px] font-bold text-gray-900 mb-6">Is this fairly priced?</h3>
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center">
                  <Building2 size={14} className="text-blue-500" />
                </div>
                <span className="text-[13px] text-gray-600">{d?.name || 'Project'} Avg. Price</span>
              </div>
              <span className="text-[13px] font-bold text-gray-900">{computedProjectAvg}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center">
                  <Home size={14} className="text-blue-500" />
                </div>
                <span className="text-[13px] text-gray-600">{d?.city || 'Area'} Market Avg.</span>
              </div>
              <span className="text-[13px] font-bold text-gray-900">{dbIntel.pricingIntelligence?.marketAvg || '—'}</span>
            </div>
          </div>

          <div className="bg-[#F8FAFC] border border-blue-100 rounded-xl p-5 relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[12px] text-gray-600 mb-1">You Pay</p>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-blue-600" />
                <span className="text-[24px] font-black text-blue-600 leading-none">{dbIntel.pricingIntelligence?.premium || '—'}</span>
              </div>
              <p className="text-[11px] text-gray-500 mb-3">Above Market Avg.</p>
              <p className="text-[11px] text-gray-600"><span className="font-medium text-gray-900">Justified by:</span> {dbIntel.pricingIntelligence?.justification || '—'}</p>
            </div>
            {/* Background graphic */}
            <div className="absolute right-0 bottom-0 opacity-20 pointer-events-none">
              <svg width="80" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 80 L30 50 L50 60 L90 20" stroke="#2563EB" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="30" cy="50" r="6" fill="#2563EB" />
                <circle cx="50" cy="60" r="6" fill="#2563EB" />
                <circle cx="90" cy="20" r="6" fill="#2563EB" />
              </svg>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* 5. Risk & Concern Radar */}
      <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-[24px] p-6 md:p-8 relative overflow-hidden">
        {/* Red warning triangle in bg */}
        <div className="absolute -top-4 -left-4 w-16 h-16 bg-red-50 rounded-full flex items-center justify-center opacity-50">
          <AlertTriangle className="text-red-500 opacity-50" size={32} />
        </div>

        <div className="relative z-10 mb-6 pl-8">
          <h3 className="text-[18px] font-bold text-gray-900">Things you should know before buying</h3>
          <p className="text-[13px] text-gray-500">Points that need your attention.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 mb-8">
          <div className="w-full lg:w-[350px] h-[250px] bg-gray-50/50 rounded-2xl border border-gray-100 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart 
                cx="50%" cy="50%" outerRadius="70%" 
                data={(dbIntel.riskRadar || []).map((r: any) => ({
                  subject: r.type,
                  A: r.level === 'Low' ? 20 : r.level === 'Medium' ? 50 : 80,
                  fullMark: 100
                }))}
              >
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 600 }} />
                <Radar name="Risk Level" dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                <RechartsTooltip 
                  formatter={(val: any) => [val === 20 ? 'Low' : val === 50 ? 'Medium' : 'High', 'Risk Level']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(dbIntel.riskRadar || []).map((risk: any, i: number) => {
              const Icon = ICON_MAP[risk.iconName] || Building2
              const riskColors: Record<string, { bg: string; text: string; badge: string }> = {
                'Low': { bg: 'bg-emerald-50', text: 'text-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
                'Medium': { bg: 'bg-amber-50', text: 'text-amber-500', badge: 'bg-amber-100 text-amber-700' },
                'High': { bg: 'bg-red-50', text: 'text-red-500', badge: 'bg-red-100 text-red-700' }
              }
              const colors = riskColors[risk.level] || riskColors.Medium

              return (
                <div key={i} className="border border-gray-100 rounded-[16px] p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center`}>
                      <Icon className={colors.text} size={18} />
                    </div>
                    <span className="text-[14px] font-bold text-gray-900">{risk.type}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${colors.badge}`}>
                    {risk.level}
                  </span>
                </div>
                <p className="text-[12px] text-gray-600 leading-relaxed ml-[52px]">
                  {risk.description}
                </p>
              </div>
            )
          })}
          </div>
        </div>
      </div>

      {/* 6. Detailed Analysis */}
      <div>
        <h3 className="text-[18px] font-bold text-gray-900 mb-4">Our complete recommendation</h3>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-200 mb-6">
          {['All', 'Strengths', 'Opportunities', 'Risks', 'Considerations'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-[13px] font-bold relative ${activeTab === tab ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-4">
          {filteredAnalysis.map((item: any, i: number) => {
            const Icon = ICON_MAP[item.iconName] || CheckCircle2
            const badgeColors: Record<string, string> = {
              'Strength': 'text-emerald-700 bg-emerald-50 border-emerald-100',
              'Opportunity': 'text-blue-700 bg-blue-50 border-blue-100',
              'Consideration': 'text-amber-700 bg-amber-50 border-amber-100',
              'Risk': 'text-red-700 bg-red-50 border-red-100'
            }

            return (
              <div key={i} className="flex items-start justify-between bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="flex gap-4">
                  <div className={`w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon className={item.iconColor || 'text-blue-500'} size={16} />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-gray-900">{item.title}</h4>
                    <p className="text-[12px] text-gray-600 mt-1">{item.description}</p>
                  </div>
                </div>
                <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${badgeColors[item.category]}`}>
                  {item.category}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {/* 7. Market Comparison (Existing Component) */}
      <div className="pt-6" ref={marketRef}>
        <MarketComparison sector={d?.sector || '10'} city={d?.city || 'Greater Noida West'} currentPriceSqft={computedProjectAvgNumber || undefined} />
      </div>

      {/* Report Modal */}
      {showReportModal && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
            <m.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowReportModal(false)} 
            />
            <m.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", bounce: 0, duration: 0.5 }}
              className="bg-white dark:bg-[#111] rounded-[32px] max-w-2xl w-full p-8 md:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] border border-black/5 dark:border-white/10 relative z-10 overflow-hidden"
            >
              {/* Soft decorative glow */}
              <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />
              
              <button
                onClick={() => setShowReportModal(false)}
                className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 rounded-full transition-colors z-20"
              >
                ✕
              </button>
              
              <div className="flex flex-col md:flex-row md:items-center gap-5 mb-10 relative z-10">
                <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                  <TrendingUp className="text-white" size={28} />
                </div>
                <div>
                  <h3 className="text-[24px] font-black text-gray-900 dark:text-white tracking-tight leading-none mb-2">AI Investment Report</h3>
                  <p className="text-[14px] text-gray-500 font-medium">Detailed financial projections & risk analysis for {d?.name || 'this project'}</p>
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/5 p-6 rounded-[24px]">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp size={16} className="text-emerald-500" />
                      <span className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Appreciation</span>
                    </div>
                    <span className="text-[24px] font-black text-gray-900 dark:text-white tracking-tight">
                      {dbIntel.investmentReport?.appreciationYearly || '—'} 
                      <span className="text-[14px] font-semibold text-gray-400 tracking-normal ml-1">/yr</span>
                    </span>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/5 p-6 rounded-[24px]">
                    <div className="flex items-center gap-2 mb-2">
                      <Home size={16} className="text-blue-500" />
                      <span className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Rental Yield</span>
                    </div>
                    <span className="text-[24px] font-black text-gray-900 dark:text-white tracking-tight">
                      {dbIntel.investmentReport?.rentalYield || '—'}
                    </span>
                  </div>
                </div>
                
                <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-6 rounded-[24px] space-y-5">
                  {dbIntel.investmentReport?.reportCatalyst && (
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <TrendingUp size={16} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-[14px] font-bold text-gray-900 dark:text-white mb-1">Capital Gain Catalyst</h4>
                        <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed">
                          {dbIntel.investmentReport.reportCatalyst}
                        </p>
                      </div>
                    </div>
                  )}
                  {dbIntel.investmentReport?.reportFunding && (
                    <>
                      <div className="h-px bg-blue-100/50 dark:bg-blue-900/30 w-full ml-12" />
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Shield className="text-emerald-600 dark:text-emerald-400" size={16} />
                        </div>
                        <div>
                          <h4 className="text-[14px] font-bold text-gray-900 dark:text-white mb-1">Funding Safeguards</h4>
                          <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed">
                            {dbIntel.investmentReport.reportFunding}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                  {dbIntel.investmentReport?.reportRera && (
                    <>
                      <div className="h-px bg-blue-100/50 dark:bg-blue-900/30 w-full ml-12" />
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle2 className="text-purple-600 dark:text-purple-400" size={16} />
                        </div>
                        <div>
                          <h4 className="text-[14px] font-bold text-gray-900 dark:text-white mb-1">RERA Validation</h4>
                          <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed">
                            {dbIntel.investmentReport.reportRera}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                  {!dbIntel.investmentReport && (
                    <p className="text-[14px] text-gray-500 dark:text-gray-400 text-center py-4">Investment report data not yet available for this project.</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-10 relative z-10">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-6 py-3.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-900 dark:text-white text-[14px] font-bold rounded-xl transition-colors w-full sm:w-auto"
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`${API_BASE}/projects/${(d as any)?.slug}/documents`);
                      const data = await res.json();
                      if (data.documents && data.documents.length > 0) {
                        const doc = data.documents.find((doc: any) => doc.doc_type === 'brochure') || data.documents[0];
                        window.open(doc.storage_url, '_blank');
                      } else {
                        alert('Brochure document not yet uploaded for this project.');
                      }
                    } catch (e) {
                      alert('Failed to download document.');
                    }
                    setShowReportModal(false)
                  }}
                  className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-bold rounded-xl transition-all shadow-[0_4px_14px_0_rgba(37,99,235,0.2)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <Download size={16} />
                  Download PDF
                </button>
              </div>
            </m.div>
          </div>
        </AnimatePresence>,
        document.body
      )}

      {/* Additional helper components can be placed here if needed */}

    </div>
  )
}
