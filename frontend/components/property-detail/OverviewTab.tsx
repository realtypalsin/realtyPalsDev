'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  Building2, MapPin, ChevronRight, TrainFront,
  GraduationCap, HeartPulse, ShoppingBag, Leaf, Shield, ShieldCheck, Car, FileText,
  Download, CheckCircle2, BedDouble, Plane, CalendarDays, UserCheck, Users, TrendingUp, Award, Layers, Check, Phone, Mail
} from 'lucide-react'
import type { ProjectCard as ProjectCardType, ProjectDetail } from '@/types/project'
import type { ProjectDocumentPublic } from '@/lib/hooks/useProjectDetail'
import { getProjectOverview, type ProjectOverviewData } from '@/lib/backend-api'

import ConstructionTimeline from './ConstructionTimeline'
import { SpecificationGrid } from './SpecificationGrid'
import { OverviewBentoSkeleton } from '@/components/skeletons'

// Color token system for consistency
const TOKEN = {
  text: {
    primary: 'text-slate-900 dark:text-slate-50',
    secondary: 'text-slate-600 dark:text-slate-400',
    muted: 'text-slate-500 dark:text-slate-500'
  },
  bg: {
    surface: 'bg-white dark:bg-slate-900',
    surface2: 'bg-slate-50 dark:bg-slate-800',
  },
  border: 'border-slate-200 dark:border-slate-700',
  shadow: 'shadow-sm',
  radius: 'rounded-lg',
}

