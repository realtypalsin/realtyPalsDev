"use client";
import { Compass, Bookmark, PanelLeftClose, PanelLeftOpen, LogOut, SquarePen, Clock } from 'lucide-react';
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatSidebarGroupedSkeleton } from "@/components/skeletons";
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
    refreshSessions,
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
  }, []);  const closeMobile = () => setMobileOpen(false);
  const grouped = groupSessionsByDate(sessions);

  const handleFreshDiscovery = (e: React.MouseEvent) => {
    e.preventDefault();
    closeMobile();
    onViewChange?.('discovery');
    window.dispatchEvent(new CustomEvent('realtypals:new-chat'));
    router.push('/discover');
  };

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
        ${isCollapsed ? 'hidden md:flex w-[64px]' : 'w-64 md:w-[260px]'} 
        text-gray-900 dark:text-gray-100 flex flex-col h-full border-r border-gray-200/60 dark:border-gray-800/60 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl
        fixed md:relative z-50 md:z-auto shrink-0
        transition-all duration-300 ease-in-out overflow-hidden
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
      >
        {/* Header: Expanded vs Collapsed */}
        {!isCollapsed ? (
          <div className="h-14 flex items-center justify-between border-b border-gray-100/60 dark:border-gray-800/60 w-full px-3.5 shrink-0">
            <Link
              href="/discover"
              onClick={handleFreshDiscovery}
              className="flex items-center transition-opacity hover:opacity-80 cursor-pointer"
              title="Start fresh discovery"
            >
              <Image src="/images/icons/ExpandedRealtyPalsBlack.png" alt="RealtyPals Logo" width={136} height={30} className="object-contain block dark:hidden drop-shadow-xs" />
              <Image src="/images/icons/ExpandedRealtyPalsWhite.png" alt="RealtyPals Logo" width={136} height={30} className="object-contain hidden dark:block drop-shadow-xs" />
            </Link>
            <button
              onClick={() => {
                if (window.innerWidth < 768) closeMobile();
                else onToggleCollapse?.();
              }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={18} strokeWidth={1.8} />
            </button>
          </div>
        ) : (
          <div className="h-14 flex items-center justify-center border-b border-gray-100/60 dark:border-gray-800/60 w-full shrink-0 relative group">
            <button
              onClick={onToggleCollapse}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all relative"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              {/* Default RealtyPals Logo Mark */}
              <div className="flex items-center justify-center transition-opacity duration-200 group-hover:opacity-0 pointer-events-none">
                <Image
                  src="/images/icons/CollapsedRealtyPalsBlackSqLogo.png"
                  alt="RealtyPals Logo"
                  width={28}
                  height={28}
                  className="object-contain block dark:hidden drop-shadow-xs"
                />
                <Image
                  src="/images/icons/CollapsedRealtyPalsWhiteSqLogo.png"
                  alt="RealtyPals Logo"
                  width={28}
                  height={28}
                  className="object-contain hidden dark:block drop-shadow-xs"
                />
              </div>

              {/* Hover Expand Icon */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-zinc-700 dark:text-zinc-200 transition-opacity duration-200 pointer-events-none">
                <PanelLeftOpen size={18} strokeWidth={2} />
              </div>

              {/* Tooltip */}
              <span className="absolute left-full ml-2.5 px-2.5 py-1 bg-zinc-900 text-white text-[11px] font-medium rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100]">
                Expand sidebar
              </span>
            </button>
          </div>
        )}

        {/* New Chat Button */}
        {!isCollapsed ? (
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
              className="group flex items-center justify-between w-full py-2 px-3 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold rounded-xl transition-all duration-150 border border-zinc-200/80 dark:border-zinc-700/60 shadow-2xs active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 flex items-center justify-center rounded-md text-blue-600 dark:text-blue-400">
                  <SquarePen size={16} strokeWidth={2.2} />
                </div>
                <span className="text-[12.5px] tracking-tight">{isNavigating ? 'Opening...' : 'New chat'}</span>
              </div>
              <kbd className="inline-flex items-center justify-center h-4.5 px-1.5 text-[9.5px] font-mono text-zinc-400 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-700/80 shadow-2xs">
                Ctrl + N
              </kbd>
            </button>
          </div>
        ) : (
          <div className="px-3 py-3 w-full shrink-0 flex justify-center">
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
              className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shadow-xs transition-all hover:opacity-90 active:scale-95 group relative disabled:opacity-50 disabled:cursor-not-allowed"
              title="New chat"
            >
              <SquarePen size={17} strokeWidth={2.2} />
              <span className="absolute left-full ml-2.5 px-2.5 py-1 bg-zinc-900 text-white text-[11px] font-medium rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100]">
                New chat
              </span>
            </button>
          </div>
        )}
        
        {/* Menu Section */}
        {!isCollapsed ? (
          <div className="w-full shrink-0 px-3 pb-3">
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 px-2 font-bold">Menu</div>
            <div className="space-y-1 w-full">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    prefetch={true}
                    onClick={(e) => {
                      if (pathname === item.href && item.id === 'discovery') {
                        e.preventDefault();
                        router.push('/discover');
                      }
                      closeMobile();
                      onViewChange?.(item.id as any);
                    }}
                    className={`flex items-center w-full gap-2.5 px-3 py-2 rounded-xl transition-all duration-150 ${
                      isActive
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold shadow-2xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white font-medium'
                    }`}
                  >
                    <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} className={isActive ? 'text-white dark:text-zinc-900' : 'text-zinc-500 dark:text-zinc-400'} />
                    <span className="text-[12.5px] tracking-tight">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="px-3 space-y-1.5 w-full flex flex-col items-center">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  prefetch={true}
                  onClick={(e) => {
                    if (pathname === item.href && item.id === 'discovery') {
                      e.preventDefault();
                      router.push('/discover');
                    }
                    closeMobile();
                    onViewChange?.(item.id as any);
                  }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all group relative ${
                    isActive
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs'
                      : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span className="absolute left-full ml-2.5 px-2.5 py-1 bg-zinc-900 text-white text-[11px] font-medium rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100]">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Recent Chats Section (Only in Expanded mode) */}
        {!isCollapsed && (userId || guestToken) && (
          <>
            <div className="w-full shrink-0 px-3 pb-1.5 pt-1">
              <div className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-2 font-bold flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Clock size={11} strokeWidth={2} />
                  <span>Recent</span>
                </div>
                {sessions.length > 0 && (
                  <span className="text-[9px] normal-case font-normal text-zinc-400 dark:text-zinc-500">
                    double-click to edit
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto w-full px-3 transition-opacity duration-300">
              <div className="mb-6">
                {sessionsLoading ? (
                  <ChatSidebarGroupedSkeleton />
                ) : sessionsError ? (
                  <div className="px-3 py-2 text-[12px] text-gray-500 flex items-center justify-between">
                    <span>Couldn&apos;t load chats</span>
                    <button
                      onClick={() => refreshSessions()}
                      className="text-blue-500 hover:underline text-[11px] font-semibold ml-2"
                    >
                      Retry
                    </button>
                  </div>
                ) : grouped.length === 0 ? (
                  <div className="px-3 py-2 text-[12px] text-gray-400 dark:text-gray-500 font-medium">
                    No chats yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {grouped.map(({ label: groupLabel, items }) => (
                      <div key={groupLabel}>
                        <div className="flex items-center justify-between px-2 mb-1">
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                            {groupLabel}
                          </span>
                          <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                            {items.length}
                          </span>
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
            </div>
          </>
        )}

        {/* Lead banner */}
        {!isCollapsed && leadsToday !== null && leadsToday > 0 && (
          <div className="mt-auto mx-3 mb-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 flex items-center gap-2 whitespace-nowrap">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse flex-shrink-0" />
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">{leadsToday} lead{leadsToday !== 1 ? 's' : ''} captured today</span>
          </div>
        )}

        {/* Footer: User / Auth */}
        {!isCollapsed ? (
          <div className="p-3 border-t border-gray-100/60 dark:border-gray-800/60 shrink-0 w-full">
            {userId ? (
              <button
                onClick={() => { router.push('/account'); closeMobile(); }}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
              >
                <div className="w-8 h-8 flex items-center justify-center shrink-0 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-semibold text-sm">
                  F
                </div>
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="text-[12.5px] font-medium tracking-tight text-zinc-700 dark:text-zinc-200 truncate">My Account</span>
                  <LogOut 
                    size={14} 
                    strokeWidth={2} 
                    className="text-zinc-400 hover:text-red-500 transition-colors" 
                    onClick={(e) => { e.stopPropagation(); handleLogout(); closeMobile(); }}
                  />
                </div>
              </button>
            ) : (
              <button
                onClick={() => { router.push('/auth'); closeMobile(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors font-medium text-[12.5px]"
              >
                <LogOut size={16} strokeWidth={1.8} className="shrink-0 rotate-180" />
                <span className="tracking-tight">Sign in</span>
              </button>
            )}
          </div>
        ) : (
          <div className="mt-auto p-3 border-t border-gray-100/60 dark:border-gray-800/60 shrink-0 w-full flex justify-center">
            {userId ? (
              <div className="group relative">
                <button
                  onClick={() => { router.push('/account'); closeMobile(); }}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  F
                </button>
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-2.5 py-1 bg-zinc-900 text-white text-[11px] font-medium rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100]">
                  My Account
                </div>
              </div>
            ) : (
              <div className="group relative">
                <button
                  onClick={() => { router.push('/auth'); closeMobile(); }}
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
                  aria-label="Sign in"
                >
                  <LogOut size={17} strokeWidth={1.8} className="rotate-180" />
                </button>
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-2.5 py-1 bg-zinc-900 text-white text-[11px] font-medium rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100]">
                  Sign in
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
