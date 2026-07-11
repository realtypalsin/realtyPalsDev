'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { API_BASE } from '@/lib/env'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts'

interface DashboardStats {
  totalQueries: number
  topSectors: Array<{ sector: string; count: number }>
  topBuilders: Array<{ builder: string; count: number }>
}

export default function SearchAnalytics() {
  const [data, setData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/admin/analytics/summary`, { credentials: 'include' })
      const summary = await res.json()
      setData(summary)
    } catch (err) {
      console.error('Analytics error:', err)
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
            <h1 className="text-3xl font-serif font-black text-slate-900 tracking-tight">Search Analytics</h1>
            <p className="text-sm text-slate-500 mt-1">Sector trends and builder demand</p>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Searches */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100">
          <p className="text-sm text-slate-600 font-medium">Total Searches</p>
          <p className="text-4xl font-bold text-slate-900 mt-2">{data?.totalQueries || 0}</p>
        </div>

        {/* Unique Sectors */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100">
          <p className="text-sm text-slate-600 font-medium">Sectors with Searches</p>
          <p className="text-4xl font-bold text-slate-900 mt-2">{data?.topSectors?.length || 0}</p>
        </div>
      </div>

      {/* Detailed Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Sectors */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Top 10 Searched Sectors</h2>
          {data?.topSectors && data.topSectors.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data.topSectors.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="sector" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-12">No data yet</p>
          )}
        </div>

        {/* Top Builders */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Top Searched Builders</h2>
          {data?.topBuilders && data.topBuilders.length > 0 ? (
            <div className="space-y-3">
              {data.topBuilders.slice(0, 10).map((builder) => (
                <div key={builder.builder} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-900">{builder.builder}</span>
                  <span className="text-xs font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-lg">{builder.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-12">No builder searches yet</p>
          )}
        </div>
      </div>

      {/* All Sectors Table */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">All Sectors (Detailed)</h2>
        {data?.topSectors && data.topSectors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-900">Sector</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-900">Searches</th>
                </tr>
              </thead>
              <tbody>
                {data.topSectors.map((item, idx) => (
                  <tr key={item.sector} className={idx % 2 === 0 ? 'bg-slate-50' : ''}>
                    <td className="py-3 px-4 text-slate-900">{item.sector}</td>
                    <td className="text-right py-3 px-4 font-semibold text-slate-600">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">No data yet</p>
        )}
      </div>
    </div>
  )
}
