'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, Users, MessageSquare, Eye } from 'lucide-react'

interface AnalyticsData {
  daily_views: Array<{ date: string; views: number }>
  lead_sources: Array<{ source: string; count: number }>
  conversion_funnel: {
    impressions: number
    clicks: number
    inquiries: number
    conversions: number
  }
  top_projects: Array<{
    project_name: string
    views: number
    leads: number
    conversion_rate: number
  }>
}

export default function BuilderAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('/api/builder/analytics')
        if (res.ok) {
          setAnalytics(await res.json())
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (loading) return <div className="text-center py-12">Loading analytics...</div>

  if (!analytics) return <div className="text-center py-12 text-gray-500">Failed to load analytics</div>

  const conversionRate = analytics.conversion_funnel.inquiries > 0
    ? ((analytics.conversion_funnel.conversions / analytics.conversion_funnel.inquiries) * 100).toFixed(1)
    : '0'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Monitor your builder profile performance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total Views</p>
            <Eye className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {analytics.daily_views.reduce((sum, d) => sum + d.views, 0)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total Inquiries</p>
            <MessageSquare className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {analytics.conversion_funnel.inquiries}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Conversions</p>
            <TrendingUp className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {analytics.conversion_funnel.conversions}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Conv. Rate</p>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{conversionRate}%</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Views Trend */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Profile Views (Last 30 days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.daily_views}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Sources */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Lead Sources</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.lead_sources}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="source" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Projects */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top Performing Projects</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Project</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Views</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Leads</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Conv. Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-700">
              {analytics.top_projects.map(p => (
                <tr key={p.project_name}>
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{p.project_name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.views}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.leads}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{(p.conversion_rate * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
