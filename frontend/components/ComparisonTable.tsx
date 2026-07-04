'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Trophy, TrendingUp, ShieldCheck, Users, Zap } from 'lucide-react'
import { Buildings, SealCheck } from '@phosphor-icons/react'
import type { ProjectCard, ProjectDetail } from '@/types/project'
import { API_BASE } from '@/lib/env'

// ── Tier configuration ────────────────────────────────────────────────────────

const TIER_ORDER: Record<string, number> = {
  STRONG_BUY: 5, BUY: 4, HOLD: 3, WATCH: 2, AVOID: 1,
}

const TIER_CFG: Record<string, {
  label: string
  dot: string
  chipCls: string       // for tier badges on cards/headers
  borderCls: string     // for winner card ring
}> = {
  STRONG_BUY: {
    label: 'STRONG BUY',
    dot: '🔵',
    chipCls: 'bg-[#0064E5] text-white',
    borderCls: 'ring-2 ring-[#0064E5]/30 border-[#0064E5]/40 dark:border-[#0064E5]/50',
  },
  BUY: {
    label: 'BUY',
    dot: '🟢',
    chipCls: 'bg-emerald-600 text-white',
    borderCls: 'ring-1 ring-emerald-400/30 border-emerald-300 dark:border-emerald-700',
  },
  HOLD: {
    label: 'CONSIDER',
    dot: '🟡',
    chipCls: 'bg-amber-500 text-white',
    borderCls: 'border-amber-300 dark:border-amber-700',
  },
  WATCH: {
    label: 'WATCH',
    dot: '🟠',
    chipCls: 'bg-orange-500 text-white',
    borderCls: 'border-orange-300 dark:border-orange-700',
  },
  AVOID: {
    label: 'AVOID',
    dot: '🔴',
    chipCls: 'bg-red-600 text-white',
    borderCls: 'border-red-300 dark:border-red-700',
  },
}

const PERSONA_LABEL: Record<string, string> = {
  FAMILY:       '👨‍👩‍👧 Family',
  PROFESSIONAL: '💼 Professional',
  INVESTOR:     '📈 Investor',
  NRI:          '✈️ NRI',
  UPGRADER:     '🔝 Upgrader',
  RETIREE:      '🏡 Retiree',
}

// ── Data helpers ──────────────────────────────────────────────────────────────

function starsCount(label: string | null | undefined): number {
  if (!label) return 0
  const l = label.toLowerCase()
  if (
    l.includes('market leader') || l.includes('outstanding') ||
    l.includes('excellent') || l.includes('very high') || l.includes('top tier')
  ) return 5
  if (
    l.includes('strong') || l.includes('established') ||
    l.includes('high') || l.includes('above average')
  ) return 4
  if (
    l.includes('growing') || l.includes('average') ||
    l.includes('moderate') || l.includes('mid')
  ) return 3
  if (
    l.includes('emerging') || l.includes('limited') ||
    l.includes('below') || l.includes('developing')
  ) return 2
  if (
    l.includes('poor') || l.includes('concern') ||
    l.includes('weak') || l.includes('low')
  ) return 1
  return 3
}

function StarRow({ count, size = 'md' }: { count: number; size?: 'sm' | 'md' }) {
  const full = Math.max(0, Math.min(5, count))
  return (
    <span className={`${size === 'sm' ? 'text-[12px]' : 'text-[15px]'} tracking-tight`}>
      <span className="text-amber-400">{'★'.repeat(full)}</span>
      <span className="text-gray-200 dark:text-gray-700">{'★'.repeat(5 - full)}</span>
    </span>
  )
}

function deriveRisk(d: ProjectDetail | null): 'Low' | 'Medium' | 'High' {
  const tier = d?.recommendation_profile?.tier
  if (tier === 'AVOID' || tier === 'WATCH') return 'High'
  if (tier === 'STRONG_BUY' || tier === 'BUY') {
    const cert = d?.dna?.possession_certainty_label?.toLowerCase() ?? ''
    if (cert.includes('risk') || cert.includes('concern') || cert.includes('low')) return 'Medium'
    return 'Low'
  }
  const cert = d?.dna?.possession_certainty_label?.toLowerCase() ?? ''
  if (cert.includes('high') || cert.includes('certain') || cert.includes('strong')) return 'Low'
  if (cert.includes('low') || cert.includes('risk') || cert.includes('concern')) return 'High'
  return 'Medium'
}

