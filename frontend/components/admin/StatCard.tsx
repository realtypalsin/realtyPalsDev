// frontend/components/admin/StatCard.tsx
'use client'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

type ColorScheme = 'blue' | 'green' | 'purple' | 'orange' | 'red'

interface StatCardProps {
  title: string
  value: string | number
  trend?: number           // Percentage change — positive = up, negative = down
  trendLabel?: string      // e.g. "vs last week"
  icon: LucideIcon
  color?: ColorScheme
}

const colorMap: Record<ColorScheme, { bg: string; icon: string; border: string }> = {
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   border: 'border-blue-100' },
  green:  { bg: 'bg-emerald-50',icon: 'text-emerald-600',border: 'border-emerald-100' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-100' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-100' },
  red:    { bg: 'bg-red-50',    icon: 'text-red-600',    border: 'border-red-100' },
}

export function StatCard({ title, value, trend, trendLabel, icon: Icon, color = 'blue' }: StatCardProps) {
  const c = colorMap[color]
  const trendUp = trend !== undefined && trend > 0
  const trendDown = trend !== undefined && trend < 0

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center shrink-0`}>
          <Icon size={20} className={c.icon} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
            trendUp
              ? 'text-emerald-700 bg-emerald-50'
              : trendDown
              ? 'text-red-700 bg-red-50'
              : 'text-slate-600 bg-slate-50'
          }`}>
            {trendUp && <TrendingUp size={10} />}
            {trendDown && <TrendingDown size={10} />}
            {trend > 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
      <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest mb-1">{title}</p>
      <p className="text-[28px] font-bold text-slate-900 leading-none tabular-nums">{value}</p>
      {trendLabel && (
        <p className="text-[11px] text-slate-400 mt-1">{trendLabel}</p>
      )}
    </div>
  )
}
