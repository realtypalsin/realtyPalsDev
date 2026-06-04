'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Building2, Users, CheckCircle2, Clock, Zap,
  ImageOff, ShieldOff, ArrowRight, RefreshCw,
  TrendingUp,
} from 'lucide-react'

interface Stats {
  total: number
  ready: number
  under_construction: number
  new_launch: number
  no_image: number
  no_rera: number
  builders: number
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  href,
  warning,
}: {
  label: string
  value: number
  icon: typeof Building2
  iconBg: string
  href?: string
  warning?: boolean
}) {
  const inner = (
    <div className={`bg-white rounded-2xl border p-4 shadow-sm transition-all ${
      href ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : ''
    } ${warning && value > 0 ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon size={16} />
        </div>
        {href && value > 0 && <ArrowRight size={14} className="text-gray-300 mt-0.5" />}
      </div>
      <p className={`text-2xl font-black ${warning && value > 0 ? 'text-red-600' : 'text-gray-900'}`}>
        {value}
      </p>
      <p className="text-xs text-gray-400 mt-0.5 leading-tight">{label}</p>
    </div>
  )

  return href ? <Link href={href}>{inner}</Link> : inner
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res  = await fetch('/api/v1/admin/projects')
    const data = await res.json()
    const projects = data.projects ?? []
    setStats({
      total:              projects.length,
      ready:              projects.filter((p: any) => p.status === 'ready_to_move').length,
      under_construction: projects.filter((p: any) => p.status === 'under_construction').length,
      new_launch:         projects.filter((p: any) => p.status === 'new_launch').length,
      no_image:           projects.filter((p: any) => !p.hero_image_url).length,
      no_rera:            projects.filter((p: any) => !p.rera_number).length,
      builders:           new Set(projects.map((p: any) => p.builder?.id)).size,
    })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const quickActions = [
    { label: 'Add New Project',   href: '/admin/projects/new', desc: 'Add a property to the database',   icon: Building2 },
    { label: 'View All Projects', href: '/admin/projects',     desc: 'Browse and manage existing projects', icon: TrendingUp },
    { label: 'Manage Builders',   href: '/admin/builders',     desc: 'Add or edit builder profiles',      icon: Users },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Database health & quick actions</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-2 rounded-xl bg-white transition-colors disabled:opacity-40"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm h-24 animate-pulse">
              <div className="w-9 h-9 bg-gray-100 rounded-xl mb-3" />
              <div className="h-5 bg-gray-100 rounded w-10 mb-1" />
              <div className="h-3 bg-gray-100 rounded w-20" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Projects"       value={stats.total}              icon={Building2}    iconBg="bg-blue-50 text-blue-500"    href="/admin/projects" />
          <StatCard label="Ready to Move"        value={stats.ready}              icon={CheckCircle2} iconBg="bg-emerald-50 text-emerald-500" />
          <StatCard label="Under Construction"   value={stats.under_construction} icon={Clock}        iconBg="bg-amber-50 text-amber-500" />
          <StatCard label="New Launch"           value={stats.new_launch}         icon={Zap}          iconBg="bg-purple-50 text-purple-500" />
          <StatCard label="Missing Hero Image"   value={stats.no_image}           icon={ImageOff}     iconBg="bg-red-50 text-red-400"      href="/admin/projects" warning />
          <StatCard label="Missing RERA Number"  value={stats.no_rera}            icon={ShieldOff}    iconBg="bg-orange-50 text-orange-400" href="/admin/projects" warning />
          <StatCard label="Builders"             value={stats.builders}           icon={Users}        iconBg="bg-indigo-50 text-indigo-500" href="/admin/builders" />
        </div>
      ) : null}

      {/* Data quality alert */}
      {stats && (stats.no_image > 0 || stats.no_rera > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-2">Data quality issues detected</p>
          <ul className="space-y-1.5 text-xs text-amber-700">
            {stats.no_image > 0 && (
              <li className="flex items-start gap-2">
                <ImageOff size={12} className="mt-0.5 flex-shrink-0" />
                <span>
                  <strong>{stats.no_image}</strong> project(s) missing a hero image — run{' '}
                  <code className="bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded font-mono">npm run db:seed-images</code>{' '}
                  or upload manually in the project editor.
                </span>
              </li>
            )}
            {stats.no_rera > 0 && (
              <li className="flex items-start gap-2">
                <ShieldOff size={12} className="mt-0.5 flex-shrink-0" />
                <span>
                  <strong>{stats.no_rera}</strong> project(s) missing a RERA number — run{' '}
                  <code className="bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded font-mono">npm run db:enrich-ai</code>{' '}
                  or add manually.
                </span>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-start gap-3 bg-white rounded-2xl border border-gray-100 p-4 hover:border-blue-200 hover:shadow-md transition-all group"
            >
              <div className="w-8 h-8 bg-gray-50 group-hover:bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                <a.icon size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{a.label}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">{a.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Terminal reference */}
      <div className="bg-gray-900 rounded-2xl p-5">
        <p className="text-gray-500 font-semibold mb-3 text-[11px] uppercase tracking-wider">Terminal Commands</p>
        <div className="space-y-2.5 font-mono text-xs">
          {[
            { cmd: 'db:seed-images', desc: 'Upload REimages/ to Supabase + set hero URLs' },
            { cmd: 'db:enrich-ai',   desc: 'AI fills missing RERA, prices, descriptions' },
            { cmd: 'db:fix-statuses',desc: 'Sync ready/under-construction status in DB' },
            { cmd: 'db:re-embed',    desc: 'Refresh AI search vectors after bulk edits' },
            { cmd: 'db:studio',      desc: 'Visual DB editor — browse & edit rows' },
          ].map(({ cmd, desc }) => (
            <div key={cmd} className="flex items-baseline gap-3">
              <code className="text-blue-400 whitespace-nowrap">npm run {cmd}</code>
              <span className="text-gray-600 hidden sm:inline text-[10px]">— {desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
