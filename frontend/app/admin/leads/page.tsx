'use client'

import { useEffect, useState, useMemo } from 'react'
import { 
  Phone, 
  Search, 
  Flame, 
  Zap, 
  Snowflake, 
  Building2, 
  UserCheck, 
  Copy, 
  MessageSquare, 
  Filter, 
  Sparkles, 
  BarChart3, 
  ChevronRight, 
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  Bookmark,
  ChevronDown,
  Calendar,
  Wallet,
  ShieldCheck,
  Check
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { AnimatePresence, m } from 'framer-motion'
import { adminFetch } from '@/lib/adminFetch'
import { Skeleton } from '@/components/ui/skeleton'

interface Lead {
  id: string
  name: string
  phone: string
  project_name: string | null
  project_slug: string | null
  user_id?: string | null
  guest_token?: string | null
  status: 'new' | 'contacted' | 'qualified' | 'lost'
  lead_tier: 'HOT' | 'WARM' | 'COLD' | null
  lead_score: number | null
  intent_tier: string | null
  loan_pre_approved?: boolean | null
  consent_given?: boolean | null
  projects_saved?: number | null
  projects_viewed?: number | null
  budget_min_cr?: number | null
  budget_max_cr?: number | null
  ai_summary?: string | null
  created_at: string
}

type StatusType = 'new' | 'contacted' | 'qualified' | 'lost'

const STATUS_CONFIG: Record<StatusType, { label: string; bg: string; text: string; border: string; dot: string }> = {
  new: {
    label: 'New',
    bg: 'bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100/80 dark:hover:bg-blue-900/60',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200/80 dark:border-blue-800/80',
    dot: 'bg-blue-500 shadow-xs shadow-blue-500/50',
  },
  contacted: {
    label: 'Contacted',
    bg: 'bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100/80 dark:hover:bg-amber-900/60',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200/80 dark:border-amber-800/80',
    dot: 'bg-amber-500 shadow-xs shadow-amber-500/50',
  },
  qualified: {
    label: 'Qualified',
    bg: 'bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/60',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200/80 dark:border-emerald-800/80',
    dot: 'bg-emerald-500 shadow-xs shadow-emerald-500/50',
  },
  lost: {
    label: 'Lost',
    bg: 'bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100/80 dark:hover:bg-rose-900/60',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200/80 dark:border-rose-800/80',
    dot: 'bg-rose-500 shadow-xs shadow-rose-500/50',
  },
}

export default function BuilderLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | StatusType>('all')
  const [tierFilter, setTierFilter] = useState<'all' | 'HOT' | 'WARM' | 'COLD'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null)
  
  // Single active popover menu state & fixed coordinates
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    fetchLeads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  // Global Escape Key Listener to close dialogs & popovers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenu(null)
        setMenuCoords(null)
        setSelectedLead(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Auto-close active popover menu on click outside or scroll
  useEffect(() => {
    if (!activeMenu) return
    const handleCloseMenu = () => {
      setActiveMenu(null)
      setMenuCoords(null)
    }
    const timer = setTimeout(() => {
      window.addEventListener('click', handleCloseMenu)
      window.addEventListener('scroll', handleCloseMenu, true)
    }, 0)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('click', handleCloseMenu)
      window.removeEventListener('scroll', handleCloseMenu, true)
    }
  }, [activeMenu])

  const togglePopover = (key: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (activeMenu === key) {
      setActiveMenu(null)
      setMenuCoords(null)
    } else {
      const rect = e.currentTarget.getBoundingClientRect()
      setMenuCoords({
        top: rect.bottom + 6,
        left: rect.left,
      })
      setActiveMenu(key)
    }
  }

  const fetchLeads = async () => {
    try {
      setLoading(true)
      const res = await adminFetch(`/admin/leads?status=${statusFilter}`)
      if (res.ok) {
        const data = await res.json()
        setLeads(data.leads || [])
      }
    } catch {
      console.error('Failed to fetch leads')
    } finally {
      setLoading(false)
    }
  }

  const updateLeadStatus = async (leadId: string, newStatus: StatusType) => {
    try {
      setActiveMenu(null)
      setMenuCoords(null)
      const res = await adminFetch(`/admin/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
        if (selectedLead?.id === leadId) {
          setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null)
        }
        showToast(`Status updated to ${STATUS_CONFIG[newStatus].label}`, 'success')
      } else {
        showToast(`Failed to update lead status`, 'error')
      }
    } catch (err) {
      console.error('Update failed:', err)
      showToast('Error updating lead status', 'error')
    }
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    showToast(`Copied +91 ${text}`, 'success')
  }

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesTier = tierFilter === 'all' || (lead.lead_tier && lead.lead_tier.toUpperCase() === tierFilter.toUpperCase())
      const query = searchQuery.toLowerCase().trim()
      const matchesSearch = !query || 
        lead.name.toLowerCase().includes(query) ||
        lead.phone.includes(query) ||
        (lead.project_name && lead.project_name.toLowerCase().includes(query)) ||
        (lead.project_slug && lead.project_slug.toLowerCase().includes(query))
      
      return matchesTier && matchesSearch
    })
  }, [leads, tierFilter, searchQuery])

  // Analytics Metrics
  const stats = useMemo(() => {
    const total = leads.length
    const hot = leads.filter(l => l.lead_tier === 'HOT').length
    const warm = leads.filter(l => l.lead_tier === 'WARM').length
    const cold = leads.filter(l => l.lead_tier === 'COLD').length
    const newLeads = leads.filter(l => l.status === 'new').length
    const qualified = leads.filter(l => l.status === 'qualified').length
    const avgScore = total > 0 
      ? Math.round(leads.reduce((acc, curr) => acc + (curr.lead_score || 0), 0) / total) 
      : 0

    return { total, hot, warm, cold, newLeads, qualified, avgScore }
  }, [leads])

  const getTierBadge = (tier: string | null, score: number | null) => {
    switch (tier) {
      case 'HOT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <Flame className="w-3.5 h-3.5 fill-rose-500 text-rose-500 animate-pulse" />
            <span>HOT</span>
            {score !== null && <span className="font-mono text-[11px] opacity-75">· {score}</span>}
          </span>
        )
      case 'WARM':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>WARM</span>
            {score !== null && <span className="font-mono text-[11px] opacity-75">· {score}</span>}
          </span>
        )
      case 'COLD':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <Snowflake className="w-3.5 h-3.5 text-sky-500" />
            <span>COLD</span>
            {score !== null && <span className="font-mono text-[11px] opacity-75">· {score}</span>}
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-400">
            Unscored
          </span>
        )
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U'
  }

  return (
    <div className="space-y-6 pb-16 font-sans select-none">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Lead Intelligence & Pipeline
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Real-time buyer inquiries, qualification scores, and automated CRM webhooks
          </p>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Inquiries */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Inquiries
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {loading ? <Skeleton className="h-8 w-16" /> : stats.total}
            </span>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
              {stats.newLeads} uncontacted
            </span>
          </div>
        </div>

        {/* Hot Leads */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Hot Leads
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Flame className="w-4 h-4 fill-rose-500" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {loading ? <Skeleton className="h-8 w-16" /> : stats.hot}
            </span>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
              {stats.total > 0 ? `${Math.round((stats.hot / stats.total) * 100)}% of total` : '0%'}
            </span>
          </div>
        </div>

        {/* Qualified */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Qualified Leads
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {loading ? <Skeleton className="h-8 w-16" /> : stats.qualified}
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {stats.warm} warm
            </span>
          </div>
        </div>

        {/* Avg Score */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Avg Qualification
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {loading ? <Skeleton className="h-8 w-16" /> : `${stats.avgScore}/100`}
            </span>
            <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden self-center">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-amber-500 to-rose-500 rounded-full" 
                style={{ width: `${Math.min(100, stats.avgScore)}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Control Toolbar: Filters, Search & Dropdown Popovers */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filters Pill Group */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {(['all', 'new', 'contacted', 'qualified', 'lost'] as const).map(status => (
            <button
              key={status}
              onClick={() => {
                setActiveMenu(null)
                setMenuCoords(null)
                setStatusFilter(status)
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap capitalize border ${
                statusFilter === status
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {status === 'all' ? 'All Leads' : status}
            </button>
          ))}
        </div>

        {/* Right side controls: Search + Premium Tier Filter Popover */}
        <div className="flex items-center gap-3">
          {/* Custom Tier Filter Button */}
          <div className="relative">
            <button
              onClick={(e) => togglePopover('tier', e)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all shadow-2xs ${
                tierFilter === 'HOT'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                  : tierFilter === 'WARM'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                  : tierFilter === 'COLD'
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tierFilter === 'HOT' && <Flame className="w-3.5 h-3.5 fill-rose-500 text-rose-500 animate-pulse" />}
              {tierFilter === 'WARM' && <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />}
              {tierFilter === 'COLD' && <Snowflake className="w-3.5 h-3.5 text-sky-500" />}
              {tierFilter === 'all' && <Filter className="w-3.5 h-3.5 text-slate-400" />}
              <span>{tierFilter === 'all' ? 'All Tiers' : `${tierFilter} Tier`}</span>
              <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${activeMenu === 'tier' ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search name, phone, project..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Leads Data Table Card */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-32 flex-1" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No leads match your search</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search query or filters to discover matching inquiries.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Buyer Name</th>
                  <th className="px-6 py-4">Contact Info</th>
                  <th className="px-6 py-4">Target Property</th>
                  <th className="px-6 py-4">Qualification</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Submitted</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredLeads.map(lead => {
                  const currentStatusCfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new
                  const menuKey = `status-${lead.id}`
                  const isMenuOpen = activeMenu === menuKey

                  return (
                    <tr 
                      key={lead.id} 
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => {
                        setActiveMenu(null)
                        setMenuCoords(null)
                        setSelectedLead(lead)
                      }}
                    >
                      {/* Buyer Name & Avatar */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                            {getInitials(lead.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {lead.name}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>{lead.user_id ? 'Registered Buyer' : 'Guest Visitor'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                            +91 {lead.phone}
                          </span>
                          <button
                            onClick={() => copyToClipboard(lead.phone)}
                            title="Copy phone number"
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={`https://wa.me/91${lead.phone}?text=${encodeURIComponent(`Hi ${lead.name}, thank you for reaching out regarding ${lead.project_name || 'properties'} on RealtyPals.`)}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Open WhatsApp chat"
                            className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>

                      {/* Target Property */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                            {lead.project_name || 'General Inquiry'}
                          </span>
                        </div>
                      </td>

                      {/* Qualification Tier */}
                      <td className="px-6 py-4">
                        {getTierBadge(lead.lead_tier, lead.lead_score)}
                      </td>

                      {/* Interactive Status Button */}
                      <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={(e) => togglePopover(menuKey, e)}
                          className={`px-3 py-1.5 rounded-xl font-bold border text-xs flex items-center justify-between gap-2 transition-all shadow-2xs ${currentStatusCfg.bg} ${currentStatusCfg.text} ${currentStatusCfg.border}`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${currentStatusCfg.dot}`} />
                            <span>{currentStatusCfg.label}</span>
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </td>

                      {/* Submitted Date */}
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <span title={formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}>
                          {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                        </span>
                      </td>

                      {/* Details Action Button */}
                      <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setActiveMenu(null)
                            setMenuCoords(null)
                            setSelectedLead(lead)
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-bold transition-all shadow-2xs"
                        >
                          <span>Details</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FIXED TOPMOST POPOVERS FOR LEADS PAGE */}
      <AnimatePresence>
        {activeMenu === 'tier' && menuCoords && (
          <m.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{ top: `${menuCoords.top}px`, left: `${menuCoords.left}px` }}
            className="fixed w-48 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl p-1.5 z-[9999] font-sans overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {(['all', 'HOT', 'WARM', 'COLD'] as const).map(tier => {
              const isSelected = tierFilter === tier
              return (
                <button
                  key={tier}
                  onClick={() => {
                    setTierFilter(tier)
                    setActiveMenu(null)
                    setMenuCoords(null)
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {tier === 'all' && <Filter className="w-3.5 h-3.5 text-slate-400" />}
                    {tier === 'HOT' && <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />}
                    {tier === 'WARM' && <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                    {tier === 'COLD' && <Snowflake className="w-3.5 h-3.5 text-sky-500" />}
                    <span>{tier === 'all' ? 'All Tiers' : `${tier} Tier`}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-slate-900 dark:text-white" />}
                </button>
              )
            })}
          </m.div>
        )}

        {activeMenu && activeMenu.startsWith('status-') && menuCoords && (
          <m.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{ top: `${menuCoords.top}px`, left: `${menuCoords.left}px` }}
            className="fixed w-36 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-2xl py-1.5 z-[9999] font-sans overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {(['new', 'contacted', 'qualified', 'lost'] as const).map(st => {
              const lead = leads.find(l => `status-${l.id}` === activeMenu)
              if (!lead) return null
              const cfg = STATUS_CONFIG[st]
              const isSelected = lead.status === st
              return (
                <button
                  key={st}
                  onClick={() => updateLeadStatus(lead.id, st)}
                  className={`w-full px-3 py-1.5 text-xs font-bold flex items-center justify-between transition-colors ${
                    isSelected 
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span>{cfg.label}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-slate-900 dark:text-white" />}
                </button>
              )
            })}
          </m.div>
        )}
      </AnimatePresence>

      {/* CENTERED DIALOG MODAL FOR LEAD DETAILS */}
      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop: clicking outside closes modal */}
            <m.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              onClick={() => setSelectedLead(null)}
            />

            {/* Modal Dialog Card */}
            <m.div 
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden font-sans z-10 my-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-lg flex items-center justify-center shadow-md shrink-0">
                    {getInitials(selectedLead.name)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white truncate">
                      {selectedLead.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {getTierBadge(selectedLead.lead_tier, selectedLead.lead_score)}
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                        +91 {selectedLead.phone}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedLead(null)}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Target Property Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Property Interest
                    </span>
                    {selectedLead.consent_given && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <ShieldCheck className="w-3 h-3" /> Consent Verified
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2.5 pt-1">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedLead.project_name || 'General Inquiry'}
                      </h4>
                      {selectedLead.project_slug && (
                        <p className="text-[11px] font-mono text-slate-500">
                          {selectedLead.project_slug}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Qualification Metrics Grid */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Qualification Intelligence
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Buying Timeline */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Timeline</span>
                      </div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs capitalize">
                        {selectedLead.intent_tier?.replace('-', ' ') || 'Not specified'}
                      </p>
                    </div>

                    {/* Home Loan Status */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                        <Wallet className="w-3.5 h-3.5" />
                        <span>Home Loan</span>
                      </div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs">
                        {selectedLead.loan_pre_approved ? 'Pre-Approved ✅' : 'Self-Financed / Help Needed'}
                      </p>
                    </div>

                    {/* Budget */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>Budget Range</span>
                      </div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs">
                        {selectedLead.budget_min_cr && selectedLead.budget_max_cr 
                          ? `₹${selectedLead.budget_min_cr} - ₹${selectedLead.budget_max_cr} Cr` 
                          : 'Flexible'}
                      </p>
                    </div>

                    {/* Lead Score */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Lead Score</span>
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white font-mono">
                          {selectedLead.lead_score ?? 0}/100
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full" 
                          style={{ width: `${Math.min(100, selectedLead.lead_score || 0)}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Platform Engagement Activity */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Buyer Platform Activity
                  </h4>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-around text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                        <Eye className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-black text-slate-900 dark:text-white text-sm block">
                          {selectedLead.projects_viewed ?? 0}
                        </span>
                        <span className="text-slate-400 text-[11px]">Projects Viewed</span>
                      </div>
                    </div>

                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />

                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                        <Bookmark className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-black text-slate-900 dark:text-white text-sm block">
                          {selectedLead.projects_saved ?? 0}
                        </span>
                        <span className="text-slate-400 text-[11px]">Projects Saved</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Assistant Notes */}
                {selectedLead.ai_summary && (
                  <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-300 font-bold uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI Assistant Summary</span>
                    </div>
                    <p className="text-purple-950 dark:text-purple-200 leading-relaxed pt-1 font-medium">
                      {selectedLead.ai_summary}
                    </p>
                  </div>
                )}

                {/* Status Switcher in Modal */}
                <div className="pt-2 space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Update Lead Status
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['new', 'contacted', 'qualified', 'lost'] as const).map(st => {
                      const cfg = STATUS_CONFIG[st]
                      const isActive = selectedLead.status === st
                      return (
                        <button
                          key={st}
                          onClick={() => updateLeadStatus(selectedLead.id, st)}
                          className={`py-2.5 rounded-xl text-xs font-bold capitalize transition-all border flex flex-col items-center gap-1 ${
                            isActive
                              ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-2 ring-blue-500/20 shadow-xs`
                              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          <span>{cfg.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end gap-3">
                <a
                  href={`tel:${selectedLead.phone}`}
                  className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all active:scale-[0.98]"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Buyer</span>
                </a>
                <a
                  href={`https://wa.me/91${selectedLead.phone}?text=${encodeURIComponent(`Hi ${selectedLead.name}, following up on your callback request for ${selectedLead.project_name || 'RealtyPals'}.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all active:scale-[0.98]"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-2xl text-white text-xs font-bold shadow-2xl transition-all flex items-center gap-2 z-50 ${
          toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}
