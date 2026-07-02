'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, Mail, Lock, User as UserIcon } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase'
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
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || loading) return;
    setLoading(true);
    track('signup_started', { mode })
    setError('');

    try {
      const supabase = await getSupabaseClient();
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
          track('signup_completed', { email: email.trim().toLowerCase() })
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

      <div className="relative z-10 w-full max-w-[420px] px-4">
        {/* Logo + wordmark */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-xl overflow-hidden">
            <Image src="/images/logo/realtypals.png" alt="RealtyPals" width={48} height={48} className="object-contain block dark:hidden" />
            <Image src="/images/logo/RealtyPals-logoWhite.png" alt="RealtyPals" width={48} height={48} className="object-contain hidden dark:block" />
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-xl tracking-tight">RealtyPals</p>
            <p className="text-white/40 text-xs mt-0.5">Your AI property advisor</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/[0.05] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-7 shadow-2xl">
          {/* Tabs */}
          <div className="flex bg-white/[0.04] rounded-2xl p-1 mb-7 gap-1">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                  mode === m
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div className="relative">
                <UserIcon size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  autoComplete="name"
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3.5 text-white placeholder:text-white/25 text-[13px] focus:outline-none focus:border-blue-500/40 focus:bg-white/[0.07] transition-all"
                />
              </div>
            )}

            <div className="relative">
              <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                autoComplete="email"
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3.5 text-white placeholder:text-white/25 text-[13px] focus:outline-none focus:border-blue-500/40 focus:bg-white/[0.07] transition-all"
              />
            </div>

            <div className="relative">
              <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Password (min 6 chars)' : 'Password'}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-10 pr-11 py-3.5 text-white placeholder:text-white/25 text-[13px] focus:outline-none focus:border-blue-500/40 focus:bg-white/[0.07] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <div className="bg-red-500/[0.08] border border-red-500/15 rounded-xl px-4 py-3">
                <p className="text-red-400 text-[12px] leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all duration-150 text-[13px] mt-1 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                </>
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

        <div className="text-center mt-5">
          <button
            onClick={() => router.push('/discover')}
            className="text-white/30 hover:text-white/60 text-[12px] transition-colors"
          >
            Continue as guest →
          </button>
        </div>

        <p className="text-center text-white/20 text-[11px] mt-3">
          AI-powered real estate advisor · Noida · V1
        </p>
      </div>
      {toast && <Toast message={toast} duration={3000} onClose={() => setToast(null)} />}
    </div>
  );
}
