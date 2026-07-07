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
  STRONG: '#10b981', // Emerald
  ESTABLISHED: '#3b82f6', // Blue
  EMERGING: '#f59e0b', // Amber
  UNKNOWN: '#6b7280', // Gray
  INSUFFICIENT_DATA: '#9ca3af',
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
  const size = 48

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-white/10 bg-white/80 dark:bg-gray-900/60 backdrop-blur-md p-5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.03)] hover:border-gray-300 dark:hover:border-white/20 group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/5 dark:from-blue-500/10 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="flex items-center gap-4 relative z-10">
        
        {/* Sleek Rating Dial */}
        <div className="relative flex-shrink-0 flex items-center justify-center rounded-full bg-gray-50/50 dark:bg-gray-800/40 border border-gray-100 dark:border-white/5 shadow-sm" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
            <circle cx={size / 2} cy={size / 2} r={size / 2 - 2} fill="none" stroke="currentColor" className="text-gray-100 dark:text-gray-800" strokeWidth={1.5} />
            <circle
              cx={size / 2} cy={size / 2} r={size / 2 - 2}
              fill="none"
              stroke={ringColor}
              strokeWidth={2}
              strokeDasharray={`${(2 * Math.PI * (size / 2 - 2)) * 0.75} ${(2 * Math.PI * (size / 2 - 2)) * 0.25}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="drop-shadow-[0_0_2px_var(--tw-shadow-color)]"
              style={{ '--tw-shadow-color': ringColor } as React.CSSProperties}
            />
          </svg>
          <span className="text-[16px] font-extrabold tracking-tight" style={{ color: ringColor }}>{icon}</span>
        </div>

        {/* Verdict Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-[16px] font-bold text-gray-900 dark:text-white tracking-tight truncate mb-1.5">{builderName}</h4>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${meta.bgClass} ${meta.textClass} border ${meta.borderClass} shadow-sm`}>
              {meta.label}
            </span>
            {yearsInBusiness !== null && yearsInBusiness > 0 && (
              <span className="text-[11.5px] font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 before:content-[''] before:block before:w-1 before:h-1 before:bg-gray-300 dark:before:bg-gray-700 before:rounded-full">
                {yearsInBusiness} yrs active
              </span>
            )}
            {credaiMember && (
              <span className="text-[11.5px] font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 before:content-[''] before:block before:w-1 before:h-1 before:bg-gray-300 dark:before:bg-gray-700 before:rounded-full">
                <BadgeCheck size={13} className="text-green-600 dark:text-green-500" /> CREDAI
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
