'use client'
import { useState } from 'react'
import { motion as m, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Bed, Bath, Columns, Ruler, ZoomIn, ChevronDown, ChevronRight,
  Award, Maximize2, TrendingDown, CheckCircle2, Crown,
  Sparkles, Lightbulb, Shield, Car, User, Wind, Cpu, Droplet,
  Layout, Home, Users, Compass, Eye, Trophy, CalendarDays
} from 'lucide-react'
import type { ProjectDetail, UnitTypeSummary } from '@/types/project'
import { resolveImgUrl } from '@/lib/utils'
import InfoTooltip from '@/components/ui/InfoTooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { CustomDropdown } from '@/components/ui/CustomDropdown'

type FloorPlanImage = { id: string; url: string; caption?: string | null; bhk?: number | null; size_sqft?: number | null }
type LazyState<T> = { loaded: boolean; available: boolean; data: T | null; message?: string }
type AvailabilityRow = { tower: string; floor: string; unitNo: string; facing: string; view: string; price: string; status: string }

// Resolve icon name from string to Lucide Icon component
const ICON_MAP: Record<string, any> = {
  layout: Layout,
  height: Maximize2,
  mivan: Shield,
  shield: Shield,
  parking: Car,
  utility: Columns,
  briefcase: Award,
  sun: Sparkles,
  lock: Shield,
  ac: Wind,
  kitchen: Home,
  columns: Columns,
  door: Compass,
  droplet: Droplet,
  cpu: Cpu,
  car: Car,
  user: User
}

