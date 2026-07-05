'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto" />
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col justify-center items-center overflow-hidden bg-black no-overscroll">
      {/* Background */}
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
        <div className="mb-0 md:mb-4 flex flex-col items-center animate-fade-in-up">
          <Image
            src="/images/icons/ExpandedRealtyPalsWhite.png"
            alt="RealtyPals Logo"
            width={350}
            height={140}
            className="object-contain drop-shadow-2xl opacity-90 transition-transform duration-700 hover:scale-105"
            priority
          />
        </div>

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
            onClick={() => router.push('/discover')}
            className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full text-base transition-all duration-200 shadow-2xl hover:shadow-blue-500/30 active:scale-95"
          >
            Try RealtyPals
          </button>
          <button
            onClick={() => router.push('/auth')}
            className="px-10 py-4 bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/20 text-white font-semibold rounded-full text-base transition-all duration-200 active:scale-95"
          >
            Sign In
          </button>
        </div>

        {/* Features row */}
        <div className="mt-16 flex flex-wrap justify-center gap-6 text-sm text-white/60 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          {['AI-powered recommendations', 'Honest trade-off analysis', 'RERA verified data', 'Noida Sector 78 · 137 · 150'].map((f) => (
            <span key={f} className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-blue-400" />
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
