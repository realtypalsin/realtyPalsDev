'use client'

import { ArrowRight } from 'lucide-react'
import type { ProjectCard as ProjectCardType } from '@/types/project'
import { tierLabel } from '@/components/property-detail/shared'
const tierStyle: Record<string, string> = {
  STRONG_BUY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  BUY: 'bg-blue-50 text-blue-700 border-blue-200',
  HOLD: 'bg-amber-50 text-amber-700 border-amber-200',
  WATCH: 'bg-orange-50 text-orange-700 border-orange-200',
  AVOID: 'bg-red-50 text-red-700 border-red-200',
}

interface Props {
  project: ProjectCardType
  onViewDetails: (project: ProjectCardType) => void
}

// Pure AI reasoning — no pricing, builder, configuration, or amenities here.
// Those belong to the property preview card rendered right after this.
export default function AIRecommendationCard({ project, onViewDetails }: Props) {
  const headline = project.matchReason ?? project.decisionIntelligence?.bottomLine ?? null
  const reasons = (project.matchReasons && project.matchReasons.length > 0)
    ? project.matchReasons.slice(0, 4)
    : (project.decisionIntelligence?.topStrengths ?? []).slice(0, 4)
  const concerns = (project.concerns ?? []).slice(0, 2)
  const intel = project.decisionIntelligence

  if (!headline && reasons.length === 0 && !intel) return null

  return (
    <div className="py-2 pl-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          AI Summary
        </span>
      </div>

      <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight mb-2">
        {project.name}
      </h3>

      {reasons.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {reasons.map((r) => (
            <li key={r} className="flex items-start gap-2.5 text-[13.5px] text-gray-700 dark:text-gray-300 leading-relaxed">
              <span className="mt-[7px] w-[3px] h-[3px] rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      {concerns.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {concerns.map((c) => (
            <li key={c} className="flex items-start gap-2.5 text-[13.5px] text-gray-600 dark:text-gray-400 leading-relaxed">
              <span className="mt-[7px] w-[3px] h-[3px] rounded-full bg-amber-400/80 flex-shrink-0" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => onViewDetails(project)}
        className="flex items-center gap-1.5 text-[13px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors mt-1"
      >
        View full details <ArrowRight size={14} />
      </button>
    </div>
  )
}
