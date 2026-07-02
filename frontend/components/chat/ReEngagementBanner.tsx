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
    <div className="mx-4 mt-3 mb-1 rounded-xl border border-blue-200/60 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 backdrop-blur-md p-4 flex items-center gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="h-10 w-10 rounded-full bg-blue-100/80 flex items-center justify-center shrink-0 text-blue-600">
        <MessageSquare className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 leading-tight truncate">
          Welcome back! {session.title ? <span className="font-medium text-slate-600">&quot;{session.title}&quot;</span> : <span className="font-medium text-slate-600">Continue your search</span>}
        </p>
        <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          Last active {timeAgo}
        </p>
      </div>
      <div className="flex gap-2.5 shrink-0">
        <button
          onClick={dismiss}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200 px-3 py-2 rounded-lg transition-all hover:shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Start new
        </button>
        <button
          onClick={() => { setVisible(false); onResume(session.id); }}
          className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-2 rounded-lg transition-all hover:shadow-md hover:-translate-y-0.5"
        >
          Continue Chat
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
