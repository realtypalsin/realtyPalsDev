'use client'

import { memo, useState } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { MapPin, Home, Zap, TrendingUp, Clock, Building, AlertCircle, CheckCircle, DollarSign, MapIcon, Send } from 'lucide-react'
import type { ComponentSpec } from '@/types/property'

// ─── Individual Component Renderers ───────────────────────────────────────

function PropertyCard({ props }: { props: Record<string, any> }) {
  return (
    <div className="p-4 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-900 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <h3 className="font-bold text-gray-900 dark:text-white mb-2">{props.name}</h3>
      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
        {props.price && <div>💰 {props.price}</div>}
        {props.status && <div>📍 {props.status}</div>}
        {props.possession && <div>📅 {props.possession}</div>}
      </div>
    </div>
  )
}

function PriceChart({ props }: { props: Record<string, any> }) {
  const data = props.data || [
    { month: 'Jan', price: props.basePrice || 0 },
    { month: 'Feb', price: (props.basePrice || 0) * 1.02 },
  ]
  return (
    <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
      <h3 className="font-bold text-gray-900 dark:text-white mb-3">{props.title || 'Price History'}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="price" stroke="#3b82f6" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function EMICalculator({ props }: { props: Record<string, any> }) {
  const principal = props.principal || 5000000
  const rate = props.ratePercentage || 7.5
  const tenure = props.tenure || 20
  const monthlyRate = rate / 12 / 100
  const numPayments = tenure * 12
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)

  return (
    <div className="p-4 bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-gray-900 border border-green-200 dark:border-green-800 rounded-xl">
      <h3 className="font-bold text-gray-900 dark:text-white mb-4">{props.title || 'EMI Breakdown'}</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-300">Principal</span>
          <span className="font-semibold text-gray-900 dark:text-white">₹{Math.round(principal / 1000000 * 100) / 100}Cr</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-300">Interest Rate</span>
          <span className="font-semibold text-gray-900 dark:text-white">{rate}% p.a.</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-300">Tenure</span>
          <span className="font-semibold text-gray-900 dark:text-white">{tenure} years</span>
        </div>
        <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />
        <div className="flex justify-between items-center pt-2">
          <span className="font-bold text-gray-900 dark:text-white">Monthly EMI</span>
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">₹{Math.round(emi / 1000)}k</span>
        </div>
      </div>
    </div>
  )
}

function MapView({ props }: { props: Record<string, any> }) {
  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl h-48 flex items-center justify-center">
      <div className="text-center">
        <MapIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{props.location}</p>
        {props.coordinates && <p className="text-xs text-gray-400">{props.coordinates}</p>}
      </div>
    </div>
  )
}

function AmenitiesGrid({ props }: { props: Record<string, any> }) {
  const amenities = props.amenities || []
  return (
    <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
      <h3 className="font-bold text-gray-900 dark:text-white mb-3">{props.title || 'Amenities'}</h3>
      <div className="grid grid-cols-2 gap-2">
        {amenities.map((amenity: string, i: number) => (
          <div key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <CheckCircle className="w-4 h-4 text-green-500" />
            {amenity}
          </div>
        ))}
      </div>
    </div>
  )
}

