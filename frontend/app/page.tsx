'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ShieldCheck, Scale, Compass } from 'lucide-react'
import { m } from 'framer-motion'
import { getSupabaseClient } from '@/lib/supabase'

export default function LandingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false
    getSupabaseClient()
      .then((supabase) => supabase.auth.getSession())
      .then(({ data }) => {
        if (cancelled) return
        if (data?.session?.user) {
          try {
            localStorage.setItem('user_id', data.session.user.id)
          } catch {}
          router.replace('/discover')
        } else {
          setChecking(false)
        }
      })
      .catch((err) => {
        console.warn('Auth session check failed on LandingPage', err)
        if (!cancelled) setChecking(false)
      })
    return () => {
      cancelled = true
    }
  }, [router])

  if (checking) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-[#050505]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white" />
      </div>
    )
  }

  return (
    <div className="relative h-[100dvh] max-h-[100dvh] w-full flex flex-col justify-between overflow-hidden bg-[#050505] text-white font-sans selection:bg-white selection:text-black py-4 sm:py-6 px-4 sm:px-8">
      
      {/* Premium Architectural Skyline Background & Ambient Spotlight */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <Image
          src="/images/backgrounds/newBg.jpeg"
          alt="Noida skyline architecture"
          fill
          sizes="100vw"
          className="object-cover opacity-60 mix-blend-screen scale-105 transition-all duration-1000"
          priority
        />

        {/* Radial Vignette & Depth Mask */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(5,5,5,0.2)_0%,rgba(5,5,5,0.75)_60%,#050505_95%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/95" />
        
        {/* Soft Ambient Hero Spotlight */}
        <div className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[850px] h-[400px] bg-blue-500/10 rounded-full blur-[160px]" />
      </div>

      {/* Floating Top Navigation Header */}
      <header className="relative z-20 w-full max-w-6xl mx-auto flex items-center justify-between shrink-0 py-2">
        <Link href="/" className="group shrink-0">
          <Image
            src="/images/icons/ExpandedRealtyPalsWhite.png"
            alt="RealtyPals"
            width={160}
            height={48}
            className="object-contain w-32 sm:w-44 h-auto opacity-95 group-hover:opacity-100 transition-opacity drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
            priority
          />
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/auth"
            className="text-xs font-semibold text-zinc-300 hover:text-white transition-colors tracking-tight px-2.5 py-1.5 whitespace-nowrap"
          >
            Sign In
          </Link>
          <button
            onClick={() => router.push('/discover')}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg border border-white/20 hover:border-white/40 transition-all duration-200 backdrop-blur-md shadow-xs active:scale-95 flex items-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap"
          >
            <span>Explore Catalog</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </header>

      {/* Main Hero Content - Scaled Perfectly to Fit 100vh */}
      <main className="relative z-20 w-full max-w-5xl mx-auto flex flex-col items-center text-center my-auto shrink-0 py-2 sm:py-4">
        <m.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center text-center"
        >
          {/* Perfect 2-Line Headline Cadence */}
          <h1 className="text-3xl sm:text-5xl md:text-[68px] lg:text-[72px] leading-[1.04] font-black tracking-tighter text-white max-w-5xl drop-shadow-[0_8px_32px_rgba(0,0,0,0.9)]">
            <span className="block text-white">Buy the right home in Noida.</span>
            <span className="block mt-1 sm:mt-2 bg-gradient-to-r from-zinc-200 via-zinc-400 to-zinc-500 bg-clip-text text-transparent font-extrabold">
              Not the one someone&apos;s paid to sell you.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-4 sm:mt-6 text-xs sm:text-base text-zinc-300/90 max-w-xl font-normal leading-relaxed tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
            Research RERA-verified projects, compare builders and prices in ₹ Lakh/Cr, and get straight answers — no listings spam, no broker calls.
          </p>

          {/* Structured Rectangular CTA Button (Crisp 8px Rounded Corners) */}
          <div className="mt-6 sm:mt-8 flex items-center gap-4">
            <button
              onClick={() => router.push('/discover')}
              className="px-8 py-3.5 sm:py-4 bg-white hover:bg-zinc-100 text-black text-xs sm:text-sm font-extrabold rounded-lg transition-all duration-300 shadow-[0_4px_25px_rgba(255,255,255,0.2)] hover:shadow-[0_4px_35px_rgba(255,255,255,0.35)] hover:-translate-y-0.5 active:scale-95 flex items-center gap-2.5 cursor-pointer"
            >
              <span>Start Home Discovery</span>
              <ArrowRight size={15} />
            </button>
          </div>

          {/* Trust Badges - Desktop Cards, Mobile Clean 1-Line Indicator */}
          <div className="mt-8 sm:mt-12 hidden sm:flex flex-wrap justify-center items-center gap-2.5 drop-shadow-md">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-white/[0.04] border border-white/15 backdrop-blur-md text-[10px] sm:text-[11px] font-bold text-zinc-200 tracking-wider uppercase shadow-xs">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>RERA-Checked Data</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-white/[0.04] border border-white/15 backdrop-blur-md text-[10px] sm:text-[11px] font-bold text-zinc-200 tracking-wider uppercase shadow-xs">
              <Scale size={14} className="text-blue-400" />
              <span>Honest Tradeoffs, Every Time</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-white/[0.04] border border-white/15 backdrop-blur-md text-[10px] sm:text-[11px] font-bold text-zinc-200 tracking-wider uppercase shadow-xs">
              <Compass size={14} className="text-purple-400" />
              <span>Hyperlocal Noida Expertise</span>
            </div>
          </div>

          <div className="mt-5 flex sm:hidden items-center justify-center gap-2.5 text-[10px] text-zinc-400 font-semibold tracking-wider uppercase">
            <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-emerald-400" /> 100% RERA</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Scale size={12} className="text-blue-400" /> Zero Broker Calls</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Compass size={12} className="text-purple-400" /> Noida Guide</span>
          </div>
        </m.div>
      </main>

      {/* Footer Strip - Pinned cleanly at viewport bottom */}
      <footer className="relative z-20 w-full max-w-5xl mx-auto pt-3 pb-1 border-t border-white/10 shrink-0 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-center sm:text-left">
          <p className="text-[11px] sm:text-xs text-zinc-400 font-medium">
            Are you a builder? Showcase your RERA-registered projects to serious Noida buyers — verified profiles, qualified leads, zero spam.
          </p>
          <Link
            href="/builder-register"
            className="px-4 py-2 text-[11px] sm:text-xs font-semibold text-white bg-white/5 hover:bg-white/15 border border-white/15 hover:border-white/30 rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 active:scale-95"
          >
            <span>List with RealtyPals</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </footer>
    </div>
  )
}
