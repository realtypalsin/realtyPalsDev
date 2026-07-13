'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import InfoTooltip from '@/components/InfoTooltip'
import AnalyticsNav from '@/components/admin/AnalyticsNav'
import { API_BASE } from '@/lib/env'
import { adminAuthHeaders } from '@/lib/authedFetch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell
} from 'recharts'

const PALETTE = ['#002663', '#00509E', '#0077C8', '#60A3D9', '#9ED3F2']

interface UserMetrics {
  totalUsers: number
  repeatedVisitors: number
  totalConversions: number
  avgSessionDuration: number
  avgQueriesPerUser: number
  conversionFunnel: {
    chats: number
    searches: number
    clicks: number
    saves: number
    conversions: number
  }
  mostActiveSectors: Array<{ sector: string; searches: number }>
}

export default function UsersAnalytics() {
  const [data, setData] = useState<UserMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/admin/analytics/users`, { headers: adminAuthHeaders() })
      const users = await res.json()
      setData(users)
    } catch (err) {
      console.error('Users analytics error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const funnelData = data?.conversionFunnel
    ? [
        { name: 'Chats', value: data.conversionFunnel.chats },
        { name: 'Searches', value: data.conversionFunnel.searches },
        { name: 'Clicks', value: data.conversionFunnel.clicks },
        { name: 'Saves', value: data.conversionFunnel.saves },
        { name: 'Conversions', value: data.conversionFunnel.conversions },
      ]
    : []

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/analytics" className="text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-serif font-black text-slate-900 tracking-tight">User Behavior</h1>
            <p className="text-sm text-slate-500 mt-1">Sessions, patterns, engagement, and conversions</p>
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

      {/* KPI Row */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 h-[104px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col justify-center gap-3">
              <Skeleton className="h-4 w-1/2 rounded" />
              <Skeleton className="h-7 w-1/3 rounded" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100">
            <p className="text-sm text-slate-600 font-medium">Total Users</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{data.totalUsers}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100">
            <p className="text-sm text-slate-600 font-medium">Repeat Visitors</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{data.repeatedVisitors}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100">
            <p className="text-sm text-slate-600 font-medium">Avg Searches/User</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{(data.avgQueriesPerUser || 0).toFixed(1)}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100">
            <p className="text-sm text-slate-600 font-medium">Total Conversions</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{data.totalConversions}</p>
          </div>
        </div>
      ) : null}

      {/* Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Conversion Funnel
            <InfoTooltip text="Step-by-step breakdown of how users progress from starting a chat to finalizing a lead." />
          </h2>
          {loading ? (
            <Skeleton className="w-full h-[300px] rounded-xl" />
          ) : funnelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="value" fill="#00509E" radius={[8, 8, 0, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-8">No data yet</p>
          )}
        </div>

        {/* Top Sectors */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Most Searched Sectors
            <InfoTooltip text="Identifies which localities are retaining the highest engagement from returning users." />
          </h2>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : data?.mostActiveSectors && data.mostActiveSectors.length > 0 ? (
            <div className="space-y-2">
              {data.mostActiveSectors.map((item) => (
                <div key={item.sector} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-900">{item.sector}</span>
                  <span className="text-xs font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-lg">{item.searches}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">No sector searches yet</p>
          )}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Funnel Details
          <InfoTooltip text="Detailed numeric breakdown and conversion percentages for each step of the user journey." />
        </h2>
        {data?.conversionFunnel ? (
          <div className="space-y-3">
            {funnelData.map((item, idx) => {
              const percentage = data.conversionFunnel.chats > 0
                ? ((item.value / data.conversionFunnel.chats) * 100).toFixed(1)
                : '0'
              return (
                <div key={item.name}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-slate-900">{item.name}</span>
                    <span className="text-sm text-slate-600">{item.value} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: percentage + '%' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">No funnel data yet</p>
        )}
      </div>
    </div>
  )
}
