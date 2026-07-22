'use client';

import { useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { PhoneCall, User, Phone, X, ShieldCheck, CheckCircle2, Loader2, Sparkles, Building2 } from 'lucide-react';
import { API_BASE } from '@/lib/env';
import { track } from '@/lib/analytics';
import { authHeaders } from '@/lib/authedFetch';
import type { ProjectCard } from '@/types/project';

interface CallbackModalProps {
  project: ProjectCard | null;
  isDone: boolean;
  onClose: () => void;
}

type IntentTier = 'immediate' | '1-3-months' | 'exploring';

export default function CallbackModal({ project, isDone, onClose }: CallbackModalProps) {
  const [form, setForm] = useState({ name: '', phone: '' });
  const [intentTier, setIntentTier] = useState<IntentTier>('immediate');
  const [loanStatus, setLoanStatus] = useState<'pre_approved' | 'need_help' | 'cash' | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!project || isDone) return null;

  const handleSubmit = async () => {
    if (!form.name.trim() || form.phone.trim().length < 10 || submitting) return;
    
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/leads/callback`, {
        method: 'POST',
        headers: await authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          intent_tier: intentTier,
          loan_status: loanStatus,
          project_id: project.id,
          project_slug: project.slug,
          project_name: project.name,
        }),
      });
      if (!res.ok) throw new Error('callback request failed');
      
      track('callback_requested', { 
        project_slug: project.slug, 
        project_name: project.name,
        intent_tier: intentTier 
      });
      track('lead_created', { type: 'callback', project_slug: project.slug });
      
      setSubmittedSuccess(true);
    } catch {
      setError('Could not send your request. Please check your number and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-zinc-950/60 backdrop-blur-md p-0 sm:p-4 font-sans"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <m.div
          initial={{ y: 24, scale: 0.98, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 24, scale: 0.98, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 350 }}
          className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 shadow-2xl overflow-hidden pb-safe relative"
        >
          {/* Subtle micro-gradient ambient line at top */}
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 opacity-90" />

          <div className="p-6">
            {/* Handle bar for mobile sheet drawer */}
            <div className="w-10 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-4 sm:hidden" />

            {!submittedSuccess ? (
              <>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs shrink-0">
                      <PhoneCall className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                        Request Callback
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Connect with a verified project specialist
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Property Context Card */}
                <div className="mb-5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/60 dark:border-zinc-800/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {project.name}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {project.price_range_label || 'Price on Request'}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200/60 dark:border-emerald-800/60 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Verified Lead
                  </span>
                </div>

                {/* Form Fields */}
                <div className="space-y-4 mb-5">
                  {/* Name Input */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                      Your Full Name
                    </label>
                    <div className="relative flex items-center">
                      <User className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Rahul Sharma"
                        value={form.name}
                        onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all"
                      />
                    </div>
                  </div>

                  {/* Phone Input */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                      Phone Number
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 flex items-center gap-1.5 pointer-events-none text-zinc-400 text-xs font-semibold">
                        <Phone className="w-3.5 h-3.5" />
                        <span>+91</span>
                        <span className="w-px h-3 bg-zinc-200 dark:bg-zinc-700" />
                      </div>
                      <input
                        type="tel"
                        placeholder="98765 43210"
                        value={form.phone}
                        onChange={(e) => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                        className="w-full pl-16 pr-4 py-2.5 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all font-mono tracking-wide"
                      />
                    </div>
                  </div>

                  {/* Home Loan Status (Optional) */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                      Home Loan Status (Optional)
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {(['pre_approved', 'need_help', 'cash'] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setLoanStatus(loanStatus === status ? undefined : status)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            loanStatus === status
                              ? 'bg-blue-600 text-white'
                              : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {status === 'pre_approved' ? 'Pre-approved' : status === 'need_help' ? 'Need Help' : 'Cash Buyer'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Buying Timeline / Intent Segmented Control */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                      Buying Timeline
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800">
                      {(
                        [
                          { id: 'immediate', label: '0–30 Days' },
                          { id: '1-3-months', label: '1–3 Months' },
                          { id: 'exploring', label: 'Exploring' },
                        ] as const
                      ).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setIntentTier(item.id)}
                          className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-all text-center ${
                            intentTier === item.id
                              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs border border-zinc-200/80 dark:border-zinc-700'
                              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="mb-4 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-medium text-center">
                    {error}
                  </div>
                )}

                {/* Consent */}
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center mb-3">
                  By requesting a callback, you agree to share your requirements with the verified builder.
                </p>

                {/* Primary Action Button */}
                <button
                  disabled={!form.name.trim() || form.phone.trim().length < 10 || submitting}
                  onClick={handleSubmit}
                  className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 disabled:bg-zinc-100 disabled:text-zinc-400 dark:disabled:bg-zinc-900 dark:disabled:text-zinc-600 font-semibold rounded-xl transition-all duration-200 text-sm shadow-md hover:shadow-lg active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-400 dark:text-zinc-600" />
                      <span>Sending Request...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-emerald-400 dark:text-emerald-600 fill-emerald-400 dark:fill-emerald-600" />
                      <span>Request Callback</span>
                    </>
                  )}
                </button>

                {/* Trust Footer */}
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-medium mt-3.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Guaranteed zero spam · Direct developer priority line</span>
                </div>
              </>
            ) : (
              /* Success Confirmation View */
              <div className="py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                  Callback Requested!
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto mb-5 leading-relaxed">
                  We&apos;ve sent your request for <strong className="text-zinc-700 dark:text-zinc-300">{project.name}</strong> to the verified project advisor. You will receive a call on <span className="font-mono text-zinc-700 dark:text-zinc-300">+91 {form.phone}</span> within 30 minutes.
                </p>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium rounded-xl text-sm transition-all"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}
