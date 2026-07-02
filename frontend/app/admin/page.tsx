'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Building2, Users, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw,
  ImageOff, ShieldOff, Zap, Clock, Terminal, Plus
} from 'lucide-react'
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
    const res  = await fetch(`${API_BASE}/admin/projects`, { credentials: 'include' })
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
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Top Builders</h2>
              <p className="text-sm text-slate-500">Number of projects per builder in database</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            {stats ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topBuilders} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                    itemStyle={{ fontSize: '13px', fontWeight: 600, color: '#3B82F6' }}
                    labelStyle={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}
                    cursor={{ fill: '#F1F5F9' }}
                  />
                  <Bar dataKey="projects" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-slate-50 animate-pulse rounded-xl" />
            )}
          </div>
        </div>

        {/* Donut Chart: Project Status */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col">
          <h2 className="text-lg font-bold text-slate-900">Properties by Status</h2>
          <p className="text-sm text-slate-500 mb-8">Current inventory distribution</p>
          
          <div className="flex-1 min-h-[250px] relative flex flex-col items-center justify-center">
            {stats ? (
              <>
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                  <span className="text-3xl font-black text-slate-900">{stats.total}</span>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">Total</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                      itemStyle={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div className="w-48 h-48 rounded-full border-8 border-gray-100 animate-pulse" />
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            {pieData.map(item => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm font-medium text-slate-600">{item.name}</span>
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

    </div>
  )
}
