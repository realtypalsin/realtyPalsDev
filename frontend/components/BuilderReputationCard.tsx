'use client'

import { useEffect, useState } from 'react'
import { Shield, TrendingUp, AlertTriangle, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react'
import { API_BASE } from '@/lib/env'

interface ReputationSignal {
  type: 'positive' | 'negative' | 'neutral'
  category: string
  title: string
  source?: string
  snippet: string
}

interface ReputationReport {
  builder_name: string
  summary: string
  score: number
  score_label: string
  signals: ReputationSignal[]
  rera_status: string
  delivery_track: string
}

interface Props {
  builderName: string
  reraNumber?: string | null
}

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 80 ? '#22c55e' :
    score >= 65 ? '#3b82f6' :
    score >= 45 ? '#f59e0b' : '#ef4444'
  const r = 22
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <div className="relative flex items-center justify-center w-14 h-14">
      <svg width="56" height="56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle
          cx="28" cy="28" r={r} fill="none"
          stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>{score}</span>
    </div>
  )
}

export default function BuilderReputationCard({ builderName, reraNumber }: Props) {
  const [data, setData] = useState<ReputationReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!builderName) return
    setLoading(true)
    fetch(`${API_BASE}/builder-reputation?name=${encodeURIComponent(builderName)}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [builderName])

  if (!builderName) return (
    <div className="rounded-xl border border-gray-100 p-4 text-sm text-gray-400">
      Builder information not available
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl">
        <Loader2 size={16} className="animate-spin text-gray-400" />
        <span className="text-xs text-gray-400">Checking builder reputation...</span>
      </div>
    )
  }

  if (!data) return null

  const positiveSignals = data.signals.filter((s) => s.type === 'positive')
  const negativeSignals = data.signals.filter((s) => s.type === 'negative')

  const scoreBg =
    data.score >= 80 ? 'bg-green-50 border-green-100' :
    data.score >= 65 ? 'bg-blue-50 border-blue-100' :
    data.score >= 45 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'

  return (
    <div className={`border rounded-xl p-4 ${scoreBg}`}>
      <div className="flex items-center gap-3">
        <ScoreRing score={data.score} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">Reputation Score</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              data.score >= 80 ? 'bg-green-100 text-green-700' :
              data.score >= 65 ? 'bg-blue-100 text-blue-700' :
              data.score >= 45 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
            }`}>{data.score_label}</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{data.summary}</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="bg-white/70 rounded-lg p-2.5">
          <p className="text-[9px] text-gray-400 uppercase font-semibold mb-0.5">RERA Status</p>
          <div className="flex items-center gap-1">
            <Shield size={11} className={data.rera_status === 'Registered' ? 'text-green-500' : data.rera_status === 'Violations found' ? 'text-red-400' : 'text-gray-300'} />
            <span className="text-[11px] font-medium text-gray-700">{data.rera_status}</span>
          </div>
        </div>
        <div className="bg-white/70 rounded-lg p-2.5">
          <p className="text-[9px] text-gray-400 uppercase font-semibold mb-0.5">Delivery</p>
          <div className="flex items-center gap-1">
            <TrendingUp size={11} className={data.delivery_track === 'Generally on time' ? 'text-green-500' : data.delivery_track === 'Delays reported' ? 'text-red-400' : 'text-amber-400'} />
            <span className="text-[11px] font-medium text-gray-700">{data.delivery_track}</span>
          </div>
        </div>
      </div>

      {/* RERA number display */}
      {reraNumber && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl mt-3">
          <span className="text-[10px] font-semibold text-blue-400 uppercase">RERA Registered</span>
          <p className="text-[12px] font-bold text-blue-700 font-mono">{reraNumber}</p>
        </div>
      )}

      {/* Signals toggle */}
      {data.signals.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-3 text-[11px] text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
        >
          {expanded ? '▲' : '▼'} {expanded ? 'Hide' : 'Show'} {data.signals.length} signals
        </button>
      )}

      {expanded && (
        <div className="mt-3 space-y-2">
          {data.signals.slice(0, 6).map((s, i) => (
            <div key={i} className={`flex gap-2 p-2.5 rounded-lg ${s.type === 'positive' ? 'bg-green-50' : 'bg-red-50'}`}>
              {s.type === 'positive'
                ? <CheckCircle2 size={13} className="text-green-500 flex-shrink-0 mt-0.5" />
                : <AlertTriangle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />}
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-gray-800 truncate">{s.title}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{s.snippet}</p>
                {s.source && (
                  <a href={s.source} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-400 flex items-center gap-0.5 mt-0.5 hover:underline">
                    Source <ExternalLink size={8} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
