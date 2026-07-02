import type { BuilderDetail } from '@/types/project'

export type Verdict = 'STRONG' | 'ESTABLISHED' | 'EMERGING' | 'UNKNOWN' | 'INSUFFICIENT_DATA'
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'

export interface BuilderIntelligenceData {
  verdict: Verdict
  confidence: Confidence
  pipelineRatio: number | null
  yearsInBusiness: number | null
}

export interface VerdictMeta {
  color: 'green' | 'blue' | 'amber' | 'gray'
  label: string
  borderClass: string
  bgClass: string
  textClass: string
}

export const VERDICT_META: Record<Verdict, VerdictMeta> = {
  STRONG: {
    color: 'green',
    label: 'Established Builder',
    borderClass: 'border-green-100',
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
  },
  ESTABLISHED: {
    color: 'blue',
    label: 'Active Developer',
    borderClass: 'border-blue-100',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
  },
  EMERGING: {
    color: 'amber',
    label: 'First Project in NCR',
    borderClass: 'border-amber-100',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
  },
  UNKNOWN: {
    color: 'gray',
    label: 'Limited Track Record',
    borderClass: 'border-gray-200',
    bgClass: 'bg-gray-50',
    textClass: 'text-gray-600',
  },
  INSUFFICIENT_DATA: {
    color: 'gray',
    label: 'No Profile Data',
    borderClass: 'border-gray-200',
    bgClass: 'bg-gray-50',
    textClass: 'text-gray-500',
  },
}

export function computeYearsInBusiness(founded_year: number | null): number | null {
  if (founded_year === null) return null
  const years = new Date().getFullYear() - founded_year
  return years < 0 ? 0 : years
}

export function computeVerdict(b: BuilderDetail | null): Verdict {
  if (!b) return 'INSUFFICIENT_DATA'

  const delivered = b.delivered_projects.filter(Boolean).length
  const ongoing = b.ongoing_projects.filter(Boolean).length
  const years = computeYearsInBusiness(b.founded_year) ?? 0

  if (b.credai_member && delivered >= 3 && years >= 5) return 'STRONG'
  if (delivered >= 1) return 'ESTABLISHED'
  if (delivered === 0 && ongoing > 0) return 'EMERGING'
  return 'UNKNOWN'
}

export function computeConfidence(b: BuilderDetail | null): Confidence {
  if (!b) return 'NONE'

  const delivered = b.delivered_projects.filter(Boolean).length

  if (delivered > 0 && b.founded_year !== null) return 'HIGH'
  if (delivered > 0 || b.founded_year !== null) return 'MEDIUM'
  return 'LOW'
}

export function computePipelineRatio(b: BuilderDetail): number | null {
  const delivered = b.delivered_projects.filter(Boolean).length
  const ongoing = b.ongoing_projects.filter(Boolean).length
  if (delivered === 0 && ongoing === 0) return null
  return ongoing / (delivered + ongoing)
}

export function computeBuilderIntelligence(b: BuilderDetail | null): BuilderIntelligenceData {
  return {
    verdict: computeVerdict(b),
    confidence: computeConfidence(b),
    pipelineRatio: b ? computePipelineRatio(b) : null,
    yearsInBusiness: b ? computeYearsInBusiness(b.founded_year) : null,
  }
}