const RISK_ORDER: Record<string, number> = { Low: 3, Medium: 2, High: 1 }

function winnerIdx(scores: number[]): number[] {
  const max = Math.max(...scores)
  return max === 0 ? [] : scores.map((s, i) => (s === max ? i : -1)).filter(i => i >= 0)
}

function findOverallWinner(details: (ProjectDetail | null)[], projects: ProjectCard[]): number {
  let bestIdx = 0
  let bestScore = -1
  details.forEach((d, i) => {
    const tierScore = TIER_ORDER[d?.recommendation_profile?.tier ?? ''] ?? 0
    const matchScore = projects[i].matchScore ?? 0
    const combined = tierScore * 1000 + matchScore
    if (combined > bestScore) { bestScore = combined; bestIdx = i }
  })
  return bestIdx
}

function categoryWinner(
  details: (ProjectDetail | null)[],
  projects: ProjectCard[],
  cat: string,
): number | null {
  switch (cat) {
    case 'overall': {
      if (!details.some(d => d?.recommendation_profile?.tier)) return null
      return findOverallWinner(details, projects)
    }
    case 'value': {
      const scores = details.map(d => starsCount(d?.dna?.price_position_label))
      const max = Math.max(...scores)
      if (max > 0) {
        const candidates = scores.map((s, i) => (s === max ? i : -1)).filter(i => i >= 0)
        if (candidates.length === 1) return candidates[0]
        const prices = candidates.map(i => projects[i].price_min_cr ?? Infinity)
        return candidates[prices.indexOf(Math.min(...prices))]
      }
      const prices = projects.map(p => p.price_min_cr ?? Infinity)
      const min = Math.min(...prices)
      const idx = prices.indexOf(min)
      return min < Infinity ? idx : null
    }
    case 'risk': {
      const risks = details.map(d => deriveRisk(d))
      const scores = risks.map(r => RISK_ORDER[r] ?? 0)
      const candidates = winnerIdx(scores)
      return candidates.length === 1 ? candidates[0] : null
    }
    case 'family': {
      const scores = details.map(d => {
        const personas = [
          d?.persona_profile?.primary_persona,
          ...(d?.persona_profile?.secondary_personas ?? []),
        ]
        return (personas.includes('FAMILY') ? 2 : 0) +
               (d?.recommendation_profile?.family_thesis ? 1 : 0)
      })
      const candidates = winnerIdx(scores)
      return candidates.length === 1 ? candidates[0] : null
    }
    case 'investor': {
      const scores = details.map(d => {
        const personas = [
          d?.persona_profile?.primary_persona,
          ...(d?.persona_profile?.secondary_personas ?? []),
        ]
        return (personas.includes('INVESTOR') ? 2 : 0) +
               (d?.recommendation_profile?.investor_thesis ? 1 : 0)
      })
      const candidates = winnerIdx(scores)
      return candidates.length === 1 ? candidates[0] : null
    }
    case 'luxury': {
      const scores = details.map(d =>
        (d?.recommendation_profile?.luxury_thesis ? 1 : 0) +
        starsCount(d?.dna?.amenity_depth_label)
      )
      const candidates = winnerIdx(scores)
      return candidates.length === 1 ? candidates[0] : null
    }
    default: return null
  }
}

// ── Matrix row builder ────────────────────────────────────────────────────────

interface MatrixRow {
  label: string
  values: React.ReactNode[]
  winners: number[]
  winnerLabel: string
}

