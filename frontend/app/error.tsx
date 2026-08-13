'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home, ArrowLeft, ShieldAlert } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-rose-500 selection:text-white relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform">
            RP
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-rose-400 transition-colors">
            RealtyPals
          </span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-2xl mx-auto w-full px-6 py-12 flex-1 flex flex-col items-center justify-center text-center">
        
        {/* Error Icon Badge */}
        <div className="w-20 h-20 rounded-3xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-500 shadow-2xl mb-6 animate-in fade-in zoom-in duration-200">
          <AlertTriangle size={36} />
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-950/40 border border-rose-800/40 text-rose-400 text-xs font-extrabold uppercase tracking-wider mb-4">
          <ShieldAlert size={14} />
          <span>Application Error (500)</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
          Something Went Wrong
        </h1>
        
        <p className="text-sm sm:text-base text-zinc-400 max-w-md mb-8 leading-relaxed font-medium">
          An unexpected error occurred while loading this page. Our team has been notified, or you can try reloading the section.
        </p>

        {/* Development Error Snippet */}
        {process.env.NODE_ENV === 'development' && error?.message && (
          <div className="w-full mb-8 text-left bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 text-xs font-mono text-rose-300 overflow-x-auto max-h-36">
            <span className="text-zinc-500 font-bold block mb-1">Developer Error Details:</span>
            {error.message}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={async () => {
              if ('caches' in window) {
                const names = await caches.keys()
                await Promise.all(names.map(name => caches.delete(name)))
              }
              reset()
            }}
            className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-lg shadow-rose-600/20 flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw size={15} />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            className="px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold text-xs transition-all flex items-center gap-2"
          >
            <Home size={15} />
            <span>Return Home</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 border-t border-zinc-900 text-center text-xs text-zinc-600">
        © 2026 RealtyPals Inc. Application Recovery Engine.
      </footer>
    </div>
  )
}
