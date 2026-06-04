'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ProjectCard from '@/components/ProjectCard';
import SkeletonCard from '@/components/SkeletonCard';
import ProjectDetailPanel from '@/components/ProjectDetailPanel';
import type { ProjectCard as ProjectCardType } from '@/types/project';
import { API_BASE } from '@/lib/env';
import { Bookmark } from 'lucide-react';
import Toast from '@/components/Toast';
import { motion } from 'framer-motion';

export default function SavedPropertiesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [detailProject, setDetailProject] = useState<ProjectCardType | null>(null);
  const [toast, setToast] = useState('');
  const router = useRouter();

  useEffect(() => {
    const uid = localStorage.getItem('user_id');
    if (!uid) { router.replace('/auth'); return; }
    setUserId(uid);
    fetch(`${API_BASE}/saved`, { headers: { 'X-User-Id': uid } })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setProjects(d.projects ?? []))
      .catch((err: unknown) => {
        console.error('[saved] fetch failed:', err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex h-[100dvh] bg-[#E6E6E6] overflow-hidden">
      <Sidebar userId={userId} />
      <main className="flex-1 h-full flex flex-col min-h-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          <Header title="Saved Properties" onToast={(m: string) => setToast(m)} />
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {error ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
                  <span className="text-3xl">⚠️</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Couldn&apos;t load saved properties</h2>
                <p className="text-gray-500 max-w-sm">Check your connection and try again.</p>
                <button
                  onClick={() => { setError(false); setLoading(true); window.location.reload(); }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold text-sm transition-all"
                >
                  Retry
                </button>
              </div>
            ) : loading ? (
              <div className="max-w-5xl mx-auto">
                <div className="h-4 bg-gray-200 rounded w-32 mb-4 animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1,2,3].map(i => <SkeletonCard key={i} />)}
                </div>
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center">
                  <Bookmark size={32} className="text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">No saved properties</h2>
                <p className="text-gray-500 max-w-sm">Save properties from the chat to compare and revisit them here.</p>
                <button onClick={() => router.push('/discover')} className="mt-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold transition-all text-sm">
                  Start Discovery
                </button>
              </div>
            ) : (
              <div className="max-w-5xl mx-auto">
                <p className="text-sm text-gray-500 mb-4">{projects.length} saved {projects.length === 1 ? 'property' : 'properties'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((p, i) => (
                    <ProjectCard key={p.id} project={p} userId={userId} index={i} onDetailOpen={setDetailProject} onToast={(msg) => setToast(msg)} />
                  ))}
                </div>
              </div>
            )}
          </div>
          <ProjectDetailPanel project={detailProject} onClose={() => setDetailProject(null)} />
        </motion.div>
      </main>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