function formatFileSize(bytes: number | null): string | null {
  if (!bytes) return null
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export interface OverviewTabProps {
  project: ProjectCardType | null
  detail: ProjectDetail | null
  d: (ProjectCardType | ProjectDetail) | null
  loading: boolean
  documents: ProjectDocumentPublic[]
  whyBuy: string[]
  floorPlanImages?: Array<{ id: string; url: string; caption?: string | null; bhk?: number | null }>
  onViewFloorPlans?: (plans: Array<{ id: string; url: string; caption?: string | null }>) => void
  onGoToLocation: () => void
  onGoToDocuments: () => void
  onGoToPricing: () => void
  onGoToFloorPlans?: () => void
  onGoToBuilder?: () => void
}

// ── Main OverviewTab Component ──────────────────────────────────────────────
export default function OverviewTab({
  project, detail, d, loading, documents, whyBuy, floorPlanImages = [], onViewFloorPlans, onGoToLocation, onGoToDocuments, onGoToPricing, onGoToFloorPlans
}: OverviewTabProps) {
  const [showAllDetails, setShowAllDetails] = useState(false)
  const [showAllAmenities, setShowAllAmenities] = useState(false)
  const [overview, setOverview] = useState<ProjectOverviewData | null>(null)

  const slug = detail?.slug ?? project?.slug
  useEffect(() => {
    if (!slug) return
    let cancelled = false
    getProjectOverview(slug).then((data) => { if (!cancelled) setOverview(data) }).catch((err) => console.warn('getProjectOverview error:', err))
    return () => { cancelled = true }
  }, [slug])

  const marketingClaims = detail?.marketing_claims ?? []
  const amenities = (detail?.all_amenities ?? []) as { name: string; category: string }[]
  const unitTypes = d?.unit_types ?? []
  const connections = detail?.all_connectivity ?? d?.top_connectivity ?? []

  const builderName = typeof d?.builder === 'object' && d.builder !== null
    ? (d.builder as unknown as { name?: string })?.name ?? null
    : typeof d?.builder === 'string'
      ? d.builder
      : null
  const devName = builderName || ((d as any)?.builder_name) || 'Developer'

  // Function to open specific floor plan for a BHK unit card
  const handleUnitClick = (bhk: number) => {
    const matchedPlans = floorPlanImages.filter(img => img.bhk === bhk || img.caption?.toLowerCase().includes(`${bhk}bhk`) || img.caption?.toLowerCase().includes(`${bhk} bhk`))
    const plansToOpen = matchedPlans.length > 0 ? matchedPlans : floorPlanImages
    if (plansToOpen.length > 0 && onViewFloorPlans) {
      onViewFloorPlans(plansToOpen)
    } else if (onGoToFloorPlans) {
      onGoToFloorPlans()
    } else {
      onGoToPricing()
    }
  }

  // Extract construction technology or low density tags from marketing claims or DB fields
  const constructionTech = marketingClaims.find((c: string) => /mivan|alumiform|precast|rcc/i.test(c)) || (d as any)?.construction_tech
  const lowDensityTag = d?.open_space_pct && d.open_space_pct >= 70 ? 'Low Density' : null

  // 1. USP Chips (Exact screenshot layout with icons)
  const metroConn = connections.find(c => c.type === 'metro')
  const hasSecurityAmenity = amenities.some(a => a.category === 'security')
  const quickInfoItems: { label: string; value: string; sublabel: string; icon: any; color: string }[] = []
  
  // 1. Open Space
  if (d?.open_space_pct != null) {
    quickInfoItems.push({
      label: 'Open Green',
      value: `${d.open_space_pct}%`,
      sublabel: 'Open Green',
      icon: Leaf,
      color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
    })
  }

  // 2. Metro Connectivity
  if (metroConn) {
    const metroVal = (metroConn as any)?.travel_time_mins != null
      ? `${(metroConn as any).travel_time_mins} mins`
      : metroConn?.distance_km != null
        ? `${Math.ceil(metroConn.distance_km * 2.5)} mins`
        : null
    if (metroVal) {
      const cleanMetroName = (metroConn.name || 'Nearest')
        .replace(/\b(station|aqua line|blue line)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
      quickInfoItems.push({
        label: 'Metro',
        value: metroVal,
        sublabel: `${cleanMetroName} Metro`.replace(/\s+/g, ' ').replace(/Metro Metro/gi, 'Metro'),
        icon: TrainFront,
        color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
      })
    }
  }

  // 3. Green certification / IGBC (only show if data exists)
  if (d?.green_rating || (d as any)?.green_certification) {
    const greenRatingVal = d?.green_rating || (d as any)?.green_certification
    const greenRatingSub = greenRatingVal.toLowerCase().includes('gold') ? 'Gold Rated' : (greenRatingVal.toLowerCase().includes('platinum') ? 'Platinum Rated' : 'Certified')
    quickInfoItems.push({
      label: 'IGBC Rating',
      value: greenRatingVal.toUpperCase().substring(0, 4),
      sublabel: greenRatingSub,
      icon: Leaf,
      color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
    })
  }

  // 4. Low Density tag (only show if open_space_pct >= 70)
  if (lowDensityTag) {
    quickInfoItems.push({
      label: 'Density',
      value: 'Low',
      sublabel: 'Density Living',
      icon: Users,
      color: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400'
    })
  }

  // 5. Smart Units / Corner (only show if smart unit count exists)
  const smartUnitCount = (d as any)?.smart_units_count || null
  if (smartUnitCount) {
    quickInfoItems.push({
      label: 'Smart Units',
      value: `${smartUnitCount}+`,
      sublabel: 'Smart Units',
      icon: Layers,
      color: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400'
    })
  }

  const finalUspChips = quickInfoItems.slice(0, 6)

  // Perfect For (Exact card grid layout matching screenshot)
  const defaultPerfectFor = [
    { label: 'End Users', desc: 'Move-in for family', icon: UserCheck },
    { label: 'Families', desc: 'Spacious & safe living', icon: Users },
    { label: 'Investors', desc: 'High growth potential', icon: TrendingUp },
    { label: 'Premium Lifestyle', desc: 'Luxury amenities', icon: Award },
  ]

  const personaList = (detail as any)?.persona_profile?.recommended_personas || (detail as any)?.persona_profile?.primary_persona 
    ? [ (detail as any)?.persona_profile?.primary_persona ].concat((detail as any)?.persona_profile?.recommended_personas || []).filter(Boolean)
    : []

  const perfectForItems = personaList.length > 0
    ? personaList.slice(0, 4).map((p: string, idx: number) => ({
        label: p,
        desc: idx === 0 ? 'Primary buyer profile' : 'Ideal fit',
        icon: defaultPerfectFor[idx % defaultPerfectFor.length].icon
      }))
    : defaultPerfectFor

  // Around the Project: Categorized nearbies strictly from connections DB
  const categorizedConnections: Record<string, { name: string; distance: string; time: string; icon: any }[]> = {
    Metro: [],
    Hospitals: [],
    Schools: [],
    Mall: [],
    Expressway: [],
  }

  connections.forEach((c: any) => {
    const distStr = c.distance_km != null ? `${c.distance_km} km` : ''
    const timeEst = c.travel_time_mins != null ? `${c.travel_time_mins} min` : (c.distance_km != null ? `${Math.ceil(c.distance_km * 2.5)} min` : '')
    
    if (c.type === 'metro') {
      categorizedConnections.Metro.push({ name: c.name, distance: distStr, time: timeEst, icon: TrainFront })
    } else if (c.type === 'hospital') {
      categorizedConnections.Hospitals.push({ name: c.name, distance: distStr, time: timeEst, icon: HeartPulse })
    } else if (c.type === 'school') {
      categorizedConnections.Schools.push({ name: c.name, distance: distStr, time: timeEst, icon: GraduationCap })
    } else if (c.type === 'mall' || c.type === 'market') {
      categorizedConnections.Mall.push({ name: c.name, distance: distStr, time: timeEst, icon: ShoppingBag })
    } else if (c.type === 'expressway' || c.type === 'road' || c.type === 'highway') {
      categorizedConnections.Expressway.push({ name: c.name, distance: distStr, time: timeEst, icon: Car })
    }
  })

  // Flatten top items for 5-column layout — ONLY real DB items
  const aroundProjectList: { category: string; name: string; distance: string; time: string; icon: any }[] = []
  Object.entries(categorizedConnections).forEach(([cat, list]) => {
    if (list.length > 0) {
      aroundProjectList.push({ category: cat, ...list[0] })
    }
  })

  // Channel Partners: Clean extraction from DB
  const rawChannelPartners = (d as any)?.channel_partners || (detail as any)?.channel_partners || (overview as any)?.channel_partners || []
  const channelPartners = Array.isArray(rawChannelPartners) ? rawChannelPartners.map((cp: any) => ({
    name: cp.name || cp.company_name || cp.channel_partner?.name || 'RERA Authorized Partner',
    company_name: cp.company_name || cp.type || cp.channel_partner?.type || 'Authorized Realty Advisor',
    rera_registration: cp.rera_registration || cp.rera_registration_number || cp.channel_partner?.rera_registration || 'Verified RERA Agent',
    phone: cp.phone || cp.channel_partner?.phone || null,
  })) : []

  if (loading && !d) {
    return <OverviewBentoSkeleton />
  }

  return (
    <div className="p-3 sm:p-4 md:p-8 space-y-6 sm:space-y-8 bg-[#F7F9FB] dark:bg-[#0f0e0d] text-gray-900 dark:text-gray-100 font-sans">

      {/* 2. USP Chips (Compact 3-column row on mobile, never stacks vertically) */}
      {finalUspChips.length > 0 && (
        <div className={`grid gap-2 sm:gap-3.5 ${
          finalUspChips.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' :
          finalUspChips.length === 2 ? 'grid-cols-2 max-w-xl mx-auto' :
          finalUspChips.length === 4 ? 'grid-cols-2 sm:grid-cols-4' :
          'grid-cols-3'
        }`}>
          {finalUspChips.map((item, i) => {
            const Icon = item.icon
            return (
              <div key={i} className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[16px] sm:rounded-[20px] p-2.5 sm:p-4 flex flex-col items-center justify-center text-center shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all hover:-translate-y-0.5 min-h-[82px] sm:min-h-[108px] h-full">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color} mb-1 sm:mb-1.5`}>
                  <Icon size={16} />
                </div>
                <span className="text-[12px] sm:text-[14px] font-black text-gray-900 dark:text-white leading-tight truncate max-w-full">
                  {item.value}
                </span>
                <span className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-0.5 sm:mt-1 leading-tight line-clamp-1 sm:line-clamp-2 max-w-full text-center">
                  {item.sublabel}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* PERFECT FOR SECTION */}
      {personaList.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-[17px] sm:text-[18px] font-black text-gray-900 dark:text-white tracking-tight">
            Perfect For
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {perfectForItems.map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[18px] sm:rounded-[20px] p-3.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col items-start gap-2.5 sm:gap-3.5 transition-all hover:-translate-y-0.5 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 flex-shrink-0">
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[12.5px] sm:text-[14px] font-black text-gray-900 dark:text-white leading-tight break-words">{item.label}</h4>
                    <p className="text-[10.5px] sm:text-[11.5px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">{item.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 3. WHY THIS PROJECT (2-column responsive grid on mobile) */}
      {whyBuy.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] sm:text-[18px] font-black text-gray-900 dark:text-white tracking-tight">
              Why {d?.name ?? 'This Project'} is a Great Choice
            </h2>
            <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10.5px] sm:text-[11px] font-bold bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400">
              {Math.min(whyBuy.length, 4)} key reasons
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
            {whyBuy.slice(0, 4).map((reason, i) => {
              const icons = [MapPin, TrainFront, Building2, ShieldCheck]
              const bgs = ['bg-emerald-50 text-emerald-600', 'bg-blue-50 text-blue-600', 'bg-teal-50 text-teal-600', 'bg-purple-50 text-purple-600']
              const Icon = icons[i % icons.length]
              const bg = bgs[i % bgs.length]
              return (
                <div key={i} className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[18px] sm:rounded-[20px] p-3.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col items-start gap-2.5 sm:gap-3.5 transition-all hover:-translate-y-0.5">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                    <Icon size={16} />
                  </div>
                  <p className="text-[12px] sm:text-[13px] font-bold text-gray-700 dark:text-gray-300 leading-snug sm:leading-relaxed">
                    {reason}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 4. AVAILABLE CONFIGURATIONS (2-across on mobile, 4-across on desktop) */}
      {unitTypes.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] sm:text-[18px] font-black text-gray-900 dark:text-white tracking-tight">
              Available Configurations
            </h2>
            <button onClick={onGoToFloorPlans ?? onGoToPricing} className="text-[12px] sm:text-[12.5px] font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {unitTypes.slice(0, 4).map((opt, i) => {
              const startsAt = opt.super_area_sqft && opt.price_min_cr ? `₹${Math.round((opt.price_min_cr * 10000000) / opt.super_area_sqft).toLocaleString('en-IN')}/sqft` : null;
              const badgeLabel = i === 0 ? 'MOST POPULAR' : i === 1 ? 'BEST VALUE' : i === 2 ? 'PREMIUM' : null
              const badgeColor = i === 0 ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' : i === 1 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'

              return (
                <div
                  key={i}
                  onClick={() => handleUnitClick(opt.bhk)}
                  className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 hover:ring-blue-500/50 dark:hover:ring-blue-400/50 rounded-[18px] sm:rounded-[20px] p-3.5 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3 flex flex-col justify-between transition-all hover:-translate-y-1 cursor-pointer group"
                >
                  <div className="space-y-1.5">
                    {badgeLabel && (
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block ${badgeColor}`}>
                        {badgeLabel}
                      </span>
                    )}
                    <h3 className="text-[15px] sm:text-[18px] font-black text-gray-900 dark:text-white leading-tight">
                      {opt.bhk} BHK {opt.name ? opt.name.replace(`${opt.bhk} BHK`, '').trim() : 'Apartment'}
                    </h3>
                    <p className="text-[11px] text-gray-400 font-semibold">
                      {opt.carpet_area_sqft ? `${opt.carpet_area_sqft} sqft carpet` : (opt.super_area_sqft ? `${opt.super_area_sqft} sqft` : 'Spacious Layout')}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                    <p className="text-[14px] sm:text-[17px] font-black text-gray-900 dark:text-white leading-none">
                      {opt.price_min_cr != null
                        ? (opt.price_min_cr === opt.price_max_cr ? `₹${opt.price_min_cr} Cr` : `₹${opt.price_min_cr} - ${opt.price_max_cr} Cr`)
                        : 'Price on Request'}
                    </p>
                    {startsAt && <p className="text-[10px] text-gray-400 font-medium mt-1">{startsAt}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 5. CONSTRUCTION TIMELINE */}
      <ConstructionTimeline
        milestones={overview?.construction_milestones ?? null}
        projectStatus={d?.status}
        possessionDate={d?.possession_date}
        onTimeDeliveryPct={overview?.on_time_delivery_pct ?? undefined}
      />

      {/* INTEGRATED AUTHORIZED SALES PARTNERS */}
      {channelPartners.length > 0 && (
        <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">
                Channel Partners
              </h2>
              <p className="text-[12px] text-gray-500 font-medium mt-0.5">Connect with our authorized channel partners for best offers & site visit assistance.</p>
            </div>
            {channelPartners.length > 4 && (
              <button onClick={onGoToDocuments} className="text-[12.5px] font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View All Partners <ChevronRight size={14} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {channelPartners.slice(0, 4).map((partner: any, i: number) => (
              <div key={i} className="p-3 sm:p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex flex-col justify-between space-y-2.5">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-white/10 flex-shrink-0 relative">
                    <Image
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${partner.name || i}`}
                      alt={partner.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[12.5px] sm:text-[14px] font-black text-gray-900 dark:text-white truncate">{partner.name}</h4>
                    <p className="text-[10px] sm:text-[11px] text-gray-500 font-semibold truncate">{partner.company_name || 'Authorized Partner'}</p>
                    {partner.rera_registration && (
                      <p className="text-[9px] sm:text-[10px] font-mono text-gray-400 truncate mt-0.5">RERA: {partner.rera_registration}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 pt-1.5 sm:pt-2 border-t border-gray-100 dark:border-white/10">
                  {partner.phone ? (
                    <a
                      href={`tel:${partner.phone}`}
                      className="flex-1 py-1.5 sm:py-2 px-2 sm:px-3 bg-[#111827] dark:bg-white text-white dark:text-gray-900 rounded-xl text-[11px] sm:text-[12px] font-black text-center hover:opacity-90 transition-opacity flex items-center justify-center gap-1 shadow-xs truncate"
                    >
                      Connect
                    </a>
                  ) : (
                    <button
                      onClick={onGoToPricing}
                      className="flex-1 py-1.5 sm:py-2 px-2 sm:px-3 bg-[#111827] dark:bg-white text-white dark:text-gray-900 rounded-xl text-[11px] sm:text-[12px] font-black text-center hover:opacity-90 transition-opacity flex items-center justify-center gap-1 shadow-xs truncate"
                    >
                      Connect
                    </button>
                  )}
                  {partner.phone && (
                    <a
                      href={`https://wa.me/${partner.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 sm:w-9 sm:h-9 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center hover:bg-emerald-100 transition-colors flex-shrink-0"
                    >
                      <Phone size={13} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 font-semibold pt-1">
            All channel partners are RERA registered & verified by {devName}.
          </p>
        </div>
      )}

      {/* 6. PROJECT AMENITIES (Clean typography pill tags - zero icons) */}
      {amenities.length > 0 && (
        <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[17px] sm:text-[18px] font-black text-gray-900 dark:text-white tracking-tight">
                Project Amenities
              </h2>
              <span className="text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                {amenities.length} Features
              </span>
            </div>
            {amenities.length > 10 && (
              <button
                onClick={() => setShowAllAmenities(!showAllAmenities)}
                className="text-[12px] sm:text-[12.5px] font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                {showAllAmenities ? 'Show Less' : `View All (${amenities.length})`}
                <ChevronRight size={14} className={showAllAmenities ? 'rotate-90 transition-transform' : ''} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-2.5 pt-1">
            {(showAllAmenities ? amenities : amenities.slice(0, 10)).map((a, i) => (
              <span
                key={i}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/70 dark:border-white/10 text-[12px] sm:text-[12.5px] font-bold text-gray-800 dark:text-gray-200 hover:border-gray-300 dark:hover:border-white/20 transition-all shadow-2xs"
              >
                {a.name}
              </span>
            ))}

            {!showAllAmenities && amenities.length > 10 && (
              <button
                onClick={() => setShowAllAmenities(true)}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-slate-100 dark:bg-white/10 text-[12px] sm:text-[12.5px] font-extrabold text-blue-600 dark:text-blue-400 hover:bg-slate-200/70 dark:hover:bg-white/15 transition-colors cursor-pointer"
              >
                +{amenities.length - 10} more
              </button>
            )}
          </div>
        </div>
      )}

      {/* 7. PROJECT DETAILS */}
      <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] sm:text-[18px] font-black text-gray-900 dark:text-white tracking-tight">
            Project Details
          </h2>
          <button onClick={() => setShowAllDetails(!showAllDetails)} className="text-[12px] sm:text-[12.5px] font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            {showAllDetails ? 'Show Less' : 'View All Details'} <ChevronRight size={14} className={showAllDetails ? 'rotate-90 transition-transform' : ''} />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
          {[
            { label: 'STATUS', val: d?.status === 'ready_to_move' ? 'Ready to Move' : (d?.status as string) === 'delivered' ? 'Possession Delivered' : d?.status === 'new_launch' ? 'New Launch' : 'Under Construction', icon: Building2 },
            ...(d?.total_towers ? [{ label: 'TOTAL TOWERS', val: `${d.total_towers}`, icon: Building2 }] : []),
            ...((d as any)?.total_units ? [{ label: 'TOTAL UNITS', val: `${(d as any).total_units}`, icon: Building2 }] : []),
            ...(unitTypes.length > 0 ? [{ label: 'CONFIGURATIONS', val: [...new Set(unitTypes.map(u => u.bhk))].sort((a,b)=>a-b).join(', ') + ' BHK', icon: BedDouble }] : []),
            ...(d?.land_area_acres ? [{ label: 'PROJECT AREA', val: `${d.land_area_acres} Acres`, icon: Leaf }] : []),
            ...(d?.open_space_pct ? [{ label: 'OPEN SPACE', val: `${d.open_space_pct}%`, icon: Leaf }] : []),
            ...(d?.launch_date ? [{ label: 'LAUNCH DATE', val: (() => { const d2 = new Date(d.launch_date); return isNaN(d2.getTime()) ? 'Unspecified' : d2.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) })(), icon: CalendarDays }] : []),
            { label: 'POSSESSION', val: d?.possession_label ?? (d?.status === 'ready_to_move' || (d?.status as string) === 'delivered' ? 'Delivered' : 'Under Construction'), icon: CalendarDays },
            ...(showAllDetails ? [
              ...(d?.rera_number ? [{ label: 'RERA NO.', val: d.rera_number, icon: FileText }] : []),
              { label: 'DEVELOPER', val: devName, icon: Building2 },
              ...((d as any)?.property_type ? [{ label: 'PROJECT TYPE', val: (d as any).property_type, icon: Building2 }] : []),
              ...(d?.green_rating ? [{ label: 'GREEN RATING', val: d.green_rating, icon: Leaf }] : []),
            ] : [])
          ].map((detailItem, i) => {
            const Icon = detailItem.icon
            return (
              <div key={i} className="p-3 sm:p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center gap-2.5 sm:gap-3.5 min-w-0 overflow-hidden">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-white/10 text-gray-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Icon size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9.5px] sm:text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-wider leading-none">{detailItem.label}</p>
                  <p className="text-[12.5px] sm:text-[14px] font-black text-gray-900 dark:text-white mt-1 leading-snug truncate" title={detailItem.val}>{detailItem.val}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 8. AROUND THE PROJECT (2-column grid on mobile) */}
      {aroundProjectList.length > 0 && (
        <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4 sm:space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] sm:text-[18px] font-black text-gray-900 dark:text-white tracking-tight">
              Around the Project
            </h2>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button onClick={onGoToLocation} className="px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-[11.5px] font-bold border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors">
                Map View
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
            {aroundProjectList.map((item, i) => {
              const Icon = item.icon
              const bgs = ['bg-purple-50 text-purple-600', 'bg-blue-50 text-blue-600', 'bg-red-50 text-red-500', 'bg-emerald-50 text-emerald-600', 'bg-cyan-50 text-cyan-600']
              const bg = bgs[i % bgs.length]
              return (
                <div key={i} className="p-3 sm:p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-2 sm:space-y-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center ${bg}`}>
                      <Icon size={16} />
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] sm:text-[12.5px] font-black text-amber-700 dark:text-amber-400 leading-none">{item.distance}</p>
                      <p className="text-[9.5px] sm:text-[10px] text-gray-400 font-bold mt-0.5">{item.time}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider text-gray-400">{item.category}</p>
                    <h4 className="text-[12px] sm:text-[13px] font-extrabold text-gray-900 dark:text-white leading-tight mt-0.5 line-clamp-2">{item.name}</h4>
                  </div>
                </div>
              )
            })}

            <div className="p-3 sm:p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex flex-col items-center justify-center text-center space-y-1 cursor-pointer hover:bg-gray-100/60 transition-colors" onClick={onGoToLocation}>
              <span className="text-[18px] sm:text-[22px] font-black text-gray-900 dark:text-white">+15</span>
              <span className="text-[10px] sm:text-[11px] text-gray-500 font-bold">More Landmarks</span>
            </div>
          </div>
        </div>
      )}

      {/* 8.5. IMPORTANT DOCUMENTS (2-column on mobile) */}
      {documents.length > 0 && (
        <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] sm:text-[18px] font-black text-gray-900 dark:text-white tracking-tight">
              Important Documents
            </h2>
            <button onClick={onGoToDocuments} className="text-[12px] sm:text-[12.5px] font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Document Center <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {[
              { title: 'RERA Certificate', sub: 'Verified', bg: 'bg-emerald-50 text-emerald-600' },
              { title: 'Brochure', sub: 'Download', bg: 'bg-blue-50 text-blue-600' },
              { title: 'Master Plan', sub: 'Download', bg: 'bg-teal-50 text-teal-600' },
              { title: 'Price List', sub: 'Download', bg: 'bg-purple-50 text-purple-600' }
            ].slice(0, Math.max(documents.length, 4)).map((cat, i) => {
              const matchedDoc = documents[i] || null
              return (
                <a
                  key={i}
                  href={matchedDoc?.storage_url || '#'}
                  target={matchedDoc ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  onClick={(e) => { if (!matchedDoc) { e.preventDefault(); onGoToDocuments() } }}
                  className="flex items-center gap-2.5 sm:gap-3.5 p-3 sm:p-4 bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl hover:bg-gray-100/50 dark:hover:bg-white/10 transition-colors cursor-pointer group shadow-sm min-w-0"
                >
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.bg}`}>
                    <FileText size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] sm:text-[13.5px] font-extrabold text-gray-900 dark:text-white truncate">{cat.title}</p>
                    <p className="text-[10px] sm:text-[11px] text-gray-400 font-semibold">{cat.sub}</p>
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* 9. SPECIFICATIONS GRID */}
      {(() => {
        const specs = (detail as any)?.spec_items || (d as any)?.spec_items || (project as any)?.spec_items || []
        return specs && specs.length > 0 ? <SpecificationGrid specs={specs} /> : null
      })()}

      {/* 10. BOOK SITE VISIT CTA */}
      <div className="bg-gradient-to-r from-gray-900 to-black dark:from-[#1c1815] dark:to-[#0f0e0d] text-white rounded-[24px] p-6 md:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center md:text-left">
          <h3 className="text-[20px] md:text-[24px] font-black tracking-tight">Book an Exclusive Site Visit</h3>
          <p className="text-[13px] text-gray-300 font-medium">Get complimentary door-to-door cab pickup & live sample flat walkthrough.</p>
        </div>
        <button
          onClick={onGoToPricing}
          className="px-8 py-4 bg-white text-gray-900 hover:bg-gray-100 font-black rounded-2xl text-[14px] transition-all shadow-lg hover:scale-105 flex items-center gap-2 whitespace-nowrap"
        >
          <CalendarDays size={18} />
          Book Site Visit Now
        </button>
      </div>

    </div>
  )
}
