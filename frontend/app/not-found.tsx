'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Building2, Search, ArrowLeft, Home, Compass, MapPin, Sparkles,
  ShieldCheck, ArrowRight, CornerDownLeft
} from 'lucide-react'

export default function NotFound() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/discover?q=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      router.push('/discover')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white relative overflow-hidden font-sans">
      {/* Ambient Radial Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-600/20 via-indigo-500/15 to-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Navigation Header */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            RP
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-blue-400 transition-colors">
            RealtyPals
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/discover"
            className="px-4 py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white border border-zinc-800/80 transition-all flex items-center gap-1.5"
          >
            <Compass size={14} className="text-blue-400" />
            <span>Discover Properties</span>
          </Link>
          <Link
            href="/admin/login"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-all shadow-md shadow-blue-600/20"
          >
            Admin Portal
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-4xl mx-auto w-full px-6 py-12 flex-1 flex flex-col items-center justify-center text-center">
        
        {/* Animated 404 Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/90 border border-zinc-800/80 shadow-2xl mb-8 animate-in fade-in zoom-in duration-300">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
          </span>
          <span className="text-xs font-extrabold tracking-wider uppercase text-rose-400">
            Error 404 · Listing Not Found
          </span>
        </div>

        {/* Large Decorative 404 Number */}
        <div className="relative mb-4">
          <h1 className="text-8xl sm:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-600 opacity-90 select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="p-4 rounded-3xl bg-zinc-900/80 border border-zinc-700/60 shadow-2xl backdrop-blur-md transform -rotate-6 animate-pulse">
              <Building2 size={40} className="text-blue-500" />
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
          This Property Listing Off the Market
        </h2>
        <p className="text-sm sm:text-base text-zinc-400 max-w-lg mb-8 leading-relaxed font-medium">
          The page or property listing you are looking for does not exist, has been renamed, or is temporarily unlisted. Use our search below or explore top sectors.
        </p>

        {/* Interactive Search Bar */}
        <form onSubmit={handleSearch} className="w-full max-w-md mb-10">
          <div className="relative flex items-center bg-zinc-900/90 border border-zinc-800 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 rounded-2xl p-1.5 shadow-2xl transition-all">
            <Search size={18} className="text-zinc-500 ml-3 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Sector 75, Sector 150, Mahagun..."
              className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 px-3 py-2 outline-none font-medium"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <span>Search</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>

        {/* Quick Action Navigation Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mb-10">
          <Link
            href="/discover"
            className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/70 hover:border-blue-500/50 hover:bg-zinc-900 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-2">
              <Compass size={18} className="text-blue-400 group-hover:scale-110 transition-transform" />
              <ArrowRight size={14} className="text-zinc-600 group-hover:text-blue-400 transition-colors" />
            </div>
            <h3 className="text-xs font-bold text-white mb-0.5">Explore Catalog</h3>
            <p className="text-[11px] text-zinc-400 font-medium">124+ Wave 1 Verified Projects</p>
          </Link>

          <Link
            href={`/discover?sector=${encodeURIComponent('Sector 150')}`}
            className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/70 hover:border-emerald-500/50 hover:bg-zinc-900 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-2">
              <MapPin size={18} className="text-emerald-400 group-hover:scale-110 transition-transform" />
              <ArrowRight size={14} className="text-zinc-600 group-hover:text-emerald-400 transition-colors" />
            </div>
            <h3 className="text-xs font-bold text-white mb-0.5">Sector 150 Noida</h3>
            <p className="text-[11px] text-zinc-400 font-medium">Top Green Expressway Hub</p>
          </Link>

          <Link
            href="/builder"
            className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/70 hover:border-purple-500/50 hover:bg-zinc-900 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-2">
              <Building2 size={18} className="text-purple-400 group-hover:scale-110 transition-transform" />
              <ArrowRight size={14} className="text-zinc-600 group-hover:text-purple-400 transition-colors" />
            </div>
            <h3 className="text-xs font-bold text-white mb-0.5">Top Builders</h3>
            <p className="text-[11px] text-zinc-400 font-medium">Godrej, Mahagun, ATS & More</p>
          </Link>
        </div>

        {/* Back Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Go Back</span>
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-100 font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-white/10"
          >
            <Home size={14} />
            <span>Return to Homepage</span>
          </Link>
        </div>

      </main>

      {/* Footer Bar */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
        <div className="flex items-center gap-2 font-medium">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>RealtyPals Verified Real Estate Catalog</span>
        </div>
        <p>© 2026 RealtyPals Inc. All rights reserved.</p>
      </footer>
    </div>
  )
}
