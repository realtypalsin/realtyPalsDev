'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import ProjectCard from '@/components/ProjectCard'
import type { ProjectCard as ProjectCardType } from '@/types/project'
import { API_BASE } from '@/lib/env'

export default function SharedShortlistPage() {
  const { id } = useParams<{ id: string }>()
  const [projects, setProjects] = useState<ProjectCardType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    setUserId(localStorage.getItem('user_id'))
  }, [])

  useEffect(() => {
    if (!id) return

    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/share/${id}`)
        if (!res.ok) throw new Error('Share not found or expired')

        const { projectSlugs } = await res.json()

        // Fetch full project details
        const projects = await Promise.all(
          projectSlugs.map(async (slug: string) => {
            const pRes = await fetch(`${API_BASE}/projects/${slug}`)
            if (!pRes.ok) return null
            const { project } = await pRes.json()
            return project
          })
        )

        setProjects(projects.filter(Boolean))
      } catch (err) {
        setError('Failed to load shortlist')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-8">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 mb-4"
          >
            <ArrowLeft size={18} />
            Back to RealtyPal
          </a>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Shared Shortlist
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {projects.length} properties recommended with RealtyPal AI
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-300 mt-4">Loading shortlist...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
            <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
            <a href="/" className="text-red-600 dark:text-red-400 hover:underline mt-2 inline-block">
              Start fresh →
            </a>
          </div>
        )}

        {/* Projects grid */}
        {!loading && !error && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} userId={userId} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && projects.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-300">No projects found</p>
          </div>
        )}

        {/* CTA */}
        {!loading && !error && (
          <div className="mt-12 text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Want personalized recommendations?
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
            >
              Chat with RealtyPal AI
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
