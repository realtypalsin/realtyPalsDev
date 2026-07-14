'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Building2, Users, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw,
  ImageOff, ShieldOff, Terminal, Plus
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { API_BASE } from '@/lib/env'
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

  async function load() {
    setLoading(true)
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
    <div className="max-w-[1200px] mx-auto space-y-10 pb-12">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-6 border-b border-zinc-200/50">
        <div>
          <h1 className="text-3xl font-serif font-black text-zinc-950 tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1.5">Overview, metrics, and actionable alerts.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-sm font-medium text-zinc-700 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0px_0px_1px_rgba(0,0,0,0.06)] hover:bg-zinc-50 hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_0px_0px_1px_rgba(0,0,0,0.08)] px-4 py-2 rounded-lg transition-all duration-300 ease-out active:scale-[0.98] disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-zinc-400' : 'text-zinc-500'} />
          Refresh
        </button>
      </div>

      {/* KPI Row */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="bg-white rounded-xl p-5 h-[120px] shadow-[0_1px_2px_rgba(0,0,0,0.02)] border border-zinc-200/50" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Projects */}
          <Link href="/admin/projects" className="bg-white rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] border border-zinc-200/60 hover:border-zinc-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all duration-300 ease-out active:scale-[0.98] group flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <p className="text-[13px] font-semibold text-zinc-500 uppercase tracking-wider">Total Properties</p>
              <Building2 size={16} className="text-zinc-400 group-hover:text-zinc-900 transition-colors" />
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-zinc-950 tracking-tighter leading-none">{stats.total}</h3>
            </div>
          </Link>
          
          {/* Total Builders */}
          <Link href="/admin/builders" className="bg-white rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] border border-zinc-200/60 hover:border-zinc-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all duration-300 ease-out active:scale-[0.98] group flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <p className="text-[13px] font-semibold text-zinc-500 uppercase tracking-wider">Partner Builders</p>
              <Users size={16} className="text-indigo-400 group-hover:text-indigo-600 transition-colors" />
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-zinc-950 tracking-tighter leading-none">{stats.builders}</h3>
            </div>
          </Link>

          {/* Ready to Move */}
          <div className="bg-white rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] border border-zinc-200/60 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <p className="text-[13px] font-semibold text-zinc-500 uppercase tracking-wider">Ready to Move</p>
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-zinc-950 tracking-tighter leading-none">{stats.ready}</h3>
            </div>
          </div>

          {/* Data Alerts */}
          <Link href="/admin/projects" className={`bg-white rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] border transition-all duration-300 ease-out active:scale-[0.98] group flex flex-col justify-between ${stats.no_image > 0 || stats.no_rera > 0 ? 'border-red-200 hover:border-red-300 hover:shadow-[0_4px_12px_rgba(239,68,68,0.08)] bg-red-50/10' : 'border-zinc-200/60 hover:border-zinc-300'}`}>
            <div className="flex justify-between items-start">
               <p className={`text-[13px] font-semibold uppercase tracking-wider ${stats.no_image > 0 || stats.no_rera > 0 ? 'text-red-500' : 'text-zinc-500'}`}>Data Alerts</p>
               <AlertTriangle size={16} className={stats.no_image > 0 || stats.no_rera > 0 ? 'text-red-500' : 'text-zinc-400'} />
            </div>
            <div className="mt-4">
              <h3 className={`text-3xl font-black tracking-tighter leading-none ${stats.no_image > 0 || stats.no_rera > 0 ? 'text-red-600' : 'text-zinc-950'}`}>
                {stats.no_image + stats.no_rera}
              </h3>
            </div>
          </Link>
        </div>
      ) : null}

      {/* Middle Row: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bar Chart: Top Builders */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 md:p-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)] border border-zinc-200/60 relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950 tracking-tight">Top Builders</h2>
              <p className="text-sm text-zinc-500 mt-1">Number of projects per builder in database.</p>
            </div>
          </div>
          <div className="h-[280px] w-full">
            {stats ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topBuilders} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12, fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12, fontWeight: 500 }} />
                  <RechartsTooltip 
                    cursor={{ fill: '#f4f4f5', opacity: 0.5 }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white/90 backdrop-blur-md border border-zinc-200 p-3 rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                            <p className="text-[12px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">{label}</p>
                            <p className="text-lg font-bold text-zinc-950 leading-none">{payload[0].value} <span className="text-[13px] font-medium text-zinc-500">projects</span></p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="projects" fill="#18181b" radius={[4, 4, 4, 4]} maxBarSize={48} />
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
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)] border border-zinc-200/60 flex flex-col relative">
          <h2 className="text-lg font-semibold text-zinc-950 tracking-tight">Inventory Distribution</h2>
          <p className="text-sm text-zinc-500 mt-1 mb-8">Properties by construction status.</p>
          
          <div className="flex-1 min-h-[220px] relative flex flex-col items-center justify-center">
            {stats ? (
              <>
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none drop-shadow-sm">
                  <span className="text-4xl font-black text-zinc-950 tracking-tighter leading-none">{stats.total}</span>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Total</span>
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
                            <div className="bg-white/90 backdrop-blur-md border border-zinc-200 p-3 rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.08)] flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
                              <div>
                                <p className="text-[12px] font-semibold text-zinc-500 uppercase tracking-wider">{data.name}</p>
                                <p className="text-[15px] font-bold text-zinc-950 leading-none mt-1">{data.value}</p>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)] border border-zinc-200/60">
          <h2 className="text-lg font-semibold text-zinc-950 mb-6 tracking-tight">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/admin/projects/new" className="flex items-center justify-between p-4 rounded-xl border border-zinc-200/60 hover:border-zinc-300 hover:bg-zinc-50/50 transition-all duration-300 group">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600 group-hover:bg-white group-hover:shadow-sm group-hover:text-zinc-900 transition-all">
                  <Plus size={16} />
                </div>
                <div>
                  <h4 className="font-semibold text-[14px] text-zinc-900">Add New Project</h4>
                  <p className="text-[13px] text-zinc-500 mt-0.5">Add a new property to the database</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-zinc-400 group-hover:translate-x-1 group-hover:text-zinc-900 transition-all" />
            </Link>
            
            {stats && stats.no_image > 0 && (
              <div className="flex items-center justify-between p-4 rounded-xl bg-red-50/50 border border-red-100">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center justify-center text-red-500">
                    <ImageOff size={16} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[14px] text-red-900">{stats.no_image} Missing Images</h4>
                    <p className="text-[13px] text-red-700 mt-0.5">Run `npm run db:seed-images`</p>
                  </div>
                </div>
              </div>
            )}
            
            {stats && stats.no_rera > 0 && (
              <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50/40 border border-amber-200/60">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center justify-center text-amber-500">
                    <ShieldOff size={16} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[14px] text-amber-900">{stats.no_rera} Missing RERA</h4>
                    <p className="text-[13px] text-amber-700 mt-0.5">Run `npm run db:enrich-ai`</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Terminal (Vercel Style) */}
        <div className="bg-[#0a0a0a] rounded-2xl p-1 shadow-2xl border border-zinc-800 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="flex items-center px-4 py-3 border-b border-zinc-800/50">
            <div className="flex gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
            </div>
            <div className="flex-1 flex justify-center">
              <span className="flex items-center gap-2 text-[11px] font-medium text-zinc-500 uppercase tracking-widest">
                <Terminal size={12} /> Server Actions
              </span>
            </div>
          </div>
          
          <div className="flex-1 p-5 font-mono text-[13px] leading-relaxed space-y-3 bg-[#0a0a0a] overflow-x-auto text-zinc-400 selection:bg-zinc-800 selection:text-white">
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
