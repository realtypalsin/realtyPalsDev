'use client'

import type { ChatResponse } from '@/types/chat'

interface ResponseFormatterProps {
  response: ChatResponse
}

export function ResponseFormatter({ response }: ResponseFormatterProps) {
  if (!response) return null

  return (
    <div className="space-y-4 mt-4 text-sm">
      {/* Confidence Scores */}
      {response.confidence && (
        <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-3 space-y-2">
          <h4 className="font-semibold text-xs text-gray-600 dark:text-gray-400 uppercase">Confidence</h4>
          <div className="space-y-1.5">
            {Object.entries(response.confidence).map(([key, value]) => {
              if (key === 'overall') return null
              const label = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-20">{label}</span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-full rounded-full"
                      style={{ width: `${(value as number) || 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-10 text-right">{Math.round((value as number) || 0)}%</span>
                </div>
              )
            })}
            {response.confidence.overall !== undefined && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 w-20">Overall</span>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-full rounded-full"
                    style={{ width: `${Math.round(response.confidence.overall) || 0}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-10 text-right">{Math.round(response.confidence.overall) || 0}%</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data Freshness */}
      {response.data_freshness && Object.keys(response.data_freshness).length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <h4 className="font-semibold text-xs text-blue-900 dark:text-blue-300 uppercase mb-2">Data Freshness</h4>
          <div className="space-y-1">
            {Object.entries(response.data_freshness).map(([key, value]) => (
              <div key={key} className="text-xs text-blue-800 dark:text-blue-400">
                <span className="font-medium">{key}:</span> {value}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing Data Warnings */}
      {response.missing_data && response.missing_data.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <h4 className="font-semibold text-xs text-amber-900 dark:text-amber-300 uppercase mb-2">Incomplete Data</h4>
          <ul className="space-y-1 text-xs text-amber-800 dark:text-amber-400 list-disc list-inside">
            {response.missing_data.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Comparison Matrix */}
      {response.comparison && (
        <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 space-y-2">
          <h4 className="font-semibold text-xs text-purple-900 dark:text-purple-300 uppercase">Comparison Result</h4>
          {response.comparison.winner && (
            <div className="text-sm">
              <p className="text-purple-900 dark:text-purple-200 font-semibold">Winner: {response.comparison.winner}</p>
              {response.comparison.reason && (
                <p className="text-xs text-purple-700 dark:text-purple-400 mt-1">{response.comparison.reason}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
