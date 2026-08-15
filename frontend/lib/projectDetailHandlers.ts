import { trackPropertyEvent } from '@/lib/analytics'
import type { ProjectCard as ProjectCardType } from '@/types/project'

export function handleReraClick(
  reraNo: string,
  reraUrl: string | null | undefined,
  onCopySuccess: () => void,
  onCopyReset: () => void
) {
  if (reraNo) {
    navigator.clipboard.writeText(reraNo)
    onCopySuccess()
    setTimeout(() => onCopyReset(), 2000)
  }
  if (!reraUrl) return
  window.open(reraUrl, '_blank')
}

export function handleOpenSiteVisit(project: ProjectCardType | null, userId: string | null | undefined) {
  if (project) trackPropertyEvent(project.id, 'site_visit', undefined, userId).catch(() => {})
}

export function handleEscapeKey(onClose: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }
}

export const imageTypeRank = (type: string): number => {
  const t = type.toLowerCase()
  return t === 'hero' ? 0 : t === 'exterior' ? 1 : 2
}
