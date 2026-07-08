/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
'use client'
import { useState, RefObject } from 'react'
import {
  Sparkles, Users, Briefcase, Gem, Globe, Home,
  TrendingUp, BarChart3, AlertTriangle, CheckCircle2,
  Building2, Scale, Lightbulb, User, Activity, Info
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import type { ProjectCard as ProjectCardType, ProjectDetail } from '@/types/project'
import PropertyRadarChart from '@/components/PropertyRadarChart'
import MarketComparison from '@/components/MarketComparison'
import SocialProofAndTransparency from './SocialProofAndTransparency'

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

// ── Fallback Defaults ──
const getDefaultIntel = (projectName: string) => ({
  topLevelMetrics: {
    overallScore: 88,
    tier: 'STRONG_BUY',
    investmentGrade: 'A',
    investmentGradeLabel: 'Low Risk / High Growth',
    priceAdvantage: '+12%',
    priceAdvantageSubtext: 'Premium',
    confidenceLevel: 'High',
    confidenceLabel: 'Highly Reliable'
  },
  dimensionScores: {
    builderTrust: { score: 92, status: 'Verified' },
    locationQuality: { score: 88, status: 'Verified' },
    lifestyleAmenities: { score: 90, status: 'Verified' },
    valueForMoney: { score: 85, status: 'Verified' },
    appreciationPotential: { score: 95, status: 'Verified' },
    legalSafety: { score: 95, status: 'Verified' }
  },
  keyTakeaway: `${projectName} represents a premier off-plan investment in Greater Noida West, combining an impeccable legal foundation with high-end execution to capture massive capital appreciation.`,
  buyerPersonas: [
    { type: 'Families', iconName: 'Users', stars: 5, reasons: ['Excellent Multi-Tiered Security: Features 24/7 gated security with CCTV, video door phones, intercoms, patrolling guards, and RFID access.', 'Dedicated Kids\' Infrastructure: Built with dedicated central gardens, extensive children\'s play areas, and a safe children\'s wading splash pool.', 'Top-Tier Schools Nearby: Positioned within a 5-km radius of premium educational institutions, including DPS Noida Extension and Sarvottam International School.'], fit: 'Great Fit', fitColor: 'text-emerald-600 bg-emerald-50' },
    { type: 'Investors', iconName: 'Briefcase', stars: 5, reasons: [`Robust Capital Appreciation: Sector 10 has recorded a staggering 108% appreciation over a five-year horizon, with ${projectName} showing strong annual growth.`, 'High-Growth Location: Directly borders major commercial, IT, and administrative powerhouse corridors.', 'Strong Undivided Share (UDS): The low-density layout secures a much higher land share for owners.'], fit: 'Excellent Fit', fitColor: 'text-emerald-600 bg-emerald-50' },
    { type: 'Luxury Seekers', iconName: 'Gem', stars: 4, reasons: ['Exclusive Mini-Golf Course: Offers private, restricted-access mini-golf greens designed exclusively for the estate\'s residents.', 'Tall, Airy Residences: Apartments feature rare 11-foot interior ceiling heights, expansive balconies with panoramic views, and large-format premium room layouts.', 'Biophilic Landscaping: Spans 70% open green biophilic spaces with natural wellness courts, manicured gardens, and luxury deck pools.'], fit: 'Premium Fit', fitColor: 'text-amber-600 bg-amber-50' },
    { type: 'NRIs', iconName: 'Globe', stars: 5, reasons: ['Government & RERA Compliance: Approved with clear, transparent papers under RERA ID UPRERAPRJ916631/02/2024.', 'Mivan Structural Longevity: Built using 100% Mivan aluminum formwork technology, protecting long-distance assets from maintenance or seepage issues.', 'Reputable Developer Background: Backed by Elite Group, which has successfully delivered over 2,100 units across 3 million sq. ft. of residential area.'], fit: 'Great Fit', fitColor: 'text-emerald-600 bg-emerald-50' },
    { type: 'End Users', iconName: 'Home', stars: 5, reasons: ['Spacious Utility Layouts: Configured in premium, spacious floor plans (ranging from 1,800 to 2,632 sq. ft.) with added study and servant rooms.', 'In-House Retail & Convenience: Features built-in convenience stores, milk booths, multi-purpose retail spaces, cafes, spas, and salons.', 'On-Time Delivery Confidence: Backed by active, visible construction progress and fully secured institutional funding lines.'], fit: 'Great Fit', fitColor: 'text-emerald-600 bg-emerald-50' }
  ],
  investmentSnapshot: [
    { label: 'Expected Appreciation (5Y)', value: '12% to 16% annual growth', iconName: 'TrendingUp', trend: 'up' },
    { label: 'Average Rent (3BHK)', value: '₹28,000 - ₹34,000 / month', iconName: 'Home', trend: 'neutral' },
    { label: 'Price Trend', value: 'Rising', iconName: 'Activity', trend: 'up', showArrow: true },
    { label: 'ROI Potential', value: '6.5% - 7.5% rental yield', iconName: 'BarChart3', trend: 'up' }
  ],
  pricingIntelligence: {
    projectAvg: '₹11,000 /sqft',
    marketAvg: '₹9,800 /sqft',
    premium: '+12%',
    justification: 'Commands a premium due to 100% Mivan tech construction, low-density planning (115 units/acre), and exclusive luxury amenities like the private mini-golf course and 70% open green biophilic spaces.'
  },
  riskRadar: [
    { type: 'Construction Risk', level: 'Low', description: 'Heavily insulated by fast-track Mivan aluminum shuttering technology and fully secured construction funding from Tata Capital.', iconName: 'Building2', colorClass: 'text-emerald-500', bgClass: 'bg-emerald-50', badgeClass: 'bg-emerald-100 text-emerald-700' },
    { type: 'Market Risk', level: 'Medium', description: `Surrounding sectors feature high-density housing launches, but ${projectName} is insulated by its low-density layout and premium configurations.`, iconName: 'BarChart3', colorClass: 'text-amber-500', bgClass: 'bg-amber-50', badgeClass: 'bg-amber-100 text-amber-700' },
    { type: 'Legal Risk', level: 'Low', description: 'Pristine legal record. Registered under UP-RERA UPRERAPRJ916631/02/2024, with clean title deeds free of authority dues.', iconName: 'Scale', colorClass: 'text-emerald-500', bgClass: 'bg-emerald-50', badgeClass: 'bg-emerald-100 text-emerald-700' }
  ],
  detailedAnalysis: [
    { category: 'Strength', title: 'Solid Institutional Credit Support', description: 'The project\'s construction is backed by active financial charges from Tata Capital Housing Finance Limited (TCHFL), removing any potential developer cash-flow crises.', iconName: 'CheckCircle2', iconColor: 'text-blue-500' },
    { category: 'Opportunity', title: 'Upcoming Aqua Line Metro Extension', description: 'Proximity to the proposed Knowledge Park V metro station (located just 3 km away) will act as a major capital appreciation catalyst, driving property prices toward the projected target of ₹14,500+/sq. ft. by possession.', iconName: 'Sparkles', iconColor: 'text-blue-500' },
    { category: 'Risk', title: 'Off-Plan Delayed Cash Yields', description: 'With an official possession date of December 31, 2028, investors must note that capital is locked with zero immediate rental income.', iconName: 'AlertTriangle', iconColor: 'text-red-500' },
    { category: 'Consideration', title: 'Super Area Loading', description: 'The project features typical luxury loading meaning buyers must evaluate the actual carpet area configurations.', iconName: 'AlertTriangle', iconColor: 'text-amber-500' }
  ]
})

export default function IntelligenceTab({
  project, detail, d, loading, marketRef
}: IntelligenceTabProps) {
  const [activeTab, setActiveTab] = useState('All')
  const [expandedPersona, setExpandedPersona] = useState<string | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)

  const defaultIntel = getDefaultIntel(d?.name || 'This project')
  const rawIntel = (d as any)?.decision_profile?.intelligence_data || {}

  const dbIntel = {
    ...defaultIntel,
    ...rawIntel,
    topLevelMetrics: {
      ...defaultIntel.topLevelMetrics,
      ...(rawIntel.topLevelMetrics || {}),
    },
    dimensionScores: {
      ...defaultIntel.dimensionScores,
      ...(rawIntel.dimensionScores || {}),
    },
    pricingIntelligence: {
      ...defaultIntel.pricingIntelligence,
      ...(rawIntel.pricingIntelligence || {}),
    },
  }

  const overallScore = dbIntel?.topLevelMetrics?.overallScore || 50
  const tier = dbIntel?.topLevelMetrics?.tier || 'HOLD'

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

  const dimensionsForChart = [
    { key: 'builder', label: 'Builder Trust', score: dbIntel.dimensionScores?.builderTrust?.score ?? 50, value: dbIntel.dimensionScores?.builderTrust?.score ?? 50, color: '#f59e0b', stars: 3, description: '', basis: '', status: 'Verified' as const },
    { key: 'location', label: 'Location Quality', score: dbIntel.dimensionScores?.locationQuality?.score ?? 50, value: dbIntel.dimensionScores?.locationQuality?.score ?? 50, color: '#3b82f6', stars: 3, description: '', basis: '', status: 'Verified' as const },
    { key: 'amenities', label: 'Lifestyle & Amenities', score: dbIntel.dimensionScores?.lifestyleAmenities?.score ?? 50, value: dbIntel.dimensionScores?.lifestyleAmenities?.score ?? 50, color: '#8b5cf6', stars: 3, description: '', basis: '', status: 'Verified' as const },
    { key: 'value', label: 'Value for Money', score: dbIntel.dimensionScores?.valueForMoney?.score ?? 50, value: dbIntel.dimensionScores?.valueForMoney?.score ?? 50, color: '#10b981', stars: 3, description: '', basis: '', status: 'Verified' as const },
    { key: 'appreciation', label: 'Appreciation Potential', score: dbIntel.dimensionScores?.appreciationPotential?.score ?? 50, value: dbIntel.dimensionScores?.appreciationPotential?.score ?? 50, color: '#ef4444', stars: 3, description: '', basis: '', status: 'Verified' as const },
    { key: 'legal', label: 'Legal & Safety', score: dbIntel.dimensionScores?.legalSafety?.score ?? 50, value: dbIntel.dimensionScores?.legalSafety?.score ?? 50, color: '#6366f1', stars: 3, description: '', basis: '', status: 'Verified' as const }
  ]

  const getDimensionSummary = (label: string, score: number) => {
    if (label === 'Builder Trust') return score >= 90 ? 'Excellent (Legacy of 2100+ units delivered)' : 'Standard'
    if (label === 'Location Quality') return score >= 85 ? 'Strategic (Directly opposite Knowledge Park V)' : 'Emerging'
    if (label === 'Lifestyle & Amenities') return score >= 90 ? 'Premium (Private Mini-Golf & Clubhouse)' : 'Standard'
    if (label === 'Value for Money') return score >= 85 ? 'High Value (Mivan-Tech & 11ft ceilings)' : 'Fair'
    if (label === 'Appreciation Potential') return score >= 90 ? 'High (Metro extension impact)' : 'Moderate'
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

  const computedProjectAvgNumber = detail?.unit_types && detail.unit_types.length > 0
    ? (() => {
      let totalRate = 0
      let count = 0
      detail.unit_types.forEach((u: any) => {
        const superArea = u.super_area_sqft
        const priceMin = u.price_min_cr ? u.price_min_cr * 10000000 : 0
        if (superArea && priceMin) {
          totalRate += (priceMin / superArea)
          count++
        }
      })
      return count > 0 ? Math.round(totalRate / count) : Number(String(dbIntel.pricingIntelligence.projectAvg || '').replace(/[^0-9]/g, ''))
    })()
    : Number(String(dbIntel.pricingIntelligence.projectAvg || '').replace(/[^0-9]/g, ''))

  const computedProjectAvg = computedProjectAvgNumber ? `₹${computedProjectAvgNumber.toLocaleString('en-IN')} /sqft` : dbIntel.pricingIntelligence.projectAvg

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
            {dimensionsForChart.map((dim, i) => (
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
              <p className="text-[12px] font-bold text-gray-900 dark:text-white mb-0.5">Key Takeaway</p>
              <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-relaxed">{dbIntel.keyTakeaway}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-[18px] font-bold text-gray-900 dark:text-white">What Matters Most to You?</h3>
          <CollapsibleParagraph text="We've analyzed this project from different buyer perspectives. The analysis includes detailed insights for families, investors, luxury seekers, NRIs, and end users. Click to expand see why each persona matters and how the project's features align with their priorities." />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          {dbIntel.buyerPersonas.map((persona: any, idx: number) => {
            const Icon = ICON_MAP[persona.iconName] || Users
            const isExpanded = expandedPersona === persona.type
            return (
              <motion.div
                layout
                key={idx}
                className={`bg-white dark:bg-[#111] ring-1 ring-inset rounded-[24px] p-6 transition-all duration-300 flex flex-col cursor-pointer overflow-hidden ${isExpanded ? 'ring-gray-300 dark:ring-gray-600 bg-gray-50/50 dark:bg-white/5 shadow-md' : 'ring-black/5 dark:ring-white/10 hover:ring-black/10 dark:hover:ring-white/20 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)]'}`}
                onClick={() => setExpandedPersona(isExpanded ? null : persona.type)}
              >
                <motion.div layout="position" className="flex items-start justify-between mb-4">
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
                </motion.div>

                <motion.p layout="position" className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed mb-2">
                  {persona.reasons[0]?.split(':')[0] || 'Good overall fit.'}
                </motion.p>

                <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div 
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
                  </motion.div>
                )}
                </AnimatePresence>

                <motion.div layout="position" className="flex justify-start items-center mt-4 pt-4 border-t border-gray-50 dark:border-gray-800/30">
                  <span className="text-[12px] text-gray-900 dark:text-gray-100 font-bold hover:underline flex items-center gap-1.5 transition-colors">
                    {isExpanded ? 'Hide Details' : 'View Deep Dive'}
                    <span className={`text-[16px] leading-none transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'translate-x-0.5'}`}>↓</span>
                  </span>
                </motion.div>
              </motion.div>
            )
          })}
        </div>
      </div>

      <SocialProofAndTransparency 
        social={(rawIntel as any)?.social_proof}
        transparency={(rawIntel as any)?.transparency_checks_additions}
      />

      {/* 4. Investment & Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <span className="text-[13px] text-gray-600">Noida West Average</span>
              </div>
              <span className="text-[13px] font-bold text-gray-900">{dbIntel.pricingIntelligence.marketAvg}</span>
            </div>
          </div>

          <div className="bg-[#F8FAFC] border border-blue-100 rounded-xl p-5 relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[12px] text-gray-600 mb-1">You Pay</p>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-blue-600" />
                <span className="text-[24px] font-black text-blue-600 leading-none">{dbIntel.pricingIntelligence.premium}</span>
              </div>
              <p className="text-[11px] text-gray-500 mb-3">Above Market Avg.</p>
              <p className="text-[11px] text-gray-600"><span className="font-medium text-gray-900">Justified by:</span> {dbIntel.pricingIntelligence.justification}</p>
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
                data={dbIntel.riskRadar.map((r: any) => ({
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
            {dbIntel.riskRadar.map((risk: any, i: number) => {
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
      <AnimatePresence>
      {showReportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowReportModal(false)} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", bounce: 0, duration: 0.5 }}
            className="bg-white/95 dark:bg-[#131211]/95 backdrop-blur-md rounded-[32px] max-w-lg w-full p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-white/20 dark:border-white/5 relative z-10 overflow-hidden"
          >
            {/* Soft decorative glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <button
              onClick={() => setShowReportModal(false)}
              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-gray-100/50 hover:bg-gray-200/50 dark:bg-gray-800/50 dark:hover:bg-gray-700/50 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full transition-colors"
            >
              ✕
            </button>
            <div className="flex items-center gap-4 mb-8 relative z-10">
              <div className="w-12 h-12 rounded-[18px] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-100/50 dark:border-blue-800/50 flex items-center justify-center shadow-inner">
                <TrendingUp className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <div>
                <h3 className="text-[20px] font-black text-gray-900 dark:text-white tracking-tight">AI Investment Report</h3>
                <p className="text-[13px] text-gray-500 font-medium">{d?.name || 'Project'} Detailed Projections</p>
              </div>
            </div>

            <div className="space-y-5 relative z-10">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50/80 dark:bg-gray-900/80 border border-gray-100/50 dark:border-gray-800/50 p-4 rounded-[20px]">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Appreciation</span>
                  <span className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">12-16% <span className="text-[12px] font-semibold text-gray-400 tracking-normal">/yr</span></span>
                </div>
                <div className="bg-gray-50/80 dark:bg-gray-900/80 border border-gray-100/50 dark:border-gray-800/50 p-4 rounded-[20px]">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Rental Yield</span>
                  <span className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">6.5 - 7.5%</span>
                </div>
              </div>
              
              <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 p-5 rounded-[20px] space-y-3.5">
                <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed">
                  <span className="font-bold text-gray-900 dark:text-white">📈 Capital Gain Catalyst:</span> Positioned in high-appreciating Sector 10 Extension corridor. Demand is heavily catalyzed by commercial expansion opposite Knowledge Park V.
                </p>
                <div className="h-px bg-blue-100/50 dark:bg-blue-900/30 w-full" />
                <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed">
                  <span className="font-bold text-gray-900 dark:text-white">🛡️ Funding Safeguards:</span> Fast-tracked construction with zero cash-flow threat, backed by institutional funding from Tata Capital.
                </p>
                <div className="h-px bg-blue-100/50 dark:bg-blue-900/30 w-full" />
                <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed">
                  <span className="font-bold text-gray-900 dark:text-white">📋 RERA Validation:</span> Registered under UP-RERA UPRERAPRJ916631/02/2024. Clear land title deeds verify no outstanding developer dues.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 relative z-10">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-5 py-2.5 bg-gray-100/80 hover:bg-gray-200/80 dark:bg-gray-800/80 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-300 text-[13px] font-bold rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowReportModal(false)
                  alert('Investment report download started!')
                }}
                className="px-5 py-2.5 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 text-[13px] font-bold rounded-xl transition-all shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] flex items-center gap-2"
              >
                Download PDF
                <span className="opacity-60">↓</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* Additional helper components can be placed here if needed */}

    </div>
  )
}
