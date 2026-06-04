'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import {
  X, CheckCircle2, Clock, Shield, MapPin, Building2, Award,
  Ruler, BedDouble, Bath, ChevronRight, ExternalLink,
  Sparkles, Star, Trophy, Layers, Phone, TrendingUp, Calendar,
  FileText, Route, BarChart3, ZoomIn,
} from 'lucide-react'
import {
  Subway, AirplaneTakeoff, Path, Buildings, Heart, Tree,
  SoccerBall, Leaf, Baby, SealCheck, MapTrifold,
  Car, GraduationCap, ShoppingBag, Bank, BookOpen,
  Dumbbell, Star as StarPhosphor,
} from '@phosphor-icons/react'
import type { ProjectCard as ProjectCardType, ProjectDetail } from '@/types/project'
import { API_BASE } from '@/lib/env'
import { buildWhatsAppUrl } from '@/lib/whatsapp'
import { getAqi, type AqiResult } from '@/lib/waqi'
import AmenityIcon from '@/components/AmenityIcon'
import SiteVisitScheduler from '@/components/SiteVisitScheduler'
import BuilderReputationCard from '@/components/BuilderReputationCard'
import CommuteCalculator from '@/components/CommuteCalculator'
import MarketComparison from '@/components/MarketComparison'
import DocumentQA from '@/components/DocumentQA'
import FloorPlanViewer from '@/components/FloorPlanViewer'

interface Props {
  project: ProjectCardType | null
  onClose: () => void
  inline?: boolean
}

const AMENITY_ICONS: Record<string, React.ElementType> = {
  sports:    Dumbbell,
  lifestyle: StarPhosphor,
  wellness:  Leaf,
  kids:      Baby,
  security:  SealCheck,
  parking:   Car,
}

const CONN_ICONS: Record<string, React.ElementType> = {
  metro:      Subway,
  airport:    AirplaneTakeoff,
  road:       Path,
  school:     GraduationCap,
  hospital:   Heart,
  mall:       ShoppingBag,
  landmark:   Bank,
  university: BookOpen,
}

const AMENITY_COLORS: Record<string, string> = {
  sports:    'bg-gray-50 text-gray-500 border-gray-200',
  lifestyle: 'bg-gray-50 text-gray-500 border-gray-200',
  wellness:  'bg-gray-50 text-gray-500 border-gray-200',
  kids:      'bg-gray-50 text-gray-500 border-gray-200',
  security:  'bg-gray-50 text-gray-500 border-gray-200',
  parking:   'bg-gray-50 text-gray-500 border-gray-200',
}

const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

const SECTOR_PRICE_HISTORY: Record<string, {
  trend: string
  avgPriceRange: string
  yoyGrowth: string
  note: string
  outlook: string
}> = {
  'Sector 150': {
    trend: 'Strong Appreciation',
    avgPriceRange: '₹8,000 – 17,000/sqft',
    yoyGrowth: '+12–18% YoY',
    note: "Noida Expressway's premium corridor. Metro Phase III proximity, DND access, and branded developer concentration drive above-average appreciation.",
    outlook: 'Continued outperformance expected. Limited land supply.',
  },
  'Sector 137': {
    trend: 'Steady Growth',
    avgPriceRange: '₹5,500 – 11,000/sqft',
    yoyGrowth: '+8–14% YoY',
    note: 'Established sector with most inventory delivered. Good rental yield driven by IT park proximity (Infosys, TCS campuses nearby).',
    outlook: 'Stable. Most projects ready-to-move — capital preservation market.',
  },
  'Sector 78': {
    trend: 'Mixed — Luxury Segment Leading',
    avgPriceRange: '₹5,000 – 18,000/sqft',
    yoyGrowth: '+6–12% YoY',
    note: 'Wide price band due to product mix from premium to ultra-luxury. Central Noida location with strong connectivity.',
    outlook: 'Luxury sub-segment outperforming. Entry-level segment stable.',
  },
}

const SECTION_TABS = ['Overview', 'Units', 'Amenities', 'Builder', 'Commute', 'Docs'] as const
type Tab = typeof SECTION_TABS[number]

