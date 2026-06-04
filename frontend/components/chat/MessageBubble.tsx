'use client'

import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { User, RotateCcw, Copy, ChevronDown } from 'lucide-react'
import remarkGfm from 'remark-gfm'
import ChatLoader from '@/components/ChatLoader'
import ProjectCard from '@/components/ProjectCard'
import type { ChatMessage } from '@/types/property'
import type { ProjectCard as ProjectCardType } from '@/types/project'
import type { Chip, ChipPickerState } from './types'

// ── Dynamic imports — excluded from initial JS bundle ──────────────────────
const ReactMarkdown = dynamic(() => import('react-markdown'), {
  ssr: false,
  loading: () => <span className="inline-block w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />,
})

const SectorMap = dynamic(() => import('@/components/SectorMap'), { ssr: false })
const ComparisonTable = dynamic(() => import('@/components/ComparisonTable'), { ssr: false })
const PropertyDetailView = dynamic(() => import('@/components/PropertyDetailView'), { ssr: false })

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
  regeneratingIdx: number | null
  chipPicker: ChipPickerState | null
  followUpChips: Chip[]
  // Callbacks — all stable (useCallback in parent)
  onCopy: (text: string) => void
  onDetailOpen: (project: ProjectCardType | null) => void
  onCallback: (project: ProjectCardType) => void
  onRegenerate: (index: number) => void
  onSubmitMessage: (text: string) => void
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

// ── Custom equality — only the actively-streaming (last) message re-renders ─
function areEqual(prev: MessageBubbleProps, next: MessageBubbleProps): boolean {
  if (prev.isLast || next.isLast) return false
  return (
    prev.message.content === next.message.content &&
    prev.message.properties === next.message.properties &&
    prev.message.isSearching === next.message.isSearching &&
    prev.isExpanded === next.isExpanded &&
    prev.carouselIndex === next.carouselIndex
  )
}

