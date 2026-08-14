'use client'

import { useMemo } from 'react'

interface SpecItem {
  label: string
  value: string
  brand?: string | null
  tier?: string | null
  category: string
  verified_at?: Date | null
  is_highlight?: boolean
}

interface SpecificationGridProps {
  specs: SpecItem[]
}

const CATEGORY_ICON: Record<string, string> = {
  structure: '🏗️',
  flooring: '🏠',
  kitchen: '🍴',
  bathrooms: '🚿',
  doors_windows: '🚪',
  electrical: '⚡',
  plumbing: '🚰',
  lifts: '🛗',
  security: '🔐',
  sustainability: '🌿',
  parking: '🅿️',
}

const CATEGORY_LABEL: Record<string, string> = {
  structure: 'Structure & Safety',
  flooring: 'Flooring',
  kitchen: 'Kitchen',
  bathrooms: 'Bathrooms',
  doors_windows: 'Doors & Windows',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  lifts: 'Lifts',
  security: 'Security',
  sustainability: 'Sustainability',
  parking: 'Parking',
}

function TierBadge({ tier }: { tier?: string | null }) {
  if (!tier) return null
  const colors = {
    luxury: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300',
    premium: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300',
    standard: 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-300',
  }
  const color = colors[tier as keyof typeof colors] || colors.standard
  return <span className={`text-xs px-2 py-1 rounded ${color}`}>{tier}</span>
}

function VerificationBadge({ verified }: { verified?: Date | null }) {
  if (!verified) return <span className="text-xs text-gray-400 dark:text-gray-500">Brochure claim</span>
  return <span className="text-xs text-green-600 dark:text-green-400">✓ Site verified</span>
}

export function SpecificationGrid({ specs }: SpecificationGridProps) {
  const grouped = useMemo(() => {
    const groups: Record<string, SpecItem[]> = {}
    if (!Array.isArray(specs)) return groups
    specs.forEach(spec => {
      if (!groups[spec.category]) groups[spec.category] = []
      groups[spec.category].push(spec)
    })
    return groups
  }, [specs])

  if (!specs || !Array.isArray(specs) || specs.length === 0) {
    return null
  }

  return (
    <div className="space-y-6 pt-6 border-t border-gray-100 dark:border-white/5">
      {/* Highlights Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[17px] font-black text-gray-900 dark:text-white flex items-center gap-2">
            <span>🏗️</span> Construction &amp; Material Specifications
          </h3>
          <span className="text-xs font-bold text-gray-400">
            {specs.length} Verified Specifications
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
          {Object.entries(grouped).map(([category, items]) => (
            <div
              key={category}
              className="border border-gray-100 dark:border-white/5 rounded-2xl p-4 bg-white dark:bg-[#111] shadow-xs hover:border-gray-300 dark:hover:border-white/15 transition-all space-y-2.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{CATEGORY_ICON[category] || '📋'}</span>
                <h4 className="font-black text-xs text-gray-900 dark:text-white">
                  {CATEGORY_LABEL[category] || category}
                </h4>
              </div>
              <ul className="space-y-2 pt-1 border-t border-gray-50 dark:border-white/5">
                {items.slice(0, 2).map((spec, idx) => (
                  <li key={idx} className="text-xs space-y-0.5">
                    <div className="font-extrabold text-gray-800 dark:text-gray-200 text-[11.5px]">{spec.label}</div>
                    <div className="text-gray-500 dark:text-gray-400 text-[11px] leading-snug">{spec.value}</div>
                    {spec.brand && <div className="text-blue-600 dark:text-blue-400 font-bold text-[10px] mt-0.5">🏷️ {spec.brand}</div>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Full Spec List (collapsible) */}
      <details className="group border border-gray-100 dark:border-white/5 rounded-2xl bg-gray-50/50 dark:bg-white/[0.02] p-4 transition-all">
        <summary className="cursor-pointer font-black text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-between select-none">
          <span>View All Architectural Specifications ({specs.length})</span>
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 group-open:rotate-180 transition-transform">▾</span>
        </summary>
        <div className="space-y-6 mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="space-y-2.5">
              <h4 className="font-black text-xs flex items-center gap-1.5 text-gray-900 dark:text-white">
                <span>{CATEGORY_ICON[category] || '📋'}</span>
                <span>{CATEGORY_LABEL[category] || category}</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {items.map((spec, idx) => (
                  <div key={idx} className="bg-white dark:bg-[#111] p-3.5 rounded-xl border border-gray-100 dark:border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="font-extrabold text-xs text-gray-900 dark:text-white">{spec.label}</div>
                      {spec.tier && <TierBadge tier={spec.tier} />}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">{spec.value}</div>
                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      {spec.brand ? <span className="font-bold text-blue-600 dark:text-blue-400">Brand: {spec.brand}</span> : <span />}
                      <VerificationBadge verified={spec.verified_at} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
