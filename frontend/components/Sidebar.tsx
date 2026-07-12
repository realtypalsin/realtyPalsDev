<<<<<<< HEAD
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { Map, Users } from 'lucide-react';
import Link from 'next/link';
import { AnimatedText } from '@/components/ui/animated-shiny-text';
import { createClient } from '@/lib/supabase';
import { API_BASE } from '@/lib/env';

interface SidebarProps {
  activeView?: 'discovery' | 'saved' | 'compare' | 'value-estimator' | 'market-intelligence' | 'lead-snapshot';
  onViewChange?: (view: 'discovery' | 'saved' | 'compare' | 'value-estimator' | 'market-intelligence' | 'lead-snapshot') => void;
  userId: string | null;
}

export default function Sidebar({ activeView: activeViewProp, onViewChange, userId }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [recentSessions, setRecentSessions] = useState<{ id: string; label: string }[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [leadsToday, setLeadsToday] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    setSessionsLoading(true);
    fetch(`${API_BASE}/chat/session/list`, {
      headers: { 'X-User-Id': userId },
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setRecentSessions(data.sessions ?? []))
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setRecentSessions([]);
      })
      .finally(() => setSessionsLoading(false));
    return () => controller.abort();
  }, [userId]);

  useEffect(() => {
    fetch(`${API_BASE}/leads/count`)
      .then(r => r.json())
      .then((d: { count: number }) => setLeadsToday(d.count ?? null))
      .catch(() => {})
  }, [])

  const routeToView: Record<string, 'discovery' | 'saved' | 'compare' | 'value-estimator' | 'market-intelligence' | 'lead-snapshot'> = {
    '/discover': 'discovery',
    '/saved': 'saved',
    '/compare': 'compare',
    '/value-estimator': 'value-estimator',
    '/market-intelligence': 'market-intelligence',
    '/lead-snapshot': 'lead-snapshot',
  };
  const activeView = routeToView[pathname ?? ''] ?? activeViewProp ?? 'discovery';

  const handleLogout = () => {
    localStorage.removeItem('user_id');
    router.push('/auth');
    createClient().auth.signOut().catch(() => {});
  };


  const menuItems = [
    { id: 'discovery', label: 'Property Discovery', icon: '/images/icons/property-discover.svg', href: '/discover' },
    { id: 'saved', label: 'Saved Property', icon: '/images/icons/saved-property.svg', href: '/saved' },
    { id: 'compare', label: 'Compare', icon: '/images/icons/compare.svg', href: '/compare' },
    { id: 'value-estimator', label: 'Value Estimator', icon: '/images/icons/value-estimator.svg', href: '/value-estimator' },
    { id: 'market-intelligence', label: 'Market Intelligence', icon: <Map size={24} />, href: '/market-intelligence' },
    { id: 'lead-snapshot', label: 'Lead Snapshot', icon: <Users size={24} />, href: '/lead-snapshot' },
  ];

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* Mobile hamburger toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-3 z-40 w-11 h-11 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center border border-gray-100 dark:border-gray-700 active:scale-95 transition-all text-gray-700 dark:text-gray-200"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={closeMobile} />
      )}

      <div className={`
        w-72 md:w-80 text-gray-900 dark:text-gray-100 flex flex-col h-full border-r border-white/40 dark:border-gray-700 glass-surface
        fixed md:relative z-50 md:z-auto
        transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Mobile close button */}
        <button
          onClick={closeMobile}
          className="md:hidden absolute top-4 right-3 w-11 h-11 flex items-center justify-center text-gray-500 hover:text-gray-900"
          aria-label="Close menu"
        >
          ✕
        </button>

        {/* Logo - exact height aligned with header (88px) for flush border */}
        <div className="px-6 md:px-8 h-[88px] flex items-center border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 w-full justify-center lg:justify-start">
            <Image
              src="/images/logo/realtypals.png"
              alt="RealtyPal Logo"
              width={48}
              height={48}
              className="flex-shrink-0 drop-shadow-md scale-110"
            />
            <AnimatedText
              text="RealtyPal"
              className="py-0 flex-shrink-0"
              textClassName="font-bold text-xl tracking-wide dark:text-white"
            />
          </div>
        </div>

        {/* New Chat */}
        <div className="p-4">
          <button
            onClick={() => {
              closeMobile();
              if (activeView === 'discovery' && typeof window !== 'undefined' && (window as any).__resetDiscoveryChat && typeof (window as any).__resetDiscoveryChat === 'function') {
                (window as any).__resetDiscoveryChat();
              } else {
                router.push('/discover?new=1');
              }
            }}
            className="w-full bg-[#E6E6E6] hover:bg-[#DEDEDE] text-gray-900 font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border border-[#D0D0D0] shadow-sm"
          >
            <Image src="/images/icons/add.svg" alt="Add" width={20} height={20} className="grayscale" />
            <span className="text-base">New Chat</span>
          </button>
        </div>

        {/* Menu Section */}
        <div className="flex-1 overflow-y-auto px-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-4 font-medium">Menu</div>
          <div className="space-y-1 mb-6">
            {menuItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                prefetch={true}
                onClick={(e) => {
                  // If we're already on this page, don't trigger a full reload
                  if (pathname === item.href) {
                    e.preventDefault();
                    if (item.id === 'discovery' && typeof window !== 'undefined' && (window as any).__resetDiscoveryChat) {
                      (window as any).__resetDiscoveryChat();
                    }
                  }
                  closeMobile();
                  onViewChange?.(item.id as any);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 border group ${activeView === item.id
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-blue-500 shadow-[0_5px_15px_rgba(37,99,235,0.4)] scale-[1.02] z-10'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:text-blue-600 dark:hover:text-blue-400 border-transparent hover:border-blue-100 dark:hover:border-blue-900/30'
                  }`}
              >
                {/* Icon wrapper with subtle scale animation */}
                <div className={`p-1.5 rounded-lg transition-transform duration-300 group-hover:scale-110 ${activeView === item.id ? 'bg-white/20' : 'bg-transparent'}`}>
                  {typeof item.icon === 'string' ? (
                    <Image
                      src={item.icon}
                      alt=""
                      width={22}
                      height={22}
                      className={`flex-shrink-0 transition-all duration-300 ${activeView === item.id ? 'brightness-0 invert' : 'grayscale group-hover:grayscale-0'}`}
                    />
                  ) : (
                    <div className={`flex-shrink-0 transition-colors duration-300 ${activeView === item.id ? 'text-white' : 'text-gray-500 group-hover:text-blue-500'}`}>
                      {item.icon}
                    </div>
                  )}
                </div>
                <span className={`text-sm font-semibold tracking-tight transition-colors ${activeView === item.id ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                  {item.label}
                </span>
              </Link>
            ))}
          </div>

          {userId && (
            <div className="mb-6">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-4 font-medium">Recent</div>
              <div className="space-y-1">
                {sessionsLoading ? (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg">
                      <div className="w-5 h-5 bg-gray-200 rounded animate-pulse flex-shrink-0" />
                      <div className="h-3 bg-gray-200 rounded animate-pulse flex-1" />
                    </div>
                  ))
                ) : recentSessions.length === 0 ? (
                  <div className="px-4 py-2 text-[12px] text-gray-400">No chats yet</div>
                ) : (
                  recentSessions.map((session) => (
                    <Link
                      key={session.id}
                      href={`/discover?session=${session.id}`}
                      onClick={closeMobile}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-white/80 hover:text-blue-600 border border-transparent hover:border-blue-100 transition-all duration-200 group"
                    >
                      <Image
                        src="/images/icons/recent.svg"
                        alt=""
                        width={18}
                        height={18}
                        className="flex-shrink-0 grayscale group-hover:grayscale-0 opacity-60 group-hover:opacity-100 transition-all"
                      />
                      <span className="text-sm truncate">{session.label}</span>
                    </Link>
                  ))
                )}
              </div>
=======
"use client";
import { MessageSquarePlus, Compass, Bookmark, PanelLeftClose, PanelLeftOpen, LogOut, MoreHorizontal, Check, Pen, Trash2, Plus, MessageSquare, SquarePen, Clock, User } from 'lucide-react';
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AnimatedText } from "@/components/ui/animated-shiny-text";
import { getSupabaseClient } from "@/lib/supabase";
import { API_BASE } from "@/lib/env";
import { useSessions, Session } from "@/hooks/useSessions";
import { SessionItem } from "@/components/Sidebar/SessionItem";
import { authHeaders } from "@/lib/authedFetch";

interface SidebarProps {
  activeView?:
    | "discovery"
    | "saved"
    | "compare"
    | "value-estimator"
    | "market-intelligence"
    | "lead-snapshot";
  onViewChange?: (
    view:
      | "discovery"
      | "saved"
      | "compare"
      | "value-estimator"
      | "market-intelligence"
      | "lead-snapshot",
  ) => void;
  userId: string | null;
  guestToken?: string | null;
  activeSessionId?: string | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

function groupSessionsByDate(
  sessions: Session[],
): { label: string; items: Session[] }[] {
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const yesterday = today - 86400000;
  const sevenDaysAgo = today - 6 * 86400000;
  const thirtyDaysAgo = today - 29 * 86400000;

  const groups: Record<string, Session[]> = {
    Today: [],
    Yesterday: [],
    "Previous 7 Days": [],
    "Previous 30 Days": [],
    Older: [],
  };

  for (const s of sessions) {
    const t = new Date(s.last_active).getTime();
    if (t >= today) groups["Today"].push(s);
    else if (t >= yesterday) groups["Yesterday"].push(s);
    else if (t >= sevenDaysAgo) groups["Previous 7 Days"].push(s);
    else if (t >= thirtyDaysAgo) groups["Previous 30 Days"].push(s);
    else groups["Older"].push(s);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

export default function Sidebar({
  activeView: activeViewProp,
  onViewChange,
  userId,
  guestToken,
  activeSessionId,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [leadsToday, setLeadsToday] = useState<number | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    sessions,
    loading: sessionsLoading,
    error: sessionsError,
    deleteSession,
    renameSession,
  } = useSessions(userId, guestToken);

  useEffect(() => {
    if (!userId) return;
    authHeaders()
      .then((headers) => fetch(`${API_BASE}/leads/count`, { headers }))
      .then((r) => r.json())
      .then((d: { count: number }) => setLeadsToday(d.count ?? null))
      .catch(() => {});
  }, [userId]);

  const routeToView: Record<string, any> = {
    "/discover": "discovery",
    "/saved": "saved",
    "/compare": "compare",
    "/value-estimator": "value-estimator",
    "/market-intelligence": "market-intelligence",
    "/lead-snapshot": "lead-snapshot",
  };
  const activeView =
    routeToView[pathname ?? ""] ?? activeViewProp ?? "discovery";

  const handleLogout = () => {
    // Navigate instantly (client-side) — don't block on a full page reload or the
    // network sign-out call. Clear local state, fire sign-out in the background.
    localStorage.removeItem("user_id");
    getSupabaseClient()
      .then((supabase) => supabase.auth.signOut())
      .catch(() => {});
    router.replace("/auth");
  };

  // NOTE: Value Estimator, Market Intelligence and Lead Snapshot are hidden until
  // their pages are built out — they were stubs (hit non-existent endpoints / "coming
  // soon") and a demo click would dead-end.
  const menuItems = [
    {
      id: "discovery",
      label: "Property Discovery",
      icon: Compass,
      href: "/discover",
    },
    { id: "saved", label: "Saved Property", icon: Bookmark, href: "/saved" },
  ];

  useEffect(() => {
    let touchStartX = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].screenX;
      if (touchEndX - touchStartX > 80 && touchStartX < 30) {
        setMobileOpen(true);
      } else if (touchStartX - touchEndX > 80) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const closeMobile = () => setMobileOpen(false);
  const grouped = groupSessionsByDate(sessions);

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 w-10 h-10 flex items-center justify-center active:scale-95 transition-all text-gray-700 dark:text-gray-200"
        aria-label="Open menu"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8h16M4 16h16"
          />
        </svg>
      </button>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={closeMobile}
        />
      )}

      <div
        className={`
        ${isCollapsed ? 'hidden md:flex w-[68px]' : 'w-64 md:w-[260px]'} 
        text-gray-900 dark:text-gray-100 flex flex-col h-full border-r border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl
        fixed md:relative z-50 md:z-auto shrink-0
        transition-all duration-300 ease-in-out overflow-hidden
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
      >
        <div className="group h-14 flex items-center justify-center border-b border-gray-100/50 dark:border-gray-800/50 w-full px-3 shrink-0 relative">
          {!isCollapsed ? (
            <>
              <div className="flex flex-1 items-center justify-center transition-opacity duration-300">
                <Image src="/images/icons/ExpandedRealtyPalsBlack.png" alt="RealtyPals Logo" width={140} height={32} className="object-contain block dark:hidden drop-shadow-sm" />
                <Image src="/images/icons/ExpandedRealtyPalsWhite.png" alt="RealtyPals Logo" width={140} height={32} className="object-contain hidden dark:block drop-shadow-sm" />
              </div>
              <div className="absolute right-3 flex items-center justify-center">
                <button
                  onClick={() => {
                    if (window.innerWidth < 768) closeMobile();
                    else onToggleCollapse?.();
                  }}
                  className="p-2 rounded-lg text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                  title="Close sidebar"
                >
                  <PanelLeftClose size={20} strokeWidth={1.5} />
                </button>
              </div>
            </>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-200 group-hover:opacity-0 pointer-events-none">
                <Image src="/images/icons/CollapsedRealtyPalsBlackSqLogo.png" alt="RealtyPals Logo" width={32} height={32} className="object-contain block dark:hidden drop-shadow-sm" />
                <Image src="/images/icons/CollapsedRealtyPalsWhiteSqLogo.png" alt="RealtyPals Logo" width={32} height={32} className="object-contain hidden dark:block drop-shadow-sm" />
              </div>
              <button
                onClick={onToggleCollapse}
                className="absolute inset-0 m-auto w-10 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-lg text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-200"
                title="Open sidebar"
              >
                <PanelLeftOpen size={20} strokeWidth={1.5} />
              </button>
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
            </div>
          )}
        </div>

<<<<<<< HEAD
        {/* Leads today badge */}
        {leadsToday !== null && leadsToday > 0 && (
          <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse flex-shrink-0" />
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              {leadsToday} lead{leadsToday !== 1 ? 's' : ''} captured today
            </span>
          </div>
        )}

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-300">
          <button
            onClick={() => { handleLogout(); closeMobile(); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-300 transition-all duration-200"
          >
            <Image src="/images/icons/logout.svg" alt="" width={24} height={24} className="flex-shrink-0 grayscale" />
            <span className="text-base">Logout</span>
          </button>
=======
        <div className="p-3 w-full shrink-0">
          <button
            onClick={() => {
              if (isNavigating) return;
              setIsNavigating(true);
              if (navigationTimeoutRef.current) clearTimeout(navigationTimeoutRef.current);
              closeMobile();
              navigationTimeoutRef.current = setTimeout(() => setIsNavigating(false), 1000);
              window.dispatchEvent(new CustomEvent('realtypals:new-chat'));
              router.push('/discover');
            }}
            disabled={isNavigating}
            className={`group flex items-center justify-center bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-all duration-200 border border-transparent shadow-none disabled:opacity-50 disabled:cursor-not-allowed ${isCollapsed ? 'w-10 h-10 mx-auto p-0' : 'w-full py-2 px-3 justify-between'}`}
            title={isCollapsed ? "New chat" : undefined}
          >
            {isCollapsed ? (
              <SquarePen size={20} strokeWidth={1.5} className="text-gray-600 dark:text-gray-300" />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 flex items-center justify-center bg-transparent rounded-md text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    <SquarePen size={18} strokeWidth={2} />
                  </div>
                  <span className="text-[13px] tracking-wide">{isNavigating ? 'Creating...' : 'New chat'}</span>
                </div>
                <kbd className="hidden group-hover:inline-flex items-center justify-center h-5 px-1.5 text-[10px] font-medium font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                  Ctrl + N
                </kbd>
              </>
            )}
          </button>
        </div>
        
        {/* Fixed Menu Section */}
        <div className="w-full shrink-0 px-3 pb-4">
          {!isCollapsed && <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-2 px-3 font-semibold mt-1">Menu</div>}
          <div className="space-y-1 w-full">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
              <div key={item.id} className="relative group/navitem flex justify-center">
                <Link
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
                  className={`flex items-center transition-all duration-200 overflow-hidden whitespace-nowrap ${isCollapsed ? 'w-10 h-10 rounded-xl justify-center' : 'w-full gap-2.5 px-3 py-2 rounded-[14px]'} ${
                    isActive
                      ? 'bg-blue-600 dark:bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon size={18} strokeWidth={isActive ? 2 : 1.5} className={isActive ? 'text-white' : 'text-gray-500 group-hover/navitem:text-gray-700 dark:text-gray-400 dark:group-hover/navitem:text-gray-200'} />
                  {!isCollapsed && <span className={`text-[14px] font-medium tracking-wide ${isActive ? 'text-white' : ''}`}>{item.label}</span>}
                </Link>
              </div>
              );
            })}
          </div>
        </div>

        {/* Fixed Recent Chats Header */}
        {!isCollapsed && (userId || guestToken) && (
          <div className="w-full shrink-0 px-3 pb-2 pt-2">
            <div className="text-[11px] text-gray-500 uppercase tracking-wider px-3 font-semibold flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock size={12} strokeWidth={2} />
                <span>Recent</span>
              </div>
              {sessions.length > 0 && (
                <span className="text-[9px] normal-case font-medium text-gray-400 opacity-70">
                  double-click to rename
                </span>
              )}
            </div>
          </div>
        )}

        {/* Scrollable Recent Chats Section */}
        <div className={`flex-1 overflow-y-auto w-full scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 px-3 transition-opacity duration-300 ${isCollapsed ? 'opacity-0 pointer-events-none hidden' : 'opacity-100 block'}`}>

          <div>
            {(userId || guestToken) && (
              <div className="mb-6">
                {sessionsLoading ? (
                  <div className="space-y-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      >
                        <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex-shrink-0" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex-1" />
                      </div>
                    ))}
                  </div>
                ) : sessionsError ? (
                  <div className="px-3 py-2 text-[12px] text-red-400 dark:text-red-500">
                    Couldn&apos;t load chats
                  </div>
                ) : grouped.length === 0 ? (
                  <div className="px-3 py-2 text-[12px] text-gray-400">
                    No chats yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {grouped.map(({ label: groupLabel, items }) => (
                      <div key={groupLabel}>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider px-2 mb-1">
                          {groupLabel}
                        </div>
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
        </div>

        <div className="mt-auto">
          {leadsToday !== null && leadsToday > 0 && (
            <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 flex items-center gap-2 whitespace-nowrap">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse flex-shrink-0" />
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">{leadsToday} lead{leadsToday !== 1 ? 's' : ''} captured today</span>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-gray-100/50 dark:border-gray-800/50 shrink-0 w-full">
          {userId ? (
            <div className="group relative">
              <button
                className={`w-full flex items-center gap-2.5 rounded-xl transition-all duration-200 overflow-hidden ${isCollapsed ? 'justify-center p-0 w-10 h-10 mx-auto' : 'justify-start px-2 py-2 hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                <div className="w-8 h-8 flex items-center justify-center shrink-0 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-semibold text-sm">
                  F
                </div>
                {!isCollapsed && (
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <span className="text-[13px] font-medium tracking-wide text-gray-700 dark:text-gray-200 truncate">My Account</span>
                    <LogOut 
                      size={14} 
                      strokeWidth={2} 
                      className="text-gray-400 hover:text-red-500 transition-colors" 
                      onClick={(e) => { e.stopPropagation(); handleLogout(); closeMobile(); }}
                    />
                  </div>
                )}
              </button>
              {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 py-1.5 px-2 bg-gray-900 text-white text-[11px] font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100]">
                  My Account
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => { router.push('/auth'); closeMobile(); }}
              className={`w-full flex items-center gap-2.5 rounded-xl transition-all duration-200 overflow-hidden text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200 ${isCollapsed ? 'justify-center p-0 w-10 h-10 mx-auto' : 'justify-start px-3 py-2'}`}
              title={isCollapsed ? "Sign in" : undefined}
            >
              <LogOut size={18} strokeWidth={1.5} className="shrink-0 rotate-180" />
              {!isCollapsed && <span className="text-[13px] font-medium tracking-wide">Sign in</span>}
            </button>
          )}
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
        </div>
      </div>
    </>
  );
}
