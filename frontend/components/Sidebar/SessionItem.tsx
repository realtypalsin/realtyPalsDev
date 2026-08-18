import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Check, X, Pencil, Trash2, Search, Building2, Scale, IndianRupee } from 'lucide-react';
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
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return '1d';
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getSessionIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes('compare') || l.includes(' vs ') || l.includes('versus')) {
    return Scale;
  }
  if (l.includes('price') || l.includes('budget') || l.includes('cost') || l.includes('emi') || l.includes('cr') || l.includes('lakh')) {
    return IndianRupee;
  }
  if (l.includes('elite') || l.includes('county') || l.includes('lotus') || l.includes('godrej') || l.includes('ace') || l.includes('towers') || l.includes('heights') || l.includes('greens') || l.includes('project')) {
    return Building2;
  }
  if (l.includes('find') || l.includes('search') || l.includes('show') || l.includes('bhk') || l.includes('sector')) {
    return Search;
  }
  return MessageSquare;
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
    } catch {
      toast.error('Failed to rename chat');
      setRenameValue(session.label);
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
    } catch {
      toast.error('Failed to delete chat');
    } finally {
      setIsProcessing(false);
      setConfirmDelete(false);
    }
  };

  const IconComponent = getSessionIcon(session.label);

  if (isRenaming) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-blue-500 shadow-sm">
        <IconComponent size={13} className="text-blue-500 flex-shrink-0" />
        <input
          ref={inputRef}
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitRename();
            if (e.key === 'Escape') setIsRenaming(false);
          }}
          disabled={isProcessing}
          className="flex-1 min-w-0 text-xs bg-transparent outline-none text-zinc-900 dark:text-zinc-100 disabled:opacity-50 font-medium"
          maxLength={100}
        />
        <button onClick={submitRename} disabled={isProcessing} className="p-1 text-emerald-600 hover:text-emerald-700 transition-colors disabled:opacity-50">
          <Check size={13} />
        </button>
        <button onClick={() => setIsRenaming(false)} disabled={isProcessing} className="p-1 text-zinc-400 hover:text-zinc-600 transition-colors disabled:opacity-50">
          <X size={13} />
        </button>
      </div>
    );
  }

  if (confirmDelete) {
    return (
      <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 shadow-2xs">
        <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 truncate">Delete chat?</span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleDelete}
            disabled={isProcessing}
            className="px-2 py-0.5 text-[10px] bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition-colors disabled:opacity-50"
          >
            {isProcessing ? '…' : 'Delete'}
          </button>
          <button onClick={() => setConfirmDelete(false)} disabled={isProcessing} className="px-1.5 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 rounded font-medium disabled:opacity-50">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/discover/${session.id}`}
      className={`group/session relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-colors duration-150 ${
        isNavigating ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
      } ${
        isActive
          ? 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs'
          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium'
      }`}
      onClick={(e) => {
        if (isNavigating) {
          e.preventDefault();
          return;
        }

        setIsNavigating(true);
        if (navigationTimeoutRef.current) clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = setTimeout(() => {
          setIsNavigating(false);
          navigationTimeoutRef.current = null;
        }, 1000);

        // [TIMING] mark sidebar click as t0
        const t0 = performance.now()
        ;(window as any).__navTimings = { t0 }
        if (process.env.NODE_ENV === 'development') console.log('[NAV] 1. sidebar-click  t=0ms')

        if (typeof PerformanceObserver !== 'undefined') {
          try {
            const obs = getOrCreateObserver()
            obs.observe({ type: 'resource', buffered: true })
          } catch { /* unsupported */ }
        }

        onClick();
      }}
      onDoubleClick={(e) => {
        e.preventDefault();
        if (!isNavigating) setIsRenaming(true);
      }}
    >
      <IconComponent
        size={14}
        className={`flex-shrink-0 transition-colors ${
          isActive ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400 dark:text-zinc-500 group-hover/session:text-zinc-700 dark:group-hover/session:text-zinc-300'
        }`}
      />
      <span className="text-[12.5px] truncate flex-1 leading-snug tracking-tight">
        {session.label}
      </span>

      {/* Right Slot: fixed width 48px, zero layout shift or glitching */}
      <div className="w-12 h-5 flex items-center justify-end flex-shrink-0 relative">
        <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 transition-opacity duration-150 group-hover/session:opacity-0 absolute right-0">
          {timeAgo(session.last_active)}
        </span>
        <div className="opacity-0 group-hover/session:opacity-100 transition-opacity duration-150 flex items-center gap-0.5 absolute right-0 bg-zinc-100/90 dark:bg-zinc-800/90 backdrop-blur-xs pl-1 rounded">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsRenaming(true); }}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            title="Rename"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(true); }}
            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950 text-zinc-400 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </Link>
  );
}

