'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Bed, Bath, Columns, Ruler, Layers, ZoomIn, ChevronDown, ChevronRight,
  Award, Maximize2, TrendingDown, CheckCircle2, Crown, FileText,
} from 'lucide-react'
import type { ProjectDetail, UnitTypeSummary } from '@/types/project'
import { Card } from './Card'

type FloorPlanImage = { id: string; url: string; caption?: string | null; bhk?: number | null; size_sqft?: number | null }
type LazyState<T> = { loaded: boolean; available: boolean; data: T | null; message?: string }

function priceLabel(u: UnitTypeSummary): string {
  if (u.price_label) return u.price_label
  if (u.price_min_cr == null) return 'Price on request'
  if (u.price_max_cr == null || u.price_min_cr === u.price_max_cr) return `₹${Number(u.price_min_cr).toFixed(2)} Cr`
  return `₹${Number(u.price_min_cr).toFixed(2)} – ${Number(u.price_max_cr).toFixed(2)} Cr`
}

function areaSqft(u: UnitTypeSummary): number | null {
  return u.super_area_sqft ?? u.carpet_area_sqft ?? null
}

function pricePerSqft(u: UnitTypeSummary): number | null {
  const area = areaSqft(u)
  if (!area || u.price_min_cr == null) return null
  return (u.price_min_cr * 1e7) / area // Cr -> ₹, then per sqft
}

function matchFloorPlans(images: FloorPlanImage[], bhk: number): FloorPlanImage[] {
  const bhkStr = String(bhk)
  const matched = images.filter((img) =>
    img.bhk === bhk || img.caption?.toLowerCase().includes(`${bhkStr}bhk`) || img.caption?.toLowerCase().includes(`${bhkStr} bhk`)
  )
  return matched.length > 0 ? matched : images
}

export interface PricingTabProps {
  unitTypes: UnitTypeSummary[]
  floorPlanImages: FloorPlanImage[]
  loading: boolean
  detail: ProjectDetail | null
  projectStatus?: string
  paymentPlan: LazyState<Record<string, unknown>>
  costSheet: LazyState<Record<string, unknown>> & { illustration: Record<string, number | null> | null; note?: string }
  onViewFloorPlans: (plans: FloorPlanImage[]) => void
  onGoToCosts: () => void
}

