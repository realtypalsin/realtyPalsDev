'use client';

import { useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { API_BASE } from '@/lib/env';
import { track } from '@/lib/analytics';
import { authHeaders } from '@/lib/authedFetch';
import type { ProjectCard } from '@/types/project';

interface CallbackModalProps {
  project: ProjectCard | null;
  isDone: boolean;
  onClose: () => void;
}

export default function CallbackModal({ project, isDone, onClose }: CallbackModalProps) {
  const [form, setForm] = useState({ name: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!project || isDone) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/leads/callback`, {
        method: 'POST',
        headers: await authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          project_id: project.id,
          project_slug: project.slug,
          project_name: project.name,
        }),
      });
      if (!res.ok) throw new Error('callback request failed');
      track('callback_requested', { project_slug: project.slug, project_name: project.name });
      track('lead_created', { type: 'callback', project_slug: project.slug });
      onClose();
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
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <m.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-6 pb-safe"
        >
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5 sm:hidden" />
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-[16px] font-bold text-gray-900 dark:text-white">Request Callback</h3>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">{project.name} · {project.price_range_label}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none transition-colors">×</button>
          </div>
          <div className="space-y-3 mb-5">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">Your Name</label>
              <input
                type="text"
                placeholder="Rahul Sharma"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">Phone Number</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all"
              />
            </div>
          </div>
          <button
            disabled={!form.name.trim() || form.phone.trim().length < 10 || submitting}
            onClick={handleSubmit}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-700 dark:disabled:text-gray-500 text-white font-bold rounded-xl transition-all text-sm"
          >
            {submitting ? 'Sending...' : '📞 Request Callback'}
          </button>
          {error && (
            <p className="text-[12px] text-red-500 text-center mt-2" role="alert">{error}</p>
          )}
          <p className="text-[11px] text-gray-400 text-center mt-2">We&apos;ll call the same business day</p>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}
