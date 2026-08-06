'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, Star } from 'lucide-react'
import { toast } from 'sonner'
import { adminAuthHeaders } from '@/lib/authedFetch'
import { API_BASE } from '@/lib/env'

interface ChannelPartner {
  id: string
  name: string
  type: string
  is_verified: boolean
}

interface ProjectChannelPartner {
  id: string
  channel_partner_id: string
  is_featured: boolean
  channel_partner: ChannelPartner
}

interface Props {
  projectId: string
  initialPartners?: ProjectChannelPartner[]
  onSaved?: () => void
}

export default function ChannelPartnersEditor({ projectId, initialPartners = [], onSaved }: Props) {
  const [allPartners, setAllPartners] = useState<ChannelPartner[]>([])
  const [selectedPartners, setSelectedPartners] = useState<Map<string, boolean>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/channel-partners`, {
          headers: adminAuthHeaders(),
        })
        if (res.ok) {
          const data = await res.json()
          setAllPartners(data.partners || [])
        }
      } catch (err) {
        toast.error('Failed to load channel partners')
      } finally {
        setLoading(false)
      }
    }

    const initSelected = new Map<string, boolean>()
    initialPartners.forEach(p => {
      initSelected.set(p.channel_partner_id, p.is_featured)
    })
    setSelectedPartners(initSelected)

    fetchPartners()
  }, [projectId, initialPartners])

  const handleTogglePartner = (partnerId: string) => {
    const newMap = new Map(selectedPartners)
    if (newMap.has(partnerId)) {
      newMap.delete(partnerId)
    } else {
      newMap.set(partnerId, true)
    }
    setSelectedPartners(newMap)
  }

  const handleToggleFeatured = (partnerId: string) => {
    const newMap = new Map(selectedPartners)
    if (newMap.has(partnerId)) {
      newMap.set(partnerId, !newMap.get(partnerId))
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const partners = Array.from(selectedPartners.entries()).map(([id, featured]) => ({
        channel_partner_id: id,
        is_featured: featured,
      }))

      const res = await fetch(`${API_BASE}/admin/projects/${projectId}/channel-partners`, {
        method: 'PUT',
        headers: adminAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ channel_partners: partners }),
      })

      if (!res.ok) throw new Error('Failed to save channel partners')
      toast.success('Channel partners updated')
      onSaved?.()
    } catch (err: any) {
      toast.error(err.message || 'Error saving partners')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Channel Partners</h3>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm disabled:opacity-50 flex items-center gap-2"
        >
          <Save size={16} /> Save
        </button>
      </div>

      <div className="space-y-2">
        {allPartners.length === 0 ? (
          <p className="text-gray-500 text-sm">No channel partners available</p>
        ) : (
          allPartners.map(partner => (
            <div key={partner.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
              <input
                type="checkbox"
                checked={selectedPartners.has(partner.id)}
                onChange={() => handleTogglePartner(partner.id)}
                className="w-4 h-4 rounded cursor-pointer"
              />
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{partner.name}</p>
                <p className="text-xs text-gray-500">{partner.type}</p>
              </div>
              {selectedPartners.has(partner.id) && (
                <button
                  onClick={() => handleToggleFeatured(partner.id)}
                  className={`p-2 rounded transition ${
                    selectedPartners.get(partner.id)
                      ? 'bg-yellow-100 text-yellow-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <Star size={16} fill="currentColor" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