// ── Section 1: Available Configurations ─────────────────────────────────────
function PricingHeader({ bhkOptions, activeFilter, onFilter }: { bhkOptions: number[]; activeFilter: number | 'all'; onFilter: (f: number | 'all') => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h2 className="text-[20px] font-bold text-gray-900 tracking-tight">Available Configurations</h2>
        <p className="text-[13px] text-gray-400 mt-1">Choose the home that best fits your lifestyle.</p>
      </div>
      {bhkOptions.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', ...bhkOptions] as const).map((f) => {
            const active = activeFilter === f
            return (
              <button
                key={f}
                onClick={() => onFilter(f)}
                className={`text-[12px] font-bold px-3.5 py-1.5 rounded-full border transition-colors ${
                  active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                {f === 'all' ? 'All' : `${f} BHK`}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ConfigurationRow({ unit, floorPlans, loading, onViewFloorPlans }: { unit: UnitTypeSummary; floorPlans: FloorPlanImage[]; loading: boolean; onViewFloorPlans: (plans: FloorPlanImage[]) => void }) {
  const [expanded, setExpanded] = useState(false)
  const area = areaSqft(unit)
  const previewImg = floorPlans[0]

  return (
    <div className="rounded-2xl border border-gray-100 bg-white hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-shadow overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-5 px-6 py-5 text-left"
      >
        {previewImg ? (
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-50">
            <Image src={previewImg.url} alt={unit.name} fill className="object-cover" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center flex-shrink-0">
            <Bed size={20} className="text-gray-300" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-gray-900 truncate">{unit.name}</p>
          <div className="flex items-center gap-3 mt-1 text-[12px] text-gray-500 flex-wrap">
            <span className="flex items-center gap-1"><Bed size={12} /> {unit.bhk} BHK</span>
            {unit.bathrooms != null && <span className="flex items-center gap-1"><Bath size={12} /> {unit.bathrooms} Bath</span>}
            {unit.balcony_area_sqft != null && <span className="flex items-center gap-1"><Columns size={12} /> Balcony</span>}
            {area && <span className="flex items-center gap-1"><Ruler size={12} /> {area.toLocaleString()} sqft</span>}
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-[16px] font-black text-gray-900">{priceLabel(unit)}</p>
        </div>

        <ChevronDown size={16} className={`text-gray-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-1 border-t border-gray-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4 items-start">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {unit.super_area_sqft && (
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1"><Ruler size={11} /> Super</p>
                      <p className="text-[13px] font-bold text-gray-800 mt-1">{unit.super_area_sqft.toLocaleString()}</p>
                    </div>
                  )}
                  {unit.carpet_area_sqft && (
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1"><Layers size={11} /> Carpet</p>
                      <p className="text-[13px] font-bold text-gray-800 mt-1">{unit.carpet_area_sqft.toLocaleString()}</p>
                    </div>
                  )}
                  {unit.balcony_area_sqft && (
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1"><Columns size={11} /> Balcony</p>
                      <p className="text-[13px] font-bold text-gray-800 mt-1">{unit.balcony_area_sqft.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {loading ? (
                  <div className="rounded-2xl bg-gray-100 h-40 animate-pulse" />
                ) : floorPlans.length > 0 ? (
                  <button
                    onClick={() => onViewFloorPlans(floorPlans)}
                    className="relative rounded-2xl overflow-hidden group h-40"
                  >
                    <Image src={floorPlans[0].url} alt="Floor plan" fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 bg-white/90 rounded-full px-4 py-2 flex items-center gap-2 text-[12px] font-semibold text-gray-700 transition-opacity">
                        <ZoomIn size={14} /> View Floor Plan
                      </div>
                    </div>
                  </button>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Section 2: Floor Plan Gallery ────────────────────────────────────────────
function FloorPlanCard({ image, unit, onView }: { image: FloorPlanImage; unit: UnitTypeSummary | null; onView: () => void }) {
  const bhk = image.bhk ?? unit?.bhk ?? null
  const area = image.size_sqft ?? (unit ? areaSqft(unit) : null)
  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-shadow">
      <button onClick={onView} className="relative w-full h-56 block group">
        <Image src={image.url} alt={image.caption ?? unit?.name ?? 'Floor plan'} fill className="object-cover" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 bg-white/90 rounded-full px-4 py-2 flex items-center gap-2 text-[12px] font-semibold text-gray-700 transition-opacity">
            <ZoomIn size={14} /> View Full Plan
          </div>
        </div>
      </button>
      <div className="p-5">
        <p className="text-[14px] font-bold text-gray-900">{image.caption ?? unit?.name ?? 'Floor Plan'}</p>
        <div className="flex items-center gap-3 mt-2 text-[12px] text-gray-500 flex-wrap">
          {bhk && <span className="flex items-center gap-1"><Bed size={12} /> {bhk} BHK</span>}
          {area && <span className="flex items-center gap-1"><Ruler size={12} /> {area.toLocaleString()} sqft</span>}
          {unit?.bathrooms != null && <span className="flex items-center gap-1"><Bath size={12} /> {unit.bathrooms} Bath</span>}
          {unit?.balcony_area_sqft != null && <span className="flex items-center gap-1"><Columns size={12} /> Balcony</span>}
        </div>
        {unit && (
          <p className="text-[13px] font-black text-gray-900 mt-3">{priceLabel(unit)}</p>
        )}
      </div>
    </div>
  )
}

// ── Section 3: Pricing Insights ──────────────────────────────────────────────
function InsightCard({ icon: Icon, label, value, detail }: { icon: typeof Award; label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center mb-3">
        <Icon size={16} className="text-gray-500" />
      </div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-[15px] font-bold text-gray-900 mt-1">{value}</p>
      {detail && <p className="text-[11.5px] text-gray-400 mt-0.5">{detail}</p>}
    </div>
  )
}

function PricingInsights({ unitTypes, projectStatus }: { unitTypes: UnitTypeSummary[]; projectStatus?: string }) {
  const withPrice = unitTypes.filter((u) => u.price_min_cr != null)
  const withArea = unitTypes.filter((u) => areaSqft(u) != null)
  const withPricePerSqft = unitTypes.map((u) => ({ u, pps: pricePerSqft(u) })).filter((x) => x.pps != null) as { u: UnitTypeSummary; pps: number }[]

  const lowestEntry = withPrice.length > 0 ? withPrice.reduce((a, b) => (a.price_min_cr! < b.price_min_cr! ? a : b)) : null
  const largest = withArea.length > 0 ? withArea.reduce((a, b) => (areaSqft(a)! > areaSqft(b)! ? a : b)) : null
  const bestValue = withPricePerSqft.length > 0 ? withPricePerSqft.reduce((a, b) => (a.pps < b.pps ? a : b)).u : null
  const premium = withPrice.length > 0 ? withPrice.reduce((a, b) => ((b.price_max_cr ?? b.price_min_cr!) > (a.price_max_cr ?? a.price_min_cr!) ? b : a)) : null

  const insights: Array<{ icon: typeof Award; label: string; value: string; detail?: string }> = []
  if (lowestEntry) insights.push({ icon: TrendingDown, label: 'Lowest Entry Price', value: priceLabel(lowestEntry), detail: lowestEntry.name })
  if (largest) insights.push({ icon: Maximize2, label: 'Largest Configuration', value: `${areaSqft(largest)!.toLocaleString()} sqft`, detail: largest.name })
  if (bestValue) insights.push({ icon: Award, label: 'Best Value Configuration', value: bestValue.name, detail: priceLabel(bestValue) })
  if (projectStatus === 'ready_to_move') insights.push({ icon: CheckCircle2, label: 'Availability', value: 'Ready to Move' })
  if (premium && premium !== lowestEntry) insights.push({ icon: Crown, label: 'Premium Configuration', value: premium.name, detail: priceLabel(premium) })

  if (insights.length === 0) return null

  return (
    <Card title="Pricing Insights" description="Derived from this project's unit configurations">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {insights.map((ins) => <InsightCard key={ins.label} {...ins} />)}
      </div>
    </Card>
  )
}

// ── Section 4: Financial Snapshot teaser ─────────────────────────────────────
function FinancialSnapshotCard({ paymentPlan, costSheet, onGoToCosts }: {
  paymentPlan: PricingTabProps['paymentPlan']
  costSheet: PricingTabProps['costSheet']
  onGoToCosts: () => void
}) {
  if (!paymentPlan.loaded || !costSheet.loaded) {
    return (
      <Card>
        <div className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
      </Card>
    )
  }

  const planName = paymentPlan.available ? (paymentPlan.data?.plan_name as string | undefined) : null
  const milestoneCount = paymentPlan.available && Array.isArray(paymentPlan.data?.milestones) ? (paymentPlan.data!.milestones as unknown[]).length : 0
  const totalCost = costSheet.available ? costSheet.illustration?.['total_cost_cr'] : null

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <FileText size={18} className="text-blue-500" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-gray-900">
              {planName ?? (milestoneCount > 0 ? `${milestoneCount}-step payment plan` : 'Payment schedule not yet verified')}
            </p>
            <p className="text-[12px] text-gray-400 mt-0.5">
              {totalCost != null
                ? <>Illustrative total cost <span className="font-bold text-gray-700">₹{Number(totalCost).toFixed(2)} Cr</span></>
                : 'Cost sheet not yet verified'}
            </p>
          </div>
        </div>
        <button
          onClick={onGoToCosts}
          className="flex items-center gap-1.5 text-[13px] font-bold text-blue-600 hover:text-blue-700 flex-shrink-0"
        >
          View Complete Cost Breakdown <ChevronRight size={14} />
        </button>
      </div>
    </Card>
  )
}

// ── Main orchestrator ────────────────────────────────────────────────────────
export default function PricingTab({
  unitTypes, floorPlanImages, loading, detail, projectStatus, paymentPlan, costSheet, onViewFloorPlans, onGoToCosts,
}: PricingTabProps) {
  const [filter, setFilter] = useState<number | 'all'>('all')
  const bhkOptions = [...new Set(unitTypes.map((u) => u.bhk))].sort((a, b) => a - b)
  const filteredUnits = filter === 'all' ? unitTypes : unitTypes.filter((u) => u.bhk === filter)

  // Pair each floor plan image with its best-matching unit (by bhk) for the gallery cards.
  const galleryEntries = floorPlanImages.map((img) => {
    const unit = unitTypes.find((u) => u.bhk === img.bhk) ?? unitTypes.find((u) => img.caption?.toLowerCase().includes(`${u.bhk}bhk`) || img.caption?.toLowerCase().includes(`${u.bhk} bhk`)) ?? null
    return { img, unit }
  })

  return (
    <div className="p-5 md:p-8 space-y-8">
      {/* Section 1 */}
      <div className="space-y-5">
        <PricingHeader bhkOptions={bhkOptions} activeFilter={filter} onFilter={setFilter} />
        <div className="space-y-3">
          {filteredUnits.map((u, i) => (
            <ConfigurationRow
              key={i}
              unit={u}
              floorPlans={loading && !detail ? [] : matchFloorPlans(floorPlanImages, u.bhk)}
              loading={loading && !detail}
              onViewFloorPlans={onViewFloorPlans}
            />
          ))}
        </div>
      </div>

      {/* Section 2 */}
      {galleryEntries.length > 0 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-[20px] font-bold text-gray-900 tracking-tight">Floor Plan Gallery</h2>
            <p className="text-[13px] text-gray-400 mt-1">A closer look at every layout on offer.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {galleryEntries.map(({ img, unit }) => (
              <FloorPlanCard key={img.id} image={img} unit={unit} onView={() => onViewFloorPlans(floorPlanImages)} />
            ))}
          </div>
        </div>
      )}

      {/* Section 3 */}
      <PricingInsights unitTypes={unitTypes} projectStatus={projectStatus} />

      {/* Section 4 */}
      <FinancialSnapshotCard paymentPlan={paymentPlan} costSheet={costSheet} onGoToCosts={onGoToCosts} />
    </div>
  )
}