function ConnectivityList({ props }: { props: Record<string, any> }) {
  const items = props.connectivity || []
  return (
    <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
      <h3 className="font-bold text-gray-900 dark:text-white mb-3">{props.title || 'Nearby Connectivity'}</h3>
      <div className="space-y-2">
        {items.map((item: any, i: number) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
              {item.distance && <p className="text-xs text-gray-500 dark:text-gray-400">{item.distance}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BuilderCard({ props }: { props: Record<string, any> }) {
  return (
    <div className="p-4 bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-gray-900 border border-amber-200 dark:border-amber-800 rounded-xl">
      <div className="flex items-start gap-3">
        <Building className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 dark:text-white">{props.builderName}</h3>
          <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
            {props.deliveryScore && <div>✅ Track Record: {Math.round(props.deliveryScore * 100)}%</div>}
            {props.projectsCompleted && <div>🏗️ {props.projectsCompleted} projects completed</div>}
            {props.reputation && <div>⭐ {props.reputation}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

function Timeline({ props }: { props: Record<string, any> }) {
  const milestones = props.milestones || []
  return (
    <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
      <h3 className="font-bold text-gray-900 dark:text-white mb-4">{props.title || 'Construction Timeline'}</h3>
      <div className="space-y-3">
        {milestones.map((milestone: any, i: number) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              {i < milestones.length - 1 && <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-600" />}
            </div>
            <div className="pb-2">
              <p className="font-medium text-gray-900 dark:text-white text-sm">{milestone.phase}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{milestone.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PaymentBreakdown({ props }: { props: Record<string, any> }) {
  const basePrice = props.basePrice || 0
  const gst = props.gst || 0
  const stampDuty = props.stampDuty || 0
  const total = basePrice + gst + stampDuty

  return (
    <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
      <h3 className="font-bold text-gray-900 dark:text-white mb-4">{props.title || 'Cost Breakdown'}</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-300">Base Price</span>
          <span className="font-medium text-gray-900 dark:text-white">₹{basePrice}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-300">GST ({props.gstRate || 5}%)</span>
          <span className="font-medium text-gray-900 dark:text-white">₹{gst}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-300">Stamp Duty ({props.stampDutyRate || 7}%)</span>
          <span className="font-medium text-gray-900 dark:text-white">₹{stampDuty}</span>
        </div>
        <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />
        <div className="flex justify-between pt-2">
          <span className="font-bold text-gray-900 dark:text-white">Total</span>
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">₹{total}</span>
        </div>
      </div>
    </div>
  )
}

function LocationScorecard({ props }: { props: Record<string, any> }) {
  const score = props.score || 0
  return (
    <div className="p-4 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-900 border border-purple-200 dark:border-purple-800 rounded-xl">
      <h3 className="font-bold text-gray-900 dark:text-white mb-3">{props.title || 'Location Score'}</h3>
      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" className="dark:stroke-gray-700" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="#a855f7" strokeWidth="8" strokeDasharray={`${(score / 100) * 283} 283`} className="transition-all" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-gray-900 dark:text-white">{Math.round(score)}</span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-gray-300">{props.description || 'Area suitability'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{props.reasoning}</p>
        </div>
      </div>
    </div>
  )
}

function ConfidenceBadge({ props }: { props: Record<string, any> }) {
  const confidence = props.confidence || 0
  const color = confidence >= 0.8 ? 'green' : confidence >= 0.65 ? 'yellow' : 'orange'
  const colorClass = {
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  }

  return (
    <div className={`p-3 rounded-lg border ${colorClass[color]}`}>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color === 'green' ? '#22c55e' : color === 'yellow' ? '#eab308' : '#f97316' }} />
        <span className="text-sm font-medium">
          {Math.round(confidence * 100)}% confident
        </span>
      </div>
      {props.reason && <p className="text-xs mt-1 opacity-80">{props.reason}</p>}
    </div>
  )
}

function RiskMeter({ props }: { props: Record<string, any> }) {
  const riskLevel = props.riskLevel || 'medium'
  const riskScore = props.riskScore || 0.5

  return (
    <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
      <h3 className="font-bold text-gray-900 dark:text-white mb-3">Risk Assessment</h3>
      <div className="flex items-center gap-3">
        <AlertCircle className={`w-5 h-5 ${riskLevel === 'high' ? 'text-red-500' : riskLevel === 'medium' ? 'text-yellow-500' : 'text-green-500'}`} />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{riskLevel} risk</p>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
            <div
              className={`h-2 rounded-full ${riskLevel === 'high' ? 'bg-red-500' : riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${riskScore * 100}%` }}
            />
          </div>
        </div>
      </div>
      {props.concerns && (
        <ul className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-300">
          {props.concerns.map((concern: string, i: number) => (
            <li key={i} className="flex gap-2">
              <span>•</span>
              <span>{concern}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function LeadForm({ props }: { props: Record<string, any> }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone || phone.length < 10) return
    setLoading(true)
    try {
      await fetch('/api/v1/leads/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || 'Interested Buyer',
          phone,
          project_name: props.projectName || props.project_name || 'Project Inquiry',
          notes: props.inquiryTopic ? `Requested verified data: ${props.inquiryTopic}` : 'Advisory document request',
        })
      })
      setSubmitted(true)
    } catch {
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
        <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
        <h4 className="font-semibold text-emerald-900 dark:text-emerald-200">Request Sent Successfully!</h4>
        <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">Our advisory team will share verified records & documents with you shortly.</p>
      </div>
    )
  }

  return (
    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-gray-900 dark:to-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <h3 className="font-bold text-gray-900 dark:text-white text-sm">Request Official Verified Documents</h3>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
        {props.inquiryTopic ? `Specific records for "${props.inquiryTopic}" of ${props.projectName || 'this project'} are under verification update. Connect with our advisory desk for direct verified files:` : 'Connect with our project intelligence desk for personalized verified documents:'}
      </p>
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          />
          <input
            type="tel"
            placeholder="Phone Number *"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Request to Advisory Desk'}
        </button>
      </form>
    </div>
  )
}

// Map component type to renderer
const COMPONENT_RENDERERS: Record<string, React.ComponentType<{ props: Record<string, any> }>> = {
  'property-card': PropertyCard,
  'price-chart': PriceChart,
  'emi-calculator': EMICalculator,
  'map-view': MapView,
  'amenities-grid': AmenitiesGrid,
  'connectivity-list': ConnectivityList,
  'builder-card': BuilderCard,
  'timeline': Timeline,
  'payment-breakdown': PaymentBreakdown,
  'location-scorecard': LocationScorecard,
  'confidence-badge': ConfidenceBadge,
  'risk-meter': RiskMeter,
  'lead-form': LeadForm,
}

// ─── Main Renderer ───────────────────────────────────────────────────────

export interface ComponentRendererProps {
  specs: ComponentSpec[]
  onError?: (error: Error, componentType: string) => void
}

export const ComponentRenderer = memo(function ComponentRenderer({ specs, onError }: ComponentRendererProps) {
  if (!specs || specs.length === 0) {
    return (
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl text-center text-sm text-gray-500 dark:text-gray-400">
        No data to display
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {specs.map((spec, i) => {
        try {
          // EDGE CASE: Validate spec before rendering (Phase 8)
          if (!spec || !spec.type || !spec.props) {
            console.warn(`[ComponentRenderer] Invalid spec at index ${i}:`, spec)
            return (
              <div key={i} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-700 dark:text-yellow-300">
                Invalid data format for component
              </div>
            )
          }

          const Renderer = COMPONENT_RENDERERS[spec.type]
          if (!Renderer) {
            console.warn(`[ComponentRenderer] Unknown component type: ${spec.type}`)
            return (
              <div key={i} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                Component type not supported: {spec.type}
              </div>
            )
          }

          return <Renderer key={i} props={spec.props} />
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error))
          console.error(`[ComponentRenderer] Error rendering component at index ${i}:`, err)
          onError?.(err, spec.type)

          return (
            <div key={i} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              Error displaying component: {err.message}
            </div>
          )
        }
      })}
    </div>
  )
})
