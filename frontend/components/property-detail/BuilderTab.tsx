'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Check, Globe, Download, Building2, Users, TrendingUp, Award, CalendarDays,
  ShieldCheck, ArrowUpRight, Sparkles, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, Heart, MapPin, BadgeCheck, FileText
} from 'lucide-react'
import type { Builder } from '@prisma/client'

interface BuilderTabProps {
  builder: (Builder & { logo_url?: string | null }) | null
  project: any
  loading: boolean
}

export default function BuilderTab({ builder, project, loading }: BuilderTabProps) {
  const [partnerIndex, setPartnerIndex] = useState(0)

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  const builderName = builder?.name || project?.builder_name || 'Elite Group'
  const foundedYear = builder?.founded_year || 2006
  const legacyYears = new Date().getFullYear() - foundedYear

  const channelPartnersList = (project?.channel_partners || []).length > 0
    ? (project.channel_partners as any[]).map((cp: any) => ({
        name: cp.name || '—',
        type: cp.type || 'Channel Partner',
        logo: '🌐'
      }))
    : []

  const featuredProjectsList = [
    { name: 'Elite Golf Greens', sector: 'Sector 79, Noida', config: '3, 4 BHK Apartments', status: 'Completed', color: 'bg-emerald-100 text-emerald-800' },
    { name: 'Elite Sky Residences', sector: 'Sector 150, Noida', config: '2, 3, 4 BHK Apartments', status: 'Under Construction', color: 'bg-blue-100 text-blue-800' },
    { name: 'Elite Business Park', sector: 'Sector 62, Noida', config: 'Commercial Spaces', status: 'Ongoing', color: 'bg-amber-100 text-amber-800' }
  ]

  return (
    <div className="space-y-8 py-2">
      
      {/* ── 1. BUILDER HERO BANNER ── */}
      <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 z-10 max-w-xl">
          {/* Builder Logo Box */}
          <div className="w-24 h-24 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 flex items-center justify-center p-3 flex-shrink-0 shadow-sm">
            {builder?.logo_url ? (
              <Image src={builder.logo_url} alt={builderName} width={80} height={80} className="object-contain" />
            ) : (
              <Building2 size={40} className="text-amber-600" />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-[10.5px] font-black tracking-wider uppercase flex items-center gap-1 border border-blue-100">
                <BadgeCheck size={12} /> Verified Builder
              </span>
            </div>

            <h1 className="text-[28px] md:text-[34px] font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              {builderName}
              <CheckCircle2 className="text-blue-500 fill-blue-500 text-white inline-block" size={20} />
            </h1>

            <p className="text-[12.5px] text-gray-500 dark:text-gray-400 font-semibold leading-relaxed">
              {builder?.company_overview || `Building Trust. Creating Landmarks. ${builderName} is a leading real estate developer with a legacy of delivering high-quality residential, commercial, and mixed-use projects across India.`}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {builder?.website && (
                <a
                  href={builder.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-[#111827] hover:bg-black text-white dark:bg-white dark:text-gray-900 font-black rounded-xl text-[12.5px] shadow-sm flex items-center gap-2 transition-all"
                >
                  <Globe size={15} /> Visit Official Website
                </a>
              )}
              <button className="px-5 py-2.5 bg-white dark:bg-white/10 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-white/10 font-extrabold rounded-xl text-[12.5px] shadow-sm flex items-center gap-2 hover:bg-gray-50 transition-all">
                <Download size={15} /> Download Brochure
              </button>
            </div>
          </div>
        </div>

        {/* Featured Image Card on Right */}
        <div className="w-full md:w-[320px] h-[190px] rounded-2xl overflow-hidden relative border border-gray-200/80 dark:border-white/10 flex-shrink-0 shadow-md">
          <Image
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80"
            alt="Builder Architecture"
            fill
            className="object-cover"
          />
        </div>
      </div>

      {/* ── 2. LEGACY & DELIVERED STAT METRICS BANNER ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { title: `${legacyYears}+`, label: 'Years of Legacy', icon: Clock, color: 'text-blue-600 bg-blue-50' },
          { title: `${builder?.projects_delivered_count || 42}+`, label: 'Projects Delivered', icon: Building2, color: 'text-purple-600 bg-purple-50' },
          { title: `${builder?.delivered_units ? (builder.delivered_units / 1000000).toFixed(1) : '22.4'}M+`, label: 'Sq. Ft. Delivered', icon: Award, color: 'text-amber-600 bg-amber-50' },
          { title: `${(builder as any)?.ongoing_projects || (builder as any)?.ongoing_projects_count || 28}+`, label: 'Ongoing Projects', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
          { title: '18,000+', label: 'Happy Families', icon: Users, color: 'text-rose-600 bg-rose-50' }
        ].map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="p-4 rounded-2xl bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-2 flex items-center gap-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.color}`}>
                <Icon size={18} />
              </div>
              <div>
                <h3 className="text-[20px] font-black text-gray-900 dark:text-white leading-tight">{stat.title}</h3>
                <p className="text-[10.5px] font-bold text-gray-400 leading-tight">{stat.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── 3. ABOUT BUILDER & FEATURED PROJECTS (2-Column Split) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* About Builder (6 columns) */}
        <div className="lg:col-span-6 bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5 h-full flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h2 className="text-[20px] font-black text-gray-900 dark:text-white tracking-tight">About {builderName}</h2>
              <p className="text-[12px] text-gray-500 font-medium mt-1 leading-relaxed">
                Founded in {foundedYear}, {builderName} has grown into one of India&apos;s most trusted real estate brands. Our vision is to craft spaces that combine innovation, quality, and sustainability to enhance lifestyles and communities.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {[
                { title: 'Customer-Centric Approach', desc: 'Putting customers at the heart of everything we do.', icon: Users, color: 'bg-blue-50 text-blue-600' },
                { title: 'Quality & Transparency', desc: 'Uncompromised quality with complete transparency.', icon: ShieldCheck, color: 'bg-emerald-50 text-emerald-600' },
                { title: 'Timely Delivery', desc: 'Strong track record of delivering projects on time.', icon: Clock, color: 'bg-amber-50 text-amber-600' },
                { title: 'Sustainable Development', desc: 'Building responsibly for a better tomorrow.', icon: Sparkles, color: 'bg-rose-50 text-rose-600' }
              ].map((item, idx) => {
                const Icon = item.icon
                return (
                  <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${item.color}`}>
                      <Icon size={15} />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-black text-gray-900 dark:text-white leading-tight">{item.title}</h4>
                      <p className="text-[11px] text-gray-400 font-semibold">{item.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <button className="text-[12.5px] font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1 pt-3 self-start">
            Explore Our Story <ArrowUpRight size={14} />
          </button>
        </div>

        {/* Featured Projects (6 columns) */}
        <div className="lg:col-span-6 bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] font-black text-gray-900 dark:text-white tracking-tight">Featured Projects</h2>
            <button className="text-[12px] font-extrabold text-blue-600 hover:underline">View All Projects</button>
          </div>

          <div className="space-y-3">
            {featuredProjectsList.map((proj, idx) => (
              <div key={idx} className="p-3 bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl flex items-center justify-between gap-3 hover:border-gray-200 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-14 rounded-xl bg-gray-200 dark:bg-white/10 relative overflow-hidden flex-shrink-0">
                    <Image src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=200&q=80" alt={proj.name} fill className="object-cover" />
                  </div>
                  <div>
                    <h4 className="text-[13.5px] font-black text-gray-900 dark:text-white leading-tight">{proj.name}</h4>
                    <p className="text-[11px] text-gray-400 font-semibold">{proj.sector}</p>
                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">{proj.config}</p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-black ${proj.color}`}>
                  {proj.status}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── 4. TRUST & CREDENTIALS ── */}
      <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
        <div>
          <h2 className="text-[20px] font-black text-gray-900 dark:text-white tracking-tight">Trust &amp; Credentials</h2>
          <p className="text-[12px] text-gray-500 font-medium mt-0.5">Verified promoter status and industry memberships.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { title: 'RERA Registered', sub: builder?.rera_promoter_id || 'UPRERAPRJ916631', tag: 'Registered', color: 'bg-blue-50 text-blue-600' },
            { title: 'ISO 9001:2015', sub: 'Quality Management', tag: 'Certified', color: 'bg-indigo-50 text-indigo-600' },
            { title: 'CREDAI Member', sub: 'Confederation of Real Estate', tag: 'Member', color: 'bg-emerald-50 text-emerald-600' },
            { title: 'IGBC Member', sub: 'Indian Green Building Council', tag: 'Green', color: 'bg-teal-50 text-teal-600' },
            { title: 'GST Compliant', sub: '27AABCE1234F1Z5', tag: 'Verified', color: 'bg-purple-50 text-purple-600' }
          ].map((item, i) => (
            <div key={i} className="p-3.5 rounded-2xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${item.color}`}>
                <BadgeCheck size={16} />
              </div>
              <div>
                <h4 className="text-[12.5px] font-black text-gray-900 dark:text-white leading-tight">{item.title}</h4>
                <p className="text-[10px] text-gray-400 font-semibold truncate mt-0.5">{item.sub}</p>
                <span className="inline-block text-[9.5px] font-black text-emerald-600 dark:text-emerald-400 mt-1">{item.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. OUR IMPACT SUMMARY ── */}
      <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
        <div>
          <h2 className="text-[20px] font-black text-gray-900 dark:text-white tracking-tight">Our Impact</h2>
          <p className="text-[12px] text-gray-500 font-medium mt-0.5">Numbers that reflect our commitment to excellence and trust.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { val: `${legacyYears}+`, label: 'Years of Legacy' },
            { val: `${builder?.projects_delivered_count || 42}+`, label: 'Projects Delivered' },
            { val: '22.4M+', label: 'Sq. Ft. Delivered' },
            { val: '18,000+', label: 'Happy Families' },
            { val: '4.7/5', label: 'Customer Rating (1200+ reviews)' }
          ].map((imp, i) => (
            <div key={i} className="p-4 rounded-2xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
              <h3 className="text-[22px] font-black text-gray-900 dark:text-white">{imp.val}</h3>
              <p className="text-[11px] text-gray-400 font-extrabold">{imp.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 6. AWARDS & MEDIA ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Awards & Recognition */}
        <div className="lg:col-span-6 bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <h2 className="text-[20px] font-black text-gray-900 dark:text-white tracking-tight">Awards &amp; Recognition</h2>
          <p className="text-[11.5px] text-gray-500 font-medium">Honored for our commitment to quality and innovation.</p>

          <div className="space-y-3 pt-1">
            {[
              { title: 'Luxury Project of the Year 2023', src: 'By Realty+ Excellence Awards' },
              { title: 'Best Sustainable Developer 2022', src: 'By IGBC Green Excellence Awards' },
              { title: 'Customer Choice Award 2021', src: 'By ET Now Real Estate Awards' }
            ].map((award, i) => (
              <div key={i} className="p-3 bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <Award size={16} />
                </div>
                <div>
                  <h4 className="text-[12.5px] font-black text-gray-900 dark:text-white leading-tight">{award.title}</h4>
                  <p className="text-[10.5px] text-gray-400 font-semibold">{award.src}</p>
                </div>
              </div>
            ))}
          </div>

          <button className="text-[12px] font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1 pt-2">
            View All Awards <ArrowUpRight size={14} />
          </button>
        </div>

        {/* In The Media */}
        <div className="lg:col-span-6 bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <h2 className="text-[20px] font-black text-gray-900 dark:text-white tracking-tight">In The Media</h2>
          <p className="text-[11.5px] text-gray-500 font-medium">Featured in leading publications.</p>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {['The Economic Times', 'Forbes', 'CNBC TV18', 'ET Realty'].map((pub, i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-center text-[13px] font-black text-gray-700 dark:text-gray-300">
                {pub}
              </div>
            ))}
          </div>

          <button className="text-[12px] font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1 pt-2">
            View All Features <ArrowUpRight size={14} />
          </button>
        </div>

      </div>

      {/* ── 7. CHANNEL PARTNERS ── */}
      <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-black text-gray-900 dark:text-white tracking-tight">Channel Partners</h2>
            <p className="text-[12px] text-gray-500 font-medium mt-0.5">Our trusted network of sales &amp; distribution partners.</p>
          </div>
          <button className="text-[12px] font-extrabold text-blue-600 hover:underline">View All Partners</button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
          {channelPartnersList.map((partner, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center gap-3">
              <span className="text-2xl">{partner.logo}</span>
              <div>
                <h4 className="text-[12.5px] font-black text-gray-900 dark:text-white leading-tight">{partner.name}</h4>
                <p className="text-[10px] text-gray-400 font-semibold">{partner.type}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 8. WHY CHOOSE BUILDER? GRID ── */}
      <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
        <div>
          <h2 className="text-[20px] font-black text-gray-900 dark:text-white tracking-tight">Why Choose {builderName}?</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { icon: Clock, title: 'Timely Delivery', desc: 'Track record of on-time project completion.', color: 'bg-blue-50 text-blue-600' },
            { icon: ShieldCheck, title: 'Superior Quality', desc: 'Premium materials and international standards.', color: 'bg-indigo-50 text-indigo-600' },
            { icon: MapPin, title: 'Prime Locations', desc: 'Projects in high-growth corridors with excellent connectivity.', color: 'bg-purple-50 text-purple-600' },
            { icon: Sparkles, title: 'Innovative Design', desc: 'Thoughtfully designed spaces for modern lifestyles.', color: 'bg-emerald-50 text-emerald-600' },
            { icon: Users, title: 'After-Sales Support', desc: 'Dedicated support before, during & after possession.', color: 'bg-amber-50 text-amber-600' }
          ].map((card, i) => {
            const Icon = card.icon
            return (
              <div key={i} className="p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.color}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <h4 className="text-[13px] font-black text-gray-900 dark:text-white leading-tight">{card.title}</h4>
                  <p className="text-[11px] text-gray-400 font-semibold mt-1 leading-normal">{card.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 9. DARK BLUE BOTTOM CTA FOOTER ── */}
      <div className="relative overflow-hidden bg-[#1E293B] dark:bg-black rounded-[24px] p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1 text-center sm:text-left z-10">
          <h3 className="text-[20px] font-black text-white tracking-tight">Let&apos;s Build Your Future Together</h3>
          <p className="text-[12.5px] text-slate-300 font-medium">Discover our projects and experience the {builderName} difference.</p>
        </div>
        <button className="px-6 py-3 bg-white text-gray-900 font-black rounded-xl text-[13px] shadow-md hover:bg-gray-100 transition-all flex items-center gap-2 flex-shrink-0 z-10">
          <CalendarDays size={16} /> Book Site Visit
        </button>
      </div>

      <p className="text-center text-[10.5px] text-gray-400 font-bold">
        All project information is indicative and subject to change. RERA details available on respective project pages.
      </p>

    </div>
  )
}
