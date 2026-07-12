'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
<<<<<<< HEAD
import {
  Building2, Users, LayoutDashboard, LogOut, Menu, X,
  ChevronRight,
} from 'lucide-react'

const NAV = [
  { href: '/admin',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/projects', label: 'Projects',  icon: Building2 },
  { href: '/admin/builders', label: 'Builders',  icon: Users },
=======
import Image from 'next/image'
import {
  Building2, Users, LayoutDashboard, LogOut, Menu, X,
  ChevronRight, Search, Command, FileText, MessageSquare, Newspaper, PanelLeftClose, PanelLeftOpen, BarChart3
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { API_BASE } from '@/lib/env'

const NAV = [
  { href: '/admin',                       label: 'Dashboard',            icon: LayoutDashboard },
  { href: '/admin/projects',              label: 'Projects',             icon: Building2 },
  { href: '/admin/builders',              label: 'Builders',             icon: Users },
  { href: '/admin/property-listings',     label: 'Listings',             icon: Building2 },
  { href: '/admin/builder-applications',  label: 'Registrations',        icon: FileText },
  { href: '/admin/leads',                 label: 'Leads',                icon: MessageSquare },
  { href: '/admin/news',                  label: 'News',                 icon: Newspaper },
  { href: '/admin/analytics',             label: 'Analytics',            icon: BarChart3 },
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
]

function breadcrumb(pathname: string): { label: string; href?: string }[] {
  const parts = pathname.split('/').filter(Boolean)
  const crumbs: { label: string; href?: string }[] = [{ label: 'Admin', href: '/admin' }]

  if (parts.length > 1) {
    const section = parts[1]
    const label = section.charAt(0).toUpperCase() + section.slice(1)
    crumbs.push(parts.length > 2 ? { label, href: `/${parts[0]}/${section}` } : { label })
  }

  if (parts.length > 2) {
    const last = parts[2]
    crumbs.push({ label: last === 'new' ? 'New' : 'Edit' })
  }

  return crumbs
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [checking, setChecking]   = useState(true)
<<<<<<< HEAD
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (pathname === '/admin/login') { setChecking(false); return }
    fetch('/api/v1/admin/projects?q=_check')
      .then((r) => {
        if (r.status === 401) router.replace('/admin/login')
        else setChecking(false)
      })
      .catch(() => router.replace('/admin/login'))
  }, [pathname])
=======
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCmdOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    document.title = "Admin RealtyPals"
  }, [pathname])

  useEffect(() => {
    if (pathname === '/admin/login') { setChecking(false); return }
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
    if (!token) { router.replace('/admin/login'); return }
    const headers = { 'Authorization': `Bearer ${token}` }
    fetch(`${API_BASE}/admin/projects?q=_check`, { headers })
      .then((r) => {
        if (r.status === 401) { localStorage.removeItem('admin_token'); router.replace('/admin/login') }
        else setChecking(false)
      })
      .catch(() => router.replace('/admin/login'))
  }, [pathname, router])
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172

  if (pathname === '/admin/login') return <>{children}</>

  if (checking) {
    return (
<<<<<<< HEAD
      <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
=======
      <div className="min-h-screen bg-[#EEEEEE] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
      </div>
    )
  }

  async function handleLogout() {
<<<<<<< HEAD
    await fetch('/api/v1/admin/auth', { method: 'DELETE' })
=======
    const token = localStorage.getItem('admin_token')
    await fetch(`${API_BASE}/admin/auth`, {
      method: 'DELETE',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    })
    localStorage.removeItem('admin_token')
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
    router.push('/admin/login')
  }

  const crumbs = breadcrumb(pathname)

  return (
<<<<<<< HEAD
    <div className="min-h-screen bg-[#f5f5f7] flex">

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-56 bg-[#0f0f13] flex flex-col transform transition-transform duration-200
        lg:translate-x-0 lg:static lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>

        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 size={15} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-bold leading-none">RealtyPals</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Admin Panel</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-gray-500 hover:text-gray-300 p-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-3 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={15} className="flex-shrink-0" />
                {label}
                {active && <ChevronRight size={12} className="ml-auto opacity-60" />}
              </Link>
=======
    <div className="h-screen bg-[#EEEEEE] font-sans text-slate-800 selection:bg-slate-200 selection:text-slate-900 flex overflow-hidden">
      
      {/* Command Palette */}
      <AnimatePresence>
        {cmdOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-zinc-900/20 backdrop-blur-sm z-50"
              onClick={() => setCmdOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="fixed top-[15vh] left-1/2 -translate-x-1/2 w-full max-w-xl bg-white/80 backdrop-blur-2xl rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.05)] z-50 overflow-hidden"
            >
              <div className="flex items-center px-4 border-b border-zinc-200/50">
                <Search size={18} className="text-zinc-400 mr-3" />
                <input
                  autoFocus
                  placeholder="Type a command or search..."
                  className="flex-1 py-4 bg-transparent outline-none text-[15px] font-medium text-zinc-900 placeholder:text-zinc-400"
                />
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 bg-zinc-100 rounded text-[10px] font-medium text-zinc-500 font-sans border border-zinc-200">ESC</kbd>
                </div>
              </div>
              <div className="p-2 space-y-1">
                {NAV.map((nav) => (
                  <button
                    key={nav.href}
                    onClick={() => { router.push(nav.href); setCmdOpen(false) }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-zinc-100/80 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <nav.icon size={16} className="text-zinc-500 group-hover:text-zinc-900 transition-colors" />
                      <span className="text-[14px] font-medium text-zinc-700 group-hover:text-zinc-900">{nav.label}</span>
                    </div>
                    <span className="text-[12px] text-zinc-400 font-medium">Go to</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        ${isCollapsed ? 'hidden md:flex w-[68px]' : 'w-64 md:w-[260px]'} 
        flex flex-col h-full bg-[#fdfdfd] border-r border-zinc-200/60 shadow-[4px_0_24px_rgba(0,0,0,0.02)]
        fixed md:relative z-50 md:z-auto shrink-0
        transition-all duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        
        {/* Brand Header */}
        <div className="group h-14 flex items-center justify-center border-b border-zinc-100/80 w-full px-3 shrink-0 relative">
          {!isCollapsed ? (
            <>
              <div className="flex flex-1 items-center justify-center transition-opacity duration-300">
                <Image src="/images/icons/ExpandedRealtyPalsBlack.png" alt="RealtyPals" width={140} height={32} className="object-contain drop-shadow-sm" unoptimized />
              </div>
              <div className="absolute right-3 flex items-center justify-center">
                <button
                  onClick={() => {
                    if (window.innerWidth < 768) setMobileOpen(false);
                    else setIsCollapsed(true);
                  }}
                  className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                >
                  <PanelLeftClose size={20} strokeWidth={1.5} />
                </button>
              </div>
            </>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-200 group-hover:opacity-0 pointer-events-none">
                <Image src="/images/icons/CollapsedRealtyPalsBlackSqLogo.png" alt="RealtyPals Logo" width={32} height={32} className="object-contain rounded-md drop-shadow-sm" unoptimized />
              </div>
              <button
                onClick={() => setIsCollapsed(false)}
                className="absolute inset-0 m-auto w-10 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-all duration-200"
              >
                <PanelLeftOpen size={20} strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>

        {/* Workspace Tag (Expanded only) */}
        {!isCollapsed && (
          <div className="px-5 py-3 border-b border-zinc-50/50 flex items-center gap-2 bg-zinc-50/30">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Admin Workspace</p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV.map(item => {
            const isActive = pathname === item.href
              ? true
              : pathname.startsWith(item.href) && item.href !== '/admin'

            const Icon = item.icon
            return (
              <div key={item.href} className="relative group/navitem flex justify-center">
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center transition-all duration-200 overflow-hidden whitespace-nowrap ${isCollapsed ? 'w-10 h-10 rounded-xl justify-center' : 'w-full gap-3 px-3 py-2.5 rounded-[12px]'} ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                      : 'text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-900'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : 'text-zinc-400 group-hover/navitem:text-zinc-600'} />
                  {!isCollapsed && <span className={`text-[13px] font-semibold tracking-wide ${isActive ? 'text-white' : ''}`}>{item.label}</span>}
                </Link>
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 py-1.5 px-2.5 bg-zinc-800 text-white text-[11px] font-medium rounded-md opacity-0 group-hover/navitem:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100] shadow-xl">
                    {item.label}
                  </div>
                )}
              </div>
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
            )
          })}
        </nav>

<<<<<<< HEAD
        {/* Footer */}
        <div className="px-2.5 py-3 border-t border-white/5 space-y-1">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
          >
            <Building2 size={14} className="flex-shrink-0" />
            View site
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-red-400 hover:bg-white/5 w-full transition-all"
          >
            <LogOut size={14} className="flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-400 hover:text-gray-700 p-1"
          >
            <Menu size={20} />
          </button>

          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1 text-sm min-w-0">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1 min-w-0">
                {i > 0 && <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />}
                {c.href && i < crumbs.length - 1 ? (
                  <Link href={c.href} className="text-gray-400 hover:text-gray-700 transition-colors truncate">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-gray-900 font-semibold truncate">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        </header>

        {/* Page */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
=======
        {/* Footer Area */}
        <div className="p-3 border-t border-zinc-100 shrink-0 w-full space-y-1">
          <div className="relative group/navitem flex justify-center">
            <Link 
              href="/" 
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center transition-all duration-200 overflow-hidden whitespace-nowrap ${isCollapsed ? 'w-10 h-10 rounded-xl justify-center' : 'w-full gap-3 px-3 py-2.5 rounded-[12px]'} text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-900`}
            >
              <Building2 size={18} strokeWidth={2} className="text-zinc-400 group-hover/navitem:text-zinc-600" />
              {!isCollapsed && <span className="text-[13px] font-semibold tracking-wide">View site</span>}
            </Link>
            {isCollapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 py-1.5 px-2.5 bg-zinc-800 text-white text-[11px] font-medium rounded-md opacity-0 group-hover/navitem:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100] shadow-xl">
                View site
              </div>
            )}
          </div>

          <div className="relative group/navitem flex justify-center">
            <button 
              onClick={handleLogout}
              className={`flex items-center transition-all duration-200 overflow-hidden whitespace-nowrap ${isCollapsed ? 'w-10 h-10 rounded-xl justify-center' : 'w-full gap-3 px-3 py-2.5 rounded-[12px]'} text-zinc-500 hover:bg-red-50 hover:text-red-600`}
            >
              <LogOut size={18} strokeWidth={2} className="text-zinc-400 group-hover/navitem:text-red-500" />
              {!isCollapsed && <span className="text-[13px] font-semibold tracking-wide">Sign Out</span>}
            </button>
            {isCollapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 py-1.5 px-2.5 bg-zinc-800 text-white text-[11px] font-medium rounded-md opacity-0 group-hover/navitem:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100] shadow-xl">
                Sign Out
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#EEEEEE]">

        {/* Top bar */}
        <header className="bg-[#EEEEEE]/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden text-zinc-500 hover:text-zinc-900 p-1 mr-2"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-[13px] font-semibold min-w-0">
              {crumbs.map((c, i) => (
                <span key={i} className="flex items-center gap-1 min-w-0">
                  {i > 0 && <ChevronRight size={12} className="text-zinc-300 flex-shrink-0" />}
                  {c.href && i < crumbs.length - 1 ? (
                    <Link href={c.href} className="text-zinc-500 hover:text-zinc-900 transition-colors truncate">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="text-zinc-900 truncate">{c.label}</span>
                  )}
                </span>
              ))}
            </nav>
          </div>

          {/* Command shortcut hint */}
          <button 
            onClick={() => setCmdOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-100/50 hover:bg-zinc-100 rounded-lg text-[11px] font-semibold text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <Search size={12} />
            <span>Search</span>
            <kbd className="font-sans border border-zinc-200/80 rounded px-1.5 py-0.5 bg-white shadow-sm">⌘K</kbd>
          </button>
        </header>

        {/* Page */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
      </div>
    </div>
  )
}
