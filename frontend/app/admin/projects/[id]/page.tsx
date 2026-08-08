'use client'

import { use, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, ChevronRight, Eye, LayoutPanelLeft, AlertCircle,
  Images, Cpu, Activity, IndianRupee, Users
} from 'lucide-react'
import { adminFetch } from '@/lib/adminFetch'
import ProjectForm from '@/components/admin/ProjectForm'
import UnitsEditor from '@/components/admin/UnitsEditor'
import AmenitiesEditor from '@/components/admin/AmenitiesEditor'
import ConnectivityEditor from '@/components/admin/ConnectivityEditor'
import ImagesEditor from '@/components/admin/ImagesEditor'
import DocumentsEditor from '@/components/admin/DocumentsEditor'
import PaymentPlanEditor from '@/components/admin/PaymentPlanEditor'
import CostSheetEditor from '@/components/admin/CostSheetEditor'
import InvestmentInsightsEditor from '@/components/admin/InvestmentInsightsEditor'
import LocationIntelligenceEditor from '@/components/admin/LocationIntelligenceEditor'
import IntelligenceWorkspace from '@/components/admin/IntelligenceWorkspace'
import ConstructionMilestonesEditor from '@/components/admin/ConstructionMilestonesEditor'
import ProjectUpdatesEditor from '@/components/admin/ProjectUpdatesEditor'
import ChannelPartnersEditor from '@/components/admin/ChannelPartnersEditor'
import CompletenessBar from '@/components/admin/CompletenessBar'
import ProjectPreview from '@/components/admin/ProjectPreview'
import { Skeleton } from '@/components/ui/skeleton'
import Toast from '@/components/Toast'

type AdminTab = 'core' | 'pricing' | 'media' | 'intelligence' | 'updates' | 'partners'

interface ProjectData {
  [key: string]: any
}

interface ProjectDocument {
  id: string
  name: string
  url: string
  file_size?: number
  created_at?: string
}

interface CompletenessData {
  score: number
  missing: string[]
}


