'use client'
import {
  Building2, CheckCircle2, Clock, LineChart, BedDouble,
  ExternalLink, X, MapPin, Sparkles, CalendarDays, Bookmark, FileText, IndianRupee, Wallet, Map as MapIcon, File as FileIcon
} from 'lucide-react'

import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import type { ProjectCard as ProjectCardType, ProjectDetail } from '@/types/project'
import { buildWhatsAppUrl } from '@/lib/whatsapp'
import { track } from '@/lib/analytics'
import { authHeaders } from '@/lib/authedFetch'
import { getAqi, type AqiResult } from '@/lib/waqi'
import SiteVisitScheduler from '@/components/SiteVisitScheduler'
import FloorPlanViewer from '@/components/FloorPlanViewer'
import OverviewTab from '@/components/property-detail/OverviewTab'
import IntelligenceTab from '@/components/property-detail/IntelligenceTab'
import PricingTab from '@/components/property-detail/PricingTab'
import LocationTab from '@/components/property-detail/LocationTab'
import DocumentsTab from '@/components/property-detail/DocumentsTab'
import { API_BASE } from '@/lib/env'
import { getPaymentPlan, getCostSheet } from '@/lib/backend-api'
import { resolveImgUrl } from '@/lib/utils'

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
  // Optimistic-only, same as ProjectCard's save button ΓÇö no GET check on mount,
  // so it doesn't reflect a pre-existing saved state, just the current session's action.
  const [saved, setSaved]             = useState(false)
  const [saving, setSaving]           = useState(false)
  const [paymentPlan, setPaymentPlan] = useState<{ loaded: boolean; available: boolean; data: Record<string, unknown> | null; message?: string }>({ loaded: false, available: false, data: null })
  const [costSheet, setCostSheet]     = useState<{ loaded: boolean; available: boolean; data: Record<string, unknown> | null; illustration: Record<string, number | null> | null; note?: string; message?: string }>({ loaded: false, available: false, data: null, illustration: null })
  const [imgIdx, setImgIdx]           = useState(0)
  const [showVisitScheduler, setShowVisitScheduler] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => setIsScrolled(e.currentTarget.scrollTop > 200)
  const [showFloorPlan, setShowFloorPlan] = useState<{ plans: Array<{ id: string; url: string; caption?: string | null }> } | null>(null)
  const [aqi, setAqi]                 = useState<AqiResult | null>(null)
  const [marketVisible, setMarketVisible] = useState(false)
  const [isMobile, setIsMobile]       = useState(false)
  // Per-URL failure tracking (not a single boolean) ΓÇö one broken candidate
  // shouldn't permanently blank the hero once a working one is available.
  const [failedImgUrls, setFailedImgUrls] = useState<Set<string>>(new Set())
  const markImgFailed = (src: string) => setFailedImgUrls((prev) => (prev.has(src) ? prev : new Set(prev).add(src)))
  const marketRef                     = useRef<HTMLDivElement>(null)

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
    setImgIdx(0)
    setFailedImgUrls(new Set())
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

  // Lazy-load payment plan when 'Pricing' tab is opened.
  useEffect(() => {
    if (activeTab !== 'Pricing' || !project?.slug || paymentPlan.loaded) return
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

  // Same /saved endpoint ProjectCard already calls ΓÇö reused, not reinvented.
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

  // Hero/exterior images lead the carousel ΓÇö same priority ProjectCard and the
  // admin previews use ΓÇö so the cover photo is never a floor plan/amenity shot.
  // Falls back to `project.images` (already loaded from the search-result card)
  // while `detail` is still fetching, instead of jumping straight to the legacy
  // `hero_image_url` column, which can be a stale/deleted local path.
  const imageTypeRank = (type: string) => (type === 'hero' ? 0 : type === 'exterior' ? 1 : 2)
  const allImages = [...(detail?.images ?? project?.images ?? [])].sort((a, b) => imageTypeRank(a.type) - imageTypeRank(b.type))
  const heroCandidates = [
    ...allImages.map((i) => i.url),
    ...(allImages.length === 0 && project?.hero_image_url ? [project.hero_image_url] : []),
  ].filter(Boolean) as string[]
  const workingHeroCandidates = heroCandidates.filter((src) => !failedImgUrls.has(src))
  const rawImg = workingHeroCandidates[imgIdx % Math.max(workingHeroCandidates.length, 1)]
  const currentImg = resolveImgUrl(rawImg)
  const floorPlanImages = allImages.filter(i => i.type === 'floor_plan')

  const d = detail ?? project

  const isRTM = d?.status === 'ready_to_move'
  const isNew = d?.status === 'new_launch'

  const bhkLabel = [...new Set((d?.unit_types ?? []).map((u) => `${u.bhk}BHK`))].join(' ┬╖ ')

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

  // ΓöÇΓöÇ Tier + persona Notion-style callout (shared mobile/desktop) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

  // ΓöÇΓöÇ Shared tab body ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // Single tab-switch transition reused by all three render paths below
  // (inline, desktop modal, mobile sheet) instead of each defining its own.
  const tabBody = (
    <AnimatePresence mode="wait">
      <motion.div
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
        <PricingTab
          unitTypes={d?.unit_types ?? []}
          floorPlanImages={floorPlanImages}
          loading={loading}
          detail={detail}
          projectStatus={d?.status}
          paymentPlan={paymentPlan}
          costSheet={costSheet}
          onViewFloorPlans={(plans) => setShowFloorPlan({ plans })}
          onGoToCosts={() => setActiveTab('Pricing')}
        />
      )}

      {activeTab === 'Pricing' && (
        <div className="p-5 md:p-6 space-y-5">
          {/* Payment Schedule */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Payment Schedule</p>
            {!paymentPlan.loaded ? (
              <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ) : !paymentPlan.available ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
                <p className="text-[13px] font-medium text-gray-500">{paymentPlan.message ?? 'Payment schedule not yet verified.'}</p>
                <p className="text-[11px] text-gray-400 mt-1">Contact the builder for a current payment schedule.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {!!paymentPlan.data?.plan_name && (
                  <p className="text-[12px] font-semibold text-gray-700">{String(paymentPlan.data.plan_name)}</p>
                )}
                {Array.isArray(paymentPlan.data?.milestones) && paymentPlan.data.milestones.map((m: any, i: number) => (
                  <div key={i} className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-gray-800">{m.milestone}</p>
                      {m.notes && <p className="text-[11px] text-gray-500 mt-0.5">{m.notes}</p>}
                    </div>
                    <span className="text-[13px] font-black text-blue-700 flex-shrink-0">{m.percentage}%</span>
                  </div>
                ))}
                {!!paymentPlan.data?.notes && (
                  <p className="text-[11px] text-gray-400 mt-2">{String(paymentPlan.data.notes)}</p>
                )}
              </div>
            )}
          </div>

          {/* Cost Breakdown */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Cost Breakdown</p>
            {!costSheet.loaded ? (
              <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
            ) : !costSheet.available ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
                <p className="text-[13px] font-medium text-gray-500">{costSheet.message ?? 'Cost sheet not yet verified.'}</p>
                <p className="text-[11px] text-gray-400 mt-1">Ask the builder for a detailed cost sheet.</p>
              </div>
            ) : costSheet.illustration ? (
              <div className="space-y-2">
                {Object.entries(costSheet.illustration).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => (
                  <div key={k} className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${k === 'total_cost_cr' ? 'bg-gray-900 text-white' : 'bg-gray-50 border border-gray-100'}`}>
                    <span className={`text-[12px] ${k === 'total_cost_cr' ? 'font-bold text-white' : 'text-gray-600'}`}>
                      {k.replace(/_/g, ' ').replace(/\bcr\b/g, '').trim().replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                    <span className={`text-[12px] font-black ${k === 'total_cost_cr' ? 'text-white' : 'text-gray-900'}`}>
                      Γé╣{Number(v).toFixed(2)} Cr
                    </span>
                  </div>
                ))}
                {costSheet.note && (
                  <p className="text-[10px] text-gray-400 leading-relaxed mt-2">{costSheet.note}</p>
                )}
                {Array.isArray(costSheet.data?.assumptions) && costSheet.data.assumptions.length > 0 && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">Assumptions</p>
                    {costSheet.data.assumptions.map((a: string, i: number) => (
                      <p key={i} className="text-[11px] text-amber-800">┬╖ {a}</p>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
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

      {activeTab === 'Documents' && (
        <DocumentsTab documents={documents} loading={loading && !detail} projectSlug={(d as any)?.slug} />
      )}
      </motion.div>
    </AnimatePresence>
  )

  // ΓöÇΓöÇ CTA footer ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const ctaFooter = (
    <div className="flex-shrink-0 border-t border-gray-100 p-4 bg-white space-y-2">
      <button
        onClick={() => setShowVisitScheduler(true)}
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
            onClick={() => track('whatsapp_handoff', { project_slug: (d as any)?.slug, project_name: (d as any)?.name })}
            className="w-full border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-800 py-3 rounded-2xl text-[13px] transition-colors flex items-center justify-center gap-2"
          >
            <WhatsAppIcon size={14} />
            Ask on WhatsApp
          </a>
        ) : null
      })()}
    </div>
  )

  // ΓöÇΓöÇ Unified Sticky Header (Vercel Style) & Tab Strip ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const tabIcons: Record<Tab, React.ReactNode> = {
    Overview: <Building2 size={15} />,
    Analysis: <LineChart size={15} />,
    Residences: <BedDouble size={15} />,
    Pricing: <IndianRupee size={15} />,
    Location: <MapPin size={15} />,
    Documents: <FileText size={15} />
  }

  const tabStrip = (
    <div className="flex gap-8 px-5 overflow-x-auto hide-scrollbar">
      {SECTION_TABS.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative py-3 flex items-center gap-2 text-[14px] font-semibold transition-colors whitespace-nowrap ${
              isActive
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {tabIcons[tab]}
            {tab}
            {isActive && (
              <motion.div
                layoutId="activeTabUnderlineMobile"
                className="absolute bottom-0 left-0 right-0 h-[3px] bg-gray-900 rounded-t-full"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        )
      })}
    </div>
  )

  const stickyHeader = (
    <div className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 transition-all duration-300">
      <div className={`flex items-center px-4 md:px-8 transition-all duration-300 overflow-visible ${isScrolled ? 'h-[60px]' : 'h-[52px]'}`}>
        
        {/* Left: Identity (Injected on scroll) */}
        <div className={`flex items-center gap-6 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${
          isScrolled ? 'max-w-[300px] opacity-100 translate-x-0 mr-6' : 'max-w-0 opacity-0 -translate-x-8 mr-0'
        }`}>
           <div className="flex items-center gap-3 flex-shrink-0">
             <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isRTM ? 'bg-emerald-500' : isNew ? 'bg-blue-500' : 'bg-amber-500'}`} />
             <span className="font-bold text-gray-900 dark:text-gray-100 text-[14px] truncate">{d?.name}</span>
           </div>
           <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
        </div>

        {/* Center: Tabs */}
        <div className="flex gap-4 md:gap-6 overflow-x-auto hide-scrollbar flex-1 justify-start">
          {SECTION_TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative py-4 flex items-center gap-2 text-[13px] font-semibold transition-colors whitespace-nowrap ${
                  isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tabIcons[tab]}
                <span className="hidden sm:inline">{tab}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-900 dark:bg-white rounded-t-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Right: Action (Injected on scroll) */}
        <div className={`flex items-center justify-end gap-4 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${
          isScrolled ? 'max-w-[300px] opacity-100 translate-x-0 ml-4' : 'max-w-0 opacity-0 translate-x-8 ml-0'
        }`}>
           <p className="text-[13px] font-semibold text-gray-500 hidden xl:block whitespace-nowrap">{d?.price_range_label}</p>
           <button onClick={() => setShowVisitScheduler(true)} className="px-4 py-2 bg-gray-900 dark:bg-white hover:bg-black dark:hover:bg-gray-100 hover:scale-105 active:scale-95 text-white dark:text-gray-900 font-semibold rounded-full text-[12px] transition-all whitespace-nowrap flex-shrink-0 shadow-sm">
             Book Visit
           </button>
        </div>
      </div>
    </div>
  )

  // ΓöÇΓöÇ Inline mode (property page) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  if (inline) {
    return (
      <motion.div
        className="project-detail-wrapper"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <div className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-2xl rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col border border-gray-200/50 dark:border-gray-700/50">
          {/* Cinematic hero */}
          <div className="relative h-[380px] md:h-[440px] bg-gray-900 overflow-hidden flex-shrink-0">
            <AnimatePresence mode="wait">
              {currentImg ? (
                <motion.div
                  key={currentImg}
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <Image
                    src={currentImg}
                    alt={d?.name ?? ''}
                    fill
                    priority
                    className="object-cover scale-105 blur-[2px]"
                    sizes="100vw"
                    onError={() => markImgFailed(currentImg)}
                  />
                </motion.div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                  <Building2 size={56} className="text-slate-600" />
                </div>
              )}
            </AnimatePresence>
            {/* Cinematic gradient ΓÇö dark enough at the bottom for white type to sit on, clear at the top for the status/save row */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/10" />

            {/* Top row ΓÇö status badge + save */}
            <div className="absolute top-5 inset-x-5 flex items-center justify-between">
              <div className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20 ${isRTM ? 'bg-emerald-500/80 text-white' : isNew ? 'bg-blue-500/80 text-white' : 'bg-amber-500/80 text-white'}`}>
                {isRTM ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                {isRTM ? 'Ready to Move' : isNew ? 'New Launch' : 'Under Construction'}
              </div>
              {userId && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSave}
                  disabled={saving}
                  className={`w-9 h-9 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors disabled:opacity-50 ${
                    saved ? 'bg-white text-gray-900 border-white' : 'bg-black/30 text-white border-white/25 hover:bg-black/50'
                  }`}
                  aria-label={saved ? 'Remove from saved' : 'Save property'}
                >
                  <Bookmark size={15} className={saved ? 'fill-current' : ''} />
                </motion.button>
              )}
            </div>

            {allImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {allImages.map((_, i) => (
                  <button key={i} onClick={() => setImgIdx(i)}
                    className={`h-1.5 rounded-full transition-all ${i === imgIdx ? 'bg-white w-4' : 'bg-white/40 w-1.5'}`} />
                ))}
              </div>
            )}

            {/* Identity + score, sitting directly on the image */}
            <div className="absolute bottom-0 inset-x-0 p-5 md:p-8">
              <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-white/70 text-[12px] font-medium mb-2">
                    <MapPin size={12} className="flex-shrink-0" />
                    <span className="truncate">{d?.builder?.name} ┬╖ {d?.sector}, {d?.city}</span>
                  </div>
                  <h1 className="text-white text-[28px] md:text-[38px] font-bold tracking-tight leading-[1.08]">{d?.name}</h1>
                  {d?.tagline && <p className="text-white/75 text-[13px] md:text-[14px] mt-1.5 font-light italic">{d.tagline}</p>}
                </div>

                {heroScore != null && (
                  <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-4 py-2.5 flex-shrink-0">
                    <span className="text-white text-[26px] font-bold leading-none tracking-tight">{Math.round(heroScore)}</span>
                    <div>
                      <p className="text-white text-[12px] font-bold leading-tight">{heroTier ? (tierLabel[heroTier] ?? heroTier) : 'ΓÇö'}</p>
                      <p className="text-white/55 text-[9px] font-bold uppercase tracking-widest mt-0.5">Top Recommendation</p>
                    </div>
                  </div>
                )}
              </div>

              {decisionThesis && (
                <p className="text-white/80 text-[12.5px] leading-relaxed max-w-2xl mb-4 line-clamp-2">{decisionThesis}</p>
              )}

              <div className="flex items-end justify-between gap-4 pt-4 border-t border-white/15">
                <div>
                  <p className="text-white text-[22px] md:text-[26px] font-bold tracking-tight leading-none">{d?.price_range_label}</p>
                  <p className="text-white/60 text-[11px] mt-1">{bhkLabel}</p>
                </div>
                {d?.rera_number && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-white/85 flex-shrink-0">
                    <CheckCircle2 size={12} />
                    RERA Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tab strip ΓÇö unified header */}
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
            <FloorPlanViewer floorPlans={showFloorPlan.plans} title={`${project?.name} ΓÇö Floor Plans`} onClose={() => setShowFloorPlan(null)} />
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  // ΓöÇΓöÇ Shared: image badges used in mobile bottom sheet ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

  // ΓöÇΓöÇ Modal ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  return (
    <div className="project-detail-wrapper">
      <AnimatePresence mode="wait">
        {isOpen && (
          <>
            {/* Backdrop & Centering Wrapper for Desktop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/70 hidden md:flex items-center justify-center p-4 md:p-8"
              onClick={onClose}
            >
              {/* ΓöÇΓöÇ Desktop dialog ΓöÇΓöÇ */}
              <motion.div
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
              <div className="flex-1 overflow-y-auto w-full relative pb-24 hide-scrollbar" onScroll={handleScroll}>
                {/* Hero Section */}
                <div className="relative w-full h-[450px] bg-gray-900 flex-shrink-0 overflow-hidden">
                  <div className="absolute inset-0 w-full h-full">
                    {currentImg ? (
                      <Image src={currentImg} alt={d?.name ?? ''} fill priority className="object-cover opacity-60" sizes="1200px" onError={() => markImgFailed(currentImg)} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-black">
                        <Building2 size={56} className="text-slate-700" />
                      </div>
                    )}
                  </div>
                  {/* Gradient Overlay for Text Readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/50 to-transparent" />

                  <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur-md z-10">
                    <X size={20} />
                  </button>
                  {imageCarouselDots}

                  {/* Hero Content */}
                  <div className="absolute inset-0 p-10 flex flex-col justify-end max-w-[1200px] mx-auto w-full">
                    <div className="flex items-end justify-between gap-8">
                      {/* Left side info */}
                      <div className="flex-1 min-w-0 pb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border flex items-center gap-1.5 ${isRTM ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : isNew ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isRTM ? 'bg-emerald-400' : isNew ? 'bg-blue-400' : 'bg-amber-400'}`} />
                            {isRTM ? 'Ready to Move' : isNew ? 'New Launch' : 'Under Construction'}
                          </div>
                        </div>

                        <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight font-serif mb-1">{d?.name}</h2>
                        {d?.tagline && <p className="text-[18px] text-white/80 font-serif italic mb-4">{d.tagline}</p>}

                        <div className="flex items-center gap-2 text-[14px] font-medium text-white/70 mb-6">
                          <MapPin size={14} />
                          <span>{d?.sector}, {d?.city}</span>
                          <span>┬╖</span>
                          <span className="text-white/90">{d?.builder?.name}</span>
                          {d?.rera_number && (
                            <>
                              <span>┬╖</span>
                              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                                <CheckCircle2 size={14} />
                                RERA Verified
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-6">
                           <div>
                             <p className="text-3xl font-bold text-white tracking-tight leading-none">{detail?.price_range_label || project?.price_range_label || (d?.price_min_cr ? `Γé╣${d.price_min_cr} Cr Onwards` : 'Price on Request')}</p>
                             <p className="text-[12px] text-white/60 uppercase tracking-wider mt-1.5">Price Range</p>
                           </div>
                           <div className="w-px h-10 bg-white/20" />
                           <div>
                             <p className="text-[20px] font-bold text-white tracking-tight leading-none">{bhkLabel}</p>
                             <p className="text-[12px] text-white/60 uppercase tracking-wider mt-1.5">Configurations</p>
                           </div>
                        </div>

                        {intelligenceChips && (
                           <div className="mt-6 inline-block">
                             <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3">
                                <FileText size={18} className="text-emerald-400 flex-shrink-0" />
                                <div>
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-[12px] font-bold text-white">Overview</p>
                                  </div>
                                  <p 
                                    className={`text-[12px] text-white/70 cursor-pointer transition-all ${isOverviewExpanded ? '' : 'line-clamp-1'}`}
                                    onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
                                    title="Click to expand/collapse"
                                  >
                                    {decisionThesis || (persona && `Ideal for ${persona.charAt(0) + persona.slice(1).toLowerCase()}.`)}
                                  </p>
                                </div>
                             </div>
                           </div>
                        )}
                      </div>

                      {/* Right side floating stats card */}
                      <div className="w-[340px] bg-white rounded-2xl shadow-xl overflow-hidden flex-shrink-0 mb-4 z-10 border border-gray-100">
                        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
                           <div className="p-4 text-center">
                             <Building2 size={18} className="text-gray-400 mx-auto mb-2" />
                             <p className="text-[18px] font-bold text-gray-900 leading-none mb-1">{d?.total_towers ? `${d.total_towers}` : 'ΓÇö'}</p>
                             <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Towers</p>
                           </div>
                           <div className="p-4 text-center">
                             <MapIcon size={18} className="text-gray-400 mx-auto mb-2" />
                             <p className="text-[18px] font-bold text-gray-900 leading-none mb-1">{(detail?.total_units ?? (d as any)?.total_units) ? `${(detail?.total_units ?? (d as any)?.total_units)}` : 'ΓÇö'}</p>
                             <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Units</p>
                           </div>
                           <div className="p-4 text-center">
                             <FileIcon size={18} className="text-gray-400 mx-auto mb-2" />
                             <p className="text-[18px] font-bold text-gray-900 leading-none mb-1">{d?.land_area_acres ? `${d.land_area_acres} Ac` : 'ΓÇö'}</p>
                             <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Land Area</p>
                           </div>
                        </div>
                        <div className="p-5 flex items-center justify-between">
                           <div>
                             <p className="text-[11px] font-bold text-gray-500 mb-1">Recommendation Score</p>
                             <div className="flex items-baseline gap-1">
                               <span className="text-4xl font-black text-gray-900 tracking-tight leading-none">{heroScore ? Math.round(heroScore) : 'ΓÇö'}</span>
                               {heroScore && <span className="text-[14px] text-gray-500 font-medium">/ 100</span>}
                             </div>
                           </div>
                           <div className="text-right">
                             <div className="flex text-amber-400 mb-1.5 justify-end">
                               {Array.from({ length: 5 }).map((_, i) => (
                                 <svg key={i} className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                               ))}
                             </div>
                             {heroTier && <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">{tierLabel[heroTier] ?? heroTier}</span>}
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

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
                  <button onClick={() => setShowVisitScheduler(true)} className="px-8 py-3 bg-gray-900 hover:bg-black text-white font-semibold rounded-full text-[14px] transition-all flex items-center gap-2 shadow-sm">
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
            </motion.div>
            {/* End Backdrop & Centering Wrapper for Desktop */}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile bottom sheet gets its own AnimatePresence */}
      <AnimatePresence mode="wait">
        {isOpen && (
            <motion.div
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
                  <Image src={currentImg} alt={d?.name ?? ''} fill priority className="object-cover" sizes="100vw" onError={() => markImgFailed(currentImg)} />
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
                    <div className="flex-1 animate-pulse space-y-2">
                      <div className="h-5 bg-gray-100 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
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
                        <span>┬╖</span>
                        <span>{d?.sector}</span>
                        {d?.rera_number && (
                          <>
                            <span>┬╖</span>
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
            </motion.div>
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
            title={`${project?.name} ΓÇö Floor Plans`}
            onClose={() => setShowFloorPlan(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
