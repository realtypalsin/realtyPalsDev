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
  const size = 56

  return (
    <div className={`rounded-2xl border p-4 ${meta.borderClass} ${meta.bgClass}`}>
      <div className="flex items-center gap-4">
        {/* SVG ring */}
        <div className="flex-shrink-0">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={size / 2 - 4}
              fill="white"
              stroke="#e5e7eb"
              strokeWidth={2}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={size / 2 - 4}
              fill="none"
              stroke={ringColor}
              strokeWidth={3}
              strokeDasharray={`${(2 * Math.PI * (size / 2 - 4)) * 0.75} ${(2 * Math.PI * (size / 2 - 4)) * 0.25}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="18"
              fontWeight="bold"
              fill={ringColor}
            >
              {icon}
            </text>
          </svg>
        </div>

        {/* Verdict info */}
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-black text-gray-900 truncate">{builderName}</p>
          <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full mt-1 ${meta.bgClass} ${meta.textClass} border ${meta.borderClass}`}>
            {meta.label}
          </span>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {yearsInBusiness !== null && yearsInBusiness > 0 && (
              <span className="text-[11px] text-gray-500">{yearsInBusiness} yrs in business</span>
            )}
            {credaiMember && (
              <span className="inline-flex items-center gap-1 text-[11px] text-green-700 font-semibold">
                <BadgeCheck size={11} />
                CREDAI
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
