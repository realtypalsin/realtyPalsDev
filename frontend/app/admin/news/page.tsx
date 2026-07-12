'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Clock, CheckCircle2, XCircle, Eye } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface BuilderNews {
  id: string
  title: string
  description: string
  category: 'project_update' | 'achievement' | 'event' | 'promo'
  image_url?: string
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected'
  views: number
  created_at: string
  approved_at?: string
  rejection_reason?: string
}

export default function BuilderNewsPage() {
  const [news, setNews] = useState<BuilderNews[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    fetchNews()
  }, [])

  const fetchNews = async () => {
    try {
      const res = await fetch('/api/builder/news')
      if (res.ok) {
        setNews(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch news:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this news?')) return

    try {
      const res = await fetch(`/api/builder/news/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setNews(news.filter(n => n.id !== id))
      }
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      case 'pending_approval':
        return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
      case 'rejected':
        return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      default:
        return 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="w-4 h-4" />
      case 'pending_approval':
        return <Clock className="w-4 h-4" />
      case 'rejected':
        return <XCircle className="w-4 h-4" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">News & Updates</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your builder news and promotions</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null)
            setShowForm(!showForm)
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Post
        </button>
      </div>

      {showForm && (
        <NewsForm
          newsId={editingId}
          onSave={() => {
            setShowForm(false)
            setEditingId(null)
            fetchNews()
          }}
          onCancel={() => {
            setShowForm(false)
            setEditingId(null)
          }}
        />
      )}

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : news.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No news posted yet. Click &quot;New Post&quot; to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {news.map(item => (
            <div key={item.id} className="bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-700 p-6">
              <div className="flex gap-4">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-24 h-24 object-cover rounded"
                  />
                )}

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded text-sm font-medium ${getStatusColor(item.status)}`}>
                      {getStatusIcon(item.status)}
                      {item.status.replace('_', ' ')}
                    </div>
                  </div>

                  <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{item.description}</p>

                  <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded text-xs font-medium">
                      {item.category.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {item.views} views
                    </div>
                    <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                  </div>

                  {item.status === 'rejected' && item.rejection_reason && (
                    <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded">
                      <p className="text-sm text-red-700 dark:text-red-400">
                        <strong>Rejection reason:</strong> {item.rejection_reason}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingId(item.id)
                        setShowForm(true)
                      }}
                      className="px-3 py-1 text-sm border dark:border-slate-700 rounded hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-1"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-3 py-1 text-sm border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NewsForm({
  newsId,
  onSave,
  onCancel
}: {
  newsId: string | null
  onSave: () => void
  onCancel: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'project_update' as const,
    image_url: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = newsId ? `/api/builder/news/${newsId}` : '/api/builder/news'
      const method = newsId ? 'PATCH' : 'POST'

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
      <input
        type="text"
        placeholder="Title"
        value={formData.title}
        onChange={e => setFormData({ ...formData, title: e.target.value })}
        className="w-full px-3 py-2 border dark:border-slate-700 rounded dark:bg-slate-800"
        required
      />

      <textarea
        placeholder="Description"
        value={formData.description}
        onChange={e => setFormData({ ...formData, description: e.target.value })}
        className="w-full px-3 py-2 border dark:border-slate-700 rounded dark:bg-slate-800"
        rows={4}
        required
      />

      <select
        value={formData.category}
        onChange={e => setFormData({ ...formData, category: e.target.value as any })}
        className="w-full px-3 py-2 border dark:border-slate-700 rounded dark:bg-slate-800"
      >
        <option value="project_update">Project Update</option>
        <option value="achievement">Achievement</option>
        <option value="event">Event</option>
        <option value="promo">Promotion</option>
      </select>

      <input
        type="url"
        placeholder="Image URL (optional)"
        value={formData.image_url}
        onChange={e => setFormData({ ...formData, image_url: e.target.value })}
        className="w-full px-3 py-2 border dark:border-slate-700 rounded dark:bg-slate-800"
      />

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Saving...' : newsId ? 'Update' : 'Post'}
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
