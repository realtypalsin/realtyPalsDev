'use client'

import { memo, useState, useEffect, useRef } from 'react'
import {  m, AnimatePresence  } from 'framer-motion'
import dynamic from 'next/dynamic'
import NextImage from 'next/image'
import { RotateCcw, Copy, ChevronDown, MapPin, ThumbsUp, ThumbsDown, Scale, Sparkles, Edit2 } from 'lucide-react'
import { ResponseFormatter } from './ResponseFormatter'
import remarkGfm from 'remark-gfm'
import { track, trackPropertyEvent } from '@/lib/analytics'
import { parseResponseBlocks } from '@/lib/responseParser'
import { ResponseBlockRenderer } from '@/components/response/ResponseBlockRenderer'
import ProjectCard from '@/components/ProjectCard'
import PropertyQuickActions from '@/components/chat/PropertyQuickActions'
import { SuggestionChip } from '@/components/chat/SuggestionChip'
import { CardSelectorChip } from '@/components/chat/CardSelectorChip'
import UniversalLoader from '@/components/ui/universal-loader'
import type { ChatMessage } from '@/types/property'
import type { ProjectCard as ProjectCardType } from '@/types/project'
import type { ChipPickerState } from './types'
import type { ChatResponse } from '@/types/chat'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'

const safeDefaultSchema = defaultSchema || { tagNames: [], attributes: {} }
const REALTY_SCHEMA = {
  ...safeDefaultSchema,
  tagNames: [...(safeDefaultSchema.tagNames || []), 'realty-chart', 'realty-box'],
  attributes: {
    ...(safeDefaultSchema.attributes || {}),
    'realty-chart': ['type', 'data', 'title'],
    'realty-box': ['type', 'title'],
  },
}

const RealtyChart = dynamic(() => import('@/components/RealtyChart'), {
  ssr: false,
  loading: () => <div className="h-48 bg-slate-100 animate-pulse rounded-xl flex items-center justify-center"><span className="text-sm text-slate-400">Loading chart...</span></div>
})
import RealtyBox from '@/components/RealtyBox'

// ── Helpers ────────────────────────────────────────────────────────────────
function formatStreamingIntent(intent: Record<string, unknown> | null | undefined): string | null {
  if (!intent) return null
  const parts: string[] = []
  if (Array.isArray(intent.bhk) && intent.bhk.length > 0) parts.push(`${(intent.bhk as number[]).join('/')} BHK`)
  if (typeof intent.sector === 'string') parts.push(intent.sector)
  if (Number.isFinite(intent.budgetMax)) parts.push(`under ₹${intent.budgetMax}Cr`)
  else if (Number.isFinite(intent.budgetMin)) parts.push(`from ₹${intent.budgetMin}Cr`)
  return parts.length > 0 ? `Looking for ${parts.join(' · ')}` : 'Scanning available projects…'
}

function buildAdaptiveThinkingLabel(userMessage: string | undefined, intent: Record<string, unknown> | null, phase: string): { label: string; sublabel?: string } {
  const intentLabel = formatStreamingIntent(intent)

  // Extract key terms from user message
  const msg = (userMessage || '').toLowerCase()
  const hasBudget = /(\d+\s*(cr|crore|lakh|lac))/i.test(userMessage || '')
  const hasMetro = /metro|station|proximity|near/i.test(msg)
  const hasFamily = /family|kids|children|school/i.test(msg)
  const hasInvestment = /invest|invest|appreciation|roi/i.test(msg)

  // Build context phrase
  let context = ''
  if (hasBudget && hasMetro) context = 'metro-accessible'
  else if (hasBudget && hasFamily) context = 'family-focused'
  else if (hasBudget && hasInvestment) context = 'investment-grade'
  else if (hasMetro) context = 'near metro stations'
  else if (hasFamily) context = 'for your family'
  else context = 'that match your criteria'

  if (phase === 'searching') {
    return {
      label: `Searching for properties ${context}`,
      sublabel: intentLabel || undefined
    }
  } else if (phase === 'generating') {
    return {
      label: 'Analyzing options',
      sublabel: intentLabel || undefined
    }
  } else {
    // extraction phase
    if (intentLabel) {
      return { label: 'Refining criteria', sublabel: intentLabel }
    }
    return { label: 'Understanding your needs' }
  }
}

import ReactMarkdown from 'react-markdown'

// ── Dynamic imports — excluded from initial JS bundle ──────────────────────

const SectorMap = dynamic(() => import('@/components/SectorMap'), { ssr: false })
const ComparisonTable = dynamic(() => import('@/components/ComparisonTable'), { ssr: false })
const ComponentRenderer = dynamic(() => import('@/components/ComponentRenderer').then(m => ({ default: m.ComponentRenderer })), { ssr: false })


// ── Props ──────────────────────────────────────────────────────────────────
export interface MessageBubbleProps {
  message: ChatMessage
  index: number
  isLast: boolean
  isSubmitting: boolean
  chatPhase: 'DISCOVERY' | 'ADVISOR'
  isLastProperties: boolean
  isExpanded: boolean
  carouselIndex: number
  lastShortlist: ProjectCardType[]
  showMap: boolean
  userId: string | null
  sessionId: string
  regeneratingIdx: number | null
  chipPicker: ChipPickerState | null
  chips: import('./types').ChipAction[]
  isRestoring?: boolean

