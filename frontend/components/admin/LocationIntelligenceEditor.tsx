'use client'

import { useState } from 'react'
import { Save, MapPin, Map } from 'lucide-react'
import { API_BASE } from '@/lib/env'
import { adminAuthHeaders } from '@/lib/authedFetch'
import { toast } from 'sonner'
import JsonEditor from './JsonEditor'

export default function LocationIntelligenceEditor({ projectId, initialData }: { projectId: string, initialData?: any }) {
  const [schools, setSchools] = useState(initialData?.schools_nearby_count ?? '')
  const [hospitals, setHospitals] = useState(initialData?.hospitals_nearby_count ?? '')
  const [shopping, setShopping] = useState(initialData?.shopping_nearby_count ?? '')
  const [itParks, setItParks] = useState(initialData?.it_parks_nearby_count ?? '')
  const [banks, setBanks] = useState(initialData?.banks_nearby_count ?? '')
  const [restaurants, setRestaurants] = useState(initialData?.restaurants_nearby_count ?? '')
  
  const [locationData, setLocationData] = useState<any>(
    initialData?.decision_profile?.intelligence_data?.location_data || {}
  )

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
        body: JSON.stringify({
          schools_nearby_count: schools ? parseInt(schools) : null,
          hospitals_nearby_count: hospitals ? parseInt(hospitals) : null,
          shopping_nearby_count: shopping ? parseInt(shopping) : null,
          it_parks_nearby_count: itParks ? parseInt(itParks) : null,
          banks_nearby_count: banks ? parseInt(banks) : null,
          restaurants_nearby_count: restaurants ? parseInt(restaurants) : null,
        })
      })
      if (!res.ok) throw new Error('Failed to save')

      // Also save locationData to decision_profile.intelligence_data
      const decisionRes = await fetch(`${API_BASE}/admin/projects/${projectId}/decision-profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
        body: JSON.stringify({
          intelligence_data: {
            ...initialData?.decision_profile?.intelligence_data,
            location_data: locationData
          }
        })
      })
      if (!decisionRes.ok) throw new Error('Failed to save location data')

      toast.success('Location intelligence saved successfully')
    } catch (e) {
      toast.error('Error saving nearby counts')
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
          <MapPin size={18} />
        </div>
        <div>
          <h3 className="text-[16px] font-black text-gray-900">Nearby Establishments</h3>
          <p className="text-[13px] text-gray-500">Configure the count of nearby facilities.</p>
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
