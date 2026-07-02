import { useState, useEffect, useCallback } from 'react';
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

  const fetchSessions = useCallback(async () => {
    if (!userId && !guestToken) return;

    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE}/chat/session/list`;
      if (guestToken && !userId) url += `?guestToken=${guestToken}`;

      const res = await fetch(url, {
        headers: await authHeaders(),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error('Failed to load sessions');
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [userId, guestToken]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    const handler = () => fetchSessions();
    window.addEventListener('realtypals:session-updated', handler);
    return () => window.removeEventListener('realtypals:session-updated', handler);
  }, [fetchSessions]);

  const deleteSession = async (sessionId: string) => {
    // Optimistic UI
    const previous = [...sessions];
    setSessions((s) => s.filter((x) => x.id !== sessionId));
    LOCAL_SESSION_CACHE.delete(sessionId);
    
    try {
      const res = await fetch(`${API_BASE}/chat/session/${sessionId}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete session');
    } catch (err) {
      setSessions(previous); // Rollback
      throw err;
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
