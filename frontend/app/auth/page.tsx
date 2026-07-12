'use client';

export const dynamic = 'force-dynamic'

<<<<<<< HEAD
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, Mail, Lock, User as UserIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase'
=======
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, User as UserIcon, ArrowLeft } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase'
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
import { track, identifyUser } from '@/lib/analytics';
import Toast from '@/components/Toast';

type Mode = 'login' | 'register';

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
<<<<<<< HEAD
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        localStorage.setItem('user_id', data.session.user.id);
        router.replace('/discover');
      } else {
        setChecking(false);
      }
    });
=======
  const [error, setError] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    getSupabaseClient().then((supabase) => supabase.auth.getSession()).then(({ data }) => {
      if (cancelled) return;
      if (data.session?.user) {
        localStorage.setItem('user_id', data.session.user.id);
        router.replace('/discover');
      }
    });
    return () => { cancelled = true; };
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || loading) return;
    setLoading(true);
    track('signup_started', { mode })
    setError('');

    try {
<<<<<<< HEAD
=======
      const supabase = await getSupabaseClient();
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
      if (mode === 'login') {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (authError) {
          if (authError.message.includes('Email not confirmed')) {
            setError('Please confirm your email first. Check your inbox for a confirmation link.');
          } else if (authError.message.includes('Invalid login')) {
            setError('Wrong email or password. Double-check and try again.');
          } else {
            throw authError;
          }
          return;
        }
        if (data.user) {
          localStorage.setItem('user_id', data.user.id);
          identifyUser(data.user.id, { email: data.user.email })
          router.push('/discover');
        }
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { data: { name: name.trim() || email.split('@')[0] } },
        });
        if (authError) throw authError;
        if (data.user?.identities?.length === 0) {
          setError('An account with this email already exists. Sign in instead.');
        } else {
          // Registration successful — show toast and switch to login with prefilled creds
<<<<<<< HEAD
          track('signup_completed', { email: email.trim().toLowerCase() })
=======
          track('signup_completed')
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
          setToast('Account created! Please sign in.');
          setMode('login');
          // email and password stay filled — user just clicks Sign In
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setShowPassword(false);
  };

<<<<<<< HEAD
  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-black">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
      </div>
    );
  }

=======
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col items-center justify-center bg-black overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image src="/images/backgrounds/newBg.jpeg" alt="background" fill className="object-cover opacity-40" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
      </div>

      {/* Ambient blobs */}
      <div className="absolute top-[15%] left-[10%] w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

