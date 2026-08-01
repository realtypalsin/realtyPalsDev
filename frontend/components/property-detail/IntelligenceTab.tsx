'use client'
import { useState } from 'react'
import {
  ChevronDown, Sparkles, CheckCircle2, AlertTriangle, TrendingUp,
  BarChart3, Building2, ShieldAlert, Home, FileText, Users, Download
} from 'lucide-react'
import type { ProjectCard as ProjectCardType, ProjectDetail } from '@/types/project'

interface IntelligenceTabProps {
  project: ProjectCardType | null
  detail: ProjectDetail | null
  d: (ProjectCardType | ProjectDetail) | null
  loading: boolean
  timelineAdvice: string | null
  negotiationLeverage: string[]
  walkAwayConditions: string[]
  marketVisible: boolean
  marketRef: React.RefObject<HTMLDivElement>
}

// Collapsible section component
function AnalysisSection({
  title,
  icon: Icon,
  expanded,
  onToggle,
  children,
  defaultExpanded = false
}: {
  title: string
  icon: React.ElementType
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
  defaultExpanded?: boolean
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-[#111]">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <h3 className="text-[15px] font-bold text-gray-900 dark:text-white text-left">{title}</h3>
        </div>
        <ChevronDown
          size={18}
          className={`text-gray-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/30">{children}</div>}
    </div>
  )
}

export default function IntelligenceTab({
  project,
  detail,
  d,
  loading,
  timelineAdvice,
  negotiationLeverage,
  walkAwayConditions
}: IntelligenceTabProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    executive: true,
    shouldContinue: true,
    financial: false,
    market: false,
    builder: false,
    property: false,
    comparative: false,
    resources: false
  })

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const decisionProfile = (d as any)?.decision_profile || {}
  const recommendationProfile = (d as any)?.recommendation_profile || {}
  const dna = (d as any)?.dna || {}

  // Extract intelligence data from decision profile
  const financialIntel = decisionProfile.financial_intelligence || {}
  const marketIntel = decisionProfile.market_intelligence || {}
  const builderIntel = decisionProfile.builder_intelligence || {}
  const propertyIntel = decisionProfile.property_intelligence || {}
  const comparativeIntel = decisionProfile.comparative_analysis || {}

  const tier = recommendationProfile.tier || 'PENDING'
  const confidenceScore = dna.overall_score || 0
  const primaryThesis = recommendationProfile.primary_thesis || 'Analysis pending'

  const tierColors: Record<string, string> = {
    STRONG_BUY: 'text-emerald-600 dark:text-emerald-400',
    BUY: 'text-green-600 dark:text-green-400',
    HOLD: 'text-amber-600 dark:text-amber-400',
    WATCH: 'text-blue-600 dark:text-blue-400',
    AVOID: 'text-rose-600 dark:text-rose-400',
    PENDING: 'text-gray-600 dark:text-gray-400'
  }

  const tierBgColors: Record<string, string> = {
    STRONG_BUY: 'bg-emerald-50 dark:bg-emerald-900/20',
    BUY: 'bg-green-50 dark:bg-green-900/20',
    HOLD: 'bg-amber-50 dark:bg-amber-900/20',
    WATCH: 'bg-blue-50 dark:bg-blue-900/20',
    AVOID: 'bg-rose-50 dark:bg-rose-900/20',
    PENDING: 'bg-gray-50 dark:bg-gray-900/20'
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-12 pt-4">
      {/* 1. AI Executive Summary */}
      <AnalysisSection
        title="AI Executive Summary"
        icon={Sparkles}
        expanded={expandedSections.executive}
        onToggle={() => toggleSection('executive')}
        defaultExpanded
      >
        <div className={`p-4 rounded-lg border ${tierBgColors[tier]}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={`text-[14px] font-black uppercase tracking-widest ${tierColors[tier]}`}>{tier.replace('_', ' ')}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                {confidenceScore > 0 ? `${confidenceScore}% Confidence` : 'Confidence pending'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[12px] text-gray-600 dark:text-gray-400">Based on</p>
              <p className="text-[14px] font-bold text-gray-900 dark:text-white">420+ data points</p>
            </div>
          </div>
          <p className="text-[13px] text-gray-700 dark:text-gray-300 mt-3 leading-relaxed">{primaryThesis}</p>
        </div>
      </AnalysisSection>

      {/* 2. Should You Continue Reading? */}
      <AnalysisSection
        title="Should You Continue Reading?"
        icon={CheckCircle2}
        expanded={expandedSections.shouldContinue}
        onToggle={() => toggleSection('shouldContinue')}
        defaultExpanded
      >
        <div className="space-y-4">
          {decisionProfile.why_buy && decisionProfile.why_buy.length > 0 && (
            <div>
              <p className="text-[12px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2">Reasons to Buy</p>
              <ul className="space-y-1">
                {decisionProfile.why_buy.map((reason: string, i: number) => (
                  <li key={i} className="text-[13px] text-gray-700 dark:text-gray-300 flex items-start gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">✓</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {decisionProfile.why_avoid && decisionProfile.why_avoid.length > 0 && (
            <div>
              <p className="text-[12px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-2">Reasons to Avoid</p>
              <ul className="space-y-1">
                {decisionProfile.why_avoid.map((reason: string, i: number) => (
                  <li key={i} className="text-[13px] text-gray-700 dark:text-gray-300 flex items-start gap-2">
                    <span className="text-rose-600 dark:text-rose-400 font-bold mt-0.5">⚠</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {walkAwayConditions && walkAwayConditions.length > 0 && (
            <div className="p-3 bg-rose-50 dark:bg-rose-900/10 rounded-lg border border-rose-100 dark:border-rose-800">
              <p className="text-[12px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-2">Walk Away If</p>
              <ul className="space-y-1">
                {walkAwayConditions.map((condition: string, i: number) => (
                  <li key={i} className="text-[12px] text-rose-700 dark:text-rose-300">• {condition}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </AnalysisSection>

      {/* 3. Financial Intelligence */}
      <AnalysisSection title="Financial Intelligence" icon={TrendingUp} expanded={expandedSections.financial} onToggle={() => toggleSection('financial')}>
        <div className="space-y-3">
          {Object.entries(financialIntel).map(([key, value]: [string, any]) => (
            <div key={key} className="flex justify-between items-start gap-4">
              <span className="text-[13px] text-gray-600 dark:text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
              <span className="text-[13px] font-bold text-gray-900 dark:text-white text-right">{String(value)}</span>
            </div>
          ))}
          {Object.keys(financialIntel).length === 0 && <p className="text-[13px] text-gray-500">No data available yet</p>}
        </div>
      </AnalysisSection>

      {/* 4. Market Intelligence */}
      <AnalysisSection title="Market Intelligence" icon={BarChart3} expanded={expandedSections.market} onToggle={() => toggleSection('market')}>
        <div className="space-y-3">
          {Object.entries(marketIntel).map(([key, value]: [string, any]) => (
            <div key={key} className="flex justify-between items-start gap-4">
              <span className="text-[13px] text-gray-600 dark:text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
              <span className="text-[13px] font-bold text-gray-900 dark:text-white text-right">{String(value)}</span>
            </div>
          ))}
          {Object.keys(marketIntel).length === 0 && <p className="text-[13px] text-gray-500">No data available yet</p>}
        </div>
      </AnalysisSection>

      {/* 5. Builder & Risk Intelligence */}
      <AnalysisSection title="Builder & Risk Intelligence" icon={Building2} expanded={expandedSections.builder} onToggle={() => toggleSection('builder')}>
        <div className="space-y-3">
          {Object.entries(builderIntel).map(([key, value]: [string, any]) => (
            <div key={key} className="flex justify-between items-start gap-4">
              <span className="text-[13px] text-gray-600 dark:text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
              <span className="text-[13px] font-bold text-gray-900 dark:text-white text-right">{String(value)}</span>
            </div>
          ))}
          {Object.keys(builderIntel).length === 0 && <p className="text-[13px] text-gray-500">No data available yet</p>}
        </div>
      </AnalysisSection>

      {/* 6. Property Intelligence */}
      <AnalysisSection title="Property Intelligence" icon={Home} expanded={expandedSections.property} onToggle={() => toggleSection('property')}>
        <div className="space-y-3">
          {Object.entries(propertyIntel).map(([key, value]: [string, any]) => (
            <div key={key} className="flex justify-between items-start gap-4">
              <span className="text-[13px] text-gray-600 dark:text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
              <span className="text-[13px] font-bold text-gray-900 dark:text-white text-right">{String(value)}</span>
            </div>
          ))}
          {Object.keys(propertyIntel).length === 0 && <p className="text-[13px] text-gray-500">No data available yet</p>}
        </div>
      </AnalysisSection>

      {/* 7. Comparative Analysis */}
      <AnalysisSection title="Comparative Analysis" icon={ShieldAlert} expanded={expandedSections.comparative} onToggle={() => toggleSection('comparative')}>
        <div className="space-y-3">
          {Object.entries(comparativeIntel).map(([key, value]: [string, any]) => (
            <div key={key} className="flex justify-between items-start gap-4">
              <span className="text-[13px] text-gray-600 dark:text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
              <span className="text-[13px] font-bold text-gray-900 dark:text-white text-right">{String(value)}</span>
            </div>
          ))}
          {Object.keys(comparativeIntel).length === 0 && <p className="text-[13px] text-gray-500">No data available yet</p>}
        </div>
      </AnalysisSection>

      {/* 8. Resources & Reports */}
      <AnalysisSection title="Resources & Reports" icon={FileText} expanded={expandedSections.resources} onToggle={() => toggleSection('resources')}>
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
            <Download size={16} className="text-blue-600 dark:text-blue-400" />
            <span className="text-[13px] text-blue-700 dark:text-blue-300">Verified documents available in Overview tab</span>
          </div>
          <div className="text-[12px] text-gray-600 dark:text-gray-400 space-y-1">
            <p>• Project brochure</p>
            <p>• Floor plans & specifications</p>
            <p>• RERA certificate</p>
            <p>• Payment plan details</p>
            <p>• Cost breakdown</p>
            <p>• Legal documents</p>
          </div>
        </div>
      </AnalysisSection>

      {/* Timeline & Negotiation Info */}
      {(timelineAdvice || (negotiationLeverage && negotiationLeverage.length > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl">
          {timelineAdvice && (
            <div>
              <p className="text-[12px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-2">Timeline Advice</p>
              <p className="text-[13px] text-gray-700 dark:text-gray-300">{timelineAdvice}</p>
            </div>
          )}

          {negotiationLeverage && negotiationLeverage.length > 0 && (
            <div>
              <p className="text-[12px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-2">Negotiation Points</p>
              <ul className="space-y-1">
                {negotiationLeverage.map((point: string, i: number) => (
                  <li key={i} className="text-[13px] text-gray-700 dark:text-gray-300">• {point}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
