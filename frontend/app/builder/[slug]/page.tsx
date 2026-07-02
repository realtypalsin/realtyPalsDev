'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Building2, MapPin, Calendar, Users, Trophy,
  CheckCircle2, Clock, ExternalLink, Shield, ChevronRight,
  Star, Award
} from 'lucide-react'
import { API_BASE } from '@/lib/env'

interface BuilderProject {
  id: string
  name: string
  slug: string
  sector: string
  city: string
  status: 'ready_to_move' | 'under_construction' | 'new_launch'
  tagline: string | null
  possession_date: string | null
  land_area_acres: number | null
  total_towers: number | null
  total_units: number | null
  rera_number: string | null
  unit_types: { bhk: number; price_min_cr: number | null; price_max_cr: number | null }[]
  images: { url: string }[]
}

interface Builder {
  id: string
  name: string
  slug: string
  tagline: string | null
  parent_group: string | null
  founded_year: number | null
  headquarters: string | null
  website: string | null
  email: string | null
  phone: string | null
  credai_member: boolean
  delivered_units: number | null
  delivered_projects: string[]
  ongoing_projects: string[]
  awards: string[]
  awards_count: number | null
  description: string | null
  projects: BuilderProject[]
}

const STATUS_CONFIG = {
  ready_to_move: { label: 'Ready to Move', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  under_construction: { label: 'Under Construction', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  new_launch: { label: 'New Launch', color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
}

function priceLabel(project: BuilderProject): string {
  const all = project.unit_types.filter(u => u.price_min_cr != null)
  if (all.length === 0) return 'Price on request'
  const mins = all.map(u => u.price_min_cr as number)
  const maxs = all.map(u => u.price_max_cr ?? u.price_min_cr as number)
  const lo = Math.min(...mins)
  const hi = Math.max(...maxs)
  return lo === hi ? `₹${lo.toFixed(2)} Cr` : `₹${lo.toFixed(2)} – ${hi.toFixed(2)} Cr`
}

function bhkLabel(project: BuilderProject): string {
  const types = [...new Set(project.unit_types.map(u => u.bhk))].sort()
  return types.map(b => `${b}BHK`).join(' · ')
}

export default function BuilderPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [builder, setBuilder] = useState<Builder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'all' | 'ready_to_move' | 'under_construction'>('all')

  useEffect(() => {
    if (!slug) return
    fetch(`${API_BASE}/builders/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(d => setBuilder(d.builder ?? null))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [slug])

  const filteredProjects = builder?.projects.filter(p =>
    activeFilter === 'all' || p.status === activeFilter
  ) ?? []

  const readyCount = builder?.projects.filter(p => p.status === 'ready_to_move').length ?? 0
  const ucCount = builder?.projects.filter(p => p.status === 'under_construction').length ?? 0

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !builder) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-center gap-4">
        <Building2 size={48} className="text-gray-200" />
        <p className="text-gray-500">Builder not found.</p>
        <button onClick={() => router.push('/discover')} className="text-sm text-blue-600 hover:underline">
          Explore properties
        </button>
      </div>
    )
  }

  const experienceYears = builder.founded_year ? new Date().getFullYear() - builder.founded_year : null

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft size={15} />
          Back
        </button>

        {/* Hero card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4"
        >
          {/* Top bar */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-8">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Building2 size={28} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-black text-white tracking-tight leading-tight">{builder.name}</h1>
                {builder.parent_group && (
                  <p className="text-blue-200 text-sm mt-0.5">Part of {builder.parent_group} Group</p>
                )}
                {builder.tagline && (
                  <p className="text-blue-100 text-sm mt-1 leading-relaxed">{builder.tagline}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {builder.credai_member && (
                    <span className="flex items-center gap-1 bg-white/15 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full border border-white/20">
                      <Shield size={10} />
                      CREDAI Member
                    </span>
                  )}
                  {builder.headquarters && (
                    <span className="flex items-center gap-1 bg-white/15 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full border border-white/20">
                      <MapPin size={10} />
                      {builder.headquarters}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 border-t border-gray-100">
            {[
              {
                value: experienceYears ? `${experienceYears}+` : builder.founded_year ? String(builder.founded_year) : '—',
                label: experienceYears ? 'Years Experience' : 'Founded',
              },
              {
                value: builder.delivered_units ? `${(builder.delivered_units / 1000).toFixed(0)}K+` : `${builder.delivered_projects.length}`,
                label: builder.delivered_units ? 'Units Delivered' : 'Projects Delivered',
              },
              {
                value: String(builder.projects.length),
                label: 'Noida Projects',
              },
              {
                value: builder.awards_count ? String(builder.awards_count) : builder.awards.length > 0 ? String(builder.awards.length) : '—',
                label: 'Industry Awards',
              },
            ].map(stat => (
              <div key={stat.label} className="px-4 py-4 text-center">
                <p className="text-[22px] font-black text-gray-900 leading-none">{stat.value}</p>
                <p className="text-[10px] text-gray-400 font-semibold mt-1 uppercase tracking-wider leading-tight">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* About */}
        {builder.description && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl shadow-sm p-5 mb-4"
          >
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">About {builder.name}</h2>
            <p className="text-[13px] text-gray-700 leading-relaxed">{builder.description}</p>
          </motion.div>
        )}

        {/* Awards */}
        {builder.awards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm p-5 mb-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Award size={14} className="text-amber-500" />
              <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Awards & Recognition</h2>
            </div>
            <div className="space-y-2">
              {builder.awards.map(award => (
                <div key={award} className="flex items-start gap-2.5 text-[12px] text-gray-700">
                  <Trophy size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  {award}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Track record */}
        {(builder.delivered_projects.length > 0 || builder.ongoing_projects.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="bg-white rounded-2xl shadow-sm p-5 mb-4"
          >
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Project Track Record</h2>
            {builder.delivered_projects.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <p className="text-[11px] font-semibold text-emerald-700">Delivered ({builder.delivered_projects.length})</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {builder.delivered_projects.map(p => (
                    <span key={p} className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full font-medium">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {builder.ongoing_projects.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock size={12} className="text-amber-500" />
                  <p className="text-[11px] font-semibold text-amber-700">Ongoing ({builder.ongoing_projects.length})</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {builder.ongoing_projects.map(p => (
                    <span key={p} className="text-[11px] bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full font-medium">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Projects in Noida */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-bold text-gray-700">Projects in Noida</h2>
            <div className="flex gap-1">
              {([
                { key: 'all', label: 'All' },
                { key: 'ready_to_move', label: `Ready (${readyCount})` },
                { key: 'under_construction', label: `UC (${ucCount})` },
              ] as const).map(f => (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={`text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all ${
                    activeFilter === f.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-500 border border-gray-200 hover:border-blue-200 hover:text-blue-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredProjects.map((project, i) => {
              const cfg = STATUS_CONFIG[project.status]
              const heroImg = project.images[0]?.url
              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <Link href={`/property/${project.slug}`}>
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex gap-0">
                        {/* Thumbnail */}
                        <div className="relative w-32 sm:w-40 flex-shrink-0 bg-gray-100">
                          {heroImg ? (
                            <Image src={heroImg} alt={project.name} fill unoptimized className="object-cover" sizes="160px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center min-h-[112px]">
                              <Building2 size={24} className="text-gray-200" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-4 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="text-[13px] font-bold text-gray-900 leading-tight">{project.name}</h3>
                              <div className="flex items-center gap-1 mt-0.5 text-[11px] text-gray-400">
                                <MapPin size={10} className="text-gray-300" />
                                {project.sector}, {project.city}
                              </div>
                            </div>
                            <ChevronRight size={14} className="text-gray-300 flex-shrink-0 mt-0.5" />
                          </div>

                          {project.tagline && (
                            <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed line-clamp-2">{project.tagline}</p>
                          )}

                          <div className="flex items-center flex-wrap gap-2 mt-2.5">
                            <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                            {bhkLabel(project) && (
                              <span className="text-[10px] text-gray-500 font-medium">{bhkLabel(project)}</span>
                            )}
                            {project.rera_number && (
                              <span className="flex items-center gap-0.5 text-[10px] text-blue-600 font-medium">
                                <Shield size={9} />
                                RERA
                              </span>
                            )}
                          </div>

                          <div className="mt-1.5">
                            <p className="text-[13px] font-black text-gray-900">{priceLabel(project)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}

            {filteredProjects.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-400 text-sm">
                No projects in this category.
              </div>
            )}
          </div>
        </motion.div>

        {/* Contact / Website */}
        {builder.website && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-sm p-4 mb-6"
          >
            <a
              href={builder.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between hover:bg-gray-50 rounded-xl px-1 py-1 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                  <ExternalLink size={14} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-800">Official Website</p>
                  <p className="text-[11px] text-gray-400">{builder.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</p>
                </div>
              </div>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
            </a>
          </motion.div>
        )}

        {/* Honest note */}
        <p className="text-[10px] text-gray-400 text-center mb-8 px-4 leading-relaxed">
          Builder information sourced from public records and RERA disclosures. Always verify independently at up-rera.in before purchase decisions.
        </p>

      </div>
    </div>
  )
}
