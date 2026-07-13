'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, BarChart3, Loader2, Building2, MapPin, ArrowUpRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot } from 'recharts'

import { API_BASE } from '@/lib/env'

interface ComparisonData {
  sector: string
  city: string
  project_count: number
  avg_price_sqft: number | null
  min_price_sqft: number | null
  max_price_sqft: number | null
  status_breakdown: Record<string, number>
  bhk_distribution: Record<string, number>
}

interface Props {
  sector: string
  city?: string
  currentPriceSqft?: number

}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    under_construction: 'Under Const.',
    ready_to_move:      'Ready',
    new_launch:         'New Launch',
  }
  return map[s] ?? s
}

function statusColor(s: string): string {
  const map: Record<string, string> = {
    under_construction: 'bg-amber-500',
    ready_to_move:      'bg-emerald-500',
    new_launch:         'bg-blue-500',

  }
  return map[s] ?? 'bg-gray-400'
}

import { Skeleton } from '@/components/ui/skeleton'

export default function MarketComparison({ sector, city = 'Noida', currentPriceSqft }: Props) {

  const [data, setData] = useState<ComparisonData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`${API_BASE}/market-comparison?sector=${encodeURIComponent(sector)}&city=${encodeURIComponent(city)}`)
      .then((r) => r.json())
      .then((d) => setData(d.error ? null : d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [sector, city])

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="text-right space-y-2">
            <Skeleton className="h-4 w-16 ml-auto" />
            <Skeleton className="h-6 w-32 ml-auto" />
          </div>
        </div>
        
        <Skeleton className="h-[200px] w-full rounded-xl" />
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-50">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (!data) return <p className="text-xs text-gray-400 py-2">No market data available for Sector {sector}.</p>

  // Calculate percentages for indicators
  const min = data.min_price_sqft || 0
  const max = data.max_price_sqft || 0
  const avg = data.avg_price_sqft || 0

  // Generate a smooth bell curve for the distribution chart
  const generateDistributionCurve = () => {
    if (!min || !max || !avg) return []
    const points = []
    const steps = 40
    // Pad the min/max by 10% for visual breathing room
    const range = max - min
    const paddedMin = min - (range * 0.1)
    const paddedMax = max + (range * 0.1)
    const step = (paddedMax - paddedMin) / steps
    
    for (let i = 0; i <= steps; i++) {
      const x = paddedMin + (step * i)
      const variance = range / 3 
      const y = Math.exp(-Math.pow(x - avg, 2) / (2 * Math.pow(variance, 2)))
      points.push({ price: x, density: y * 100 })
    }
    return points
  }

  const chartData = generateDistributionCurve()

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#111] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-xl border border-white/10">
          ₹{Math.round(label).toLocaleString()}/sqft
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">
      {/* Price comparison card */}
      {data.avg_price_sqft && (
        <div className="bg-white dark:bg-[#111] border border-gray-100 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-[20px] p-6 lg:p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <BarChart3 size={18} />
              </div>
              <div>
                <h4 className="text-[16px] font-bold text-gray-900 dark:text-white tracking-tight">Sector {sector} Price Distribution</h4>
                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[0.1em] mt-0.5">Real-time localized market positioning</p>
              </div>
            </div>
            {currentPriceSqft && avg > 0 && (
              <span className={`text-[10px] font-bold uppercase tracking-[0.05em] px-3 py-1.5 rounded-full ${
                currentPriceSqft > avg ? 'text-amber-700 bg-amber-50 dark:bg-amber-500/10' : 'text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10'
              }`}>
                {currentPriceSqft > avg 
                  ? `+${Math.round(((currentPriceSqft - avg) / avg) * 100)}% Premium`
                  : `${Math.round(((avg - currentPriceSqft) / avg) * 100)}% Below Avg`
                }
              </span>
            )}
          </div>

          <div className="h-[200px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDensity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="price" 
                  tickFormatter={(val) => `₹${(val/1000).toFixed(1)}k`} 
                  stroke="#9ca3af"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={30}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area 
                  type="monotone" 
                  dataKey="density" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorDensity)" 
                  activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                />
                
                {/* Average Market Line */}
                <ReferenceLine 
                  x={avg} 
                  stroke="#9ca3af" 
                  strokeDasharray="3 3"
                  label={{ value: 'Market Avg', position: 'top', fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} 
                />

                {/* Current Project Line */}
                {currentPriceSqft && (
                  <ReferenceLine 
                    x={currentPriceSqft} 
                    stroke="#2563eb" 
                    strokeWidth={2}
                    label={{ 
                      value: 'This Project', 
                      position: 'top', 
                      fill: '#2563eb', 
                      fontSize: 11, 
                      fontWeight: 800,
                      offset: 10
                    }} 
                  />
                )}
                {currentPriceSqft && (
                  <ReferenceDot 
                    x={currentPriceSqft} 
                    y={Math.exp(-Math.pow(currentPriceSqft - avg, 2) / (2 * Math.pow((max - min) / 3, 2))) * 100} 
                    r={5} 
                    fill="#2563eb" 
                    stroke="#fff" 
                    strokeWidth={2} 
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100 dark:border-white/5">
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.1em]">Sector Min</p>
              <p className="text-[14px] font-black text-gray-900 dark:text-white mt-0.5">₹{min.toLocaleString()}/sqft</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.1em]">Sector Max</p>
              <p className="text-[14px] font-black text-gray-900 dark:text-white mt-0.5">₹{max.toLocaleString()}/sqft</p>

            </div>
          </div>
        </div>
      )}

      {/* Stats breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.status_breakdown && (
          <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-[20px] p-6">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.1em] mb-5">{data.project_count} {data.project_count === 1 ? 'Project' : 'Projects'} in Sector {sector}</p>
            <div className="space-y-4">
              {Object.entries(data.status_breakdown).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${statusColor(k)}`} />
                    <span className="text-[12px] text-gray-700 dark:text-gray-300 font-bold tracking-tight">{statusLabel(k)}</span>
                  </div>
                  <span className="text-[12px] font-black text-gray-900 dark:text-white bg-gray-50 dark:bg-white/5 ring-1 ring-inset ring-gray-900/5 dark:ring-white/10 px-2.5 py-1 rounded-md">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.bhk_distribution && (
          <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-[20px] p-6">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.1em] mb-5">Unit Mix Distribution</p>
            <div className="space-y-4">
              {Object.entries(data.bhk_distribution)
                .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                .map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-[12px] text-gray-700 dark:text-gray-300 font-bold tracking-tight w-12">{k}</span>
                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(v / Math.max(...Object.values(data.bhk_distribution))) * 100}%` }}
                      />
                    </div>
                    <span className="text-[12px] font-black text-gray-900 dark:text-white w-4 text-right">{v}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
