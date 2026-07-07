'use client'

import { useEffect, useState } from 'react'
import { Eye, MessageSquare, Users, TrendingUp } from 'lucide-react'

interface DashboardStats {
  total_projects: number
  total_leads: number
  news_published: number
  profile_views: number
  lead_conversion_rate: number
  average_response_time_hours: number
}

export default function BuilderDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/builder/dashboard/stats')
        if (res.ok) {
          setStats(await res.json())
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const StatCard = ({ icon: Icon, label, value, trend }: any) => (
    <div className="bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
          <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
            <TrendingUp className="w-4 h-4" />
            {trend}%
          </div>
        )}
      </div>
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '—' : value}</p>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Welcome back! Here&apos;s your builder performance overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Eye}
          label="Profile Views"
          value={stats?.profile_views || 0}
          trend={12}
        />
        <StatCard
          icon={Users}
          label="Total Leads"
          value={stats?.total_leads || 0}
          trend={8}
        />
        <StatCard
          icon={MessageSquare}
          label="News Published"
          value={stats?.news_published || 0}
        />
        <StatCard
          icon={TrendingUp}
          label="Conversion Rate"
          value={`${stats?.lead_conversion_rate || 0}%`}
          trend={3}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">
            + Post News
          </button>
          <button className="px-4 py-3 border dark:border-slate-700 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition">
            View All Leads
          </button>
          <button className="px-4 py-3 border dark:border-slate-700 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition">
            Update Theme
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Leads</h2>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between p-4 border dark:border-slate-700 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Lead #{1000 + i}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">2 hours ago</p>
              </div>
              <span className="text-sm font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded">
                New
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