  // Callbacks — all stable (useCallback in parent)
  onCopy: (text: string) => void
  onDetailOpen: (project: ProjectCardType | null) => void
  onCallback: (project: ProjectCardType) => void
  onRegenerate: (index: number) => void
  onAction: (action: import('./types').ChipAction) => void
  onEditMessage: (messageId: string, newContent: string) => Promise<void>

  onToggleExpanded: (messageId: string) => void
  onSetChipPicker: (picker: ChipPickerState | null) => void
  onSetCarouselIndex: (msgIndex: number, imgIndex: number) => void
  onSetSiteVisit: (project: ProjectCardType) => void
  onOpenCalculator: () => void
  onOpenShareSheet: () => void
  onToast: (msg: string) => void
  onOpenCompare: (properties: ProjectCardType[]) => void

  comparingMessageId?: string | null
  selectedCompareIds?: Set<string>
  onToggleCompareSelect?: (messageId: string, property: ProjectCardType) => void
  onStartCompare?: (messageId: string, properties: ProjectCardType[]) => void
}

// ── Message builders ───────────────────────────────────────────────────────
export function buildPickerMessage(action: string, selected: ProjectCardType[]): string {
  const names = selected.map(p => p.name)
  switch (action) {
    case 'emi':
      return `What would be the monthly EMI for ${names[0]}? Calculate EMI assuming standard lending parameters.`
    case 'stamp_duty':
      return `Calculate stamp duty and registration charges for ${names[0]}.`
    case 'gst':
      return `What is the GST applicable on ${names[0]}?`
    case 'compare':
      return names.length === 2
        ? `Compare ${names[0]} vs ${names[1]} in detail — price, amenities, builder, location, trade-offs.`
        : `Compare ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} in detail.`
    case 'builder':
      return `Tell me about ${selected[0].builder.name}'s delivery history, reputation, and any complaints.`
    case 'area':
      return `Give me a full area overview of ${selected[0].sector} — metro access, schools, hospitals, appreciation potential.`
    case 'risks':
      return `What are the main risks and concerns I should know about ${names[0]}?`
    default:
      return names[0]
  }
}

// ── Unified suggestion chips — all chips use same premium NotebookLM style
export function SuggestionChipGroups({
  chips,
  chipPicker,
  onSetChipPicker,
  onAction,
  isDisabled,
}: {
  chips: import('./types').ChipAction[]
  chipPicker: ChipPickerState | null
  onSetChipPicker: (picker: ChipPickerState | null) => void
  onAction: (action: import('./types').ChipAction) => void
  isDisabled?: boolean
}) {
  if (chips.length === 0) return null

  // Belt-and-suspenders dedup: normalize label text, cap at 4
  const seen = new Set<string>()
  const deduped = chips.filter(c => {
    const normalized = c.label.toLowerCase().trim()
    if (seen.has(normalized)) return false
    seen.add(normalized)
    return true
  }).slice(0, 4)

  const sorted = deduped.sort((a, b) => a.priority - b.priority)

  const handleCardSelect = (chip: import('./types').ChipAction, projectId: string) => {
    // Convert card selection to TEXT_MESSAGE for the backend
    const payload = (chip.payload as any) || {}
    const projects = payload.projects as Array<{ id: string; name: string }> | undefined

    // Validate chip has projects array
    if (!projects || projects.length === 0) {
      console.error('[CHIP] No projects in chip payload:', { chipId: chip.id, chipLabel: chip.label, payload })
      return
    }

    // Try exact match first
    let selectedProject = projects.find(p => String(p.id) === String(projectId))

    // Fallback: try parsing projectId as array index
    if (!selectedProject && projectId) {
      const idx = parseInt(projectId, 10)
      if (!isNaN(idx) && projects[idx]) {
        selectedProject = projects[idx]
      }
    }

    // Final fallback: use first project
    if (!selectedProject) {
      selectedProject = projects[0]
      console.warn('[CHIP] Using fallback project:', { requested: projectId, using: selectedProject.name })
    }

    // Validate action type
    if (chip.actionType !== 'TEXT_MESSAGE') {
      console.error('[CHIP] Chip is not TEXT_MESSAGE:', { chipId: chip.id, actionType: chip.actionType })
      return
    }

    // Build natural language message
    const prefix = String(payload.actionPrefix || chip.label || 'Consider').trim()
    const suffix = String(payload.actionSuffix || '?').trim()

    if (!prefix || !selectedProject?.name) {
      console.error('[CHIP] Missing message parts:', { prefix, projectName: selectedProject?.name })
      return
    }

    const fullMessage = `${prefix} ${selectedProject.name}${suffix}`.trim()

    if (!fullMessage) {
      console.error('[CHIP] Empty message after construction')
      return
    }

    // Send TEXT_MESSAGE
    const textChip = {
      ...chip,
      actionType: 'TEXT_MESSAGE' as const,
      payload: { text: fullMessage }
    }
    onAction(textChip)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {sorted.map((chip) => {
        // Check if chip has multiple projects — use CardSelectorChip
        const projects = chip.payload?.projects as Array<{ id: string; name: string }> | undefined
        const hasMultipleProjects = projects && projects.length > 1

        if (hasMultipleProjects) {
          return (
            <CardSelectorChip
              key={chip.id}
              chip={chip}
              projects={projects}
              onSelect={handleCardSelect}
              disabled={isDisabled}
            />
          )
        }

        return (
          <SuggestionChip key={chip.id} chip={chip} chipPicker={chipPicker} onSetChipPicker={onSetChipPicker} onAction={onAction} disabled={isDisabled} />
        )
      })}
    </div>
  )
}


