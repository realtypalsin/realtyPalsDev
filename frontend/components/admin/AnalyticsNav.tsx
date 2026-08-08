'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Search, Building2, Users } from 'lucide-react'

export default function AnalyticsNav() {
  const pathname = usePathname()

  const navs = [
    { name: 'Dashboard', path: '/admin/analytics', icon: LayoutDashboard },
    { name: 'Search Analytics', path: '/admin/analytics/search', icon: Search },
    { name: 'Property Engagement', path: '/admin/analytics/properties', icon: Building2 },
    { name: 'User Behavior', path: '/admin/analytics/users', icon: Users },
  ]

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 shadow-2xs rounded-2xl w-full sm:w-fit font-sans">
      {navs.map((n) => {
        const isActive = pathname === n.path
        const Icon = n.icon
        return (
          <Link
            key={n.name}
            href={n.path}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 whitespace-nowrap flex items-center gap-2 ${
              isActive
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs font-extrabold'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-800/50'
            }`}
          >
            <Icon size={14} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400'} />
            <span>{n.name}</span>
          </Link>
        )
      })}
    </div>
  )
}
