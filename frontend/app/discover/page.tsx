'use client';

import { useState, useEffect, Suspense } from 'react';
import Sidebar from '@/components/Sidebar';
import DiscoveryContent from '@/components/DiscoveryContent';
import { createClient } from '@/lib/supabase';

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

  useEffect(() => {
    const supabase = createClient();

    // Check for existing cached user immediately
    const cachedId = localStorage.getItem('user_id');
    if (cachedId) {
      setUserId(cachedId);
      setReady(true);
    } else {
      // Set up as guest immediately — don't block on auth
      const token = getOrCreateGuestToken();
      setGuestToken(token);
      setReady(true);
    }

    // Validate/upgrade in background
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const uid = data.session.user.id;
        localStorage.setItem('user_id', uid);
        setUserId(uid);
        setGuestToken(null);
      }
    }).catch(() => {
      // Keep guest token on auth failure — don't redirect
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const uid = session.user.id;
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

    return () => listener.subscription.unsubscribe();
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-[#E6E6E6]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-[#E6E6E6] overflow-hidden no-overscroll">
      <Sidebar userId={userId} />
      <main className="flex-1 h-full flex flex-col min-h-0 overflow-hidden relative">
        <Suspense fallback={<div className="flex-1 flex items-center justify-center text-gray-500">Loading...</div>}>
          <DiscoveryContent userId={userId} guestToken={guestToken} />
        </Suspense>
      </main>
    </div>
  );
}
