'use client'

import { Star, ArrowRight } from 'lucide-react'
import type { ProjectCard as ProjectCardType } from '@/types/project'

const tierLabel: Record<string, string> = { STRONG_BUY: 'Strong Buy', BUY: 'Buy', HOLD: 'Hold', WATCH: 'Watch', AVOID: 'Avoid' }
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
    <div className="rounded-[24px] border border-blue-100 bg-blue-50/40 p-5 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">AI Recommendation</span>
        {intel && (
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${tierStyle[intel.tier] ?? tierStyle.HOLD}`}>
            {tierLabel[intel.tier] ?? intel.tier} · {intel.confidence} Confidence
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 mb-1.5">
        <Star size={12} className="fill-amber-400 text-amber-400" />
        Recommended Property
      </div>
      <h3 className="text-[18px] font-bold text-gray-900 tracking-tight mb-2">{project.name}</h3>

      {headline && <p className="text-[13.5px] text-gray-700 leading-relaxed mb-4">{headline}</p>}

      {reasons.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Why this property</p>
          <ul className="space-y-1.5">
            {reasons.map((r) => (
              <li key={r} className="flex items-start gap-2 text-[12.5px] text-gray-700">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-blue-400 flex-shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {concerns.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Worth noting</p>
          <ul className="space-y-1.5">
            {concerns.map((c) => (
              <li key={c} className="flex items-start gap-2 text-[12.5px] text-gray-600">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={() => onViewDetails(project)}
        className="flex items-center gap-1.5 text-[12.5px] font-bold text-blue-600 hover:text-blue-700 mt-2"
      >
        View full analysis <ArrowRight size={13} />
      </button>
    </div>
  )
}
