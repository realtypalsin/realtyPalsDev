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
        <div className="mb-0 md:mb-6 flex flex-col items-center animate-fade-in-up">
          <Image
            src="/images/icons/ExpandedRealtyPalsWhite.png"
            alt="RealtyPals Logo"
            width={380}
            height={150}
            className="object-contain drop-shadow-[0_10px_30px_rgba(255,255,255,0.15)] transition-transform duration-700 hover:scale-105"
            priority
          />
        </div>

        {/* Hero text */}
        <h2
          className="text-3xl md:text-5xl lg:text-[56px] leading-[1.2] md:leading-[1.15] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 font-semibold max-w-4xl tracking-tight drop-shadow-2xl animate-fade-in-up transform transition-all duration-700"
          style={{ animationDelay: '0.2s' }}
        >
          Intelligence layer for smarter property decisions in Noida
        </h2>

        {/* CTA */}
        <div className="mt-14 flex flex-col sm:flex-row gap-5 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <button
            onClick={() => router.push('/discover')}
            className="group px-10 py-4 bg-white hover:bg-gray-50 text-black font-semibold rounded-[16px] text-[15px] transition-all duration-300 shadow-[0_4px_14px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_25px_rgba(255,255,255,0.25)] active:scale-95 flex items-center justify-center gap-2"
          >
            Try RealtyPals
            <span className="group-hover:translate-x-1 transition-transform duration-300 opacity-60">→</span>
          </button>
          <button
            onClick={() => router.push('/auth')}
            className="px-10 py-4 bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-md border border-white/[0.08] hover:border-white/[0.15] text-white font-medium rounded-[16px] text-[15px] transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] active:scale-95"
          >
            Sign In
          </button>
        </div>

        {/* Features row */}
        <div className="mt-20 flex flex-wrap justify-center gap-x-8 gap-y-4 text-[13px] font-medium text-white/50 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          {['Zero Commission Bias', 'RERA-Verified Intelligence', 'Hyperlocal Noida Expertise', 'Predictive ROI Models'].map((f) => (
            <span key={f} className="flex items-center gap-2.5 bg-white/[0.02] border border-white/[0.05] px-4 py-2 rounded-full shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
              <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
