/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
'use client'
import { useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Bed, Bath, Columns, Ruler, ZoomIn, ChevronDown, ChevronRight,
  Award, Maximize2, TrendingDown, CheckCircle2, Crown,
  Sparkles, Lightbulb, Shield, Car, User, Wind, Cpu, Droplet,
  Layout, Home, Users, Compass, Eye, Trophy, CalendarDays
} from 'lucide-react'
import type { ProjectDetail, UnitTypeSummary } from '@/types/project'
import { resolveImgUrl } from '@/lib/utils'

type FloorPlanImage = { id: string; url: string; caption?: string | null; bhk?: number | null; size_sqft?: number | null }
type LazyState<T> = { loaded: boolean; available: boolean; data: T | null; message?: string }

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
  const [filter, setFilter] = useState<number | 'all'>('all')
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [activePlanTab, setActivePlanTab] = useState<'floor' | 'details' | 'availability'>('floor')
  const [floorType, setFloorType] = useState<string>('Typical Floor')
  const [selectedTower, setSelectedTower] = useState<string>('Tower A')
  const [selectedUnitNo, setSelectedUnitNo] = useState<string>('Unit 3')

  const bhkOptions = [...new Set(unitTypes.map((u) => u.bhk))].sort((a, b) => a - b)
  const filteredUnits = filter === 'all' ? unitTypes : unitTypes.filter((u) => u.bhk === filter)

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
  const unitInventory = (detail as any)?.unit_inventory || []
  const filteredInventory = activeUnit?.id ? unitInventory.filter((u: any) => u.unit_type_id === activeUnit.id) : unitInventory
  type AvailabilityRow = { tower: string; floor: string; unitNo: string; facing: string; view: string; price: string; status: string }
  const mockAvailability: AvailabilityRow[] = filteredInventory.map((u: any) => ({
    tower: u.tower_name || '—',
    floor: u.floor_number ? String(u.floor_number) : '—',
    unitNo: u.unit_number || '—',
    facing: u.facing || '—',
    view: u.view || '—',
    price: priceLabel(activeUnit || {} as any),
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
    <div className="p-4 md:p-8 space-y-8 bg-[#F7F9FB] dark:bg-[#0f0e0d] text-gray-900 dark:text-gray-100 font-sans">

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
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
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
      </div>

      {/* ── 2. MAIN EXPLORER WORKSPACE (Left List + Right Detail Card) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN: Configuration Selection Sidebar */}
        <div className="lg:col-span-4 space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[14px] font-black text-gray-900 dark:text-white uppercase tracking-wider">All Configurations</h3>
            <span className="text-[11.5px] text-gray-400 font-bold">{unitTypes.length} options available</span>
          </div>

          <div className="space-y-3">
            {filteredUnits.map((unit, idx) => {
              const isSelected = activeUnit?.id === unit.id
              const badgeLabel = unit.category_badge || (idx === 0 ? 'BEST VALUE' : idx === 1 ? 'MOST POPULAR' : idx === 2 ? 'PREMIUM CHOICE' : 'LUXURY')
              const badgeBg = idx === 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : idx === 1 ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'

              return (
                <div
                  key={unit.id}
                  onClick={() => setSelectedUnitId(unit.id)}
                  className={`p-4 md:p-5 rounded-[20px] bg-white dark:bg-[#111] border transition-all cursor-pointer space-y-3 relative ${
                    isSelected
                      ? 'border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                      : 'border-gray-100 dark:border-white/5 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md ${badgeBg}`}>
                      {badgeLabel}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-[18px] font-black text-gray-900 dark:text-white leading-tight">{unit.name}</h4>
                    <div className="flex items-center gap-3 mt-1.5 text-[11.5px] text-gray-500 font-bold">
                      <span className="flex items-center gap-1"><Bed size={12} /> {unit.bhk} Beds</span>
                      <span className="flex items-center gap-1"><Bath size={12} /> {unit.bathrooms || unit.bhk} Baths</span>
                      {areaSqft(unit) && <span className="flex items-center gap-1"><Ruler size={12} /> {areaSqft(unit)!.toLocaleString()} sqft</span>}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[18px] font-black text-gray-900 dark:text-white leading-none">{priceLabel(unit)}</p>
                      <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Starting Price</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={onGoToOverview}
            className="w-full p-4 rounded-[20px] border border-dashed border-gray-300 dark:border-gray-800 bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 hover:border-gray-400 text-[12.5px] font-extrabold transition-all flex items-center justify-center gap-2"
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
                      onClick={() => setActivePlanTab(tab.id as any)}
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
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        value={floorType}
                        onChange={(e) => setFloorType(e.target.value)}
                        className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111] text-[12px] font-extrabold text-gray-800 dark:text-gray-200 cursor-pointer"
                      >
                        <option>Typical Floor</option>
                        <option>Refuge Floor</option>
                        <option>Penthouse Level</option>
                      </select>

                      <select
                        value={selectedTower}
                        onChange={(e) => setSelectedTower(e.target.value)}
                        className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111] text-[12px] font-extrabold text-gray-800 dark:text-gray-200 cursor-pointer"
                      >
                        {((activeUnit as any)?.tower_association && (activeUnit as any).tower_association.length > 0
                          ? (activeUnit as any).tower_association
                          : ['Tower A', 'Tower B', 'Tower C']
                        ).map((t: string) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>

                      <select
                        value={selectedUnitNo}
                        onChange={(e) => setSelectedUnitNo(e.target.value)}
                        className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111] text-[12px] font-extrabold text-gray-800 dark:text-gray-200 cursor-pointer"
                      >
                        <option>Type C</option>
                        <option>Type D</option>
                      </select>
                    </div>

                    <button
                      onClick={() => onViewFloorPlans(activeFloorPlans)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 text-[12px] font-black text-gray-800 dark:text-gray-200 flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <ZoomIn size={15} /> Download Plan
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
                      <p className="text-[16px] font-black text-gray-900 dark:text-white">{(activeUnit as any)?.built_up_area_sqft ? `${(activeUnit as any).built_up_area_sqft.toLocaleString()} sqft` : (carpetArea ? `${Math.round(carpetArea * 1.18).toLocaleString()} sqft` : '—')}</p>
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
                      <p className="text-[16px] font-black text-gray-900 dark:text-white">{(activeUnit as any)?.balconies || 1}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Utility Area</p>
                      <p className="text-[16px] font-black text-gray-900 dark:text-white">{(activeUnit as any)?.utility_area_sqft ? `${(activeUnit as any).utility_area_sqft} sqft` : '1'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Efficiency Rating</p>
                      <p className="text-[16px] font-black text-emerald-600 dark:text-emerald-400">{(activeUnit as any)?.efficiency_rating || 'Excellent'}</p>
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
                    <p className="text-[12px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Only {activeUnit.inventory_left || mockAvailability.length || 8} units available in {activeUnit.name}
                    </p>
                    <button onClick={onGoToCosts} className="text-[12px] font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      Inquire Specific Unit <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-gray-100 dark:border-white/5 rounded-2xl">
                    <table className="w-full text-left text-[12.5px] border-collapse">
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
                        {mockAvailability.length > 0 ? (
                          mockAvailability.map((row, i) => (
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
                </div>
              )}

            </div>

            {/* ── 3. CONFIGURATION DETAILS GRID ── */}
            <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
              <h3 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">Configuration Details</h3>

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
                  <p className="text-[16px] font-black text-gray-900 dark:text-white">{carpetArea ? `${Math.round(carpetArea * 1.18).toLocaleString()} sqft` : '—'}</p>
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
                  <p className="text-[16px] font-black text-gray-900 dark:text-white">{(activeUnit as any)?.balconies || 1}</p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Utility Area</p>
                  <p className="text-[16px] font-black text-gray-900 dark:text-white">{(activeUnit as any)?.utility_room ? '1' : '1'}</p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Entry</p>
                  <p className="text-[16px] font-black text-gray-900 dark:text-white">1</p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Floor Type</p>
                  <p className="text-[16px] font-black text-gray-900 dark:text-white">{floorType}</p>
                </div>
              </div>
            </div>

            {/* ── 4. KEY HIGHLIGHTS ── */}
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

            {/* ── 5. USABLE AREA EFFICIENCY (Donut Chart & Breakdown) ── */}
            <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
              <div>
                <h3 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">Usable Area Efficiency</h3>
                <p className="text-[12px] text-gray-500 font-medium mt-0.5">See how efficiently the space is utilized in this configuration.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Donut Visual + Legend */}
                <div className="md:col-span-8 p-5 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex flex-col sm:flex-row items-center gap-6">
                  {/* Donut */}
                  <div className="w-32 h-32 rounded-full border-[12px] border-blue-500 border-t-emerald-400 border-r-emerald-500 border-b-gray-300 flex items-center justify-center text-center flex-shrink-0 shadow-inner">
                    <div>
                      <span className="text-[22px] font-black text-gray-900 dark:text-white leading-none block">
                        {(activeUnit as any)?.carpet_to_super_ratio_pct ? Math.round((activeUnit as any).carpet_to_super_ratio_pct) : 69}%
                      </span>
                      <span className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest block mt-0.5">Usable Area</span>
                    </div>
                  </div>

                  {/* Legend Table */}
                  <div className="space-y-3 flex-1 w-full text-[12px] font-bold">
                    <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-white/5">
                      <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        Carpet Area (Usable)
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-900 dark:text-white font-black">{carpetArea || 968} sqft</span>
                        <span className="text-gray-400 text-[11px] font-semibold w-8 text-right">69%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-white/5">
                      <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        Balcony & Utility
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-900 dark:text-white font-black">{(balconyArea || 120) + 36} sqft</span>
                        <span className="text-gray-400 text-[11px] font-semibold w-8 text-right">11%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-700" />
                        Common Walls & Shaft
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-900 dark:text-white font-black">{area ? area - (carpetArea || 968) - (balconyArea || 120) : 271} sqft</span>
                        <span className="text-gray-400 text-[11px] font-semibold w-8 text-right">20%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Efficiency Ratio Grade Card */}
                <div className="md:col-span-4 p-5 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex flex-col items-center justify-center text-center space-y-2">
                  <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Efficiency Ratio</span>
                  <p className="text-[28px] font-black text-gray-900 dark:text-white leading-none">
                    {(activeUnit as any)?.carpet_to_super_ratio_pct ? Math.round((activeUnit as any).carpet_to_super_ratio_pct) : 69}%
                  </p>
                  <p className="text-[11px] text-gray-400 font-semibold">Higher is better</p>
                  <span className="px-3 py-1 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider mt-1">
                    Excellent
                  </span>
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
                    Only {activeUnit.inventory_left || 8} units left in this configuration
                  </p>
                </div>
                <button onClick={onGoToCosts} className="text-[12.5px] font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  View Full Availability <ChevronRight size={14} />
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-gray-100 dark:border-white/5 rounded-2xl">
                <table className="w-full text-left text-[12.5px] border-collapse">
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
                    {mockAvailability.map((row, i) => (
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
                    ))}
                  </tbody>
                </table>
              </div>
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
