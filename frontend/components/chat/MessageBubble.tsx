'use client'

import { memo, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { User, RotateCcw, Copy, ChevronDown, MapPin, ThumbsUp, ThumbsDown } from 'lucide-react'
import remarkGfm from 'remark-gfm'
import { track, trackPropertyEvent } from '@/lib/analytics'
import { parseResponseBlocks } from '@/lib/responseParser'
import { ResponseBlockRenderer } from '@/components/response/ResponseBlockRenderer'
import ChatLoader from '@/components/ChatLoader'
import ProjectCard from '@/components/ProjectCard'
import PropertyCardWithRecommendation from '@/components/chat/PropertyCardWithRecommendation'
import PropertyQuickActions from '@/components/chat/PropertyQuickActions'
import { SuggestionChip } from '@/components/chat/SuggestionChip'
import type { ChatMessage } from '@/types/property'
import type { ProjectCard as ProjectCardType } from '@/types/project'
import type { ChipPickerState } from './types'
import rehypeRaw from 'rehype-raw'
import RealtyChart from '@/components/RealtyChart'
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

import ReactMarkdown from 'react-markdown'

// ── Dynamic imports — excluded from initial JS bundle ──────────────────────

const SectorMap = dynamic(() => import('@/components/SectorMap'), { ssr: false })
const ComparisonTable = dynamic(() => import('@/components/ComparisonTable'), { ssr: false })

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
  // Callbacks — all stable (useCallback in parent)
  onCopy: (text: string) => void
  onDetailOpen: (project: ProjectCardType | null) => void
  onCallback: (project: ProjectCardType) => void
  onRegenerate: (index: number) => void
  onAction: (action: import('./types').ChipAction) => void
  onToggleExpanded: (messageId: string) => void
  onToggleMap: () => void
  onSetChipPicker: (picker: ChipPickerState | null) => void
  onSetCarouselIndex: (msgIndex: number, imgIndex: number) => void
  onSetSiteVisit: (project: ProjectCardType) => void
  onOpenCalculator: () => void
  onOpenShareSheet: () => void
  onToast: (msg: string) => void
}

