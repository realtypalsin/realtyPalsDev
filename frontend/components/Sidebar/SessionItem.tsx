import { useState, useRef, useEffect, useMemo } from 'react';
import { MessageSquare, Check, X, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Session } from '@/hooks/useSessions';
import { toast } from 'sonner';

// Global PerformanceObserver instance — reused across all SessionItem clicks to avoid repeated creation
let globalPerfObserver: PerformanceObserver | null = null;
function getOrCreateObserver(): PerformanceObserver {
  if (globalPerfObserver) return globalPerfObserver;
  globalPerfObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const e = entry as PerformanceResourceTiming;
      if (e.name.includes('_rsc') || e.name.includes('discover')) {
        const nt = (window as any).__navTimings;
        if (nt && !nt.rscEnd) {
          nt.rscStart = e.startTime;
          nt.rscEnd = e.startTime + e.duration;
          if (process.env.NODE_ENV === 'development') {
            console.log(
              `[NAV] RSC fetch: start +${(e.startTime - nt.t0).toFixed(1)}ms` +
              ` | ttfb +${((e.startTime + (e as any).responseStart) - nt.t0).toFixed(1)}ms` +
              ` | duration ${e.duration.toFixed(1)}ms` +
              ` | end +${(nt.rscEnd - nt.t0).toFixed(1)}ms` +
              ` | url ${e.name.split('?')[0].split('/').slice(-2).join('/')}`
            );
          }
          globalPerfObserver?.disconnect();
          globalPerfObserver = null;
        }
      }
    }
  });
  return globalPerfObserver;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

interface SessionItemProps {
  session: Session;
  isActive: boolean;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, title: string) => Promise<void>;
  onClick: () => void;
}

export function SessionItem({ session, isActive, onDelete, onRename, onClick }: SessionItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(session.label);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  const submitRename = async () => {
    const title = renameValue.trim();
    if (!title || title === session.label) {
      setIsRenaming(false);
      return;
    }
    
    setIsProcessing(true);
    try {
      await onRename(session.id, title);
      toast.success('Chat renamed successfully');
    } catch (err) {
      toast.error('Failed to rename chat');
      setRenameValue(session.label); // reset on error
    } finally {
      setIsProcessing(false);
      setIsRenaming(false);
    }
  };

  const handleDelete = async () => {
    setIsProcessing(true);
    try {
      await onDelete(session.id);
      toast.success('Chat deleted');
    } catch (err) {
      toast.error('Failed to delete chat');
    } finally {
      setIsProcessing(false);
      setConfirmDelete(false);
    }
  };

  if (isRenaming) {
    return (
      <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/90 dark:bg-gray-800 border border-blue-200 dark:border-blue-700 shadow-sm">
        <MessageSquare size={14} className="text-blue-400 flex-shrink-0 ml-1" />
        <input
          ref={inputRef}
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitRename();
            if (e.key === 'Escape') setIsRenaming(false);
          }}
          disabled={isProcessing}
          className="flex-1 min-w-0 text-sm bg-transparent outline-none text-gray-900 dark:text-gray-100 disabled:opacity-50"
          maxLength={100}
        />
        <button onClick={submitRename} disabled={isProcessing} className="p-1 text-green-500 hover:text-green-600 transition-colors disabled:opacity-50">
          <Check size={13} />
        </button>
        <button onClick={() => setIsRenaming(false)} disabled={isProcessing} className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50">
          <X size={13} />
        </button>
      </div>
    );
  }

  if (confirmDelete) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <span className="text-xs text-red-600 dark:text-red-400 flex-1">Delete this chat?</span>
        <button
          onClick={handleDelete}
          disabled={isProcessing}
          className="px-2 py-0.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded font-medium transition-colors disabled:opacity-50"
        >
          {isProcessing ? '…' : 'Yes'}
        </button>
        <button onClick={() => setConfirmDelete(false)} disabled={isProcessing} className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700 rounded font-medium disabled:opacity-50">
          No
        </button>
      </div>
    );
  }

  return (
    <Link
      href={`/discover/${session.id}`}
      className={`group/session flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 ${
        isNavigating ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
      } border ${
        isActive
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300'
          : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-white/70 dark:hover:bg-gray-800/70 hover:border-gray-200 dark:hover:border-gray-700'
      }`}
      onClick={(e) => {
        if (isNavigating) {
          e.preventDefault();
          return;
        }

        setIsNavigating(true);
        if (navigationTimeoutRef.current) clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = setTimeout(() => setIsNavigating(false), 1000);

        // [TIMING] mark sidebar click as t0
        const t0 = performance.now()
        ;(window as any).__navTimings = { t0 }
        if (process.env.NODE_ENV === 'development') console.log('[NAV] 1. sidebar-click  t=0ms')

        // [TIMING] Reuse global observer to avoid repeated creation
        if (typeof PerformanceObserver !== 'undefined') {
          try {
            const obs = getOrCreateObserver()
            obs.observe({ type: 'resource', buffered: true })
          } catch (_) { /* unsupported */ }
        }

        // Call the parent onClick (which handles closeMobile)
        onClick();
      }}
      onDoubleClick={(e) => {
        e.preventDefault();
        if (!isNavigating) setIsRenaming(true);
      }}
    >
      <MessageSquare size={14} className={`flex-shrink-0 transition-colors ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover/session:text-gray-500'}`} />
      <span className="text-[13px] truncate flex-1 font-medium">{session.label}</span>
      <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0 opacity-0 group-hover/session:opacity-100 transition-opacity">
        {timeAgo(session.last_active)}
      </span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover/session:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsRenaming(true); }}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="Rename"
        >
          <Pencil size={11} />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(true); }}
          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors"
          title="Delete"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </Link>
  );
}
