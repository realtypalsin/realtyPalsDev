/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Bed, Bath, Columns, Ruler, ZoomIn, ChevronDown, ChevronRight,
  Award, Maximize2, TrendingDown, CheckCircle2, Crown,
  Sparkles, Lightbulb, Shield, Car, User, Wind, Cpu, Droplet,
  Layout, Home, Users, Compass, Eye, Trophy
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
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null)

  const bhkOptions = [...new Set(unitTypes.map((u) => u.bhk))].sort((a, b) => a - b)
  const filteredUnits = filter === 'all' ? unitTypes : unitTypes.filter((u) => u.bhk === filter)

  // Default expand the first item or 5 BHK if it exists
  const activeExpandedId = expandedUnitId ?? filteredUnits[0]?.id ?? null

  const getPricePerSqftStr = (u: UnitTypeSummary) => {
    const area = areaSqft(u)
    if (!area || u.price_min_cr == null) return '—'
    const minPps = Math.round((u.price_min_cr * 1e7) / area)
    const maxPps = u.price_max_cr ? Math.round((u.price_max_cr * 1e7) / area) : minPps
    if (minPps === maxPps) return `₹${minPps.toLocaleString()}`
    return `₹${minPps.toLocaleString()} – ${maxPps.toLocaleString()}`
  }

  // Matching floor plans
  const getUnitFloorPlans = (bhk: number) => {
    const matched = floorPlanImages.filter((img) =>
      img.bhk === bhk || img.caption?.toLowerCase().includes(`${bhk}bhk`) || img.caption?.toLowerCase().includes(`${bhk} bhk`)
    )
    return matched.length > 0 ? matched : floorPlanImages
  }

  // Pricing Insights computation
  const withPrice = unitTypes.filter((u) => u.price_min_cr != null)
  const withArea = unitTypes.filter((u) => areaSqft(u) != null)
  
  const lowestEntry = withPrice.length > 0 ? withPrice.reduce((a, b) => (a.price_min_cr! < b.price_min_cr! ? a : b)) : null
  const largest = withArea.length > 0 ? withArea.reduce((a, b) => (areaSqft(a)! > areaSqft(b)! ? a : b)) : null
  const bestValue = unitTypes.find(u => u.name.includes('Study')) || unitTypes[Math.min(1, unitTypes.length - 1)]
  const premium = withPrice.length > 0 ? withPrice.reduce((a, b) => ((b.price_max_cr ?? b.price_min_cr!) > (a.price_max_cr ?? a.price_min_cr!) ? b : a)) : null

  return (
    <div className="p-4 md:p-8 space-y-10 bg-gray-50/30 dark:bg-transparent">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[24px] font-black text-gray-900 dark:text-white tracking-tight">Available Configurations</h2>
          <p className="text-[13px] text-gray-500 mt-1">Choose the home that best fits your lifestyle.</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap bg-gray-100/80 dark:bg-gray-900/60 p-1 rounded-full border border-gray-200/50 dark:border-gray-800">
          <button
            onClick={() => { setFilter('all'); setExpandedUnitId(null); }}
            className={`text-[12px] font-bold px-4 py-1.5 rounded-full transition-all ${
              filter === 'all' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            All
          </button>
          {bhkOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => { setFilter(opt); setExpandedUnitId(null); }}
              className={`text-[12px] font-bold px-4 py-1.5 rounded-full transition-all ${
                filter === opt ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {opt} BHK
            </button>
          ))}
        </div>
      </div>

      {/* 2. Configurations Stack */}
      <div className="space-y-4">
        {filteredUnits.map((unit) => {
          const isExpanded = activeExpandedId === unit.id
          const area = areaSqft(unit)
          const floorPlans = getUnitFloorPlans(unit.bhk)
          const previewImg = floorPlans[0]
          
          // Cast dynamic highlights & properties
          const subtitleStr = unit.subtitle || 'Premium configuration designed for modern living.'
          const descStr = unit.description || 'Exquisite layout prioritizing comfort, privacy, and expansive living spaces.'
          const categoryBadge = unit.category_badge || 'Premium Configuration'
          const inventoryLeft = unit.inventory_left || 8
          const perfectFor = unit.perfect_for || ['Families', 'End Users']
          const highlightsList = unit.key_highlights || []
          const includedList = unit.whats_included || []
          const viewsList = unit.views || []

          return (
            <div
              key={unit.id}
              className={`rounded-[24px] border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#131211] shadow-sm overflow-hidden transition-all duration-300 ${
                isExpanded ? 'ring-2 ring-gray-100 dark:ring-gray-900/50 shadow-md' : 'hover:shadow-md'
              }`}
            >
              {/* Header Toggle Row */}
              <div
                onClick={() => setExpandedUnitId(isExpanded ? '' : unit.id)}
                className="w-full flex items-center justify-between gap-5 p-5 md:p-6 cursor-pointer select-none"
              >
                <div className="flex items-center gap-4">
                  {/* Collapsed Floorplan Outline */}
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center">
                    {previewImg ? (
                      <Image src={resolveImgUrl(previewImg.url)} alt={unit.name} fill className="object-cover opacity-80" />
                    ) : (
                      <Layout size={18} className="text-gray-400" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-[16px] font-bold text-gray-900 dark:text-white">{unit.name}</h3>
                    <div className="flex items-center gap-3.5 mt-1 text-[12px] text-gray-500 font-medium">
                      <span className="flex items-center gap-1"><Bed size={12} /> {unit.bhk} Beds</span>
                      {unit.bathrooms != null && <span className="flex items-center gap-1"><Bath size={12} /> {unit.bathrooms} Baths</span>}
                      {area && <span className="flex items-center gap-1"><Ruler size={12} /> {area.toLocaleString()} sqft</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[16px] font-black text-gray-900 dark:text-white">{priceLabel(unit)}</p>
                    {!isExpanded && <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Starting Price</p>}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center border border-gray-100 dark:border-gray-800 text-gray-500">
                    <ChevronDown size={16} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>

              {/* Expanded Area */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="border-t border-gray-50 dark:border-gray-850 overflow-hidden"
                  >
                    <div className="p-6 md:p-8 space-y-8">
                      {/* Configuration Details Container */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Left Column: Floorplan Thumbnail */}
                        <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900/40 rounded-[20px] border border-gray-100 dark:border-gray-800/80">
                          {previewImg ? (
                            <div className="relative w-full h-[240px] md:h-[280px]">
                              <Image src={resolveImgUrl(previewImg.url)} alt="Floor plan" fill className="object-contain" />
                            </div>
                          ) : (
                            <div className="w-full h-[240px] flex items-center justify-center">
                              <Layout size={40} className="text-gray-300" />
                            </div>
                          )}
                          <button
                            onClick={() => onViewFloorPlans(floorPlans)}
                            className="mt-4 px-5 py-2 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-[12px] font-bold rounded-full shadow-sm transition-all flex items-center gap-1.5"
                          >
                            <ZoomIn size={13} />
                            View Larger
                          </button>
                        </div>

                        {/* Right Column: Key Details */}
                        <div className="lg:col-span-8 space-y-6">
                          <div className="flex items-start justify-between flex-wrap gap-4">
                            <div>
                              <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded">
                                {categoryBadge}
                              </span>
                              <h2 className="text-[28px] font-black text-gray-900 dark:text-white tracking-tight mt-2">{unit.name}</h2>
                              <div className="flex items-center gap-4 mt-2 text-[13px] text-gray-500 font-medium">
                                <span className="flex items-center gap-1"><Bed size={14} className="text-gray-400" /> {unit.bhk} Beds</span>
                                {unit.bathrooms != null && <span className="flex items-center gap-1"><Bath size={14} className="text-gray-400" /> {unit.bathrooms} Baths</span>}
                                {area && <span className="flex items-center gap-1"><Ruler size={14} className="text-gray-400" /> {area.toLocaleString()} sqft</span>}
                              </div>
                            </div>
                            
                            <div className="text-left lg:text-right">
                              <span className="text-[28px] font-black text-gray-900 dark:text-white tracking-tight">{priceLabel(unit)}</span>
                              <p className="text-[11px] text-gray-400 mt-1 font-medium">Price range</p>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="text-[14px] text-gray-800 dark:text-gray-200 leading-relaxed font-bold">
                              {subtitleStr}
                            </p>
                            <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
                              {descStr}
                            </p>
                          </div>

                          {/* Key Highlights box */}
                          {highlightsList.length > 0 && (
                            <div className="bg-[#FFFBEB] dark:bg-[#2c2211] border border-amber-100 dark:border-amber-900/30 rounded-[20px] p-5">
                              <h4 className="text-[12px] font-extrabold uppercase tracking-widest text-[#D97706] dark:text-[#fbbf24] mb-3 flex items-center gap-1.5">
                                <Lightbulb size={13} strokeWidth={2.5} />
                                Key Highlights
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {highlightsList.map((hl: any, idx: number) => {
                                  const IconComponent = ICON_MAP[hl.icon] || Sparkles
                                  return (
                                    <div key={idx} className="flex gap-2">
                                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-900/50 flex items-center justify-center flex-shrink-0 text-amber-600 border border-amber-100/30 dark:border-amber-900/10">
                                        <IconComponent size={14} />
                                      </div>
                                      <div>
                                        <p className="text-[12px] font-bold text-gray-900 dark:text-white leading-tight">{hl.title}</p>
                                        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{hl.description}</p>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Data/Metrics Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/10 rounded-2xl overflow-hidden p-1.5">
                            {[
                              { label: 'Super Area', val: unit.super_area_sqft ? `${unit.super_area_sqft.toLocaleString()} sqft` : '—' },
                              { label: 'Carpet Area', val: unit.carpet_area_sqft ? `${unit.carpet_area_sqft.toLocaleString()} sqft` : '—' },
                              { label: 'Starting Price', val: unit.price_min_cr ? `₹${unit.price_min_cr.toFixed(2)} Cr` : '—' },
                              { label: 'Price Range', val: priceLabel(unit) },
                              { label: 'Price / Sqft', val: getPricePerSqftStr(unit) }
                            ].map((met, idx) => (
                              <div key={idx} className="p-3 text-center">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{met.label}</p>
                                <p className="text-[13px] font-black text-gray-900 dark:text-white mt-1.5">{met.val}</p>
                              </div>
                            ))}
                          </div>

                          {/* Availability Banner */}
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#EEF2F6] dark:bg-[#1E1B4B]/30 border border-indigo-100/30 dark:border-indigo-900/20 px-5 py-3 rounded-2xl">
                            <span className="text-[12px] font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                              <Compass size={14} className="animate-spin-slow" />
                              Only {inventoryLeft} units left in this configuration
                            </span>
                            <button
                              onClick={onGoToCosts}
                              className="text-[11px] font-extrabold text-indigo-700 dark:text-indigo-400 hover:underline"
                            >
                              View Availability
                            </button>
                          </div>

                          {/* What's Included */}
                          {includedList.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-[13px] font-bold text-gray-900 dark:text-white uppercase tracking-wider">What&apos;s Included</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
                                {includedList.map((inc: any, idx: number) => {
                                  const IconComp = ICON_MAP[inc.icon] || CheckCircle2
                                  return (
                                    <div key={idx} className="flex gap-2.5 p-3.5 bg-gray-50/50 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800/80 rounded-xl">
                                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-900 flex items-center justify-center text-[#6366F1] flex-shrink-0 shadow-sm border border-gray-100/50 dark:border-gray-800">
                                        <IconComp size={15} />
                                      </div>
                                      <div>
                                        <p className="text-[12px] font-bold text-gray-900 dark:text-white leading-tight">{inc.title}</p>
                                        <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{inc.description}</p>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Floor Plan & Views */}
                          <div className="space-y-3">
                            <h4 className="text-[13px] font-bold text-gray-900 dark:text-white uppercase tracking-wider">Floor Plan & Views</h4>
                            <p className="text-[12px] text-gray-400 mt-1">Understand your space and the view you&apos;ll wake up to.</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-1.5">
                              {/* Left side: Typical Floor Plan */}
                              <div className="md:col-span-5 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 bg-gray-50/50 dark:bg-gray-900/10 flex flex-col justify-between">
                                {previewImg ? (
                                  <div className="relative w-full h-[180px] cursor-pointer" onClick={() => onViewFloorPlans(floorPlans)}>
                                    <Image src={resolveImgUrl(previewImg.url)} alt="Typical Floor Plan" fill className="object-contain" />
                                  </div>
                                ) : (
                                  <div className="h-[180px] flex items-center justify-center">
                                    <Layout size={32} className="text-gray-300" />
                                  </div>
                                )}
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                                  <p className="text-[12px] font-bold text-gray-900 dark:text-white">Typical Floor Plan</p>
                                  <p className="text-[11px] text-gray-450 mt-0.5">Tower A · Even Floors</p>
                                </div>
                              </div>

                              {/* Right side: View From This Home */}
                              <div className="md:col-span-7 space-y-3 flex flex-col justify-between">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">View From This Home</p>
                                <div className="grid grid-cols-3 gap-2.5 flex-1">
                                  {viewsList.length > 0 ? (
                                    viewsList.map((vw: any, idx: number) => (
                                      <div key={idx} className="group relative rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 aspect-[3/4] flex flex-col justify-end bg-gray-100">
                                        <Image src={resolveImgUrl(vw.image_url)} alt={vw.title} fill className="object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all z-20">
                                          <Eye size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <div className="absolute bottom-0 inset-x-0 p-2.5 z-20">
                                          <p className="text-[11px] text-white font-bold leading-tight truncate">{vw.title}</p>
                                          <p className="text-[9px] text-white/70 mt-0.5 leading-none truncate">{vw.subtitle}</p>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    [1, 2, 3].map((i) => (
                                      <div key={i} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 flex items-center justify-center aspect-[3/4]">
                                        <Eye size={16} className="text-gray-300" />
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Who This Home Is Perfect For */}
                          <div className="space-y-2">
                            <h4 className="text-[13px] font-bold text-gray-900 dark:text-white uppercase tracking-wider">Who This Home Is Perfect For</h4>
                            <p className="text-[12px] text-gray-400 font-medium">Based on lifestyle and space needs.</p>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {perfectFor.map((perf: string, idx: number) => (
                                <span key={idx} className="text-[11.5px] font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800 px-3.5 py-1.5 rounded-full">
                                  {perf}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Want to see this home in person? CTA */}
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 dark:border-gray-800 pt-6 mt-4">
                            <div>
                              <p className="text-[13px] font-bold text-gray-900 dark:text-white">Want to see this home in person?</p>
                              <p className="text-[12px] text-gray-400 mt-0.5 font-medium">Book a private tour and experience the space, views and lifestyle.</p>
                            </div>
                            <button
                              onClick={onGoToCosts}
                              className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl text-[13px] hover:bg-black dark:hover:bg-gray-100 transition-all flex items-center gap-1.5 shadow-sm"
                            >
                              <CheckCircle2 size={14} />
                              Book Site Visit
                            </button>
                          </div>

                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* 3. Pricing Insights Grid */}
      <div className="space-y-4">
        <div>
          <h3 className="text-[18px] font-bold text-gray-900 dark:text-white tracking-tight">Pricing Insights</h3>
          <p className="text-[12px] text-gray-500 mt-1">Derived from this project&apos;s unit configurations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: TrendingDown,
              label: 'Lowest Entry Price',
              val: lowestEntry ? priceLabel(lowestEntry) : '₹2.01 Cr',
              tag: lowestEntry ? lowestEntry.name : '3 BHK',
              badge: '3.2% vs last month',
              badgeColor: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100/50'
            },
            {
              icon: Maximize2,
              label: 'Largest Configuration',
              val: largest ? `${areaSqft(largest)!.toLocaleString()} sqft` : '2,500 sqft',
              tag: largest ? largest.name : '5 BHK',
              badge: 'Most Preferred',
              badgeColor: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100/50'
            },
            {
              icon: Award,
              label: 'Best Value Configuration',
              val: bestValue ? bestValue.name : '3.5 BHK',
              tag: bestValue ? priceLabel(bestValue) : '₹2.36 Cr+',
              badge: "Buyer's Choice",
              badgeColor: 'text-amber-700 bg-amber-50 dark:bg-amber-950/30 border-amber-100/50'
            },
            {
              icon: Crown,
              label: 'Premium Configuration',
              val: premium ? premium.name : '5 BHK',
              tag: premium ? priceLabel(premium) : '₹3.40 – 4.50 Cr',
              badge: 'Premium Living',
              badgeColor: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100/50'
            }
          ].map((ins, idx) => (
            <div key={idx} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#131211] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100/80 dark:border-gray-800 flex items-center justify-center text-gray-500">
                  <ins.icon size={16} />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${ins.badgeColor}`}>
                  {ins.badge}
                </span>
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">{ins.label}</p>
              <p className="text-[20px] font-black text-gray-900 dark:text-white mt-2 leading-none">{ins.val}</p>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-2 font-medium">{ins.tag} · Optimal space vs price</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-blue-50/20 dark:bg-blue-950/10 border border-blue-100/30 dark:border-blue-900/30 px-5 py-4.5 rounded-2xl mt-4">
          <span className="text-[12px] text-gray-650 dark:text-gray-400 font-medium">
            Prices and availability are dynamic. Connect with our advisor for real-time information.
          </span>
          <button
            onClick={onGoToCosts}
            className="text-[12px] font-extrabold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            Talk to Advisor <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* 4. Amenities & Lifestyle */}
      <div className="space-y-4 pt-2">
        <div>
          <h3 className="text-[18px] font-bold text-gray-900 dark:text-white tracking-tight">Amenities & Lifestyle</h3>
          <p className="text-[12px] text-gray-500 mt-1">Designed for active well-being.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {(detail?.all_amenities || []).slice(0, 6).map((am, idx) => {
            const getIcon = (cat: string) => {
              if (cat === 'sports') return Trophy
              if (cat === 'lifestyle') return Home
              if (cat === 'wellness') return Sparkles
              if (cat === 'kids') return Users
              if (cat === 'security') return Shield
              if (cat === 'parking') return Car
              return Compass
            }
            const Icon = getIcon(am.category)
            return (
              <div key={idx} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#131211] p-4 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-600 dark:text-gray-300 mb-2.5">
                  <Icon size={16} />
                </div>
                <p className="text-[12px] font-bold text-gray-900 dark:text-white leading-tight">{am.name}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-medium leading-none uppercase tracking-wider">{am.category}</p>
              </div>
            )
          })}
        </div>

        <div className="flex justify-center pt-2">
          <button
            onClick={onGoToOverview}
            className="px-6 py-2 border border-gray-200 dark:border-gray-850 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-[12px] font-bold rounded-full transition-all"
          >
            {`View All ${detail?.all_amenities?.length ? `${detail.all_amenities.length}+ ` : ''}Amenities`}
          </button>
        </div>
      </div>

      {/* 5. Still Deciding Banner */}
      <div className="bg-gray-50 dark:bg-gray-900/30 rounded-[24px] p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-gray-100 dark:border-gray-800">
        <div>
          <h4 className="text-[15px] font-bold text-gray-950 dark:text-white">Still deciding?</h4>
          <p className="text-[12px] text-gray-500 mt-0.5">Let our AI advisor help you compare configurations and find your perfect home.</p>
        </div>
        <button
          onClick={onGoToCosts}
          className="px-6 py-3 bg-gray-950 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-950 text-[13px] font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
        >
          <Sparkles size={14} />
          Ask AI Advisor
        </button>
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
