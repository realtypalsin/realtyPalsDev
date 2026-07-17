'use client'
import {
  Building2, CheckCircle2, LineChart, BedDouble,
  MapPin, Sparkles, CalendarDays, FileText, IndianRupee
} from 'lucide-react'

import { useState, useEffect, useRef } from 'react'
import {  AnimatePresence, m  } from 'framer-motion'
import Image from 'next/image'
import type { ProjectCard as ProjectCardType, ProjectDetail } from '@/types/project'
import { buildWhatsAppUrl } from '@/lib/whatsapp'
import { track, trackPropertyEvent } from '@/lib/analytics'
import { authHeaders } from '@/lib/authedFetch'
import { getAqi, type AqiResult } from '@/lib/waqi'
import { usePreferredImages } from '@/lib/hooks'
import SiteVisitScheduler from '@/components/SiteVisitScheduler'
import FloorPlanViewer from '@/components/FloorPlanViewer'
import OverviewTab from '@/components/property-detail/OverviewTab'
import dynamic from 'next/dynamic'
const IntelligenceTab = dynamic(() => import('@/components/property-detail/IntelligenceTab'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[600px] rounded-xl" />
})
import ResidencesTab from '@/components/property-detail/ResidencesTab'
import ProjectPricingTab from '@/components/property-detail/ProjectPricingTab'
import LocationTab from '@/components/property-detail/LocationTab'
import DocumentsTab from '@/components/property-detail/DocumentsTab'
import CompetitorsTab from '@/components/property-detail/CompetitorsTab'
import { API_BASE } from '@/lib/env'
import { getPaymentPlan, getCostSheet } from '@/lib/backend-api'
import { resolveImgUrl } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

export interface ProjectDocumentPublic {
  id: string
  doc_type: string
  name: string | null
  storage_url: string
  created_at: string
  file_size_bytes: number | null
}


interface Props {
  project: ProjectCardType | null
  onClose: () => void
  inline?: boolean
  initialDetail?: ProjectDetail
  userId?: string | null

}

const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

const SECTION_TABS = ['Overview', 'Analysis', 'Residences', 'Pricing', 'Location', 'Documents'] as const
type Tab = typeof SECTION_TABS[number]

const tierLabel: Record<string, string> = { STRONG_BUY: 'Strong Buy', BUY: 'Buy', HOLD: 'Hold', WATCH: 'Watch', AVOID: 'Avoid' }

