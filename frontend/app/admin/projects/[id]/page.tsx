'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import ProjectForm from '@/components/admin/ProjectForm'
import ProjectPreview from '@/components/admin/ProjectPreview'
import { Loader2, LayoutPanelLeft } from 'lucide-react'

export default function EditProject() {
  const { id } = useParams<{ id: string }>()
  const [data, setData]         = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [preview, setPreview]   = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)

  async function loadProject() {
    const res  = await fetch(`/api/v1/admin/projects/${id}`)
    const json = await res.json()
    setData(json.project)
    setPreview(json.project)
    setLoading(false)
  }

  useEffect(() => { loadProject() }, [id])

  // Called by ProjectForm when form values change — updates preview in real time
  const handleFormChange = useCallback((formValues: any) => {
    setPreview((prev: any) => ({
      ...prev,
      ...formValues,
      // keep builder/unit_types from saved data (not editable inline)
      builder:    prev?.builder,
      unit_types: prev?.unit_types,
    }))
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

  const formData = {
    ...data,
    lat:              data.lat?.toString() ?? '',
    lng:              data.lng?.toString() ?? '',
    total_units:      data.total_units?.toString() ?? '',
    total_towers:     data.total_towers?.toString() ?? '',
    land_area_acres:  data.land_area_acres?.toString() ?? '',
    possession_date:  data.possession_date ? new Date(data.possession_date).toISOString().split('T')[0] : '',
    marketing_claims:   data.marketing_claims ?? [],
    ai_search_keywords: data.ai_search_keywords ?? [],
  }

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
              project={preview}
              onRefresh={handleSaved}
              refreshing={refreshing}
            />
          )}
        </div>

      </div>
    </div>
  )
}
