'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, RefreshCw, Home, ArrowLeft, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [showDetails, setShowDetails] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    // Auto-retry ChunkLoadErrors by hard-refreshing (once per session)
    if (error?.message?.includes('ChunkLoadError') || error?.message?.includes('Loading chunk')) {
      const reloadAttempts = sessionStorage.getItem('chunk_reload_attempts') ?? '0'
      if (parseInt(reloadAttempts) < 1) {
        sessionStorage.setItem('chunk_reload_attempts', String(parseInt(reloadAttempts) + 1))
        window.location.reload()
      }
      return
    }
    console.error('[AppRuntimeError]', error)
  }, [error])

  const handleReset = async () => {
    setIsRetrying(true)
    try {
      if ('caches' in window) {
        const names = await caches.keys()
        await Promise.all(names.map(name => caches.delete(name)))
      }
    } catch {
      // Ignore cache clearing errors
    }
    reset()
    setTimeout(() => setIsRetrying(false), 800)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F6F9] via-[#F8FAFC] to-[#F1F3F7] dark:from-[#090D16] dark:via-[#0E1320] dark:to-[#090D16] text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-hidden font-sans transition-colors">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 max-w-6xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            RP
          </div>
          <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            RealtyPals
          </span>
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Home</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-xl mx-auto w-full px-6 py-12 flex-1 flex flex-col items-center justify-center text-center">
        {/* Error Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm mb-5">
          <AlertCircle size={30} />
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold uppercase tracking-wider mb-3">
          <ShieldCheck size={13} className="text-blue-600 dark:text-blue-400" />
          <span>Session Recovery Active</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
          Unable to Load Section
        </h1>

        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-8 leading-relaxed font-normal">
          An unexpected interruption occurred while rendering this view. You can reload the component or return to the main discovery floor.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <button
            type="button"
            onClick={handleReset}
            disabled={isRetrying}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRetrying ? 'animate-spin' : ''} />
            <span>{isRetrying ? 'Reloading...' : 'Try Again'}</span>
          </button>

          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all flex items-center gap-2 shadow-2xs"
          >
            <Home size={14} />
            <span>Return Home</span>
          </Link>
        </div>

        {/* Collapsible Error Trace (Developer Details) */}
        {error?.message && (
          <div className="w-full max-w-lg mt-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
            >
              <span>{showDetails ? 'Hide technical trace' : 'View technical trace'}</span>
              {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {showDetails && (
              <div className="mt-3 p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-left font-mono text-[11px] text-slate-700 dark:text-slate-300 overflow-x-auto max-h-36 leading-relaxed">
                <span className="text-slate-500 font-bold block mb-1">Diagnostic Log:</span>
                {error.message}
                {error.digest && <span className="block text-slate-500 mt-1">Digest: {error.digest}</span>}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-6xl mx-auto w-full px-6 py-4 border-t border-slate-200/60 dark:border-slate-800/60 text-center text-xs text-slate-500 dark:text-slate-500">
        © 2026 RealtyPals · Verified Real Estate Intelligence
      </footer>
    </div>
  )
}

