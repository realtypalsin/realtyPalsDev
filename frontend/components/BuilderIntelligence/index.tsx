'use client'

import { useState } from 'react'
import type { BuilderDetail } from '@/types/project'
import { computeBuilderIntelligence } from '@/lib/builderIntelligence'
import { Building2, Calendar, MapPin, BadgeCheck, Star, Shield, ArrowDown, ArrowUp, Info } from 'lucide-react'

interface Props {
  builderDetail: BuilderDetail | null
  reraNumber?: string | null
}

export default function BuilderIntelligence({ builderDetail, reraNumber }: Props) {
  const [expanded, setExpanded] = useState(false)
  const intel = computeBuilderIntelligence(builderDetail)
  const b = builderDetail

  if (!b) return null

  // 1. Calculate values dynamically from database metrics
  const yearsActive = b.founded_year ? new Date().getFullYear() - b.founded_year : null
  const totalProjects = b.total_projects_count || ((b.delivered_projects?.length || 0) + (b.ongoing_projects?.length || 0))
  const deliveredCount = b.delivered_projects?.length || 0
  const ongoingCount = b.ongoing_projects?.length || 0
  const upcomingCount = Math.max(0, totalProjects - (deliveredCount + ongoingCount))

  // Calculate overall developer score out of 5 based on verified database scores
  const scoreMetrics = [
    b.construction_quality_score,
    b.after_sales_score,
    b.buyer_satisfaction_score,
    b.rera_compliance_score
  ].filter((s): s is number => s !== null && s !== undefined)

  const overallScore = scoreMetrics.length > 0
    ? (scoreMetrics.reduce((sum, val) => sum + val, 0) / scoreMetrics.length / 20).toFixed(1)
    : null

  const getScoreLabel = (score: number) => {
    if (score >= 4.5) return 'Exceptional Track Record'
    if (score >= 4.0) return 'Strong Track Record'
    if (score >= 3.0) return 'Moderate Track Record'
    return 'Unverified Track Record'
  }

  // 2. Setup stats grid with real database values only
  const snapshotStats = [
    b.founded_year ? { label: 'FOUNDED', value: String(b.founded_year), icon: Calendar } : null,
    b.headquarters ? { label: 'HEADQUARTERS', value: b.headquarters, icon: MapPin } : null,
    totalProjects ? { label: 'TOTAL PROJECTS', value: String(totalProjects), icon: Building2 } : null,
    deliveredCount ? { label: 'DELIVERED', value: String(deliveredCount), icon: BadgeCheck } : null,
    b.average_delay_months !== null && b.average_delay_months !== undefined
      ? { label: 'AVG DELAY', value: `${b.average_delay_months} Mos`, icon: Info }
      : null,
  ].filter(Boolean) as { label: string; value: string; icon: any }[]

  return (
    <div className="border border-gray-200/60 dark:border-white/10 rounded-3xl bg-white dark:bg-gray-900 overflow-hidden shadow-sm transition-all duration-300">
      
      {/* ── SECTION 1: DEVELOPER PROFILE (Always Visible Header) ── */}
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Developer Profile
            </div>
            
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{b.name}</h2>
              {b.rera_compliance_score !== null && b.rera_compliance_score >= 80 && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  ✓
                </span>
              )}
            </div>
            
            {b.tagline && (
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">{b.tagline}</p>
            )}

            {/* Quick Badges row */}
            <div className="flex flex-wrap gap-2 pt-2">
              {intel.verdict && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-150/40 dark:border-white/5 text-[11px] font-bold text-gray-700 dark:text-gray-300">
                  <Star size={12} className="text-amber-500 fill-amber-500" />
                  {intel.verdict === 'STRONG' ? 'Tier 1 Developer' : 'Active Developer'}
                </div>
              )}
              {yearsActive && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-150/40 dark:border-white/5 text-[11px] font-bold text-gray-700 dark:text-gray-300">
                  <Calendar size={12} className="text-gray-400" />
                  {yearsActive}+ Years Experience
                </div>
              )}
              {totalProjects > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-150/40 dark:border-white/5 text-[11px] font-bold text-gray-700 dark:text-gray-300">
                  <Building2 size={12} className="text-gray-400" />
                  {totalProjects} Projects
                </div>
              )}
            </div>
          </div>

          {/* Clean image placeholder showing local theme colors or project mock */}
          <div className="w-full md:w-56 h-36 bg-gray-100 dark:bg-gray-800 border border-gray-200/50 dark:border-white/5 rounded-2xl overflow-hidden flex flex-col justify-between p-4 relative group shrink-0 shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10" />
            <div className="ml-auto bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-bold text-white uppercase tracking-wider relative z-20">
              RERA Verified
            </div>
            {b.founded_year && (
              <span className="text-[10px] font-bold text-white relative z-20 flex items-center gap-1">
                📅 Building since {b.founded_year}
              </span>
            )}
          </div>
        </div>

        {b.headquarters && (
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 dark:text-gray-500">
            <MapPin size={12} className="stroke-[2.5]" />
            Active in {b.headquarters} and surrounding regions
          </div>
        )}
      </div>

      {/* ── EXPANDABLE SECTIONS ── */}
      {expanded ? (
        <div className="border-t border-gray-150/40 dark:border-white/5 divide-y divide-gray-150/40 dark:divide-white/5 bg-gray-50/20 dark:bg-gray-900/10 animate-in fade-in slide-in-from-top-4 duration-300">
          
          {/* ── SECTION 2: AI INVESTMENT VIEW ── */}
          {(overallScore || b.company_overview || b.description) && (
            <div className="p-6 md:p-8 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/30 text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                ✦ AI Investment View
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                <div className="lg:col-span-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                  {b.company_overview || b.description}
                </div>
                
                {overallScore && (
                  <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/20 rounded-2xl p-5 text-center space-y-3">
                    <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Overall Developer Score</p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-black text-gray-900 dark:text-white">{overallScore}</span>
                      <span className="text-gray-400 dark:text-gray-500 font-semibold text-sm">/5</span>
                    </div>
                    {/* Stars */}
                    <div className="flex justify-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          size={14} 
                          className={`${
                            star <= Math.round(Number(overallScore)) 
                              ? 'text-amber-500 fill-amber-500' 
                              : 'text-gray-200 dark:text-gray-800'
                          }`} 
                        />
                      ))}
                    </div>
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {getScoreLabel(Number(overallScore))}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SECTION 3: KEY DEVELOPER SNAPSHOT ── */}
          {snapshotStats.length > 0 && (
            <div className="p-6 md:p-8 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/50 text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Key Developer Snapshot
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {snapshotStats.map((s) => {
                  const Icon = s.icon
                  return (
                    <div key={s.label} className="bg-white dark:bg-gray-900/60 border border-gray-200/50 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-between shadow-sm min-h-[90px]">
                      <div className="flex items-center justify-between text-gray-400 dark:text-gray-500 mb-2">
                        <Icon size={14} />
                        <span className="text-[9px] font-bold uppercase tracking-wider font-mono">{s.label}</span>
                      </div>
                      <p className="text-[15px] font-black text-gray-900 dark:text-white tracking-tight">{s.value}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── SECTION 4: TRACK RECORD ── */}
          {totalProjects > 0 && (
            <div className="p-6 md:p-8 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900/30 text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
                Track Record
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Progress bar cards */}
                {deliveredCount > 0 && (
                  <div className="bg-white dark:bg-gray-900/60 border border-gray-200/50 dark:border-white/5 rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-mono">Delivered Projects</span>
                      <span className="text-sm font-black text-gray-900 dark:text-white">{deliveredCount}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(deliveredCount / totalProjects) * 100}%` }} />
                    </div>
                    <p className="text-[10px] font-semibold text-gray-400 text-right">{Math.round((deliveredCount / totalProjects) * 100)}% of portfolio</p>
                  </div>
                )}

                {ongoingCount > 0 && (
                  <div className="bg-white dark:bg-gray-900/60 border border-gray-200/50 dark:border-white/5 rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-mono">Under Construction</span>
                      <span className="text-sm font-black text-gray-900 dark:text-white">{ongoingCount}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(ongoingCount / totalProjects) * 100}%` }} />
                    </div>
                    <p className="text-[10px] font-semibold text-gray-400 text-right">{Math.round((ongoingCount / totalProjects) * 150) / 1.5}% of portfolio</p>
                  </div>
                )}

                {upcomingCount > 0 && (
                  <div className="bg-white dark:bg-gray-900/60 border border-gray-200/50 dark:border-white/5 rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-mono">Upcoming Projects</span>
                      <span className="text-sm font-black text-gray-900 dark:text-white">{upcomingCount}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(upcomingCount / totalProjects) * 100}%` }} />
                    </div>
                    <p className="text-[10px] font-semibold text-gray-400 text-right">{Math.round((upcomingCount / totalProjects) * 150) / 1.5}% of portfolio</p>
                  </div>
                )}

              </div>

              {/* Extra details (Average delay, etc.) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {b.average_delay_months !== null && b.average_delay_months !== undefined && (
                  <div className="flex items-center justify-between bg-white dark:bg-gray-900/60 border border-gray-200/50 dark:border-white/5 rounded-2xl p-4 shadow-sm">
                    <span className="text-[11.5px] font-bold text-gray-400 uppercase tracking-wider font-mono">Average Delay</span>
                    <span className="text-[13px] font-extrabold text-amber-600">{b.average_delay_months} Months</span>
                  </div>
                )}
                {b.delivered_units && (
                  <div className="flex items-center justify-between bg-white dark:bg-gray-900/60 border border-gray-200/50 dark:border-white/5 rounded-2xl p-4 shadow-sm">
                    <span className="text-[11.5px] font-bold text-gray-400 uppercase tracking-wider font-mono">Largest Delivered Project</span>
                    <span className="text-[13px] font-extrabold text-gray-700 dark:text-gray-300">{b.delivered_units.toLocaleString()}+ Units</span>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      ) : null}

      {/* ── EXPAND / COLLAPSE FOOTER BAR ── */}
      <button 
        onClick={() => setExpanded(!expanded)} 
        className="w-full flex items-center justify-center gap-1.5 py-4 border-t border-gray-150/40 dark:border-white/5 bg-gray-50/50 dark:bg-gray-900/30 hover:bg-gray-100/50 dark:hover:bg-gray-800/40 text-[12px] font-bold text-gray-500 dark:text-gray-400 transition-colors"
      >
        {expanded ? (
          <>
            Collapse Profile
            <ArrowUp size={14} className="stroke-[2.5]" />
          </>
        ) : (
          <>
            Expand Full Profile
            <ArrowDown size={14} className="stroke-[2.5]" />
          </>
        )}
      </button>

    </div>
  )
}
