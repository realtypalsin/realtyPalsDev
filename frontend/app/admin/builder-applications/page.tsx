'use client'

import { useEffect, useState, useMemo } from 'react'
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Search, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  Users,
  ShieldCheck,
  FileText,
  Award,
  Sparkles,
  ChevronRight,
  ChevronDown,
  X,
  Copy,
  Check,
  AlertCircle,
  Filter,
  Globe,
  Briefcase
} from 'lucide-react'
import { AnimatePresence, m } from 'framer-motion'
import { adminFetch } from '@/lib/adminFetch'
import { Skeleton } from '@/components/ui/skeleton'
import { format, formatDistanceToNow } from 'date-fns'

interface BuilderApplication {
  id: string
  name: string
  email: string
  phone: string
  landline?: string | null
  headquarters: string | null
  status: 'new' | 'reviewing' | 'approved' | 'rejected'
  submitted_at: string
  cin?: string | null
  website?: string | null
  description?: string | null
  logo_url?: string | null
  delivery_track?: string | null
  executives?: Array<{ name: string; title: string; experience_years?: number; linkedin?: string }>
  legal_entities?: Array<{ name: string; registration_number: string; state?: string }>
  projects?: string[]
}

type StatusFilter = 'all' | 'new' | 'reviewing' | 'approved' | 'rejected'

const STATUS_CONFIG: Record<BuilderApplication['status'], { label: string; bg: string; text: string; border: string; dot: string }> = {
  new: {
    label: 'New',
    bg: 'bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100/80 dark:hover:bg-blue-900/60',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200/80 dark:border-blue-800/80',
    dot: 'bg-blue-500 shadow-xs shadow-blue-500/50',
  },
  reviewing: {
    label: 'Reviewing',
    bg: 'bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100/80 dark:hover:bg-amber-900/60',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200/80 dark:border-amber-800/80',
    dot: 'bg-amber-500 shadow-xs shadow-amber-500/50',
  },
  approved: {
    label: 'Approved',
    bg: 'bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/60',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200/80 dark:border-emerald-800/80',
    dot: 'bg-emerald-500 shadow-xs shadow-emerald-500/50',
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100/80 dark:hover:bg-rose-900/60',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200/80 dark:border-rose-800/80',
    dot: 'bg-rose-500 shadow-xs shadow-rose-500/50',
  },
}

