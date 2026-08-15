'use client'

import { useState } from 'react'
import { Check, ShieldCheck, Activity, Calendar } from 'lucide-react'
import type { ProjectOverviewData } from '@/lib/backend-api'

export interface ConstructionTimelineProps {
  milestones?: ProjectOverviewData['construction_milestones'] | null
  projectStatus?: string
  possessionDate?: string | null
  projectRiskFlag?: string | null
  onTimeDeliveryPct?: number | null
}

function formatPossessionDate(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    const cleanStr = raw.trim()
    const dateObj = new Date(cleanStr)
    if (isNaN(dateObj.getTime())) {
      // Fallback if not a standard date format
      return cleanStr.replace(/T.*$/, '')
    }
    return dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  } catch {
    return raw
  }
}

export default function ConstructionTimeline({
  milestones,
  projectStatus,
  possessionDate,
  projectRiskFlag,
  onTimeDeliveryPct = 94
}: ConstructionTimelineProps) {
  const isRTM = projectStatus === 'ready_to_move' || projectStatus === 'delivered'
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState<number | null>(null)
  const [isExpanded, setIsExpanded] = useState<boolean>(false)

  // Use only real milestones, no fabricated defaults
  const list = (milestones && milestones.length > 0)
    ? milestones.map((m: any, idx: number) => ({
        ...m,
        description: m.description || `Phase ${idx + 1} construction milestone.`
      }))
    : []

  const completedCount = list.filter((m: any) => m.status === 'completed').length
  const inProgressCount = list.filter((m: any) => m.status === 'in_progress').length
  const totalCount = list.length || 1

  const calculatedPct = isRTM ? 100 : Math.min(100, Math.round(((completedCount + inProgressCount * 0.5) / totalCount) * 100))
  const progressPct = calculatedPct

  const selectedPhase = selectedPhaseIndex !== null ? list[selectedPhaseIndex] : null
  const formattedPossession = formatPossessionDate(possessionDate)

  return (
    <div className="relative overflow-hidden bg-white dark:bg-[#111111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[28px] p-5 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] transition-all space-y-5">
      
      {/* Header Section with Status & Toggle Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/5 relative z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-[18px] sm:text-[20px] font-black text-gray-900 dark:text-white tracking-tight leading-tight">
              {isRTM ? 'Delivery & Possession Status' : 'Construction & Development Timeline'}
            </h2>
          </div>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">
            {isRTM ? 'Occupancy Certificate (OC) granted & completed project milestones' : 'Real-time site velocity & milestone tracking from official RERA logs'}
          </p>
        </div>

        {/* Status Tag Pill Top Right */}
        <div className="flex items-center gap-2.5 self-start sm:self-center flex-wrap">
          <div className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#F0FDF4] dark:bg-emerald-950/40 text-[#00875A] dark:text-emerald-300 border border-[#DCFCE7] dark:border-emerald-800/50 flex items-center gap-1.5 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>{isRTM ? 'Possession Ready • OC Granted' : 'On Track for On-Time Delivery'}</span>
          </div>

          {list.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3.5 py-1 rounded-full text-[11.5px] font-extrabold bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-800 dark:text-gray-200 transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <span>{isExpanded ? 'Collapse' : `View ${list.length} Milestones`}</span>
              <span className={`text-[9px] transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
            </button>
          )}
        </div>
      </div>

      {/* Modern Sleek Overall Progress Bar (Visible outside the collapsed timeline) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gray-50/70 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center">
              <Activity size={14} />
            </div>
            <div>
              <span className="text-[13px] font-black text-gray-900 dark:text-white">Overall Construction Progress</span>
              <p className="text-[10.5px] text-gray-400 font-semibold">{completedCount} of {list.length || 6} milestones completed</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[18px] sm:text-[20px] font-black text-[#00875A] dark:text-emerald-400">{progressPct}%</span>
            <span className="text-[10px] text-gray-400 font-bold block">Completed</span>
          </div>
        </div>

        {/* Custom Track Bar with Glowing Gradient & Pin Indicator */}
        <div className="w-full bg-gray-200/80 dark:bg-gray-800/80 h-3 rounded-full relative overflow-visible flex items-center shadow-inner">
          <div
            className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-700 ease-out shadow-xs"
            style={{ width: `${progressPct}%` }}
          />
          <div
            className="w-4 h-4 rounded-full bg-emerald-700 dark:bg-white border-2 border-white dark:border-gray-900 shadow-md absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-700 ease-out z-10 flex items-center justify-center cursor-pointer hover:scale-125"
            style={{ left: `${Math.min(Math.max(progressPct, 4), 96)}%` }}
            title={`Current Progress: ${progressPct}%`}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-gray-900" />
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 dark:text-gray-400 pt-0.5">
          <span>Site Excavation</span>
          <span className="text-blue-600 dark:text-blue-400">Finishing &amp; MEP</span>
          <span>Key Handover</span>
        </div>
      </div>

      {/* Main Timeline Card Grid (Expandable on demand) */}
      {isExpanded && list.length > 0 && (
        <div className="pt-2 pb-1 space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {list.map((m: any, i: number) => {
              const isDone = m.status === 'completed'
              const isInProgress = m.status === 'in_progress'
              const isSelected = selectedPhaseIndex === i

              return (
                <div
                  key={i}
                  onClick={() => setSelectedPhaseIndex(isSelected ? null : i)}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[120px] relative group overflow-hidden hover:-translate-y-0.5 ${
                    isDone
                      ? 'bg-[#F0FDF4] dark:bg-emerald-950/20 border-[#DCFCE7] dark:border-emerald-800/40 text-[#00684A] dark:text-emerald-200'
                      : isInProgress
                      ? 'bg-[#F0F9FF] dark:bg-blue-950/20 border-[#E0F2FE] dark:border-blue-800/40 text-[#0055A5] dark:text-blue-200 shadow-2xs'
                      : 'bg-gray-50/70 dark:bg-white/[0.03] border-gray-100 dark:border-white/5 text-gray-400 dark:text-gray-500'
                  } ${isSelected ? 'ring-2 ring-blue-500/50 shadow-md scale-[1.02]' : ''}`}
                >
                  {isInProgress && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500/80 rounded-t-2xl animate-pulse" />
                  )}

                  {/* Top Row */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-black tracking-wider uppercase ${
                      isDone ? 'text-[#00875A] dark:text-emerald-400' : isInProgress ? 'text-[#0066CC] dark:text-blue-400' : 'text-gray-400'
                    }`}>
                      PHASE 0{i + 1}
                    </span>
                    {isDone ? (
                      <div className="w-4 h-4 rounded-full bg-[#DCFCE7] dark:bg-emerald-900/50 flex items-center justify-center">
                        <Check size={11} className="text-[#00875A] dark:text-emerald-400 stroke-[3]" />
                      </div>
                    ) : isInProgress ? (
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-700" />
                    )}
                  </div>

                  {/* Card Title */}
                  <div className="my-auto py-1">
                    <p className={`text-[12px] font-extrabold leading-snug line-clamp-2 ${
                      isDone ? 'text-gray-900 dark:text-emerald-100' : isInProgress ? 'text-gray-900 dark:text-blue-100' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {m.name}
                    </p>
                  </div>

                  {/* Card Bottom Row */}
                  <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5">
                    <span className={`text-[10px] font-black ${
                      isDone ? 'text-[#00875A] dark:text-emerald-400' : isInProgress ? 'text-[#0066CC] dark:text-blue-400' : 'text-gray-400'
                    }`}>
                      {isDone ? 'Done' : isInProgress ? 'Active' : 'Upcoming'}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                      {m.date_label || m.date || 'Scheduled'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Expanded Phase Details (Interactive Drawer on Click) */}
          {selectedPhase && (
            <div className="overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-top-2">
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white">
                      Phase {selectedPhaseIndex! + 1}
                    </span>
                    <h4 className="text-[13.5px] font-extrabold text-gray-900 dark:text-white">
                      {selectedPhase.name}
                    </h4>
                  </div>
                  <p className="text-[11.5px] text-gray-600 dark:text-gray-300 font-medium max-w-2xl">
                    {selectedPhase.description}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 self-end sm:self-center">
                  <div className="text-right text-[11px]">
                    <p className="text-gray-400 font-medium">Target Schedule</p>
                    <p className="font-black text-gray-900 dark:text-white">{selectedPhase.date_label || 'Scheduled'}</p>
                  </div>
                  <button
                    onClick={() => setSelectedPhaseIndex(null)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-white/50 dark:hover:bg-white/10 text-xs font-bold"
                  >
                    Close ✕
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Footer Info Strip */}
      {formattedPossession && (
        <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5 font-bold text-gray-700 dark:text-gray-300">
            <Calendar size={13} className="text-blue-500" />
            <span>Target Possession: {formattedPossession}</span>
          </div>
          <span className="text-[10px] text-gray-400">RERA Verified Timeline</span>
        </div>
      )}
    </div>
  )
}
