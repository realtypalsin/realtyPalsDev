'use client'

import { useState, useEffect } from 'react'
import { Navigation, MapPin, Loader2, Clock } from 'lucide-react'
import { Car, Train, Path, ArrowRight, Subway } from '@phosphor-icons/react'
import { API_BASE } from '@/lib/env'
import PlacesAutocomplete from '@/components/PlacesAutocomplete'

const OFFICE_STORAGE_KEY = 'rp_office_address'

interface CommuteResult {
  drive:   { drive_text: string; drive_min: number; distance_text: string } | null
  transit: { transit_text: string; transit_min: number } | null
  nearby_metro: Array<{ name: string; vicinity?: string }>
}

interface Props {
  projectAddress: string
}

export default function CommuteCalculator({ projectAddress }: Props) {
  const [destination, setDestination] = useState('')
  const [result, setResult] = useState<CommuteResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedOffice, setSavedOffice] = useState<string | null>(null)

  // Load saved office on mount
  useEffect(() => {
    const saved = localStorage.getItem(OFFICE_STORAGE_KEY)
    if (saved) setSavedOffice(saved)
  }, [])

  async function calculate(dest?: string) {
    const target = (dest ?? destination).trim()
    if (!target) return
    setLoading(true)
    setError(null)
    setResult(null)

    // Persist the office address
    localStorage.setItem(OFFICE_STORAGE_KEY, target)
    setSavedOffice(target)

    try {
      const params = new URLSearchParams({ origin: projectAddress, destination: target })
      const res = await fetch(`${API_BASE}/commute?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not calculate commute')
      setResult(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Input card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <Path size={14} weight="duotone" className="text-gray-500" />
          </div>
          <p className="text-[12px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Commute Calculator</p>
        </div>

        {/* Origin (property) */}
        <div className="flex items-center gap-2.5 mb-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <MapPin size={13} className="text-gray-400 flex-shrink-0" />
          <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{projectAddress}</span>
        </div>

        {/* Saved office quick-select */}
        {savedOffice && savedOffice !== destination && (
          <button
            onClick={() => { setDestination(savedOffice); calculate(savedOffice) }}
            className="w-full mb-2 flex items-center gap-2 px-3 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-left hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <Clock size={12} className="text-blue-400 flex-shrink-0" />
            <span className="text-[11px] font-medium text-blue-700 dark:text-blue-300 truncate flex-1">{savedOffice}</span>
            <span className="text-[10px] text-blue-400 flex-shrink-0">Saved office</span>
            <ArrowRight size={12} weight="bold" className="text-blue-400 flex-shrink-0" />
          </button>
        )}

        {/* Destination input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <PlacesAutocomplete
              value={destination}
              onChange={setDestination}
              placeholder="Your office / destination..."
              className="w-full text-[12px] border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl pl-8 pr-3 py-2.5 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 text-gray-900 dark:text-white placeholder-gray-400 transition-all"
              onEnter={() => calculate()}
            />
          </div>
          <button
            onClick={() => calculate()}
            disabled={!destination.trim() || loading}
            className="px-4 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[12px] font-bold rounded-xl disabled:opacity-40 flex items-center gap-1.5 hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
            {!loading && 'Go'}
          </button>
        </div>

        {error && (
          <p className="text-[11px] text-red-500 mt-2 flex items-center gap-1">
            <span>⚠</span> {error}
          </p>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-2.5">
          {result.drive && (
            <div className="flex items-center gap-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center flex-shrink-0">
                <Car size={18} weight="duotone" className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-gray-900 dark:text-white">By Car</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">{result.drive.distance_text}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[22px] font-black text-gray-900 dark:text-white leading-none">{result.drive.drive_min}</p>
                <p className="text-[10px] text-gray-400 font-medium">mins</p>
              </div>
            </div>
          )}

          {result.transit && (
            <div className="flex items-center gap-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center flex-shrink-0">
                <Train size={18} weight="duotone" className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-gray-900 dark:text-white">By Metro / Transit</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">{result.transit.transit_text}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[22px] font-black text-gray-900 dark:text-white leading-none">{result.transit.transit_min}</p>
                <p className="text-[10px] text-gray-400 font-medium">mins</p>
              </div>
            </div>
          )}

          {result.nearby_metro.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Nearby Metro Stations</p>
              <div className="space-y-2">
                {result.nearby_metro.slice(0, 3).map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Subway size={12} weight="duotone" className="text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-gray-700 dark:text-gray-300 truncate">{m.name}</p>
                      {m.vicinity && <p className="text-[10px] text-gray-400 truncate">{m.vicinity}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] text-gray-400 text-center">
            Estimates via Google Maps · Actual commute may vary with traffic.
          </p>
        </div>
      )}
    </div>
  )
}
