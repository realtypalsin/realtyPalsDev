'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Building2, Users, LayoutDashboard, LogOut, Menu, X,
  ChevronRight,
} from 'lucide-react'

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

  useEffect(() => {
    if (pathname === '/admin/login') { setChecking(false); return }
    fetch('/api/v1/admin/projects?q=_check')
      .then((r) => {
        if (r.status === 401) router.replace('/admin/login')
        else setChecking(false)
      })
      .catch(() => router.replace('/admin/login'))
  }, [pathname])

  if (pathname === '/admin/login') return <>{children}</>

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  async function handleLogout() {
    await fetch('/api/v1/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  const crumbs = breadcrumb(pathname)

  return (
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
            )
          })}
        </nav>

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
      </div>
    </div>
  )
}
