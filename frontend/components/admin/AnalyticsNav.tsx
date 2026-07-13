'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AnalyticsNav() {
  const pathname = usePathname();

  const navs = [
    { name: 'Dashboard', path: '/admin/analytics' },
    { name: 'Search Analytics', path: '/admin/analytics/search' },
    { name: 'Property Engagement', path: '/admin/analytics/properties' },
    { name: 'User Behavior', path: '/admin/analytics/users' },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto sticky top-4 z-40 py-1.5 px-1.5 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-gray-200/60 dark:border-gray-800/60 shadow-sm rounded-full w-fit mx-auto sm:mx-0 mb-8 hide-scrollbar">
      {navs.map((n) => {
        const isActive = pathname === n.path;
        return (
          <Link
            key={n.name}
            href={n.path}
            className={`px-4 py-2 text-[13px] font-semibold rounded-full transition-all shrink-0 whitespace-nowrap flex items-center gap-2 ${
              isActive
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md ring-1 ring-black/5'
                : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-gray-800'
            }`}
          >
            {n.name}
          </Link>
        );
      })}
    </div>
  );
}
