'use client'
import { useState } from 'react'
import Image from 'next/image'
import {
  Building2, MapPin, Sparkles, ChevronRight, TrainFront,
  GraduationCap, HeartPulse, ShoppingBag, Dumbbell, Leaf, Shield, Car, FileText,
  Download, CheckCircle2, LineChart, BedDouble,
} from 'lucide-react'
import { Warning } from '@phosphor-icons/react'
import type { ProjectCard as ProjectCardType, ProjectDetail } from '@/types/project'
import type { ProjectDocumentPublic } from '@/components/ProjectDetailPanel'
import { Card } from './Card'

const DropletLeafIcon = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
    style={props.style}
    width={props.size || 18}
    height={props.size || 18}
  >
    <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z" />
    <path d="M12 18V13" />
    <path d="M12 15.5c1.2-0.8 1.8-2 1.8-2" />
    <path d="M12 16.5c-1.2-0.8-1.8-2-1.8-2" />
  </svg>
)

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
  onGoToLocation: () => void
  onGoToDocuments: () => void
  onGoToPricing: () => void
}

function AlternativesCard({ competitors }: { competitors: NonNullable<ProjectDetail['competitors']> }) {
  if (competitors.length === 0) return null
  return (
    <div className="space-y-4">
      <h2 className="text-[16px] font-extrabold text-gray-900 dark:text-white tracking-tight">
        Compare Alternatives
      </h2>
      <div className="flex flex-col gap-4">
        {competitors.map((c) => (
          <div key={c.id} className="group relative rounded-3xl border border-gray-100 dark:border-gray-800/40 bg-white dark:bg-[#171412] p-4 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
            {/* Thumbnail */}
            <div className="w-full md:w-32 h-32 md:h-24 rounded-2xl bg-gray-100 dark:bg-gray-800 overflow-hidden relative flex-shrink-0 flex items-center justify-center">
              {c.competitor_slug ? (
                <Image 
                  src={`/images/properties/${c.competitor_slug}/hero.jpg`} 
                  alt={c.competitor_name} 
                  fill 
                  className="object-cover" 
                  onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.querySelector('svg')?.classList.remove('hidden') }} 
                />
              ) : null}
              <Building2 size={24} className={`text-gray-400 ${c.competitor_slug ? 'hidden' : ''}`} />
            </div>
            
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-[15.5px] font-extrabold text-gray-900 dark:text-white truncate tracking-tight">{c.competitor_name}</h4>
                  <div className="flex items-center gap-1.5 text-gray-500 mt-1">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{c.verdict || 'Alternative'}</span>
                  </div>
                </div>
                {c.competitor_slug && (
                  <a href={`/property/${c.competitor_slug}`} className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors">
                    <ChevronRight size={16} />
                  </a>
                )}
              </div>
              
              <div className="mt-3 space-y-1.5">
                {c.this_project_advantage && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="text-[12px] font-medium text-gray-600 dark:text-gray-400 leading-snug">{c.this_project_advantage}</span>
                  </div>
                )}
                {c.competitor_advantage && (
                  <div className="flex items-start gap-2">
                    <Warning size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="text-[12px] font-medium text-gray-600 dark:text-gray-400 leading-snug">{c.competitor_advantage}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main orchestrator ───────────────────────────────────────────────────────
export default function OverviewTab({
  project, detail, d, loading, documents, whyBuy, onGoToLocation, onGoToDocuments, onGoToPricing,
}: OverviewTabProps) {
  const [showAllAmenities, setShowAllAmenities] = useState(false)
  const [showAllDetails, setShowAllDetails] = useState(false)
  const [showAllHighlights, setShowAllHighlights] = useState(false)

  const marketingClaims = detail?.marketing_claims ?? []
  const amenities = (detail?.all_amenities ?? []) as { name: string; category: string }[]
  const competitors = detail?.competitors ?? []
  const groupedAmenities = amenities.reduce((acc, a) => { (acc[a.category] = acc[a.category] ?? []).push(a.name); return acc }, {} as Record<string, string[]>)
  const unitTypes = d?.unit_types ?? []
  const connections = detail?.all_connectivity ?? d?.top_connectivity ?? []


    // ── Build dynamic Quick Info items from real DB data ────────────────────
    const metroConn = connections.find(c => c.type === 'metro')
    const hasSecurityAmenity = amenities.some(a => a.category === 'security')
    const quickInfoItems: { label: string; icon: any; color: string }[] = []
    if (amenities.length > 0)
      quickInfoItems.push({ label: `${amenities.length}+ Amenities`, icon: Dumbbell, color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400' })
    if (metroConn)
      quickInfoItems.push({ label: metroConn.distance_km != null ? `${metroConn.distance_km} km to Metro` : 'Metro Nearby', icon: TrainFront, color: 'bg-[#E0F2F1] text-[#00695C] dark:bg-[#122c28] dark:text-[#4db6ac]' })
    if (d?.open_space_pct != null)
      quickInfoItems.push({ label: `${d.open_space_pct}% Open Spaces`, icon: Leaf, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' })
    if (hasSecurityAmenity)
      quickInfoItems.push({ label: '24×7 Security', icon: Shield, color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400' })
    if (d?.green_rating)
      quickInfoItems.push({ label: d.green_rating, icon: DropletLeafIcon, color: 'bg-lime-50 text-lime-700 dark:bg-lime-950/30 dark:text-lime-400' })
    if (d?.rera_number)
      quickInfoItems.push({ label: 'RERA Registered', icon: FileText, color: 'bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400' })

    return (
      <div className="p-4 md:p-8 space-y-8 bg-[#F7F9FB] dark:bg-[#0f0e0d] text-gray-900 dark:text-gray-100 font-sans">

        {/* 3. Quick Info Icon Bar — only shown when we have real DB data */}
        {quickInfoItems.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {quickInfoItems.map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[20px] p-4 flex items-center gap-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all hover:-translate-y-0.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                    <Icon size={18} />
                  </div>
                  <span className="text-[12.5px] font-bold text-gray-800 dark:text-gray-200">
                    {item.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* 9. Built by Elite Group (Moved Up) */}
        <div className="bg-white dark:bg-[#171412] border border-gray-100 dark:border-gray-800/40 rounded-3xl p-6 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6 space-y-2">
            <h2 className="text-[16px] font-extrabold text-gray-900 dark:text-white tracking-tight">
              Built by {d?.builder?.name ?? (loading ? <span className="inline-block w-24 h-5 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" /> : '--')}
            </h2>
            {loading && !detail?.builder_detail ? (
              <div className="space-y-1.5 mt-2">
                <div className="h-3 w-full bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-3 w-[90%] bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-3 w-[70%] bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            ) : detail?.builder_detail?.company_overview ? (
              <p className="text-[12.5px] text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
                {detail.builder_detail.company_overview}
              </p>
            ) : null}
          </div>
          <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Experience', val: detail?.builder_detail?.founded_year ? `${new Date().getFullYear() - detail.builder_detail.founded_year}+ Yrs` : '--' },
              { label: 'Delivered', val: detail?.builder_detail?.delivered_units ? `${detail.builder_detail.delivered_units.toLocaleString('en-IN')}+ Units` : '--' },
              { label: 'RERA Score', val: detail?.builder_detail?.rera_compliance_score != null ? `${detail.builder_detail.rera_compliance_score}%` : '--' },
              { label: 'ISO Certified', val: detail?.builder_detail?.iso_certified === true ? 'Certified' : detail?.builder_detail?.iso_certified === false ? 'Not Certified' : '--' }
            ].map((b, i) => (
              <div key={i} className="bg-gray-50 dark:bg-[#201c18] border border-gray-100 dark:border-gray-800/40 rounded-xl p-3.5 text-center">
                {loading && !detail?.builder_detail ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-2">
                    <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-2 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                ) : (
                  <>
                    <p className="text-[15px] font-black text-gray-800 dark:text-white leading-none">{b.val}</p>
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mt-1">{b.label}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 4. Why [Name] is a Great Choice — only shown when whyBuy data is available */}
        {whyBuy.length > 0 && (
          <div className="space-y-5">
            <h2 className="text-[20px] md:text-[22px] font-black text-gray-900 dark:text-white tracking-tight">
              Why {d?.name ?? 'This Project'} is a Great Choice
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {whyBuy.slice(0, 4).map((reason, i) => {
                const icons = [MapPin, TrainFront, Building2, LineChart]
                const bgs = ['bg-[#E8F5E9] text-[#2E7D32]', 'bg-[#E3F2FD] text-[#1565C0]', 'bg-[#E0F2F1] text-[#00695C]', 'bg-[#F3E5F5] text-[#6A1B9A]']
                const Icon = icons[i % icons.length]
                const bg = bgs[i % bgs.length]
                return (
                  <div key={i} className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3.5 transition-all hover:-translate-y-0.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
                      <Icon size={18} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 leading-relaxed">
                        {reason}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 5. Unit Options */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-[#c47860] dark:text-[#c47860]">
              UNIT OPTIONS
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {unitTypes.map((opt, i) => {
              const startsAt = opt.super_area_sqft && opt.price_min_cr ? `Starts ₹${Math.round((opt.price_min_cr * 10000000) / opt.super_area_sqft).toLocaleString('en-IN')}/sqft` : null;
              return (
                <div key={i} className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 hover:ring-black/10 dark:hover:ring-white/20 rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4 transition-all duration-300 hover:-translate-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[16px] font-black text-gray-900 dark:text-white">{opt.name || `${opt.bhk} BHK`}</span>
                    <BedDouble size={18} className="text-gray-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                      {opt.super_area_sqft ? `${opt.super_area_sqft} sqft` : `${opt.carpet_area_sqft} sqft (Carpet)`}
                    </p>
                    <p className="text-[18px] font-black text-[#c47860] dark:text-[#c47860] leading-none mt-1">
                      {opt.price_min_cr != null
                        ? (opt.price_min_cr === opt.price_max_cr ? `₹${opt.price_min_cr} Cr` : `₹${opt.price_min_cr} – ${opt.price_max_cr} Cr`)
                        : '--'}
                    </p>
                    {startsAt && <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-1">{startsAt}</p>}
                  </div>
                </div>
              )
            })}
            <div className="border border-dashed border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[16px] font-black text-gray-900 dark:text-white">More Options</span>
                <Sparkles size={18} className="text-gray-400" />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">View all unit types</p>
                <p className="text-[18px] font-black text-[#c47860] dark:text-[#c47860] leading-none mt-1">Duplex, Penthouses</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-1">Available config</p>
              </div>
            </div>
          </div>
          <button 
            onClick={onGoToPricing} 
            className="w-full py-3.5 bg-white dark:bg-[#111] hover:bg-gray-50 dark:hover:bg-white/5 ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[20px] text-[13px] font-extrabold text-gray-700 dark:text-gray-300 transition-colors flex items-center justify-center gap-2 shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            Compare All Unit Types
          </button>
        </div>

        {/* 6. Highlights & Amenities Split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* Key Highlights */}
          {marketingClaims.length > 0 && (
            <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
              <h2 className="text-[16px] font-extrabold text-gray-900 dark:text-white tracking-tight">
                Key Highlights
              </h2>
              <ul className="space-y-3.5">
                {(showAllHighlights ? marketingClaims : marketingClaims.slice(0, 5)).map((h: any, i: any) => (
                  <li key={i} className="flex items-start gap-3 text-[13.5px] text-gray-700 dark:text-gray-300 leading-relaxed font-semibold">
                    <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
              {marketingClaims.length > 5 && (
                <button 
                  onClick={() => setShowAllHighlights(!showAllHighlights)}
                  className="text-[12.5px] font-extrabold text-[#c47860] hover:underline"
                >
                  {showAllHighlights ? 'Show Less' : `+ ${marketingClaims.length - 5} more highlights`}
                </button>
              )}
            </div>
          )}

          {/* Amenities */}
          {amenities.length > 0 && (
            <div className="bg-white dark:bg-[#171412] border border-gray-100 dark:border-gray-800/40 rounded-3xl p-6 shadow-sm space-y-6">
              <h2 className="text-[16px] font-extrabold text-gray-900 dark:text-white tracking-tight">
                Amenities
              </h2>
              <div className="space-y-4">
                {Object.entries(groupedAmenities).slice(0, showAllAmenities ? undefined : 2).map(([category, list]) => (
                  <div key={category}>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">{category}</p>
                    <div className="flex flex-wrap gap-2">
                      {list.map(a => (
                        <span key={a} className="bg-gray-50 dark:bg-[#201c18] border border-gray-100 dark:border-gray-800/40 px-3.5 py-2 rounded-xl text-[12px] font-bold text-gray-700 dark:text-gray-300">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {Object.keys(groupedAmenities).length > 2 && (
                <button 
                  onClick={() => setShowAllAmenities(!showAllAmenities)}
                  className="text-[12.5px] font-extrabold text-[#c47860] hover:underline"
                >
                  {showAllAmenities ? 'Show Less' : `+ ${Object.keys(groupedAmenities).length - 2} more categories`}
                </button>
              )}
            </div>
          )}

        </div>

        {/* Alternatives */}
        {competitors.length > 0 && (
          <AlternativesCard competitors={competitors} />
        )}

        {/* 7. Project Details */}
        <div className="bg-white dark:bg-[#171412] border border-gray-100 dark:border-gray-800/40 rounded-3xl p-6 shadow-sm space-y-6">
          <h2 className="text-[16px] font-extrabold text-gray-900 dark:text-white tracking-tight">
            Project Details
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Status', val: d?.status ? d.status.replace(/_/g, ' ').toUpperCase() : '--', icon: Building2 },
              { label: 'Total Towers', val: d?.total_towers ? `${d.total_towers}` : '--', icon: Building2 },
              { label: 'Total Units', val: (d as any)?.total_units ? `${(d as any).total_units}` : '--', icon: Sparkles },
              { label: 'Configuration', val: unitTypes.length > 0 ? ([...new Set(unitTypes.map(u => u.bhk))].join(', ') + ' BHK') : '--', icon: BedDouble },
              { label: 'Land Area', val: d?.land_area_acres ? `${d.land_area_acres} Acres` : '--', icon: Leaf },
              { label: 'Floors', val: d?.floors ?? '--', icon: Building2 },
              { label: 'Launch Date', val: d?.launch_date ? (() => { const d2 = new Date(d.launch_date); return isNaN(d2.getTime()) ? '—' : d2.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) })() : '—', icon: FileText },
              { label: 'Possession', val: d?.possession_label ?? '—', icon: FileText }
            ].slice(0, showAllDetails ? undefined : 4).map((detailItem, i) => {
              const Icon = detailItem.icon
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-[#201c18] flex items-center justify-center text-gray-400 flex-shrink-0">
                    <Icon size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider leading-none">{detailItem.label}</p>
                    <p className="text-[13px] font-extrabold text-gray-800 dark:text-gray-200 mt-1 leading-snug">{detailItem.val}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-center">
            <button 
              onClick={() => setShowAllDetails(!showAllDetails)}
              className="text-[12.5px] font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              {showAllDetails ? 'Show Less' : 'View All Project Details'} <ChevronRight size={14} className={showAllDetails ? 'rotate-95 transition-transform' : ''} />
            </button>
          </div>
        </div>

        {/* 8. Downloads & Brochures */}
        <div className="bg-white dark:bg-[#171412] border border-gray-100 dark:border-gray-800/40 rounded-3xl p-6 shadow-sm space-y-6">
          <h2 className="text-[16px] font-extrabold text-gray-900 dark:text-white tracking-tight">
            Downloads & Brochures
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {documents.length > 0 ? (
              documents.map((doc, i) => (
                <a key={doc.id} href={doc.storage_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#201c18] border border-gray-100 dark:border-gray-800/40 rounded-2xl hover:bg-gray-100/50 dark:hover:bg-[#2c2723] transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-[#341d1a] flex items-center justify-center text-red-500">
                      <FileText size={16} />
                    </div>
                    <div>
                      <p className="text-[12.5px] font-extrabold text-gray-800 dark:text-gray-200">{doc.name || 'Document'}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold">{formatFileSize(doc.file_size_bytes) || 'PDF'}</p>
                    </div>
                  </div>
                  <Download size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                </a>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-[#201c18] flex items-center justify-center mb-3">
                  <FileText size={20} className="text-gray-300" />
                </div>
                <p className="text-[13px] font-semibold text-gray-500">No brochures uploaded yet</p>
                <p className="text-[12px] text-gray-400 mt-1">Documents will appear here once published by the developer.</p>
              </div>
            )}
          </div>
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-center">
            <button onClick={onGoToDocuments} className="text-[12.5px] font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all documents in Document Center <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* (Built By Moved Up) */}

        {/* 10. Location & Connectivity & Nearby */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Location & Connectivity */}
          <div className="lg:col-span-6 bg-white dark:bg-[#171412] border border-gray-100 dark:border-gray-800/40 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="text-[16px] font-extrabold text-gray-900 dark:text-white tracking-tight">
                Location & Connectivity
              </h2>
              <div className="space-y-0.5">
                {connections.length > 0 ? (
                  connections.map((c, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800/20 last:border-0 text-[13px] font-semibold text-gray-700 dark:text-gray-300">
                      <span>{c.name}</span>
                      <span className="text-[#c47860] tabular-nums">{c.distance_km != null ? `${c.distance_km} km` : 'At Doorstep'}</span>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center">
                    <MapPin size={20} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-[13px] text-gray-400 font-medium">No connectivity data available</p>
                    <p className="text-[12px] text-gray-400 mt-1">Add connectivity details in the admin panel.</p>
                  </div>
                )}
              </div>
            </div>
            <button onClick={onGoToLocation} className="w-full mt-6 py-3 bg-white dark:bg-[#171412] hover:bg-gray-50 border border-gray-200 dark:border-gray-800/40 rounded-2xl text-[12.5px] font-extrabold text-[#c47860] transition-colors flex items-center justify-center gap-1.5 shadow-sm">
              <MapPin size={14} />
              View on Map
            </button>
          </div>

          {/* What's Nearby */}
          <div className="lg:col-span-6 bg-white dark:bg-[#171412] border border-gray-100 dark:border-gray-800/40 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="text-[16px] font-extrabold text-gray-900 dark:text-white tracking-tight">
                What&apos;s Nearby
              </h2>
              {(() => {
                const hasConnectivity = (detail?.all_connectivity?.length ?? 0) > 0
                if (!hasConnectivity) {
                  return (
                    <div className="py-4 text-center">
                      <ShoppingBag size={20} className="text-gray-300 mx-auto mb-2" />
                      <p className="text-[13px] text-gray-400 font-medium">Nearby intelligence coming soon</p>
                      <p className="text-[12px] text-gray-400 mt-1">Check the Location tab for connectivity details.</p>
                    </div>
                  )
                }
                const topConnectivity = detail!.all_connectivity!.slice(0, 4)
                return (
                  <div className="space-y-3 mt-4">
                    {topConnectivity.map((c, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50/50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                          {c.type === 'metro' ? <TrainFront size={18} /> : c.type === 'road' ? <Car size={18} /> : c.type === 'school' ? <GraduationCap size={18} /> : c.type === 'hospital' ? <HeartPulse size={18} /> : <MapPin size={18} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-bold text-gray-900 dark:text-gray-100 truncate">{c.name}</p>
                          <p className="text-[11.5px] text-gray-500 font-medium mt-0.5">{c.distance_km} km away</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
            <button 
              onClick={onGoToLocation}
              className="w-full mt-6 py-3 bg-white dark:bg-[#171412] hover:bg-gray-50 border border-gray-200 dark:border-gray-800/40 rounded-2xl text-[12.5px] font-extrabold text-blue-600 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              View Full Neighborhood
            </button>
          </div>

        </div>

      </div>
    )
}