export default function ProjectDetailPanel({ project, onClose, inline }: Props) {
  const [detail, setDetail] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [imgIdx, setImgIdx] = useState(0)
  const [showVisitScheduler, setShowVisitScheduler] = useState(false)
  const [showFloorPlan, setShowFloorPlan] = useState<{ plans: Array<{ id: string; url: string; caption?: string | null }> } | null>(null)
  const [aqi, setAqi] = useState<AqiResult | null>(null)

  useEffect(() => {
    if (!project) { setDetail(null); return }
    setLoading(true)
    setActiveTab('Overview')
    setImgIdx(0)
    setAqi(null)
    fetch(`${API_BASE}/projects/${project.slug}`)
      .then((r) => r.json())
      .then((data) => setDetail(data.project ?? null))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
  }, [project?.slug])

  useEffect(() => {
    if (!project) return
    getAqi(project.lat, project.lng, 'noida').then(setAqi).catch(() => {})
  }, [project?.slug])

  const isOpen = !!project

  const heroImages = detail?.images?.filter((i) => i.type === 'hero' || i.type === 'exterior') ?? []
  const allImages  = detail?.images ?? []
  const currentImg = allImages[imgIdx]?.url ?? project?.hero_image_url

  const d = detail ?? project

  const isRTM = d?.status === 'ready_to_move'
  const isNew = d?.status === 'new_launch'

  const PanelWrapper = inline
    ? ({ children }: { children: React.ReactNode }) => (
        <div className="bg-[#fafafa] rounded-2xl shadow-sm overflow-hidden flex flex-col">
          {children}
        </div>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', ease: 'easeOut', duration: 0.28 }}
          className="fixed right-0 top-0 h-full w-full sm:w-[600px] lg:w-[680px] xl:w-[720px] bg-[#fafafa] shadow-2xl z-50 flex flex-col overflow-hidden"
        >
          {children}
        </motion.div>
      )

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — hidden in inline mode */}
          {!inline && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={onClose}
            />
          )}

          {/* Panel */}
          <PanelWrapper>
            {/* Header */}
            <div className="relative flex-shrink-0">
              {/* Hero image */}
              <div className="relative h-72 bg-gray-100 overflow-hidden">
                {currentImg ? (
                  <Image src={currentImg} alt={d?.name ?? ''} fill unoptimized className="object-cover" sizes="600px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                    <Building2 size={48} className="text-blue-200" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Image carousel dots */}
                {allImages.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {allImages.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setImgIdx(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIdx ? 'bg-white w-4' : 'bg-white/40'}`}
                      />
                    ))}
                  </div>
                )}

                {/* Status */}
                <div className={`absolute top-3 left-3 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-sm ${
                  isRTM ? 'bg-emerald-500/90 text-white' : isNew ? 'bg-blue-500/90 text-white' : 'bg-amber-500/90 text-white'
                }`}>
                  {isRTM ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                  {isRTM ? 'Ready to Move' : isNew ? 'New Launch' : 'Under Construction'}
                </div>

                {d?.rera_number && (() => {
                  const reraUrl = d?.rera_url ?? `https://www.up-rera.in/index_ui.aspx#sec/SearchProject?projectname=&rerano=${d.rera_number}`
                  const content = (
                    <>
                      <Shield size={10} />
                      RERA {d.rera_number}
                      {reraUrl && <ExternalLink size={8} className="ml-0.5 opacity-80" />}
                    </>
                  )
                  return reraUrl ? (
                    <a
                      href={reraUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-3 right-12 flex items-center gap-1 text-[10px] font-bold text-white bg-blue-600/90 backdrop-blur-sm px-2 py-1 rounded-lg hover:bg-blue-500/90 transition-colors cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {content}
                    </a>
                  ) : (
                    <div className="absolute top-3 right-12 flex items-center gap-1 text-[10px] font-bold text-white bg-blue-600/90 backdrop-blur-sm px-2 py-1 rounded-lg">
                      {content}
                    </div>
                  )
                })()}

                {/* Close */}
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Name bar */}
              <div className="px-5 pt-4 pb-3 border-b border-gray-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">{d?.name}</h2>
                    {d?.tagline && <p className="text-[12px] text-blue-600 font-semibold mt-0.5">{d.tagline}</p>}
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-400">
                      <MapPin size={11} className="text-gray-300" />
                      {d?.builder.name} · {d?.sector}, {d?.city}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[22px] font-black text-gray-900 tracking-tight leading-none">{d?.price_range_label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{[...new Set(d?.unit_types.map((u) => `${u.bhk}BHK`))].join(' · ')}</p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-0.5 mt-4 bg-gray-100 rounded-xl p-1">
                  {SECTION_TABS.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                        activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-700'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Body — scrollable */}
            <div className={inline ? 'bg-[#fafafa]' : 'flex-1 overflow-y-auto bg-[#fafafa]'}>
              {loading && (
                <div className="p-5 space-y-4 animate-pulse">
                  {/* Title skeleton */}
                  <div className="h-4 bg-gray-100 rounded-xl w-3/4" />
                  <div className="h-3 bg-gray-100 rounded-xl w-1/2" />
                  {/* Stats skeleton */}
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-gray-100 rounded-2xl h-20" />
                    ))}
                  </div>
                  {/* Connectivity skeleton */}
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 py-1.5">
                        <div className="w-7 h-7 bg-gray-100 rounded-lg flex-shrink-0" />
                        <div className="h-3 bg-gray-100 rounded flex-1" />
                        <div className="h-3 bg-gray-100 rounded w-12" />
                      </div>
                    ))}
                  </div>
                  {/* Description skeleton */}
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-full" />
                    <div className="h-3 bg-gray-100 rounded w-4/5" />
                    <div className="h-3 bg-gray-100 rounded w-3/5" />
                  </div>
                </div>
              )}

              {!loading && activeTab === 'Overview' && (
                <div className="p-5 space-y-6">
                  {/* Key stats */}
                  <div className="grid grid-cols-3 gap-3.5">
                    {[
                      { label: 'Towers', value: d?.total_towers ? `${d.total_towers}` : '—' },
                      { label: 'Units', value: (detail?.total_units ?? (d as any)?.total_units) ? `${(detail?.total_units ?? (d as any)?.total_units)}` : '—' },
                      { label: 'Land', value: d?.land_area_acres ? `${d.land_area_acres} Ac` : '—' },
                    ].map((s) => (
                      <div key={s.label} className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
                        <p className="text-[20px] font-black text-gray-900">{s.value}</p>
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5 uppercase tracking-wider">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Design team */}
                  {(d?.architect || d?.interior_designer) && (
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Design Team</p>
                      <div className="flex flex-wrap gap-2">
                        {d.architect && (
                          <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-[11px] font-semibold px-3 py-1.5 rounded-full border border-indigo-100">
                            <Sparkles size={11} />
                            {d.architect} (Architect)
                          </span>
                        )}
                        {d.interior_designer && (
                          <span className="flex items-center gap-1.5 bg-purple-50 text-purple-700 text-[11px] font-semibold px-3 py-1.5 rounded-full border border-purple-100">
                            <Star size={11} />
                            {d.interior_designer} (Interior)
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {(detail?.long_description ?? project?.tagline) && (
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">About</p>
                      <p className="text-[13px] text-gray-600 leading-relaxed">
                        {detail?.long_description ?? project?.tagline}
                      </p>
                    </div>
                  )}

                  {/* Connectivity */}
                  {(detail?.all_connectivity ?? d?.top_connectivity ?? []).length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Connectivity</p>
                      <div className="space-y-2">
                        {(detail?.all_connectivity ?? d?.top_connectivity ?? []).map((c: any) => {
                          const Icon = CONN_ICONS[c.type] ?? Path
                          return (
                            <div key={c.name} className="flex items-center gap-3 text-[12px] text-gray-600 py-1.5 border-b border-gray-50 last:border-0">
                              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <Icon size={14} weight="duotone" className="text-blue-500" />
                              </div>
                              <span className="flex-1">{c.name}</span>
                              {c.distance_km && <span className="text-gray-400 text-[11px]">{c.distance_km} km</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* USPs */}
                  {(detail?.marketing_claims ?? (d as any)?.marketing_claims ?? []).length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Key Highlights</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(detail?.marketing_claims ?? (d as any)?.marketing_claims ?? []).map((c: string) => (
                          <span key={c} className="flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full font-medium">
                            <ChevronRight size={10} />
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price Trends */}
                  {(() => {
                    const sectorKey = d?.sector ?? ''
                    const priceData = SECTOR_PRICE_HISTORY[sectorKey] ?? null
                    if (!priceData) return null
                    return (
                      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-100">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <TrendingUp size={14} className="text-emerald-600" strokeWidth={2} />
                          </div>
                          <p className="text-[12px] font-bold text-gray-700">Price Trends — {sectorKey}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="bg-white rounded-xl p-2.5 border border-emerald-50">
                            <p className="text-[18px] font-black text-emerald-600">{priceData.yoyGrowth}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Year-on-year</p>
                          </div>
                          <div className="bg-white rounded-xl p-2.5 border border-emerald-50">
                            <p className="text-[13px] font-bold text-gray-900 leading-tight">{priceData.avgPriceRange}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Avg. price/sqft</p>
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-600 leading-relaxed mb-1.5">{priceData.note}</p>
                        <p className="text-[11px] text-emerald-700 font-semibold">Outlook: {priceData.outlook}</p>
                        <p className="text-[9px] text-gray-400 mt-2">* Indicative market data. Verify with RERA and registered valuers before purchase decisions.</p>
                      </div>
                    )
                  })()}

                  {/* Air Quality */}
                  {aqi && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 bg-sky-50 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-500"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>
                        </div>
                        <p className="text-[12px] font-bold text-gray-700 dark:text-gray-200">Air Quality Index</p>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">{aqi.station}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className={`text-[28px] font-black ${aqi.color}`}>{aqi.aqi}</p>
                        <div>
                          <p className={`text-[13px] font-bold ${aqi.color}`}>{aqi.label}</p>
                          {aqi.dominantPollutant && (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">Main: {aqi.dominantPollutant.toUpperCase()}</p>
                          )}
                        </div>
                      </div>
                      <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1">0–50 Good · 51–100 Moderate · 101–150 Sensitive · 151+ Unhealthy</p>
                    </div>
                  )}

                  {/* Quick commute teaser */}
                  <div
                    onClick={() => setActiveTab('Commute')}
                    className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl p-3.5 cursor-pointer hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Route size={16} className="text-blue-500" />
                      <div>
                        <p className="text-xs font-semibold text-gray-800">Commute Calculator</p>
                        <p className="text-[10px] text-gray-400">How long from here to your office?</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-blue-400" />
                  </div>

                  {/* Market comparison */}
                  {d?.sector && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <BarChart3 size={14} className="text-blue-500" />
                        <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Market Comparison</p>
                      </div>
                      <MarketComparison
                        sector={d.sector}
                        city={d.city}
                        projectName={d.name}
                      />
                    </div>
                  )}
                </div>
              )}

              {!loading && activeTab === 'Units' && (
                <div className="p-5 space-y-4">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Unit Configurations</p>

                  {(d?.unit_types ?? []).map((u, i) => (
                    <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                      <div className="bg-gradient-to-r from-gray-50 to-blue-50/30 px-5 py-3 flex items-center justify-between border-b border-gray-100">
                        <span className="text-[13px] font-bold text-gray-900">{u.name}</span>
                        <span className="text-[13px] font-black text-blue-600">
                          {u.price_label ?? (u.price_min_cr != null && u.price_max_cr != null
                            ? u.price_min_cr === u.price_max_cr
                              ? `₹${u.price_min_cr.toFixed(2)} Cr`
                              : `₹${u.price_min_cr.toFixed(2)} – ${u.price_max_cr.toFixed(2)} Cr`
                            : 'Price on request')}
                        </span>
                      </div>
                      <div className="px-5 py-4 grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-[12px] text-gray-600">
                          <BedDouble size={14} className="text-gray-400" />
                          <span>{u.bhk} Bedrooms</span>
                        </div>
                        {u.super_area_sqft && (
                          <div className="flex items-center gap-2 text-[12px] text-gray-600">
                            <Ruler size={14} className="text-gray-400" />
                            <span>{u.super_area_sqft.toLocaleString()} sqft super</span>
                          </div>
                        )}
                        {u.carpet_area_sqft && (
                          <div className="flex items-center gap-2 text-[12px] text-gray-600">
                            <Layers size={14} className="text-gray-400" />
                            <span>{u.carpet_area_sqft.toLocaleString()} sqft carpet</span>
                          </div>
                        )}
                      </div>

                      {/* Floor plan */}
                      {(() => {
                        const allFloorImages = detail?.images?.filter((img) => img.type === 'floor_plan') ?? []
                        const bhkStr = String(u.bhk)
                        const matchedFloorImages = allFloorImages.filter((img) => {
                          const cap = img.caption?.toLowerCase() ?? ''
                          return cap.includes(`${bhkStr}bhk`) || cap.includes(`${bhkStr} bhk`)
                        })
                        const floorImages = matchedFloorImages.length > 0 ? matchedFloorImages : allFloorImages
                        if (floorImages.length === 0) {
                          return (
                            <div className="mx-5 mb-5 rounded-2xl bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 border border-dashed border-blue-100 h-44 flex flex-col items-center justify-center gap-2">
                              <Layers size={24} className="text-gray-300" />
                              <p className="text-[11px] text-gray-400 font-medium">Floor Plan</p>
                              <p className="text-[10px] text-gray-300">Not available yet</p>
                            </div>
                          )
                        }
                        return (
                          <div className="mx-5 mb-5 relative cursor-pointer rounded-2xl overflow-hidden group" onClick={() => setShowFloorPlan({ plans: floorImages })}>
                            <Image src={floorImages[0].url} alt="Floor plan" width={400} height={250} unoptimized className="w-full h-44 object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 bg-white/90 rounded-full px-4 py-2 flex items-center gap-2 text-xs font-semibold text-gray-700">
                                <ZoomIn size={14} /> View Floor Plan
                              </div>
                            </div>
                            {floorImages.length > 1 && (
                              <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
                                +{floorImages.length} plans
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  ))}
                </div>
              )}

              {!loading && activeTab === 'Amenities' && (
                <div className="p-5">
                  {Object.entries(
                    ((detail?.all_amenities ?? d?.top_amenities ?? []) as { name: string; category: string }[]).reduce(
                      (acc, a) => { (acc[a.category] = acc[a.category] ?? []).push(a.name); return acc },
                      {} as Record<string, string[]>
                    )
                  ).map(([cat, names]) => {
                    const Icon = AMENITY_ICONS[cat] ?? Buildings
                    const colorClass = AMENITY_COLORS[cat] ?? 'bg-gray-50 text-gray-600 border-gray-100'
                    const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1)
                    return (
                      <div key={cat} className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${colorClass}`}>
                            <Icon size={13} weight="duotone" />
                          </div>
                          <p className="text-[12px] font-bold text-gray-700 uppercase tracking-wider">{catLabel}</p>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                          {(names as string[]).map((name: string) => (
                            <AmenityIcon key={name} amenity={name} size="md" showLabel={true} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {!loading && activeTab === 'Builder' && (() => {
                const b = detail?.builder_detail
                if (!b) return (
                  <div className="p-5 text-center text-gray-400 text-sm py-20">Loading builder details...</div>
                )
                return (
                  <div className="p-5 space-y-5">
                    {/* Builder header */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
                      <h3 className="text-[18px] font-black text-gray-900">{b.name}</h3>
                      {b.tagline && <p className="text-[12px] text-blue-600 font-semibold mt-0.5">{b.tagline}</p>}
                      {b.description && <p className="text-[12px] text-gray-600 mt-2 leading-relaxed">{b.description}</p>}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      {b.founded_year && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[18px] font-black text-gray-900">{b.founded_year}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Founded</p>
                        </div>
                      )}
                      {b.delivered_units && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[18px] font-black text-gray-900">{b.delivered_units.toLocaleString()}+</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Delivered Units</p>
                        </div>
                      )}
                      {b.headquarters && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[14px] font-bold text-gray-900">{b.headquarters}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Headquarters</p>
                        </div>
                      )}
                      {b.credai_member && (
                        <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                          <div className="flex items-center gap-1.5">
                            <SealCheck size={16} weight="duotone" className="text-green-600" />
                            <p className="text-[13px] font-bold text-green-700">CREDAI Member</p>
                          </div>
                          <p className="text-[10px] text-green-600 mt-0.5">Verified Developer</p>
                        </div>
                      )}
                    </div>

                    {/* Awards */}
                    {b.awards.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Awards</p>
                        <div className="space-y-1.5">
                          {b.awards.map((a) => (
                            <div key={a} className="flex items-center gap-2 text-[12px] text-gray-700">
                              <Trophy size={13} className="text-amber-500 flex-shrink-0" />
                              {a}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Delivered projects */}
                    {b.delivered_projects.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Delivered Projects</p>
                        <div className="flex flex-wrap gap-1.5">
                          {b.delivered_projects.map((p) => (
                            <span key={p} className="text-[11px] text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full font-medium">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Website */}
                    {b.website && (
                      <a
                        href={b.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl px-4 py-3 transition-colors group"
                      >
                        <span className="text-[12px] font-semibold text-blue-700">Visit Builder Website</span>
                        <ExternalLink size={14} className="text-blue-400 group-hover:text-blue-600 transition-colors" />
                      </a>
                    )}

                    {/* Builder reputation engine */}
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Online Reputation</p>
                      <BuilderReputationCard builderName={b.name} />
                    </div>
                  </div>
                )
              })()}
            </div>

              {!loading && activeTab === 'Commute' && (
                <div className="p-5 space-y-6">
                  {/* Commute calculator */}
                  <CommuteCalculator
                    projectAddress={`${d?.address ?? d?.name}, ${d?.sector}, ${d?.city}, India`}
                  />
                </div>
              )}

              {!loading && activeTab === 'Docs' && (
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText size={14} className="text-blue-500" />
                    <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Document Q&A</p>
                  </div>
                  <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                    Upload a brochure, allotment letter, or RERA certificate — then ask questions about it. The AI reads the document and answers from it.
                  </p>
                  {project && (
                    <DocumentQA projectId={project.id} projectSlug={project.slug} />
                  )}
                </div>
              )}

            {/* Footer CTA */}
            <div className="flex-shrink-0 border-t border-gray-100 p-4 bg-white">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowVisitScheduler(true)}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold py-4 rounded-2xl text-[14px] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  <Calendar size={16} />
                  Book Site Visit
                </button>

                {(() => {
                  const waUrl = d ? buildWhatsAppUrl(d as any, 'panel') : null
                  return waUrl ? (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-[#25D366] hover:bg-[#1da851] text-white font-bold py-4 rounded-2xl text-[14px] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                    >
                      <WhatsAppIcon size={16} />
                      WhatsApp Us
                    </a>
                  ) : null
                })()}
              </div>
            </div>
          </PanelWrapper>
        </>
      )}
    </AnimatePresence>

    {/* Site visit scheduler modal */}
    <AnimatePresence>
      {showVisitScheduler && project && (
        <SiteVisitScheduler
          projectId={project.id}
          projectSlug={project.slug}
          projectName={project.name}
          onClose={() => setShowVisitScheduler(false)}
        />
      )}
    </AnimatePresence>

    {/* Floor plan viewer */}
    <AnimatePresence>
      {showFloorPlan && (
        <FloorPlanViewer
          floorPlans={showFloorPlan.plans}
          title={`${project?.name} — Floor Plans`}
          onClose={() => setShowFloorPlan(null)}
        />
      )}
    </AnimatePresence>
  </>
  )
}
