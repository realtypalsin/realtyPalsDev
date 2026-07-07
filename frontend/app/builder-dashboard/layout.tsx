'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, FileText, Users, BarChart3, Settings, LogOut } from 'lucide-react'

const NAV_ITEMS = [
  { name: 'Overview', href: '/builder-dashboard', icon: Building2 },
  { name: 'News & Promos', href: '/builder-dashboard/news', icon: FileText },
  { name: 'Leads', href: '/builder-dashboard/leads', icon: Users },
  { name: 'Analytics', href: '/builder-dashboard/analytics', icon: BarChart3 },
  { name: 'Theme & Branding', href: '/builder-dashboard/theme', icon: Settings }
]

export default function BuilderDashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r dark:border-slate-700 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Builder Hub</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage your presence</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t dark:border-slate-700 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition text-sm">
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
