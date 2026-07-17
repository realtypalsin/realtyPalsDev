'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import DiscoveryContent from '@/components/DiscoveryContent';
import ChatErrorBoundary from '@/components/ChatErrorBoundary';
import { getSupabaseClient } from '@/lib/supabase';
import { migrateSessions } from '@/lib/backend-api';

function generateGuestToken(): string {
  return 'guest-' + crypto.randomUUID();
}

function getOrCreateGuestToken(): string {
  const GUEST_TOKEN_KEY = 'realtypals_guest_token';
  const OLD_KEY = 'guest_token';

  // Migrate old key if present
  let token = localStorage.getItem(GUEST_TOKEN_KEY);
  if (!token) {
    token = localStorage.getItem(OLD_KEY);
    if (token) {
      localStorage.setItem(GUEST_TOKEN_KEY, token);
      localStorage.removeItem(OLD_KEY);
    }
  }

  if (!token) {
    token = generateGuestToken();
    localStorage.setItem(GUEST_TOKEN_KEY, token);
  }
  return token;
}

export default function SessionDiscoverPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [userId, setUserId] = useState<string | null>(null);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(sessionId);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    // [TIMING]
    const nt = (window as any).__navTimings
    if (nt) {
      nt.pageMounted = performance.now()
      console.log(`[NAV] 3. page-mount       +${(nt.pageMounted - nt.t0).toFixed(1)}ms`)
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const cachedId = localStorage.getItem('user_id');
    if (cachedId) {
      setUserId(cachedId);
      setReady(true);
    } else {
      const token = getOrCreateGuestToken();
      setGuestToken(token);
      setReady(true);
    }

    getSupabaseClient().then((supabase) => {
      if (cancelled) return;

      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          const uid = data.session.user.id;
          localStorage.setItem('user_id', uid);
          setUserId(uid);
          setGuestToken(null);
        }
      }).catch(() => {});

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          const uid = session.user.id;
          const existingGuestToken = localStorage.getItem('guest_token');
          if (existingGuestToken) {
            migrateSessions(uid, existingGuestToken).catch(() => {}).finally(() => {
              localStorage.removeItem('guest_token');
            });
          }
          localStorage.setItem('user_id', uid);
          setUserId(uid);
          setGuestToken(null);
        } else {
          localStorage.removeItem('user_id');
          setUserId(null);
          const token = getOrCreateGuestToken();
          setGuestToken(token);
        }
      });

      unsubscribe = () => listener.subscription.unsubscribe();
    });

    return () => { cancelled = true; unsubscribe?.(); };
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-transparent">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-transparent overflow-hidden no-overscroll">
      <Sidebar 
        userId={userId} 
        guestToken={guestToken} 
        activeSessionId={activeSessionId} 
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <main className="flex-1 h-full flex flex-col min-h-0 overflow-hidden relative">
        <ChatErrorBoundary>
          <Suspense fallback={<div className="flex-1 flex items-center justify-center text-gray-500">Loading...</div>}>
            <DiscoveryContent
              key={activeSessionId ?? 'new'}
              initialSessionId={activeSessionId}
              userId={userId}
              guestToken={guestToken}
              onSessionChange={setActiveSessionId}
            />
          </Suspense>
        </ChatErrorBoundary>
      </main>
    </div>
  );
}
