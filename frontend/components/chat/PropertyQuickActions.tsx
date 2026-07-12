'use client'

import { Phone, Share2, Bot } from 'lucide-react'
import type { ProjectCard as ProjectCardType } from '@/types/project'
import type { ConversationStage } from '@/components/chat/types'

interface Props {
  project: ProjectCardType
  stage?: ConversationStage
  onDetailOpen?: (project: ProjectCardType) => void
  onCallback?: (project: ProjectCardType) => void
  onSetSiteVisit: (project: ProjectCardType) => void
  onOpenCalculator: () => void
  onOpenShareSheet: () => void
}

export default function PropertyQuickActions({ project, onCallback, onOpenShareSheet }: Props) {
  const handleAskAI = () => {
    window.dispatchEvent(
      new CustomEvent('realtypals:ask-ai', {
        detail: { text: `Tell me more about ${project.name}` },
      }),
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 mt-4 relative w-full">
      {/* Left: Request Callback (30%) */}
      <button
        onClick={(e) => { e.stopPropagation(); onCallback?.(project); }}
        className="flex-[3] h-11 flex flex-shrink-0 items-center justify-center rounded-full bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 transition-all shadow-sm"
        aria-label="Request Callback"
      >
        <Phone size={17} strokeWidth={1.5} />
      </button>

      {/* Center: Ask AI (40%) */}
      <button
        onClick={(e) => { e.stopPropagation(); handleAskAI(); }}
        className="flex-[4] h-11 flex flex-shrink-0 items-center justify-center gap-1.5 bg-[#3061F2] hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-full text-[14px] font-semibold shadow-[0_4px_14px_rgba(48,97,242,0.3)] hover:shadow-[0_6px_20px_rgba(48,97,242,0.4)] hover:-translate-y-0.5 transition-all duration-300"
      >
        <Bot size={17} strokeWidth={1.5} />
        Ask AI
      </button>

      {/* Right: Share (30%) */}
      <button
        onClick={(e) => { e.stopPropagation(); onOpenShareSheet(); }}
        className="flex-[3] h-11 flex flex-shrink-0 items-center justify-center rounded-full bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 transition-all shadow-sm"
        aria-label="Share"
      >
        <Share2 size={17} strokeWidth={1.5} />
      </button>
    </div>
  )
}