// ── Custom equality — only the actively-streaming (last) message re-renders ─
function areEqual(prev: MessageBubbleProps, next: MessageBubbleProps): boolean {
  if (next.isSubmitting !== prev.isSubmitting) return false
  if (prev.isLast && prev.isSubmitting) return false
  return (
    prev.message.content === next.message.content &&
    prev.message.properties === next.message.properties &&
    prev.message.exactResults === next.message.exactResults &&
    prev.message.nearbyResults === next.message.nearbyResults &&
    prev.message.isSearching === next.message.isSearching &&
    prev.isExpanded === next.isExpanded &&
    prev.carouselIndex === next.carouselIndex &&
    prev.chips === next.chips &&
    prev.message.chips === next.message.chips
  )
}

// ── Component ──────────────────────────────────────────────────────────────
function MessageBubbleInner({
  message, index, isLast, isSubmitting, chatPhase, isLastProperties,
  isExpanded, carouselIndex, lastShortlist, showMap, userId, sessionId, regeneratingIdx,
  chipPicker, chips, isRestoring,
  onCopy, onDetailOpen, onCallback, onRegenerate, onAction, onEditMessage,

  onToggleExpanded, onSetChipPicker, onSetCarouselIndex,
  onSetSiteVisit, onOpenCalculator, onOpenShareSheet, onToast, onOpenCompare,
  comparingMessageId, selectedCompareIds, onToggleCompareSelect, onStartCompare,
}: MessageBubbleProps) {
  const isUser = message.type === 'user'
  const [showAllProperties, setShowAllProperties] = useState(false)
  const [isInlineEditing, setIsInlineEditing] = useState(false)
  const [inlineText, setInlineText] = useState(message.content || '')
  const [editLoading, setEditLoading] = useState(false)

  const displayContent = message.content || ''

  const handleInlineSave = async () => {
    const trimmed = inlineText.trim()
    if (!trimmed || trimmed === displayContent) {
      setIsInlineEditing(false)
      return
    }
    setEditLoading(true)
    try {
      await onEditMessage(message.id, trimmed)
      setIsInlineEditing(false)
    } catch (error) {
      console.error('Failed to edit message:', error)
      onToast('Failed to save changes')
    } finally {
      setEditLoading(false)
    }
  }
  const combinedChips = [...chips]

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
  const touchTimeout = useRef<NodeJS.Timeout | null>(null);
  const chipPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chipPicker) return
    const handleClickOutside = (e: MouseEvent) => {
      if (chipPickerRef.current && !chipPickerRef.current.contains(e.target as Node)) {
        onSetChipPicker(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [chipPicker, onSetChipPicker])

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu]);

  useEffect(() => {
    if (!message.showComparisonTable || !message.comparisonProjects?.length) return
    message.comparisonProjects.forEach(p => {
      trackPropertyEvent(p.id, 'compare', sessionId, userId).catch(() => {})
    })
  }, [message.showComparisonTable, message.comparisonProjects, sessionId, userId])

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isUser || !message.content) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isUser || !message.content) return;
    const touch = e.touches[0];
    touchTimeout.current = setTimeout(() => {
      setContextMenu({ x: touch.clientX, y: touch.clientY });
    }, 500); // 500ms long press
  };

  const handleTouchEnd = () => {
    if (touchTimeout.current !== null) clearTimeout(touchTimeout.current);
  };

  return (
    <m.div
      initial={isRestoring ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: isUser ? 20 : -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={isRestoring ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 20 }}
      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group/msg`}
    >
      <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
        {/* Message bubble */}
        <div
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className={`px-5 py-3.5 transition-all duration-300 ${isUser
            ? 'max-w-[85%] sm:max-w-[78%] bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-600 text-white shadow-[0_4px_18px_rgba(37,99,235,0.28)] rounded-[22px] rounded-br-[6px] border border-blue-400/30 text-sm font-medium tracking-tight'
            : 'max-w-[95%] sm:max-w-[85%] bg-white dark:bg-[#121214] ring-1 ring-inset ring-black/5 dark:ring-white/10 text-gray-900 dark:text-gray-100 relative overflow-hidden rounded-[22px] rounded-tl-[6px] cursor-pointer sm:cursor-default shadow-[0_2px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]'
            }`}
        >
          {!isUser && <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-500/5 rounded-full blur-[40px] pointer-events-none" />}

          {!isUser ? (
            <div className="relative z-10">
              {(() => {
                const hasProperties = (message.exactResults?.length ?? 0) > 0 || (message.nearbyResults?.length ?? 0) > 0
                const phase = message.streamingPhase
                const intent = message.streamingIntent
                const resultCount = message.streamingResultCount

                // Stage A: waiting — no properties, no content yet
                if (!hasProperties && !message.content) {
                  const { label, sublabel } = buildAdaptiveThinkingLabel(message.content ?? undefined, intent ?? null, phase ?? '')
                  const showCards = phase === 'searching' || phase === 'generating'

                  return (
                    <UniversalLoader
                      variant="chat-thinking"
                      label={label}
                      sublabel={sublabel}
                      showCards={showCards}
                      phase={phase}
                      intent={intent}
                      resultCount={resultCount}
                    />
                  )
                }

                // Stage B: properties arrived, AI text not started yet
                if (hasProperties && !message.content && phase === 'generating') {
                  return (
                    <m.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-2.5 py-1"
                    >
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 opacity-100 animate-pulse" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 opacity-100 animate-pulse" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 opacity-100 animate-pulse" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-[12px] text-blue-600 dark:text-blue-400 font-medium">
                        Analyzing {resultCount != null && resultCount > 0 ? `${resultCount} ${resultCount === 1 ? 'property' : 'properties'}` : 'results'}…
                      </span>
                    </m.div>
                  )
                }

                // Stage C: Database-backed response (80% DB, 20% LLM)
                if (message.responseMode === 'database' && message.chatResponse) {
                  return (
                    <>
                      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100 dark:border-gray-700/60">
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Data-Backed Advice</span>
                      </div>
                      <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-3"
                      >
                        <ResponseFormatter response={message.chatResponse} />
                      </m.div>
                    </>
                  )
                }

                // Stage D: Component response (verified data pipeline)
                if (message.responseMode === 'components' && message.componentResponse) {
                  const { summary, confidence, components, sources } = message.componentResponse
                  return (
                    <>
                      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100 dark:border-gray-700/60">
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Verified Data</span>
                      </div>
                      <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-3"
                      >
                        {/* Summary text */}
                        {summary && (
                          <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 mb-3">
                            {summary}
                          </div>
                        )}

                        {/* Confidence badge */}
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                          confidence >= 0.8 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                          confidence >= 0.65 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                          'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            confidence >= 0.8 ? 'bg-green-600 dark:bg-green-400' :
                            confidence >= 0.65 ? 'bg-yellow-600 dark:bg-yellow-400' :
                            'bg-orange-600 dark:bg-orange-400'
                          }`} />
                          {Math.round(confidence * 100)}% confident
                        </div>

                        {/* Component specs */}
                        <div className="mt-4">
                          <ComponentRenderer specs={components} />
                        </div>

                        {/* Sources attribution */}
                        {sources && sources.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 text-xs text-gray-600 dark:text-gray-300">
                            <span className="font-medium">Sources: </span>
                            {sources.join(', ')}
                          </div>
                        )}
                      </m.div>
                    </>
                  )
                }

                // Stage D: AI text streaming or complete
                if (displayContent) {
                  const streaming = isLast && isSubmitting
                  const blocks = streaming ? null : parseResponseBlocks(displayContent)
                  return (
                    <>
                      {!hasProperties && (
                        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100 dark:border-gray-700/60">
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">AI Advisor</span>
                        </div>
                      )}
                      <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.25 }}
                        className={blocks ? undefined : "prose prose-sm md:prose-base dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-blue-700 dark:prose-headings:text-blue-400 prose-a:text-blue-500 prose-strong:bg-blue-50 dark:prose-strong:bg-blue-900/40 prose-strong:px-1.5 prose-strong:py-0.5 prose-strong:rounded-md prose-strong:text-blue-950 dark:prose-strong:text-blue-100 prose-strong:font-semibold prose-strong:border prose-strong:border-blue-200 dark:prose-strong:border-blue-700/50 prose-table:w-full prose-table:text-sm prose-table:my-4 prose-table:border-collapse prose-table:rounded-xl prose-table:overflow-hidden prose-table:border prose-table:border-gray-200 dark:prose-table:border-gray-700 prose-th:bg-gray-100 dark:prose-th:bg-blue-900/40 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-gray-800 dark:prose-th:text-blue-200 prose-th:border prose-th:border-gray-200 dark:prose-th:border-gray-700 prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-gray-200 dark:prose-td:border-gray-700"}
                      >
                        {blocks ? (
                          <ResponseBlockRenderer blocks={blocks} />
                        ) : (
                          <>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeRaw, [rehypeSanitize, REALTY_SCHEMA]]}
                              components={{
                                'realty-chart': ({ node, ...props }: any) => <RealtyChart type={props.type} data={props.data} title={props.title} />,
                                'realty-box': ({ node, ...props }: any) => <RealtyBox type={props.type} title={props.title}>{props.children}</RealtyBox>,
                                table: ({ node, ...props }: any) => (
                                  <div className="my-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#151b27] shadow-sm">
                                    <table className="w-full border-collapse text-left text-sm text-gray-500 dark:text-gray-400" {...props} />
                                  </div>
                                ),
                                thead: ({ node, ...props }: any) => (
                                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800" {...props} />
                                ),
                                th: ({ node, ...props }: any) => (
                                  <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white" {...props} />
                                ),
                                td: ({ node, ...props }: any) => (
                                  <td className="px-4 py-3 border-b border-gray-100 dark:border-gray-800/50 last:border-0 text-gray-700 dark:text-gray-300" {...props} />
                                ),
                                tr: ({ node, ...props }: any) => (
                                  <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors" {...props} />
                                ),
                                a: ({ node, ...props }: any) => {
                                  const href = props.href || ''
                                  if (href.startsWith('#entity:')) {
                                    const projectId = href.slice(8)
                                    const projectName = String(props.children)
                                    return (
                                      <button
                                        onClick={() => onAction?.({
                                          id: `entity:${projectId}`,
                                          actionType: 'TEXT_MESSAGE',
                                          label: `Tell me more about ${projectName}`,
                                          icon: 'ℹ️',
                                          analyticsId: `entity_mention:${projectId}`,
                                          priority: 2,
                                          payload: { text: `Tell me more about ${projectName}` },
                                        })}
                                        className="text-[#c47860] hover:underline cursor-pointer font-medium"
                                      >
                                        {projectName}
                                      </button>
                                    )
                                  }
                                  return <a {...props} className="text-[#c47860] hover:underline" />
                                }
                              } as any}
                            >
                              {displayContent}
                            </ReactMarkdown>
                            {streaming && (
                              <span className="inline-block w-0.5 h-[1em] bg-current animate-pulse ml-0.5 align-middle opacity-70" />
                            )}
                          </>
                        )}
                      </m.div>
                    </>
                  )
                }

                return null
              })()}
            </div>
          ) : isUser && isInlineEditing ? (
            <div className="w-full space-y-2 relative z-10 min-w-[260px] sm:min-w-[320px]">
              <textarea
                autoFocus
                value={inlineText}
                onChange={(e) => setInlineText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    handleInlineSave()
                  }
                  if (e.key === 'Escape') {
                    setIsInlineEditing(false)
                    setInlineText(displayContent)
                  }
                }}
                className="w-full min-h-[70px] p-3 text-[15px] font-medium text-gray-900 dark:text-white bg-white dark:bg-zinc-800 border border-blue-500/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              />
              <div className="flex items-center justify-end gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsInlineEditing(false)
                    setInlineText(displayContent)
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-zinc-700/60 rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleInlineSave}
                  disabled={!inlineText.trim() || editLoading}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {editLoading ? 'Saving...' : 'Save & Submit'}
                </button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-[16px] font-medium leading-relaxed relative z-10">{displayContent}</p>
          )}
        </div>
      </div>

      <div className={`mt-1.5 flex items-center w-full ${isUser ? 'justify-end' : 'justify-start'} gap-2 px-1`}>
        {message.timestamp && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            {new Date(message.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        {isUser && displayContent && !isInlineEditing && (
          <button
            onClick={() => {
              setIsInlineEditing(true)
              setInlineText(displayContent)
            }}
            title="Edit message"
            className="text-gray-400 hover:text-blue-500 transition-colors opacity-0 group-hover/msg:opacity-100"
            disabled={editLoading}
          >
            <Edit2 size={12} />
          </button>
        )}
        {!isUser && displayContent && (
          <>
            <button
              onClick={() => { onCopy(displayContent); onToast('Copied to clipboard'); }}
              title="Copy response"
              className="text-gray-400 hover:text-blue-500 transition-colors opacity-0 group-hover/msg:opacity-100"
            >
              <Copy size={12} />
            </button>
            <button
              onClick={() => { track('answer_feedback', { helpful: true, session_id: sessionId }); onToast('Thanks for the feedback'); }}
              title="Helpful"
              className="text-gray-400 hover:text-green-500 transition-colors opacity-0 group-hover/msg:opacity-100"
            >
              <ThumbsUp size={12} />
            </button>
            <button
              onClick={() => { track('answer_feedback', { helpful: false, session_id: sessionId }); onToast('Thanks for the feedback'); }}
              title="Not helpful"
              className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover/msg:opacity-100"
            >
              <ThumbsDown size={12} />
            </button>
          </>
        )}
      </div>

      {/* In-chat image gallery */}
      {message.images && message.images.length > 0 && (
        <div className="mt-3 w-full max-w-[90%] md:max-w-[80%]">

          <div className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-sm">
            {message.images[carouselIndex]?.type && (
              <div className="absolute top-3 left-3 z-10">
                <span className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-[11px] font-medium capitalize">
                  {(message.images[carouselIndex].type || '').replace(/_/g, ' ')}
                </span>
              </div>
            )}
            {(() => {
              const src = message.images[carouselIndex]?.url ?? message.images[0]?.url;
              return src ? (
                <NextImage
                  src={src}
                  alt={message.images[carouselIndex]?.caption ?? 'Property image'}
                  width={680}
                  height={400}
                  className="w-full h-72 object-cover"
                />
              ) : null;
            })()}

            {message.images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                {message.images.map((_, imgIdx) => (
                  <button
                    key={imgIdx}
                    onClick={() => onSetCarouselIndex(index, imgIdx)}
                    className={`carousel-dot ${carouselIndex === imgIdx ? 'active' : ''}`}
                  />
                ))}
              </div>
            )}
            {message.images[carouselIndex]?.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-2">
                <p className="text-white text-xs">{message.images[carouselIndex].caption}</p>
              </div>
            )}
          </div>
          {message.images.length > 1 && (
            <p className="text-xs text-gray-400 mt-1.5 text-center">{carouselIndex + 1} / {message.images.length}</p>
          )}
        </div>
      )}

      {/* Highlights */}
      {message.highlights && message.highlights.length > 0 && (
        <div className="mt-3 max-w-[90%] md:max-w-[80%] bg-[#F7F7F7] dark:bg-gray-800 border border-[#E8E8E8] dark:border-gray-700 rounded-2xl px-5 py-4 shadow-sm">

          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Key Highlights</p>
          <ul className="space-y-2">
            {message.highlights.map((h, hIdx) => (
              <li key={hIdx} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Amenities */}
      {message.amenities && message.amenities.length > 0 && (
        <div className="mt-4 w-full max-w-[95%] sm:max-w-[85%] md:max-w-[75%]">

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {message.amenities.map((amenity, idx) => (
              <div key={idx} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-100 dark:border-blue-900/30 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 flex items-center justify-center text-center shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group">
                <span className="text-[12px] sm:text-[13px] font-semibold text-blue-800 dark:text-blue-300 group-hover:text-blue-600 dark:group-hover:text-blue-200">{amenity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Property cards — suppressed in comparison mode (ComparisonTable owns that UI) */}
      {(() => {
        if (message.responseMode === 'comparison') return null

        // New format: exactResults / nearbyResults (set on all fresh messages)
        const useNewFormat = message.exactResults !== undefined
        const rawExactList = message.exactResults ?? []
        const rawNearbyList = message.nearbyResults ?? []
        const expansion = message.expansion
        const rawLegacyList = message.properties ?? []

        // Pagination (limit to 6 cards initially)
        const MAX_CARDS = 6
        const totalCards = useNewFormat ? (rawExactList.length + rawNearbyList.length) : rawLegacyList.length
        const hasMoreThanMax = totalCards > MAX_CARDS

        const exactList = showAllProperties ? rawExactList : rawExactList.slice(0, MAX_CARDS)
        const remainingSlots = Math.max(0, MAX_CARDS - exactList.length)
        const nearbyList = showAllProperties ? rawNearbyList : rawNearbyList.slice(0, remainingSlots)
        const legacyList = showAllProperties ? rawLegacyList : rawLegacyList.slice(0, MAX_CARDS)

        const hasExact = rawExactList.length > 0
        const hasNearby = rawNearbyList.length > 0
        const hasLegacy = rawLegacyList.length > 0

        if (useNewFormat && !hasExact && !hasNearby) return null
        if (!useNewFormat && !hasLegacy) return null

        const isOpen = isExpanded

        const primaryCards = useNewFormat ? (hasExact ? exactList : nearbyList) : legacyList
        const fullCardsForCompare = useNewFormat ? (hasExact ? rawExactList : rawNearbyList) : rawLegacyList

        const headerLabel = useNewFormat && !hasExact && hasNearby
          ? `${totalCards} nearby ${totalCards === 1 ? 'alternative' : 'alternatives'}`
          : `${totalCards} ${totalCards === 1 ? 'property' : 'properties'} found`

        const headerSector = useNewFormat && !hasExact && hasNearby
          ? expansion?.searchedSectors.join(', ')
          : (rawExactList[0]?.sector || rawNearbyList[0]?.sector || rawLegacyList[0]?.sector)

        return (
          <div className="mt-2 w-full">

            <m.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-gradient-to-r from-slate-50/95 via-blue-50/40 to-indigo-50/60 dark:from-zinc-900/95 dark:via-zinc-900/90 dark:to-blue-950/40 border border-blue-500/15 dark:border-blue-400/20 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)] backdrop-blur-md"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-blue-600/10 dark:bg-blue-400/15 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs shadow-2xs">
                  {useNewFormat && !hasExact && hasNearby ? '📍' : (isLast && isSubmitting ? '🔍' : '✓')}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13.5px] font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                    {headerLabel}
                  </span>
                  {headerSector && (
                    <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline tracking-tight">
                      in {headerSector}
                    </span>
                  )}
                  <span className="hidden sm:inline-flex items-center gap-1 text-[9.5px] font-black text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-950/80 border border-blue-200/80 dark:border-blue-800/80 px-2.5 py-0.5 rounded-full uppercase tracking-widest shadow-2xs">
                    Ranked by fit
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('realtypals:open-map'))}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/80 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-200 transition-all shadow-2xs active:scale-95 cursor-pointer"
                >
                  <MapPin size={13} className="text-blue-500" />
                  <span className="hidden sm:inline">Map</span>
                </button>
                {fullCardsForCompare.length >= 2 && (
                  <button
                    onClick={() => {
                      if (onStartCompare) {
                        onStartCompare(message.id, fullCardsForCompare)
                      } else {
                        onOpenCompare(fullCardsForCompare)
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shadow-2xs active:scale-95 cursor-pointer border ${
                      comparingMessageId === message.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20'
                        : 'bg-white/80 dark:bg-zinc-800/80 border-slate-200/80 dark:border-zinc-700/80 text-slate-700 dark:text-slate-200 hover:border-blue-400 dark:hover:border-blue-500'
                    }`}
                  >
                    <Scale size={13} className={comparingMessageId === message.id ? 'text-white' : 'text-blue-500'} />
                    <span className="hidden sm:inline">{comparingMessageId === message.id ? 'Comparing…' : 'Compare'}</span>
                  </button>
                )}
                <button
                  onClick={() => onToggleExpanded(message.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all shadow-2xs active:scale-95 cursor-pointer border ${
                    isOpen
                      ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20'
                      : 'bg-white/80 dark:bg-zinc-800/80 border-slate-200/80 dark:border-zinc-700/80 text-slate-700 dark:text-slate-200 hover:border-blue-400'
                  }`}
                >
                  <span>{isOpen ? 'Hide' : `View (${totalCards})`}</span>
                  <ChevronDown size={13} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : 'text-slate-500'}`} />
                </button>
              </div>
            </m.div>

            {/* Empty sector banner — shown when requested sector has no exact matches */}
            {useNewFormat && !hasExact && hasNearby && expansion && (
              <m.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-3"
              >
                <span className="text-amber-500 text-base mt-0.5 flex-shrink-0">⚠️</span>
                <div>
                  <p className="text-[13px] font-semibold text-amber-800 dark:text-amber-300">
                    We couldn&apos;t find an exact match in {expansion.requestedSector}
                  </p>
                  <p className="text-[12px] text-amber-700 dark:text-amber-400 mt-0.5 font-medium">
                    Verified --
                  </p>
                </div>
              </m.div>
            )}

            {isOpen && (
              <div className="mt-3 w-full">
                {/* Property Results Grid */}
                {(useNewFormat ? exactList : legacyList).length > 0 && (
                  <div className="mt-3">
                    <div className="flex flex-col sm:grid sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
                      {(useNewFormat ? exactList : legacyList).map((property, pi) => (
                        <m.div
                          key={property.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: pi * 0.07, ease: 'easeOut' }}
                          className="w-full h-full flex flex-col"
                        >
                          <ProjectCard
                            project={property}
                            userId={userId}
                            sessionId={sessionId}
                            index={pi}
                            isSelectable={comparingMessageId === message.id}
                            isSelected={Boolean(selectedCompareIds && (selectedCompareIds.has(String(property.id)) || (property.slug && selectedCompareIds.has(property.slug)) || selectedCompareIds.has(property.id as any)))}
                            onToggleSelect={() => onToggleCompareSelect?.(message.id, property)}
                            onDetailOpen={onDetailOpen}
                            onToast={onToast}
                            onAskAI={() => { /* card dispatches its own realtypals:ask-ai */ }}
                            onSetSiteVisit={onSetSiteVisit}
                            onCall={onCallback}
                          />
                        </m.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nearby results section */}
                {useNewFormat && hasNearby && (
                  <div className={hasExact ? 'mt-6' : ''}>
                    {hasExact && (
                      <div className="mb-3 flex items-center gap-2">
                        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          📍 Nearby alternatives · {expansion?.searchedSectors.join(', ')}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col sm:grid sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
                      {nearbyList.map((property, pi) => (
                        <m.div
                          key={property.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: pi * 0.07, ease: 'easeOut' }}
                          className="w-full h-full flex flex-col"
                        >
                          <ProjectCard
                            project={property}
                            userId={userId}
                            sessionId={sessionId}
                            index={pi}
                            isSelectable={comparingMessageId === message.id}
                            isSelected={Boolean(selectedCompareIds && (selectedCompareIds.has(String(property.id)) || (property.slug && selectedCompareIds.has(property.slug)) || selectedCompareIds.has(property.id as any)))}
                            onToggleSelect={() => onToggleCompareSelect?.(message.id, property)}
                            onDetailOpen={onDetailOpen}
                            onToast={onToast}
                            onAskAI={() => { /* card dispatches its own realtypals:ask-ai */ }}
                            onSetSiteVisit={onSetSiteVisit}
                            onCall={onCallback}
                          />
                        </m.div>
                      ))}
                    </div>
                  </div>
                )}

                {showMap && primaryCards.length >= 2 && (
                  <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-md w-full">
                    <SectorMap properties={primaryCards} />
                  </div>
                )}

                {hasMoreThanMax && (
                  <div className="mt-4 flex justify-center w-full">
                    <button
                      onClick={() => setShowAllProperties(prev => !prev)}
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[12px] font-bold rounded-full shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                      <span>{showAllProperties ? 'Show initial 6 properties' : `View remaining ${totalCards - MAX_CARDS} properties (All ${totalCards})`}</span>
                      <ChevronDown size={14} className={`transition-transform duration-200 ${showAllProperties ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        )
      })()}

      {/* Advisor shortlist re-surface */}
      {message.type === 'ai' && chatPhase === 'ADVISOR' && !message.exactResults?.length && !message.nearbyResults?.length && !message.properties?.length && lastShortlist.length > 0 && isLast && (
        <div className="mt-3 w-full">

          <button
            onClick={() => onToggleExpanded(message.id)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl text-[12px] font-semibold text-blue-700 transition-all"
          >
            <span>View {lastShortlist.length} shortlisted properties</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
          {isExpanded && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lastShortlist.map((p, pi) => (
                <div key={p.id} className="flex flex-col">
                  <ProjectCard 
                    project={p} 
                    userId={userId} 
                    index={pi} 
                    onDetailOpen={onDetailOpen} 
                    onToast={onToast}
                    quickActions={
                      <PropertyQuickActions
                        project={p}
                        onDetailOpen={onDetailOpen}
                        onCallback={onCallback}
                        onSetSiteVisit={onSetSiteVisit}
                        onOpenCalculator={onOpenCalculator}
                        onOpenShareSheet={onOpenShareSheet}
                      />
                    }
                  />
                </div>

              ))}
            </div>
          )}
        </div>
      )}

      {/* Progressive chips from Conversation Engine */}
      {(() => {
        const hasOwnChips = Array.isArray(message.chips) && message.chips.length > 0;
        const shouldShow = message.type === 'ai' && displayContent && combinedChips.length > 0
          && (isLast ? !isSubmitting : hasOwnChips);
        return shouldShow;
      })() && (

        <m.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="mt-3"
        >
          <SuggestionChipGroups
            chips={combinedChips}
            chipPicker={chipPicker}
            onSetChipPicker={onSetChipPicker}
            onAction={onAction}
          />

          <AnimatePresence mode="wait">

            {chipPicker && (
              <m.div
                ref={chipPickerRef}
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-2xl p-3 shadow-lg">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                      {chipPicker.mode === 'multi' ? 'Select properties to compare' : 'Which property?'}
                    </span>
                    <button onClick={() => onSetChipPicker(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none px-1">×</button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {lastShortlist.map((p) => {
                      const isSelected = chipPicker.selected.includes(p.slug)
                      const checkedState = isSelected ? 'checked' : 'unchecked'
                      const ariaLabel = `${p.name}, ${p.price_range_label || ''} in ${p.sector || ''} (${checkedState})`
                      return (
                        <button
                          key={p.slug}
                          role={chipPicker.mode === 'multi' ? 'checkbox' : undefined}
                          aria-checked={chipPicker.mode === 'multi' ? isSelected : undefined}
                          aria-label={chipPicker.mode === 'multi' ? ariaLabel : undefined}
                          onClick={() => {
                            if (chipPicker.mode === 'single') {
                              onSetChipPicker(null)
                              if (chipPicker.isModal) {
                                if (chipPicker.action === 'site_visit') { onSetSiteVisit(p); return }
                                if (chipPicker.action === 'callback') { onCallback(p); return }
                              }
                              onAction({
                                id: crypto.randomUUID(),
                                actionType: 'TEXT_MESSAGE',
                                label: chipPicker.action,
                                icon: '',
                                analyticsId: '',
                                priority: 1,
                                payload: { text: buildPickerMessage(chipPicker.action, [p]) }
                              })

                            } else {
                              onSetChipPicker({
                                ...chipPicker,
                                selected: isSelected
                                  ? chipPicker.selected.filter(s => s !== p.slug)
                                  : chipPicker.selected.length < 3 ? [...chipPicker.selected, p.slug] : chipPicker.selected,
                              })
                            }
                          }}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all border ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-800 dark:text-blue-200'
                              : 'border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {chipPicker.mode === 'multi' && (
                              <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border ${
                                isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'
                              }`}>
                                {isSelected && <span className="text-white text-[10px]">✓</span>}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold text-[13px] truncate">{p.name}</div>
                              <div className="text-[11px] text-gray-400 dark:text-gray-500">{[p.price_range_label || '', p.sector || ''].filter(Boolean).join(' · ')}</div>

                            </div>
                          </div>
                          {chipPicker.mode === 'single' && (
                            <span className="text-gray-300 dark:text-gray-600 text-xs ml-2 flex-shrink-0">→</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {chipPicker.mode === 'multi' && chipPicker.selected.length >= 2 && (
                    <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-700">
                      <button
                        onClick={() => {
                          const selected = lastShortlist.filter(p => chipPicker.selected.includes(p.slug))
                          onSetChipPicker(null)
                          onAction({
                            id: crypto.randomUUID(),
                            actionType: 'TEXT_MESSAGE',
                            label: 'Compare',
                            icon: '',
                            analyticsId: '',
                            priority: 1,
                            payload: { text: buildPickerMessage(chipPicker.action, selected) }
                          })

                        }}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold rounded-xl transition-all"
                      >
                        Compare {chipPicker.selected.length} properties →
                      </button>
                    </m.div>
                  )}
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </m.div>
      )}



      {/* Persona chips: suggested follow-ups for first recommendation */}
      {message.type === 'ai' && index <= 1 && isLast && (message.properties?.length ?? 0) > 0 && !isSubmitting && (
        <m.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="mt-4 space-y-2"
        >
          <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Want to know more?
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Explain the cost', prompt: 'Break down the total cost of this property including EMI, stamp duty, GST, and registration fees.' },
              { label: 'Builder background', prompt: 'What do you know about this builder? Why should I trust them?' },
              { label: 'What could go wrong?', prompt: 'What are the potential risks or downsides of this property?' },
              { label: 'How does it compare?', prompt: 'How does this property compare to other similar options in the area?' },
            ].map((chip) => (
              <button
                key={chip.label}
                onClick={() => onAction({
                  id: `followup-${chip.label}`,
                  actionType: 'TEXT_MESSAGE',
                  label: chip.label,
                  icon: '💬',
                  analyticsId: `followup_${chip.label.replace(/\s+/g, '_').toLowerCase()}`,
                  priority: 1,
                  payload: { text: chip.prompt }
                })}
                className="text-left px-3 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[13px] font-medium rounded-lg transition-colors border border-blue-200 dark:border-blue-700"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </m.div>
      )}

      {/* Comparison table */}
      {message.type === 'ai' && message.showComparisonTable && (message.comparisonProjects?.length ?? 0) >= 2 && (
        <div className="mt-3 w-full">
          <ComparisonTable projects={message.comparisonProjects!} />
        </div>
      )}

      {/* Context Menu (Right Click / Long Press) */}
      <AnimatePresence mode="wait">
        {contextMenu && (
          <m.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed z-50 bg-white dark:bg-gray-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 dark:border-gray-700 rounded-xl py-1.5 w-48 overflow-hidden"
            style={{ 
              top: Math.min(contextMenu.y, typeof window !== 'undefined' ? window.innerHeight - 100 : contextMenu.y), 
              left: Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 200 : contextMenu.x)
            }}
          >
            <button
              onClick={() => { onCopy(message.content); setContextMenu(null); onToast('Copied to clipboard'); }}
              className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors"
            >
              <Copy size={14} className="text-gray-400" /> Copy Response
            </button>
            {chatPhase === 'ADVISOR' && index > 0 && !message.properties?.length && (
              <button
                onClick={() => { onRegenerate(index); setContextMenu(null); }}
                disabled={regeneratingIdx === index || isSubmitting}
                className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition-colors disabled:opacity-50"
              >
                <RotateCcw size={14} className={`text-gray-400 ${regeneratingIdx === index ? 'animate-spin' : ''}`} /> 
                {regeneratingIdx === index ? 'Regenerating...' : 'Regenerate'}
              </button>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </m.div>

  )
}

export const MessageBubble = memo(MessageBubbleInner, areEqual)
export default MessageBubble
