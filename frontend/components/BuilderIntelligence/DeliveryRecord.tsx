'use client'

import { useState } from 'react'

interface Props {
  deliveredProjects: string[]
  ongoingProjects: string[]
  deliveredUnits: number | null
  pipelineRatio: number | null
}

export default function DeliveryRecord({
  deliveredProjects,
  ongoingProjects,
  deliveredUnits,
  pipelineRatio,
}: Props) {
  const [showAllDelivered, setShowAllDelivered] = useState(false)

  const delivered = deliveredProjects.filter(Boolean)
  const ongoing = ongoingProjects.filter(Boolean)
  const total = delivered.length + ongoing.length

  const visibleDelivered = showAllDelivered ? delivered : delivered.slice(0, 5)
  const hiddenCount = delivered.length - 5

  if (total === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Delivery Record</p>
        <p className="text-[12px] text-gray-500">No projects on record yet.</p>
        <a
          href="https://www.up-rera.in/Promoters"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-blue-500 hover:text-blue-700 transition-colors"
        >
          Search UP-RERA →
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Delivery Record</p>

      {/* Ratio bar */}
      {total > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-gray-500">{delivered.length} delivered</span>
            <span className="text-[11px] text-gray-400">{ongoing.length} ongoing</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-400 transition-all"
              style={{ width: total > 0 ? `${(delivered.length / total) * 100}%` : '0%' }}
            />
          </div>
        </div>
      )}

      {/* Pipeline ratio contextual tag */}
      {pipelineRatio !== null && (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
          pipelineRatio >= 0.7
            ? 'bg-amber-50 text-amber-700 border border-amber-100'
            : pipelineRatio < 0.3 && delivered.length > 0
              ? 'bg-green-50 text-green-700 border border-green-100'
              : 'hidden'
        }`}>
          {pipelineRatio >= 0.7
            ? '⚠ Most projects still ongoing'
            : '✓ Strong delivery completion rate'}
        </div>
      )}

      {/* Delivered project chips */}
      {delivered.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Completed</p>
          <div className="flex flex-wrap gap-1.5">
            {visibleDelivered.map((p) => (
              <span
                key={p}
                className="text-[11px] text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full font-medium"
              >
                {p}
              </span>
            ))}
            {!showAllDelivered && hiddenCount > 0 && (
              <button
                onClick={() => setShowAllDelivered(true)}
                className="text-[11px] text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full font-medium hover:bg-blue-100 transition-colors"
              >
                +{hiddenCount} more
              </button>
            )}
          </div>
        </div>
      )}

      {/* Ongoing projects */}
      {ongoing.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Ongoing</p>
          <div className="flex flex-wrap gap-1.5">
            {ongoing.map((p) => (
              <span
                key={p}
                className="text-[11px] text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full font-medium"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-gray-400 leading-relaxed">
        Builder-reported data. Verify project completion on{' '}
        <a
          href="https://www.up-rera.in/Promoters"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-600 transition-colors"
        >
          UP-RERA
        </a>
        .
      </p>
    </div>
  )
}
