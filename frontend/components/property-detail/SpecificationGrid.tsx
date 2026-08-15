'use client'

import { useMemo, useState } from 'react'
import {
  ShieldCheck,
  Layers,
  UtensilsCrossed,
  Droplets,
  DoorOpen,
  Zap,
  Wrench,
  ArrowUpDown,
  Lock,
  Leaf,
  Car,
  Boxes,
  CheckCircle2,
  Tag,
  ChevronDown,
  HardHat,
  Sparkles,
  Award
} from 'lucide-react'

interface SpecItem {
  label: string
  value: string
  brand?: string | null
  tier?: string | null
  category: string
  verified_at?: Date | null
  created_at?: Date | null
  is_highlight?: boolean
}

interface SpecificationGridProps {
  specs: SpecItem[]
}

interface CategoryTheme {
  icon: React.ComponentType<{ className?: string }>
  label: string
  iconBg: string
}

const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  structure: {
    icon: ShieldCheck,
    label: 'Structure & Safety',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300',
  },
  flooring: {
    icon: Layers,
    label: 'Flooring & Surfaces',
    iconBg: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300',
  },
  kitchen: {
    icon: UtensilsCrossed,
    label: 'Kitchen & Utility',
    iconBg: 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300',
  },
  bathrooms: {
    icon: Droplets,
    label: 'Bathrooms & CP Fittings',
    iconBg: 'bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300',
  },
  doors_windows: {
    icon: DoorOpen,
    label: 'Doors & Windows',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300',
  },
  electrical: {
    icon: Zap,
    label: 'Electrical & Power',
    iconBg: 'bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300',
  },
  plumbing: {
    icon: Wrench,
    label: 'Plumbing & Drainage',
    iconBg: 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300',
  },
  lifts: {
    icon: ArrowUpDown,
    label: 'Elevators & Vertical Transit',
    iconBg: 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300',
  },
  security: {
    icon: Lock,
    label: 'Security & Access Control',
    iconBg: 'bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300',
  },
  sustainability: {
    icon: Leaf,
    label: 'Green Building & Solar',
    iconBg: 'bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-300',
  },
  parking: {
    icon: Car,
    label: 'Parking & Basement',
    iconBg: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
  },
}

function getCategoryTheme(cat: string): CategoryTheme {
  const normalized = String(cat || '').toLowerCase().trim().replace(/[\s-]+/g, '_')
  return (
    CATEGORY_THEMES[normalized] || {
      icon: Boxes,
      label: cat ? cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'General Specification',
      iconBg: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
    }
  )
}

function TierBadge({ tier }: { tier?: string | null }) {
  if (!tier) return null
  const normalized = tier.toLowerCase()

  if (normalized.includes('luxury') || normalized.includes('ultra')) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/15 via-yellow-500/15 to-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-300/60 dark:border-amber-700/50 shadow-xs">
        <Sparkles className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
        {tier}
      </span>
    )
  }

  if (normalized.includes('premium')) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border border-blue-200/80 dark:border-blue-800/60 shadow-xs">
        <Award className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
        {tier}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
      {tier}
    </span>
  )
}

function VerificationBadge({ verified }: { verified?: Date | null }) {
  if (!verified) {
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
        Brochure Spec
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/40">
      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
      Site Verified
    </span>
  )
}

export function SpecificationGrid({ specs }: SpecificationGridProps) {
  const grouped = useMemo(() => {
    const groups: Record<string, SpecItem[]> = {}
    if (!Array.isArray(specs)) return groups
    specs.forEach(spec => {
      const cat = spec.category || 'general'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(spec)
    })
    return groups
  }, [specs])

  const categories = Object.keys(grouped)
  
  // Unified global expanded state - allows all to be open smoothly together
  const [isAllExpanded, setIsAllExpanded] = useState<boolean>(true)
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, boolean>>({})

  const isCategoryOpen = (cat: string) => {
    if (categoryOverrides[cat] !== undefined) {
      return categoryOverrides[cat]
    }
    return isAllExpanded
  }

  const toggleCategory = (cat: string) => {
    const current = isCategoryOpen(cat)
    setCategoryOverrides(prev => ({
      ...prev,
      [cat]: !current
    }))
  }

  const toggleAll = () => {
    const nextState = !isAllExpanded
    setIsAllExpanded(nextState)
    setCategoryOverrides({})
  }

  if (!specs || !Array.isArray(specs) || specs.length === 0) {
    return null
  }

  return (
    <section className="space-y-5 pt-8 border-t border-slate-200/70 dark:border-white/10" aria-label="Construction and Materials">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-md shadow-slate-900/10 dark:shadow-none">
            <HardHat className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Construction &amp; Material Specifications
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Verified structural, finishes, and MEP material benchmarks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{specs.length} Verified Specs</span>
          </div>
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white px-3 py-1 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shadow-2xs"
          >
            {isAllExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
      </div>

      {/* Adaptive, Clean Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {categories.map(category => {
          const items = grouped[category]
          const theme = getCategoryTheme(category)
          const IconComponent = theme.icon
          const isOpen = isCategoryOpen(category)

          // Extract brands for preview pills
          const brands = Array.from(new Set(items.map(i => i.brand).filter(Boolean))) as string[]

          return (
            <div
              key={category}
              className="rounded-2xl bg-white dark:bg-[#141414] border border-slate-200/80 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-none transition-all duration-200 overflow-hidden self-start"
            >
              {/* Category Accordion Header */}
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg ${theme.iconBg} flex items-center justify-center shrink-0`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-[13.5px] text-slate-900 dark:text-white tracking-tight truncate">
                      {theme.label}
                    </h4>
                    {!isOpen && brands.length > 0 && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {brands.join(' • ')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                    {items.length} {items.length === 1 ? 'spec' : 'specs'}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Expanded Content Details */}
              {isOpen && (
                <div className="p-4 pt-1 border-t border-slate-100 dark:border-white/5 space-y-3 bg-slate-50/30 dark:bg-white/[0.01]">
                  {items.map((spec: SpecItem, idx) => {
                    const label = (typeof spec === 'object' && spec?.label) || 'Specification'
                    const value = (typeof spec === 'object' && spec?.value) || ''
                    const tier = (typeof spec === 'object' ? spec?.tier : null) ?? null

                    return (
                      <div
                        key={idx}
                        className="bg-white dark:bg-[#1a1a1a] p-3.5 rounded-xl border border-slate-200/70 dark:border-white/5 space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold text-[13px] text-slate-900 dark:text-white">
                            {label}
                          </div>
                          {tier && <TierBadge tier={tier} />}
                        </div>

                        <div className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                          {value}
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-white/5">
                          {spec.brand ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                              <Tag className="w-3 h-3 text-slate-400" />
                              Brand: <span className="text-slate-900 dark:text-white font-bold">{spec.brand}</span>
                            </span>
                          ) : (
                            <span />
                          )}
                          <VerificationBadge verified={spec.verified_at || spec.created_at} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
