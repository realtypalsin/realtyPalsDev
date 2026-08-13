'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, TrendingDown } from 'lucide-react'

interface GhostPoolData {
  projectId: string
  totalMatched: number
  totalConverted: number
  ghostCount: number
  byReason: Record<string, number>
  examples: any[]
}

const REASON_LABELS: Record<string, string> = {
  possession: '📅 Possession Timeline',
  price: '💰 Price Too High',
  product_mix: '🏠 Wrong Configuration',
  location: '📍 Location Issues',
  legal: '⚠️ Legal Concerns',
  financing: '💳 Financing Concerns',
  other: '❓ Other',
}

export function GhostPoolDashboard({ projectId }: { projectId: string }) {
  const [data, setData] = useState<GhostPoolData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const res = await fetch(`/api/leads/projects/${projectId}/ghost-pool`)
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error('Failed to fetch ghost pool', err)
      } finally {
        setLoading(false)
      }
    }

    fetch()
  }, [projectId])

  if (loading) return <div className="p-6 text-center text-gray-500">Loading ghost pool analysis...</div>
  if (!data || data.ghostCount === 0) return <div className="p-6 text-center text-gray-500">No ghost buyers found</div>

  const conversionRate = data.totalMatched > 0 ? ((data.totalConverted / data.totalMatched) * 100).toFixed(1) : 0

  return (
    <div className="space-y-6 bg-white rounded-lg p-6">
      <div className="flex items-start gap-3 p-4 bg-red-50 rounded border border-red-200">
        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-red-900">{data.ghostCount} Buyers Didn't Convert</p>
          <p className="text-sm text-red-800">
            Out of {data.totalMatched} who showed interest, only {data.totalConverted} ({conversionRate}%) became leads
          </p>
        </div>
      </div>

      {/* Rejection Reasons */}
      <div>
        <h3 className="font-semibold mb-4">Why They Left</h3>
        <div className="space-y-2">
          {Object.entries(data.byReason).map(([reason, count]) => {
            const pct = ((count / data.ghostCount) * 100).toFixed(0)
            return (
              <div key={reason} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{REASON_LABELS[reason] || reason}</span>
                    <span className="text-xs text-gray-600">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Action Items */}
      <div className="p-4 bg-blue-50 rounded border border-blue-200">
        <p className="font-semibold text-blue-900 mb-2">How to Re-Engage:</p>
        <ul className="space-y-1 text-sm text-blue-800">
          {data.byReason['possession'] && (
            <li>✓ Show construction milestone proof + updated possession date</li>
          )}
          {data.byReason['price'] && (
            <li>✓ Highlight flexible payment plans or launch a limited-time offer</li>
          )}
          {data.byReason['product_mix'] && (
            <li>✓ Notify them if you launch units in their preferred BHK</li>
          )}
          {data.byReason['location'] && (
            <li>✓ Provide commute data & nearby infrastructure maps</li>
          )}
          {data.byReason['legal'] && (
            <li>✓ Share RERA registration, clearances, and dispute resolution status</li>
          )}
          {data.byReason['financing'] && (
            <li>✓ Send pre-approval links or builder-assisted finance schemes</li>
          )}
        </ul>
      </div>
    </div>
  )
}
