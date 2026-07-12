'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
<<<<<<< HEAD
  Building2, Users, CheckCircle2, Clock, Zap,
  ImageOff, ShieldOff, ArrowRight, RefreshCw,
  TrendingUp,
} from 'lucide-react'
=======
  Building2, Users, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw,
  ImageOff, ShieldOff, Zap, Clock, Terminal, Plus
} from 'lucide-react'
import { API_BASE } from '@/lib/env'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172

interface Stats {
  total: number
  ready: number
  under_construction: number
  new_launch: number
  no_image: number
  no_rera: number
  builders: number
<<<<<<< HEAD
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
=======
  topBuilders: { name: string, projects: number }[]
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
<<<<<<< HEAD
    const res  = await fetch('/api/v1/admin/projects')
    const data = await res.json()
    const projects: Array<{ status: string; hero_image_url?: string | null; rera_number?: string | null; builder?: { id: string } }> = data.projects ?? []
    setStats({
      total:              projects.length,
      ready:              projects.filter((p) => p.status === 'ready_to_move').length,
      under_construction: projects.filter((p) => p.status === 'under_construction').length,
      new_launch:         projects.filter((p) => p.status === 'new_launch').length,
      no_image:           projects.filter((p) => !p.hero_image_url).length,
      no_rera:            projects.filter((p) => !p.rera_number).length,
      builders:           new Set(projects.map((p) => p.builder?.id)).size,
=======
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
    const res  = await fetch(`${API_BASE}/admin/projects`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    })
    const data = await res.json()
    const projects = data.projects ?? []
    const builderCounts: Record<string, number> = {}
    projects.forEach((p: any) => {
      if (p.builder?.name) {
        builderCounts[p.builder.name] = (builderCounts[p.builder.name] || 0) + 1
      }
    })
    
    const topBuilders = Object.entries(builderCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name: name.length > 15 ? name.substring(0, 15) + '...' : name, projects: count }))

    setStats({
      total:              projects.length,
      ready:              projects.filter((p: any) => p.status === 'ready_to_move').length,
      under_construction: projects.filter((p: any) => p.status === 'under_construction').length,
      new_launch:         projects.filter((p: any) => p.status === 'new_launch').length,
      no_image:           projects.filter((p: any) => !p.hero_image_url).length,
      no_rera:            projects.filter((p: any) => !p.rera_number).length,
      builders:           new Set(projects.map((p: any) => p.builder?.id)).size,
      topBuilders,
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
    })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

<<<<<<< HEAD
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
=======
  const pieData = stats ? [
    { name: 'Ready', value: stats.ready, color: '#10B981' }, // Emerald
    { name: 'Under Const.', value: stats.under_construction, color: '#F59E0B' }, // Amber
    { name: 'New Launch', value: stats.new_launch, color: '#3B82F6' }, // Blue
  ] : []

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-black text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Database health, metrics, and quick actions</p>
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
        </div>
        <button
          onClick={load}
          disabled={loading}
