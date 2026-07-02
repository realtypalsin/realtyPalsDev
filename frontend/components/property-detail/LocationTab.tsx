'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrainFront, Plane, GraduationCap, HeartPulse, ShoppingBag, Landmark,
  BookOpen, Milestone, Route, MapPin, ChevronRight, CheckCircle2,
} from 'lucide-react'
import type { ProjectCard as ProjectCardType, ProjectDetail } from '@/types/project'
import CommuteCalculator from '@/components/CommuteCalculator'
import SectorMap from '@/components/SectorMap'
import { Card, CardRow } from './Card'

type Conn = { type: string; name: string; distance_km?: number | null }

const CONN_ICONS: Record<string, any> = {
  metro: TrainFront, airport: Plane, road: Route, expressway: Milestone, school: GraduationCap,
  hospital: HeartPulse, mall: ShoppingBag, landmark: Landmark, university: BookOpen,
}
const CONN_LABELS: Record<string, string> = {
  metro: 'Metro', airport: 'Airport', road: 'Road', expressway: 'Expressway', school: 'School',
  hospital: 'Hospital', mall: 'Shopping Mall', landmark: 'Landmark', university: 'University',
}

// A rough, labelled distance→time band — not a fabricated per-destination ETA
// (that requires a real routing call, which only the Commute Calculator makes).
// Purely a glance-friendly qualifier next to the real distance figure.
function paceLabel(km: number): string {
  if (km <= 1.5) return 'Walkable'
  if (km <= 5) return 'Short drive'
  if (km <= 15) return 'Drive'
  return 'Longer drive'
}

export interface LocationTabProps {
  project: ProjectCardType | null
  detail: ProjectDetail | null
  d: (ProjectCardType | ProjectDetail) | null
  projectAddress: string
}

// ── Section 1: Location Overview ────────────────────────────────────────────
function CommuteCard({ projectAddress }: { projectAddress: string }) {
  return (
    <Card title="Commute Calculator" description="How long from here to your office?" className="h-full">
      <CommuteCalculator projectAddress={projectAddress} />
    </Card>
  )
}

function MapCard({ project }: { project: ProjectCardType | null }) {
  if (!project) return null
  return (
    <Card title="Map" className="h-full !p-3 md:!p-3">
      <div className="rounded-[20px] overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
        <SectorMap properties={[project]} />
      </div>
    </Card>
  )
}

// ── Section 2: Connectivity ──────────────────────────────────────────────────
function ConnectivityRow({ c }: { c: Conn }) {
  const Icon = CONN_ICONS[c.type] ?? Route
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-gray-50 last:border-0">
      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
        <Icon size={17} className="text-blue-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-bold text-gray-900 truncate">{c.name}</p>
        <p className="text-[11.5px] text-gray-400">{CONN_LABELS[c.type] ?? c.type}</p>
      </div>
      {c.distance_km != null && (
        <div className="text-right flex-shrink-0">
          <p className="text-[13px] font-black text-gray-800">{c.distance_km} km</p>
          <p className="text-[10.5px] text-gray-400">{paceLabel(c.distance_km)}</p>
        </div>
      )}
    </div>
  )
}

function ConnectivitySection({ connectivity }: { connectivity: Conn[] }) {
  if (connectivity.length === 0) return null
  const sorted = [...connectivity].sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity))
  return (
    <Card title="Connectivity" description="Everything around this project, closest first.">
      <div>{sorted.map((c, i) => <ConnectivityRow key={`${c.type}-${c.name}-${i}`} c={c} />)}</div>
    </Card>
  )
}

