'use client'

import type { ChatResponse } from '@/types/chat'
import { AlertCircle } from 'lucide-react'

interface ResponseFormatterProps {
  response: ChatResponse
}

export function ResponseFormatter({ response }: ResponseFormatterProps) {
  return (
    <div className="space-y-4">
      {/* Main message */}
      <div className="text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
        {response.message}
      </div>

      {/* Confidence scores */}
      {response.confidence.overall > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>Overall confidence:</span>
              <span className={response.confidence.overall >= 80 ? 'text-green-600' : 'text-amber-600'}>
                {response.confidence.overall}%
              </span>
            </div>
            {response.data_freshness && Object.entries(response.data_freshness).map(([source, freshness]) => (
              <div key={source} className="flex justify-between text-xs text-gray-500">
                <span>{source}:</span>
                <span>{freshness}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing data warning */}
      {response.missing_data.length > 0 && (
        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex gap-2">
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            {response.missing_data.join('. ')}
          </div>
        </div>
      )}

      {/* Comparison matrix (if present) */}
      {response.comparison && <ComparisonMatrixRenderer comparison={response.comparison} />}
    </div>
  )
}

function ComparisonMatrixRenderer({ comparison }: { comparison: any }) {
  const { matrix, winner, reason } = comparison

  return (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="text-sm font-semibold mb-3 text-gray-900 dark:text-gray-100">
        Comparison (Ranked by your priorities)
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-2 font-medium">Rank</th>
              <th className="text-left py-2 px-2 font-medium">Plan</th>
              {matrix.dimensions.map((dim: any) => (
                <th key={dim.name} className="text-right py-2 px-2 font-medium text-xs">
                  {dim.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row: any, idx: number) => (
              <tr key={row.name} className="border-b border-gray-100 dark:border-gray-700">
                <td className="py-2 px-2">{idx + 1}{idx === 0 ? '✓' : ''}</td>
                <td className="py-2 px-2 font-medium">{row.name}</td>
                {row.values.map((val: any, i: number) => (
                  <td key={i} className="text-right py-2 px-2 text-xs">
                    {typeof val === 'number' && matrix.dimensions[i]?.format === 'currency'
                      ? `₹${(val / 100000).toFixed(1)}L`
                      : typeof val === 'number' && matrix.dimensions[i]?.format === 'percentage'
                        ? `${val}%`
                        : val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
        <strong>Why {winner}?</strong> {reason}
      </div>
    </div>
  )
}
