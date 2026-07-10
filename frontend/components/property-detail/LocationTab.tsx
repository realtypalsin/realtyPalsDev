'use client'
import { useState } from 'react'
import {
  MapPin, Share2, Car, TrainFront, HeartPulse, ShoppingBag,
  GraduationCap, Plane, Briefcase, TrendingUp, CalendarDays, PhoneCall,
  Map as MapIcon, ChevronRight
} from 'lucide-react'
import type { ProjectCard as ProjectCardType, ProjectDetail } from '@/types/project'
import CommuteCalculator from '@/components/CommuteCalculator'
import SectorMap, { SECTOR_CENTROIDS } from '@/components/SectorMap'
import { buildWhatsAppUrl } from '@/lib/whatsapp'

export interface LocationTabProps {
  project: ProjectCardType | null
  detail: ProjectDetail | null
  d: (ProjectCardType | ProjectDetail) | null
  projectAddress: string
}

const ICONS: Record<string, any> = {
  car: Car,
  train: TrainFront,
  heartpulse: HeartPulse,
  shopping: ShoppingBag,
  school: GraduationCap,
  plane: Plane,
  briefcase: Briefcase,
  "trending-up": TrendingUp,
  "map-pin": MapPin,
}

export default function LocationTab({ project, detail, d, projectAddress }: LocationTabProps) {
  const waUrl = d ? buildWhatsAppUrl(d, 'panel') : 'https://wa.me/'

  // State handles
  const [selectedMapFilter, setSelectedMapFilter] = useState<'All' | 'Transport' | 'Education' | 'Healthcare' | 'Lifestyle' | 'Work'>('All')
  const [sharedStatus, setSharedStatus] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [commuteTarget, setCommuteTarget] = useState('')

  // Fetch data from DB via ProjectDetail
  const locationData = detail?.decision_profile?.intelligence_data || {
    location_hero_image: "",
    quick_commutes: [],
    location_highlights: [],
    nearby_essentials: {},
    neighborhood_advantages: []
  }

  // Base coordinates for calculations
  const projectLat = project?.lat || SECTOR_CENTROIDS[project?.sector || '']?.[0] || 28.535
  const projectLng = project?.lng || SECTOR_CENTROIDS[project?.sector || '']?.[1] || 77.391

  // Build markers from real connectivity data from DB; no hardcoded fabricated POIs
  const connectivity = detail?.all_connectivity || []
  const categoryMap: Record<string, string> = {
    'metro': 'Transport',
    'road': 'Transport',
    'expressway': 'Transport',
    'school': 'Education',
    'hospital': 'Healthcare',
    'mall': 'Lifestyle',
    'landmark': 'Lifestyle'
  }

  // Only show markers if we have real connectivity data
  const allMapMarkers = connectivity.map((conn: any) => ({
    name: conn.name || 'Nearby location',
    pos: [projectLat, projectLng] as [number, number], // Use project coords if no lat/lng in connectivity
    category: categoryMap[conn.type?.toLowerCase()] || 'Other'
  }))

  const filteredMapMarkers = selectedMapFilter === 'All'
    ? allMapMarkers
    : allMapMarkers.filter(m => m.category === selectedMapFilter)

  const handleGetDirections = () => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(projectAddress)}`, '_blank')
  }

  const handleShareLocation = () => {
    if (navigator.share) {
      navigator.share({ title: d?.name || 'Elite X', url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
      setSharedStatus(true)
      setTimeout(() => setSharedStatus(false), 2500)
    }
  }

  const triggerCommuteCalculator = (destinationName: string) => {
    setCommuteTarget(destinationName)
    const el = document.getElementById('commute-calculator-section')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  return (
    <div className="space-y-6 md:space-y-10 py-4">
      {/* 1. Hero Section */}
      <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] relative flex flex-col md:flex-row">
        {/* Left Content */}
        <div className="p-8 md:p-12 md:w-1/2 flex flex-col justify-center z-10 bg-white md:bg-transparent">
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3">Project Location</p>
          {d?.sector && d?.city && (
            <>
              <h2 className="text-[32px] md:text-[40px] font-black text-gray-900 tracking-tight leading-tight mb-4">
                Sector {d.sector}, {d.city},<br />Uttar Pradesh
              </h2>
              {locationData?.location_highlights?.[0]?.description ? (
                <p className="text-[14px] text-gray-500 leading-relaxed mb-8">
                  {locationData.location_highlights[0].description}
                </p>
              ) : (
                <p className="text-[14px] text-gray-400 leading-relaxed mb-8 italic">
                  Location details not verified yet
                </p>
              )}
            </>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={handleGetDirections}
              className="px-6 py-3 bg-blue-50 text-blue-600 font-bold rounded-full text-[14px] flex items-center gap-2 hover:bg-blue-100 transition-colors"
            >
              <MapPin size={16} />
              Get Directions
            </button>
            <button
              onClick={handleShareLocation}
              className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-full text-[14px] flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm relative"
            >
              <Share2 size={16} />
              {sharedStatus ? 'Link Copied!' : 'Share Location'}
            </button>
          </div>
        </div>

        {/* Right Image with Fade */}
        <div className="h-[300px] md:h-auto md:w-[60%] absolute md:absolute right-0 top-0 bottom-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent z-10 hidden md:block" />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 md:hidden" />

          {/* Fallback pattern if image is missing */}
          <div className="absolute inset-0 bg-blue-50/50 flex items-center justify-center">
            <MapIcon size={64} className="text-blue-100" />
          </div>

          <img
            src={locationData.location_hero_image}
            alt="Location Hero"
            className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-90 z-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      </div>

      {/* 2. Quick Commutes Bar */}
      <div className="bg-white rounded-3xl p-4 md:p-6 border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-4">
          {(locationData.quick_commutes || []).map((commute: any, i: number) => {
            const Icon = ICONS[commute.icon] || Car
            return (
              <div
                key={i}
                onClick={() => triggerCommuteCalculator(commute.destination)}
                className="flex items-center gap-4 w-full md:w-auto p-3 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-[18px] font-black text-gray-900">{typeof commute.time === 'string' ? commute.time : '—'}</p>
                  <p className="text-[12px] text-gray-500 font-medium leading-tight">to {typeof commute.destination === 'string' ? commute.destination : '—'}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 3. Map & Commute Calculator */}
      <div className="flex flex-col lg:flex-row gap-6 md:gap-10">
        {/* Left: Map */}
        <div className="flex-[2] bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col">
          <h3 className="text-[22px] font-black text-gray-900 mb-6">Location Map</h3>
          <div className="flex-1 rounded-[24px] overflow-hidden border border-gray-200 shadow-inner bg-gray-50 relative min-h-[400px]">
            {project ? (
              <SectorMap properties={[project]} extraMarkers={filteredMapMarkers} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <p>Map unavailable</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            {(['All', 'Transport', 'Education', 'Healthcare', 'Lifestyle', 'Work'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedMapFilter(filter)}
                className={`px-5 py-2 font-bold rounded-full text-[12px] transition-all ${selectedMapFilter === filter
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Calculator */}
        <div className="flex-1" id="commute-calculator-section">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] h-full">
            <h3 className="text-[22px] font-black text-gray-900 mb-2">Commute Calculator</h3>
            <p className="text-[13px] text-gray-500 mb-6">Plan your daily travel</p>
            <CommuteCalculator projectAddress={projectAddress} initialDestination={commuteTarget} />
          </div>
        </div>
      </div>

      {/* 4. Location Highlights */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        <h3 className="text-[22px] font-black text-gray-900 mb-8">Why people choose this location</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(Array.isArray(locationData.location_highlights) ? locationData.location_highlights : []).map((highlight: any, i: number) => {
            const Icon = ICONS[highlight.icon] || MapPin
            return (
              <div
                key={i}
                onClick={() => triggerCommuteCalculator(highlight.title)}
                className="border border-gray-100 rounded-3xl p-6 hover:shadow-lg transition-shadow group relative overflow-hidden bg-white cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-50 text-indigo-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Icon size={22} />
                </div>
                <h4 className="text-[16px] font-bold text-gray-900 mb-1">{typeof highlight.title === 'string' ? highlight.title : '—'}</h4>
                <p className="text-[16px] font-black text-gray-900 mb-3">{typeof highlight.time === 'string' ? highlight.time : '—'}</p>
                <p className="text-[13px] text-gray-500 leading-relaxed">{typeof highlight.description === 'string' ? highlight.description : '—'}</p>
                <div className="mt-4 pt-4 border-t border-gray-50 flex justify-end">
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-600 transition-colors" />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 5. Nearby Essentials */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-[22px] font-black text-gray-900">Nearby Essentials</h3>
            <p className="text-[14px] text-gray-500 mt-1">Everything you need, just minutes away</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(locationData.nearby_essentials || {}).map(([category, data]: [string, any], i: number) => {
            const isExpanded = expandedCategories[category] || false
            const placesArray = Array.isArray(data) ? data : (data?.places || [])
            const visiblePlaces = isExpanded ? placesArray : placesArray.slice(0, 3)
            const fallbackImage = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&q=80'
            const imageUrl = (!Array.isArray(data) && data?.image) ? data.image : fallbackImage

            return (
              <div key={i} className="group">
                <div className="w-full h-36 rounded-2xl overflow-hidden bg-gray-100 mb-4 relative">
                  <img
                    src={imageUrl}
                    alt={category}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage }}
                  />
                </div>
                <h4 className="text-[16px] font-black text-gray-900 mb-4">{category}</h4>
                <div className="space-y-3">
                  {Array.isArray(visiblePlaces) && visiblePlaces.map((place: any, j: number) => (
                    <div
                      key={j}
                      onClick={() => triggerCommuteCalculator(place?.name)}
                      className="flex justify-between items-center border-b border-gray-50 pb-2 last:border-0 cursor-pointer hover:text-blue-600 transition-colors"
                    >
                      <span className="text-[13px] font-medium text-gray-700 truncate pr-2 hover:underline">{place?.name || '—'}</span>
                      <span className="text-[12px] text-gray-400 whitespace-nowrap">{place?.dist || place?.distance || '—'}</span>
                    </div>
                  ))}
                </div>
                {placesArray.length > 3 && (
                  <button
                    onClick={() => toggleCategoryExpansion(category)}
                    className="text-[13px] font-bold text-blue-600 mt-3 hover:underline"
                  >
                    {isExpanded ? 'Show less' : `+ ${placesArray.length - 3} more`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 6. Neighborhood Advantages */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        <h3 className="text-[22px] font-black text-gray-900 mb-8">Neighborhood Advantages</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(Array.isArray(locationData.neighborhood_advantages) ? locationData.neighborhood_advantages : []).map((adv: any, i: number) => {
            const Icon = ICONS[adv.icon] || MapPin
            return (
              <div key={i} className="group">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon size={20} />
                </div>
                <h4 className="text-[15px] font-bold text-gray-900 mb-2">{adv.title}</h4>
                <p className="text-[13px] text-gray-500 leading-relaxed mb-4">{adv.description}</p>
                <ChevronRight size={14} className="text-gray-300 group-hover:text-purple-600 transition-colors" />
              </div>
            )
          })}
        </div>
      </div>

      {/* 7. Footer CTA */}
      <div className="bg-gradient-to-r from-pink-50 via-white to-orange-50 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-pink-100/50">
        <div>
          <h3 className="text-[20px] font-black text-gray-900 tracking-tight">Love the location?</h3>
          <p className="text-[14px] text-gray-600 mt-1 max-w-md">Schedule a site visit to experience the surroundings yourself.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <a
            href={waUrl || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-3.5 bg-[#0F172A] hover:bg-black text-white font-bold rounded-xl text-[14px] transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <CalendarDays size={16} />
            Book Site Visit
          </a>
          <a
            href={waUrl || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-3.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-[14px] transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <PhoneCall size={16} />
            Talk to Advisor
          </a>
        </div>
      </div>

      <p className="text-center text-[11px] text-gray-400 pt-2 pb-6">Travel times are approximate and based on typical traffic conditions.</p>
    </div>
  )
}
