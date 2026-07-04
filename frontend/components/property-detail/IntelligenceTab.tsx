'use client'
import type { RefObject } from 'react'
import {
  Star, Sparkles, Timer, Handshake,
} from 'lucide-react'
import { CheckFat, Warning } from '@phosphor-icons/react'
import type { ProjectCard as ProjectCardType, ProjectDetail, DecisionDimension } from '@/types/project'
import BuilderIntelligence from '@/components/BuilderIntelligence'
import MarketComparison from '@/components/MarketComparison'
import PropertyRadarChart from '@/components/PropertyRadarChart'
import { Card, CardRow } from './Card'

// ── Sector price history — sample market data, kept exactly as it was in the
// old Intelligence tab (moved out of ProjectDetailPanel, used only here). ──
const SECTOR_PRICE_HISTORY: Record<string, {
  avgPriceRange: string
  yoyGrowth: string
  note: string
  outlook: string
}> = {
  'Sector 150': {
    avgPriceRange: '₹8,000 – 17,000/sqft',
    yoyGrowth: '+12–18% YoY',
    note: "Noida Expressway's premium corridor. Metro Phase III proximity, DND access, and branded developer concentration drive above-average appreciation.",
    outlook: 'Continued outperformance expected. Limited land supply.',
  },
  'Sector 137': {
    avgPriceRange: '₹5,500 – 11,000/sqft',
    yoyGrowth: '+8–14% YoY',
    note: 'Established sector with most inventory delivered. Good rental yield driven by IT park proximity (Infosys, TCS campuses nearby).',
    outlook: 'Stable. Most projects ready-to-move — capital preservation market.',
  },
  'Sector 78': {
    avgPriceRange: '₹5,000 – 18,000/sqft',
    yoyGrowth: '+6–12% YoY',
    note: 'Wide price band due to product mix from premium to ultra-luxury. Central Noida location with strong connectivity.',
    outlook: 'Luxury sub-segment outperforming. Entry-level segment stable.',
  },
}

const tierLabel: Record<string, string> = { STRONG_BUY: 'Strong Buy', BUY: 'Buy', HOLD: 'Hold', WATCH: 'Watch', AVOID: 'Avoid' }
const tierStyle: Record<string, string> = {
  STRONG_BUY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  BUY: 'bg-blue-50 text-blue-700 border-blue-200',
  HOLD: 'bg-amber-50 text-amber-700 border-amber-200',
  WATCH: 'bg-orange-50 text-orange-700 border-orange-200',
  AVOID: 'bg-red-50 text-red-700 border-red-200',
}
const confidenceStyle: Record<string, string> = {
  High: 'bg-emerald-50 text-emerald-600',
  Medium: 'bg-amber-50 text-amber-600',
  Low: 'bg-gray-50 text-gray-500',
}

export interface IntelligenceTabProps {
  project: ProjectCardType | null
  detail: ProjectDetail | null
  d: (ProjectCardType | ProjectDetail) | null
  loading: boolean
  timelineAdvice: string | null
  negotiationLeverage: string[]
  walkAwayConditions: string[]
  marketVisible: boolean
  marketRef: RefObject<HTMLDivElement>
}

// ── Section 1: Executive Summary ────────────────────────────────────────────
// This score comes from the current chat's conversational analysis, not the
// verified recommendation score (that one lives in Overview). Kept visually
// smaller and explicitly labeled so it never reads as a second "main" score.
function DecisionScoreCard({ overallScore, tier, confidence, hasVerifiedScore }: { overallScore: number; tier: string; confidence: string; hasVerifiedScore: boolean }) {
  return (
    <Card
      title="AI Conversation Score"
      description={hasVerifiedScore ? 'Based on this chat — see Overview for the verified score' : "Based on this conversation's analysis"}
      className="h-full"
    >
      <div className="flex items-baseline gap-1.5">
        <span className="text-[30px] font-black text-gray-900 leading-none tracking-tight">{overallScore}</span>
        <span className="text-[13px] text-gray-400 font-bold">/100</span>
      </div>
      <div className="flex items-center gap-1.5 mt-3">
        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${tierStyle[tier] ?? tierStyle.HOLD}`}>{tierLabel[tier] ?? tier}</span>
        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${confidenceStyle[confidence] ?? confidenceStyle.Low}`}>{confidence} Confidence</span>
      </div>
    </Card>
  )
}

function BottomLineCard({ text }: { text: string }) {
  return (
    <Card title="Bottom Line" className="h-full">
      <p className="text-[13.5px] text-gray-700 leading-relaxed">{text}</p>
    </Card>
  )
}