export default function BuilderApplicationsPage() {
  const [applications, setApplications] = useState<BuilderApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [selectedApp, setSelectedApp] = useState<BuilderApplication | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  
  // Single active popover menu state & fixed coordinates
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    loadApplications()
  }, [])

  // Global Escape Key Listener to close dialogs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedApp(null)
        setActiveMenu(null)
        setMenuCoords(null)
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

  const loadApplications = async () => {
    setLoading(true)
    try {
      const res = await adminFetch('/builder-applications')
      if (!res.ok) throw new Error('Failed to fetch applications')
      const data = await res.json()
      setApplications(data.applications || [])
    } catch {
      showToast('Failed to load builder applications', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: BuilderApplication['status']) => {
    try {
      setActiveMenu(null)
      setMenuCoords(null)
      const res = await adminFetch(`/builder-applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Update failed')
      
      setApplications(apps => apps.map(a => a.id === id ? { ...a, status: newStatus } : a))
      if (selectedApp?.id === id) {
        setSelectedApp(prev => prev ? { ...prev, status: newStatus } : null)
      }
      showToast(`Application marked as ${STATUS_CONFIG[newStatus].label}`, 'success')
    } catch {
      showToast('Failed to update application status', 'error')
    }
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    showToast(`Copied ${label}`, 'success')
  }

  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const query = searchQuery.toLowerCase().trim()
      const matchesSearch = !query || 
        app.name.toLowerCase().includes(query) ||
        app.email.toLowerCase().includes(query) ||
        app.phone.includes(query) ||
        (app.cin && app.cin.toLowerCase().includes(query)) ||
        (app.headquarters && app.headquarters.toLowerCase().includes(query))

      const matchesFilter = filter === 'all' || app.status === filter
      return matchesSearch && matchesFilter
    })
  }, [applications, searchQuery, filter])

  const stats = useMemo(() => {
    const total = applications.length
    const newCount = applications.filter(a => a.status === 'new').length
    const reviewing = applications.filter(a => a.status === 'reviewing').length
    const approved = applications.filter(a => a.status === 'approved').length
    const rejected = applications.filter(a => a.status === 'rejected').length
    return { total, newCount, reviewing, approved, rejected }
  }, [applications])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(p => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'B'
  }

  return (
    <div className="space-y-6 pb-16 font-sans select-none">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Builder Registrations
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Developer Onboarding
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Review, verify RERA compliance, and approve developer onboarding requests
          </p>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Registrations */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Requests
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {loading ? <Skeleton className="h-8 w-16" /> : stats.total}
            </span>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
              {stats.newCount} pending
            </span>
          </div>
        </div>

        {/* Pending Review */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Under Review
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {loading ? <Skeleton className="h-8 w-16" /> : stats.reviewing}
            </span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              In verification
            </span>
          </div>
        </div>

        {/* Approved Builders */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Approved Builders
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {loading ? <Skeleton className="h-8 w-16" /> : stats.approved}
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              Active partners
            </span>
          </div>
        </div>

        {/* Rejected Requests */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Declined
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {loading ? <Skeleton className="h-8 w-16" /> : stats.rejected}
            </span>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
              Unverified
            </span>
          </div>
        </div>
      </div>

      {/* Control Toolbar: Filter Pills & Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {(['all', 'new', 'reviewing', 'approved', 'rejected'] as const).map(st => (
            <button
              key={st}
              onClick={() => {
                setActiveMenu(null)
                setMenuCoords(null)
                setFilter(st)
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap capitalize border ${
                filter === st
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {st === 'all' ? 'All Registrations' : st}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search builder name, email, CIN..."
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

      {/* Main Data Table Card */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-4 w-32 flex-1" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No registrations found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search query or status filter.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Company Info</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Submitted Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredApplications.map(app => {
                  const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.new
                  const menuKey = `status-${app.id}`
                  const isMenuOpen = activeMenu === menuKey

                  return (
                    <tr
                      key={app.id}
                      onClick={() => {
                        setActiveMenu(null)
                        setMenuCoords(null)
                        setSelectedApp(app)
                      }}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    >
                      {/* Company Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
                            {app.logo_url && (app.logo_url.startsWith('data:') || app.logo_url.startsWith('http')) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={app.logo_url} alt={app.name} className="w-full h-full object-contain bg-white p-1" />
                            ) : (
                              getInitials(app.name)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {app.name}
                            </p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{app.headquarters || 'No HQ specified'}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                        <div className="space-y-0.5">
                          <p className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                            {app.email}
                          </p>
                          <p className="font-mono text-[11px] text-slate-500 font-semibold">
                            {app.phone}
                          </p>
                        </div>
                      </td>

                      {/* Submitted Date */}
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <span title={format(new Date(app.submitted_at), 'PPP p')}>
                          {formatDistanceToNow(new Date(app.submitted_at), { addSuffix: true })}
                        </span>
                      </td>

                      {/* Interactive Status Button */}
                      <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={(e) => togglePopover(menuKey, e)}
                          className={`px-3 py-1.5 rounded-xl font-bold border text-xs flex items-center justify-between gap-2 transition-all shadow-2xs ${cfg.bg} ${cfg.text} ${cfg.border}`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                            <span>{cfg.label}</span>
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setActiveMenu(null)
                            setMenuCoords(null)
                            setSelectedApp(app)
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-bold transition-all shadow-2xs"
                        >
                          <span>Review</span>
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

      {/* FIXED TOPMOST POPOVER FOR TABLE STATUS DROPDOWN */}
      <AnimatePresence>
        {activeMenu && activeMenu.startsWith('status-') && menuCoords && (
          <m.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{ top: `${menuCoords.top}px`, left: `${menuCoords.left}px` }}
            className="fixed w-36 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-2xl py-1.5 z-[9999] font-sans overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {(['new', 'reviewing', 'approved', 'rejected'] as const).map(st => {
              const app = applications.find(a => `status-${a.id}` === activeMenu)
              if (!app) return null
              const stCfg = STATUS_CONFIG[st]
              const isSelected = app.status === st
              return (
                <button
                  key={st}
                  onClick={() => {
                    handleUpdateStatus(app.id, st)
                  }}
                  className={`w-full px-3 py-1.5 text-xs font-bold flex items-center justify-between transition-colors ${
                    isSelected 
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${stCfg.dot}`} />
                    <span>{stCfg.label}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-slate-900 dark:text-white" />}
                </button>
              )
            })}
          </m.div>
        )}
      </AnimatePresence>

      {/* EMIL KOWALSKI / LINEAR / VERCEL STYLE CENTERED APPLICATION REVIEW DIALOG */}
      <AnimatePresence>
        {selectedApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop: click outside closes dialog */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              onClick={() => setSelectedApp(null)}
            />

            {/* Modal Dialog Card */}
            <m.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden font-sans z-10 my-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-4 min-w-0">
                  {/* Logo / Avatar container */}
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center shadow-md shrink-0 overflow-hidden p-1.5">
                    {selectedApp.logo_url && (selectedApp.logo_url.startsWith('data:') || selectedApp.logo_url.startsWith('http')) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedApp.logo_url} alt={selectedApp.name} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-lg flex items-center justify-center">
                        {getInitials(selectedApp.name)}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white truncate tracking-tight">
                        {selectedApp.name}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <ShieldCheck className="w-3 h-3" /> RERA Standard
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${STATUS_CONFIG[selectedApp.status].bg} ${STATUS_CONFIG[selectedApp.status].text} ${STATUS_CONFIG[selectedApp.status].border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[selectedApp.status].dot}`} />
                        <span>{STATUS_CONFIG[selectedApp.status].label}</span>
                      </span>

                      {selectedApp.headquarters && (
                        <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{selectedApp.headquarters}</span>
                        </span>
                      )}

                      {selectedApp.cin && (
                        <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          CIN: {selectedApp.cin}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedApp(null)}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body: Crisp 2-Column Grid */}
              <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Left Column: Contact & Legal & Brand */}
                  <div className="space-y-4">
                    {/* Card 1: Contact Information */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                          Contact Details
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Submitted {format(new Date(selectedApp.submitted_at), 'PPP')}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                          <div className="flex items-center gap-2 min-w-0">
                            <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{selectedApp.email}</span>
                          </div>
                          <button onClick={() => copyToClipboard(selectedApp.email, 'Email')} className="text-slate-400 hover:text-slate-600 p-1">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                          <div className="flex items-center gap-2 min-w-0">
                            <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{selectedApp.phone}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => copyToClipboard(selectedApp.phone, 'Phone')} className="text-slate-400 hover:text-slate-600 p-1">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={`https://wa.me/91${selectedApp.phone.replace(/^\+91/, '')}?text=${encodeURIComponent(`Hi ${selectedApp.name}, following up regarding your builder registration application on RealtyPals.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:bg-emerald-50 p-1 rounded-md"
                              title="Open WhatsApp"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Registered Legal Entities & RERA */}
                    {selectedApp.legal_entities && selectedApp.legal_entities.length > 0 && (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                          Legal Entities & RERA
                        </span>
                        <div className="space-y-2">
                          {selectedApp.legal_entities.map((e, idx) => (
                            <div key={idx} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                                <span className="font-bold text-slate-900 dark:text-white truncate">{e.name}</span>
                              </div>
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 text-[11px] shrink-0 ml-2">
                                {e.registration_number}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Card 3: Brand & Web Presence */}
                    {(selectedApp.website || selectedApp.description) && (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                          Brand Presence
                        </span>
                        {selectedApp.website && (
                          <div className="flex items-center gap-2 text-xs">
                            <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                            <a 
                              href={selectedApp.website.startsWith('http') ? selectedApp.website : `https://${selectedApp.website}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate"
                            >
                              {selectedApp.website} <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          </div>
                        )}
                        {selectedApp.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium pt-1 border-t border-slate-200/60 dark:border-slate-800">
                            {selectedApp.description}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Executives & Track Record */}
                  <div className="space-y-4">
                    {/* Card 4: Executive Leadership */}
                    {selectedApp.executives && selectedApp.executives.length > 0 && (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                          Executive Leadership
                        </span>
                        <div className="space-y-2">
                          {selectedApp.executives.map((exec, idx) => (
                            <div key={idx} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 font-bold text-xs flex items-center justify-center shrink-0">
                                {getInitials(exec.name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h5 className="font-bold text-slate-900 dark:text-white text-xs truncate">{exec.name}</h5>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{exec.title || 'Executive Member'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Card 5: Track Record & Flagship Projects */}
                    {(selectedApp.delivery_track || (selectedApp.projects && selectedApp.projects.length > 0)) && (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                          Track Record & Scale
                        </span>
                        
                        {selectedApp.projects && selectedApp.projects.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Notable Projects
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedApp.projects.map((p, i) => (
                                <span key={i} className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                                  {p}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedApp.delivery_track && (
                          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Delivery Performance
                            </span>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                              {selectedApp.delivery_track}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Switcher Section inside Modal */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Update Registration Status
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['new', 'reviewing', 'approved', 'rejected'] as const).map(st => {
                      const cfg = STATUS_CONFIG[st]
                      const isActive = selectedApp.status === st
                      return (
                        <button
                          key={st}
                          onClick={() => handleUpdateStatus(selectedApp.id, st)}
                          className={`py-2.5 rounded-xl text-xs font-bold capitalize transition-all border flex flex-col items-center gap-1 ${
                            isActive
                              ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-2 ring-blue-500/20 shadow-xs`
                              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
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

              {/* Modal Footer Decision Actions */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Registration Decision
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                    Currently set to <strong className="capitalize">{STATUS_CONFIG[selectedApp.status].label}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')}
                    className="py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-bold text-xs transition-all active:scale-[0.98]"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedApp.id, 'approved')}
                    className="py-2.5 px-5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-black dark:hover:bg-slate-100 font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-[0.98]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                    <span>Approve Builder</span>
                  </button>
                </div>
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
