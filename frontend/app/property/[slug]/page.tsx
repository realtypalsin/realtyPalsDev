'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { API_BASE } from '@/lib/env'
import type { ProjectDetail } from '@/types/project'
import ProjectDetailPanel from '@/components/ProjectDetailPanel'
import SkeletonCard from '@/components/SkeletonCard'

export default function PropertyDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!slug) return
    fetch(`${API_BASE}/projects/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(d => setProject(d.project ?? null))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [slug])

  return (
    <div className="min-h-screen bg-[#E6E6E6]">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-20">
            <p className="text-2xl mb-2">🏚️</p>
            <p className="text-gray-500 mb-4">Property not found.</p>
            <button
              onClick={() => router.push('/discover')}
              className="px-6 py-3 bg-blue-600 text-white rounded-full text-sm font-semibold hover:bg-blue-500 transition-colors"
            >
              Explore properties
            </button>
          </div>
        )}

        {project && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ProjectDetailPanel project={project} onClose={() => router.back()} inline />
          </motion.div>
        )}
      </div>
    </div>
  )
}
