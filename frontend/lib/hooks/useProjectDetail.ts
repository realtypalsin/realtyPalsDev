import { useEffect, useState, useRef, useCallback } from 'react'
import { API_BASE } from '@/lib/env'
import { getPaymentPlan, getCostSheet } from '@/lib/backend-api'
import { trackPropertyEvent } from '@/lib/analytics'
import type { ProjectDetail, ProjectCard as ProjectCardType } from '@/types/project'

export interface ProjectDocumentPublic {
  id: string
  doc_type: string
  name: string | null
  storage_url: string
  created_at: string
  file_size_bytes: number | null
}

interface PaymentPlanState {
  loaded: boolean
  available: boolean
  data: Record<string, unknown> | null
  message?: string
}

interface CostSheetState {
  loaded: boolean
  available: boolean
  data: Record<string, unknown> | null
  illustration: Record<string, number | null> | null
  note?: string
  message?: string
}

export function useProjectDetailData(
  project: ProjectCardType | null,
  initialDetail: ProjectDetail | null,
  initialTab: string,
  userId: string | null | undefined,
  activeTab?: string
) {
  const tab = activeTab ?? initialTab
  const [detail, setDetail] = useState<ProjectDetail | null>(initialDetail ?? null)
  const [documents, setDocuments] = useState<ProjectDocumentPublic[]>([])
  const [loading, setLoading] = useState(false)
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlanState>({
    loaded: false,
    available: false,
    data: null,
  })
  const [costSheet, setCostSheet] = useState<CostSheetState>({
    loaded: false,
    available: false,
    data: null,
    illustration: null,
  })

  // Fetch project detail and documents
  useEffect(() => {
    if (!project) {
      setDetail(null)
      setDocuments([])
      setLoading(false)
      return
    }

    if (initialDetail?.slug === project.slug) {
      setDetail(initialDetail)
      setLoading(false)
      return
    }

    setLoading(true)
    Promise.all([
      fetch(`${API_BASE}/projects/${project.slug}`).then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch project: ${r.status}`)
        return r.json()
      }),
      fetch(`${API_BASE}/projects/${project.slug}/documents`).then((r) =>
        r.ok ? r.json() : { documents: [] }
      ),
    ])
      .then(([data, docsData]) => {
        setDetail(data.project ?? null)
        setDocuments(docsData.documents ?? [])
      })
      .catch((err) => {
        const errorMsg = err instanceof Error ? err.message : String(err)
        console.error('Failed to load project details:', errorMsg)
        setDetail(null)
        setDocuments([])
      })
      .finally(() => setLoading(false))
  }, [initialDetail, project])

  // Lazy-load payment plan
  useEffect(() => {
    if ((tab !== 'Pricing' && tab !== 'Floor Plans') || !project?.slug || paymentPlan.loaded) return

    let mounted = true
    getPaymentPlan(project.slug)
      .then((res) => {
        if (mounted) setPaymentPlan({ loaded: true, available: res.available, data: res.plan ?? null, message: res.message })
      })
      .catch((err) => {
        console.error('Failed to load payment plan:', err instanceof Error ? err.message : String(err))
        if (mounted) setPaymentPlan({ loaded: true, available: false, data: null, message: 'Unable to load payment plan.' })
      })

    return () => {
      mounted = false
    }
  }, [tab, project?.slug, paymentPlan.loaded])

  // Lazy-load cost sheet
  useEffect(() => {
    if (tab !== 'Pricing' || !project?.slug || costSheet.loaded) return

    let mounted = true
    getCostSheet(project.slug)
      .then((res) => {
        if (mounted)
          setCostSheet({
            loaded: true,
            available: res.available,
            data: res.sheet ?? null,
            illustration: res.illustration ?? null,
            note: res.illustration_note,
            message: res.message,
          })
      })
      .catch((err) => {
        console.error('Failed to load cost sheet:', err instanceof Error ? err.message : String(err))
        if (mounted) setCostSheet({ loaded: true, available: false, data: null, illustration: null, message: 'Unable to load cost sheet.' })
      })

    return () => {
      mounted = false
    }
  }, [tab, project?.slug, costSheet.loaded])

  // Track property events
  useEffect(() => {
    if (!project) return
    trackPropertyEvent(project.id, 'view', undefined, userId).catch(() => {})
  }, [project, userId])

  return { detail, documents, loading, paymentPlan, setPaymentPlan, costSheet, setCostSheet }
}

export function useProjectMediaDetection() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    const resizeHandler = () => checkMobile()
    window.addEventListener('resize', resizeHandler)
    return () => window.removeEventListener('resize', resizeHandler)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isMobile
}
