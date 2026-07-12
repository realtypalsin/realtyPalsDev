'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
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
}

export default function EditProject() {
  const { id } = useParams<{ id: string }>()
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
    </div>
  )
}
