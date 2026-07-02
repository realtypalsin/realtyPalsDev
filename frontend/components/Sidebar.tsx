'use client';
import { Compass, Bookmark, X, Plus, LogOut } from 'lucide-react';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatedText } from '@/components/ui/animated-shiny-text';
import { getSupabaseClient } from '@/lib/supabase';
import { API_BASE } from '@/lib/env';
import { useSessions, Session } from '@/hooks/useSessions';
import { SessionItem } from '@/components/Sidebar/SessionItem';
import { authHeaders } from '@/lib/authedFetch';

interface SidebarProps {
  activeView?: 'discovery' | 'saved' | 'compare' | 'value-estimator' | 'market-intelligence' | 'lead-snapshot';
  onViewChange?: (view: 'discovery' | 'saved' | 'compare' | 'value-estimator' | 'market-intelligence' | 'lead-snapshot') => void;
  userId: string | null;
  guestToken?: string | null;
  activeSessionId?: string | null;
}

function groupSessionsByDate(sessions: Session[]): { label: string; items: Session[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const sevenDaysAgo = today - 6 * 86400000;
  const thirtyDaysAgo = today - 29 * 86400000;

  const groups: Record<string, Session[]> = {
    Today: [],
    Yesterday: [],
    'Previous 7 Days': [],
    'Previous 30 Days': [],
    Older: [],
  };

  for (const s of sessions) {
    const t = new Date(s.last_active).getTime();
    if (t >= today) groups['Today'].push(s);
    else if (t >= yesterday) groups['Yesterday'].push(s);
    else if (t >= sevenDaysAgo) groups['Previous 7 Days'].push(s);
    else if (t >= thirtyDaysAgo) groups['Previous 30 Days'].push(s);
    else groups['Older'].push(s);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

export default function Sidebar({ activeView: activeViewProp, onViewChange, userId, guestToken, activeSessionId }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [leadsToday, setLeadsToday] = useState<number | null>(null);

  const { sessions, loading: sessionsLoading, error: sessionsError, deleteSession, renameSession } = useSessions(userId, guestToken);

  useEffect(() => {
    if (!userId) return;
    authHeaders()
      .then((headers) => fetch(`${API_BASE}/leads/count`, { headers }))
      .then(r => r.json())
      .then((d: { count: number }) => setLeadsToday(d.count ?? null))
      .catch(() => {});
  }, [userId]);

  const routeToView: Record<string, any> = {
    '/discover': 'discovery',
    '/saved': 'saved',
    '/compare': 'compare',
    '/value-estimator': 'value-estimator',
    '/market-intelligence': 'market-intelligence',
    '/lead-snapshot': 'lead-snapshot',
  };
  const activeView = routeToView[pathname ?? ''] ?? activeViewProp ?? 'discovery';

  const handleLogout = () => {
    // Navigate instantly (client-side) — don't block on a full page reload or the
    // network sign-out call. Clear local state, fire sign-out in the background.
    localStorage.removeItem('user_id');
    getSupabaseClient().then((supabase) => supabase.auth.signOut()).catch(() => {});
    router.replace('/auth');
  };

  // NOTE: Value Estimator, Market Intelligence and Lead Snapshot are hidden until
  // their pages are built out — they were stubs (hit non-existent endpoints / "coming
  // soon") and a demo click would dead-end.
  const menuItems = [
    { id: 'discovery', label: 'Property Discovery', icon: Compass, href: '/discover' },
    { id: 'saved', label: 'Saved Property', icon: Bookmark, href: '/saved' },
  ];

  const closeMobile = () => setMobileOpen(false);
  const grouped = groupSessionsByDate(sessions);

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-3 z-40 w-11 h-11 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center border border-gray-100 dark:border-gray-700 active:scale-95 transition-all text-gray-700 dark:text-gray-200"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={closeMobile} />
      )}

      <div className={`
        w-72 md:w-80 text-gray-900 dark:text-gray-100 flex flex-col h-full border-r border-white/40 dark:border-gray-700 glass-surface
        fixed md:relative z-50 md:z-auto
        transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <button
          onClick={closeMobile}
          className="md:hidden absolute top-4 right-3 w-11 h-11 flex items-center justify-center text-gray-500 hover:text-gray-900"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>

        <div className="px-6 md:px-8 h-[88px] flex items-center border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 w-full justify-center lg:justify-start">
            <Image src="/images/logo/realtypals.png" alt="RealtyPals Logo" width={48} height={48} className="flex-shrink-0 drop-shadow-md scale-110 block dark:hidden" />
            <Image src="/images/logo/RealtyPals-logoWhite.png" alt="RealtyPals Logo" width={48} height={48} className="flex-shrink-0 drop-shadow-md scale-110 hidden dark:block" />
            <AnimatedText text="RealtyPals" className="py-0 flex-shrink-0" textClassName="font-bold text-xl tracking-wide dark:text-white" />
          </div>
        </div>

        <div className="p-4">
          <button
            onClick={() => {
              closeMobile();
              router.push('/discover');
            }}
            className="w-full bg-[#E6E6E6] dark:bg-gray-700 hover:bg-[#DEDEDE] dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border border-[#D0D0D0] dark:border-gray-600 shadow-sm"
          >
            <Plus size={20} />
            <span className="text-base">New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-2 font-semibold">Menu</div>
          <div className="space-y-0.5 mb-6">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
              <Link
                key={item.id}
                href={item.href}
                prefetch={true}
                onClick={(e) => {
                  if (pathname === item.href) {
                    e.preventDefault();
                    if (item.id === 'discovery') router.push('/discover');
                  }
                  closeMobile();
                  onViewChange?.(item.id as any);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 border group ${activeView === item.id
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-blue-500 shadow-[0_4px_12px_rgba(37,99,235,0.35)]'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:text-blue-600 dark:hover:text-blue-400 border-transparent hover:border-blue-100 dark:hover:border-blue-900/30'
                }`}
              >
                <div className={`w-8 h-8 flex items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110 ${activeView === item.id ? 'bg-white/20' : 'bg-transparent'}`}>
                  <Icon size={20} className={`transition-colors ${activeView === item.id ? 'text-white' : 'text-gray-500 group-hover:text-blue-500'}`} />
                </div>
                <span className={`text-sm font-semibold tracking-tight ${activeView === item.id ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>{item.label}</span>
              </Link>
              );
            })}
          </div>

          {(userId || guestToken) && (
            <div className="mb-6">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-2 font-semibold flex items-center justify-between">
                <span>Recent</span>
                {sessions.length > 0 && <span className="text-[10px] normal-case text-gray-400">double-click to rename</span>}
              </div>

              {sessionsLoading ? (
                <div className="space-y-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
                      <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex-shrink-0" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex-1" />
                    </div>
                  ))}
                </div>
              ) : sessionsError ? (
                <div className="px-3 py-2 text-[12px] text-red-400 dark:text-red-500">Couldn&apos;t load chats</div>
              ) : grouped.length === 0 ? (
                <div className="px-3 py-2 text-[12px] text-gray-400">No chats yet</div>
              ) : (
                <div className="space-y-3">
                  {grouped.map(({ label: groupLabel, items }) => (
                    <div key={groupLabel}>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider px-2 mb-1">{groupLabel}</div>
                      <div className="space-y-0.5">
                        {items.map((session) => (
                          <SessionItem
                            key={session.id}
                            session={session}
                            isActive={session.id === activeSessionId}
                            onDelete={deleteSession}
                            onRename={renameSession}
                            onClick={() => {
                              closeMobile();
                              // [TIMING]
                              const nt = (window as any).__navTimings
                              if (nt) {
                                nt.routerPush = performance.now()
                                console.log(`[NAV] 2. router.push      +${(nt.routerPush - nt.t0).toFixed(1)}ms`)
                              }
                              router.push(`/discover/${session.id}`);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {leadsToday !== null && leadsToday > 0 && (
          <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse flex-shrink-0" />
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">{leadsToday} lead{leadsToday !== 1 ? 's' : ''} captured today</span>
          </div>
        )}

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {userId ? (
            <button
              onClick={() => { handleLogout(); closeMobile(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-white/80 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-200"
            >
              <LogOut size={20} className="ml-1 opacity-70" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          ) : (
            <button
              onClick={() => { router.push('/auth'); closeMobile(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-200"
            >
              <LogOut size={20} className="ml-1 opacity-70 rotate-180" />
              <span className="text-sm font-medium">Sign in</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
