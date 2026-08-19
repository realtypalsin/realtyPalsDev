'use client'
import React from 'react'
import { TrendUp, TrendDown } from '@phosphor-icons/react'

type ColorScheme = 'blue' | 'green' | 'purple' | 'orange' | 'red'

interface StatCardProps {
  title: string
  value: string | number
  trend?: number           // Percentage change — positive = up, negative = down
  trendLabel?: string      // e.g. "vs last week"
  icon: React.ComponentType<{ size?: number; weight?: any; className?: string }>
  color?: ColorScheme
}

const colorMap: Record<ColorScheme, { bg: string; icon: string; border: string }> = {
  blue:   { bg: 'bg-blue-50 dark:bg-blue-950/40',    icon: 'text-blue-600 dark:text-blue-400',       border: 'border-blue-200/60 dark:border-blue-800/60' },
  green:  { bg: 'bg-emerald-50 dark:bg-emerald-950/40', icon: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200/60 dark:border-emerald-800/60' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/40',  icon: 'text-purple-600 dark:text-purple-400',    border: 'border-purple-200/60 dark:border-purple-800/60' },
  orange: { bg: 'bg-amber-50 dark:bg-amber-950/40',   icon: 'text-amber-600 dark:text-amber-400',     border: 'border-amber-200/60 dark:border-amber-800/60' },
  red:    { bg: 'bg-rose-50 dark:bg-rose-950/40',      icon: 'text-rose-600 dark:text-rose-400',        border: 'border-rose-200/60 dark:border-rose-800/60' },
}

export function StatCard({ title, value, trend, trendLabel, icon: Icon, color = 'blue' }: StatCardProps) {
  const c = colorMap[color]
  const trendUp = trend !== undefined && trend > 0
  const trendDown = trend !== undefined && trend < 0

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-2xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center shrink-0`}>
          <Icon size={20} weight="duotone" className={c.icon} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
            trendUp
              ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60'
              : trendDown
              ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-800/60'
              : 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800'
          }`}>
            {trendUp && <TrendUp size={12} weight="bold" />}
            {trendDown && <TrendDown size={12} weight="bold" />}
            {trend > 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
      <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">{title}</p>
      <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 leading-none tabular-nums tracking-tight">{value}</p>
      {trendLabel && (
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-2">{trendLabel}</p>
      )}
    </div>
  )
}