<<<<<<< HEAD
      <div className="relative z-10 w-full max-w-[420px] px-4">
        {/* Logo + wordmark */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-xl overflow-hidden">
            <Image src="/images/logo/realtypals.png" alt="RealtyPals" width={48} height={48} className="object-contain" />
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-xl tracking-tight">RealtyPals</p>
            <p className="text-white/40 text-xs mt-0.5">Your AI property advisor</p>
=======
      {/* Back button */}
      <div className="absolute top-8 left-8 z-20">
        <Link href="/" className="flex items-center gap-2.5 text-white/50 hover:text-white transition-all text-[13px] font-medium group">
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
            <ArrowLeft size={14} />
          </div>
          <span>Back to home</span>
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-[420px] px-4">
        {/* Logo + wordmark */}
        <div className="flex flex-col items-center mb-10 gap-5">
          <Image src="/images/icons/ExpandedRealtyPalsWhite.png" alt="RealtyPals" width={180} height={40} className="object-contain" priority />
          <div className="text-center">
            <h1 className="text-white font-semibold text-[22px] tracking-tight">Welcome to RealtyPals</h1>
            <p className="text-white/50 text-[13px] mt-1 font-medium tracking-wide">Unbiased property guidance for Noida & Greater Noida</p>
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
          </div>
        </div>

        {/* Card */}
<<<<<<< HEAD
        <div className="bg-white/[0.05] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-7 shadow-2xl">
          {/* Tabs */}
          <div className="flex bg-white/[0.04] rounded-2xl p-1 mb-7 gap-1">
=======
        <div className="bg-[#111111]/80 backdrop-blur-3xl border border-white/10 rounded-[28px] p-8 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.5)] relative before:absolute before:inset-0 before:rounded-[28px] before:pointer-events-none before:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
          {/* Tabs */}
          <div className="flex bg-[#000000]/60 border border-white/5 rounded-2xl p-1 mb-8 gap-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]">
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
<<<<<<< HEAD
                className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                  mode === m
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-white/40 hover:text-white/70'
=======
                className={`flex-1 py-2.5 rounded-[14px] text-[13px] font-medium transition-all duration-300 ${
                  mode === m
                    ? 'bg-white/[0.12] text-white shadow-[0_2px_8px_rgba(0,0,0,0.2)] ring-1 ring-white/10'
                    : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

<<<<<<< HEAD
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div className="relative">
                <UserIcon size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
=======
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="relative group">
                <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/70 transition-colors pointer-events-none" />
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  autoComplete="name"
<<<<<<< HEAD
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3.5 text-white placeholder:text-white/25 text-[13px] focus:outline-none focus:border-blue-500/40 focus:bg-white/[0.07] transition-all"
=======
                  className="w-full bg-[#000000]/40 border border-white/10 rounded-[14px] pl-[42px] pr-4 py-3.5 text-white placeholder:text-white/30 text-[14px] focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 focus:bg-[#000000]/60 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
                />
              </div>
            )}

<<<<<<< HEAD
            <div className="relative">
              <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
=======
            <div className="relative group">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/70 transition-colors pointer-events-none" />
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                autoComplete="email"
<<<<<<< HEAD
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3.5 text-white placeholder:text-white/25 text-[13px] focus:outline-none focus:border-blue-500/40 focus:bg-white/[0.07] transition-all"
              />
            </div>

            <div className="relative">
              <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
=======
                className="w-full bg-[#000000]/40 border border-white/10 rounded-[14px] pl-[42px] pr-4 py-3.5 text-white placeholder:text-white/30 text-[14px] focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 focus:bg-[#000000]/60 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
              />
            </div>

            <div className="relative group">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/70 transition-colors pointer-events-none" />
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
<<<<<<< HEAD
                placeholder={mode === 'register' ? 'Password (min 6 chars)' : 'Password'}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-10 pr-11 py-3.5 text-white placeholder:text-white/25 text-[13px] focus:outline-none focus:border-blue-500/40 focus:bg-white/[0.07] transition-all"
=======
                placeholder={mode === 'register' ? 'Password (6+ characters)' : 'Password'}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full bg-[#000000]/40 border border-white/10 rounded-[14px] pl-[42px] pr-12 py-3.5 text-white placeholder:text-white/30 text-[14px] focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 focus:bg-[#000000]/60 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
<<<<<<< HEAD
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors p-1"
=======
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/80 transition-colors p-2 rounded-lg"
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
<<<<<<< HEAD
              <div className="bg-red-500/[0.08] border border-red-500/15 rounded-xl px-4 py-3">
                <p className="text-red-400 text-[12px] leading-relaxed">{error}</p>
=======
              <div className="bg-red-500/10 border border-red-500/20 rounded-[14px] px-4 py-3.5 flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                <p className="text-red-400 text-[13px] leading-relaxed font-medium">{error}</p>
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
<<<<<<< HEAD
              className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all duration-150 text-[13px] mt-1 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                </>
=======
              className="relative w-full group overflow-hidden bg-white hover:bg-gray-50 active:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3.5 rounded-[14px] transition-all duration-200 text-[14px] mt-2 flex items-center justify-center shadow-[0_4px_14px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_20px_rgba(255,255,255,0.23)]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-white/20 text-[11px]">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <p className="text-center text-white/30 text-[12px]">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
            >
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>

<<<<<<< HEAD
        <p className="text-center text-white/20 text-[11px] mt-5">
          AI-powered real estate advisor · Noida · V1
        </p>
      </div>
=======
        <div className="flex justify-center mt-8">
          <button
            onClick={() => router.push('/discover')}
            className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] hover:border-white/[0.1] text-white/50 hover:text-white text-[13px] font-medium transition-all duration-300"
          >
            Continue as guest
            <span className="group-hover:translate-x-0.5 transition-transform duration-300">→</span>
          </button>
        </div>


      </div>

      {/* Trust line */}
      <p className="text-center text-white/40 text-[12px] mt-6 font-medium tracking-wide">
        Free for buyers. We never sell your number to brokers.
      </p>

>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
      {toast && <Toast message={toast} duration={3000} onClose={() => setToast(null)} />}
    </div>
  );
}
