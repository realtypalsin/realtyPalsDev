'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Clock, Eye, MousePointerClick, TrendingUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Promotion {
  id: string
  title: string
  description?: string
  type: 'button' | 'toast_text' | 'news_feature'
  content: string
  link_type?: string
  link_target?: string
  image_url?: string
  builder_id?: string
  starts_at: string
  ends_at: string
  is_active: boolean
  impressions: number
  clicks: number
  conversions: number
  created_at: string
}

export default function PromotionsAdminPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    fetchPromotions()
  }, [])

  const fetchPromotions = async () => {
    try {
      const res = await fetch('/api/admin/promotions')
      if (res.ok) {
        const data = await res.json()
        setPromotions(data)
      }
    } catch (err) {
      console.error('Failed to fetch promotions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this promotion?')) return

    try {
      const res = await fetch(`/api/admin/promotions/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setPromotions(promotions.filter(p => p.id !== id))
      }
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/promotions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive })
      })
      if (res.ok) {
        setPromotions(promotions.map(p => p.id === id ? { ...p, is_active: !isActive } : p))
      }
    } catch (err) {
      console.error('Toggle failed:', err)
    }
  }

  const isActive = (promo: Promotion) => {
    const now = new Date()
    const start = new Date(promo.starts_at)
    const end = new Date(promo.ends_at)
    return now >= start && now <= end
  }

  const getStatusColor = (promo: Promotion) => {
    if (!promo.is_active) return 'text-gray-500'
    if (isActive(promo)) return 'text-green-600'
    const now = new Date()
    if (new Date(promo.starts_at) > now) return 'text-blue-600'
    return 'text-amber-600'
  }

  const getStatusLabel = (promo: Promotion) => {
    if (!promo.is_active) return 'Disabled'
    if (isActive(promo)) return 'Active'
    const now = new Date()
    if (new Date(promo.starts_at) > now) return 'Scheduled'
    return 'Ended'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Promotional Management</h1>
        <button
          onClick={() => {
            setEditingId(null)
            setShowForm(!showForm)
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Promotion
        </button>
      </div>

      {showForm && (
        <PromotionForm
          promotionId={editingId}
          onSave={() => {
            setShowForm(false)
            setEditingId(null)
            fetchPromotions()
          }}
          onCancel={() => {
            setShowForm(false)
            setEditingId(null)
          }}
        />
      )}

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : promotions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No promotions yet</div>
      ) : (
        <div className="grid gap-4">
          {promotions.map(promo => (
            <div key={promo.id} className="bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-700 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{promo.title}</h3>
                    <span className={`text-xs font-medium ${getStatusColor(promo)}`}>
                      {getStatusLabel(promo)}
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded">
                      {promo.type}
                    </span>
                  </div>
                  {promo.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{promo.description}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingId(promo.id)
                      setShowForm(true)
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(promo.id)}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Eye className="w-4 h-4" />
                  <span>{promo.impressions} impressions</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <MousePointerClick className="w-4 h-4" />
                  <span>{promo.clicks} clicks</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <TrendingUp className="w-4 h-4" />
                  <span>{promo.conversions} conversions</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">
                    {new Date(promo.starts_at).toLocaleDateString()} - {new Date(promo.ends_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-right text-gray-600 dark:text-gray-400">
                  <span className="text-xs">
                    Created {formatDistanceToNow(new Date(promo.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t dark:border-slate-700">
                <button
                  onClick={() => handleToggleActive(promo.id, promo.is_active)}
                  className={`px-3 py-1 text-sm rounded transition ${
                    promo.is_active
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-400'
                  }`}
                >
                  {promo.is_active ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PromotionForm({
  promotionId,
  onSave,
  onCancel
}: {
  promotionId: string | null
  onSave: () => void
  onCancel: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'button' as const,
    content: '',
    link_type: 'project',
    link_target: '',
    image_url: '',
    starts_at: new Date().toISOString().split('T')[0],
    ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    target_sectors: [] as string[],
    target_bhk: [] as number[]
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = promotionId ? `/api/admin/promotions/${promotionId}` : '/api/admin/promotions'
      const method = promotionId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        onSave()
      }
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-700 p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Title"
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
          className="px-3 py-2 border dark:border-slate-700 rounded dark:bg-slate-800"
          required
        />

        <select
          value={formData.type}
          onChange={e => setFormData({ ...formData, type: e.target.value as any })}
          className="px-3 py-2 border dark:border-slate-700 rounded dark:bg-slate-800"
        >
          <option value="button">Button</option>
          <option value="toast_text">Scrolling Text</option>
          <option value="news_feature">News Feature</option>
        </select>
      </div>

      <textarea
        placeholder="Description"
        value={formData.description}
        onChange={e => setFormData({ ...formData, description: e.target.value })}
        className="w-full px-3 py-2 border dark:border-slate-700 rounded dark:bg-slate-800"
        rows={2}
      />

      <input
        type="text"
        placeholder="Content (button text, toast message, etc)"
        value={formData.content}
        onChange={e => setFormData({ ...formData, content: e.target.value })}
        className="w-full px-3 py-2 border dark:border-slate-700 rounded dark:bg-slate-800"
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <input
          type="date"
          value={formData.starts_at}
          onChange={e => setFormData({ ...formData, starts_at: e.target.value })}
          className="px-3 py-2 border dark:border-slate-700 rounded dark:bg-slate-800"
          required
        />
        <input
          type="date"
          value={formData.ends_at}
          onChange={e => setFormData({ ...formData, ends_at: e.target.value })}
          className="px-3 py-2 border dark:border-slate-700 rounded dark:bg-slate-800"
          required
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Saving...' : promotionId ? 'Update' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border dark:border-slate-700 rounded hover:bg-gray-50 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
