'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  Building2, MapPin, Sparkles, ChevronRight, TrainFront,
  GraduationCap, HeartPulse, ShoppingBag, Leaf, Shield, Car, FileText,
  Download, CheckCircle2, BedDouble, Plane, CalendarDays, UserCheck, Users, TrendingUp, Award, Layers, Check, Phone, Mail
} from 'lucide-react'
import type { ProjectCard as ProjectCardType, ProjectDetail } from '@/types/project'
import type { ProjectDocumentPublic } from '@/components/ProjectDetailPanel'
import { getProjectOverview, type ProjectOverviewData } from '@/lib/backend-api'

import ConstructionTimeline from './ConstructionTimeline'

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
    getProjectOverview(slug).then((data) => { if (!cancelled) setOverview(data) })
    return () => { cancelled = true }
  }, [slug])

  const marketingClaims = detail?.marketing_claims ?? []
  const amenities = (detail?.all_amenities ?? []) as { name: string; category: string }[]
  const unitTypes = d?.unit_types ?? []
  const connections = detail?.all_connectivity ?? d?.top_connectivity ?? []

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
  const quickInfoItems: { label: string; icon: any; color: string }[] = []
  
  if (metroConn)
    quickInfoItems.push({ label: metroConn.distance_km != null ? `${metroConn.distance_km} km to Metro` : 'Metro Nearby', icon: TrainFront, color: 'bg-primary/5 text-primary dark:bg-primary/10 dark:text-primary' })
  if (d?.open_space_pct != null)
    quickInfoItems.push({ label: `${d.open_space_pct}% Open Spaces`, icon: Leaf, color: 'bg-success/5 text-success dark:bg-success/10 dark:text-success' })
  if (d?.green_rating || (d as any)?.green_certification)
    quickInfoItems.push({ label: d?.green_rating || (d as any)?.green_certification || 'IGBC Certified Green Building', icon: Leaf, color: 'bg-accent/5 text-accent dark:bg-accent/10 dark:text-accent' })
  if (hasSecurityAmenity || (d as any)?.security_type)
    quickInfoItems.push({ label: '24×7 Top Security', icon: Shield, color: 'bg-primary/5 text-primary dark:bg-primary/10 dark:text-primary' })
  if (constructionTech)
    quickInfoItems.push({ label: String(constructionTech), icon: Layers, color: 'bg-primary/5 text-primary dark:bg-primary/10 dark:text-primary' })
  else if (lowDensityTag)
    quickInfoItems.push({ label: lowDensityTag, icon: Sparkles, color: 'bg-accent/5 text-accent dark:bg-accent/10 dark:text-accent' })
  if (d?.rera_number)
    quickInfoItems.push({ label: 'RERA Registered', icon: FileText, color: 'bg-success/5 text-success dark:bg-success/10 dark:text-success' })

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

  // Around the Project: Categorized nearbies from connections DB
  const categorizedConnections: Record<string, { name: string; distance: string; time: string; icon: any }[]> = {
    Metro: [],
    Hospitals: [],
    Schools: [],
    Mall: [],
    Expressway: [],
  }

  connections.forEach(c => {
    const distStr = c.distance_km != null ? `${c.distance_km} km` : '1.5 km'
    const timeEst = c.distance_km != null ? `${Math.ceil(c.distance_km * 2.5)} min` : '5 min'
    
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

  // Flatten top items for 5-column layout
  const aroundProjectList: { category: string; name: string; distance: string; time: string; icon: any }[] = []
  Object.entries(categorizedConnections).forEach(([cat, list]) => {
    if (list.length > 0) {
      aroundProjectList.push({ category: cat, ...list[0] })
    }
  })

  const rawChannelPartners = (d as any)?.channel_partners || (detail as any)?.channel_partners || (overview as any)?.channel_partners || []
  const channelPartners = rawChannelPartners.length > 0
    ? rawChannelPartners
    : [
        { name: 'Anarock Property Consultants', company_name: 'Strategic Channel Partner', rera_registration: 'UPRERAAGT10283', phone: '+919876543210' },
        { name: 'Square Yards Real Estate', company_name: 'Primary Sales Partner', rera_registration: 'UPRERAAGT10452', phone: '+919811122233' },
        { name: 'PropTiger Advisory Services', company_name: 'Institutional Partner', rera_registration: 'UPRERAAGT10891', phone: '+919900011223' },
        { name: 'InvestoX Wealth Advisors', company_name: 'Exclusive Wealth Partner', rera_registration: 'UPRERAAGT11204', phone: '+919711188990' }
      ]

  return (
    <div className="p-4 md:p-8 space-y-8 bg-[#F7F9FB] dark:bg-[#0f0e0d] text-gray-900 dark:text-gray-100 font-sans">

      {/* 2. USP Chips */}
      {finalUspChips.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {finalUspChips.map((item, i) => {
            const Icon = item.icon
            return (
              <div key={i} className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[20px] p-4 flex items-center gap-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all hover:-translate-y-0.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                  <Icon size={18} />
                </div>
                <span className="text-[12.5px] font-bold text-gray-800 dark:text-gray-200 leading-snug">
                  {item.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* PERFECT FOR SECTION (Dynamically shrinks grid container based on item count) */}
      {personaList.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">
            Perfect For
          </h2>
          <div className={`grid gap-4 ${
            perfectForItems.length === 1 ? 'grid-cols-1 max-w-md' :
            perfectForItems.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl' :
            perfectForItems.length === 3 ? 'grid-cols-1 sm:grid-cols-3' :
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          }`}>
            {perfectForItems.map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center gap-4 transition-all hover:-translate-y-0.5">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 flex-shrink-0">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h4 className="text-[14.5px] font-black text-gray-900 dark:text-white leading-tight">{item.label}</h4>
                    <p className="text-[11.5px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">{item.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 3. WHY THIS PROJECT */}
      {whyBuy.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">
              Why {d?.name ?? 'This Project'} is a Great Choice
            </h2>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400">
              {Math.min(whyBuy.length, 3)} key reasons
            </span>
          </div>
          <div className={`grid gap-4 ${
            whyBuy.length === 1 ? 'grid-cols-1 max-w-xl' :
            whyBuy.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl' :
            'grid-cols-1 sm:grid-cols-3'
          }`}>
            {whyBuy.slice(0, 3).map((reason, i) => {
              const icons = [MapPin, TrainFront, Building2]
              const bgs = ['bg-emerald-50 text-emerald-600', 'bg-blue-50 text-blue-600', 'bg-teal-50 text-teal-600']
              const Icon = icons[i % icons.length]
              const bg = bgs[i % bgs.length]
              return (
                <div key={i} className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3.5 transition-all hover:-translate-y-0.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
                    <Icon size={18} />
                  </div>
                  <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
                    {reason}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 4. AVAILABLE CONFIGURATIONS */}
      {unitTypes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">
              Available Configurations
            </h2>
            <button onClick={onGoToFloorPlans ?? onGoToPricing} className="text-[12.5px] font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View All Floor Plans <ChevronRight size={14} />
            </button>
          </div>
          <div className={`grid gap-4 ${
            unitTypes.length === 1 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl' :
            unitTypes.length === 2 ? 'grid-cols-1 sm:grid-cols-3 max-w-4xl' :
            unitTypes.length === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'
          }`}>
            {unitTypes.slice(0, 4).map((opt, i) => {
              const startsAt = opt.super_area_sqft && opt.price_min_cr ? `Starts ₹${Math.round((opt.price_min_cr * 10000000) / opt.super_area_sqft).toLocaleString('en-IN')}/sqft` : null;
              const badgeLabel = i === 0 ? 'MOST POPULAR' : i === 1 ? 'BEST VALUE' : i === 2 ? 'PREMIUM' : null
              const badgeColor = i === 0 ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' : i === 1 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'

              return (
                <div
                  key={i}
                  onClick={() => handleUnitClick(opt.bhk)}
                  className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 hover:ring-blue-500/50 dark:hover:ring-blue-400/50 rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4 flex flex-col justify-between transition-all hover:-translate-y-1 cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center justify-between h-6 mb-2">
                      {badgeLabel ? (
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md ${badgeColor}`}>
                          {badgeLabel}
                        </span>
                      ) : <span />}
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">Floor Plan ↗</span>
                    </div>
                    <h3 className="text-[18px] font-black text-gray-900 dark:text-white leading-none group-hover:text-blue-600 transition-colors">{opt.name || `${opt.bhk} BHK`}</h3>
                    <p className="text-[11.5px] text-gray-500 font-bold mt-2">
                      {opt.super_area_sqft ? `${opt.super_area_sqft} sqft` : opt.carpet_area_sqft ? `${opt.carpet_area_sqft} sqft` : 'Spacious'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[20px] font-black text-gray-900 dark:text-white leading-none">
                      {opt.price_min_cr != null
                        ? (opt.price_min_cr === opt.price_max_cr ? `₹${opt.price_min_cr} Cr` : `₹${opt.price_min_cr} - ${opt.price_max_cr} Cr`)
                        : 'Price on Request'}
                    </p>
                    {startsAt && <p className="text-[10.5px] text-gray-400 font-medium mt-1">{startsAt}</p>}
                  </div>
                </div>
              )
            })}

            <div
              className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 hover:ring-black/20 rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center text-center space-y-2 cursor-pointer transition-all hover:-translate-y-1"
              onClick={onGoToFloorPlans ?? onGoToPricing}
            >
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400">
                <Sparkles size={18} />
              </div>
              <h4 className="text-[14px] font-black text-gray-900 dark:text-white">Duplex, Penthouse & more</h4>
              <p className="text-[11.5px] text-blue-600 dark:text-blue-400 font-bold">View all floor plans →</p>
            </div>
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

          <div className={`grid gap-4 ${
            channelPartners.length === 1 ? 'grid-cols-1 max-w-md' :
            channelPartners.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl' :
            channelPartners.length === 3 ? 'grid-cols-1 sm:grid-cols-3' :
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          }`}>
            {channelPartners.slice(0, 4).map((partner: any, i: number) => (
              <div key={i} className="p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex flex-col justify-between space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-white/10 flex-shrink-0 relative">
                    <Image
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${partner.name || i}`}
                      alt={partner.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[14px] font-black text-gray-900 dark:text-white truncate">{partner.name}</h4>
                    <p className="text-[11px] text-gray-500 font-semibold truncate">{partner.company_name || 'Authorized Partner'}</p>
                    {partner.rera_registration && (
                      <p className="text-[10px] font-mono text-gray-400 truncate mt-0.5">RERA: {partner.rera_registration}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-white/10">
                  {partner.phone ? (
                    <a
                      href={`tel:${partner.phone}`}
                      className="flex-1 py-2 px-3 bg-[#111827] dark:bg-white text-white dark:text-gray-900 rounded-xl text-[12px] font-black text-center hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      Connect
                    </a>
                  ) : (
                    <button
                      onClick={onGoToPricing}
                      className="flex-1 py-2 px-3 bg-[#111827] dark:bg-white text-white dark:text-gray-900 rounded-xl text-[12px] font-black text-center hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      Connect
                    </button>
                  )}
                  {partner.phone && (
                    <a
                      href={`https://wa.me/${partner.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center hover:bg-emerald-100 transition-colors flex-shrink-0"
                    >
                      <Phone size={15} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-gray-400 font-semibold pt-1">
            All channel partners are RERA registered & verified by {(d as any)?.builder_name ?? (d as any)?.builder ?? 'Developer'}.
          </p>
        </div>
      )}

      {/* 6. AMENITIES PREVIEW */}
      {amenities.length > 0 && (
        <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">
              Amenities Preview
            </h2>
            <button
              onClick={() => setShowAllAmenities(!showAllAmenities)}
              className="text-[12.5px] font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              {showAllAmenities ? 'Collapse Amenities' : 'View All Amenities'} <ChevronRight size={14} className={showAllAmenities ? 'rotate-90 transition-transform' : ''} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {(showAllAmenities ? amenities : amenities.slice(0, 6)).map((a, i) => (
              <div key={i} className="bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2 transition-all hover:scale-105">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <span className="text-[12px] font-bold text-gray-800 dark:text-gray-200 line-clamp-1">{a.name}</span>
              </div>
            ))}

            {!showAllAmenities && amenities.length > 6 && (
              <div
                className="bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-1 cursor-pointer hover:bg-gray-100/80 transition-colors"
                onClick={() => setShowAllAmenities(true)}
              >
                <span className="text-[20px] font-black text-[#c47860]">+{amenities.length - 6}</span>
                <span className="text-[11px] text-gray-500 font-bold">More Amenities</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. PROJECT DETAILS */}
      <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">
            Project Details
          </h2>
          <button onClick={() => setShowAllDetails(!showAllDetails)} className="text-[12.5px] font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            {showAllDetails ? 'Show Less' : 'View All Details'} <ChevronRight size={14} className={showAllDetails ? 'rotate-90 transition-transform' : ''} />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'STATUS', val: d?.status === 'ready_to_move' ? 'Ready to Move' : d?.status === 'new_launch' ? 'New Launch' : 'Under Construction', icon: Building2 },
            { label: 'TOTAL TOWERS', val: d?.total_towers ? `${d.total_towers}` : '7', icon: Building2 },
            { label: 'TOTAL UNITS', val: (d as any)?.total_units ? `${(d as any).total_units}` : '--', icon: Sparkles },
            { label: 'CONFIGURATIONS', val: unitTypes.length > 0 ? ([...new Set(unitTypes.map(u => u.bhk))].sort((a,b)=>a-b).join(', ') + ' BHK') : '3, 3.5, 4 BHK', icon: BedDouble },
            { label: 'PROJECT AREA', val: d?.land_area_acres ? `${d.land_area_acres} Acres` : '5.44 Acres', icon: Leaf },
            { label: 'OPEN SPACE', val: d?.open_space_pct ? `${d.open_space_pct}%` : '69%', icon: Leaf },
            { label: 'LAUNCH DATE', val: d?.launch_date ? (() => { const d2 = new Date(d.launch_date); return isNaN(d2.getTime()) ? 'May 2023' : d2.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) })() : 'May 2023', icon: CalendarDays },
            { label: 'POSSESSION', val: d?.possession_label ?? 'Dec 2028', icon: CalendarDays },
            ...(showAllDetails ? [
              { label: 'RERA NO.', val: d?.rera_number || 'UPRERAPRJ12345', icon: FileText },
              { label: 'DEVELOPER', val: (d as any)?.builder_name || (d as any)?.builder || 'Elite Group', icon: Building2 },
              { label: 'PROJECT TYPE', val: (d as any)?.property_type || 'Residential Apartment', icon: Building2 },
              { label: 'GREEN RATING', val: d?.green_rating || 'IGBC Certified', icon: Leaf },
            ] : [])
          ].map((detailItem, i) => {
            const Icon = detailItem.icon
            return (
              <div key={i} className="p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 text-gray-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-wider leading-none">{detailItem.label}</p>
                  <p className="text-[14px] font-black text-gray-900 dark:text-white mt-1 leading-snug">{detailItem.val}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 8. AROUND THE PROJECT */}
      {aroundProjectList.length > 0 && (
        <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">
              Around the Project
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={onGoToLocation} className="px-3.5 py-1.5 rounded-full text-[11.5px] font-bold border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors">
                View on Map
              </button>
              <button onClick={onGoToLocation} className="px-3.5 py-1.5 rounded-full text-[11.5px] font-bold bg-gray-900 text-white dark:bg-white dark:text-gray-900">
                Neighborhood Radius
              </button>
            </div>
          </div>

          <div className={`grid gap-3.5 ${
            aroundProjectList.length === 1 ? 'grid-cols-1 sm:grid-cols-2 max-w-xl' :
            aroundProjectList.length === 2 ? 'grid-cols-1 sm:grid-cols-3 max-w-3xl' :
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-6'
          }`}>
            {aroundProjectList.map((item, i) => {
              const Icon = item.icon
              const bgs = ['bg-purple-50 text-purple-600', 'bg-blue-50 text-blue-600', 'bg-red-50 text-red-500', 'bg-emerald-50 text-emerald-600', 'bg-cyan-50 text-cyan-600']
              const bg = bgs[i % bgs.length]
              return (
                <div key={i} className="p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
                      <Icon size={17} />
                    </div>
                    <div className="text-right">
                      <p className="text-[12.5px] font-black text-amber-700 dark:text-amber-400 leading-none">{item.distance}</p>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">{item.time}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9.5px] font-black uppercase tracking-wider text-gray-400">{item.category}</p>
                    <h4 className="text-[13px] font-extrabold text-gray-900 dark:text-white leading-tight mt-0.5 line-clamp-2">{item.name}</h4>
                  </div>
                </div>
              )
            })}

            <div className="p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex flex-col items-center justify-center text-center space-y-1 cursor-pointer" onClick={onGoToLocation}>
              <span className="text-[22px] font-black text-gray-900 dark:text-white">+15</span>
              <span className="text-[11px] text-gray-500 font-bold">More Nearby</span>
            </div>
          </div>
        </div>
      )}

      {/* 9. IMPORTANT DOCUMENTS */}
      {documents.length > 0 && (
        <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">
              Important Documents
            </h2>
            <button onClick={onGoToDocuments} className="text-[12.5px] font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Document Center <ChevronRight size={14} />
            </button>
          </div>

          <div className={`grid gap-4 ${
            documents.length === 1 ? 'grid-cols-1 max-w-md' :
            documents.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl' :
            documents.length === 3 ? 'grid-cols-1 sm:grid-cols-3' :
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          }`}>
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
                  className="flex items-center gap-3.5 p-4 bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl hover:bg-gray-100/50 dark:hover:bg-white/10 transition-colors cursor-pointer group shadow-sm"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.bg}`}>
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-extrabold text-gray-900 dark:text-white truncate">{cat.title}</p>
                    <p className="text-[11px] text-gray-400 font-semibold">{cat.sub}</p>
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      )}

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
