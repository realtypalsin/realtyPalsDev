'use client'
import { useState } from 'react'
import Image from 'next/image'
import {
  Star, Building2, MapPin, Sparkles, ChevronRight, TrainFront, Plane,
  GraduationCap, HeartPulse, ShoppingBag, Landmark, BookOpen, Route, Milestone,
  Dumbbell, Leaf, Baby, Shield, Car, ZoomIn, UserCircle, FileText,
  Download, ThumbsUp, ThumbsDown, CheckCircle2,
} from 'lucide-react'
import { CheckFat, Warning } from '@phosphor-icons/react'
import type { ProjectCard as ProjectCardType, ProjectDetail } from '@/types/project'
import type { AqiResult } from '@/lib/waqi'
import AmenityIcon from '@/components/AmenityIcon'
import { track } from '@/lib/analytics'
import type { ProjectDocumentPublic } from '@/components/ProjectDetailPanel'
import { Card, CardRow } from './Card'

// ΓöÇΓöÇ Static maps (moved out of ProjectDetailPanel ΓÇö used only here) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const AMENITY_ICONS: Record<string, any> = {
  sports: Dumbbell, lifestyle: Star, wellness: Leaf, kids: Baby, security: Shield, parking: Car,
}
const CONN_ICONS: Record<string, any> = {
  metro: TrainFront, airport: Plane, road: Route, expressway: Milestone, school: GraduationCap,
  hospital: HeartPulse, mall: ShoppingBag, landmark: Landmark, university: BookOpen,
}
const DOC_TYPE_LABELS: Record<string, string> = {
  brochure: 'Brochure', floor_plan: 'Floor Plan', payment_plan: 'Payment Plan',
  legal_document: 'Legal Document', other: 'Document',
}
function formatFileSize(bytes: number | null): string | null {
  if (!bytes) return null
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
const DNA_LABELS: { key: keyof NonNullable<ProjectDetail['dna']>; label: string }[] = [
  { key: 'builder_track_record_label', label: 'Builder' },
  { key: 'price_position_label', label: 'Price' },
  { key: 'locality_label', label: 'Location' },
  { key: 'rera_compliance_label', label: 'RERA' },
  { key: 'amenity_depth_label', label: 'Amenities' },
  { key: 'possession_certainty_label', label: 'Possession' },
]
const DNA_COLOR: Record<string, string> = {
  Strong: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Good: 'bg-blue-50 text-blue-700 border-blue-200',
  Average: 'bg-amber-50 text-amber-700 border-amber-200',
  Weak: 'bg-red-50 text-red-600 border-red-200',
  Unknown: 'bg-gray-50 text-gray-500 border-gray-200',
}
function dnaColor(label: string | null | undefined): string {
  if (!label) return DNA_COLOR.Unknown
  const l = label.toLowerCase()
  if (l.includes('strong') || l.includes('excellent') || l.includes('high')) return DNA_COLOR.Strong
  if (l.includes('good') || l.includes('solid') || l.includes('above')) return DNA_COLOR.Good
  if (l.includes('average') || l.includes('moderate') || l.includes('medium')) return DNA_COLOR.Average
  if (l.includes('weak') || l.includes('poor') || l.includes('low') || l.includes('concern')) return DNA_COLOR.Weak
  return DNA_COLOR.Good
}
const SCORE_LABEL_MAP: Record<string, string> = {
  'Builder Confidence': 'Developer Track Record',
  Value: 'Value Proposition',
  Location: 'Location & Connectivity',
  'Rental Potential': 'Rental Yield Potential',
  'Future Growth': 'Capital Appreciation',
  Risk: 'Risk Assessment',
  Lifestyle: 'Lifestyle & Amenities',
  Liquidity: 'Exit Liquidity',
}
const tierLabel: Record<string, string> = { STRONG_BUY: 'Strong Buy', BUY: 'Buy', HOLD: 'Hold', WATCH: 'Watch', AVOID: 'Avoid' }
const tierStyle: Record<string, string> = {
  STRONG_BUY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  BUY: 'bg-blue-50 text-blue-700 border-blue-200',
  HOLD: 'bg-amber-50 text-amber-700 border-amber-200',
  WATCH: 'bg-orange-50 text-orange-700 border-orange-200',
  AVOID: 'bg-red-50 text-red-700 border-red-200',
}

type FloorPlanImage = { id: string; url: string; caption?: string | null; bhk?: number | null; size_sqft?: number | null }

export interface OverviewTabProps {
  project: ProjectCardType | null
  detail: ProjectDetail | null
  d: (ProjectCardType | ProjectDetail) | null
  loading: boolean
  documents: ProjectDocumentPublic[]
  aqi: AqiResult | null
  floorPlanImages: FloorPlanImage[]
  decisionThesis: string | null
  whyBuy: string[]
  whyAvoid: string[]
  onViewFloorPlans: (plans: FloorPlanImage[]) => void
  onGoToLocation: () => void
  onGoToDocuments: () => void
  onGoToPricing: () => void
}

// ΓöÇΓöÇ Section 1: Match signals + AI Verdict ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function MatchSignalsCard({ matchReasons, concerns }: { matchReasons: string[]; concerns: string[] }) {
  if (matchReasons.length === 0 && concerns.length === 0) return null
  return (
    <Card title="Match Signals" className="h-full">
      <div className="space-y-5">
        {matchReasons.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Why It Matches</p>
            <div className="flex flex-wrap gap-1.5">
              {matchReasons.map((r) => (
                <span key={r} className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                  <CheckFat size={9} weight="fill" />{r}
                </span>
              ))}
            </div>
          </div>
        )}
        {concerns.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Match Concerns</p>
            <div className="flex flex-wrap gap-1.5">
              {concerns.map((c) => (
                <span key={c} className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                  <Warning size={9} weight="fill" />{c}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

function AiVerdictCard({ decisionThesis, whyBuy, whyAvoid }: { decisionThesis: string | null; whyBuy: string[]; whyAvoid: string[] }) {
  if (!decisionThesis && whyBuy.length === 0 && whyAvoid.length === 0) return null
  return (
    <Card title="AI Verdict" className="h-full">
      <div className="space-y-4">
        {decisionThesis && <p className="text-[13.5px] text-gray-700 leading-relaxed">{decisionThesis}</p>}
        {(whyBuy.length > 0 || whyAvoid.length > 0) && (
          <div className={`grid ${whyBuy.length > 0 && whyAvoid.length > 0 ? 'grid-cols-2' : 'grid-cols-1'} gap-4 pt-3 border-t border-gray-100`}>
            {whyBuy.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1"><ThumbsUp size={10} /> Why Buy</p>
                <ul className="space-y-1.5">
                  {whyBuy.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[12px] text-gray-700">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-emerald-400 flex-shrink-0" />{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {whyAvoid.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1"><ThumbsDown size={10} /> Reasons to Pause</p>
                <ul className="space-y-1.5">
                  {whyAvoid.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[12px] text-gray-700">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

// ΓöÇΓöÇ Section 2: Recommendation Score + DNA + About ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function RecommendationScoreCard({ score }: { score: NonNullable<ProjectDetail['recommendation_score']> }) {
  const tierCls = tierStyle[score.tier] ?? tierStyle.HOLD
  const tierLbl = tierLabel[score.tier] ?? score.tier
  return (
    <Card title="Recommendation Score" className="h-full">
      <div className="flex items-baseline gap-2 mb-6">
        <span className="text-[48px] font-black text-gray-900 leading-none tracking-tight">{score.total}</span>
        <span className="text-[14px] text-gray-400 font-bold">/100</span>
        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${tierCls} ml-2`}>{tierLbl}</span>
      </div>
      <div className="space-y-4">
        {score.dimensions?.map((dim) => {
          const color = dim.raw >= 75 ? 'bg-emerald-500' : dim.raw >= 50 ? 'bg-amber-400' : 'bg-rose-500'
          const filled = Math.round((dim.raw / 100) * 5)
          return (
            <div key={dim.key} className="flex items-center gap-4">
              <span className="text-[12.5px] font-semibold text-gray-600 w-[150px] flex-shrink-0 truncate">{SCORE_LABEL_MAP[dim.label] ?? dim.label}</span>
              <div className="flex-1 flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`h-2 flex-1 rounded-[2px] ${i < filled ? color : 'bg-gray-100'}`} />
                ))}
              </div>
              <span className="text-[12.5px] font-black text-gray-800 w-8 text-right flex-shrink-0">{dim.raw}</span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function ProjectDnaCard({ dna }: { dna: NonNullable<ProjectDetail['dna']> }) {
  const entries = DNA_LABELS.filter(({ key }) => dna[key])
  if (entries.length === 0) return null
  return (
    <Card title="Project DNA">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {entries.map(({ key, label }) => {
          const val = dna[key]
          return (
            <div key={key} className={`rounded-2xl border px-3.5 py-2.5 ${dnaColor(val)}`}>
              <p className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-0.5">{label}</p>
              <p className="text-[12.5px] font-bold leading-tight">{val}</p>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function AboutCard({ text }: { text: string }) {
  return (
    <Card title="About This Project">
      <p className="text-[13.5px] text-gray-600 leading-relaxed">{text}</p>
    </Card>
  )
}

// ΓöÇΓöÇ Section 3: Stats row ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function StatsRow({ stats }: { stats: Array<{ label: string; value: string }> }) {
  const visible = stats.filter((s) => s.value !== 'ΓÇö')
  if (visible.length === 0) return null
  const smCols = visible.length >= 5 ? 'sm:grid-cols-5' : visible.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4'
  return (
    <div className={`rounded-[28px] border border-gray-100 bg-white shadow-[0_2px_20px_rgba(0,0,0,0.04)] grid grid-cols-2 ${smCols} divide-x divide-y sm:divide-y-0 divide-gray-100 overflow-hidden`}>
      {visible.map((s) => (
        <div key={s.label} className="p-6 text-center">
          <p className="text-[26px] font-black text-gray-900 leading-none tracking-tight">{s.value}</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1.5">{s.label}</p>
        </div>
      ))}
    </div>
  )
}

// ΓöÇΓöÇ Section 4: Floor Plans + Buyer Personas ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function FloorPlansCard({ images, loading, onViewAll, onGoToPricing }: { images: FloorPlanImage[]; loading: boolean; onViewAll: (plans: FloorPlanImage[]) => void; onGoToPricing: () => void }) {
  if (loading) {
    return (
      <Card title="Floor Plans" className="h-full">
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => <div key={i} className="rounded-2xl bg-gray-100 animate-pulse h-40" />)}
        </div>
      </Card>
    )
  }
  if (images.length === 0) {
    return (
      <Card title="Floor Plans" className="h-full">
        <div className="flex items-center gap-2 py-3 text-[13px] text-gray-400">
          <FileText size={15} className="text-gray-300" /> No floor plans uploaded yet
        </div>
      </Card>
    )
  }
  return (
    <Card
      title="Floor Plans"
      className="h-full"
      action={images.length > 1 && (
        <button onClick={() => onViewAll(images)} className="text-[12px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
          View All <ChevronRight size={13} />
        </button>
      )}
    >
      <div className="grid grid-cols-2 gap-3.5">
        {images.slice(0, 4).map((img) => {
          // Prefer the structured bhk field; only fall back to parsing the caption
          // text for older uploads that predate the dedicated bhk/size_sqft columns.
          const bhkMatch = img.caption?.match(/(\d+)\s*bhk/i)
          const bhk = img.bhk ?? (bhkMatch ? Number(bhkMatch[1]) : null)
          return (
            <button
              key={img.id}
              onClick={() => onViewAll(images)}
              className="relative rounded-2xl overflow-hidden border border-gray-100 group h-40 text-left"
            >
              <Image src={img.url} alt={img.caption ?? 'Floor plan'} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all">
                <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="absolute bottom-0 inset-x-0 px-3 py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11.5px] text-white font-bold truncate">{img.caption ?? 'Floor Plan'}</p>
                  {img.size_sqft && <p className="text-[10px] text-white/70">{img.size_sqft} sqft</p>}
                </div>
                {bhk && <span className="text-[10px] font-black text-white bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full flex-shrink-0">{bhk}BHK</span>}
              </div>
            </button>
          )
        })}
      </div>
      <button
        onClick={onGoToPricing}
        className="mt-5 w-full flex items-center justify-between bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-2xl px-4 py-3 transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <FileText size={15} className="text-blue-500" />
          <span className="text-[12.5px] font-semibold text-gray-800">See all configurations & pricing</span>
        </span>
        <ChevronRight size={14} className="text-blue-400" />
      </button>
    </Card>
  )
}

function PersonaCard({ label, isPrimary, incomeRange, description }: { label: string; isPrimary: boolean; incomeRange?: string | null; description?: string | null }) {
  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 ${isPrimary ? 'border-indigo-200 bg-indigo-50/60' : 'border-gray-100 bg-white'}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isPrimary ? 'bg-indigo-500 text-white' : 'bg-gray-50 text-gray-400'}`}>
        <UserCircle size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`text-[13px] font-bold truncate ${isPrimary ? 'text-indigo-900' : 'text-gray-800'}`}>{label}</p>
          {isPrimary && <span className="text-[9px] font-black uppercase tracking-wider text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full flex-shrink-0">Primary</span>}
        </div>
        {isPrimary && incomeRange && <p className="text-[11px] text-indigo-500 font-medium mt-0.5">Income: {incomeRange}</p>}
        {description && <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">{description}</p>}
      </div>
    </div>
  )
}

function BuyerPersonasCard({ personaProfile }: { personaProfile: ProjectDetail['persona_profile'] }) {
  const primary = personaProfile?.primary_persona
  const secondary = personaProfile?.secondary_personas ?? []
  const descriptions = personaProfile?.persona_descriptions ?? {}
  const format = (p: string) => p.replace(/_/g, ' ').replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase())

  if (!primary && secondary.length === 0) return null

  return (
    <Card title="Who Typically Buys Here?" className="h-full">
      <div className="space-y-2.5">
        {primary && <PersonaCard label={format(primary)} isPrimary incomeRange={personaProfile?.income_range} description={descriptions[primary]} />}
        {secondary.map((p) => <PersonaCard key={p} label={format(p)} isPrimary={false} description={descriptions[p]} />)}
      </div>
    </Card>
  )
}

// ΓöÇΓöÇ Section 5: Design Team + Connectivity ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function DesignTeamCard({ architect, interiorDesigner }: { architect?: string | null; interiorDesigner?: string | null }) {
  if (!architect && !interiorDesigner) return null
  return (
    <Card title="Design Team" className="h-full">
      <div className="flex flex-wrap gap-2.5">
        {architect && (
          <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-[12px] font-semibold px-3.5 py-2 rounded-full border border-indigo-100">
            <Sparkles size={12} />{architect} <span className="text-indigo-400 font-normal">┬╖ Architect</span>
          </span>
        )}
        {interiorDesigner && (
          <span className="flex items-center gap-1.5 bg-purple-50 text-purple-700 text-[12px] font-semibold px-3.5 py-2 rounded-full border border-purple-100">
            <Star size={12} />{interiorDesigner} <span className="text-purple-400 font-normal">┬╖ Interior</span>
          </span>
        )}
      </div>
    </Card>
  )
}

function ConnectivityCard({ connections, onGoToLocation }: { connections: Array<{ type: string; name: string; distance_km?: number | null }>; onGoToLocation: () => void }) {
  return (
    <Card title="Connectivity" className="h-full">
      {connections.length > 0 ? (
        <div className="space-y-0.5">
          {connections.map((c) => {
            const Icon = CONN_ICONS[c.type] ?? Route
            return (
              <div key={c.name} className="flex items-center gap-3 text-[13px] text-gray-700 py-2.5 border-b border-gray-50 last:border-0">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Icon size={15} className="text-blue-500" />
                </div>
                <span className="flex-1 truncate">{c.name}</span>
                {c.distance_km != null && <span className="text-gray-400 text-[12px] font-semibold tabular-nums">{c.distance_km} km</span>}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="flex items-center gap-2 py-2 text-[13px] text-gray-400">
          <Route size={15} className="text-gray-300" /> No connectivity data available
        </p>
      )}
      <button
        onClick={onGoToLocation}
        className="mt-5 w-full flex items-center justify-between bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-2xl px-4 py-3 transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <Route size={15} className="text-blue-500" />
          <span className="text-[12.5px] font-semibold text-gray-800">Calculate your commute</span>
        </span>
        <ChevronRight size={14} className="text-blue-400" />
      </button>
    </Card>
  )
}

// ΓöÇΓöÇ Section 6: Highlights + Amenities + Air Quality ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function HighlightsCard({ claims }: { claims: string[] }) {
  const [expanded, setExpanded] = useState(false)
  if (claims.length === 0) return null
  
  const displayClaims = expanded ? claims : claims.slice(0, 4)
  const hasMore = claims.length > 4

  return (
    <Card title="Key Highlights" className="h-full">
      <div className="flex flex-wrap gap-1.5">
        {displayClaims.map((c) => (
          <span key={c} className="flex items-center gap-1 text-[11.5px] text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full font-medium">
            <ChevronRight size={10} />{c}
          </span>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 text-[12px] font-semibold text-blue-600 hover:text-blue-700"
        >
          {expanded ? 'Show Less' : `+ ${claims.length - 4} More Highlights`}
        </button>
      )}
    </Card>
  )
}

function AmenitiesCard({ amenities }: { amenities: { name: string; category: string }[] }) {
  const [expanded, setExpanded] = useState(false)
  if (amenities.length === 0) return null
  
  const grouped = amenities.reduce((acc, a) => { (acc[a.category] = acc[a.category] ?? []).push(a.name); return acc }, {} as Record<string, string[]>)
  const categories = Object.keys(grouped)
  const displayCategories = expanded ? categories : categories.slice(0, 2)
  const hasMore = categories.length > 2

  return (
    <Card title="Amenities" className="h-full">
      <div className="space-y-4">
        {displayCategories.map((cat) => {
          const names = grouped[cat]
          const Icon = AMENITY_ICONS[cat] ?? Building2
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={13} className="text-gray-400" />
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{cat}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {names.map((name) => <AmenityIcon key={name} amenity={name} size="sm" showLabel />)}
              </div>
            </div>
          )
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 text-[12px] font-semibold text-blue-600 hover:text-blue-700"
        >
          {expanded ? 'Show Less' : `+ ${categories.length - 2} More Categories`}
        </button>
      )}
    </Card>
  )
}

function AirQualityCard({ aqi }: { aqi: AqiResult | null }) {
  if (!aqi) return null
  return (
    <Card title="Air Quality Index" className="h-full">
      <div className="flex items-center gap-4">
        <p className={`text-[40px] font-black leading-none ${aqi.color}`}>{aqi.aqi}</p>
        <div>
          <p className={`text-[14px] font-bold ${aqi.color}`}>{aqi.label}</p>
          {aqi.dominantPollutant && <p className="text-[11px] text-gray-400 mt-0.5">Main: {aqi.dominantPollutant.toUpperCase()}</p>}
          <p className="text-[10px] text-gray-400 mt-1">{aqi.station}</p>
        </div>
      </div>
      <p className="text-[9.5px] text-gray-400 mt-4 pt-3 border-t border-gray-50">0ΓÇô50 Good ┬╖ 51ΓÇô100 Moderate ┬╖ 101ΓÇô150 Sensitive ┬╖ 151+ Unhealthy</p>
    </Card>
  )
}

// ΓöÇΓöÇ Section 7: Downloads + Alternatives ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function DownloadsCard({ documents, loading, projectSlug, onGoToDocuments }: { documents: ProjectDocumentPublic[]; loading: boolean; projectSlug?: string; onGoToDocuments: () => void }) {
  if (loading) return null
  if (documents.length === 0) {
    return (
      <Card title="Downloads & Brochures" className="h-full">
        <p className="flex items-center gap-2 py-2 text-[13px] text-gray-400">
          <FileText size={15} className="text-gray-300" /> No brochures available
        </p>
      </Card>
    )
  }
  return (
    <Card title="Downloads & Brochures" className="h-full">
      <div className="space-y-2">
        {documents.map((doc) => (
          <a
            key={doc.id}
            href={doc.storage_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('document_download', { project_slug: projectSlug, doc_type: doc.doc_type })}
            className="flex items-center gap-3 p-3.5 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.05)] transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
              <FileText size={15} className="text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-800 truncate">{doc.name ?? DOC_TYPE_LABELS[doc.doc_type] ?? 'Document'}</p>
              <p className="text-[10.5px] text-gray-400">
                {DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
                {formatFileSize(doc.file_size_bytes) && ` ┬╖ ${formatFileSize(doc.file_size_bytes)}`}
              </p>
            </div>
            <Download size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
          </a>
        ))}
      </div>
      <button
        onClick={onGoToDocuments}
        className="mt-5 w-full flex items-center justify-between bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-2xl px-4 py-3 transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <FileText size={15} className="text-blue-500" />
          <span className="text-[12.5px] font-semibold text-gray-800">Browse the full document center</span>
        </span>
        <ChevronRight size={14} className="text-blue-400" />
      </button>
    </Card>
  )
}

function AlternativesCard({ competitors }: { competitors: NonNullable<ProjectDetail['competitors']> }) {
  if (competitors.length === 0) return null
  return (
    <Card title="Compare Alternatives" className="h-full">
      <div className="space-y-4">
        {competitors.map((c) => (
          <div key={c.id} className="group relative rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300">
            {/* Header with Small Thumbnail */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200/60 flex items-center justify-center flex-shrink-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]">
                <Building2 size={20} className="text-gray-400" />
              </div>
              
              <div className="flex-1 min-w-0 pt-0.5">
                <h4 className="text-[15.5px] font-semibold text-gray-900 truncate tracking-tight">{c.competitor_name}</h4>
                <div className="flex items-center gap-1.5 text-gray-500 mt-1">
                  <MapPin size={12} className="text-gray-400" />
                  <span className="text-[12px] font-medium">Alternative Property</span>
                </div>
              </div>
            </div>

            {/* Key Takeaway */}
            {c.verdict && (
              <div className="rounded-xl bg-gray-50/70 border border-gray-100 p-3.5 mb-5">
                <p className="text-[9.5px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Key Takeaway</p>
                <p className="text-[13px] text-gray-700 leading-relaxed">{c.verdict}</p>
              </div>
            )}

            {/* Checklist */}
            <div className="space-y-3 mb-5">
              {c.this_project_advantage && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={11} className="text-emerald-600 stroke-[3]" />
                  </div>
                  <span className="text-[12.5px] text-gray-600 leading-snug">{c.this_project_advantage}</span>
                </div>
              )}
              {c.competitor_advantage && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Warning size={11} className="text-amber-600" />
                  </div>
                  <span className="text-[12.5px] text-gray-600 leading-snug">{c.competitor_advantage}</span>
                </div>
              )}
              {c.price_delta_note && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <Warning size={11} className="text-orange-600" />
                  </div>
                  <span className="text-[12.5px] text-gray-600 leading-snug">{c.price_delta_note}</span>
                </div>
              )}
            </div>

            {/* Footer Action */}
            {c.competitor_slug && (
              <div className="flex justify-end pt-4 border-t border-gray-100/60">
                <a
                  href={`/property/${c.competitor_slug}`}
                  className="flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-700 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 px-4 py-2 rounded-lg transition-all shadow-sm"
                >
                  View Details <ChevronRight size={14} className="text-gray-400" />
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

// ΓöÇΓöÇ Main orchestrator ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export default function OverviewTab({
  project, detail, d, loading, documents, aqi, floorPlanImages,
  decisionThesis, whyBuy, whyAvoid, onViewFloorPlans, onGoToLocation, onGoToDocuments, onGoToPricing,
}: OverviewTabProps) {
  const matchReasons = project?.matchReasons ?? []
  const concerns = project?.concerns ?? []

  // Hero already shows the tagline ΓÇö only render this card when there's real
  // additional detail, so it doesn't just repeat what the buyer already read.
  const aboutText = detail?.long_description ?? null

  const stats = [
    { label: 'Towers', value: d?.total_towers ? `${d.total_towers}` : 'ΓÇö' },
    { label: 'Units', value: (detail?.total_units ?? (d as any)?.total_units) ? `${detail?.total_units ?? (d as any)?.total_units}` : 'ΓÇö' },
    { label: 'Land Area', value: d?.land_area_acres ? `${d.land_area_acres} Ac` : 'ΓÇö' },
    { label: 'Launch', value: d?.launch_date ? new Date(d.launch_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'ΓÇö' },
    { label: 'Possession', value: d?.possession_label ?? 'ΓÇö' },
  ]

  const connections = detail?.all_connectivity ?? d?.top_connectivity ?? []
  const marketingClaims = detail?.marketing_claims ?? (d as any)?.marketing_claims ?? []
  const amenities = (detail?.all_amenities ?? (detail as any)?.amenities ?? d?.top_amenities ?? []) as { name: string; category: string }[]
  const competitors = detail?.competitors ?? []

  return (
    <div className="p-5 md:p-8 space-y-6">
      {/* 1. Full width top elements */}
      {(detail?.recommendation_score || detail?.dna || aboutText) && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
          <div className="flex flex-col gap-6">
            {aboutText && <AboutCard text={aboutText} />}
            {detail?.dna && <ProjectDnaCard dna={detail.dna} />}
          </div>
          <div className="h-full">
            {detail?.recommendation_score ? <RecommendationScoreCard score={detail.recommendation_score} /> : null}
          </div>
        </div>
      )}

      <StatsRow stats={stats} />

      {/* 2. Masonry / Two columns for the rest */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          {(decisionThesis || whyBuy.length > 0 || whyAvoid.length > 0) && (
            <AiVerdictCard decisionThesis={decisionThesis} whyBuy={whyBuy} whyAvoid={whyAvoid} />
          )}
          <FloorPlansCard images={floorPlanImages} loading={loading && !detail} onViewAll={onViewFloorPlans} onGoToPricing={onGoToPricing} />
          {(!!d?.architect || !!d?.interior_designer) && (
            <DesignTeamCard architect={d?.architect} interiorDesigner={d?.interior_designer} />
          )}
          {marketingClaims.length > 0 && <HighlightsCard claims={marketingClaims} />}
          {documents.length > 0 && <DownloadsCard documents={documents} loading={loading} projectSlug={(d as any)?.slug} onGoToDocuments={onGoToDocuments} />}
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {(matchReasons.length > 0 || concerns.length > 0) && (
            <MatchSignalsCard matchReasons={matchReasons} concerns={concerns} />
          )}
          <BuyerPersonasCard personaProfile={detail?.persona_profile ?? null} />
          {connections.length > 0 && (
            <ConnectivityCard connections={connections} onGoToLocation={onGoToLocation} />
          )}
          {amenities.length > 0 && <AmenitiesCard amenities={amenities} />}
          {aqi && <AirQualityCard aqi={aqi} />}
          {competitors.length > 0 && <AlternativesCard competitors={competitors} />}
        </div>
      </div>
    </div>
  )
}