export default function ProjectDetailPanel({ project, onClose, inline, initialDetail, userId }: Props) {
  const [detail, setDetail]           = useState<ProjectDetail | null>(initialDetail ?? null)
  const [documents, setDocuments]     = useState<ProjectDocumentPublic[]>([])
  const [loading, setLoading]         = useState(false)
  const [activeTab, setActiveTab]     = useState<Tab>('Overview')
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false)
  // Optimistic-only, same as ProjectCard's save button — no GET check on mount,
  // so it doesn't reflect a pre-existing saved state, just the current session's action.
  const [saved, setSaved]             = useState(false)
  const [saving, setSaving]           = useState(false)
  const [paymentPlan, setPaymentPlan] = useState<{ loaded: boolean; available: boolean; data: Record<string, unknown> | null; message?: string }>({ loaded: false, available: false, data: null })
  const [costSheet, setCostSheet]     = useState<{ loaded: boolean; available: boolean; data: Record<string, unknown> | null; illustration: Record<string, number | null> | null; note?: string; message?: string }>({ loaded: false, available: false, data: null, illustration: null })
  const [showVisitScheduler, setShowVisitScheduler] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => setIsScrolled(e.currentTarget.scrollTop > 200)
  const [showFloorPlan, setShowFloorPlan] = useState<{ plans: Array<{ id: string; url: string; caption?: string | null }> } | null>(null)
  const [aqi, setAqi]                 = useState<AqiResult | null>(null)
  const [marketVisible, setMarketVisible] = useState(false)
  const [isMobile, setIsMobile]       = useState(false)
  const marketRef                     = useRef<HTMLDivElement>(null)
  const scrollContainerRef            = useRef<HTMLDivElement>(null)
  const scrollContainerMobileRef      = useRef<HTMLDivElement>(null)
  const { imgIdx, markImageFailed, activeUrl, setImgIdx } = usePreferredImages(project, detail?.images)

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'auto' })
    }
    if (scrollContainerMobileRef.current) {
      scrollContainerMobileRef.current.scrollTo({ top: 0, behavior: 'auto' })
    }
  }, [activeTab])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const el = marketRef.current
    if (!el || marketVisible) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setMarketVisible(true); observer.disconnect() } },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [activeTab, loading, marketVisible])

  useEffect(() => {
    if (!project) { setDetail(null); setDocuments([]); setLoading(false); return }
    setActiveTab('Overview')
    setAqi(null)
    setMarketVisible(false)
    setDetail(null)
    setDocuments([])
    setPaymentPlan({ loaded: false, available: false, data: null })
    setCostSheet({ loaded: false, available: false, data: null, illustration: null })
    if (initialDetail?.slug === project.slug) {
      setDetail(initialDetail)
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE}/projects/${project.slug}`).then(r => {
        console.log('[DETAIL:RESPONSE]', { status: r.status, slug: project.slug, url: r.url })
        return r.json()
      }),
      fetch(`${API_BASE}/projects/${project.slug}/documents`).then(r => r.ok ? r.json() : { documents: [] }),
    ])
      .then(([data, docsData]) => {
        console.log('[DETAIL:PAYLOAD]', {
          project_name:     data.project?.name                                          ?? 'NULL',
          rec_tier:         data.project?.recommendation_profile?.tier                 ?? 'MISSING',
          persona:          data.project?.persona_profile?.primary_persona              ?? 'MISSING',
          decision_thesis:  data.project?.decision_profile?.decision_thesis?.slice(0, 80) ?? 'MISSING',
          competitor_count: data.project?.competitors?.length                           ?? 0,
          doc_count:        docsData.documents?.length                                  ?? 0,
        })
        setDetail(data.project ?? null)
        setDocuments(docsData.documents ?? [])
      })
      .catch(() => { setDetail(null); setDocuments([]) })

      .finally(() => setLoading(false))
  }, [project?.slug])

  useEffect(() => {
    if (!initialDetail || !project) return
    if (initialDetail.slug !== project.slug) return
    setDetail(initialDetail)
    setLoading(false)
  }, [initialDetail?.slug, project?.slug])

  useEffect(() => {

    if (!project) return
    getAqi(project.lat, project.lng, 'noida').then(setAqi).catch(() => {})
  }, [project?.slug])

  useEffect(() => {
    if (!project) return
    trackPropertyEvent(project.id, 'view', undefined, userId).catch(() => {})
  }, [project?.id, userId])

  useEffect(() => {
    if (!project) return
    trackPropertyEvent(project.id, 'tab_opened', undefined, userId, undefined, { tab: activeTab }).catch(() => {})
  }, [activeTab, project?.id, userId])

  // Lazy-load payment plan when 'Pricing' or 'Residences' tab is opened.
  useEffect(() => {
    if ((activeTab !== 'Pricing' && activeTab !== 'Residences') || !project?.slug || paymentPlan.loaded) return
    getPaymentPlan(project.slug).then((res) => {
      setPaymentPlan({ loaded: true, available: res.available, data: res.plan ?? null, message: res.message })
    }).catch(() => {
      setPaymentPlan({ loaded: true, available: false, data: null, message: 'Unable to load payment plan.' })
    })
  }, [activeTab, project?.slug])

  // Lazy-load cost sheet when 'Pricing' tab is opened.
  useEffect(() => {
    if (activeTab !== 'Pricing' || !project?.slug || costSheet.loaded) return
    getCostSheet(project.slug).then((res) => {
      setCostSheet({ loaded: true, available: res.available, data: res.sheet ?? null, illustration: res.illustration ?? null, note: res.illustration_note, message: res.message })
    }).catch(() => {
      setCostSheet({ loaded: true, available: false, data: null, illustration: null, message: 'Unable to load cost sheet.' })
    })
  }, [activeTab, project?.slug])

  useEffect(() => {
    if (inline || !project) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [!!project, inline])

  const isOpen = !!project

  // Same /saved endpoint ProjectCard already calls — reused, not reinvented.
  const handleSave = async () => {
    if (!userId || saving || !project) return
    setSaving(true)
    const wasSaved = saved
    setSaved(!wasSaved)
    try {
      if (wasSaved) {
        const res = await fetch(`${API_BASE}/saved/${project.id}`, { method: 'DELETE', headers: await authHeaders() })
        if (!res.ok) throw new Error('Delete failed')
      } else {
        const res = await fetch(`${API_BASE}/saved`, {
          method: 'POST',
          headers: await authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ project_id: project.id }),
        })
        if (!res.ok) throw new Error('Save failed')
        track('property_saved', { project_slug: project.slug, project_name: project.name })
      }
    } catch {
      setSaved(wasSaved)
    } finally {
      setSaving(false)
    }
  }

  const handleOpenSiteVisit = () => {
    if (project) trackPropertyEvent(project.id, 'site_visit', undefined, userId).catch(() => {})
    setShowVisitScheduler(true)
  }

  // Hero/exterior images lead the carousel — same priority ProjectCard and the
  // admin previews use — so the cover photo is never a floor plan/amenity shot.
  // Falls back to `project.images` (already loaded from the search-result card)
  // while `detail` is still fetching, instead of jumping straight to the legacy
  // `hero_image_url` column, which can be a stale/deleted local path.
  const imageTypeRank = (type: string) => {
    const t = type.toLowerCase()
    return t === 'hero' ? 0 : t === 'exterior' ? 1 : 2
  }
  const allImages = [...(detail?.images ?? project?.images ?? [])].sort((a, b) => imageTypeRank(a.type) - imageTypeRank(b.type))
  const floorPlanImages = allImages.filter(i => i.type === 'floor_plan')
  const currentImg = activeUrl ? resolveImgUrl(activeUrl) : null

  const d = detail ?? project

  const isRTM = d?.status === 'ready_to_move'
  const isNew = d?.status === 'new_launch'

  const bhkLabel = [...new Set((d?.unit_types ?? []).map((u) => `${u.bhk}BHK`))].join(' · ')

  const tier          = detail?.recommendation_profile?.tier ?? null
  // Prefer the deterministic DB score (Overview's own source) so the number and
  // tier shown together always come from the same computation; fall back to the
  // chat-computed decision score only when the DB one isn't verified yet.
  const heroScore     = detail?.recommendation_score?.total ?? project?.decisionIntelligence?.overallScore ?? null
  const heroTier      = detail?.recommendation_score?.tier ?? project?.decisionIntelligence?.tier ?? tier
  const persona       = detail?.persona_profile?.primary_persona ?? null
  const decisionThesis = detail?.decision_profile?.decision_thesis ?? null
  const whyBuy        = detail?.decision_profile?.why_buy ?? []
  const whyAvoid      = detail?.decision_profile?.why_avoid ?? []
  const timelineAdvice     = detail?.recommendation_profile?.timeline_advice ?? null
  const negotiationLeverage = detail?.recommendation_profile?.negotiation_leverage ?? []
  const walkAwayConditions  = detail?.recommendation_profile?.walk_away_conditions ?? []
  const competitors   = detail?.competitors ?? []

  // ── Tier + persona Notion-style callout (shared mobile/desktop) ─────────────────────
  const intelligenceChips = (tier || persona) && (
    <div className="flex items-start gap-3 bg-gray-50/80 border border-gray-200/60 rounded-xl p-3">
      <Sparkles size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-[11px] font-bold text-gray-900 mb-0.5">Investment Thesis</p>
        <p className="text-[12px] text-gray-600 leading-relaxed">
          {tier && <span>Rated as <strong className="text-gray-900">{tierLabel[tier] ?? tier}</strong>. </span>}
          {persona && <span>Ideal for {persona.charAt(0) + persona.slice(1).toLowerCase()}.</span>}
        </p>
      </div>
    </div>
  )

  // ── Shared tab body ───────────────────────────────────────────────────────
  // Single tab-switch transition reused by all three render paths below
  // (inline, desktop modal, mobile sheet) instead of each defining its own.
  const tabBody = (
    <AnimatePresence mode="wait">
      <m.div
        key={activeTab}
        initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
      {activeTab === 'Overview' && (
        <OverviewTab
          project={project}
          detail={detail}
          d={d}
          loading={loading}
          documents={documents}
          aqi={aqi}
          floorPlanImages={floorPlanImages}
          decisionThesis={decisionThesis}
          whyBuy={whyBuy}
          whyAvoid={whyAvoid}
          onViewFloorPlans={(plans) => setShowFloorPlan({ plans })}
          onGoToLocation={() => setActiveTab('Location')}
          onGoToDocuments={() => setActiveTab('Documents')}
          onGoToPricing={() => setActiveTab('Residences')}
        />
      )}

      {activeTab === 'Analysis' && (
        <IntelligenceTab
          project={project}
          detail={detail}
          d={d}
          loading={loading}
          timelineAdvice={timelineAdvice}
          negotiationLeverage={negotiationLeverage}
          walkAwayConditions={walkAwayConditions}
          marketVisible={marketVisible}
          marketRef={marketRef}
        />
      )}

      {activeTab === 'Residences' && (
        <div className="space-y-8 pb-12">
          <ResidencesTab
            unitTypes={d?.unit_types ?? []}
            floorPlanImages={floorPlanImages}
            loading={loading}
            detail={detail}
            projectStatus={d?.status}
            paymentPlan={paymentPlan}
            costSheet={costSheet}
            onViewFloorPlans={(plans) => setShowFloorPlan({ plans })}
            onGoToCosts={() => setActiveTab('Pricing')}
            onGoToOverview={() => setActiveTab('Overview')}
          />
        </div>
      )}

      {activeTab === 'Pricing' && (
        <div className="space-y-8 pb-12 pt-8">
          <ProjectPricingTab
            unitTypes={d?.unit_types ?? []}
            detail={{ ...(detail as any), payment_plan: paymentPlan.data, cost_sheet: costSheet.data }}
            onGoToCosts={() => handleOpenSiteVisit()}
          />
        </div>
      )}

      {activeTab === 'Location' && (
        <LocationTab
          project={project}
          detail={detail}
          d={d}
          projectAddress={`${d?.address ?? d?.name}, ${d?.sector}, ${d?.city}, India`}
        />
      )}

      {activeTab === 'Documents' && (() => {
        const intelDocs = detail?.decision_profile?.intelligence_data?.documents || []
        const transparencyChecks = detail?.decision_profile?.intelligence_data?.transparency_checks || []
        const mappedDocs = documents.map(doc => {
          const meta = intelDocs.find((m: any) => m.id === doc.id || m.file_name === doc.storage_url.split('/').pop())
          return {
            ...doc,
            description: meta?.description || undefined,
            is_quick_access: meta?.is_quick_access || false,
            thumbnail_url: meta?.thumbnail_url || undefined,
            file_format: meta?.file_format || undefined,
            verified_by: meta?.verified_by || undefined,
            category_description: meta?.category?.category_description || undefined,
            category_icon_name: meta?.category?.category_icon_name || undefined
          }
        })
        return (
          <DocumentsTab
            documents={mappedDocs}
            loading={loading && !detail}
            projectSlug={(d as any)?.slug}
            projectId={project?.id}
            userId={userId}
            transparency_checks={transparencyChecks}
          />
        )
      })()}
      </m.div>
    </AnimatePresence>
  )

  // ── CTA footer ─────────────────────────────────────────────────────────────
  const ctaFooter = (
    <div className="flex-shrink-0 border-t border-gray-100 p-4 bg-white space-y-2">
      <button
        onClick={() => handleOpenSiteVisit()}
        className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl text-[14px] transition-colors flex items-center justify-center gap-2"
      >
        <CalendarDays size={16} />
        Book Site Visit
      </button>
      {(() => {
        const waUrl = d ? buildWhatsAppUrl(d as any, 'panel') : null
        return waUrl ? (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              track('whatsapp_handoff', { project_slug: (d as any)?.slug, project_name: (d as any)?.name })
              trackPropertyEvent((d as any)?.id, 'whatsapp_inquiry', undefined, userId).catch(() => {})
            }}
            className="w-full border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-800 py-3 rounded-2xl text-[13px] transition-colors flex items-center justify-center gap-2"
          >
            <WhatsAppIcon size={14} />
            Ask on WhatsApp
          </a>
        ) : null
      })()}
    </div>
  )

  // ── Unified Sticky Header (Vercel Style) & Tab Strip ──────────────────────────────────
  const tabIcons: Record<Tab, React.ReactNode> = {
    Overview: <Building2 size={15} />,
    Analysis: <LineChart size={15} />,
    Residences: <BedDouble size={15} />,
    Pricing: <IndianRupee size={15} />,
    Location: <MapPin size={15} />,
    Documents: <FileText size={15} />
  }

  const tabStrip = (
    <div className="flex gap-3 px-5 py-4 overflow-x-auto hide-scrollbar border-b border-gray-100 dark:border-gray-800/40">
      {SECTION_TABS.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-4 py-2.5 flex items-center gap-2 text-[13px] font-semibold rounded-[14px] transition-all whitespace-nowrap border ${
              isActive
                ? 'bg-white border-gray-200 text-gray-900 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:bg-zinc-800 dark:border-zinc-700 dark:text-white'
                : 'bg-transparent border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50/80 dark:hover:bg-zinc-800/50 dark:hover:text-gray-300'
            }`}
          >
            {tabIcons[tab]}
            {tab}
          </button>
        )
      })}
    </div>
  )

  const stickyHeader = (
    <div className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 shadow-sm transition-all duration-300">
      <div className={`flex items-center px-4 transition-all duration-300 overflow-x-auto hide-scrollbar h-[60px] max-w-7xl mx-auto`}>
        
        {/* Left: Identity (Always injected for new layout) */}
        <div className={`flex items-center gap-3 transition-all duration-400 flex-shrink-0 overflow-hidden opacity-100 translate-x-0 mr-2 md:mr-4`}>
           <div className="flex items-center gap-2 flex-shrink-0 max-w-[120px] md:max-w-[200px]">
             <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isRTM ? 'bg-emerald-500' : isNew ? 'bg-blue-500' : 'bg-amber-500'}`} />
             <span className="font-bold text-gray-900 dark:text-gray-100 text-[14px] truncate">{d?.name}</span>
           </div>
           <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 flex-shrink-0 hidden md:block" />
        </div>

        {/* Center: Tabs */}
        <div className="flex gap-1 md:gap-2 overflow-x-auto hide-scrollbar flex-1 px-1 md:px-2">
          {SECTION_TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-3 md:px-4 py-2 flex items-center gap-1.5 md:gap-2 text-[12px] md:text-[13px] font-semibold rounded-full transition-all whitespace-nowrap border ${
                  isActive 
                    ? 'bg-gray-900 text-white border-gray-900 shadow-sm dark:bg-white dark:text-gray-900 dark:border-white' 
                    : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100 hover:text-gray-900 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800'
                }`}
              >
                {tabIcons[tab]}
                <span className="hidden sm:inline">{tab}</span>
              </button>
            )
          })}
        </div>

        {/* Right: Action (Always injected for new layout) */}
        <div className={`flex items-center justify-end gap-3 transition-all duration-400 flex-shrink-0 overflow-hidden opacity-100 translate-x-0 ml-2 md:ml-4`}>
           <p className="text-[12px] font-semibold text-gray-500 hidden lg:block whitespace-nowrap">{d?.price_range_label}</p>
           <button onClick={() => handleOpenSiteVisit()} className="px-4 py-2 bg-gray-900 dark:bg-white hover:bg-black dark:hover:bg-gray-100 hover:scale-105 active:scale-95 text-white dark:text-gray-900 font-semibold rounded-full text-[12px] transition-all whitespace-nowrap flex-shrink-0 shadow-sm">
             Book Site Visit
           </button>
        </div>
      </div>
    </div>
  )

  const renderHero = () => {
    const displayPrice = d?.price_range_label || (d?.price_min_cr ? `₹${d.price_min_cr} Cr Onwards` : 'Price on Request')
      const displayPossession = d?.possession_label || 'TBD'
      const displayScore = detail?.recommendation_score?.total || (d as any)?.recommendation_score?.total || 0
      const displayTier = detail?.recommendation_score?.tier || (d as any)?.recommendation_score?.tier || 'UNRATED'
      const unitTypes = d?.unit_types ?? []

      return (
        <div className="relative w-full bg-white dark:bg-[#120f0d] border-b border-gray-100 dark:border-gray-800/40 overflow-hidden flex-shrink-0">
          {!inline && (
            <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 bg-black/40 hover:bg-black/60 border border-white/20 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur-md z-20">
              <X size={20} />
            </button>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 md:p-8 items-center">
            
            {/* Left Hero Details */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div>
                  <span className="inline-block bg-[#FEF3C7] dark:bg-[#2c2211] text-[#D97706] dark:text-[#fbbf24] text-[10px] md:text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded">
                    {d?.status === 'ready_to_move' ? 'Ready to Move' : d?.status === 'new_launch' ? 'New Launch' : 'Under Construction'}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-[36px] md:text-[48px] font-black font-sans tracking-tighter leading-none text-gray-900 dark:text-white">
                    {d?.name}
                  </h1>
                  {d?.rera_number && (
                    <span className="flex items-center gap-1 bg-[#E8F5E9] dark:bg-[#1b2f20] text-[#2E7D32] dark:text-[#a5d6a7] text-[11px] font-bold px-2.5 py-1 rounded-full border border-[#C8E6C9] dark:border-[#2e7d32]/30">
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                      RERA Registered
                    </span>
                  )}
                </div>
                {d?.tagline && (
                  <p className="text-[16px] md:text-[18px] text-gray-500 dark:text-gray-400 font-medium tracking-tight">
                    {d.tagline}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                  {d?.builder?.name && (
                    <span className="flex items-center gap-1">
                      <Building2 size={15} className="text-gray-400" />
                      by <strong className="text-gray-800 dark:text-gray-200">{d.builder.name}</strong>
                    </span>
                  )}
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
                  <span className="flex items-center gap-1">
                    <MapPin size={15} className="text-gray-400" />
                    {d?.sector}, {d?.city}
                  </span>
                </div>
              </div>

              {/* Stats Row Bento */}
              <div className="grid grid-cols-4 gap-2 md:gap-3 pt-6 border-t border-gray-100 dark:border-gray-800/40">
                {[
                  { value: d?.total_towers ? `${d.total_towers}` : '—', label: 'Towers' },
                  { value: (d as any)?.floors ? `${(d as any).floors}` : '—', label: 'Floors' },
                  { value: (d as any)?.total_units ? `${(d as any).total_units}` : '—', label: 'Units' },
                  { value: d?.land_area_acres ? `${d.land_area_acres} Ac` : '—', label: 'Land Area' }
                ].map((stat, i) => (
                  <div key={i} className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[16px] p-4 text-center shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5">
                    <p className="text-[20px] md:text-[24px] font-black tracking-tight text-gray-900 dark:text-white leading-none">
                      {stat.value}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-[0.1em] mt-2">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Hero Image Card */}
            <div
              onClick={() => {
                if (project) trackPropertyEvent(project.id, 'floorplan_viewed', undefined, userId).catch(() => {})
                setShowFloorPlan({ plans: allImages.length > 0 ? allImages : floorPlanImages })
              }}
              className="lg:col-span-5 relative rounded-3xl overflow-hidden h-[260px] lg:h-[280px] shadow-md group cursor-pointer"
            >
              <Image 
                src={currentImg || "/images/properties/default-hero.jpg"} 
                alt={d?.name || "Project Image"} 
                fill 
                priority 
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                onError={() => {
                  if (currentImg) markImageFailed(currentImg)
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
              {allImages.length > 0 && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm transition-colors z-10">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {allImages.length} Photos
                </div>
              )}
            </div>

          </div>

          {/* Bottom Price/Score Overlay Row */}
          <div className="mx-6 md:mx-8 mb-6 md:mb-8 bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[20px] p-5 md:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] grid grid-cols-1 md:grid-cols-12 gap-4 items-center divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-white/10">
            {/* Price & Possession */}
            <div className="md:col-span-6 pb-4 md:pb-0 md:pr-4 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
              <div>
                <p className="text-[26px] md:text-[32px] lg:text-[34px] font-black tracking-tighter text-gray-900 dark:text-white leading-none whitespace-nowrap">
                  {displayPrice}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-[0.1em] mt-2">
                  All Inclusive {unitTypes.length > 0 && `· Starts ₹${Math.min(...unitTypes.map(u => u.super_area_sqft && u.price_min_cr ? Math.round((u.price_min_cr * 10000000) / u.super_area_sqft) : Infinity).filter(v => v !== Infinity))}/sqft`}
                </p>
              </div>
              <div className="flex items-center gap-2 bg-[#FAF7F2] dark:bg-[#201c18] border border-[#F2E8D8]/40 px-3.5 py-2 rounded-xl">
                <svg className="w-4 h-4 text-[#c47860]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <div>
                  <p className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest leading-none">Possession</p>
                  <p className="text-[12px] font-bold text-gray-800 dark:text-gray-200 mt-0.5">{displayPossession}</p>
                </div>
              </div>
            </div>

            {/* AI Score */}
            <div className="md:col-span-4 py-4 md:py-0 md:px-6 flex items-center justify-between">
              <div className="pr-2">
                <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-widest mb-1">
                  AI Recommendation Score
                </p>
                <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-snug">
                  {detail?.recommendation_profile?.primary_thesis || 'Full intelligence report pending.'}
                </p>
              </div>
              <div className="relative flex items-center justify-center flex-shrink-0 w-14 h-14">
                <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-sm" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-gray-100 dark:stroke-gray-800" strokeWidth="3" />
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-gray-900 dark:stroke-white" strokeWidth="3"
                    pathLength="100" strokeDasharray="100" strokeDashoffset={100 - Number(displayScore)} strokeLinecap="round" 
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/50 dark:bg-black/20 m-1" />
                <span className="relative z-10 text-[14px] font-black tracking-tighter text-gray-900 dark:text-white leading-none">{displayScore}</span>
              </div>
            </div>
          </div>
        </div>
      )
  }


  // ── Inline mode (property page) ─────────────────────────────────────────────
  if (inline) {
    return (
      <m.div
        className="project-detail-wrapper"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <div className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-2xl rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col border border-gray-200/50 dark:border-gray-700/50">
          {renderHero()}

          {/* Tab strip — unified header */}
          {stickyHeader}
          <div className="flex-1 overflow-y-auto">{tabBody}</div>
          {ctaFooter}
        </div>

        <AnimatePresence mode="wait">
          {showVisitScheduler && project && (
            <SiteVisitScheduler projectId={project.id} projectSlug={project.slug} projectName={project.name} onClose={() => setShowVisitScheduler(false)} />
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          {showFloorPlan && (
            <FloorPlanViewer floorPlans={showFloorPlan.plans} title={`${project?.name} — Floor Plans`} onClose={() => setShowFloorPlan(null)} />
          )}
        </AnimatePresence>
      </m.div>
    )
  }

  // ── Shared: image badges used in mobile bottom sheet ──────────────────────
  const imageBadges = (
    <>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-8 h-8 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors z-20"
      >
        <X size={15} />
      </button>
    </>
  )

  const imageCarouselDots = allImages.length > 1 && (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
      {allImages.map((_, i) => (
        <button key={i} onClick={() => setImgIdx(i)}
          className={`h-1.5 rounded-full transition-all ${i === imgIdx ? 'bg-white w-4' : 'bg-white/40 w-1.5'}`} />
      ))}
    </div>
  )

  // ── Modal ──────────────────────────────────────────────────────────────────
  return (
    <div className="project-detail-wrapper">
      <AnimatePresence mode="wait">
        {isOpen && (
          <>
            {/* Backdrop & Centering Wrapper for Desktop */}
            <m.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/70 hidden md:flex items-center justify-center p-4 md:p-8"
              onClick={onClose}
            >
              {/* ── Desktop dialog ── */}
              <m.div
                key="dialog-desktop"
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="relative flex flex-col w-[95vw] max-w-[1200px] h-[90vh] max-h-[900px]
                           rounded-3xl bg-gray-50 overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.4)]"
                onClick={(e) => e.stopPropagation()}
              >
              {/* 
                 Floating Header is completely removed. 
                 The stickyHeader (tab bar) now dynamically injects the identity and action on scroll! 
              */}

              {/* Scrollable Content */}
              <div ref={scrollContainerRef} className="flex-1 overflow-y-auto w-full relative pb-24 hide-scrollbar" onScroll={handleScroll}>
                {/* Hero Section */}
                {renderHero()}

                {/* Sticky Header / Tabs */}
                {stickyHeader}

                {/* Main Content Area */}
                <div className="p-8 md:p-10 max-w-[1200px] mx-auto">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
                     {tabBody}
                  </div>
                </div>
              </div>

              {/* Floating Footer CTA (Pill Dock) */}
              <div className="absolute bottom-8 inset-x-0 z-50 hidden md:flex justify-center pointer-events-none">
                <div className="flex gap-3 bg-white/90 backdrop-blur-xl p-2 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-200/50 pointer-events-auto">
                  <button onClick={() => handleOpenSiteVisit()} className="px-8 py-3 bg-gray-900 hover:bg-black text-white font-semibold rounded-full text-[14px] transition-all flex items-center gap-2 shadow-sm">
                    <CalendarDays size={16} />
                    Book Site Visit
                  </button>
                  {(() => {
                    const waUrl = d ? buildWhatsAppUrl(d as any, 'panel') : null
                    return waUrl ? (
                      <a href={waUrl} target="_blank" rel="noopener noreferrer"
                        onClick={() => track('whatsapp_handoff', { project_slug: (d as any)?.slug, project_name: (d as any)?.name })}
                        className="px-6 py-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold rounded-full text-[14px] transition-all flex items-center gap-2">
                        <WhatsAppIcon size={16} />
                        Ask on WhatsApp
                      </a>
                    ) : null
                  })()}
                </div>
              </div>
            </m.div>
            {/* End Backdrop & Centering Wrapper for Desktop */}
            </m.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile bottom sheet gets its own AnimatePresence */}
      <AnimatePresence mode="wait">
        {isOpen && (
            <m.div
              key="dialog-mobile"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="fixed z-50 bottom-0 left-0 right-0 flex flex-col
                         md:hidden max-h-[92vh]
                         bg-white rounded-t-[24px] overflow-hidden
                         shadow-[0_-8px_40px_rgba(0,0,0,0.18)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              {/* Hero image */}
              <div className="relative h-56 bg-gray-900 flex-shrink-0 overflow-hidden">
                {currentImg ? (
                  <Image src={currentImg} alt={d?.name ?? ''} fill priority className="object-cover" sizes="100vw" onError={() => markImageFailed(currentImg)} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                    <Building2 size={40} className="text-slate-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
                {imageBadges}
                {imageCarouselDots}
              </div>

              {/* Name bar */}
              <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-start justify-between gap-3 mb-3">
                  {loading && !d?.name ? (
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ) : (
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-[18px] font-black text-gray-900 tracking-tight leading-tight truncate">{d?.name}</h2>
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isRTM ? 'bg-emerald-500' : isNew ? 'bg-blue-500' : 'bg-amber-500'}`} />
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-gray-500 font-medium">
                        <MapPin size={10} className="text-gray-400" />
                        <span>{d?.builder?.name}</span>
                        <span>·</span>
                        <span>{d?.sector}</span>
                        {d?.rera_number && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-0.5 text-blue-600 font-semibold">
                              <CheckCircle2 size={10} />
                              RERA
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  {d?.price_range_label && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-[18px] font-black text-gray-900 leading-none">{d.price_range_label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{bhkLabel}</p>
                    </div>
                  )}
                </div>
                {intelligenceChips && <div className="mb-3">{intelligenceChips}</div>}
                {tabStrip}
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {tabBody}
              </div>

              {/* Footer CTA */}
              {ctaFooter}
            </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {showVisitScheduler && project && (
          <SiteVisitScheduler
            projectId={project.id}
            projectSlug={project.slug}
            projectName={project.name}
            onClose={() => setShowVisitScheduler(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {showFloorPlan && (
          <FloorPlanViewer
            floorPlans={showFloorPlan.plans}
            title={`${project?.name} — Floor Plans`}
            onClose={() => setShowFloorPlan(null)}
          />
        )}
      </AnimatePresence>
    </div>

  )
}
