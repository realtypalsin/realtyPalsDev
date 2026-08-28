'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminFetch } from '@/lib/adminFetch'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'

interface SessionSummary {
  id: string
  identity: { kind: 'user' | 'guest'; id: string | null }
  openingQuestion: string | null
  turns: number
  phase: string
  startedAt: string
  lastActiveAt: string
  durationMs: number
  costUsd: number
  modelCalls: number
  tokens: { in: number; out: number }
  lead: { tier: string | null; at: string } | null
}

interface Turn {
  id: string
  role: 'user' | 'assistant'
  content: string
  at: string
  intent: Record<string, unknown> | null
  cardsShown: Array<{ id: string; name: string; sector: string; price: string | number | null }>
  flaggedCoverageGap: boolean
}

interface Detail {
  session: {
    id: string
    identity: { kind: string; id: string | null }
    summary_location: string | null
    summary_financial: string | null
    summary_timeline: string | null
  }
  turns: Turn[]
  lead: { name: string; phone: string; lead_tier: string | null; ai_summary: string | null } | null
  cost: { totalUsd: number; calls: Array<{ model: string; endpoint: string; usd: number }> }
}

const inr = (usd: number) => `₹${(usd * 88).toFixed(2)}`

export default function ConversationsPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    adminFetch('/api/v1/admin/beta/conversations?limit=100')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        if (!cancelled) setSessions(d.sessions ?? [])
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const open = useCallback((id: string) => {
    setSelected(id)
    setDetail(null)
    setDetailLoading(true)
    adminFetch(`/api/v1/admin/beta/conversations/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setDetail)
      .catch((e: Error) => setError(e.message))
      .finally(() => setDetailLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600 dark:text-red-400">Could not load conversations: {error}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 lg:flex-row lg:p-6">
      {/* List */}
      <div className="w-full shrink-0 lg:w-[26rem]">
        <h1 className="mb-1 text-lg font-semibold">Conversations</h1>
        <p className="mb-4 text-sm text-neutral-500">
          {sessions.length} sessions with at least one message. Tap one to read the transcript the
          buyer actually saw.
        </p>

        <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => open(s.id)}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                selected === s.id
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30'
                  : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium">
                  {s.openingQuestion || <em className="text-neutral-400">no question recorded</em>}
                </span>
                {s.lead && (
                  <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    {s.lead.tier ?? 'lead'}
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] text-neutral-500">
                <span>{s.turns} turns</span>
                <span>{inr(s.costUsd)}</span>
                <span>{s.identity.kind}</span>
                <span>{formatDistanceToNow(new Date(s.lastActiveAt), { addSuffix: true })}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Transcript */}
      <div className="min-w-0 flex-1">
        {!selected && (
          <p className="pt-10 text-center text-sm text-neutral-400">
            Select a conversation to read it.
          </p>
        )}

        {detailLoading && <Skeleton className="h-64 w-full" />}

        {detail && (
          <div className="space-y-4">
            <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
              <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-neutral-500">
                <span>{detail.turns.length} messages</span>
                <span>{inr(detail.cost.totalUsd)} total</span>
                <span>{detail.cost.calls.length} model calls</span>
              </div>
              {(detail.session.summary_financial || detail.session.summary_location) && (
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {[
                    detail.session.summary_location,
                    detail.session.summary_financial,
                    detail.session.summary_timeline,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
              {detail.lead && (
                <p className="mt-2 rounded bg-amber-50 p-2 text-sm dark:bg-amber-950/30">
                  <strong>Lead:</strong> {detail.lead.name} · {detail.lead.phone}
                  {detail.lead.ai_summary ? ` — ${detail.lead.ai_summary}` : ''}
                </p>
              )}
            </div>

            {detail.turns.map((t) => (
              <div
                key={t.id}
                className={`rounded-lg border p-3 ${
                  t.role === 'user'
                    ? 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900'
                    : 'border-teal-200 dark:border-teal-900'
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {t.role}
                  </span>
                  {t.flaggedCoverageGap && (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-700 dark:bg-red-950/40 dark:text-red-300">
                      coverage gap
                    </span>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{t.content}</p>

                {t.cardsShown.length > 0 && (
                  <div className="mt-2 border-t border-dashed border-neutral-300 pt-2 dark:border-neutral-700">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Cards shown
                    </p>
                    <ul className="space-y-0.5 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                      {t.cardsShown.map((c) => (
                        <li key={c.id}>
                          {c.name} · {c.sector} · {c.price ?? 'no price'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
