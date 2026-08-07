'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Building2, Users, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw,
  ImageOff, ShieldOff, Terminal, Plus
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import UniversalLoader from '@/components/ui/universal-loader'
import { API_BASE } from '@/lib/env'
import { adminFetch } from '@/lib/adminFetch'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

interface Stats {
  total: number
  ready: number
  under_construction: number
  new_launch: number
  no_image: number
  no_rera: number
  builders: number
  topBuilders: { name: string, projects: number }[]
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  async function load() {
    setLoading(true)
    const res = await adminFetch('/admin/projects')
    const data = await res.json()
    const projects = data.projects ?? []

    const topBuilders = Object.entries(
      projects.reduce((acc: Record<string, number>, p: any) => {
        if (p.builder?.name) acc[p.builder.name] = (acc[p.builder.name] ?? 0) + 1
        return acc
      }, {})
    )
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
    })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const pieData = stats ? [
    { name: 'Ready', value: stats.ready, color: '#10B981' }, 
    { name: 'Under Const.', value: stats.under_construction, color: '#F59E0B' }, 
    { name: 'New Launch', value: stats.new_launch, color: '#3B82F6' }, 
  ] : []

  return (
    <div className="max-w-[1200px] mx-auto space-y-3xl pb-3xl">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-lg border-b border-border">
        <div>
          <h1 className="text-3xl font-serif font-black text-text-primary tracking-tight">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-md">Overview, metrics, and actionable alerts.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-sm font-medium text-text-secondary bg-surface border border-border shadow-xs hover:bg-surface-2 hover:shadow-sm hover:border-border-heavy px-lg py-md rounded-md transition-all duration-fast ease-out active:scale-[0.98] disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-text-muted' : 'text-text-secondary'} />
          Refresh
        </button>
      </div>

      {/* KPI Row */}
      {loading ? (
        <UniversalLoader variant="skeleton-list" rows={8} />
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg">
          {/* Total Projects */}
          <Link href="/admin/projects" className="bg-surface rounded-lg p-lg shadow-xs border border-border hover:border-border-heavy hover:shadow-sm transition-all duration-fast ease-out active:scale-[0.98] group flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total Properties</p>
              <Building2 size={16} className="text-text-muted group-hover:text-text-primary transition-colors" />
            </div>
            <div className="mt-lg">
              <h3 className="text-3xl font-black text-text-primary tracking-tighter leading-none">{stats.total}</h3>
            </div>
          </Link>

          {/* Total Builders */}
          <Link href="/admin/builders" className="bg-surface rounded-lg p-lg shadow-xs border border-border hover:border-border-heavy hover:shadow-sm transition-all duration-fast ease-out active:scale-[0.98] group flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Partner Builders</p>
              <Users size={16} className="text-accent group-hover:text-primary transition-colors" />
            </div>
            <div className="mt-lg">
              <h3 className="text-3xl font-black text-text-primary tracking-tighter leading-none">{stats.builders}</h3>
            </div>
          </Link>

          {/* Ready to Move */}
          <div className="bg-surface rounded-lg p-lg shadow-xs border border-border flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Ready to Move</p>
              <CheckCircle2 size={16} className="text-success" />
            </div>
            <div className="mt-lg">
              <h3 className="text-3xl font-black text-text-primary tracking-tighter leading-none">{stats.ready}</h3>
            </div>
          </div>

          {/* Data Alerts */}
          <Link href="/admin/projects" className={`bg-surface rounded-lg p-lg shadow-xs border transition-all duration-fast ease-out active:scale-[0.98] group flex flex-col justify-between ${stats.no_image > 0 || stats.no_rera > 0 ? 'border-danger/30 hover:border-danger/50 hover:shadow-sm' : 'border-border hover:border-border-heavy hover:shadow-sm'}`}>
            <div className="flex justify-between items-start">
               <p className={`text-xs font-semibold uppercase tracking-wider ${stats.no_image > 0 || stats.no_rera > 0 ? 'text-danger' : 'text-text-muted'}`}>Data Alerts</p>
               <AlertTriangle size={16} className={stats.no_image > 0 || stats.no_rera > 0 ? 'text-danger' : 'text-text-muted'} />
            </div>
            <div className="mt-lg">
              <h3 className={`text-3xl font-black tracking-tighter leading-none ${stats.no_image > 0 || stats.no_rera > 0 ? 'text-danger' : 'text-text-primary'}`}>
                {stats.no_image + stats.no_rera}
              </h3>
            </div>
          </Link>
        </div>
      ) : null}

      {/* Middle Row: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">

        {/* Bar Chart: Top Builders */}
        <div className="lg:col-span-2 bg-surface rounded-lg p-lg md:p-2xl shadow-xs border border-border relative overflow-hidden">
          <div className="flex items-center justify-between mb-2xl">
            <div>
              <h2 className="text-lg font-semibold text-text-primary tracking-tight">Top Builders</h2>
              <p className="text-sm text-text-secondary mt-md">Number of projects per builder in database.</p>
            </div>
          </div>
          <div className="h-[280px] w-full">
            {stats && mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topBuilders} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(59, 130, 246, 0.06)', radius: 6 }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-zinc-900 border border-zinc-800 text-white px-3.5 py-2 rounded-xl shadow-xl z-50">
                            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">{label}</p>
                            <p className="text-sm font-black text-white flex items-center gap-1.5 leading-none">
                              <span>{payload[0].value}</span>
                              <span className="text-xs font-semibold text-zinc-400">projects</span>
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="projects" fill="hsl(220, 78%, 56%)" radius={[4, 4, 4, 4]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full pb-8">
                <Skeleton className="w-full h-full rounded-xl bg-zinc-100" />
              </div>
            )}
          </div>
        </div>

        {/* Donut Chart: Project Status */}
        <div className="bg-surface rounded-lg p-lg md:p-2xl shadow-xs border border-border flex flex-col relative">
          <h2 className="text-lg font-semibold text-text-primary tracking-tight">Inventory Distribution</h2>
          <p className="text-sm text-text-secondary mt-md mb-2xl">Properties by construction status.</p>
          
          <div className="flex-1 min-h-[220px] relative flex flex-col items-center justify-center">
            {stats && mounted ? (
              <>
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none drop-shadow-sm">
                  <span className="text-4xl font-black text-text-primary tracking-tighter leading-none">{stats.total}</span>
                  <span className="text-xs font-bold text-text-muted uppercase tracking-widest mt-md">Total</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={4}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-zinc-900 border border-zinc-800 text-white px-3.5 py-2 rounded-xl shadow-xl flex items-center gap-2.5 z-50">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: data.color }} />
                              <div>
                                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">{data.name}</p>
                                <p className="text-sm font-black text-white leading-none mt-0.5">{data.value} <span className="text-xs font-semibold text-zinc-400">properties</span></p>
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
              <Skeleton className="w-48 h-48 rounded-full bg-zinc-100" />
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-6">
            {pieData.map(item => (
              <div key={item.name} className="flex items-center gap-2 px-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[12px] font-medium text-zinc-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Actions & Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">

        {/* Quick Actions */}
        <div className="bg-surface rounded-lg p-lg md:p-2xl shadow-xs border border-border">
          <h2 className="text-lg font-semibold text-text-primary mb-lg tracking-tight">Quick Actions</h2>
          <div className="space-y-md">
            <Link href="/admin/projects/new" className="flex items-center justify-between p-lg rounded-md border border-border hover:border-border-heavy hover:bg-surface-2 transition-all duration-fast group">
              <div className="flex items-center gap-lg">
                <div className="w-9 h-9 rounded-md bg-surface-2 flex items-center justify-center text-text-secondary group-hover:bg-surface-3 group-hover:shadow-xs group-hover:text-text-primary transition-all">
                  <Plus size={16} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-text-primary">Add New Project</h4>
                  <p className="text-xs text-text-secondary mt-0.5">Add a new property to the database</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-text-muted group-hover:translate-x-1 group-hover:text-text-primary transition-all" />
            </Link>
            
            {stats && stats.no_image > 0 && (
              <div className="flex items-center justify-between p-lg rounded-md bg-danger/5 border border-danger/20">
                <div className="flex items-center gap-lg">
                  <div className="w-9 h-9 rounded-md bg-surface shadow-xs flex items-center justify-center text-danger">
                    <ImageOff size={16} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-danger">{stats.no_image} Missing Images</h4>
                    <p className="text-xs text-danger/80 mt-0.5">Run `npm run db:seed-images`</p>
                  </div>
                </div>
              </div>
            )}

            {stats && stats.no_rera > 0 && (
              <div className="flex items-center justify-between p-lg rounded-md bg-warning/5 border border-warning/20">
                <div className="flex items-center gap-lg">
                  <div className="w-9 h-9 rounded-md bg-surface shadow-xs flex items-center justify-center text-warning">
                    <ShieldOff size={16} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-warning">{stats.no_rera} Missing RERA</h4>
                    <p className="text-xs text-warning/80 mt-0.5">Run `npm run db:enrich-ai`</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Command Reference */}
        <div className="bg-slate-900 rounded-lg p-lg shadow-sm border border-slate-800 flex flex-col relative overflow-hidden">
          <div className="flex items-center px-lg py-md border-b border-slate-800/50">
            <span className="flex items-center gap-md text-xs font-medium text-slate-400 uppercase tracking-widest">
              <Terminal size={14} /> Server Commands
            </span>
          </div>

          <div className="flex-1 p-lg font-mono text-sm leading-relaxed space-y-md bg-slate-900 overflow-x-auto text-slate-300 selection:bg-slate-700 selection:text-slate-100">
            {[
              { cmd: 'db:seed-images', desc: 'Upload REimages/ to Supabase' },
              { cmd: 'db:enrich-ai',   desc: 'AI fills missing data' },
              { cmd: 'db:fix-statuses',desc: 'Sync construction status' },
              { cmd: 'db:re-embed',    desc: 'Refresh AI search vectors' },
              { cmd: 'db:studio',      desc: 'Open Prisma Studio' },
            ].map(({ cmd, desc }) => (
              <div key={cmd} className="flex items-baseline gap-3 group whitespace-nowrap">
                <span className="text-zinc-600">~</span>
                <span className="text-zinc-100 hover:text-white transition-colors cursor-text">npm run {cmd}</span>
                <span className="text-zinc-600 hidden md:inline ml-auto text-[12px] opacity-0 hover:opacity-100 md:opacity-100 transition-opacity"># {desc}</span>
              </div>
            ))}
            <div className="flex items-baseline gap-3 mt-5">
              <span className="text-zinc-600">~</span>
              <div className="w-2 h-4 bg-zinc-100 animate-pulse translate-y-0.5" />
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
