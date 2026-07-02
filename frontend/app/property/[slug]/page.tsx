'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import type { ProjectDetail } from '@/types/project'
import ProjectDetailPanel from '@/components/ProjectDetailPanel'
import { API_BASE } from '@/lib/env'

export default function PropertyDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [detail, setDetail] = useState<ProjectDetail | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Stable stub — lets the panel open and show skeletons immediately
  const stub = useMemo(() => ({ slug: slug ?? '', id: '' } as any), [slug])

  useEffect(() => {
    setUserId(localStorage.getItem('user_id'))
  }, [])

  useEffect(() => {
    if (!slug) return
    fetch(`${API_BASE}/projects/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(d => setDetail(d.project ?? null))
      .catch(() => setNotFound(true))
  }, [slug])

  if (!slug) return null

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

        {notFound ? (
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
        ) : (
          <ProjectDetailPanel
            project={detail ?? stub}
            initialDetail={detail ?? undefined}
            onClose={() => router.back()}
            userId={userId}
            inline
          />
        )}
      </div>
    </div>
  )
}
