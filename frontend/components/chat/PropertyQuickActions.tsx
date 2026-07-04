'use client'

import { useState, useRef, useEffect } from 'react'
import { Calculator, Phone, Share2, MoreHorizontal, ArrowRight, Bot, MapPin } from 'lucide-react'
import type { ProjectCard as ProjectCardType } from '@/types/project'
import type { ConversationStage } from '@/components/chat/types'
import { buildWhatsAppUrl } from '@/lib/whatsapp'
import { track } from '@/lib/analytics'

const WhatsAppIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

interface Props {
  project: ProjectCardType
  stage?: ConversationStage  // New: stage-aware actions
  onDetailOpen?: (project: ProjectCardType) => void
  onCallback?: (project: ProjectCardType) => void
  onSetSiteVisit: (project: ProjectCardType) => void
  onOpenCalculator: () => void
  onOpenShareSheet: () => void
}

export default function PropertyQuickActions({ project, stage = 'RESEARCH', onDetailOpen, onCallback, onSetSiteVisit, onOpenCalculator, onOpenShareSheet }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const waUrl = buildWhatsAppUrl(project)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAskAI = () => {
    window.dispatchEvent(
      new CustomEvent('realtypals:ask-ai', {
        detail: { text: `Tell me more about ${project.name}` },
      }),
    )
  }

  // Stage-aware action selection
  const showCompare = stage === 'RESEARCH' || stage === 'COMPARING'
  const showEmi = stage === 'COMPARING' || stage === 'DECIDING'
  const showVisit = stage === 'DECIDING'
  const showCallback = stage === 'DECIDING'

  return (
    <div className="flex flex-col gap-2 mt-4 relative w-full">
      {/* Primary: View Details always available */}
      <button
        onClick={() => onDetailOpen?.(project)}
        className="w-full py-3 bg-[#3061F2] hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-[10px] text-[14px] font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
      >
        View Details <ArrowRight size={15} strokeWidth={2.5} />
      </button>

      {/* Secondary: Ask AI + More (stage-filtered) */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleAskAI}
          className="flex items-center justify-center gap-1.5 border border-gray-200 dark:border-gray-700/60 rounded-[10px] py-2.5 text-[13px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:border-blue-300 dark:hover:border-blue-700 transition-colors shadow-sm"
        >
          <Bot size={14} className="text-[#3061F2] dark:text-blue-400" /> Ask
        </button>

        <div className="relative w-full" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-full flex items-center justify-center gap-1.5 border border-gray-200 dark:border-gray-700/60 rounded-[10px] py-2.5 text-[13px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:border-blue-300 dark:hover:border-blue-700 transition-colors shadow-sm"
            aria-label="More options"
          >
            <MoreHorizontal size={14} /> More
          </button>

          {menuOpen && (
            <div className="absolute bottom-full right-0 mb-2 py-1 w-48 bg-white dark:bg-gray-900 rounded-[12px] shadow-[0_4px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.5)] border border-gray-100 dark:border-gray-800 z-50 overflow-hidden">
              {showCompare && (
                <button
                  onClick={() => { window.dispatchEvent(new CustomEvent('realtypals:ask-ai', { detail: { text: `Compare this with other options` } })); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12.5px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  ⚖️ Compare
                </button>
              )}

              {showEmi && (
                <button
                  onClick={() => { onOpenCalculator(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12.5px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <Calculator size={13} className="text-gray-500 dark:text-gray-400" /> See Financing
                </button>
              )}

              {showVisit && (
                <button
                  onClick={() => { onSetSiteVisit(project); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12.5px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <MapPin size={13} className="text-gray-500 dark:text-gray-400" /> Schedule Visit
                </button>
              )}

              {showCallback && onCallback && (
                <button
                  onClick={() => { onCallback(project); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12.5px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <Phone size={13} className="text-gray-500 dark:text-gray-400" /> Request Callback
                </button>
              )}

              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    track('whatsapp_handoff', { project_slug: project.slug, project_name: project.name })
                    setMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12.5px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <WhatsAppIcon size={13} /> WhatsApp
                </a>
              )}

              <button
                onClick={() => { onOpenShareSheet(); setMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12.5px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <Share2 size={13} className="text-gray-500 dark:text-gray-400" /> Share
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