export default function AdminProjectEditPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>
}) {
  const resolvedParams = typeof (params as any)?.then === 'function' ? use(params as unknown as Promise<{ id: string }>) : (params as { id: string })
  const id = resolvedParams?.id ?? ''
  const [data, setData] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [completeness, setCompleteness] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [adminTab, setAdminTab] = useState<AdminTab>('core')
  const [preview, setPreview] = useState<any>(null)
  const [showCompleteness, setShowCompleteness] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string } | null>(null)

  const loadProjectData = useCallback(async (showError = true) => {
    try {
      setError(null)
      const [projectRes, docsRes, completenessRes] = await Promise.all([
        adminFetch(`/admin/projects/${id}`),
        adminFetch(`/admin/projects/${id}/documents`),
        adminFetch(`/admin/projects/${id}/completeness`),
      ])

      if (!projectRes.ok) {
        if (showError) {
          setError('Failed to load project')
          setToast({ message: 'Failed to load project data' })
        }
        setData(null)
        return
      }

      const projectJson = await projectRes.json()
      const docsJson = docsRes.ok ? await docsRes.json() : { documents: [] }
      const completenessJson = completenessRes.ok ? await completenessRes.json() : null

      setData(projectJson.project)
      setPreview(projectJson.project)
      setDocuments(docsJson.documents ?? [])
      setCompleteness(completenessJson)
    } catch (err) {
      console.error('[AdminProjectEditPage] Failed to load data:', err)
      if (showError) {
        setError('Failed to load project data')
        setToast({ message: 'Error loading project. Please try again.' })
      }
      setData(null)
    }
  }, [id])

  useEffect(() => {
    (async () => {
      await loadProjectData(true)
      setLoading(false)
    })()
  }, [id, loadProjectData])

  useEffect(() => {
    if (data?.name) {
      document.title = `Admin · Projects · ${data.name} | RealtyPals`
    }
  }, [data?.name])

  // Keyboard shortcuts for tab switching (Alt+1..6)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isEditable = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (isEditable) return
      if (e.altKey && !e.shiftKey && !e.metaKey) {
        if (e.key === '1') { e.preventDefault(); setAdminTab('core') }
        if (e.key === '2') { e.preventDefault(); setAdminTab('pricing') }
        if (e.key === '3') { e.preventDefault(); setAdminTab('media') }
        if (e.key === '4') { e.preventDefault(); setAdminTab('intelligence') }
        if (e.key === '5') { e.preventDefault(); setAdminTab('updates') }
        if (e.key === '6') { e.preventDefault(); setAdminTab('partners') }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleFormChange = useCallback((formValues: Record<string, any>) => {
    setPreview((prev: any) => {
      if (!prev) return null
      return {
        ...prev,
        ...formValues,
        builder: prev.builder,
        unit_types: prev.unit_types,
      }
    })
  }, [])

  const handleSaved = useCallback(async () => {
    setRefreshing(true)
    try {
      await loadProjectData(false)
      setToast({ message: 'Project updated successfully' })
    } catch {
      setToast({ message: 'Failed to refresh project data' })
    } finally {
      setRefreshing(false)
    }
  }, [loadProjectData])

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto pb-16 space-y-8 mt-8">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-1/4 rounded-lg" />
          <Skeleton className="h-6 w-1/3 rounded-lg" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-32 rounded-lg" />
          ))}
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 p-8 min-h-[500px]">
          <Skeleton className="h-full w-full rounded-2xl min-h-[400px]" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-[1400px] mx-auto p-8">
        <Link href="/admin/projects" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6">
          <ArrowLeft size={18} />
          Back to projects
        </Link>
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-6 flex gap-3">
          <AlertCircle className="text-red-600 dark:text-red-400 shrink-0 mt-1" size={20} />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 dark:text-red-300 mb-1">Error loading project</h3>
            <p className="text-red-800 dark:text-red-200 text-sm">{error || 'Project not found'}</p>
            <button
              onClick={() => loadProjectData(true)}
              className="mt-3 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded font-medium"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const formData = {
    ...data,
    lat:              data.lat?.toString() ?? '',
    lng:              data.lng?.toString() ?? '',
    total_units:      data.total_units?.toString() ?? '',
    total_towers:     data.total_towers?.toString() ?? '',
    land_area_acres:  data.land_area_acres?.toString() ?? '',
    launch_date:      data.launch_date ? new Date(data.launch_date).toISOString().split('T')[0] : '',
    possession_date:  data.possession_date ? new Date(data.possession_date).toISOString().split('T')[0] : '',
    marketing_claims:   data.marketing_claims ?? [],
    ai_search_keywords: data.ai_search_keywords ?? [],
  }

  const TAB_ITEMS: { id: AdminTab; label: string; icon: React.ElementType }[] = [
    { id: 'core',         label: 'Core Info',            icon: LayoutPanelLeft },
    { id: 'pricing',      label: 'Pricing & Location',   icon: IndianRupee },
    { id: 'media',        label: 'Media',                icon: Images },
    { id: 'intelligence', label: 'Intelligence',         icon: Cpu },
    { id: 'updates',      label: 'Updates & Timeline',   icon: Activity },
    { id: 'partners',     label: 'Channel Partners',     icon: Users },
  ]

  const tabScores: Record<AdminTab, number> = completeness?.tabScores ?? {
    core: 0,
    pricing: 0,
    media: 0,
    intelligence: 0,
    updates: 100,
    partners: 100,
  }

  return (
    <>
      {/* ── Sticky Project Sub-Header ───────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 w-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 shadow-xs px-4 md:px-8 py-3 transition-all">
        <div className="max-w-[1400px] mx-auto space-y-3">

          {/* Identity row */}
          <div className="flex items-center justify-between gap-4">

            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/admin/projects"
                className="w-8 h-8 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700/80 transition-all flex-shrink-0 shadow-2xs flex items-center justify-center group"
                title="Back to Projects"
              >
                <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
              </Link>

              <div className="flex items-center gap-2.5 min-w-0">
                <h1 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight truncate leading-none">
                  {data.name}
                </h1>
                <span className={`px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider rounded-md border shadow-2xs flex-shrink-0 flex items-center gap-1.5 ${
                  data.status === 'ready_to_move'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60'
                    : data.status === 'under_construction'
                    ? 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60'
                    : 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    data.status === 'ready_to_move' ? 'bg-emerald-500' : data.status === 'under_construction' ? 'bg-amber-500 animate-pulse' : 'bg-blue-500'
                  }`} />
                  {data.status?.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {adminTab === 'core' && (
                <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl px-3 py-1 shadow-2xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Live Preview Sync</span>
                </div>
              )}
              <a
                href={`/projects/${data.slug}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-xs font-semibold text-white dark:text-zinc-900 transition-all shadow-xs active:scale-[0.98]"
              >
                <Eye size={13} />
                <span>View Public</span>
              </a>
            </div>

          </div>

          {/* Tab rail with polished completion indicators */}
          <div className="flex items-center p-1 bg-zinc-100/90 dark:bg-zinc-800/70 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/60 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden shadow-inner">
            <div className="flex items-center gap-1 min-w-full sm:min-w-0 justify-between sm:justify-start w-full">
              {TAB_ITEMS.map(({ id: tabId, label, icon: Icon }) => {
                const isActive = adminTab === tabId
                const pct = tabScores[tabId] ?? 100
                const isComplete = pct >= 90
                const isMedium = pct >= 60 && pct < 90

                return (
                  <button
                    key={tabId}
                    onClick={() => setAdminTab(tabId)}
                    className={`relative flex items-center gap-2 px-3 py-1.5 text-xs rounded-xl transition-all duration-200 whitespace-nowrap font-medium cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 font-bold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/60 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <Icon
                      size={14}
                      className={
                        isActive
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-zinc-400 dark:text-zinc-500'
                      }
                    />
                    <span>{label}</span>

                    <span
                      className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border transition-colors ${
                        isComplete
                          ? (isActive
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300/80 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700/80'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40')
                          : isMedium
                          ? (isActive
                              ? 'bg-amber-100 text-amber-800 border-amber-300/80 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700/80'
                              : 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40')
                          : (isActive
                              ? 'bg-rose-100 text-rose-800 border-rose-300/80 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700/80'
                              : 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40')
                      }`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: isComplete ? '#10b981' : isMedium ? '#f59e0b' : '#f43f5e'
                        }}
                      />
                      <span>{pct}%</span>
                    </span>

                    {isActive && (
                      <div className="absolute bottom-0.5 left-2.5 right-2.5 h-[2px] bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isComplete ? 'bg-emerald-500' : isMedium ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ── Scrollable Content ──────────────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-6 pb-16">

        {/* Completeness banner — shown on core + media tabs */}
        {adminTab !== 'intelligence' && completeness && showCompleteness && (
          <CompletenessBar result={completeness} onClose={() => setShowCompleteness(false)} />
        )}

        {/* 1. Core Info tab */}
        {adminTab === 'core' && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8 items-start">
            <div className="space-y-6 max-w-2xl">
              <div className="bg-white dark:bg-[#121214] rounded-3xl border border-gray-100 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-6 md:p-8">
                <ProjectForm
                  initialData={formData}
                  projectId={id}
                  onFormChange={handleFormChange}
                  onSaved={handleSaved}
                />
              </div>
              <UnitsEditor
                unitTypes={data.unit_types ?? []}
                projectId={id}
                onSaved={handleSaved}
              />
              <AmenitiesEditor
                amenities={data.amenities ?? []}
                projectId={id}
                onSaved={handleSaved}
              />
            </div>
            <div>
              {preview && (
                <ProjectPreview
                  project={preview}
                  onRefresh={handleSaved}
                  refreshing={refreshing}
                />
              )}
            </div>
          </div>
        )}

        {/* 2. Pricing & Location tab */}
        {adminTab === 'pricing' && (
          <div className="max-w-4xl space-y-6">
            <PaymentPlanEditor projectId={id} initialData={data.payment_plan} />
            <CostSheetEditor projectId={id} initialData={data.cost_sheet} />
            <InvestmentInsightsEditor projectId={id} initialData={data.decision_profile} />
            <ConnectivityEditor
              connectivity={data.connectivity ?? []}
              projectId={id}
              onSaved={handleSaved}
            />
            <LocationIntelligenceEditor projectId={id} initialData={data} />
          </div>
        )}

        {/* 3. Media tab */}
        {adminTab === 'media' && (
          <div className="max-w-4xl space-y-6">
            <ImagesEditor
              images={data.images ?? []}
              projectId={id}
              slug={data.slug ?? id}
              onSaved={handleSaved}
            />
            <DocumentsEditor
              documents={documents}
              projectId={id}
              slug={data.slug ?? id}
              onSaved={handleSaved}
            />
          </div>
        )}

        {/* 4. Intelligence tab */}
        {adminTab === 'intelligence' && (
          <IntelligenceWorkspace
            projectId={id}
            initialDna={data.dna ?? data.project_dna}
            initialDecision={data.decision_profile}
            initialPersona={data.persona_profile}
            initialRecommendation={data.recommendation_profile}
            initialCompetitors={data.competitors ?? []}
            onSaved={handleSaved}
          />
        )}

        {/* 5. Updates & Timeline tab */}
        {adminTab === 'updates' && (
          <div className="max-w-4xl space-y-6">
            <ConstructionMilestonesEditor projectId={id} />
            <ProjectUpdatesEditor
              projectId={id}
              projectStatus={data.status}
            />
          </div>
        )}

        {/* 6. Channel Partners tab */}
        {adminTab === 'partners' && (
          <div className="max-w-4xl space-y-6">
            <ChannelPartnersEditor
              projectId={id}
              initialPartners={data.channel_partners ?? []}
              onSaved={handleSaved}
            />
          </div>
        )}

      </div>

      {toast && <Toast message={toast.message} onClose={() => setToast(null)} />}
    </>
  )
}