// ── Message builders ───────────────────────────────────────────────────────
function buildPickerMessage(action: string, selected: ProjectCardType[]): string {
  const names = selected.map(p => p.name)
  switch (action) {
    case 'emi':
      return `What would be the monthly EMI for ${names[0]}? Show a breakdown at 8.5% for 20 years.`
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

  const sorted = [...chips].sort((a, b) => a.priority - b.priority)

  return (
    <div className="flex flex-wrap gap-2">
      {sorted.map((chip) => (
        <SuggestionChip key={chip.id} chip={chip} chipPicker={chipPicker} onSetChipPicker={onSetChipPicker} onAction={onAction} disabled={isDisabled} />
      ))}
    </div>
  )
}

// ── Custom equality — only the actively-streaming (last) message re-renders ─
function areEqual(prev: MessageBubbleProps, next: MessageBubbleProps): boolean {
  if (prev.isLast || next.isLast) return false
  return (
    prev.message.content === next.message.content &&
    prev.message.properties === next.message.properties &&
    prev.message.exactResults === next.message.exactResults &&
    prev.message.nearbyResults === next.message.nearbyResults &&
    prev.message.isSearching === next.message.isSearching &&
    prev.isExpanded === next.isExpanded &&
    prev.carouselIndex === next.carouselIndex &&
    prev.chips === next.chips
  )
}

// ── Component ──────────────────────────────────────────────────────────────
function MessageBubbleInner({
  message, index, isLast, isSubmitting, chatPhase, isLastProperties,
  isExpanded, carouselIndex, lastShortlist, showMap, userId, sessionId, regeneratingIdx,
  chipPicker, chips,
  onCopy, onDetailOpen, onCallback, onRegenerate, onAction,
  onToggleExpanded, onToggleMap, onSetChipPicker, onSetCarouselIndex,
  onSetSiteVisit, onOpenCalculator, onOpenShareSheet, onToast,
}: MessageBubbleProps) {
  const isUser = message.type === 'user'
  const [showAllProperties, setShowAllProperties] = useState(false)

  const displayContent = message.content || ''
  const combinedChips = [...chips]

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
  const touchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

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
    if (touchTimeout.current) clearTimeout(touchTimeout.current);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: isUser ? 20 : -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
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
            ? 'max-w-[85%] sm:max-w-[78%] bg-blue-600 dark:bg-blue-500 text-white shadow-[0_2px_8px_rgba(37,99,235,0.15)] rounded-[24px] rounded-br-[4px]'
            : 'max-w-[95%] sm:max-w-[85%] bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 text-gray-900 dark:text-gray-100 relative overflow-hidden rounded-[24px] rounded-tl-[4px] cursor-pointer sm:cursor-default shadow-[0_2px_12px_rgba(0,0,0,0.03)]'
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
                  const intentLabel = formatStreamingIntent(intent)
                  const isSearching = phase === 'searching'
                  return (
                    <div className="py-2 space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className="relative w-5 h-5 flex-shrink-0">
                          <div className="absolute inset-0 rounded-full border-2 border-blue-100 dark:border-blue-900 border-t-blue-500 dark:border-t-blue-400 animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                          </div>
                        </div>
                        <span className="text-[13px] font-medium text-blue-600 dark:text-blue-400">
                          Understanding your request…
                        </span>
                      </div>
                      
                      {isSearching && intentLabel && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-3.5 py-2.5 border border-blue-100 dark:border-blue-800/60">
                          <p className="text-[13px] text-blue-700 dark:text-blue-300 font-medium leading-snug">
                            {intentLabel}
                          </p>
                        </div>
                      )}
                      
                      {isSearching && (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {[0, 1, 2].map(i => (
                            <div key={i} className="rounded-[24px] overflow-hidden bg-white dark:bg-gray-800 border border-gray-100/80 dark:border-gray-700/60 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
                              <div className="h-[220px] bg-gray-100 dark:bg-gray-700 animate-pulse" />
                              <div className="p-5 space-y-3">
                                <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full w-3/4 animate-pulse" />
                                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full w-1/2 animate-pulse" />
                                <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-full w-1/3 animate-pulse" />
                                <div className="flex gap-2 mt-1">
                                  <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded-full w-16 animate-pulse" />
                                  <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded-full w-20 animate-pulse" />
                                </div>
                                <div className="h-9 bg-gray-100 dark:bg-gray-700 rounded-xl w-full animate-pulse mt-1" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }

                // Stage B: properties arrived, AI text not started yet
                if (hasProperties && !message.content && phase === 'generating') {
                  return (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-2.5 py-1"
                    >
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-[12px] text-blue-600 dark:text-blue-400 font-medium">
                        Analyzing {resultCount != null && resultCount > 0 ? `${resultCount} ${resultCount === 1 ? 'property' : 'properties'}` : 'results'}…
                      </span>
                    </motion.div>
                  )
                }

                // Stage C: AI text streaming or complete
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
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.25 }}
                        className={blocks ? undefined : "prose prose-sm md:prose-base dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-blue-700 dark:prose-headings:text-blue-400 prose-a:text-blue-500 prose-strong:bg-blue-50 dark:prose-strong:bg-blue-900/30 prose-strong:px-1.5 prose-strong:py-0.5 prose-strong:rounded-md prose-strong:text-blue-700 dark:prose-strong:text-blue-300 prose-strong:font-semibold prose-strong:border prose-strong:border-blue-100 dark:prose-strong:border-blue-800/50 prose-table:w-full prose-table:text-sm prose-table:my-4 prose-table:border-collapse prose-table:rounded-xl prose-table:overflow-hidden prose-table:border prose-table:border-gray-200 dark:prose-table:border-gray-700 prose-th:bg-gray-100 dark:prose-th:bg-blue-900/40 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-gray-800 dark:prose-th:text-blue-200 prose-th:border prose-th:border-gray-200 dark:prose-th:border-gray-700 prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-gray-200 dark:prose-td:border-gray-700"}
                      >
                        {blocks ? (
                          <ResponseBlockRenderer blocks={blocks} />
                        ) : (
                          <>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeRaw]}
                              components={{
                                'realty-chart': ({ node, ...props }: any) => <RealtyChart type={props.type} data={props.data} title={props.title} />,
                                'realty-box': ({ node, ...props }: any) => <RealtyBox type={props.type} title={props.title}>{props.children}</RealtyBox>,
                                table: ({ node, ...props }: any) => (
                                  <div className="overflow-x-auto">
                                    <table {...props} />
                                  </div>
                                )
                              } as any}
                            >
                              {displayContent}
                            </ReactMarkdown>
                            {streaming && (
                              <span className="inline-block w-0.5 h-[1em] bg-current animate-pulse ml-0.5 align-middle opacity-70" />
                            )}
                          </>
                        )}
                      </motion.div>
                    </>
                  )
                }

                return null
              })()}
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
                <Image
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

        // Pagination (limit to 6 cards max)
        const MAX_CARDS = 6
        const totalCards = useNewFormat ? rawExactList.length + rawNearbyList.length : rawLegacyList.length
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

        const isOpen = isLastProperties ? !isExpanded : isExpanded

        // Determine the card list to render for map + legacy path
        const primaryCards = useNewFormat ? (hasExact ? exactList : nearbyList) : legacyList

        const headerLabel = useNewFormat && !hasExact && hasNearby
          ? `${nearbyList.length} nearby ${nearbyList.length === 1 ? 'alternative' : 'alternatives'}`
          : `${primaryCards.length} ${primaryCards.length === 1 ? 'property' : 'properties'} found`

        const headerSector = useNewFormat && !hasExact && hasNearby
          ? expansion?.searchedSectors.join(', ')
          : primaryCards[0]?.sector

        return (
          <div className="mt-2 w-full">
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 p-2.5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
            >
              <div className="flex items-center gap-2">
                <span className="text-[15px]">{useNewFormat && !hasExact && hasNearby ? '📍' : (isLast && isSubmitting ? '🔍' : '✓')}</span>
                <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                  {headerLabel}
                </span>
                {headerSector && (
                  <span className="text-[12px] text-gray-500 hidden sm:inline tracking-tight">in {headerSector}</span>
                )}
                <span className="hidden sm:inline text-[9.5px] font-bold text-gray-500 bg-gray-100 dark:bg-[#222] px-2 py-0.5 rounded-full ml-1 uppercase tracking-widest ring-1 ring-inset ring-black/5 dark:ring-white/10">
                  Ranked by fit
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('realtypals:open-map'))}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#111] ring-1 ring-inset ring-black/10 dark:ring-white/10 hover:bg-gray-50 dark:hover:bg-[#222] rounded-[8px] text-[11px] font-semibold text-gray-700 dark:text-gray-300 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:scale-95"
                >
                  <MapPin size={12} className="text-gray-500" />
                  <span className="hidden sm:inline">Map</span>
                </button>
                <button
                  onClick={() => onToggleExpanded(message.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#111] ring-1 ring-inset ring-black/10 dark:ring-white/10 hover:bg-gray-50 dark:hover:bg-[#222] rounded-[8px] text-[11px] font-semibold text-gray-700 dark:text-gray-300 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:scale-95"
                >
                  {isOpen ? 'Hide' : 'View'}
                  <ChevronDown size={12} className={`text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </motion.div>

            {/* Empty sector banner — shown when requested sector has no exact matches */}
            {useNewFormat && !hasExact && hasNearby && expansion && (
              <motion.div
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
                    Verified N/a
                  </p>
                </div>
              </motion.div>
            )}

            {isOpen && (
              <div className="mt-3 w-full">
                {/* Property Results Grid */}
                {(useNewFormat ? exactList : legacyList).length > 0 && (
                  <div className="mt-3">
                    <div className="flex flex-col sm:grid sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
                      {(useNewFormat ? exactList : legacyList).map((property, pi) => (
                        <motion.div
                          key={property.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: pi * 0.07, ease: 'easeOut' }}
                          className="w-full h-full flex flex-col"
                        >
                          <ProjectCard
                            project={property}
                            userId={userId}
                            index={pi}
                            onDetailOpen={onDetailOpen}
                            onToast={onToast}
                            onAskAI={(p) => {
                              window.dispatchEvent(
                                new CustomEvent('realtypals:ask-ai', {
                                  detail: { text: `Tell me more about ${p.name}` },
                                }),
                              )
                            }}
                            onSetSiteVisit={onSetSiteVisit}
                          />
                        </motion.div>
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
                        <motion.div
                          key={property.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: pi * 0.07, ease: 'easeOut' }}
                          className="w-full h-full flex flex-col"
                        >
                          <ProjectCard 
                            project={property} 
                            userId={userId} 
                            index={pi} 
                            onDetailOpen={onDetailOpen} 
                            onToast={onToast}
                            onAskAI={(p) => {
                              window.dispatchEvent(
                                new CustomEvent('realtypals:ask-ai', {
                                  detail: { text: `Tell me more about ${p.name}` },
                                }),
                              )
                            }}
                            onSetSiteVisit={onSetSiteVisit}
                          />
                        </motion.div>
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
                      className="px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[13px] font-semibold text-blue-600 dark:text-blue-400 rounded-full shadow-sm hover:shadow-md hover:bg-blue-50 dark:hover:bg-gray-700 transition-all active:scale-95"
                    >
                      {showAllProperties ? 'Show less properties' : `View all ${totalCards} properties`}
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
      {message.type === 'ai' && displayContent && isLast && !isSubmitting && combinedChips.length > 0 && (
        <motion.div
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
              <motion.div
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
                      return (
                        <button
                          key={p.slug}
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-700">
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
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
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
          <motion.div
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export const MessageBubble = memo(MessageBubbleInner, areEqual)
export default MessageBubble
