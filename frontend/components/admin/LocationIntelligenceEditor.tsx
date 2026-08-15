'use client'

import { useState } from 'react'
import { Save, MapPin, Map } from 'lucide-react'
import { API_BASE } from '@/lib/env'
import { adminAuthHeaders } from '@/lib/authedFetch'
import { toast } from 'sonner'
import JsonEditor from './JsonEditor'

interface LocationIntelligenceData {
  schools_nearby_count?: number | string
  hospitals_nearby_count?: number | string
  shopping_nearby_count?: number | string
  it_parks_nearby_count?: number | string
  banks_nearby_count?: number | string
  restaurants_nearby_count?: number | string
  walkability_score?: number | string
  green_cover_percent?: number | string
  air_quality_index_avg?: number | string
  women_safety_score?: number | string
  noise_level_db?: number | string
  market_intelligence?: {
    location_data?: Record<string, unknown>
  }
  decision_profile?: {
    market_intelligence?: {
      location_data?: Record<string, unknown>
    }
    intelligence_data?: {
      location_data?: Record<string, unknown>
    }
  }
}

export default function LocationIntelligenceEditor({ projectId, initialData }: { projectId: string, initialData?: LocationIntelligenceData }) {
  const [schools, setSchools] = useState(String(initialData?.schools_nearby_count ?? ''))
  const [hospitals, setHospitals] = useState(String(initialData?.hospitals_nearby_count ?? ''))
  const [shopping, setShopping] = useState(String(initialData?.shopping_nearby_count ?? ''))
  const [itParks, setItParks] = useState(String(initialData?.it_parks_nearby_count ?? ''))
  const [banks, setBanks] = useState(String(initialData?.banks_nearby_count ?? ''))
  const [restaurants, setRestaurants] = useState(String(initialData?.restaurants_nearby_count ?? ''))
  const [walkability, setWalkability] = useState(String(initialData?.walkability_score ?? ''))
  const [greenCover, setGreenCover] = useState(String(initialData?.green_cover_percent ?? ''))
  const [aqi, setAqi] = useState(String(initialData?.air_quality_index_avg ?? ''))
  const [safetyScore, setSafetyScore] = useState(String(initialData?.women_safety_score ?? ''))
  const [noiseLevel, setNoiseLevel] = useState(String(initialData?.noise_level_db ?? ''))

  const [locationData, setLocationData] = useState<Record<string, unknown>>(
    initialData?.market_intelligence?.location_data ||
    initialData?.decision_profile?.market_intelligence?.location_data ||
    initialData?.decision_profile?.intelligence_data?.location_data ||
    {
      connectivity: [
        `Direct access to Metro Station within 1.5 km`,
        `Seamless connectivity to Noida-Greater Noida Expressway & main sector road`
      ],
      essentials: [
        'Top IB & CBSE schools (DPS, Lotus Valley) within 3 km',
        'Multi-specialty hospitals (Yatharth, Fortis) under 10 mins drive'
      ],
      neighborhood_advantages: [
        `Established residential cluster with 80%+ occupancy`,
        'Surrounded by green belts, sports complexes, and retail centers'
      ]
    }
  )

  const handleSave = async () => {
    try {
      const walkabilityNum = walkability ? parseInt(String(walkability), 10) : null
      const greenCoverNum = greenCover ? parseInt(String(greenCover), 10) : null
      const aqiNum = aqi ? parseInt(String(aqi), 10) : null
      const safetyNum = safetyScore ? parseInt(String(safetyScore), 10) : null
      const noiseLevelNum = noiseLevel ? parseInt(String(noiseLevel), 10) : null

      if (walkabilityNum !== null && (walkabilityNum < 0 || walkabilityNum > 100)) {
        toast.error('Walkability score must be 0-100')
        return
      }
      if (greenCoverNum !== null && (greenCoverNum < 0 || greenCoverNum > 100)) {
        toast.error('Green cover must be 0-100%')
        return
      }

      const res = await fetch(`${API_BASE}/admin/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
        body: JSON.stringify({
          schools_nearby_count: schools ? String(parseInt(schools)) : null,
          hospitals_nearby_count: hospitals ? String(parseInt(hospitals)) : null,
          shopping_nearby_count: shopping ? String(parseInt(shopping)) : null,
          it_parks_nearby_count: itParks ? String(parseInt(itParks)) : null,
          banks_nearby_count: banks ? String(parseInt(banks)) : null,
          restaurants_nearby_count: restaurants ? String(parseInt(restaurants)) : null,
          walkability_score: walkabilityNum ? String(walkabilityNum) : null,
          green_cover_percent: greenCoverNum ? String(greenCoverNum) : null,
          air_quality_index_avg: aqiNum ? String(aqiNum) : null,
          women_safety_score: safetyNum ? String(safetyNum) : null,
          noise_level_db: noiseLevelNum ? String(noiseLevelNum) : null,
        })
      })
      if (!res.ok) throw new Error('Failed to save location attributes')

      const existingIntelligence = initialData?.decision_profile?.intelligence_data ?? {}
      const decisionRes = await fetch(`${API_BASE}/admin/projects/${projectId}/decision-profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
        body: JSON.stringify({
          intelligence_data: {
            ...existingIntelligence,
            location_data: locationData
          }
        })
      })
      if (!decisionRes.ok) throw new Error('Failed to save location intelligence data')

      toast.success('Location intelligence saved successfully')
    } catch (e) {
      console.error('[LocationIntelligenceEditor] Save failed:', e)
      toast.error(e instanceof Error ? e.message : 'Error saving location intelligence')
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
          <MapPin size={18} />
        </div>
        <div>
          <h3 className="text-[16px] font-black text-gray-900">Area Livability & Neighborhood Intelligence</h3>
          <p className="text-[13px] text-gray-500">Configure walkability, green cover, environmental quality, safety, and nearby amenities.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 p-4 bg-slate-50/60 rounded-2xl border border-slate-100">
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Walkability (0-100)</label>
          <input value={walkability} onChange={(e) => setWalkability(e.target.value)} type="number" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-bold text-slate-800" placeholder="85" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Green Cover (%)</label>
          <input value={greenCover} onChange={(e) => setGreenCover(e.target.value)} type="number" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-bold text-slate-800" placeholder="75" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Air Quality (AQI)</label>
          <input value={aqi} onChange={(e) => setAqi(e.target.value)} type="number" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-bold text-slate-800" placeholder="145" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Safety Score (0-100)</label>
          <input value={safetyScore} onChange={(e) => setSafetyScore(e.target.value)} type="number" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-bold text-slate-800" placeholder="92" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Noise Level (dB)</label>
          <input value={noiseLevel} onChange={(e) => setNoiseLevel(e.target.value)} type="number" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-bold text-slate-800" placeholder="50" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Schools</label>
          <input value={schools} onChange={(e) => setSchools(e.target.value)} type="number" className="w-full bg-slate-50/80 rounded-xl px-4 py-2 text-[14px]" placeholder="8" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Hospitals</label>
          <input value={hospitals} onChange={(e) => setHospitals(e.target.value)} type="number" className="w-full bg-slate-50/80 rounded-xl px-4 py-2 text-[14px]" placeholder="5" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Shopping Malls</label>
          <input value={shopping} onChange={(e) => setShopping(e.target.value)} type="number" className="w-full bg-slate-50/80 rounded-xl px-4 py-2 text-[14px]" placeholder="4" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">IT Parks</label>
          <input value={itParks} onChange={(e) => setItParks(e.target.value)} type="number" className="w-full bg-slate-50/80 rounded-xl px-4 py-2 text-[14px]" placeholder="10" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Banks / ATMs</label>
          <input value={banks} onChange={(e) => setBanks(e.target.value)} type="number" className="w-full bg-slate-50/80 rounded-xl px-4 py-2 text-[14px]" placeholder="12" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Restaurants</label>
          <input value={restaurants} onChange={(e) => setRestaurants(e.target.value)} type="number" className="w-full bg-slate-50/80 rounded-xl px-4 py-2 text-[14px]" placeholder="20" />
        </div>
      </div>
      <div className="mt-8 pt-8 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Map size={18} />
          </div>
          <div>
            <h3 className="text-[16px] font-black text-gray-900">Advanced Location Data</h3>
            <p className="text-[13px] text-gray-500">Edit location_highlights, nearby_essentials, and neighborhood_advantages JSON.</p>
          </div>
        </div>
        <JsonEditor
          value={locationData}
          onChange={setLocationData}
          label="Location Intelligence JSON"
          description="Use valid JSON. This updates the frontend arrays directly."
        />
      </div>

      <div className="flex justify-end pt-6 mt-6 border-t border-gray-100">
        <button onClick={handleSave} className="bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-full text-[13px] font-bold flex items-center gap-2">
          <Save size={16} /> Save All Changes
        </button>
      </div>
    </div>
  )
}
