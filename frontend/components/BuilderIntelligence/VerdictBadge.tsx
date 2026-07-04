'use client'

import { BadgeCheck } from 'lucide-react'
import { VERDICT_META, type Verdict } from '@/lib/builderIntelligence'

interface Props {
  verdict: Verdict
  builderName: string
  yearsInBusiness: number | null
  credaiMember: boolean
}

const RING_COLOR: Record<Verdict, string> = {
  STRONG: '#22c55e',
  ESTABLISHED: '#3b82f6',
  EMERGING: '#f59e0b',
  UNKNOWN: '#9ca3af',
  INSUFFICIENT_DATA: '#d1d5db',
}

const VERDICT_ICON: Record<Verdict, string> = {
  STRONG: '✓',
  ESTABLISHED: '◆',
  EMERGING: '◈',
  UNKNOWN: '?',
  INSUFFICIENT_DATA: '—',
}

export default function VerdictBadge({ verdict, builderName, yearsInBusiness, credaiMember }: Props) {
  const meta = VERDICT_META[verdict]
  const ringColor = RING_COLOR[verdict]
  const icon = VERDICT_ICON[verdict]
  const size = 52

  return (
    <div className={`relative overflow-hidden rounded-[24px] border border-gray-200/60 bg-white p-5 shadow-[0_2px_24px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_4px_32px_rgba(0,0,0,0.04)]`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-50/50 to-transparent rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
      <div className="flex items-center gap-5 relative z-10">
        {/* Modern minimal ring */}
        <div className="relative flex-shrink-0 flex items-center justify-center rounded-full bg-gray-50/50 border border-gray-100 shadow-sm" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
            <circle cx={size / 2} cy={size / 2} r={size / 2 - 2} fill="none" stroke="#f3f4f6" strokeWidth={1.5} />
            <circle
              cx={size / 2} cy={size / 2} r={size / 2 - 2}
              fill="none"
              stroke={ringColor}
              strokeWidth={2}
              strokeDasharray={`${(2 * Math.PI * (size / 2 - 2)) * 0.75} ${(2 * Math.PI * (size / 2 - 2)) * 0.25}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </svg>
          <span className="text-[18px] font-bold" style={{ color: ringColor }}>{icon}</span>
        </div>

        {/* Verdict info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-[17px] font-bold text-gray-900 tracking-tight truncate mb-1">{builderName}</h4>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${meta.bgClass} ${meta.textClass} border ${meta.borderClass} shadow-sm`}>
              {meta.label}
            </span>
            {yearsInBusiness !== null && yearsInBusiness > 0 && (
              <span className="text-[12px] font-medium text-gray-500 flex items-center gap-1.5 before:content-[''] before:block before:w-1 before:h-1 before:bg-gray-300 before:rounded-full">
                {yearsInBusiness} yrs active
              </span>
            )}
            {credaiMember && (
              <span className="text-[12px] font-medium text-gray-500 flex items-center gap-1.5 before:content-[''] before:block before:w-1 before:h-1 before:bg-gray-300 before:rounded-full">
                <BadgeCheck size={14} className="text-green-600" /> CREDAI
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

