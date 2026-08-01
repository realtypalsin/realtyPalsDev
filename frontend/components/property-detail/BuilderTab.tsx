'use client'
import Image from 'next/image'
import { Check, Globe, Download, Building2, Users, TrendingUp, Award, Calendar } from 'lucide-react'
import type { Builder } from '@prisma/client'

interface BuilderTabProps {
  builder: (Builder & { logo_url?: string | null }) | null
  project: any
  loading: boolean
}

export default function BuilderTab({ builder, project, loading }: BuilderTabProps) {
  if (loading) {
    return (
      <div className="space-y-4 p-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (!builder) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Builder information not available</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      {/* About the Builder */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="flex-1">
            <h2 className="text-[28px] font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              {builder.name}
              {builder.rera_promoter_id && (
                <span className="text-xl" title="RERA Registered">✓</span>
              )}
            </h2>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-2">{builder.company_overview}</p>

            <div className="flex gap-3 mt-5 flex-wrap">
              {builder.website && (
                <a
                  href={builder.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black rounded-full text-[12px] font-semibold transition-colors"
                >
                  <Globe size={14} />
                  Visit Official Website
                </a>
              )}
              {builder.description && (
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-full text-[12px] font-semibold transition-colors">
                  <Download size={14} />
                  Download Company Profile
                </button>
              )}
            </div>
          </div>

          {builder.logo_url && (
            <div className="w-32 h-32 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
              <Image src={builder.logo_url} alt={builder.name} width={128} height={128} className="object-contain p-2" onError={e => {
                e.currentTarget.style.display = 'none'
              }} />
            </div>
          )}
        </div>
      </div>

      {/* Trust & Certifications */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-8">
        <h3 className="text-[16px] font-bold text-gray-900 dark:text-white mb-6">Trust & Certifications</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {builder.rera_promoter_id && (
            <div className="text-center">
              <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-2">
                <Check className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <p className="text-[11px] font-bold text-gray-900 dark:text-white">RERA Registered</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Verified</p>
            </div>
          )}
          {builder.iso_certified && (
            <div className="text-center">
              <div className="w-12 h-12 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-2">
                <Award className="text-green-600 dark:text-green-400" size={20} />
              </div>
              <p className="text-[11px] font-bold text-gray-900 dark:text-white">ISO 9001:2015</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Quality Management</p>
            </div>
          )}
          {builder.credai_member && (
            <div className="text-center">
              <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-2">
                <Users className="text-amber-600 dark:text-amber-400" size={20} />
              </div>
              <p className="text-[11px] font-bold text-gray-900 dark:text-white">CREDAI Member</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Industry Association</p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Snapshot */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-8">
        <h3 className="text-[16px] font-bold text-gray-900 dark:text-white mb-6">Performance Snapshot</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl">
            <p className="text-[28px] font-black text-gray-900 dark:text-white">{builder.projects_delivered_count || 0}</p>
            <p className="text-[12px] text-gray-600 dark:text-gray-400 mt-1">Projects Delivered</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl">
            <p className="text-[28px] font-black text-gray-900 dark:text-white">{builder.delivered_units ? `${(builder.delivered_units / 1000000).toFixed(1)}M` : '—'}</p>
            <p className="text-[12px] text-gray-600 dark:text-gray-400 mt-1">Total Area Delivered</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl">
            <p className="text-[28px] font-black text-gray-900 dark:text-white">{builder.total_projects_count && builder.projects_delivered_count ? Math.round((builder.projects_delivered_count / builder.total_projects_count) * 100) : '—'}%</p>
            <p className="text-[12px] text-gray-600 dark:text-gray-400 mt-1">Delivery Rate</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl">
            <p className="text-[28px] font-black text-gray-900 dark:text-white">{builder.delivery_score ? `${builder.delivery_score}/100` : '—'}</p>
            <p className="text-[12px] text-gray-600 dark:text-gray-400 mt-1">Delivery Track Record</p>
          </div>
        </div>
      </div>

      {/* Why Choose This Builder */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-8">
        <h3 className="text-[16px] font-bold text-gray-900 dark:text-white mb-6">Why Choose This Builder</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
              <Check className="text-green-600 dark:text-green-400" size={18} />
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-[13px]">On-Time Delivery</p>
              <p className="text-[12px] text-gray-600 dark:text-gray-400 mt-1">Strong track record of delivering projects on schedule</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
              <Award className="text-blue-600 dark:text-blue-400" size={18} />
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-[13px]">Quality Construction</p>
              <p className="text-[12px] text-gray-600 dark:text-gray-400 mt-1">Premium materials and international quality standards</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="text-purple-600 dark:text-purple-400" size={18} />
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-[13px]">Transparent Dealings</p>
              <p className="text-[12px] text-gray-600 dark:text-gray-400 mt-1">Clear communication and transparent pricing throughout</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
              <Users className="text-orange-600 dark:text-orange-400" size={18} />
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-[13px]">Customer First</p>
              <p className="text-[12px] text-gray-600 dark:text-gray-400 mt-1">Dedicated support before, during and after possession</p>
            </div>
          </div>
        </div>
      </div>

      {/* Our Journey */}
      {builder.founded_year && (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-8">
          <h3 className="text-[16px] font-bold text-gray-900 dark:text-white mb-6">Our Journey</h3>
          <div className="space-y-4">
            {builder.founded_year && (
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 rounded-full bg-blue-600 dark:bg-blue-400 mt-2 flex-shrink-0" />
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-[13px]">{builder.founded_year}</p>
                  <p className="text-[12px] text-gray-600 dark:text-gray-400">Company founded with vision for quality construction</p>
                </div>
              </div>
            )}
            {builder.projects_delivered_count && (
              <div className="flex items-start gap-4">
                <div className="w-3 h-3 rounded-full bg-emerald-600 dark:bg-emerald-400 mt-2 flex-shrink-0" />
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-[13px]">{builder.projects_delivered_count}+ Projects Delivered</p>
                  <p className="text-[12px] text-gray-600 dark:text-gray-400">Successfully delivered across multiple cities and segments</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-4">
              <div className="w-3 h-3 rounded-full bg-amber-600 dark:bg-amber-400 mt-2 flex-shrink-0" />
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-[13px]">Today & Growing</p>
                <p className="text-[12px] text-gray-600 dark:text-gray-400">Continuing to build trust through quality and transparency</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