// ── Section 3: Social Infrastructure ────────────────────────────────────────
function InfrastructureCard({ title, items }: { title: string; items: Conn[] }) {
  const [expanded, setExpanded] = useState(false)
  if (items.length === 0) return null
  const sorted = [...items].sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity))
  const top = sorted.slice(0, 3)
  const rest = sorted.slice(3)
  return (
    <Card title={title} className="h-full">
      <div className="space-y-2.5">
        {top.map((c, i) => (
          <div key={i} className="flex items-center justify-between text-[12.5px]">
            <span className="text-gray-700 font-medium truncate">{c.name}</span>
            {c.distance_km != null && <span className="text-gray-400 font-semibold flex-shrink-0 ml-2">{c.distance_km} km</span>}
          </div>
        ))}
      </div>
      {rest.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[11.5px] font-bold text-blue-600 cursor-pointer select-none flex items-center gap-1"
          >
            View {rest.length} more <ChevronRight size={12} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
          {expanded && (
            <div className="overflow-hidden mt-2.5 px-6 pb-6 pt-1 border-t border-gray-50">
              <div className="space-y-2.5">
                {rest.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-[12.5px]">
                    <span className="text-gray-700 font-medium truncate">{c.name}</span>
                    {c.distance_km != null && <span className="text-gray-400 font-semibold flex-shrink-0 ml-2">{c.distance_km} km</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function SocialInfrastructureSection({ connectivity }: { connectivity: Conn[] }) {
  const byType = (t: string) => connectivity.filter((c) => c.type === t)
  const groups = [
    { title: 'Schools', items: byType('school') },
    { title: 'Hospitals', items: byType('hospital') },
    { title: 'Shopping', items: byType('mall') },
    { title: 'Landmarks', items: byType('landmark') },
  ].filter((g) => g.items.length > 0)

  if (groups.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {groups.map((g) => <InfrastructureCard key={g.title} title={g.title} items={g.items} />)}
    </div>
  )
}

// ── Section 4: Neighborhood Advantages ──────────────────────────────────────
function AdvantagesCard({ claims }: { claims: string[] }) {
  if (claims.length === 0) return null
  return (
    <Card title="Neighborhood Advantages" className="h-full">
      <ul className="space-y-2.5">
        {claims.map((c) => (
          <li key={c} className="flex items-start gap-2 text-[13px] text-gray-700 leading-relaxed">
            <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
            {c}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function AreaInsightsCard({ localityLabel, connectivity }: { localityLabel: string | null; connectivity: Conn[] }) {
  const withDistance = connectivity.filter((c) => c.distance_km != null)
  const nearest = withDistance.length > 0 ? Math.min(...withDistance.map((c) => c.distance_km!)) : null

  const insights: Array<{ label: string; value: string }> = []
  if (localityLabel) insights.push({ label: 'Locality Quality', value: localityLabel })
  if (connectivity.length > 0) insights.push({ label: 'Connectivity', value: `${connectivity.length} points of interest mapped` })
  if (nearest != null) insights.push({ label: 'Nearest Amenity', value: `${nearest} km away` })

  if (insights.length === 0) return null

  return (
    <Card title="Area Insights" description="Derived from verified project and location data" className="h-full">
      <div className="space-y-4">
        {insights.map((ins) => (
          <div key={ins.label} className="flex items-center justify-between border-b border-gray-50 last:border-0 pb-3 last:pb-0">
            <span className="text-[12.5px] text-gray-500 font-medium">{ins.label}</span>
            <span className="text-[13px] font-bold text-gray-900">{ins.value}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Section 5: Commute Summary ───────────────────────────────────────────────
function CommuteSummarySection({ connectivity }: { connectivity: Conn[] }) {
  const nearestByType = (t: string) => {
    const matches = connectivity.filter((c) => c.type === t && c.distance_km != null)
    return matches.length > 0 ? matches.reduce((a, b) => (a.distance_km! < b.distance_km! ? a : b)) : null
  }

  const summary = ['metro', 'expressway', 'hospital', 'mall', 'airport']
    .map((t) => ({ type: t, entry: nearestByType(t) }))
    .filter((x) => x.entry !== null) as { type: string; entry: Conn }[]

  if (summary.length === 0) return null

  return (
    <Card title="Commute Summary" description="The closest essentials, ranked by distance.">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {summary.map(({ type, entry }) => {
          const Icon = CONN_ICONS[type] ?? MapPin
          return (
            <div key={type} className="rounded-2xl border border-gray-100 p-4 text-center">
              <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-2">
                <Icon size={16} className="text-gray-500" />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nearest {CONN_LABELS[type] ?? type}</p>
              <p className="text-[13px] font-bold text-gray-900 mt-1 truncate">{entry.name}</p>
              <p className="text-[12px] text-gray-500 font-semibold">{entry.distance_km} km</p>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ── Main orchestrator ────────────────────────────────────────────────────────
export default function LocationTab({ project, detail, d, projectAddress }: LocationTabProps) {
  const connectivity: Conn[] = detail?.all_connectivity ?? d?.top_connectivity ?? []
  const marketingClaims = detail?.marketing_claims ?? (d as any)?.marketing_claims ?? []
  const localityLabel = detail?.dna?.locality_label ?? null

  return (
    <div className="p-5 md:p-8 space-y-8">
      {/* Section 1 */}
      <CardRow left={<CommuteCard projectAddress={projectAddress} />} right={<MapCard project={project} />} />

      {/* Section 2 */}
      <ConnectivitySection connectivity={connectivity} />

      {/* Section 3 */}
      <SocialInfrastructureSection connectivity={connectivity} />

      {/* Section 4 */}
      {(marketingClaims.length > 0 || localityLabel || connectivity.length > 0) && (
        <CardRow
          left={<AdvantagesCard claims={marketingClaims} />}
          right={<AreaInsightsCard localityLabel={localityLabel} connectivity={connectivity} />}
        />
      )}

      {/* Section 5 */}
      <CommuteSummarySection connectivity={connectivity} />
    </div>
  )
}
