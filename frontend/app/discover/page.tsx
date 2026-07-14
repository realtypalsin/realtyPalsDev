'use client';

import { useState, useEffect, Suspense } from 'react';
import Sidebar from '@/components/Sidebar';
import DiscoveryContent from '@/components/DiscoveryContent';
import ChatErrorBoundary from '@/components/ChatErrorBoundary';
import { getSupabaseClient } from '@/lib/supabase';
import { migrateSessions } from '@/lib/backend-api';

function generateGuestToken(): string {
  return 'guest-' + crypto.randomUUID()
}

function getOrCreateGuestToken(): string {
  let token = localStorage.getItem('guest_token')
  if (!token) {
    token = generateGuestToken()
    localStorage.setItem('guest_token', token)
  }
  return token
}

export default function DiscoverPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    try {
      const cachedId = localStorage.getItem('user_id');
      if (cachedId) {
        setUserId(cachedId);
        setReady(true);
      } else {
        const token = getOrCreateGuestToken();
        setGuestToken(token);
        setReady(true);
      }
    } catch (err) {
      console.warn('Storage access failed, initializing without tokens', err);
      setReady(true);
    }

    getSupabaseClient().then((supabase) => {
      if (cancelled) return;

      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          const uid = data.session.user.id;
          const existingGuestToken = typeof window !== 'undefined' ? localStorage.getItem('guest_token') : null;
          if (existingGuestToken) {
            migrateSessions(uid, existingGuestToken).catch(() => {}).finally(() => {
              try { localStorage.removeItem('guest_token'); } catch {}
            });
          }
          try { localStorage.setItem('user_id', uid); } catch {}
          setUserId(uid);
          setGuestToken(null);
        } else {
          try { localStorage.removeItem('user_id'); } catch {}
          setUserId(null);
          try {
            const token = getOrCreateGuestToken();
            setGuestToken(token);
          } catch {}
        }
      }).catch(console.error);

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const uid = session.user.id;
          const existingGuestToken = typeof window !== 'undefined' ? localStorage.getItem('guest_token') : null;
          if (existingGuestToken) {
            migrateSessions(uid, existingGuestToken).catch(() => {}).finally(() => {
              try { localStorage.removeItem('guest_token'); } catch {}
            });
          }
          try { localStorage.setItem('user_id', uid); } catch {}
          setUserId(uid);
          setGuestToken(null);
        } else {
          try { localStorage.removeItem('user_id'); } catch {}
          setUserId(null);
          try {
            const token = getOrCreateGuestToken();
            setGuestToken(token);
          } catch {}
        }
      });

      unsubscribe = () => listener.subscription.unsubscribe();
    }).catch(console.error);

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
          <Suspense fallback={<div className="flex-1 flex items-center justify-center text-gray-500">Opening your advisor…</div>}>
            <DiscoveryContent 
              key="new" 
              initialSessionId={null} 
              userId={userId} 
              guestToken={guestToken} 
              onSessionChange={setActiveSessionId} 
              isSidebarCollapsed={isSidebarCollapsed} 
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />
          </Suspense>
        </ChatErrorBoundary>

      </main>
    </div>
  );
}
