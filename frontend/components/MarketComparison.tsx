'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, BarChart3, Loader2, Building2, MapPin, ArrowUpRight } from 'lucide-react'
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
      <div className="flex items-center justify-center gap-3 py-12 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <Loader2 size={18} className="animate-spin text-blue-500" />
        <span className="text-[13px] text-gray-500 font-medium">Analyzing sector market dynamics...</span>
      </div>
    )
  }

  if (!data) return <p className="text-xs text-gray-400 py-2">No market data available for Sector {sector}.</p>

  // Calculate percentages for indicators
  const min = data.min_price_sqft || 0
  const max = data.max_price_sqft || 0
  const avg = data.avg_price_sqft || 0
  const range = max - min

  const getPercentage = (value: number) => {
    if (!range) return 50
    return Math.max(0, Math.min(100, ((value - min) / range) * 100))
  }

  const avgPercent = getPercentage(avg)
  const currentPercent = currentPriceSqft ? getPercentage(currentPriceSqft) : null

  return (
    <div className="space-y-6">
      {/* Price comparison card */}
      {data.avg_price_sqft && (
        <div className="bg-white border border-gray-100 shadow-sm rounded-3xl p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <BarChart3 size={16} />
              </div>
              <div>
                <h4 className="text-[15px] font-bold text-gray-900">Sector {sector} Price Benchmarking</h4>
                <p className="text-[11px] text-gray-400 font-medium">Real-time localized market positioning</p>
              </div>
            </div>
            {currentPriceSqft && avg > 0 && (
              <span className={`text-[12px] font-bold px-2.5 py-1 rounded-full ${
                currentPriceSqft > avg ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50'
              }`}>
                {currentPriceSqft > avg 
                  ? `+${Math.round(((currentPriceSqft - avg) / avg) * 100)}% Sector Premium`
                  : `${Math.round(((currentPriceSqft - avg) / avg) * 100)}% Below Average`
                }
              </span>
            )}
          </div>

          <div className="space-y-8">
            {/* Visual Graph Axis */}
            <div className="relative pt-6 pb-2">
              {/* Range bar background */}
              <div className="h-2.5 bg-gray-100 rounded-full relative overflow-visible">
                {/* Gradient spread bar representing the market min-max range */}
                <div className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-emerald-100 via-sky-200 to-indigo-200 rounded-full opacity-80" />

                {/* Avg Marker line and tag */}
                <div 
                  className="absolute -top-1.5 bottom-0 w-0.5 bg-gray-400 flex flex-col items-center"
                  style={{ left: `${avgPercent}%` }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-600 -mt-0.5" />
                  <div className="absolute top-4 whitespace-nowrap text-center">
                    <span className="text-[10px] font-semibold text-gray-400 block">Avg</span>
                    <span className="text-[11px] font-bold text-gray-700">₹{avg.toLocaleString()}</span>
                  </div>
                </div>

                {/* Current Project Marker (Only if currentPriceSqft is provided) */}
                {currentPriceSqft !== undefined && currentPercent !== null && (
                  <div 
                    className="absolute -top-3.5 bottom-0 w-1 flex flex-col items-center z-10"
                    style={{ left: `${currentPercent}%` }}
                  >
                    {/* Glowing pulse ring */}
                    <span className="absolute inline-flex h-3 w-3 rounded-full bg-blue-400 opacity-75 animate-ping -mt-0.5"></span>
                    <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-md relative" />
                    
                    <div className="absolute -top-7 whitespace-nowrap bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                      This Project (₹{currentPriceSqft.toLocaleString()}/sqft)
                    </div>
                  </div>
                )}
              </div>

              {/* End Ticks */}
              <div className="flex justify-between text-[11px] text-gray-400 font-medium mt-8 pt-2 border-t border-gray-50">
                <div className="text-left">
                  <span className="block text-[10px] text-gray-400 uppercase tracking-wider">Sector Min</span>
                  <span className="font-bold text-gray-800">₹{min.toLocaleString()}/sqft</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-gray-400 uppercase tracking-wider">Sector Max</span>
                  <span className="font-bold text-gray-800">₹{max.toLocaleString()}/sqft</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.status_breakdown && (
          <div className="bg-white border border-gray-100 shadow-sm rounded-3xl p-5">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-4">{data.project_count} {data.project_count === 1 ? 'Project' : 'Projects'} in Sector {sector}</p>
            <div className="space-y-3">
              {Object.entries(data.status_breakdown).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${statusColor(k)}`} />
                    <span className="text-[12px] text-gray-600 font-medium">{statusLabel(k)}</span>
                  </div>
                  <span className="text-[12px] font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded-md">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.bhk_distribution && (
          <div className="bg-white border border-gray-100 shadow-sm rounded-3xl p-5">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-4">Unit Mix Distribution</p>
            <div className="space-y-3">
              {Object.entries(data.bhk_distribution)
                .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                .map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-[12px] text-gray-600 font-medium w-12">{k}</span>
                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(v / Math.max(...Object.values(data.bhk_distribution))) * 100}%` }}
                      />
                    </div>
                    <span className="text-[12px] font-bold text-gray-900 w-4 text-right">{v}</span>
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
