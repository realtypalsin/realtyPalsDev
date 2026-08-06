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
  blue:   { bg: 'bg-primary/5',  icon: 'text-primary',      border: 'border-primary/10' },
  green:  { bg: 'bg-success/5',  icon: 'text-success',      border: 'border-success/10' },
  purple: { bg: 'bg-accent/5',   icon: 'text-accent',       border: 'border-accent/10' },
  orange: { bg: 'bg-warning/5',  icon: 'text-warning',      border: 'border-warning/10' },
  red:    { bg: 'bg-danger/5',   icon: 'text-danger',       border: 'border-danger/10' },
}

export function StatCard({ title, value, trend, trendLabel, icon: Icon, color = 'blue' }: StatCardProps) {
  const c = colorMap[color]
  const trendUp = trend !== undefined && trend > 0
  const trendDown = trend !== undefined && trend < 0

  return (
    <div className="bg-surface rounded-lg border border-border p-lg shadow-xs hover:shadow-sm transition-all duration-fast hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-lg">
        <div className={`w-10 h-10 rounded-md ${c.bg} border ${c.border} flex items-center justify-center shrink-0`}>
          <Icon size={18} className={c.icon} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-xs px-md py-xs rounded-full text-xs font-semibold ${
            trendUp
              ? 'text-success bg-success/5'
              : trendDown
              ? 'text-danger bg-danger/5'
              : 'text-text-secondary bg-surface-2'
          }`}>
            {trendUp && <TrendingUp size={10} />}
            {trendDown && <TrendingDown size={10} />}
            {trend > 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
      <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-md">{title}</p>
      <p className="text-2xl font-bold text-text-primary leading-none tabular-nums">{value}</p>
      {trendLabel && (
        <p className="text-xs text-text-secondary mt-md">{trendLabel}</p>
      )}
    </div>
  )
}