<<<<<<< HEAD
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
=======
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
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Projects */}
          <Link href="/admin/projects" className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all group flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 group-hover:bg-slate-800 group-hover:text-white transition-colors">
                <Building2 size={18} />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-[32px] font-black text-slate-900 leading-none">{stats.total}</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">Total Properties</p>
            </div>
          </Link>
          
          {/* Total Builders */}
          <Link href="/admin/builders" className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all group flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Users size={18} />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-[32px] font-black text-slate-900 leading-none">{stats.builders}</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">Partner Builders</p>
            </div>
          </Link>

          {/* Ready to Move */}
          <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-[32px] font-black text-slate-900 leading-none">{stats.ready}</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">Ready to Move</p>
            </div>
          </div>

          {/* Data Alerts */}
          <Link href="/admin/projects" className={`bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border flex flex-col justify-between transition-all group ${stats.no_image > 0 || stats.no_rera > 0 ? 'border-red-100 hover:shadow-[0_8px_24px_rgba(239,68,68,0.12)]' : 'border-gray-100'}`}>
            <div className="flex justify-between items-start">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${stats.no_image > 0 || stats.no_rera > 0 ? 'bg-red-50 text-red-600 group-hover:bg-red-500 group-hover:text-white' : 'bg-slate-50 text-slate-400'}`}>
                <AlertTriangle size={18} />
              </div>
            </div>
            <div className="mt-4">
              <h3 className={`text-[32px] font-black leading-none ${stats.no_image > 0 || stats.no_rera > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                {stats.no_image + stats.no_rera}
              </h3>
              <p className="text-sm font-medium text-slate-500 mt-1">Data Alerts</p>
            </div>
          </Link>
        </div>
      ) : null}

      {/* Middle Row: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bar Chart: Top Builders */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-[80px] -z-10 group-hover:bg-blue-100/50 transition-colors duration-700" />
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Top Builders</h2>
              <p className="text-sm text-slate-500">Number of projects per builder in database</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            {stats ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topBuilders} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }} />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(241,245,249,0.5)' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white/80 backdrop-blur-xl border border-white/20 p-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                            <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                            <p className="text-[20px] font-black text-blue-600 leading-none">{payload[0].value} <span className="text-[14px] font-semibold text-slate-400">Projects</span></p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="projects" fill="url(#blueGradient)" radius={[8, 8, 8, 8]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-end justify-around pb-8 px-4 gap-4">
                {[40, 70, 45, 90, 60].map((h, i) => (
                  <div key={i} className="w-full bg-slate-100 rounded-t-lg animate-pulse" style={{ height: `${h}%` }} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Donut Chart: Project Status */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/50 rounded-full blur-[80px] -z-10 group-hover:bg-emerald-100/50 transition-colors duration-700" />
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Properties by Status</h2>
          <p className="text-sm text-slate-500 mb-8">Current inventory distribution</p>
          
          <div className="flex-1 min-h-[250px] relative flex flex-col items-center justify-center">
            {stats ? (
              <>
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none drop-shadow-sm">
                  <span className="text-[40px] font-black text-slate-900 tracking-tighter leading-none">{stats.total}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Total</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.1" />
                      </filter>
                    </defs>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={100}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={6}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} filter="url(#shadow)" />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-white/80 backdrop-blur-xl border border-white/20 p-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: data.color }} />
                              <div>
                                <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">{data.name}</p>
                                <p className="text-[16px] font-bold text-slate-900 leading-none mt-0.5">{data.value}</p>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div className="w-52 h-52 rounded-full border-[16px] border-slate-100 animate-pulse" />
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            {pieData.map(item => (
              <div key={item.name} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                <span className="text-[13px] font-semibold text-slate-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Actions & Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Data Quality Actions */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/admin/projects/new" className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-700 group-hover:text-black">
                  <Plus size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Add New Project</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Add a new property to the database</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            {stats && stats.no_image > 0 && (
              <div className="flex items-center justify-between p-4 rounded-2xl bg-red-50/50 border border-red-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-red-500">
                    <ImageOff size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-red-900">{stats.no_image} Missing Images</h4>
                    <p className="text-xs text-red-700 mt-0.5">Run `npm run db:seed-images`</p>
                  </div>
                </div>
              </div>
            )}
            
            {stats && stats.no_rera > 0 && (
              <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-amber-500">
                    <ShieldOff size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-amber-900">{stats.no_rera} Missing RERA</h4>
                    <p className="text-xs text-amber-700 mt-0.5">Run `npm run db:enrich-ai`</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Terminal */}
        <div className="bg-[#1C1C1E] rounded-3xl p-2 shadow-xl border border-white/10 flex flex-col">
          <div className="flex items-center px-4 py-3 bg-[#2D2D2F]/50 rounded-t-[22px]">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
              <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
            </div>
            <div className="flex-1 flex justify-center">
              <span className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                <Terminal size={14} /> root@realtypals:~
              </span>
            </div>
          </div>
          
          <div className="flex-1 p-5 font-mono text-[13px] leading-relaxed space-y-3 bg-[#1C1C1E] rounded-b-[22px] overflow-x-auto text-zinc-300">
            {[
              { cmd: 'db:seed-images', desc: 'Upload REimages/ to Supabase' },
              { cmd: 'db:enrich-ai',   desc: 'AI fills missing data' },
              { cmd: 'db:fix-statuses',desc: 'Sync construction status' },
              { cmd: 'db:re-embed',    desc: 'Refresh AI search vectors' },
              { cmd: 'db:studio',      desc: 'Open Prisma Studio' },
            ].map(({ cmd, desc }) => (
              <div key={cmd} className="flex items-baseline gap-3 group whitespace-nowrap">
                <span className="text-[#32D74B]">➜</span>
                <span className="text-[#0A84FF]">npm run {cmd}</span>
                <span className="text-zinc-600 hidden md:inline ml-auto text-[12px]"># {desc}</span>
              </div>
            ))}
            <div className="flex items-baseline gap-3 mt-4">
              <span className="text-[#32D74B]">➜</span>
              <div className="w-2 h-4 bg-zinc-400 animate-pulse translate-y-0.5" />
            </div>
          </div>
        </div>
      </div>

>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
    </div>
  )
}
