'use client';

import { useState, useEffect } from 'react';
import { getReEngagement } from '@/lib/backend-api';

interface Props {
  userId?: string | null;
  guestToken?: string | null;
  onResume: (sessionId: string) => void;
  onDismiss: () => void;
}

interface ReEngagementSession {
  id: string;
  title: string | null;
  chat_phase: string;
  last_active: string;
}

export default function ReEngagementBanner({ userId, guestToken, onResume, onDismiss }: Props) {
  const [session, setSession] = useState<ReEngagementSession | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!userId && !guestToken) return;
    getReEngagement(userId ?? undefined, guestToken ?? undefined).then(({ session }) => {
      if (session) {
        setSession(session);
        setVisible(true);
      }
    }).catch(() => {});
  }, [userId, guestToken]);

  if (!visible || !session) return null;

  const dismiss = () => {
    setVisible(false);
    onDismiss();
  };

  const timeAgo = (() => {
    const ms = Date.now() - new Date(session.last_active).getTime();
    const hours = Math.floor(ms / 3600000);
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  })();

  return (
    <div className="mx-4 mt-3 mb-1 rounded-xl border border-blue-100 bg-blue-50/80 backdrop-blur-sm px-4 py-3 flex items-center gap-3 shadow-sm">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-900 leading-tight truncate">
          Welcome back! {session.title ? `"${session.title}"` : 'Continue your search'}
        </p>
        <p className="text-xs text-blue-600 mt-0.5">{timeAgo}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => { setVisible(false); onResume(session.id); }}
          className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          Continue
        </button>
        <button
          onClick={dismiss}
          className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1.5"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
