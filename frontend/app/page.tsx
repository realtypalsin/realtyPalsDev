'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getSupabaseClient } from '@/lib/supabase';


export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let cancelled = false;
    getSupabaseClient().then((supabase) => supabase.auth.getSession()).then(({ data }) => {

      if (cancelled) return;
      if (data.session?.user) {
        try {
          localStorage.setItem('user_id', data.session.user.id);
        } catch(e) {}
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
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent mx-auto" />

      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col justify-center items-center overflow-hidden bg-[#050505] no-overscroll">
      {/* Background - Minimalist Dark Canvas */}

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
        <div className="mb-8 md:mb-12 flex flex-col items-center animate-fade-in-up">
          <Image
            src="/images/icons/ExpandedRealtyPalsWhite.png"
            alt="RealtyPals Logo"
            width={240}
            height={80}
            className="object-contain drop-shadow-[0_4px_12px_rgba(255,255,255,0.05)] transition-transform duration-700"

            priority
          />
        </div>

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

          >
            Sign In
          </button>
        </div>

        {/* Features row - Subheading Typography Rule */}
        <div className="mt-24 flex flex-wrap justify-center gap-x-10 gap-y-6 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          {['RERA-Checked Data', 'Honest Tradeoffs, Every Time', 'Hyperlocal Noida Expertise'].map((f) => (
            <span key={f} className="flex items-center gap-2 text-[10px] uppercase tracking-[0.1em] text-white/40 font-semibold">
              <span className="w-1 h-1 rounded-full bg-white/20" />

              {f}
            </span>
          ))}
        </div>
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

      </div>
    </div>
  );
}
