'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, TrendingUp, Target } from 'lucide-react'

interface DemandData {
  projectId: string
  projectName: string
  totalSearchesMatched: number
  avgBudgetMin: number | null
  avgBudgetMax: number | null
  topBhkDemand: Array<{ bhk: number; count: number; pct: number }>
  productMixDemand: Array<{ type: string; demand: number; pct: number }>
  winRate: number
  unansweredQuestions: Array<{ question: string; frequency: number }>
  kAnonymityMet: boolean
  sampleSize: number
}

export function DemandIntelligence({ projectId }: { projectId: string }) {
  const [data, setData] = useState<DemandData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const res = await fetch(`/api/leads/projects/${projectId}/demand`)
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error('Failed to fetch demand intelligence', err)
      } finally {
        setLoading(false)
      }
    }

    fetch()
  }, [projectId])

  if (loading) return <div className="p-6 text-center text-gray-500">Loading demand analysis...</div>
  if (!data) return <div className="p-6 text-center text-gray-500">No demand data available</div>

  if (!data.kAnonymityMet) {
    return (
      <div className="p-6 bg-gray-50 rounded border border-gray-200">
        <p className="text-gray-600 text-center">
          Insufficient data for analysis (need {10} searches, have {data.sampleSize})
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 bg-white rounded-lg p-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 rounded border border-blue-200">
          <p className="text-xs text-gray-600">Searches Matched</p>
          <p className="text-3xl font-bold text-blue-600">{data.totalSearchesMatched}</p>
          <p className="text-xs text-gray-600 mt-1">people interested</p>
        </div>
        <div className="p-4 bg-green-50 rounded border border-green-200">
          <p className="text-xs text-gray-600">Conversion Rate</p>
          <p className="text-3xl font-bold text-green-600">{data.winRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-600 mt-1">became leads</p>
        </div>
        <div className="p-4 bg-purple-50 rounded border border-purple-200">
          <p className="text-xs text-gray-600">Avg Budget Range</p>
          <p className="text-lg font-bold text-purple-600">
            {data.avgBudgetMin?.toFixed(1) || '—'} – {data.avgBudgetMax?.toFixed(1) || '—'} cr
          </p>
        </div>
      </div>

      {/* Top BHK Demand */}
      <div>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5" />
          BHK Demand Profile
        </h3>
        <div className="space-y-2">
          {data.topBhkDemand.map(({ bhk, count, pct }) => (
            <div key={bhk}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">{bhk} BHK</span>
                <span className="text-xs text-gray-600">
                  {count} searches ({pct.toFixed(0)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Unanswered Questions */}
      <div>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Top Questions Your Listing Doesn't Answer
        </h3>
        <ol className="space-y-2">
          {data.unansweredQuestions.map(({ question, frequency }, i) => (
            <li key={i} className="text-sm p-3 bg-gray-50 rounded border border-gray-200">
              <span className="font-semibold">{i + 1}.</span> {question}
              <span className="text-xs text-gray-500 ml-2">({frequency} searches)</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Recommendations */}
      <div className="p-4 bg-amber-50 rounded border border-amber-200">
        <p className="font-semibold text-amber-900 mb-2">Recommendations:</p>
        <ul className="space-y-1 text-sm text-amber-800">
          <li>✓ Update your project page with answers to the top 3 unanswered questions</li>
          <li>✓ Focus marketing on {data.topBhkDemand[0]?.bhk || '3'} BHK units (highest demand)</li>
          <li>✓ Your {((data.winRate / 100) * 100).toFixed(0)}% conversion rate suggests messaging/positioning needs work</li>
        </ul>
      </div>
    </div>
  )
}
