import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE } from '@/lib/env';
import { authHeaders } from '@/lib/authedFetch';
import { LOCAL_SESSION_CACHE } from '@/lib/sessionCache';

export interface Session {
  id: string;
  label: string;
  last_active: string;
}

export function useSessions(userId: string | null, guestToken?: string | null) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchSessionsRef = useRef<(() => Promise<void>) | null>(null);
  const mutationCountRef = useRef(0);

  const fetchSessions = useCallback(async () => {
    if (!userId && !guestToken) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE}/chat/session/list`;
      if (guestToken && !userId) url += `?guestToken=${guestToken}`;

      const res = await fetch(url, {
        headers: await authHeaders(),
        signal: abortControllerRef.current.signal,
      });
      if (!res.ok) throw new Error('Failed to load sessions');
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, guestToken]);

  // Keep ref in sync with latest fetchSessions
  fetchSessionsRef.current = fetchSessions;

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    const handleSessionUpdate = () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = setTimeout(() => {
        // Skip refresh if mutations are in flight (optimistic updates in progress)
        if (mutationCountRef.current > 0) {
          return;
        }
        fetchSessionsRef.current?.();
      }, 300);
    };

    window.addEventListener('realtypals:session-updated', handleSessionUpdate);
    return () => {
      window.removeEventListener('realtypals:session-updated', handleSessionUpdate);
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const deleteSession = async (sessionId: string) => {
    // Optimistic UI
    const previous = [...sessions];
    setSessions((s) => s.filter((x) => x.id !== sessionId));
    LOCAL_SESSION_CACHE.delete(sessionId);

    mutationCountRef.current++;
    try {
      const res = await fetch(`${API_BASE}/chat/session/${sessionId}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete session');
    } catch (err) {
      setSessions(previous); // Rollback
      throw err;
    } finally {
      mutationCountRef.current--;
    }
  };

  const renameSession = async (sessionId: string, title: string) => {
    // Optimistic UI
    const previous = [...sessions];
    setSessions((s) => s.map((x) => (x.id === sessionId ? { ...x, label: title } : x)));

    const cached = LOCAL_SESSION_CACHE.get(sessionId);
    if (cached) {
      cached.title = title;
      LOCAL_SESSION_CACHE.set(sessionId, cached);
    }

    mutationCountRef.current++;
    try {
      const res = await fetch(`${API_BASE}/chat/session/${sessionId}`, {
        method: 'PATCH',
        headers: await authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error('Failed to rename session');
    } catch (err) {
      setSessions(previous); // Rollback
      throw err;
    } finally {
      mutationCountRef.current--;
    }
  };

  return {
    sessions,
    loading,
    error,
    deleteSession,
    renameSession,
    refreshSessions: fetchSessions,
  };
}
