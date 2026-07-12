'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
<<<<<<< HEAD
import ProjectForm, { type ProjectData } from '@/components/admin/ProjectForm'
import ProjectPreview from '@/components/admin/ProjectPreview'
import { Loader2, LayoutPanelLeft } from 'lucide-react'

// Raw shape returned by GET /api/v1/admin/projects/[id] (Prisma model + relations)
interface AdminProjectRaw {
  id: string
  name: string
  slug: string
  builder_id: string
  sector: string
  city: string
  status: ProjectData['status']
  tagline: string | null
  address: string | null
  lat: number | null
  lng: number | null
  rera_number: string | null
  rera_url: string | null
  total_units: number | null
  total_towers: number | null
  land_area_acres: number | null
  possession_label: string | null
  possession_date: string | null
  description: string | null
  long_description: string | null
  design_theme: string | null
  architect: string | null
  hero_image_url: string | null
  marketing_claims: string[]
  ai_search_keywords: string[]
  builder: { name: string; slug: string }
  unit_types: Array<{ bhk: number; price_min_cr: number | null; price_max_cr: number | null; super_area_sqft: number | null }>
  images: Array<{ id: string; url: string; type: string; caption: string | null; sort_order: number }>
  amenities: Array<{ name: string; category: string }>
}

function toFormData(data: AdminProjectRaw): ProjectData {
  return {
    id:               data.id,
    name:             data.name,
    slug:             data.slug,
    builder_id:       data.builder_id,
    sector:           data.sector,
    city:             data.city,
    status:           data.status,
    tagline:          data.tagline ?? '',
    address:          data.address ?? '',
    description:      data.description ?? '',
    rera_number:      data.rera_number ?? '',
    rera_url:         data.rera_url ?? '',
    architect:        data.architect ?? '',
    design_theme:     data.design_theme ?? '',
    hero_image_url:   data.hero_image_url ?? '',
    long_description: data.long_description ?? '',
    possession_label: data.possession_label ?? '',
    lat:              data.lat?.toString() ?? '',
    lng:              data.lng?.toString() ?? '',
    total_units:      data.total_units?.toString() ?? '',
    total_towers:     data.total_towers?.toString() ?? '',
    land_area_acres:  data.land_area_acres?.toString() ?? '',
    possession_date:  data.possession_date ? new Date(data.possession_date).toISOString().split('T')[0] : '',
    marketing_claims:   data.marketing_claims ?? [],
    ai_search_keywords: data.ai_search_keywords ?? [],
  }
=======
import ProjectForm from '@/components/admin/ProjectForm'
import ProjectPreview from '@/components/admin/ProjectPreview'
import IntelligenceWorkspace from '@/components/admin/IntelligenceWorkspace'
import UnitsEditor from '@/components/admin/UnitsEditor'
import AmenitiesEditor from '@/components/admin/AmenitiesEditor'
import ConnectivityEditor from '@/components/admin/ConnectivityEditor'
import ImagesEditor from '@/components/admin/ImagesEditor'
import DocumentsEditor from '@/components/admin/DocumentsEditor'
import PaymentPlanEditor from '@/components/admin/PaymentPlanEditor'
import CostSheetEditor from '@/components/admin/CostSheetEditor'
import InvestmentInsightsEditor from '@/components/admin/InvestmentInsightsEditor'
import LocationIntelligenceEditor from '@/components/admin/LocationIntelligenceEditor'
import { Loader2, LayoutPanelLeft, Cpu, Images, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, IndianRupee } from 'lucide-react'
import { API_BASE } from '@/lib/env'
import { adminAuthHeaders } from '@/lib/authedFetch'
import { motion, AnimatePresence } from 'framer-motion'

interface CompletenessResult {
  foundationalScore: number
  enrichmentScore:   number
  totalScore:        number
  canPublish:        boolean
  foundationalPassed: number
  foundationalTotal:  number
  enrichmentPassed:   number
  enrichmentTotal:    number
  missing: {
    overview:     string[]
    units:        string[]
    builder:      string[]
    images:       string[]
    brochures:    string[]
    intelligence: string[]
    competitors:  string[]
  }
}

type AdminTab = 'core' | 'pricing' | 'media' | 'intelligence'

function CompletenessBar({ result, onClose }: { result: CompletenessResult; onClose: () => void }) {
  const [expanded, setExpanded] = useState(false)

  const allMissing = [
    ...result.missing.overview,
    ...result.missing.units,
    ...result.missing.builder,
    ...result.missing.images,
    ...result.missing.brochures,
    ...result.missing.intelligence,
    ...result.missing.competitors,
  ]

  const isPerfect = result.canPublish && result.totalScore === 100
  const isGood = result.canPublish
  const isWarning = !result.canPublish && result.totalScore >= 50
  
  const theme = isPerfect 
    ? { bg: 'bg-emerald-500', text: 'text-emerald-900', light: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2, stroke: 'text-emerald-600' }
    : isGood 
      ? { bg: 'bg-teal-500', text: 'text-teal-900', light: 'bg-teal-50', border: 'border-teal-200', icon: CheckCircle2, stroke: 'text-teal-600' }
      : isWarning
        ? { bg: 'bg-amber-500', text: 'text-amber-900', light: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle, stroke: 'text-amber-600' }
        : { bg: 'bg-rose-500', text: 'text-rose-900', light: 'bg-rose-50', border: 'border-rose-200', icon: XCircle, stroke: 'text-rose-500' }

  const Icon = theme.icon

  const headline = result.canPublish
    ? `Ready to publish — ${result.totalScore}% complete`
    : `Not ready to publish — ${result.foundationalTotal - result.foundationalPassed} required field${result.foundationalTotal - result.foundationalPassed !== 1 ? 's' : ''} missing`

  return (
    <div className={`rounded-2xl border ${theme.border} ${theme.light} mb-8 overflow-hidden transition-all duration-300 shadow-sm relative`}>
      {/* Background progress bar for a subtle, premium look */}
      <div 
        className={`absolute top-0 left-0 bottom-0 ${theme.bg} opacity-[0.08] transition-all duration-1000 ease-out`}
        style={{ width: `${result.totalScore}%` }}
      />
      
      <div className="px-5 py-4 relative z-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm border border-white/60 ${theme.stroke} shrink-0`}>
              <Icon size={20} strokeWidth={2.5} />
            </div>

            <div className="min-w-0">
              <p className={`text-[15px] font-bold ${theme.text} tracking-tight truncate`}>{headline}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <p className={`text-[12px] font-medium opacity-80 ${theme.text} flex items-center gap-1.5`}>
                  Foundational <span className="font-bold opacity-100">{result.foundationalPassed}/{result.foundationalTotal}</span>
                </p>
                <span className={`w-1 h-1 rounded-full ${theme.bg} opacity-30 shrink-0`} />
                <p className={`text-[12px] font-medium opacity-80 ${theme.text} flex items-center gap-1.5`}>
                  Enrichment <span className="font-bold opacity-100">{result.enrichmentPassed}/{result.enrichmentTotal}</span>
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 shrink-0">
            {allMissing.length > 0 && (
              <button
                onClick={() => setExpanded(v => !v)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/60 hover:bg-white text-[12px] font-bold ${theme.text} transition-colors shadow-sm border border-white`}
              >
                {expanded ? 'Hide Details' : 'View Details'}
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
            <button onClick={onClose} className={`w-8 h-8 flex items-center justify-center rounded-full bg-white/60 hover:bg-white border border-white transition-colors shadow-sm ${theme.text}`}>
              <XCircle size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Expandable missing items */}
      <AnimatePresence>
        {expanded && allMissing.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden relative z-10"
          >
            <div className={`px-5 pb-5 pt-3 border-t border-white/40 bg-white/30`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                {[
                  { label: 'Overview',     items: result.missing.overview },
                  { label: 'Units',        items: result.missing.units },
                  { label: 'Builder',      items: result.missing.builder },
                  { label: 'Images',       items: result.missing.images },
                  { label: 'Brochures',    items: result.missing.brochures },
                  { label: 'Intelligence', items: result.missing.intelligence },
                  { label: 'Competitors',  items: result.missing.competitors },
                ].flatMap(({ items }) => items).map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className={`mt-1.5 w-1.5 h-1.5 rounded-full ${theme.bg} shrink-0`} />
                    <span className={`text-[12.5px] font-medium ${theme.text} leading-snug opacity-90`}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
}

export default function EditProject() {
  const { id } = useParams<{ id: string }>()
<<<<<<< HEAD
  const [data, setData]         = useState<AdminProjectRaw | null>(null)
  const [loading, setLoading]   = useState(true)
  const [preview, setPreview]   = useState<AdminProjectRaw | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadProject = useCallback(async () => {
    const res  = await fetch(`/api/v1/admin/projects/${id}`)
    const json = await res.json()
    setData(json.project)
    setPreview(json.project)
    setLoading(false)
  }, [id])

  useEffect(() => { loadProject() }, [loadProject])

  // Called by ProjectForm when form values change — updates preview in real time
  const toNum = (v: string | undefined, fallback: number | null): number | null =>
    v !== undefined ? (v === '' ? null : Number(v)) : fallback

  const handleFormChange = useCallback((formValues: Partial<ProjectData>) => {
    setPreview((prev) => prev ? {
      ...prev,
      ...formValues,
      lat: toNum(formValues.lat, prev.lat),
      lng: toNum(formValues.lng, prev.lng),
      total_units: toNum(formValues.total_units, prev.total_units),
      total_towers: toNum(formValues.total_towers, prev.total_towers),
      land_area_acres: toNum(formValues.land_area_acres, prev.land_area_acres),
    } : prev)
  }, [])

  // Called after successful save — re-fetch to sync preview with DB
  const handleSaved = useCallback(async () => {
    setRefreshing(true)
    const res  = await fetch(`/api/v1/admin/projects/${id}`)
    const json = await res.json()
    setData(json.project)
    setPreview(json.project)
=======
  const [data, setData]               = useState<any>(null)
  const [documents, setDocuments]     = useState<any[]>([])
  const [completeness, setCompleteness] = useState<CompletenessResult | null>(null)
  const [showCompleteness, setShowCompleteness] = useState(true)
  const [loading, setLoading]         = useState(true)
  const [preview, setPreview]         = useState<any>(null)
  const [refreshing, setRefreshing]   = useState(false)
  const [adminTab, setAdminTab]       = useState<AdminTab>('core')

  async function loadProject() {
    const [projectRes, docsRes, completenessRes] = await Promise.all([
      fetch(`${API_BASE}/admin/projects/${id}`, { headers: adminAuthHeaders() }),
      fetch(`${API_BASE}/admin/projects/${id}/documents`, { headers: adminAuthHeaders() }),
      fetch(`${API_BASE}/admin/projects/${id}/completeness`, { headers: adminAuthHeaders() }),
    ])
    const projectJson     = await projectRes.json()
    const docsJson        = docsRes.ok ? await docsRes.json() : { documents: [] }
    const completenessJson = completenessRes.ok ? await completenessRes.json() : null
    setData(projectJson.project)
    setPreview(projectJson.project)
    setDocuments(docsJson.documents ?? [])
    setCompleteness(completenessJson)
    setShowCompleteness(true)
    setLoading(false)
  }

  useEffect(() => { loadProject() }, [id])

  const handleFormChange = useCallback((formValues: any) => {
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
      fetch(`${API_BASE}/admin/projects/${id}`, { headers: adminAuthHeaders() }),
      fetch(`${API_BASE}/admin/projects/${id}/documents`, { headers: adminAuthHeaders() }),
      fetch(`${API_BASE}/admin/projects/${id}/completeness`, { headers: adminAuthHeaders() }),
    ])
    const projectJson     = await projectRes.json()
    const docsJson        = docsRes.ok ? await docsRes.json() : { documents: [] }
    const completenessJson = completenessRes.ok ? await completenessRes.json() : null
    setData(projectJson.project)
    setPreview(projectJson.project)
    setDocuments(docsJson.documents ?? [])
    setCompleteness(completenessJson)
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
    setRefreshing(false)
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-blue-500" />
      </div>
    )
  }

  if (!data) return <p className="text-gray-500">Project not found.</p>

<<<<<<< HEAD
  const formData = toFormData(data)

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Edit Project</h1>
          <p className="text-sm text-gray-400 mt-0.5">{data.name}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <LayoutPanelLeft size={13} />
          Live preview active
        </div>
      </div>

      {/* Two-column layout: form left, preview right */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <ProjectForm
            initialData={formData}
            projectId={id}
            onFormChange={handleFormChange}
            onSaved={handleSaved}
          />
        </div>

        {/* Preview panel */}
        <div>
          {preview && (
            <ProjectPreview
              project={preview as any}
              onRefresh={handleSaved}
              refreshing={refreshing}
            />
          )}
        </div>

      </div>
=======
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
    { id: 'core',         label: 'Core Info',          icon: LayoutPanelLeft },
    { id: 'pricing',      label: 'Pricing & Location', icon: IndianRupee },
    { id: 'media',        label: 'Media',              icon: Images },
    { id: 'intelligence', label: 'Intelligence',       icon: Cpu },
  ]

  return (
    <div className="max-w-[1400px] mx-auto pb-16">
      {/* Page header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black tracking-tight text-slate-900">Edit Project</h1>
          <p className="text-[15px] font-medium text-slate-500 mt-1 font-serif italic">{data.name}</p>
        </div>
        {adminTab === 'core' && (
          <div className="flex items-center gap-2.5 text-[12px] font-bold text-slate-500 bg-white border border-gray-200 shadow-sm rounded-full px-4 py-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            Live preview active
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex p-1.5 bg-white rounded-full w-fit mb-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100">
        {TAB_ITEMS.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            onClick={() => setAdminTab(tabId)}
            className={`flex items-center gap-2 px-6 py-2.5 text-[13px] font-bold rounded-full transition-all duration-300 ${
              adminTab === tabId
                ? 'bg-slate-900 text-white shadow-md scale-100'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 scale-95 hover:scale-100'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Completeness banner — shown on core + media tabs */}
      {adminTab !== 'intelligence' && completeness && showCompleteness && (
        <CompletenessBar result={completeness} onClose={() => setShowCompleteness(false)} />
      )}

      {/* Core Info tab */}
      {adminTab === 'core' && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8 items-start">
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-6 md:p-8">
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
            <ConnectivityEditor
              connectivity={data.connectivity ?? []}
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

      {/* Pricing & Location tab */}
      {adminTab === 'pricing' && (
        <div className="max-w-3xl space-y-6">
          <PaymentPlanEditor projectId={id} initialData={data.payment_plan} />
          <CostSheetEditor projectId={id} initialData={data.cost_sheet} />
          <InvestmentInsightsEditor projectId={id} initialData={data.decision_profile?.intelligence_data?.investment_insights} />
          <LocationIntelligenceEditor projectId={id} initialData={data} />
        </div>
      )}

      {/* Media tab */}
      {adminTab === 'media' && (
        <div className="max-w-3xl space-y-6">
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

      {/* Intelligence tab */}
      {adminTab === 'intelligence' && (
        <IntelligenceWorkspace
          projectId={id}
          initialDna={data.dna}
          initialDecision={data.decision_profile}
          initialPersona={data.persona_profile}
          initialRecommendation={data.recommendation_profile}
          initialCompetitors={data.competitors ?? []}
        />
      )}
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
    </div>
  )
}