function ChecklistTeaserCard({ title, items, tone }: { title: string; items: string[]; tone: 'positive' | 'risk' }) {
  const Icon = tone === 'positive' ? CheckFat : Warning
  const iconColor = tone === 'positive' ? 'text-emerald-500' : 'text-amber-500'
  return (
    <Card title={title} className="h-full">
      <ul className="space-y-2">
        {items.slice(0, 3).map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[12.5px] text-gray-700 leading-snug">
            <Icon size={12} weight="fill" className={`${iconColor} mt-0.5 flex-shrink-0`} />
            {item}
          </li>
        ))}
      </ul>
    </Card>
  )
}

// ── Section 2: Investment Breakdown ─────────────────────────────────────────
function DimensionScoreCard({ dims }: { dims: DecisionDimension[] }) {
  return (
    <Card title="Score by Dimension">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        {dims.map((dim) => (
          <div key={dim.key} className="flex items-center gap-3">
            <span className="text-[12.5px] font-semibold text-gray-600 w-[130px] flex-shrink-0 truncate">{dim.label}</span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${dim.score >= 65 ? 'bg-emerald-400' : dim.score >= 45 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${dim.score}%` }} />
            </div>
            <span className="text-[12.5px] font-black text-gray-800 w-7 text-right flex-shrink-0">{dim.score}</span>
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${dim.status === 'Verified' ? 'bg-emerald-50 text-emerald-600' : dim.status === 'Estimated' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>{dim.status}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function BulletCard({ title, items, tone }: { title: string; items: string[]; tone: 'positive' | 'risk' }) {
  if (items.length === 0) return null
  const Icon = tone === 'positive' ? CheckFat : Warning
  const iconColor = tone === 'positive' ? 'text-emerald-500' : 'text-amber-500'
  return (
    <Card title={title} className="h-full">
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[12.5px] text-gray-700 leading-relaxed">
            <Icon size={12} weight="fill" className={`${iconColor} mt-0.5 flex-shrink-0`} />
            {item}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function WhyRankedLowerCard({ reasons }: { reasons: Array<{ rank: number; label: string; detail: string }> }) {
  if (reasons.length === 0) return null
  return (
    <Card title="Why Ranked Lower" className="h-full">
      <div className="space-y-3">
        {reasons.map((r) => (
          <div key={r.rank} className="flex items-start gap-3">
            <span className="text-[11px] font-black text-gray-300 mt-0.5">#{r.rank}</span>
            <div>
              <p className="text-[12.5px] font-bold text-gray-800">{r.label}</p>
              <p className="text-[12px] text-gray-500 leading-relaxed mt-0.5">{r.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Section 3: Buyer Fit ─────────────────────────────────────────────────────
function BuyerPersonaCard({ persona, isPrimary }: { persona: NonNullable<ProjectCardType['buyerPersonas']>[number]; isPrimary: boolean }) {
  return (
    <div className={`rounded-[24px] border p-5 flex flex-col ${isPrimary ? 'border-indigo-100 bg-indigo-50/40 shadow-sm' : 'border-gray-100 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.03)]'}`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`font-bold ${isPrimary ? 'text-[16px] text-indigo-900' : 'text-[13.5px] text-gray-800'}`}>{persona.type}</p>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={isPrimary ? 13 : 11} className={i < persona.stars ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
          ))}
        </div>
      </div>
      <p className={`font-medium mb-2 ${isPrimary ? 'text-[13px] text-indigo-600' : 'text-[11.5px] text-gray-500'}`}>{persona.headline}</p>
      <ul className="space-y-1.5">
        {persona.reasons.map((r, i) => (
          <li key={i} className={`flex items-start gap-1.5 text-gray-600 ${isPrimary ? 'text-[12px]' : 'text-[11px]'}`}>
            <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
            {r}
          </li>
        ))}
      </ul>
    </div>
  )
}

function BuyerFitPersonas({ personas }: { personas: NonNullable<ProjectCardType['buyerPersonas']> }) {
  if (personas.length === 0) return null
  const [primary, ...secondary] = personas
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
      <BuyerPersonaCard persona={primary} isPrimary />
      {secondary.map((p) => <BuyerPersonaCard key={p.type} persona={p} isPrimary={false} />)}
    </div>
  )
}

function DealBreakersCard({ dealBreakers }: { dealBreakers: NonNullable<ProjectCardType['dealBreakers']> }) {
  if (dealBreakers.length === 0) return null
  return (
    <Card title="Deal Breakers" description="Avoid this project if…" className="h-full">
      <div className="space-y-3">
        {dealBreakers.map((db, i) => (
          <div key={i} className={`rounded-2xl border px-4 py-3 ${db.severity === 'Dealbreaker' ? 'border-red-200 bg-red-50/50' : db.severity === 'Caution' ? 'border-amber-200 bg-amber-50/40' : 'border-gray-200 bg-gray-50/40'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Warning size={12} weight="fill" className={db.severity === 'Dealbreaker' ? 'text-red-500' : db.severity === 'Caution' ? 'text-amber-500' : 'text-gray-400'} />
              <p className={`text-[12px] font-bold ${db.severity === 'Dealbreaker' ? 'text-red-700' : db.severity === 'Caution' ? 'text-amber-700' : 'text-gray-700'}`}>{db.label}</p>
              <span className={`ml-auto text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${db.severity === 'Dealbreaker' ? 'bg-red-100 text-red-600' : db.severity === 'Caution' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>{db.severity}</span>
            </div>
            <p className="text-[12px] text-gray-600 leading-relaxed pl-[18px]">{db.detail}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Section 4: Investment View ───────────────────────────────────────────────
function ThesisCard({ title, text, tone = 'default' }: { title: string; text: string; tone?: 'default' | 'primary' }) {
  return (
    <Card title={title} className={tone === 'primary' ? 'bg-blue-50/40' : ''}>
      <p className="text-[13px] text-gray-700 leading-relaxed">{text}</p>
    </Card>
  )
}

function TimelineAdviceCard({ text }: { text: string }) {
  return (
    <Card title="Timeline Advice">
      <div className="flex items-start gap-2.5">
        <Timer size={15} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-[13px] text-gray-700 leading-relaxed">{text}</p>
      </div>
    </Card>
  )
}

function PriceTrendsCard({ sector, data }: { sector: string; data: NonNullable<typeof SECTOR_PRICE_HISTORY[string]> }) {
  return (
    <Card
      title={`Price Trends — ${sector}`}
      action={<span className="text-[9px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">Sample data</span>}
    >
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[18px] font-black text-gray-900">{data.yoyGrowth}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Year-on-year</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[13px] font-bold text-gray-900 leading-tight">{data.avgPriceRange}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Avg. price/sqft</p>
        </div>
      </div>
      <p className="text-[12px] text-gray-600 leading-relaxed mb-2">{data.note}</p>
      <p className="text-[12px] text-emerald-700 font-semibold">Outlook: {data.outlook}</p>
      <p className="text-[9.5px] text-gray-400 mt-3 pt-2 border-t border-gray-50">* Indicative market data. Verify with RERA and registered valuers before purchase decisions.</p>
    </Card>
  )
}

function NegotiationLeverageCard({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <Card title="Negotiation Leverage">
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[12.5px] text-emerald-800">
            <Handshake size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function WalkAwayCard({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <Card title="Walk Away If">
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[12.5px] text-red-800">
            <Warning size={12} weight="fill" className="text-red-500 mt-0.5 flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </Card>
  )
}

// ── Empty state ──────────────────────────────────────────────────────────────
function NoIntelligenceState() {
  return (
    <Card>
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <Sparkles size={28} className="text-gray-300 mb-3" />
        <p className="text-[14px] font-semibold text-gray-400">Decision Intelligence</p>
        <p className="text-[12px] text-gray-300 mt-1">Load a search result to see the full analysis.</p>
      </div>
    </Card>
  )
}

// ── Main orchestrator ────────────────────────────────────────────────────────
export default function IntelligenceTab({
  project, detail, d, loading, timelineAdvice, negotiationLeverage, walkAwayConditions, marketVisible, marketRef,
}: IntelligenceTabProps) {
  const intel = project?.decisionIntelligence ?? null
  const whyNotReasons = project?.whyNot?.reasons ?? []
  const buyerPersonas = project?.buyerPersonas ?? []
  const dealBreakers = project?.dealBreakers ?? []
  const completeness = project?.intelligenceCompleteness ?? null

  const primaryThesis = detail?.recommendation_profile?.primary_thesis ?? null
  const investmentThesis = detail?.recommendation_profile?.investment_thesis ?? null
  const riskThesis = detail?.recommendation_profile?.risk_thesis ?? null
  const priceData = d?.sector ? SECTOR_PRICE_HISTORY[d.sector] ?? null : null

  if (loading && !detail) {
    return (
      <div className="p-5 md:p-8 space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-32 bg-gray-100 rounded-[28px]" />)}
        </div>
        <div className="h-40 bg-gray-100 rounded-[28px]" />
      </div>
    )
  }

  if (!intel) {
    return (
      <div className="p-5 md:p-8">
        <NoIntelligenceState />
        {/* Builder intelligence and investment view still work off `detail` alone — no chat context required */}
        {(investmentThesis || riskThesis || detail?.builder_detail) && <div className="mt-6"><BuilderIntelligenceSection detail={detail} /></div>}
      </div>
    )
  }

  return (
    <div className="p-5 md:p-8 space-y-8">
      {/* Section 1 — Executive Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <DecisionScoreCard overallScore={intel.overallScore} tier={intel.tier} confidence={intel.confidence} hasVerifiedScore={!!detail?.recommendation_score} />
        <BottomLineCard text={intel.bottomLine} />
        {intel.topStrengths.length > 0 && <ChecklistTeaserCard title="Top Strengths" items={intel.topStrengths} tone="positive" />}
        {intel.tradeoffs.length > 0 && <ChecklistTeaserCard title="Primary Risks" items={intel.tradeoffs} tone="risk" />}
      </div>

      {/* Section 2 — Investment Breakdown */}
      <div className="space-y-6">
        {intel.dimensions.length > 0 && <DimensionScoreCard dims={intel.dimensions} />}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BulletCard title="Why Buy" items={intel.topStrengths} tone="positive" />
          <BulletCard title="Trade-offs" items={intel.tradeoffs} tone="risk" />
          <WhyRankedLowerCard reasons={whyNotReasons} />
        </div>
      </div>

      {/* Section 3 — Buyer Fit */}
      {(buyerPersonas.length > 0 || dealBreakers.length > 0) && (
        <div>
          <h2 className="text-[20px] font-bold text-gray-900 tracking-tight mb-1">Who is this property actually for?</h2>
          <p className="text-[13px] text-gray-400 mb-5">Buyer fit and reasons to walk away, based on this project&apos;s profile.</p>
          <CardRow
            left={<BuyerFitPersonas personas={buyerPersonas} />}
            right={
              dealBreakers.length > 0 ? (
                <DealBreakersCard dealBreakers={dealBreakers} />
              ) : (
                <Card className="h-full flex flex-col items-center justify-center bg-gray-50/50">
                  <div className="text-center mb-6">
                    <p className="text-[15px] font-bold text-gray-900">Buyer Fit Radar</p>
                    <p className="text-[12px] text-gray-500 mt-0.5">Strength across key demographics</p>
                  </div>
                  <PropertyRadarChart 
                    axes={buyerPersonas.map((p, i) => ({
                      label: p.type,
                      value: (p.stars / 5) * 100,
                      color: i === 0 ? '#4f46e5' : i === 1 ? '#10b981' : i === 2 ? '#f59e0b' : i === 3 ? '#ec4899' : '#8b5cf6'
                    }))} 
                    size={280} 
                  />
                </Card>
              )
            }
          />
        </div>
      )}

      {/* Section 4 — Investment View */}
      {(primaryThesis || investmentThesis || riskThesis || timelineAdvice || priceData || negotiationLeverage.length > 0 || walkAwayConditions.length > 0 || d?.sector) && (
        <div className="space-y-6">
          <CardRow
            left={
              <div className="space-y-6">
                {primaryThesis && <ThesisCard title="AI Investment View" text={primaryThesis} tone="primary" />}
                {investmentThesis && <ThesisCard title="Investment Case" text={investmentThesis} />}
                {riskThesis && <ThesisCard title="Risk Assessment" text={riskThesis} />}
                {timelineAdvice && <TimelineAdviceCard text={timelineAdvice} />}
              </div>
            }
            right={
              <div className="space-y-6">
                {priceData && d?.sector && <PriceTrendsCard sector={d.sector} data={priceData} />}
                <NegotiationLeverageCard items={negotiationLeverage} />
                <WalkAwayCard items={walkAwayConditions} />
              </div>
            }
          />
          {d?.sector && (
            <Card title="Market Comparison" className="overflow-visible">
              <div ref={marketRef}>
                {marketVisible && <MarketComparison sector={d.sector} city={d.city} />}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Section 5 — Builder Intelligence */}
      <BuilderIntelligenceSection detail={detail} />

      {completeness && (
        <p className="text-[11px] text-gray-400 text-center">
          Data coverage: <span className="font-semibold">{completeness.overallCoverage}</span>
          {completeness.missingFields.length > 0 && ` · Missing: ${completeness.missingFields.join(', ')}`}
        </p>
      )}
    </div>
  )
}

// Kept as a single wrapped card — BuilderIntelligence already owns its own
// verdict/DNA/delivery-record/confidence sub-layout; re-splitting its internals
// wasn't part of this pass (it's real builder logic, not presentation glue).
function BuilderIntelligenceSection({ detail }: { detail: ProjectDetail | null }) {
  if (!detail?.builder_detail && !detail?.rera_number) return null
  return (
    <Card title="Builder Intelligence" className="!p-0 overflow-hidden">
      <BuilderIntelligence builderDetail={detail?.builder_detail ?? null} reraNumber={detail?.rera_number ?? null} />
    </Card>
  )
}
