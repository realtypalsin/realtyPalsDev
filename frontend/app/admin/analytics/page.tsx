'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { 
  Users, 
  Search, 
  AlertCircle, 
  TrendingUp, 
  RotateCcw,
  BarChart3,
  Building2,
  PieChart as PieChartIcon,
  Layers,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { adminFetch } from '@/lib/adminFetch'
import { Skeleton } from '@/components/ui/skeleton'
import AnalyticsNav from '@/components/admin/AnalyticsNav'
import AdminInfoTooltip from '@/components/admin/AdminInfoTooltip'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell
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
  quality?: {
    totalProjects?: number
    withImage?: number
    withRera?: number
    completenessScore?: number
  }
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
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date())

  const isFetchingRef = useRef(false)

  const loadData = useCallback(async (isManual = false) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    if (isManual) setIsRefreshing(true)

    try {
      const [summaryRes, qualityRes, usersRes] = await Promise.all([
        adminFetch('/admin/analytics/summary'),
        adminFetch('/admin/analytics/quality'),
        adminFetch('/admin/analytics/users'),
      ])

      const [summaryData, qualityData, usersData] = await Promise.all([
        summaryRes.json(),
        qualityRes.json(),
        usersRes.json(),
      ])

      setSummary(summaryData)
      setQuality(qualityData)
      setUsers(usersData)
      setLastRefreshedAt(new Date())
    } catch (err) {
      console.error('Analytics load failed:', err)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
      isFetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

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
        { name: 'Zero Results', value: quality.searchWithoutResults, color: '#F43F5E' },
      ]
    : []

  return (
    <div className="space-y-6 pb-16 font-sans select-none max-w-6xl mx-auto py-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              Analytics Overview
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live DB Telemetry
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Real-time buyer engagement, search conversion funnel, and quality metrics
          </p>
        </div>

        {/* Refresh Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 hidden sm:inline-block">
            Updated {formatDistanceToNow(lastRefreshedAt, { addSuffix: true })}
          </span>

          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200/80 dark:border-zinc-800 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-[0.98] cursor-pointer disabled:opacity-60"
            title="Refresh analytics data"
          >
            <RotateCcw size={14} className={isRefreshing ? 'animate-spin text-blue-600' : 'text-zinc-500'} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <AnalyticsNav />

      {/* KPI Summary Row */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-28" />
            </div>
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Chats */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider inline-flex items-center">
                Total Chats
                <AdminInfoTooltip
                  title="Total Chats"
                  description="Total buyer conversation sessions started with the AI assistant."
                  whyItMatters="Measures buyer traffic and AI recommendation engagement."
                />
              </span>
              <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
                {summary.totalChats}
              </span>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                Active sessions
              </span>
            </div>
          </div>

          {/* Total Searches */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider inline-flex items-center">
                Total Searches
                <AdminInfoTooltip
                  title="Total Searches"
                  description="Count of specific property requirements searched inside chats."
                  whyItMatters="Shows how actively buyers explore and filter listings."
                />
              </span>
              <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center">
                <Search className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
                {summary.totalQueries}
              </span>
              <span className="text-xs font-semibold text-zinc-500">
                {summary.avgQueriesPerChat} per chat
              </span>
            </div>
          </div>

          {/* Zero-Result Searches */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider inline-flex items-center">
                Zero-Result
                <AdminInfoTooltip
                  title="Zero-Result Searches"
                  description="Queries where no properties matched the buyer's criteria."
                  whyItMatters="Highlights missing inventory or overly strict budget filters."
                />
              </span>
              <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-rose-500" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
                {summary.zeroResultSearches}
              </span>
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {summary.zeroResultSearchRate} rate
              </span>
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider inline-flex items-center">
                Conversion Rate
                <AdminInfoTooltip
                  title="Conversion Rate"
                  description="Percentage of chatters who submitted callback or visit leads."
                  whyItMatters="Measures lead generation efficiency from AI conversations."
                />
              </span>
              <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
                {summary.conversionRate}
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Callback leads
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Searched Sectors Chart */}
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              Top Searched Sectors (Real DB Data)
              <AdminInfoTooltip
                title="Top Searched Sectors"
                description="Most popular localities buyers ask about in Noida & Greater Noida."
                whyItMatters="Reveals exact locality buyer demand trends."
              />
            </span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Locality Demand
            </span>
          </div>

          {loading ? (
            <Skeleton className="w-full h-64 rounded-xl" />
          ) : summary?.topSectors && summary.topSectors.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.topSectors.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.5} />
                  <XAxis dataKey="sector" tick={{ fontSize: 11, fill: '#71717a' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717a' }} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
              <Building2 className="w-8 h-8 text-zinc-400 mb-2 opacity-50" />
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">No Sector Searches Yet</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Real search telemetry will populate here as users query the AI engine.</p>
            </div>
          )}
        </div>

        {/* Conversion Funnel Chart */}
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              Conversion Funnel Breakdown
              <AdminInfoTooltip
                title="Conversion Funnel Breakdown"
                description="Step-by-step buyer journey from chat start to lead submission."
                details={['Chats → Searches → Clicks → Saves → Lead Conversions']}
                whyItMatters="Visualizes where buyers drop off in the conversion process."
              />
            </span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Journey Flow
            </span>
          </div>

          {loading ? (
            <Skeleton className="w-full h-64 rounded-xl" />
          ) : funnelData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.5} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717a' }} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" fill="#10B981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
              <Layers className="w-8 h-8 text-zinc-400 mb-2 opacity-50" />
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">No Funnel Events Yet</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Telemetry tracks buyer discovery stages from initial prompt to lead capture.</p>
            </div>
          )}
        </div>
      </div>

      {/* Quality & Results Distribution Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Results Distribution Donut */}
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-purple-500" />
              Search Results Distribution
              <AdminInfoTooltip
                title="Search Results Distribution"
                description="Ratio of successful property matches vs zero-result queries."
                details={['Green: Found matching listings', 'Red: Zero matches found']}
                whyItMatters="Checks whether listing catalog matches buyer requests."
              />
            </span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Health Ratio
            </span>
          </div>

          {loading ? (
            <Skeleton className="w-full h-56 rounded-xl" />
          ) : quality && (quality.searchWithResults > 0 || quality.searchWithoutResults > 0) ? (
            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={resultDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {resultDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-center p-6 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
              <PieChartIcon className="w-8 h-8 text-zinc-400 mb-2 opacity-50" />
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">No Query Metrics Logged</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Ratio of successful property query hits vs zero-result edge cases.</p>
            </div>
          )}
        </div>

        {/* Search Quality & Ledger Table */}
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              Search Quality Diagnostics
              <AdminInfoTooltip
                title="Search Quality Diagnostics"
                description="Metrics measuring AI search quality and database completeness."
                details={['Avg Results Per Search', 'Avg Clarifications Asked', 'Database Completeness %']}
                whyItMatters="Ensures AI returns rich options without unnecessary questions."
              />
            </span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Telemetry Summary
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800">
              <span className="font-bold text-zinc-700 dark:text-zinc-300">Total Telemetry Queries</span>
              <span className="font-mono font-extrabold text-zinc-900 dark:text-white">{quality?.totalSearches || 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800">
              <span className="font-bold text-zinc-700 dark:text-zinc-300">Avg Results Per Search</span>
              <span className="font-mono font-extrabold text-zinc-900 dark:text-white">{quality?.avgResultsCount || 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800">
              <span className="font-bold text-zinc-700 dark:text-zinc-300">Avg Clarification Questions</span>
              <span className="font-mono font-extrabold text-zinc-900 dark:text-white">{quality?.avgClarifications || 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800">
              <span className="font-bold text-zinc-700 dark:text-zinc-300">Database Completeness Score</span>
              <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                {quality?.quality?.completenessScore ?? 100}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
