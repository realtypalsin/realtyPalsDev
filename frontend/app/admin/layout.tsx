'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Building2, Users, LayoutDashboard, LogOut, Menu, X,
  ChevronRight, Search, Command
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { API_BASE } from '@/lib/env'

const NAV = [
  { href: '/admin',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/projects', label: 'Projects',  icon: Building2 },
  { href: '/admin/builders', label: 'Builders',  icon: Users },
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
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

  // Update browser tab title
  useEffect(() => {
    document.title = "Admin RealtyPals"
  }, [pathname])

  useEffect(() => {
    if (pathname === '/admin/login') { setChecking(false); return }
    fetch(`${API_BASE}/admin/projects?q=_check`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 401) router.replace('/admin/login')
        else setChecking(false)
      })
      .catch(() => router.replace('/admin/login'))
  }, [pathname])

  if (pathname === '/admin/login') return <>{children}</>

  if (checking) {
    return (
      <div className="min-h-screen bg-[#EEEEEE] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  async function handleLogout() {
    await fetch(`${API_BASE}/admin/auth`, { method: 'DELETE', credentials: 'include' })
    router.push('/admin/login')
  }

  const crumbs = breadcrumb(pathname)

  return (
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

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-[240px] bg-white border-r border-gray-100 shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex flex-col transform transition-transform duration-200
        lg:translate-x-0 lg:static lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>

        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-100">
          <div className="w-8 h-8 bg-slate-900 shadow-sm rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 size={15} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-zinc-900 text-sm font-bold leading-none tracking-tight">RealtyPals</p>
            <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">Admin Panel</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-zinc-500 hover:text-zinc-800 p-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-3 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`relative flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13px] font-semibold transition-colors group ${
                  active ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.02)] rounded-[10px]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon size={15} className={`relative z-10 flex-shrink-0 transition-colors ${active ? 'text-zinc-900' : 'text-zinc-400 group-hover:text-zinc-600'}`} />
                <span className="relative z-10">{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-2.5 py-3 border-t border-gray-100 space-y-1">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/80 transition-all border border-transparent"
          >
            <Building2 size={14} className="flex-shrink-0" />
            View site
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-zinc-500 hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-all border border-transparent w-full"
          >
            <LogOut size={14} className="flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#EEEEEE]">

        {/* Top bar */}
        <header className="bg-[#EEEEEE]/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-zinc-500 hover:text-zinc-900 p-1"
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
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
