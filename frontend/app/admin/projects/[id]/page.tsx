'use client'

import { use, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, ChevronRight, Eye, LayoutPanelLeft,
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

type AdminTab = 'core' | 'pricing' | 'media' | 'intelligence' | 'updates' | 'partners'

export default function AdminProjectEditPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>
}) {
  const id = (params as any)?.id ?? (typeof (params as any)?.then === 'function' ? (use(params as unknown as Promise<{ id: string }>) as any)?.id : '')
  const [data, setData] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [completeness, setCompleteness] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [adminTab, setAdminTab] = useState<AdminTab>('core')
  const [preview, setPreview] = useState<any>(null)
  const [showCompleteness, setShowCompleteness] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const [projectRes, docsRes, completenessRes] = await Promise.all([
          adminFetch(`/admin/projects/${id}`),
          adminFetch(`/admin/projects/${id}/documents`),
          adminFetch(`/admin/projects/${id}/completeness`),
        ])
        if (!projectRes.ok) {
          setData(null)
          return
        }
        const projectJson     = await projectRes.json()
        const docsJson        = docsRes.ok ? await docsRes.json() : { documents: [] }
        const completenessJson = completenessRes.ok ? await completenessRes.json() : null
        setData(projectJson.project)
        setPreview(projectJson.project)
        setDocuments(docsJson.documents ?? [])
        setCompleteness(completenessJson)
      } catch (err) {
        console.error('[AdminProjectEditPage] Failed to load data:', err)
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  const handleFormChange = useCallback((formValues: Record<string, any>) => {
    setPreview((prev: any) => ({
      ...prev,
      ...formValues,
      builder:    prev?.builder,
      unit_types: prev?.unit_types,
    }))
  }, [])

  const handleSaved = useCallback(async () => {
    setRefreshing(true)
    const [projectRes, docsRes, completenessRes] = await Promise.all([
      adminFetch(`/admin/projects/${id}`),
      adminFetch(`/admin/projects/${id}/documents`),
      adminFetch(`/admin/projects/${id}/completeness`),
    ])
    const projectJson     = await projectRes.json()
    const docsJson        = docsRes.ok ? await docsRes.json() : { documents: [] }
    const completenessJson = completenessRes.ok ? await completenessRes.json() : null
    setData(projectJson.project)
    setPreview(projectJson.project)
    setDocuments(docsJson.documents ?? [])
    setCompleteness(completenessJson)
    setRefreshing(false)
  }, [id])

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

  if (!data) return <p className="text-gray-500 p-8">Project not found.</p>

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

  return (
    <div className="max-w-[1400px] mx-auto pb-16">
      
      {/* Apple-Style Frosted Glass Header Bar — Pinned with generous whitespace & subtle translucent blur */}
      <div className="sticky top-0 z-30 -mt-4 md:-mt-6 -mx-4 md:-mx-6 px-4 md:px-8 py-3.5 mb-6 bg-white/75 dark:bg-[#09090b]/75 backdrop-blur-2xl border-b border-gray-200/50 dark:border-white/5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3 transition-all">
        
        {/* Top Tier: Identity & Quick Actions */}
        <div className="flex items-center justify-between gap-4">
          
          {/* Left: Back Button + Project Name & Status Badge */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/admin/projects"
              className="w-8 h-8 rounded-full bg-gray-100/80 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/80 transition-all flex-shrink-0 flex items-center justify-center"
              title="Back to Projects"
            >
              <ArrowLeft size={15} />
            </Link>

            <div className="flex items-center gap-2.5 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight truncate leading-none">
                {data.name}
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300 border border-gray-200/60 dark:border-white/10 flex-shrink-0">
                {data.status?.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Right: Actions & Live Status */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {adminTab === 'core' && (
              <div className="hidden sm:flex items-center gap-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/40 rounded-full px-3 py-1 shadow-xs">
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
              className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gray-100/80 dark:bg-white/10 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-200/80 dark:hover:bg-white/15 transition-all shadow-xs"
            >
              <Eye size={14} />
              <span>View Public</span>
            </a>
          </div>

        </div>

        {/* Bottom Tier: Apple Segmented Control Tab Bar */}
        <div className="flex items-center p-1 bg-gray-100/70 dark:bg-zinc-900/60 rounded-xl overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden backdrop-blur-md">
          <div className="flex items-center gap-1 min-w-full sm:min-w-0">
            {TAB_ITEMS.map(({ id: tabId, label, icon: Icon }) => {
              const isActive = adminTab === tabId
              return (
                <button
                  key={tabId}
                  onClick={() => setAdminTab(tabId)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 text-xs rounded-lg transition-all duration-150 whitespace-nowrap ${
                    isActive
                      ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.06)] font-semibold'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium hover:bg-white/40 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400'} />
                  <span>{label}</span>
                </button>
              )
            })}
          </div>
        </div>

      </div>

      {/* Completeness banner — shown on core + media tabs */}
      {adminTab !== 'intelligence' && completeness && showCompleteness && (
        <CompletenessBar result={completeness} onClose={() => setShowCompleteness(false)} />
      )}

      {/* 1. Core Info tab */}
      {adminTab === 'core' && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8 items-start">
          <div className="space-y-6">
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
  )
}
