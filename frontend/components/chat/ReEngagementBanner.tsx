'use client';

import { useState, useEffect } from 'react';
import { getReEngagement } from '@/lib/backend-api';
import { MessageSquare, ArrowRight, Plus } from 'lucide-react';

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
    <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 z-30 whitespace-nowrap">
      <span className="text-[13px] text-gray-600 dark:text-gray-300 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
        Resume: <span className="font-medium text-gray-900 dark:text-white truncate max-w-[150px]">{session.title || 'Previous search'}</span>
      </span>
      <button
        onClick={() => { setVisible(false); onResume(session.id); }}
        className="text-[13px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
      >
        Continue <ArrowRight className="w-3.5 h-3.5" />
      </button>
      <div className="w-px h-3 bg-gray-200 dark:bg-gray-700" />
      <button
        onClick={dismiss}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
