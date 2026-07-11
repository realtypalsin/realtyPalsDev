'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart3, TrendingUp, Target, Users, AlertCircle, RefreshCw } from 'lucide-react'
import { API_BASE } from '@/lib/env'
import { adminAuthHeaders } from '@/lib/authedFetch'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

interface DashboardStats {
  totalChats: number
  totalQueries: number
  avgQueriesPerChat: number | string
  zeroResultSearches: number
  zeroResultSearchRate: string
  conversionRate: string
  avgClarifications: number | string
  topSectors: Array<{ sector: string; count: number }>
  topBuilders: Array<{ builder: string; count: number }>
}

interface QualityMetrics {
  totalSearches: number
  zeroResultSearches: number
  zeroResultRate: string
  searchWithResults: number
  searchWithoutResults: number
  avgClarifications: number
  avgResultsCount: number
}

interface UserMetrics {
  totalUsers: number
  repeatedVisitors: number
  totalConversions: number
  conversionFunnel: {
    chats: number
    searches: number
    clicks: number
    saves: number
    conversions: number
  }
}

export default function AnalyticsDashboard() {
  const [summary, setSummary] = useState<DashboardStats | null>(null)
  const [quality, setQuality] = useState<QualityMetrics | null>(null)
  const [users, setUsers] = useState<UserMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const headers = adminAuthHeaders()
      const [summaryRes, qualityRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/admin/analytics/summary`, { headers }),
        fetch(`${API_BASE}/admin/analytics/quality`, { headers }),
        fetch(`${API_BASE}/admin/analytics/users`, { headers }),
      ])

      const [summaryData, qualityData, usersData] = await Promise.all([
        summaryRes.json(),
        qualityRes.json(),
        usersRes.json(),
      ])

      setSummary(summaryData)
      setQuality(qualityData)
      setUsers(usersData)
    } catch (err) {
      console.error('Analytics error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const funnelData = users?.conversionFunnel
    ? [
        { name: 'Chats', value: users.conversionFunnel.chats },
        { name: 'Searches', value: users.conversionFunnel.searches },
        { name: 'Clicks', value: users.conversionFunnel.clicks },
        { name: 'Saves', value: users.conversionFunnel.saves },
        { name: 'Conversions', value: users.conversionFunnel.conversions },
      ]
    : []

  const resultDistribution = quality
    ? [
        { name: 'With Results', value: quality.searchWithResults, color: '#10B981' },
        { name: 'Without Results', value: quality.searchWithoutResults, color: '#EF4444' },
      ]
    : []

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-black text-slate-900 tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time insights into user searches, engagement, and AI performance</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white shadow-sm border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-xl transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Data
        </button>
      </div>

      {/* KPI Row */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 h-32 animate-pulse shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Chats */}
          <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-800 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Users size={18} strokeWidth={2} />
              </div>
            </div>
            <p className="text-sm text-slate-600 font-medium">Total Chats</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{summary.totalChats}</p>
          </div>

          {/* Total Searches */}
          <Link href="/admin/analytics/search" className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all group flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-800 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <TrendingUp size={18} strokeWidth={2} />
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-600 font-medium">Total Searches</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{summary.totalQueries}</p>
              <p className="text-xs text-slate-500 mt-2">{summary.avgQueriesPerChat} per chat</p>
            </div>
          </Link>

          {/* Zero-Result Searches */}
          <Link href="/admin/analytics/quality" className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all group flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-800 group-hover:bg-red-600 group-hover:text-white transition-colors">
                <AlertCircle size={18} strokeWidth={2} />
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-600 font-medium">Zero-Result Searches</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{summary.zeroResultSearches}</p>
              <p className="text-xs text-slate-500 mt-2">{summary.zeroResultSearchRate}</p>
            </div>
          </Link>

          {/* Conversion Rate */}
          <Link href="/admin/analytics/users" className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all group flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-800 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Target size={18} strokeWidth={2} />
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-600 font-medium">Conversion Rate</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{summary.conversionRate}</p>
            </div>
          </Link>
        </div>
      ) : null}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Sectors */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Top Searched Sectors</h2>
          {summary?.topSectors && summary.topSectors.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={summary.topSectors}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="sector" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-8">No data yet</p>
          )}
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Conversion Funnel</h2>
          {funnelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="value" fill="#10B981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-8">No data yet</p>
          )}
        </div>
      </div>

      {/* Quality & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Results Distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Search Results Distribution</h2>
          {resultDistribution.length > 0 && quality && (quality.searchWithResults || quality.searchWithoutResults) > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={resultDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {resultDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-8">No data yet</p>
          )}
        </div>

        {/* Quality Metrics */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Search Quality</h2>
          {quality ? (
            <>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-sm text-slate-600">Total Searches</span>
                <span className="font-semibold text-slate-900">{quality.totalSearches}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-sm text-slate-600">Avg Results Per Search</span>
                <span className="font-semibold text-slate-900">{quality.avgResultsCount.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-sm text-slate-600">Avg Clarifications</span>
                <span className="font-semibold text-slate-900">{quality.avgClarifications.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Zero-Result Rate</span>
                <span className="font-semibold text-slate-900">{quality.zeroResultRate}</span>
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-center py-8">Loading...</p>
          )}
        </div>
      </div>

      {/* Bottom Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/admin/analytics/search" className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-slate-900">Search Analytics</h3>
              <p className="text-xs text-slate-500 mt-1">Sector trends and builder demand</p>
            </div>
            <span className="text-slate-400 group-hover:text-slate-900 transition-colors">→</span>
          </div>
        </Link>

        <Link href="/admin/analytics/properties" className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-slate-900">Property Engagement</h3>
              <p className="text-xs text-slate-500 mt-1">Views, saves, and interactions</p>
            </div>
            <span className="text-slate-400 group-hover:text-slate-900 transition-colors">→</span>
          </div>
        </Link>

        <Link href="/admin/analytics/users" className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-slate-900">User Behavior</h3>
              <p className="text-xs text-slate-500 mt-1">Sessions, patterns, and conversions</p>
            </div>
            <span className="text-slate-400 group-hover:text-slate-900 transition-colors">→</span>
          </div>
        </Link>
      </div>
    </div>
  )
}
