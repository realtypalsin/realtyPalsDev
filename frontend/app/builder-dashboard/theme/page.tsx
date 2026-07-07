'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface ThemePlan {
  name: string
  colors: Record<string, string>
  fonts: Record<string, string>
  active_until: string
  is_active: boolean
}

export default function BuilderThemePage() {
  const [currentTheme, setCurrentTheme] = useState<ThemePlan | null>(null)
  const [formData, setFormData] = useState({
    primary_color: '#3b82f6',
    secondary_color: '#e0e7ff'
  })
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchTheme()
  }, [])

  const fetchTheme = async () => {
    try {
      const res = await fetch('/api/builder/theme')
      if (res.ok) {
        const theme = await res.json()
        setCurrentTheme(theme)
        setFormData({
          primary_color: theme.colors.primary || '#3b82f6',
          secondary_color: theme.colors.secondary || '#e0e7ff'
        })
      }
    } catch (err) {
      console.error('Failed to fetch theme:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      const res = await fetch('/api/builder/theme', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color
        })
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
        fetchTheme()
      }
    } catch (err) {
      console.error('Save failed:', err)
    }
  }

  if (loading) return <div className="text-center py-12">Loading...</div>

  const isExpiring = currentTheme && new Date(currentTheme.active_until) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Theme & Branding</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Customize your builder profile appearance</p>
      </div>

      {/* Current Theme Info */}
      {currentTheme && (
        <div className={`rounded-lg border p-4 ${
          isExpiring
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/50'
            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/50'
        }`}>
          <div className="flex gap-3">
            {isExpiring ? (
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`font-semibold ${isExpiring ? 'text-amber-800 dark:text-amber-200' : 'text-green-800 dark:text-green-200'}`}>
                {currentTheme.name}
              </p>
              <p className={`text-sm ${isExpiring ? 'text-amber-700 dark:text-amber-300' : 'text-green-700 dark:text-green-300'}`}>
                {isExpiring
                  ? `Theme expires on ${new Date(currentTheme.active_until).toLocaleDateString()}`
                  : `Theme active until ${new Date(currentTheme.active_until).toLocaleDateString()}`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Color Picker */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-700 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Theme Colors</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                Primary Color
              </label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={formData.primary_color}
                  onChange={e => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-16 h-16 rounded cursor-pointer border"
                />
                <div>
                  <input
                    type="text"
                    value={formData.primary_color}
                    onChange={e => setFormData({ ...formData, primary_color: e.target.value })}
                    className="px-3 py-2 border dark:border-slate-700 rounded dark:bg-slate-800 w-full"
                    placeholder="#3b82f6"
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    Used for buttons, accents, highlights
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                Secondary Color
              </label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={formData.secondary_color}
                  onChange={e => setFormData({ ...formData, secondary_color: e.target.value })}
                  className="w-16 h-16 rounded cursor-pointer border"
                />
                <div>
                  <input
                    type="text"
                    value={formData.secondary_color}
                    onChange={e => setFormData({ ...formData, secondary_color: e.target.value })}
                    className="px-3 py-2 border dark:border-slate-700 rounded dark:bg-slate-800 w-full"
                    placeholder="#e0e7ff"
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    Used for backgrounds, subtle accents
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              Save Theme Changes
            </button>

            {saved && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 rounded">
                <p className="text-sm text-green-700 dark:text-green-400">Theme updated successfully!</p>
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-700 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Preview</h2>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Button</p>
              <button
                style={{ backgroundColor: formData.primary_color }}
                className="px-6 py-3 text-white rounded font-medium"
              >
                Click me
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Accent Text</p>
              <p style={{ color: formData.primary_color }} className="font-semibold">
                This is your primary color
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Background</p>
              <div
                style={{ backgroundColor: formData.secondary_color }}
                className="px-4 py-6 rounded text-center font-medium"
              >
                Secondary color background
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Card Preview</p>
              <div
                style={{ borderColor: formData.primary_color }}
                className="border-l-4 px-4 py-4 rounded bg-gray-50 dark:bg-slate-800"
              >
                <p className="text-sm text-gray-700 dark:text-gray-300">Your profile card will use these colors</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Plans */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Theme Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              name: 'Default',
              color: '#3b82f6',
              desc: 'Standard RealtyPals branding'
            },
            {
              name: 'Premium',
              color: '#c47860',
              desc: 'Luxury branding package (recommended)'
            },
            {
              name: 'Custom',
              color: '#10b981',
              desc: 'Full customization with support'
            }
          ].map(plan => (
            <div key={plan.name} className="border dark:border-slate-700 rounded-lg p-4 hover:shadow-lg transition">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-8 h-8 rounded"
                  style={{ backgroundColor: plan.color }}
                />
                <h3 className="font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{plan.desc}</p>
              <button className="w-full px-3 py-2 border dark:border-slate-700 rounded hover:bg-gray-50 dark:hover:bg-slate-800 text-sm font-medium">
                View Details
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
