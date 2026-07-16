'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import InfoTooltip from '@/components/InfoTooltip'
import AnalyticsNav from '@/components/admin/AnalyticsNav'
import { Skeleton } from '@/components/ui/skeleton'
import { API_BASE } from '@/lib/env'
import { adminAuthHeaders } from '@/lib/authedFetch'

interface PropertyEngagement {
  projectId: string
  projectName: string
  views: number
  saves: number
  comparisons: number
  shares: number
  whatsappInquiries: number
}

export default function PropertiesAnalytics() {
  const [properties, setProperties] = useState<PropertyEngagement[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/admin/analytics/properties`, { headers: adminAuthHeaders() })
      const data = await res.json()
      setProperties(data.properties || [])
    } catch (err) {
      console.error('Properties analytics error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/analytics" className="text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-serif font-black text-slate-900 tracking-tight">Property Engagement</h1>
            <p className="text-sm text-slate-500 mt-1">Views, saves, comparisons, and interactions per project</p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white shadow-sm border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-xl transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Top Navigation Tabs */}
      <AnalyticsNav />

      {/* Engagement Table */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Top Performing Properties
          <InfoTooltip text="Ranks properties by total user interactions (views, saves, comparisons, shares, and WhatsApp inquiries)." />
        </h2>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded" />
            ))}
          </div>
        ) : properties.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-900">Project</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-900">Views</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-900">Saves</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-900">Comparisons</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-900">Shares</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-900">WhatsApp</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-900">Total</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((p, idx) => {
                  const total = p.views + p.saves + p.comparisons + p.shares + p.whatsappInquiries
                  return (
                    <tr key={p.projectId} className={idx % 2 === 0 ? 'bg-slate-50' : ''}>
                      <td className="py-3 px-4 font-medium text-slate-900">{p.projectName}</td>
                      <td className="text-right py-3 px-4 text-slate-600">{p.views}</td>
                      <td className="text-right py-3 px-4 text-slate-600">{p.saves}</td>
                      <td className="text-right py-3 px-4 text-slate-600">{p.comparisons}</td>
                      <td className="text-right py-3 px-4 text-slate-600">{p.shares}</td>
                      <td className="text-right py-3 px-4 text-slate-600">{p.whatsappInquiries}</td>
                      <td className="text-right py-3 px-4 font-semibold text-slate-900">{total}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">No property events yet - start using the chat to track engagement</p>
        )}
      </div>
    </div>
  )
}
