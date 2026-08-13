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
    luxury: 'bg-amber-100 text-amber-800',
    premium: 'bg-blue-100 text-blue-800',
    standard: 'bg-gray-100 text-gray-800',
  }
  const color = colors[tier as keyof typeof colors] || colors.standard
  return <span className={`text-xs px-2 py-1 rounded ${color}`}>{tier}</span>
}

function VerificationBadge({ verified }: { verified?: Date | null }) {
  if (!verified) return <span className="text-xs text-gray-400">Brochure claim</span>
  return <span className="text-xs text-green-600">✓ Site verified</span>
}

export function SpecificationGrid({ specs }: SpecificationGridProps) {
  const grouped = useMemo(() => {
    const groups: Record<string, SpecItem[]> = {}
    specs.forEach(spec => {
      if (!groups[spec.category]) groups[spec.category] = []
      groups[spec.category].push(spec)
    })
    return groups
  }, [specs])

  if (!specs || specs.length === 0) {
    return null
  }

  return (
    <div className="space-y-8 py-4">
      {/* Highlights Grid (4-card showcase) */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>🏢</span> Construction & Material Specifications
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Object.entries(grouped).map(([category, items]) => (
            <div
              key={category}
              className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition"
            >
              <div className="text-2xl mb-2">{CATEGORY_ICON[category] || '📋'}</div>
              <h3 className="font-semibold text-sm mb-3 text-gray-800">
                {CATEGORY_LABEL[category] || category}
              </h3>
              <ul className="space-y-2">
                {items.slice(0, 2).map((spec, idx) => (
                  <li key={idx} className="text-xs">
                    <div className="font-medium text-gray-700">{spec.label}</div>
                    <div className="text-gray-600 text-xs mt-0.5">{spec.value}</div>
                    {spec.brand && <div className="text-gray-500 text-xs">📌 {spec.brand}</div>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Full Spec List (collapsible) */}
      <details className="border-t pt-6">
        <summary className="cursor-pointer font-semibold text-gray-800 hover:text-gray-600">
          View all specifications
        </summary>
        <div className="space-y-6 mt-4">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <span>{CATEGORY_ICON[category] || '📋'}</span>
                {CATEGORY_LABEL[category] || category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((spec, idx) => (
                  <div key={idx} className="bg-gray-50 p-3 rounded border border-gray-100">
                    <div className="font-medium text-sm text-gray-800">{spec.label}</div>
                    <div className="text-sm text-gray-600 mt-1">{spec.value}</div>
                    <div className="flex items-center gap-2 mt-2">
                      {spec.brand && <span className="text-xs text-gray-500">{spec.brand}</span>}
                      {spec.tier && <TierBadge tier={spec.tier} />}
                    </div>
                    <div className="mt-2">
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
