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
      <div className="rounded-[20px] border border-gray-100 bg-gray-50/50 p-4 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Delivery Record</p>
        <p className="text-[12.5px] text-gray-500">No projects on record yet.</p>
        <a
          href="https://www.up-rera.in/Promoters"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 text-[11.5px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          Search UP-RERA &rarr;
        </a>
      </div>
    )
  }

  return (
    <div className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Delivery Record</p>
        {/* Pipeline ratio contextual tag */}
        {pipelineRatio !== null && (
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
            pipelineRatio >= 0.7
              ? 'bg-amber-50 text-amber-700 border border-amber-100/50'
              : pipelineRatio < 0.3 && delivered.length > 0
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50'
                : 'hidden'
          }`}>
            {pipelineRatio >= 0.7
              ? '⚠ High Ongoing'
              : '✓ Strong Delivery'}
          </div>
        )}
      </div>

      {/* Ratio bar */}
      {total > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-gray-700">{delivered.length} Delivered</span>
            <span className="text-[12px] font-medium text-gray-400">{ongoing.length} Ongoing</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-1000 ease-out"
              style={{ width: total > 0 ? `${(delivered.length / total) * 100}%` : '0%' }}
            />
          </div>
        </div>
      )}

      {/* Delivered project chips */}
      {delivered.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Completed</p>
          <div className="flex flex-wrap gap-1.5">
            {visibleDelivered.map((p) => (
              <span
                key={p}
                className="text-[11.5px] text-emerald-700 bg-emerald-50/50 border border-emerald-100/50 px-2.5 py-1 rounded-md font-medium"
              >
                {p}
              </span>
            ))}
            {!showAllDelivered && hiddenCount > 0 && (
              <button
                onClick={() => setShowAllDelivered(true)}
                className="text-[11.5px] text-gray-600 bg-gray-50 border border-gray-200/50 px-2.5 py-1 rounded-md font-medium hover:bg-gray-100 transition-colors"
              >
                +{hiddenCount} more
              </button>
            )}
          </div>
        </div>
      )}

      {/* Ongoing projects */}
      {ongoing.length > 0 && (
        <div className="pt-2 border-t border-gray-50">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Ongoing</p>
          <div className="flex flex-wrap gap-1.5">
            {ongoing.map((p) => (
              <span
                key={p}
                className="text-[11.5px] text-indigo-700 bg-indigo-50/50 border border-indigo-100/50 px-2.5 py-1 rounded-md font-medium"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[10.5px] text-gray-400 leading-relaxed pt-2">
        Builder-reported data. Verify completion on{' '}
        <a
          href="https://www.up-rera.in/Promoters"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-gray-500 hover:text-gray-700 underline decoration-gray-300 underline-offset-2 transition-colors"
        >
          UP-RERA
        </a>
        .
      </p>
    </div>
  )
}