function buildMatrix(details: (ProjectDetail | null)[], projects: ProjectCard[]): MatrixRow[] {
  const rows: MatrixRow[] = []

  // Advisor Rating
  const tiers = details.map(d => d?.recommendation_profile?.tier ?? null)
  rows.push({
    label: 'Advisor Rating',
    values: tiers.map(t => {
      const cfg = t ? TIER_CFG[t] : null
      return cfg ? (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide ${cfg.chipCls}`}>
          {cfg.dot} {cfg.label}
        </span>
      ) : (
        <span className="text-gray-400 text-[11px]">—</span>
      )
    }),
    winners: winnerIdx(tiers.map(t => TIER_ORDER[t ?? ''] ?? 0)),
    winnerLabel: 'Highest Rated',
  })

  // Builder Standing
  const builderLabels = details.map(d => d?.dna?.builder_track_record_label)
  const builderScores = builderLabels.map(l => starsCount(l))
  rows.push({
    label: 'Builder',
    values: builderLabels.map((l, i) => (
      <span key={i} className="inline-flex flex-col gap-0.5">
        <StarRow count={builderScores[i]} size="sm" />
        {l && <span className="text-[9px] text-gray-500 dark:text-gray-400">{l}</span>}
      </span>
    )),
    winners: winnerIdx(builderScores),
    winnerLabel: 'Best Builder',
  })

  // Delivery Risk
  const risks = details.map(d => deriveRisk(d))
  rows.push({
    label: 'Delivery Risk',
    values: risks.map((r, i) => {
      const cls =
        r === 'Low' ? 'text-emerald-600 dark:text-emerald-400' :
        r === 'High' ? 'text-red-500 dark:text-red-400' :
        'text-amber-500'
      const dot = r === 'Low' ? '🟢' : r === 'High' ? '🔴' : '🟡'
      return (
        <span key={i} className={`text-[11px] font-bold ${cls}`}>{dot} {r}</span>
      )
    }),
    winners: winnerIdx(risks.map(r => RISK_ORDER[r] ?? 0)),
    winnerLabel: 'Safest',
  })

  // RERA Standing
  const reraLabels = details.map(d => d?.dna?.rera_compliance_label)
  const reraScores = reraLabels.map(l => starsCount(l))
  if (reraScores.some(s => s > 0)) {
    rows.push({
      label: 'RERA Standing',
      values: reraLabels.map((l, i) => (
        <span key={i} className="inline-flex flex-col gap-0.5">
          <StarRow count={reraScores[i]} size="sm" />
          {l && <span className="text-[9px] text-gray-500 dark:text-gray-400">{l}</span>}
        </span>
      )),
      winners: winnerIdx(reraScores),
      winnerLabel: 'Best Compliance',
    })
  }

  // Value Position
  const valueLabels = details.map(d => d?.dna?.price_position_label)
  const valueScores = valueLabels.map(l => starsCount(l))
  if (valueScores.some(s => s > 0)) {
    rows.push({
      label: 'Value',
      values: valueLabels.map((l, i) => (
        <span key={i} className="inline-flex flex-col gap-0.5">
          <StarRow count={valueScores[i]} size="sm" />
          {l && <span className="text-[9px] text-gray-500 dark:text-gray-400">{l}</span>}
        </span>
      )),
      winners: winnerIdx(valueScores),
      winnerLabel: 'Best Value',
    })
  }

  // Location Quality
  const locLabels = details.map(d => d?.dna?.locality_label)
  const locScores = locLabels.map(l => starsCount(l))
  if (locScores.some(s => s > 0)) {
    rows.push({
      label: 'Location',
      values: locLabels.map((l, i) => (
        <span key={i} className="inline-flex flex-col gap-0.5">
          <StarRow count={locScores[i]} size="sm" />
          {l && <span className="text-[9px] text-gray-500 dark:text-gray-400">{l}</span>}
        </span>
      )),
      winners: winnerIdx(locScores),
      winnerLabel: 'Best Location',
    })
  }

  // Amenity Depth
  const amenityLabels = details.map(d => d?.dna?.amenity_depth_label)
  const amenityScores = amenityLabels.map(l => starsCount(l))
  if (amenityScores.some(s => s > 0)) {
    rows.push({
      label: 'Lifestyle',
      values: amenityLabels.map((l, i) => (
        <span key={i} className="inline-flex flex-col gap-0.5">
          <StarRow count={amenityScores[i]} size="sm" />
          {l && <span className="text-[9px] text-gray-500 dark:text-gray-400">{l}</span>}
        </span>
      )),
      winners: winnerIdx(amenityScores),
      winnerLabel: 'Best Amenities',
    })
  }

  // Entry Price (lowest wins)
  const prices = projects.map(p => p.price_min_cr ?? 0)
  const validPrices = prices.filter(p => p > 0)
  if (validPrices.length > 1) {
    const minP = Math.min(...validPrices)
    rows.push({
      label: 'Entry Price',
      values: projects.map((p, i) => (
        <span key={i} className="text-[11px] font-bold text-gray-700 dark:text-gray-300 font-mono">
          {p.price_range_label}
        </span>
      )),
      winners: prices.map((p, i) => (p === minP && p > 0 ? i : -1)).filter(i => i >= 0),
      winnerLabel: 'Lowest Entry',
    })
  }

  // Possession
  const rtmIdxs = projects.map((p, i) => (p.status === 'ready_to_move' ? i : -1)).filter(i => i >= 0)
  rows.push({
    label: 'Possession',
    values: projects.map((p, i) =>
      p.status === 'ready_to_move' ? (
        <span key={i} className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">✓ Ready Now</span>
      ) : (
        <span key={i} className="text-[11px] text-gray-600 dark:text-gray-400">{p.possession_label ?? 'TBD'}</span>
      )
    ),
    winners: rtmIdxs.length < projects.length ? rtmIdxs : [],
    winnerLabel: 'Ready to Move',
  })

  return rows
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon?: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={12} className="text-gray-400 flex-shrink-0" />}
        <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.12em]">
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}

// ── Project mini-card ─────────────────────────────────────────────────────────

function ProjectMiniCard({
  project,
  detail,
  isWinner,
}: {
  project: ProjectCard
  detail: ProjectDetail | null
  isWinner: boolean
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const tier = detail?.recommendation_profile?.tier
  const cfg = tier ? TIER_CFG[tier] : null
  const isRTM = project.status === 'ready_to_move'

  const uploadedImage = (project.images ?? []).find(
    (i) => i.type === 'exterior' || i.type === 'hero'
  )?.url
  const imgSrc = uploadedImage ?? project.hero_image_url

  return (
    <div className={`flex-1 rounded-2xl overflow-hidden border transition-all ${
      isWinner
        ? 'border-[#0064E5]/40 dark:border-[#0064E5]/50 ring-2 ring-[#0064E5]/20 shadow-lg shadow-blue-500/10'
        : 'border-gray-200 dark:border-gray-700'
    } bg-white dark:bg-gray-800`}>
      {/* Image */}
      <div className="relative h-[110px] bg-gray-100 dark:bg-gray-700">
        {imgSrc && !imgFailed ? (
          <Image
            src={imgSrc}
            alt={project.name}
            fill
            unoptimized
            onError={() => setImgFailed(true)}
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20">
            <Buildings size={28} className="text-blue-200" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Winner crown */}
        {isWinner && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-[#0064E5] text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow">
            <Trophy size={8} />
            Top Pick
          </div>
        )}

        {/* Tier badge — only show on non-winner to avoid crowding */}
        {cfg && !isWinner && (
          <div className={`absolute top-2 left-2 text-[9px] font-black px-1.5 py-0.5 rounded-full ${cfg.chipCls}`}>
            {cfg.dot} {cfg.label}
          </div>
        )}

        {/* Tier on winner — bottom right */}
        {cfg && isWinner && (
          <div className={`absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded-full ${cfg.chipCls}`}>
            {cfg.dot} {cfg.label}
          </div>
        )}

        {/* Status */}
        <div className={`absolute bottom-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
          isRTM ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white'
        }`}>
          {isRTM ? '✓ Ready' : (project.possession_label ?? 'UC')}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5 truncate">
          {project.builder.name}
        </p>
        <h4 className="text-[12px] font-black text-gray-900 dark:text-gray-100 leading-snug line-clamp-2">
          {project.name}
        </h4>
        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{project.sector}</p>
        <p className="text-[16px] font-black text-gray-900 dark:text-white mt-1.5 leading-none font-mono">
          {project.price_range_label}
        </p>
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ n }: { n: number }) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-3">
        {Array.from({ length: n }).map((_, i) => (
          <div key={i} className="flex-1 rounded-2xl h-[180px] bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
      {[80, 60, 70, 55, 65].map((w, i) => (
        <div key={i} className={`h-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse`} style={{ width: `${w}%` }} />
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ComparisonTable({ projects }: { projects: ProjectCard[] }) {
  const slugKey = projects.map(p => p.slug).join(',')

  const [details, setDetails] = useState<(ProjectDetail | null)[]>(
    projects.map(() => null)
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all(
      projects.map(p =>
        fetch(`${API_BASE}/projects/${p.slug}`)
          .then(r => (r.ok ? r.json() : null))
          .then(d => (d?.project as ProjectDetail) ?? null)
          .catch(() => null)
      )
    ).then(results => {
      if (!cancelled) {
        setDetails(results)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugKey])

  const hasIntelligence = details.some(d => d?.recommendation_profile?.tier)
  const isMulti = projects.length > 2

  const overallWinnerIdx = useMemo(
    () => (hasIntelligence ? findOverallWinner(details, projects) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [details, hasIntelligence]
  )

  const winner = overallWinnerIdx !== null ? projects[overallWinnerIdx] : null
  const winnerDetail = overallWinnerIdx !== null ? details[overallWinnerIdx] : null
  const winnerTier = winnerDetail?.recommendation_profile?.tier
  const winnerCfg = winnerTier ? TIER_CFG[winnerTier] : null

  const matrixRows = useMemo(
    () => buildMatrix(details, projects),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [details]
  )

  const EXEC_CATS = [
    { key: 'overall',  label: 'Best Overall',  icon: '🏆' },
    { key: 'value',    label: 'Best Value',     icon: '💰' },
    { key: 'risk',     label: 'Lowest Risk',    icon: '🛡️' },
    { key: 'family',   label: 'Best Family',    icon: '👨‍👩‍👧' },
    { key: 'investor', label: 'Best Investor',  icon: '📈' },
    { key: 'luxury',   label: 'Best Luxury',    icon: '✨' },
  ] as const

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full rounded-2xl overflow-hidden border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-900 shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
    >
      {/* ── AI Verdict Header ──────────────────────────────────────────────── */}
      {hasIntelligence && winner && winnerCfg && (
        <div className="bg-[#0064E5] px-4 pt-4 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Trophy size={15} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-[10px] font-black text-blue-200 uppercase tracking-[0.12em]">
                  AI Verdict
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30`}>
                  {winnerCfg.dot} {winnerCfg.label}
                </span>
              </div>
              <p className="text-[15px] font-black text-white leading-snug">
                {winner.name} wins this comparison
              </p>
              {winnerDetail?.recommendation_profile?.primary_thesis && (
                <p className="text-[12px] text-blue-100 mt-1 leading-relaxed line-clamp-2">
                  {winnerDetail.recommendation_profile.primary_thesis}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {loading ? (
        <Skeleton n={projects.length} />
      ) : (
        <div className="p-4 space-y-5">

          {/* Project cards */}
          {isMulti ? (
            <div className="flex gap-2.5 overflow-x-auto pb-0.5">
              {projects.map((p, i) => (
                <div key={p.id} className="flex-none w-[150px]">
                  <ProjectMiniCard
                    project={p}
                    detail={details[i]}
                    isWinner={overallWinnerIdx === i}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-3">
              <ProjectMiniCard
                project={projects[0]}
                detail={details[0]}
                isWinner={overallWinnerIdx === 0}
              />
              <div className="flex items-center justify-center w-6 flex-shrink-0">
                <span className="text-[10px] font-black text-gray-200 dark:text-gray-700 rotate-0">
                  VS
                </span>
              </div>
              <ProjectMiniCard
                project={projects[1]}
                detail={details[1]}
                isWinner={overallWinnerIdx === 1}
              />
            </div>
          )}

          {/* ── Executive Summary ────────────────────────────────────────── */}
          {hasIntelligence && (
            <Section title="Decision Summary" icon={Zap}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {EXEC_CATS.map(cat => {
                  const idx = categoryWinner(details, projects, cat.key)
                  const w = idx !== null ? projects[idx] : null
                  return (
                    <div
                      key={cat.key}
                      className={`rounded-xl px-3 py-2.5 border transition-colors ${
                        w
                          ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                          : 'bg-gray-50/60 dark:bg-gray-800/30 border-gray-100 dark:border-gray-700/40 opacity-60'
                      }`}
                    >
                      <span className="text-[15px] leading-none block mb-1">{cat.icon}</span>
                      <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide block">
                        {cat.label}
                      </span>
                      <span className="text-[11px] font-black text-gray-900 dark:text-gray-100 block mt-0.5 line-clamp-1">
                        {w ? w.name : 'Tied'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </Section>
          )}

          {/* ── Decision Matrix ──────────────────────────────────────────── */}
          <Section title="Decision Matrix" icon={TrendingUp}>
            {isMulti ? (
              // 3+ projects: scrollable table
              <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
                <table className="w-full min-w-max text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/80">
                      <th className="text-left px-3 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wide border-b border-r border-gray-100 dark:border-gray-700 w-24">
                        Category
                      </th>
                      {projects.map((p, i) => (
                        <th
                          key={p.id}
                          className={`px-3 py-2.5 text-[9px] font-black uppercase tracking-wide text-center border-b border-r border-gray-100 dark:border-gray-700 last:border-r-0 ${
                            overallWinnerIdx === i
                              ? 'text-[#0064E5] dark:text-blue-400'
                              : 'text-gray-400'
                          }`}
                        >
                          {overallWinnerIdx === i && '🏆 '}
                          {p.name.split(' ').slice(0, 2).join(' ')}
                        </th>
                      ))}
                      <th className="px-3 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wide text-center border-b border-gray-100 dark:border-gray-700">
                        Winner
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrixRows.map((row, ri) => (
                      <tr
                        key={row.label}
                        className={`border-b border-gray-100 dark:border-gray-700/60 last:border-0 ${
                          ri % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/40 dark:bg-gray-800/20'
                        }`}
                      >
                        <td className="px-3 py-2.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-gray-700/60">
                          {row.label}
                        </td>
                        {row.values.map((val, i) => (
                          <td
                            key={i}
                            className={`px-3 py-2.5 text-center border-r border-gray-100 dark:border-gray-700/60 last:border-r-0 ${
                              row.winners.includes(i)
                                ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                : ''
                            }`}
                          >
                            {typeof val === 'string' ? (
                              <span className={`text-[11px] font-bold ${
                                row.winners.includes(i)
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}>
                                {val}
                              </span>
                            ) : val}
                          </td>
                        ))}
                        <td className="px-3 py-2.5 text-center">
                          {row.winners.length === 1 ? (
                            <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                              {row.winnerLabel}
                            </span>
                          ) : row.winners.length > 1 ? (
                            <span className="text-[9px] text-gray-400">Tie</span>
                          ) : (
                            <span className="text-gray-200 dark:text-gray-700 text-[10px]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              // 2 projects: center-label layout
              <div className="space-y-1.5">
                {matrixRows.map(row => {
                  const leftWins = row.winners.includes(0)
                  const rightWins = row.winners.includes(1)
                  const tied = leftWins && rightWins
                  return (
                    <div
                      key={row.label}
                      className="flex items-stretch rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700/70"
                    >
                      {/* Left cell */}
                      <div className={`flex-1 px-3 py-2.5 flex items-center gap-1.5 min-w-0 ${
                        leftWins && !tied
                          ? 'bg-emerald-50 dark:bg-emerald-900/15'
                          : 'bg-white dark:bg-gray-800'
                      }`}>
                        {leftWins && !tied && (
                          <span className="text-[8px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">
                            {row.winnerLabel}
                          </span>
                        )}
                        <div className={`min-w-0 ${
                          leftWins && !tied
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {typeof row.values[0] === 'string' ? (
                            <span className="text-[11px] font-bold truncate">{row.values[0]}</span>
                          ) : row.values[0]}
                        </div>
                      </div>

                      {/* Center label */}
                      <div className="flex items-center justify-center px-2.5 bg-gray-50 dark:bg-gray-900/80 border-x border-gray-100 dark:border-gray-700/70 flex-shrink-0">
                        <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.08em] whitespace-nowrap">
                          {row.label}
                        </span>
                      </div>

                      {/* Right cell */}
                      <div className={`flex-1 px-3 py-2.5 flex items-center justify-end gap-1.5 min-w-0 ${
                        rightWins && !tied
                          ? 'bg-emerald-50 dark:bg-emerald-900/15'
                          : 'bg-white dark:bg-gray-800'
                      }`}>
                        <div className={`min-w-0 text-right ${
                          rightWins && !tied
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {typeof row.values[1] === 'string' ? (
                            <span className="text-[11px] font-bold truncate">{row.values[1]}</span>
                          ) : row.values[1]}
                        </div>
                        {rightWins && !tied && (
                          <span className="text-[8px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">
                            {row.winnerLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>

          {/* ── Builder Intelligence ─────────────────────────────────────── */}
          {details.some(d => d?.dna?.builder_track_record_label) && (
            <Section title="Builder Intelligence" icon={ShieldCheck}>
              <div className={`${isMulti ? 'flex gap-2.5 overflow-x-auto' : 'grid grid-cols-2 gap-2.5'}`}>
                {projects.map((p, i) => {
                  const d = details[i]
                  const trackLabel = d?.dna?.builder_track_record_label
                  const reraLabel = d?.dna?.rera_compliance_label
                  const deliveryLabel = d?.dna?.possession_certainty_label
                  const n = starsCount(trackLabel)
                  const isW = overallWinnerIdx === i
                  return (
                    <div
                      key={p.id}
                      className={`${isMulti ? 'flex-none w-[180px]' : ''} rounded-xl border p-3 ${
                        isW
                          ? 'border-[#0064E5]/30 dark:border-[#0064E5]/40 bg-blue-50/40 dark:bg-blue-900/15'
                          : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5 truncate">
                        {p.builder.name}
                      </p>
                      <div className="flex items-center gap-1.5 mb-1">
                        <StarRow count={n} size="md" />
                        {isW && (
                          <span className="text-[8px] font-black text-[#0064E5] dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded-full">
                            Top Pick
                          </span>
                        )}
                      </div>
                      {trackLabel && (
                        <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                          {trackLabel}
                        </p>
                      )}
                      {reraLabel && (
                        <div className="flex items-start gap-1 mt-1">
                          <SealCheck size={10} weight="fill" className="text-[#0064E5] flex-shrink-0 mt-0.5" />
                          <span className="text-[9px] text-gray-500 dark:text-gray-400 leading-tight">
                            {reraLabel}
                          </span>
                        </div>
                      )}
                      {deliveryLabel && (
                        <div className="mt-1.5 text-[9px] text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700 pt-1.5">
                          Delivery: {deliveryLabel}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </Section>
          )}

          {/* ── Buyer Persona Match ──────────────────────────────────────── */}
          {details.some(d => d?.persona_profile?.primary_persona) && (
            <Section title="Best For" icon={Users}>
              <div className={`${isMulti ? 'flex gap-2.5 overflow-x-auto' : 'grid grid-cols-2 gap-2.5'}`}>
                {projects.map((p, i) => {
                  const profile = details[i]?.persona_profile
                  if (!profile?.primary_persona) {
                    return (
                      <div
                        key={p.id}
                        className={`${isMulti ? 'flex-none w-[160px]' : ''} rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3`}
                      >
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide mb-1 truncate">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-gray-400">—</p>
                      </div>
                    )
                  }
                  const personas = [
                    profile.primary_persona,
                    ...(profile.secondary_personas ?? []),
                  ].filter(Boolean)
                  return (
                    <div
                      key={p.id}
                      className={`${isMulti ? 'flex-none w-[160px]' : ''} rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-3`}
                    >
                      <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 truncate">
                        {p.name}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {personas.slice(0, 3).map(persona => (
                          <span
                            key={persona}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              persona === profile.primary_persona
                                ? 'bg-[#0064E5]/10 text-[#0064E5] dark:text-blue-400 dark:bg-blue-900/30'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {PERSONA_LABEL[persona ?? ''] ?? persona}
                          </span>
                        ))}
                      </div>
                      {profile.family_stage && (
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 leading-snug">
                          {profile.family_stage}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </Section>
          )}

          {/* ── Pros & Cons ──────────────────────────────────────────────── */}
          {details.some(
            d =>
              (d?.decision_profile?.why_buy?.length ?? 0) > 0 ||
              (d?.decision_profile?.why_avoid?.length ?? 0) > 0
          ) && (
            <Section title="Strengths & Concerns">
              <div className={`${isMulti ? 'flex gap-2.5 overflow-x-auto' : 'grid grid-cols-2 gap-2.5'}`}>
                {projects.map((p, i) => {
                  const dp = details[i]?.decision_profile
                  return (
                    <div
                      key={p.id}
                      className={`${isMulti ? 'flex-none w-[200px]' : ''} rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden`}
                    >
                      <div className="px-3 py-2 bg-gray-50/80 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide line-clamp-1">
                          {p.name}
                        </span>
                      </div>
                      <div className="p-3 space-y-1.5">
                        {dp?.why_buy?.slice(0, 3).map((w, wi) => (
                          <div key={wi} className="flex items-start gap-1.5">
                            <span className="text-emerald-500 text-[11px] flex-shrink-0 leading-relaxed">✓</span>
                            <span className="text-[11px] text-gray-700 dark:text-gray-300 leading-snug">{w}</span>
                          </div>
                        ))}
                        {dp?.why_avoid?.slice(0, 2).map((w, wi) => (
                          <div key={wi} className="flex items-start gap-1.5">
                            <span className="text-red-400 text-[11px] flex-shrink-0 leading-relaxed">✗</span>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">{w}</span>
                          </div>
                        ))}
                        {!dp && (
                          <p className="text-[11px] text-gray-400 italic">No analysis available yet.</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Section>
          )}

          {/* ── Final Verdict ─────────────────────────────────────────────── */}
          {hasIntelligence && winner && overallWinnerIdx !== null && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.12 }}
              className="rounded-xl border border-[#0064E5]/20 dark:border-[#0064E5]/30 bg-gradient-to-br from-blue-50/80 to-indigo-50/40 dark:from-blue-950/40 dark:to-indigo-950/20 p-4"
            >
              <div className="flex items-center gap-2 mb-2.5">
                <Trophy size={13} className="text-[#0064E5] dark:text-blue-400" />
                <span className="text-[10px] font-black text-[#0064E5] dark:text-blue-400 uppercase tracking-[0.12em]">
                  Our Recommendation
                </span>
              </div>

              <p className="text-[13px] font-black text-gray-900 dark:text-gray-100 mb-1.5">
                Buy {winner.name}
              </p>

              {winnerDetail?.decision_profile?.decision_thesis && (
                <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-relaxed">
                  {winnerDetail.decision_profile.decision_thesis}
                </p>
              )}

              {/* When to pick the other project */}
              {projects.length === 2 && (() => {
                const loserIdx = overallWinnerIdx === 0 ? 1 : 0
                const loserDetail = details[loserIdx]
                const altThesis =
                  loserDetail?.recommendation_profile?.end_use_thesis ??
                  loserDetail?.recommendation_profile?.investment_thesis ??
                  loserDetail?.decision_profile?.not_ideal_for
                if (!altThesis) return null
                return (
                  <div className="mt-3 pt-3 border-t border-[#0064E5]/15 dark:border-[#0064E5]/20">
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                      Consider {projects[loserIdx].name} instead if:
                    </p>
                    <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                      {altThesis}
                    </p>
                  </div>
                )
              })()}
            </motion.div>
          )}

          {/* ── No intelligence fallback ──────────────────────────────────── */}
          {!hasIntelligence && (
            <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 p-4 text-center">
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                AI intelligence not yet published for these projects.
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
