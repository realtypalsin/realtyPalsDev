'use client'

import { CalendarDays, Calculator, Phone, Sparkles, Share2 } from 'lucide-react'
import type { ProjectCard as ProjectCardType } from '@/types/project'
import { buildWhatsAppUrl } from '@/lib/whatsapp'
import { track } from '@/lib/analytics'

const WhatsAppIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

const pillClass = 'flex items-center gap-1.5 text-[11.5px] font-semibold px-3 py-2 rounded-full border transition-colors whitespace-nowrap'

interface Props {
  project: ProjectCardType
  onCallback?: (project: ProjectCardType) => void
  onSetSiteVisit: (project: ProjectCardType) => void
  onOpenCalculator: () => void
  onOpenShareSheet: () => void
}

// Dedicated action row rendered below a property card — reuses the exact same
// callbacks/handlers the card used to call internally, just relocated out of
// the preview so the card itself only has to answer "do I want to open this?"
export default function PropertyQuickActions({ project, onCallback, onSetSiteVisit, onOpenCalculator, onOpenShareSheet }: Props) {
  const waUrl = buildWhatsAppUrl(project)

  const handleAskAI = () => {
    window.dispatchEvent(
      new CustomEvent('realtypals:ask-ai', {
        detail: { text: `Tell me more about ${project.name} by ${project.builder.name}` },
      }),
    )
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2.5">
      <button
        onClick={() => onSetSiteVisit(project)}
        className={`${pillClass} bg-white hover:bg-blue-50 border-gray-200 hover:border-blue-200 text-gray-700 hover:text-blue-700`}
      >
        <CalendarDays size={13} /> Book Site Visit
      </button>
      <button
        onClick={onOpenCalculator}
        className={`${pillClass} bg-white hover:bg-blue-50 border-gray-200 hover:border-blue-200 text-gray-700 hover:text-blue-700`}
      >
        <Calculator size={13} /> Payment Plan
      </button>
      {waUrl && (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('whatsapp_handoff', { project_slug: project.slug, project_name: project.name })}
          className={`${pillClass} bg-[#25D366]/10 hover:bg-[#25D366]/20 border-[#25D366]/30 text-[#1a9e4f]`}
        >
          <WhatsAppIcon size={13} /> WhatsApp
        </a>
      )}
      {onCallback && (
        <button
          onClick={() => onCallback(project)}
          className={`${pillClass} bg-white hover:bg-emerald-50 border-gray-200 hover:border-emerald-200 text-gray-700 hover:text-emerald-700`}
        >
          <Phone size={13} /> Request Callback
        </button>
      )}
      <button
        onClick={onOpenShareSheet}
        className={`${pillClass} bg-white hover:bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-700`}
      >
        <Share2 size={13} /> Share
      </button>
      <button
        onClick={handleAskAI}
        className={`${pillClass} bg-white hover:bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-700`}
      >
        <Sparkles size={13} /> Ask AI
      </button>
    </div>
  )
}