// ── Component ──────────────────────────────────────────────────────────────
function MessageBubbleInner({
  message, index, isLast, isSubmitting, chatPhase, isLastProperties,
  isExpanded, carouselIndex, lastShortlist, showMap, userId, regeneratingIdx,
  chipPicker, followUpChips,
  onCopy, onDetailOpen, onCallback, onRegenerate, onSubmitMessage,
  onToggleExpanded, onToggleMap, onSetChipPicker, onSetCarouselIndex,
  onSetSiteVisit, onOpenCalculator, onOpenShareSheet, onToast,
}: MessageBubbleProps) {
  const isUser = message.type === 'user'

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-message-in group/msg`}>
      <div className={`flex w-full ${isUser ? 'items-end gap-4 flex-row-reverse' : 'items-start gap-4'}`}>
        {/* Avatar */}
        {isUser ? (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-sm">
            <User size={20} className="text-white" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full glass-surface flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden border border-white/50 dark:border-white/10">
            <Image src="/images/logo/realtypals.png" alt="RP" width={36} height={36} />
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`rounded-[20px] px-5 py-3.5 shadow-sm transition-all duration-300 ${isUser
            ? 'max-w-[78%] bg-[#0064E5] text-white shadow-blue-500/10'
            : 'flex-1 min-w-0 glass-surface text-gray-900 dark:text-gray-100 border border-white/40 dark:border-white/5 relative overflow-hidden shadow-lg'
            }`}
        >
          {!isUser && <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-500/5 rounded-full blur-[40px] pointer-events-none" />}

          {!isUser ? (
            <div className="relative z-10">
              {!message.content && !message.properties?.length ? (
                <ChatLoader userQuery={message.userQuery ?? ''} isSearching={!!message.isSearching} />
              ) : message.content ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-blue-700 dark:prose-headings:text-blue-400 prose-a:text-blue-500 prose-strong:text-blue-600 dark:prose-strong:text-blue-400 prose-table:w-full prose-table:text-sm prose-table:my-4 prose-table:border-collapse prose-table:rounded-xl prose-table:overflow-hidden prose-table:border prose-table:border-gray-200 dark:prose-table:border-gray-700 prose-th:bg-gray-100 dark:prose-th:bg-blue-900/40 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-gray-800 dark:prose-th:text-blue-200 prose-th:border prose-th:border-gray-200 dark:prose-th:border-gray-700 prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-gray-200 dark:prose-td:border-gray-700"
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                  {isLast && isSubmitting && message.type === 'ai' && (
                    <span className="inline-block w-0.5 h-[1em] bg-current animate-pulse ml-0.5 align-middle opacity-70" />
                  )}
                </motion.div>
              ) : null}
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-[16px] font-medium leading-relaxed relative z-10">{message.content}</p>
          )}
        </div>
      </div>

      {/* Copy button */}
      {!isUser && message.content && (
        <div className="ml-14 mt-1 flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => onCopy(message.content)}
            title="Copy response"
            className="flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all text-[11px]"
          >
            <Copy size={12} />
          </button>
        </div>
      )}

      {/* Regenerate */}
      {!isUser && chatPhase === 'ADVISOR' && index > 0 && !message.properties?.length && (
        <button
          onClick={() => onRegenerate(index)}
          disabled={regeneratingIdx === index || isSubmitting}
          className="ml-[56px] mt-1 inline-flex items-center gap-1 px-3 py-1.5 text-[11px] text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-full hover:bg-white/50 dark:hover:bg-gray-800 disabled:opacity-40 touch-target-min"
          title="Regenerate response"
        >
          <RotateCcw size={11} className={regeneratingIdx === index ? 'animate-spin' : ''} />
          {regeneratingIdx === index ? 'Regenerating...' : 'Regenerate'}
        </button>
      )}

      {/* Rich Property Detail View */}
      {message.propertyDetail && (
        <PropertyDetailView
          propertyDetail={message.propertyDetail}
          onToast={onToast}
        />
      )}

      {/* In-chat image gallery */}
      {!message.propertyDetail && message.images && message.images.length > 0 && (
        <div className="mt-3 ml-12 w-full max-w-[80%]">
          <div className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-sm">
            {message.images[carouselIndex]?.type && (
              <div className="absolute top-3 left-3 z-10">
                <span className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-[11px] font-medium capitalize">
                  {(message.images[carouselIndex].type || '').replace(/_/g, ' ')}
                </span>
              </div>
            )}
            <Image
              src={message.images[carouselIndex]?.url ?? message.images[0]?.url ?? ''}
              alt={message.images[carouselIndex]?.caption ?? 'Property image'}
              width={680}
              height={400}
              className="w-full h-72 object-cover"
            />
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
      {!message.propertyDetail && message.highlights && message.highlights.length > 0 && (
        <div className="mt-3 ml-12 max-w-[80%] bg-[#F7F7F7] dark:bg-gray-800 border border-[#E8E8E8] dark:border-gray-700 rounded-2xl px-5 py-4 shadow-sm">
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
      {!message.propertyDetail && message.amenities && message.amenities.length > 0 && (
        <div className="mt-4 ml-12 sm:ml-14 w-full max-w-[95%] sm:max-w-[85%] md:max-w-[75%]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {message.amenities.map((amenity, idx) => (
              <div key={idx} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-100 dark:border-blue-900/30 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 flex items-center justify-center text-center shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group">
                <span className="text-[12px] sm:text-[13px] font-semibold text-blue-800 dark:text-blue-300 group-hover:text-blue-600 dark:group-hover:text-blue-200">{amenity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Property cards */}
      {(() => {
        const isGeneralOrComparison =
          message.content.includes('| Property |') ||
          message.content.includes('| ---') ||
          message.intent?.is_general_query === true
        if (!message.properties || message.properties.length === 0 || isGeneralOrComparison) return null

        if (!isLastProperties) {
          return (
            <div className="mt-2">
              <button
                onClick={() => onToggleExpanded(message.id)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-100 rounded-xl text-[12px] font-semibold text-gray-500 hover:text-blue-700 transition-all"
              >
                <span>🏠</span>
                {isExpanded ? 'Hide' : 'View'} {message.properties.length} properties from this search
                <ChevronDown size={13} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
              {isExpanded && (
                <div className="mt-3 flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-x-auto snap-x snap-mandatory sm:overflow-x-visible pb-2 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0">
                  {message.properties.map((property, pi) => (
                    <motion.div
                      key={property.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: pi * 0.07, ease: 'easeOut' }}
                      className="min-w-[85vw] sm:min-w-0 snap-center flex-shrink-0 sm:flex-shrink"
                    >
                      <ProjectCard project={property} userId={userId} index={pi} onDetailOpen={onDetailOpen} onCallback={onCallback} onToast={onToast} />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )
        }

        return (
          <>
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 flex items-center gap-3"
            >
              <div className="flex-1 flex items-center gap-2">
                <span className="text-[15px]">🏘️</span>
                <span className="text-[13px] font-bold text-gray-800 dark:text-gray-200">
                  {message.properties.length} {message.properties.length === 1 ? 'property' : 'properties'} found
                </span>
                {message.properties[0]?.sector && (
                  <span className="text-[11px] text-gray-400">· {message.properties[0].sector}</span>
                )}
              </div>
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-2.5 py-1 rounded-full">
                Ranked by fit
              </span>
            </motion.div>

            <div className="mt-3 flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-x-auto snap-x snap-mandatory sm:overflow-x-visible pb-2 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0 w-full">
              {message.properties.map((property, pi) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: pi * 0.07, ease: 'easeOut' }}
                  className="min-w-[85vw] sm:min-w-0 snap-center flex-shrink-0 sm:flex-shrink"
                >
                  <ProjectCard project={property} userId={userId} index={pi} onDetailOpen={onDetailOpen} onCallback={onCallback} onToast={onToast} />
                </motion.div>
              ))}
            </div>

            {message.properties.length >= 2 && (
              <div className="mt-3 w-full">
                <button
                  onClick={onToggleMap}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-100 rounded-xl text-[12px] font-semibold text-gray-600 hover:text-blue-700 transition-all mb-2"
                >
                  <span>🗺️</span>
                  {showMap ? 'Hide map' : `View on map — ${message.properties.length} properties`}
                </button>
                {showMap && (
                  <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                    <SectorMap properties={message.properties} />
                  </div>
                )}
              </div>
            )}
          </>
        )
      })()}

      {/* Advisor shortlist re-surface */}
      {message.type === 'ai' && chatPhase === 'ADVISOR' && !message.properties?.length && lastShortlist.length > 0 && isLast && (
        <div className="mt-3 ml-14 w-full">
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
                <ProjectCard key={p.id} project={p} userId={userId} index={pi} onDetailOpen={onDetailOpen} onToast={onToast} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Follow-up chips */}
      {message.type === 'ai' && message.content && isLast && !isSubmitting && followUpChips.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="mt-3 ml-0 sm:ml-14"
        >
          <div className="flex flex-wrap gap-2">
            {followUpChips.map((chip) => {
              const isActive = chipPicker?.label === chip.label
              return (
                <button
                  key={chip.label}
                  onClick={() => {
                    if (chip.special === '__open_calculator__') { onOpenCalculator(); onSetChipPicker(null); return }
                    if (chip.special === '__share_shortlist__') { onOpenShareSheet(); onSetChipPicker(null); return }
                    if (chip.msg) { onSetChipPicker(null); onSubmitMessage(chip.msg); return }
                    if (chip.picker && chip.pickerAction) {
                      if (isActive) { onSetChipPicker(null); return }
                      onSetChipPicker({ mode: chip.picker, action: chip.pickerAction, label: chip.label, isModal: chip.pickerModal ?? false, selected: [] })
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-[11px] sm:text-[12px] font-semibold transition-all shadow-sm whitespace-nowrap border ${
                    isActive
                      ? 'bg-blue-600 border-blue-600 text-white shadow-blue-200 dark:shadow-blue-900'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300'
                  }`}
                >
                  <span>{chip.emoji}</span>
                  {chip.label}
                  {chip.picker && <span className={`text-[10px] ml-0.5 ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>▾</span>}
                </button>
              )
            })}
          </div>

          <AnimatePresence>
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
                              onSubmitMessage(buildPickerMessage(chipPicker.action, [p]))
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
                              <div className="text-[11px] text-gray-400 dark:text-gray-500">{p.price_range_label} · {p.sector}</div>
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
                          onSubmitMessage(buildPickerMessage(chipPicker.action, selected))
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
      {message.type === 'ai' && message.showComparisonTable && lastShortlist.length >= 2 && (
        <div className="mt-3 ml-14 w-full">
          <ComparisonTable left={lastShortlist[0]} right={lastShortlist[1]} />
        </div>
      )}
    </div>
  )
}

export const MessageBubble = memo(MessageBubbleInner, areEqual)
export default MessageBubble
