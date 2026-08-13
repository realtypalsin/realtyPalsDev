'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, TrendingUp, AlertCircle, Clock, DollarSign, MapPin } from 'lucide-react'

interface LeadDossierData {
  id: string
  name: string
  phone: string
  projectName: string
  createdAt: string

  buyerArchetype: string
  purpose: string
  familyStage: string
  workLocation?: string
  timeline?: { months: number; urgency: string }

  budgetMin: number | null
  budgetMax: number | null
  budgetFlexibility: string
  bhkPreference: number[]
  lifestyleSignals: string[]

  financing: {
    loanPreApproved: boolean
    emiQuestionCount: number
    affordabilityFocus: string
  }

  engagement: {
    totalMessages: number
    messageVelocity: string
    depthAnalysis: { browsing: number; evaluation: number; deepDive: number }
    timeToFirstSave: number | null
  }

  journeyTimeline: Array<{
    timestamp: string
    type: string
    query?: string
    projectSlug?: string
    action?: string
  }>

  objections: Array<{
    projectSlug: string
    projectName: string
    reason: string
    quote?: string
  }>

  conversionSignals: {
    saved: number
    compared: number
    callbackRequested: boolean
  }

  recommendedAction?: {
    type: string
    reason: string
    priority: string
  }
}

export function LeadDossier({ leadId }: { leadId: string }) {
  const [dossier, setDossier] = useState<LeadDossierData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>('overview')

  useEffect(() => {
    async function fetchDossier() {
      try {
        const res = await fetch(`/api/leads/callback/${leadId}/dossier`)
        if (!res.ok) throw new Error('Failed to fetch dossier')
        const data = await res.json()
        setDossier(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchDossier()
  }, [leadId])

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading lead dossier...</div>
  }

  if (error || !dossier) {
    return <div className="p-6 bg-red-50 text-red-600 rounded">Error: {error || 'No data'}</div>
  }

  return (
    <div className="space-y-4 bg-white rounded-lg">
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h2 className="text-2xl font-bold">{dossier.name}</h2>
            <p className="text-gray-600">{dossier.phone}</p>
          </div>
          {dossier.recommendedAction && (
            <div className={`px-3 py-1 rounded text-sm font-medium ${dossier.recommendedAction.priority === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {dossier.recommendedAction.priority === 'HIGH' ? '🔥 HOT' : '⚠️ WARM'}
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500">Interested in: {dossier.projectName}</p>
      </div>

      {/* Recommended Action */}
      {dossier.recommendedAction && (
        <div className="mx-6 p-4 bg-blue-50 rounded border border-blue-200">
          <p className="font-semibold text-blue-900">Next Action:</p>
          <p className="text-blue-800 text-sm">{dossier.recommendedAction.reason}</p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b">
        <div>
          <p className="text-xs text-gray-600">Budget</p>
          <p className="text-lg font-semibold">{dossier.budgetMin?.toFixed(1)} – {dossier.budgetMax?.toFixed(1)} cr</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Messages</p>
          <p className="text-lg font-semibold">{dossier.engagement.totalMessages}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Saved</p>
          <p className="text-lg font-semibold">{dossier.conversionSignals.saved}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Engagement</p>
          <p className="text-lg font-semibold">{dossier.engagement.messageVelocity}</p>
        </div>
      </div>

      {/* Buyer Profile */}
      <Section title="Buyer Profile" id="profile" expanded={expandedSection} setExpanded={setExpandedSection}>
        <div className="space-y-3 text-sm">
          <div>
            <span className="font-semibold">Type:</span> {dossier.buyerArchetype}
          </div>
          <div>
            <span className="font-semibold">Purpose:</span> {dossier.purpose}
          </div>
          {dossier.workLocation && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-600" />
              <span className="font-semibold">Work:</span> {dossier.workLocation}
            </div>
          )}
          {dossier.timeline && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-600" />
              <span className="font-semibold">Timeline:</span> {dossier.timeline.months}mo ({dossier.timeline.urgency})
            </div>
          )}
          {dossier.bhkPreference.length > 0 && (
            <div>
              <span className="font-semibold">BHK:</span> {dossier.bhkPreference.join(', ')}
            </div>
          )}
        </div>
      </Section>

      {/* Financing */}
      <Section title="Financing Profile" id="financing" expanded={expandedSection} setExpanded={setExpandedSection}>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>EMI Questions:</span>
            <span className="font-semibold">{dossier.financing.emiQuestionCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Affordability Focus:</span>
            <span className={`font-semibold ${dossier.financing.affordabilityFocus === 'HIGH' ? 'text-red-600' : dossier.financing.affordabilityFocus === 'MEDIUM' ? 'text-yellow-600' : 'text-green-600'}`}>
              {dossier.financing.affordabilityFocus}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Pre-Approved:</span>
            <span>{dossier.financing.loanPreApproved ? '✓' : '✗'}</span>
          </div>
        </div>
      </Section>

      {/* Journey Timeline */}
      <Section title="Property Journey" id="journey" expanded={expandedSection} setExpanded={setExpandedSection}>
        <div className="space-y-2 text-sm max-h-96 overflow-y-auto">
          {dossier.journeyTimeline.length === 0 ? (
            <p className="text-gray-500">No journey events recorded</p>
          ) : (
            dossier.journeyTimeline.map((event, i) => (
              <div key={i} className="flex gap-3 pb-2 border-b last:border-0">
                <span className="text-gray-500 min-w-fit">{new Date(event.timestamp).toLocaleTimeString()}</span>
                <div className="flex-1">
                  <p className="font-semibold capitalize">{event.type}</p>
                  {event.query && <p className="text-gray-600">"{event.query}"</p>}
                  {event.action && <p className="text-gray-600">{event.action}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </Section>

      {/* Objections */}
      {dossier.objections.length > 0 && (
        <Section title="Why They Might Not Convert" id="objections" expanded={expandedSection} setExpanded={setExpandedSection}>
          <div className="space-y-3">
            {dossier.objections.map((obj, i) => (
              <div key={i} className="p-3 bg-orange-50 rounded border border-orange-200">
                <p className="font-semibold text-orange-900">{obj.projectName}</p>
                <p className="text-orange-800 text-sm">{obj.reason}</p>
                {obj.quote && <p className="text-orange-700 italic text-xs mt-1">"{obj.quote}"</p>}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({
  title,
  id,
  expanded,
  setExpanded,
  children,
}: {
  title: string
  id: string
  expanded: string | null
  setExpanded: (id: string | null) => void
  children: React.ReactNode
}) {
  const isExpanded = expanded === id

  return (
    <div className="border-t">
      <button
        onClick={() => setExpanded(isExpanded ? null : id)}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition"
      >
        <h3 className="font-semibold text-lg">{title}</h3>
        <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
      {isExpanded && <div className="px-6 pb-6">{children}</div>}
    </div>
  )
}