function priceLabel(u: UnitTypeSummary): string {
  if (u.price_label) return u.price_label
  if (u.price_min_cr == null) return 'Price on Request'
  if (u.price_max_cr == null || u.price_min_cr === u.price_max_cr) return `₹${Number(u.price_min_cr).toFixed(2)} Cr`
  return `₹${Number(u.price_min_cr).toFixed(2)} – ${Number(u.price_max_cr).toFixed(2)} Cr`
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
function AvailabilityTable({ rows }: { rows: AvailabilityRow[] }) {
  return (
    <div className="overflow-x-auto border border-gray-100 dark:border-white/5 rounded-2xl">
      <table className="w-full min-w-[720px] text-left text-[12.5px] border-collapse">
        <thead>
          <tr className="bg-gray-50/70 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 text-gray-400 font-black text-[10px] uppercase tracking-wider">
            <th className="p-3.5 pl-4">Tower</th>
            <th className="p-3.5">Floor</th>
            <th className="p-3.5">Unit No.</th>
            <th className="p-3.5">Facing</th>
            <th className="p-3.5">View</th>
            <th className="p-3.5">Price</th>
            <th className="p-3.5 text-right pr-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-semibold text-gray-800 dark:text-gray-200">
          {rows.length > 0 ? (
            rows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                <td className="p-3.5 pl-4 font-bold">{row.tower}</td>
                <td className="p-3.5">{row.floor}</td>
                <td className="p-3.5 font-extrabold text-gray-900 dark:text-white">{row.unitNo}</td>
                <td className="p-3.5">{row.facing}</td>
                <td className="p-3.5">{row.view}</td>
                <td className="p-3.5 font-black">{row.price}</td>
                <td className="p-3.5 text-right pr-4">
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {row.status}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="p-6 text-center text-gray-400 font-medium text-[12px]">
                No active inventory rows found for this configuration. Contact advisor for offline availability.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function areaSqft(u: UnitTypeSummary): number | null {
  return u.super_area_sqft ?? u.carpet_area_sqft ?? null
}

export interface ResidencesTabProps {
  unitTypes: UnitTypeSummary[]
  floorPlanImages: FloorPlanImage[]
  loading: boolean
  detail: ProjectDetail | null
  projectStatus?: string
  paymentPlan: LazyState<Record<string, unknown>>
  costSheet: LazyState<Record<string, unknown>> & { illustration: Record<string, number | null> | null; note?: string }
  onViewFloorPlans: (plans: FloorPlanImage[]) => void
  onGoToCosts: () => void
  onGoToOverview: () => void
}

export default function ResidencesTab({
  unitTypes, floorPlanImages, loading, detail, projectStatus, paymentPlan, costSheet, onViewFloorPlans, onGoToCosts, onGoToOverview,
}: ResidencesTabProps) {
  const [filter, setFilter] = useState<number | 'all' | 'penthouse' | 'duplex' | 'villa'>('all')
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [activePlanTab, setActivePlanTab] = useState<'floor' | 'details' | 'availability'>('floor')
  const [floorType, setFloorType] = useState<string>('Typical Floor')
  const [selectedTower, setSelectedTower] = useState<string>('Tower A')
  const [selectedUnitNo, setSelectedUnitNo] = useState<string>('Unit 3')

  // Conditional special configuration detection — only show if project actually has them!
  const hasPenthouse = (detail)?.has_penthouse || unitTypes.some(u => u.name?.toLowerCase().includes('penthouse'))
  const hasDuplex = (detail)?.has_duplex || unitTypes.some(u => u.name?.toLowerCase().includes('duplex'))
  const hasVilla = unitTypes.some(u => u.name?.toLowerCase().includes('villa'))

  const bhkOptions = [...new Set(unitTypes.map((u) => u.bhk))].sort((a, b) => a - b)
  const filteredUnits = filter === 'all'
    ? unitTypes
    : typeof filter === 'number'
      ? unitTypes.filter((u) => u.bhk === filter)
      : unitTypes.filter((u) => u.name?.toLowerCase().includes(filter))

  // Default select first unit if none selected
  const activeUnit = unitTypes.find(u => u.id === selectedUnitId) || filteredUnits[0] || unitTypes[0] || null

  const getPricePerSqftStr = (u: UnitTypeSummary) => {
    const area = areaSqft(u)
    if (!area || u.price_min_cr == null) return '—'
    const minPps = Math.round((u.price_min_cr * 1e7) / area)
    return `₹${minPps.toLocaleString('en-IN')}/sq.ft`
  }

  // Matching floor plans
  const getUnitFloorPlans = (bhk?: number) => {
    if (!bhk) return floorPlanImages
    const matched = floorPlanImages.filter((img) =>
      img.bhk === bhk || img.caption?.toLowerCase().includes(`${bhk}bhk`) || img.caption?.toLowerCase().includes(`${bhk} bhk`)
    )
    return matched.length > 0 ? matched : floorPlanImages
  }

  const activeFloorPlans = activeUnit ? getUnitFloorPlans(activeUnit.bhk) : floorPlanImages
  const previewImg = activeFloorPlans[0]

  const area = activeUnit ? areaSqft(activeUnit) : null
  const carpetArea = activeUnit?.carpet_area_sqft || (area ? Math.round(area * 0.65) : null)
  const balconyArea = activeUnit?.balcony_area_sqft || (area ? Math.round(area * 0.08) : null)
  const reraCarpetArea = carpetArea ? Math.round(carpetArea * 0.94) : null

  const parseArray = (v: any) => {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
      try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
  }

  const perfectForList = activeUnit ? parseArray(activeUnit.perfect_for) : []
  const defaultPerfectFor = [
    { title: 'Families', desc: 'Perfect for families looking for comfortable living with 3 bedrooms.', tag: 'Ideal for 4-5 family members', icon: Users },
    { title: 'Working Professionals', desc: 'Great for professionals who work from home and need extra space.', tag: 'Study or work from home setup', icon: Layout },
    { title: 'Investors', desc: 'High rental demand configuration with excellent ROI potential.', tag: 'Strong appreciation potential', icon: Trophy }
  ]

  // Unit availability from unit_inventory table, fallback to empty if no DB data
  const unitInventory = (detail)?.unit_inventory || []
  const filteredInventory = activeUnit?.id ? unitInventory.filter((u: any) => u.unit_type_id === activeUnit.id) : unitInventory
  const mockAvailability: AvailabilityRow[] = filteredInventory.map((u: any) => ({
    tower: u.tower_name || '—',
    floor: u.floor_number ? String(u.floor_number) : '—',
    unitNo: u.unit_number || '—',
    facing: u.facing || '—',
    view: u.view || '—',
    price: priceLabel(activeUnit || {}),
    status: u.status === 'available' ? 'Available' : u.status === 'booked' ? 'Booked' : 'Hold'
  }))

  if (loading && !detail) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-3xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 h-96 bg-gray-100 dark:bg-gray-800 rounded-3xl animate-pulse" />
          <div className="lg:col-span-8 h-96 bg-gray-100 dark:bg-gray-800 rounded-3xl animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 md:p-8 space-y-6 md:space-y-8 bg-[#F7F9FB] dark:bg-[#0f0e0d] text-gray-900 dark:text-gray-100 font-sans">

      {/* ── 1. HEADER SECTION ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-black text-gray-900 dark:text-white tracking-tight">Explore Floor Plans</h1>
          <p className="text-[13px] text-gray-500 font-medium mt-0.5">Choose the perfect configuration that fits your lifestyle.</p>
        </div>

        {/* Need Help CTA Pill */}
        <div
          onClick={onGoToCosts}
          className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-2xl p-3 px-4 flex items-center gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.03)] cursor-pointer hover:border-gray-300 transition-all self-start md:self-auto"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <p className="text-[11.5px] font-black text-gray-900 dark:text-white leading-none">Need help choosing?</p>
            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Talk to our property expert</p>
          </div>
          <ChevronRight size={14} className="text-gray-400 ml-1" />
        </div>
      </div>

      {/* BHK Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => setFilter('all')}
          className={`text-[12.5px] font-extrabold px-5 py-2.5 rounded-full transition-all whitespace-nowrap ${
            filter === 'all'
              ? 'bg-[#111827] text-white dark:bg-white dark:text-gray-900 shadow-md'
              : 'bg-white dark:bg-[#111] text-gray-600 dark:text-gray-300 border border-gray-200/60 dark:border-white/10 hover:bg-gray-50'
          }`}
        >
          All Configurations
        </button>
        {bhkOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => setFilter(opt)}
            className={`text-[12.5px] font-extrabold px-5 py-2.5 rounded-full transition-all whitespace-nowrap ${
              filter === opt
                ? 'bg-[#111827] text-white dark:bg-white dark:text-gray-900 shadow-md'
                : 'bg-white dark:bg-[#111] text-gray-600 dark:text-gray-300 border border-gray-200/60 dark:border-white/10 hover:bg-gray-50'
            }`}
          >
            {opt} BHK
          </button>
        ))}

        {/* Conditional Special Configurations (Only show if project has them) */}
        {hasPenthouse && (
          <button
            onClick={() => setFilter('penthouse')}
            className={`text-[12.5px] font-extrabold px-5 py-2.5 rounded-full transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filter === 'penthouse'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40 hover:bg-amber-100'
            }`}
          >
            <Crown size={14} /> Penthouse
          </button>
        )}

        {hasDuplex && (
          <button
            onClick={() => setFilter('duplex')}
            className={`text-[12.5px] font-extrabold px-5 py-2.5 rounded-full transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filter === 'duplex'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40 hover:bg-purple-100'
            }`}
          >
            <Columns size={14} /> Duplex
          </button>
        )}

        {hasVilla && (
          <button
            onClick={() => setFilter('villa')}
            className={`text-[12.5px] font-extrabold px-5 py-2.5 rounded-full transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filter === 'villa'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-100'
            }`}
          >
            <Home size={14} /> Villa
          </button>
        )}
      </div>

      {/* ── 2. MAIN EXPLORER WORKSPACE (Left List on Desktop + Top Chips on Mobile + Right Detail Card) ── */}
      {/* Mobile Unit Picker (Horizontal Scrollable Chips for Quick Switching) */}
      <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {filteredUnits.map((unit) => {
          const isSelected = activeUnit?.id === unit.id
          return (
            <button
              key={unit.id}
              onClick={() => setSelectedUnitId(unit.id)}
              className={`px-4 py-2.5 rounded-2xl text-[12px] font-black whitespace-nowrap transition-all flex items-center gap-2 border flex-shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white dark:bg-[#111] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-gray-400'
              }`}
            >
              <span>{unit.name}</span>
              <span className={`text-[10.5px] font-bold ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                {priceLabel(unit)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN: Configuration Selection Sidebar (Desktop Full Sidebar) */}
        <div className="hidden lg:block lg:col-span-4 space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[14px] font-black text-gray-900 dark:text-white uppercase tracking-wider">All Configurations</h3>
            <span className="text-[11.5px] text-gray-400 font-bold">{unitTypes.length} options available</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredUnits.map((unit, idx) => {
              const isSelected = activeUnit?.id === unit.id
              const badgeLabel = unit.category_badge || (idx === 0 ? 'BEST VALUE' : idx === 1 ? 'MOST POPULAR' : idx === 2 ? 'PREMIUM CHOICE' : 'LUXURY')
              const badgeBg = idx === 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : idx === 1 ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'

              return (
                <div
                  key={unit.id}
                  onClick={() => setSelectedUnitId(unit.id)}
                  className={`p-4 md:p-5 rounded-[20px] bg-white dark:bg-[#111] border transition-all cursor-pointer space-y-3 relative min-w-0 ${
                    isSelected
                      ? 'border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                      : 'border-gray-100 dark:border-white/5 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md ${badgeBg}`}>
                      {badgeLabel}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-0.5">
                        <CheckCircle2 size={11} /> Selected
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-[16px] sm:text-[18px] font-black text-gray-900 dark:text-white leading-tight truncate">{unit.name}</h4>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] sm:text-[11.5px] text-gray-500 font-bold">
                      <span className="flex items-center gap-1"><Bed size={12} /> {unit.bhk} Beds</span>
                      <span className="flex items-center gap-1"><Bath size={12} /> {unit.bathrooms || unit.bhk} Baths</span>
                      {areaSqft(unit) && <span className="flex items-center gap-1"><Ruler size={12} /> {areaSqft(unit)!.toLocaleString()} sqft</span>}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[16px] sm:text-[18px] font-black text-gray-900 dark:text-white leading-none">{priceLabel(unit)}</p>
                      <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Starting Price</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={onGoToOverview}
            className="w-full p-3.5 rounded-[20px] border border-dashed border-gray-300 dark:border-gray-800 bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 hover:border-gray-400 text-[12.5px] font-extrabold transition-all flex items-center justify-center gap-2"
          >
            <Columns size={16} /> Compare Configurations
          </button>
        </div>

        {/* RIGHT COLUMN: Active Configuration Full Viewer Workspace */}
        {activeUnit && (
          <div className="lg:col-span-8 space-y-6">

            {/* Top Details & Interactive Floor Plan Card */}
            <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
              
              {/* Unit Title & Header Metrics */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[26px] font-black text-gray-900 dark:text-white tracking-tight">{activeUnit.name}</h2>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {activeUnit.category_badge || 'BEST VALUE'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-[12.5px] text-gray-500 font-bold">
                    <span className="flex items-center gap-1.5"><Bed size={14} className="text-gray-400" /> {activeUnit.bhk} Bedrooms</span>
                    <span className="flex items-center gap-1.5"><Bath size={14} className="text-gray-400" /> {activeUnit.bathrooms || activeUnit.bhk} Bathrooms</span>
                    {area && <span className="flex items-center gap-1.5"><Ruler size={14} className="text-gray-400" /> {area.toLocaleString()} sqft</span>}
                  </div>
                </div>

                <div className="sm:text-right">
                  <p className="text-[26px] font-black text-gray-900 dark:text-white leading-none">{priceLabel(activeUnit)}</p>
                  <p className="text-[11px] text-gray-400 font-semibold mt-1">Starting Price</p>
                </div>
              </div>

              {/* Floor Plan View Mode Tabs (Floor Plan / Details / Unit Availability) */}
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-gray-100 dark:border-white/5 pb-2">
                <div className="flex items-center gap-6">
                  {[
                    { id: 'floor', label: 'Floor Plan' },
                    { id: 'details', label: 'Details' },
                    { id: 'availability', label: 'Unit Availability' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActivePlanTab(tab.id)}
                      className={`text-[13px] font-extrabold pb-2 border-b-2 transition-all ${
                        activePlanTab === tab.id
                          ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                          : 'border-transparent text-gray-400 hover:text-gray-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activePlanTab === 'floor' && (
                  <button
                    onClick={() => onViewFloorPlans(activeFloorPlans)}
                    className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                    title="Expand Fullscreen"
                  >
                    <Maximize2 size={18} />
                  </button>
                )}
              </div>

              {/* ── TAB 1: FLOOR PLAN VIEW ── */}
              {activePlanTab === 'floor' && (
                <>
                  {/* Main Interactive Image Viewport */}
                  <div className="relative w-full h-[320px] md:h-[420px] bg-gray-50/50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center justify-center p-4 overflow-hidden group">
                    {previewImg ? (
                      <Image
                        src={resolveImgUrl(previewImg.url)}
                        alt={activeUnit.name}
                        fill
                        className="object-contain p-2"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center space-y-2">
                        <Layout size={48} className="text-gray-300 dark:text-gray-700" />
                        <p className="text-[13px] text-gray-400 font-bold">Floor plan preview illustration</p>
                      </div>
                    )}
                    <span className="absolute bottom-3 text-[10px] text-gray-400 font-medium italic">
                      Floor plans are for representation purposes only. Actual plans may vary.
                    </span>
                  </div>

                  {/* Viewport Action Controls Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                      <CustomDropdown
                        value={floorType}
                        onChange={(val) => setFloorType(val)}
                        options={[
                          { value: 'Typical Floor', label: 'Typical Floor' },
                          { value: 'Refuge Floor', label: 'Refuge Floor' },
                          { value: 'Penthouse Level', label: 'Penthouse Level' },
                        ]}
                        size="xs"
                        triggerClassName="text-[11.5px] font-bold py-2 px-3 rounded-xl min-w-[110px]"
                      />

                      <CustomDropdown
                        value={selectedTower}
                        onChange={(val) => setSelectedTower(val)}
                        options={
                          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                          ((activeUnit)?.tower_association && (activeUnit).tower_association.length > 0
                            ? (activeUnit).tower_association
                            : ['Tower A', 'Tower B']
                          ).map((t: string) => ({ value: t, label: t }))
                        }
                        size="xs"
                        triggerClassName="text-[11.5px] font-bold py-2 px-3 rounded-xl min-w-[90px]"
                      />

                      <CustomDropdown
                        value={selectedUnitNo}
                        onChange={(val) => setSelectedUnitNo(val)}
                        options={[
                          { value: 'Type C', label: 'Type C' },
                          { value: 'Type D', label: 'Type D' },
                        ]}
                        size="xs"
                        triggerClassName="text-[11.5px] font-bold py-2 px-3 rounded-xl min-w-[85px]"
                      />
                    </div>

                    <button
                      onClick={() => onViewFloorPlans(activeFloorPlans)}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl border border-gray-200/90 dark:border-white/10 bg-white/90 dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-[11.5px] font-black text-gray-800 dark:text-gray-200 flex items-center justify-center gap-1.5 shadow-sm transition-all"
                    >
                      <ZoomIn size={14} /> Download Plan
                    </button>
                  </div>

                  {/* Sub-type Layout Variants Carousel/Selector */}
                  <div className="pt-4 border-t border-gray-100 dark:border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-[14px] font-black text-gray-900 dark:text-white">Types in {activeUnit.bhk} BHK – {selectedTower}</h4>
                        <p className="text-[11px] text-gray-400 font-medium">Different layouts to match your preference</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {['Type C', 'Type D'].map((typeLabel) => (
                          <button
                            key={typeLabel}
                            onClick={() => setSelectedUnitNo(typeLabel)}
                            className={`text-[11.5px] font-extrabold px-3.5 py-1.5 rounded-full transition-all ${
                              selectedUnitNo === typeLabel
                                ? 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800'
                                : 'bg-gray-50 text-gray-600 dark:bg-white/5 dark:text-gray-400 border border-gray-200/60 dark:border-white/5'
                            }`}
                          >
                            {typeLabel}
                          </button>
                        ))}
                      </div>
                    </div>

                    {unitTypes.length === 0 && (
                      <p className="text-gray-500 text-sm">No unit types available</p>
                    )}
                  </div>
                </>
              )}

              {/* ── TAB 2: DETAILS VIEW ── */}
              {activePlanTab === 'details' && (
                <div className="space-y-6 pt-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                    <div className="p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Super Built-up Area</p>
                      <p className="text-[16px] font-black text-gray-900 dark:text-white">{area ? `${area.toLocaleString()} sqft` : '—'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Carpet Area</p>
                      <p className="text-[16px] font-black text-gray-900 dark:text-white">{carpetArea ? `${carpetArea.toLocaleString()} sqft` : '—'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Balcony Area</p>
                      <p className="text-[16px] font-black text-gray-900 dark:text-white">{balconyArea ? `${balconyArea.toLocaleString()} sqft` : '—'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Built-up Area</p>
                      <p className="text-[16px] font-black text-gray-900 dark:text-white">{(activeUnit)?.built_up_area_sqft ? `${(activeUnit).built_up_area_sqft.toLocaleString()} sqft` : (carpetArea ? `${Math.round(carpetArea * 1.18).toLocaleString()} sqft` : '—')}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Bedrooms</p>
                      <p className="text-[16px] font-black text-gray-900 dark:text-white">{activeUnit.bhk}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Bathrooms</p>
                      <p className="text-[16px] font-black text-gray-900 dark:text-white">{activeUnit.bathrooms || activeUnit.bhk}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Living / Dining</p>
                      <p className="text-[16px] font-black text-gray-900 dark:text-white">1</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Kitchen</p>
                      <p className="text-[16px] font-black text-gray-900 dark:text-white">1</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Private Balcony</p>
                      <p className="text-[16px] font-black text-gray-900 dark:text-white">{(activeUnit)?.balconies || 1}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Utility Area</p>
                      <p className="text-[16px] font-black text-gray-900 dark:text-white">{(activeUnit)?.utility_area_sqft ? `${(activeUnit).utility_area_sqft} sqft` : '1'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Efficiency Rating</p>
                      <p className="text-[16px] font-black text-emerald-600 dark:text-emerald-400">{(activeUnit)?.efficiency_rating || 'Excellent'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Floor Type</p>
                      <p className="text-[16px] font-black text-gray-900 dark:text-white">{floorType}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 3: UNIT AVAILABILITY VIEW ── */}
              {activePlanTab === 'availability' && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    {activeUnit.inventory_left && (
                      <p className="text-[12px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Only {activeUnit.inventory_left} units available in {activeUnit.name}
                      </p>
                    )}
                    <button onClick={onGoToCosts} className="text-[12px] font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      Inquire Specific Unit <ChevronRight size={14} />
                    </button>
                  </div>

                  <AvailabilityTable rows={mockAvailability} />
                </div>
              )}

            </div>

            {/* ── 3. KEY HIGHLIGHTS ── */}
            <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
              <h3 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">Key Highlights</h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                {[
                  { title: 'Well-ventilated', desc: 'Cross ventilation in all rooms', icon: Wind, bg: 'bg-purple-50 text-purple-600' },
                  { title: 'Spacious Living', desc: 'Large living & dining area', icon: Layout, bg: 'bg-indigo-50 text-indigo-600' },
                  { title: 'Smart Layout', desc: 'Zero wastage of space', icon: Columns, bg: 'bg-blue-50 text-blue-600' },
                  { title: 'Natural Light', desc: 'Rooms with maximum light', icon: Sparkles, bg: 'bg-amber-50 text-amber-600' },
                  { title: 'Privacy Focused', desc: 'Bedrooms separation', icon: Shield, bg: 'bg-emerald-50 text-emerald-600' }
                ].map((item, i) => {
                  const Icon = item.icon
                  return (
                    <div key={i} className="p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-2">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.bg}`}>
                        <Icon size={17} />
                      </div>
                      <div>
                        <h4 className="text-[13px] font-extrabold text-gray-900 dark:text-white leading-tight">{item.title}</h4>
                        <p className="text-[11px] text-gray-400 font-medium mt-1 leading-snug">{item.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── 5. USABLE AREA EFFICIENCY (Dynamic SVG Donut & Area Breakdown) ── */}
            <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
              <div>
                <h3 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">Usable Area Efficiency</h3>
                <p className="text-[12px] text-gray-500 font-medium mt-0.5">See how efficiently the space is utilized in this configuration.</p>
              </div>

              {(() => {
                const superSqft = area || 1450
                const cSqft = carpetArea || Math.round(superSqft * 0.78)
                const bSqft = (balconyArea || Math.round(superSqft * 0.12)) + 20
                const shaftSqft = Math.max(0, superSqft - cSqft - bSqft)

                const cPct = Math.round((cSqft / superSqft) * 100)
                const bPct = Math.round((bSqft / superSqft) * 100)
                const shaftPct = 100 - cPct - bPct

                const gradeLabel = cPct >= 72 ? 'Excellent' : cPct >= 65 ? 'Very Good' : 'Standard'
                const gradeBg = cPct >= 72 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'

                return (
                  <div className="w-full">
                    {/* SVG Segmented Donut Visual + Legend */}
                    <div className="w-full p-5 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex flex-col sm:flex-row items-center gap-6">
                      
                      {/* Dynamic SVG Segmented Donut */}
                      <div className="relative w-32 h-32 flex items-center justify-center flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="38" fill="transparent" stroke="#2563eb" strokeWidth="14" strokeDasharray={`${cPct} ${100 - cPct}`} strokeDashoffset="0" pathLength="100" />
                          <circle cx="50" cy="50" r="38" fill="transparent" stroke="#10b981" strokeWidth="14" strokeDasharray={`${bPct} ${100 - bPct}`} strokeDashoffset={-cPct} pathLength="100" />
                          <circle cx="50" cy="50" r="38" fill="transparent" stroke="#9ca3af" strokeWidth="14" strokeDasharray={`${shaftPct} ${100 - shaftPct}`} strokeDashoffset={-(cPct + bPct)} pathLength="100" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                          <span className="text-[20px] font-black text-gray-900 dark:text-white leading-none block">{cPct}%</span>
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mt-0.5">Usable Area</span>
                        </div>
                      </div>

                      {/* Legend Table */}
                      <div className="space-y-3 flex-1 w-full text-[12px] font-bold">
                        <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-white/5">
                          <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                            Carpet Area (Usable)
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-900 dark:text-white font-black">{cSqft.toLocaleString()} sqft</span>
                            <span className="text-gray-400 text-[11px] font-semibold w-8 text-right">{cPct}%</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-white/5">
                          <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            Balcony & Utility Area
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-900 dark:text-white font-black">{bSqft.toLocaleString()} sqft</span>
                            <span className="text-gray-400 text-[11px] font-semibold w-8 text-right">{bPct}%</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <span className="w-2.5 h-2.5 rounded-full bg-gray-400 dark:bg-gray-600" />
                            Common Walls & Shafts
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-900 dark:text-white font-black">{shaftSqft.toLocaleString()} sqft</span>
                            <span className="text-gray-400 text-[11px] font-semibold w-8 text-right">{shaftPct}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Efficiency Grade Card */}
                    <div className="md:col-span-4 p-5 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex flex-col items-center justify-center text-center space-y-2">
                      <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Efficiency Ratio</span>
                      <p className="text-[28px] font-black text-gray-900 dark:text-white leading-none">
                        {cPct}%
                      </p>
                      <p className="text-[11px] text-gray-400 font-semibold">Higher is better</p>
                      <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider mt-1 ${gradeBg}`}>
                        {gradeLabel}
                      </span>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* ── 6. INTERACTIVE VASTU & OUTDOOR LIVING VISUALIZERS ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Interactive Vastu Compass Widget */}
              <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Compass size={17} />
                    </div>
                    <div>
                      <h3 className="text-[16px] font-black text-gray-900 dark:text-white tracking-tight">Vastu Energy Orientation</h3>
                      <p className="text-[11px] text-gray-400 font-medium">Room-by-room directional alignment</p>
                    </div>
                  </div>
                  {pAny?.vastu_compliant && (
                    <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider">
                      Vastu Compliant
                    </span>
                  )}
                </div>

                <div className="space-y-2.5 pt-1">
                  <div className="p-3 rounded-xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-between text-[12px]">
                    <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Main Entrance Door
                    </span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">North-East (Ishanya) · Auspicious</span>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-between text-[12px]">
                    <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Kitchen Corner
                    </span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">South-East (Agni) · Ideal Fire Zone</span>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-between text-[12px]">
                    <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Master Bedroom
                    </span>
                    <span className="font-black text-blue-600 dark:text-blue-400">South-West (Nairutya) · High Stability</span>
                  </div>
                </div>
              </div>

              {/* Interactive Balcony & Outdoor Deck Visualizer */}
              <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Wind size={17} />
                    </div>
                    <div>
                      <h3 className="text-[16px] font-black text-gray-900 dark:text-white tracking-tight">Balcony & Outdoor Living</h3>
                      <p className="text-[11px] text-gray-400 font-medium">Private deck space & airflow</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                    {(activeUnit)?.balconies || 2} Balconies
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Outdoor Deck Area</p>
                    <p className="text-[16px] font-black text-gray-900 dark:text-white">{balconyArea ? `${balconyArea} sqft` : '140 sqft'}</p>
                    <p className="text-[10.5px] text-emerald-600 font-bold">Deep Sit-out Balcony</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Outdoor-to-Carpet Ratio</p>
                    <p className="text-[16px] font-black text-gray-900 dark:text-white">
                      {carpetArea ? `${Math.round(((balconyArea || 120) / carpetArea) * 100)}%` : '14%'}
                    </p>
                    <p className="text-[10.5px] text-blue-600 font-bold">High Ventilation</p>
                  </div>
                </div>
              </div>

            </div>

            {/* ── 5. UNIT AVAILABILITY ── */}
            <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">Unit Availability</h3>
                  <p className="text-[11.5px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Only {activeUnit.inventory_left ?? '?'} units left in this configuration
                  </p>
                </div>
                <button onClick={onGoToCosts} className="text-[12.5px] font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  View Full Availability <ChevronRight size={14} />
                </button>
              </div>

              <AvailabilityTable rows={mockAvailability} />
            </div>

            {/* ── 6. WHO IS THIS HOME PERFECT FOR ── */}
            <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
              <div>
                <h3 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">Who is this home perfect for?</h3>
                <p className="text-[12px] text-gray-500 font-medium mt-0.5">Based on lifestyle and space needs.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(perfectForList.length > 0
                  ? perfectForList.map((pf: string, i: number) => ({
                      title: pf,
                      desc: `Ideal lifestyle fit for ${pf.toLowerCase()}.`,
                      tag: `Optimal configuration`,
                      icon: defaultPerfectFor[i % defaultPerfectFor.length].icon
                    }))
                  : defaultPerfectFor
                ).map((item: any, i: number) => {
                  const Icon = item.icon
                  return (
                    <div key={i} className="p-5 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                          <Icon size={18} />
                        </div>
                        <h4 className="text-[14.5px] font-black text-gray-900 dark:text-white">{item.title}</h4>
                        <p className="text-[12px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{item.desc}</p>
                      </div>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 pt-1 border-t border-gray-100 dark:border-white/5">
                        ✓ {item.tag}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── 7. BOOK SITE VISIT CTA CARD ── */}
            <div className="bg-gradient-to-r from-gray-900 to-black dark:from-[#1c1815] dark:to-[#0f0e0d] text-white rounded-[24px] p-6 md:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center md:text-left">
                <h3 className="text-[19px] md:text-[22px] font-black tracking-tight">Want to see this floor plan in person?</h3>
                <p className="text-[12.5px] text-gray-300 font-medium">Book a private tour and experience the space, views and lifestyle.</p>
              </div>
              <button
                onClick={onGoToCosts}
                className="px-8 py-3.5 bg-white text-gray-900 hover:bg-gray-100 font-black rounded-2xl text-[13.5px] transition-all shadow-lg hover:scale-105 flex items-center gap-2 whitespace-nowrap"
              >
                <CalendarDays size={17} />
                Book Site Visit
              </button>
            </div>

          </div>
        )}

      </div>

    </div>
  )
}

// Simple fallback trophy icon if not imported
function TrophyIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
      <path d="M12 2a6 6 0 0 1 6 6v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z" />
    </svg>
  )
}
