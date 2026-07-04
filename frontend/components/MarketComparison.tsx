'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, BarChart3, Loader2, Building2 } from 'lucide-react'
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
    under_construction: 'bg-amber-400',
    ready_to_move:      'bg-green-400',
    new_launch:         'bg-blue-400',
  }
  return map[s] ?? 'bg-gray-400'
}

export default function MarketComparison({ sector, city = 'Noida' }: Props) {
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
      <div className="flex items-center gap-2 py-4">
        <Loader2 size={14} className="animate-spin text-gray-400" />
        <span className="text-xs text-gray-400">Loading market data...</span>
      </div>
    )
  }

  if (!data) return <p className="text-xs text-gray-400 py-2">No market data available for {sector}.</p>

  return (
    <div className="space-y-4">
      {/* Price comparison bar */}
      {data.avg_price_sqft && (
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={14} className="text-blue-500" />
            <span className="text-xs font-semibold text-gray-700">{sector} Sector Price Range</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>Min: ₹{data.min_price_sqft?.toLocaleString()}/sqft</span>
              <span>Max: ₹{data.max_price_sqft?.toLocaleString()}/sqft</span>
            </div>
            <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
              <div className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-green-300 via-blue-400 to-purple-400 rounded-full" />
              {/* Avg marker */}
              {data.min_price_sqft && data.max_price_sqft && (
                <>
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white"
                    style={{
                      left: `${((data.avg_price_sqft - data.min_price_sqft) / (data.max_price_sqft - data.min_price_sqft)) * 100}%`
                    }}
                  />
                </>
              )}
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-gray-500">Sector avg: <strong className="text-gray-700">₹{data.avg_price_sqft.toLocaleString()}/sqft</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Status breakdown */}
      <div className="grid grid-cols-2 gap-3">
        {data.status_breakdown && (
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[9px] text-gray-400 uppercase font-semibold mb-2">{data.project_count} Projects in Sector</p>
            <div className="space-y-1.5">
              {Object.entries(data.status_breakdown).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-sm ${statusColor(k)}`} />
                    <span className="text-[10px] text-gray-600">{statusLabel(k)}</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-700">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.bhk_distribution && (
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[9px] text-gray-400 uppercase font-semibold mb-2">Unit Mix</p>
            <div className="space-y-1.5">
              {Object.entries(data.bhk_distribution)
                .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                .map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-600">{k}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full"
                        style={{ width: `${(v / Math.max(...Object.values(data.bhk_distribution))) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 w-4 text-right">{v}</span>
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
