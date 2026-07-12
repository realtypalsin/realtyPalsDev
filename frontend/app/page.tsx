'use client';

<<<<<<< HEAD
export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase';
=======
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getSupabaseClient } from '@/lib/supabase';
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
<<<<<<< HEAD
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    let cancelled = false;
    supabaseRef.current.auth.getSession().then(({ data }) => {
=======

  useEffect(() => {
    let cancelled = false;
    getSupabaseClient().then((supabase) => supabase.auth.getSession()).then(({ data }) => {
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
      if (cancelled) return;
      if (data.session?.user) {
        localStorage.setItem('user_id', data.session.user.id);
        router.replace('/discover');
      } else {
        setChecking(false);
      }
    }).catch(() => {
      if (!cancelled) setChecking(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-black">
<<<<<<< HEAD
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto" />
=======
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent mx-auto" />
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
      </div>
    );
  }

  return (
<<<<<<< HEAD
    <div className="relative min-h-[100dvh] w-full flex flex-col justify-center items-center overflow-hidden bg-black no-overscroll">
      {/* Background */}
=======
    <div className="relative min-h-[100dvh] w-full flex flex-col justify-center items-center overflow-hidden bg-[#050505] no-overscroll">
      {/* Background - Minimalist Dark Canvas */}
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/backgrounds/newBg.jpeg"
          alt="Noida skyline"
          fill
          sizes="100vw"
          className="object-cover opacity-60 mix-blend-screen"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90 pointer-events-none" />
      </div>

      <div className="relative z-10 w-full max-w-6xl px-6 flex flex-col items-center justify-center text-center">
        {/* Logo */}
<<<<<<< HEAD
        <div className="mb-0 md:mb-4 flex flex-col items-center animate-fade-in-up">
          <Image
            src="/images/logo/realtypals.png"
            alt="RealtyPals Logo"
            width={350}
            height={140}
            className="object-contain drop-shadow-2xl opacity-90 transition-transform duration-700 hover:scale-105"
=======
        <div className="mb-8 md:mb-12 flex flex-col items-center animate-fade-in-up">
          <Image
            src="/images/icons/ExpandedRealtyPalsWhite.png"
            alt="RealtyPals Logo"
            width={240}
            height={80}
            className="object-contain drop-shadow-[0_4px_12px_rgba(255,255,255,0.05)] transition-transform duration-700"
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
            priority
          />
        </div>

<<<<<<< HEAD
        {/* Hero text */}
        <h2
          className="text-3xl md:text-5xl lg:text-[56px] leading-[1.2] md:leading-[1.15] text-white font-medium max-w-4xl tracking-tight drop-shadow-2xl animate-fade-in-up transform transition-all duration-700 hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]"
          style={{ animationDelay: '0.2s' }}
        >
          Intelligence layer for smarter property decisions in Noida
        </h2>

        {/* CTA */}
        <div className="mt-[60px] flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <button
            onClick={() => router.push('/auth')}
            className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full text-base transition-all duration-200 shadow-2xl hover:shadow-blue-500/30 active:scale-95"
          >
            Start Discovery
          </button>
          <button
            onClick={() => router.push('/auth')}
            className="px-10 py-4 bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/20 text-white font-semibold rounded-full text-base transition-all duration-200 active:scale-95"
=======
        {/* Hero text - Huge, tracking-tighter, high contrast */}
        <h1
          className="text-4xl md:text-6xl lg:text-[72px] leading-[1.1] md:leading-[1.05] text-white font-semibold max-w-4xl tracking-tighter animate-fade-in-up transform transition-all duration-700"
          style={{ animationDelay: '0.1s' }}
        >
          Buy the right home in Noida. Not the one someone&apos;s paid to sell you.
        </h1>
        
        {/* Subtitle */}
        <p 
          className="mt-6 text-[15px] md:text-[17px] text-white/50 max-w-xl tracking-tight leading-relaxed animate-fade-in-up"
          style={{ animationDelay: '0.2s' }}
        >
          Research RERA-verified projects, compare builders and prices in ₹ Lakh/Cr, and get straight answers — no listings spam, no broker calls.
        </p>

        {/* CTA */}
        <div className="mt-12 flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <button
            onClick={() => router.push('/discover')}
            className="group px-8 py-3.5 bg-white hover:bg-gray-50 text-black font-semibold rounded-full text-[14px] transition-all duration-300 shadow-[0_2px_10px_rgba(255,255,255,0.1)] active:scale-95 flex items-center justify-center gap-2"
          >
            Ask about a property →
            <span className="group-hover:translate-x-0.5 transition-transform duration-300 opacity-80"></span>
          </button>
          <button
            onClick={() => router.push('/auth')}
            className="px-8 py-3.5 bg-white/[0.02] hover:bg-white/[0.06] backdrop-blur-md border border-white/10 text-white font-medium rounded-full text-[14px] transition-all duration-300 active:scale-95"
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
          >
            Sign In
          </button>
        </div>

<<<<<<< HEAD
        {/* Features row */}
        <div className="mt-16 flex flex-wrap justify-center gap-6 text-sm text-white/60 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          {['AI-powered recommendations', 'Honest trade-off analysis', 'RERA verified data', 'Noida Sector 78 · 137 · 150'].map((f) => (
            <span key={f} className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-blue-400" />
=======
        {/* Features row - Subheading Typography Rule */}
        <div className="mt-24 flex flex-wrap justify-center gap-x-10 gap-y-6 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          {['RERA-Checked Data', 'Honest Tradeoffs, Every Time', 'Hyperlocal Noida Expertise'].map((f) => (
            <span key={f} className="flex items-center gap-2 text-[10px] uppercase tracking-[0.1em] text-white/40 font-semibold">
              <span className="w-1 h-1 rounded-full bg-white/20" />
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
              {f}
            </span>
          ))}
        </div>
<<<<<<< HEAD
=======

        {/* Builder footer strip */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm">
              Are you a builder? Showcase your RERA-registered projects to serious Noida buyers — verified profiles, qualified leads, zero spam.
            </p>
            <Link href="/builder-register" className="text-white font-semibold hover:text-gray-200 transition-colors whitespace-nowrap flex items-center gap-2">
              List with RealtyPals →
            </Link>
          </div>
        </div>
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
      </div>
    </div>
  );
}
