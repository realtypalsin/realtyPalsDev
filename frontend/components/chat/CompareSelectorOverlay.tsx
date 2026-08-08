'use client'

import React, { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Circle, X } from 'lucide-react'
import type { ProjectCard as ProjectCardType } from '@/types/project'

interface CompareSelectorOverlayProps {
  properties: ProjectCardType[]
  onConfirm: (selected: ProjectCardType[]) => void
  onCancel: () => void
  onToast?: (message: string) => void
}

export default function CompareSelectorOverlay({
  properties,
  onConfirm,
  onCancel,
  onToast
}: CompareSelectorOverlayProps) {
  const [selected, setSelected] = useState<string[]>([])

  const handleToggleSelect = useCallback((propertyId: string) => {
    setSelected(prev => {
      if (prev.includes(propertyId)) {
        return prev.filter(id => id !== propertyId)
      } else {
        if (prev.length >= 4) {
          onToast?.('You can compare up to 4 properties at a time')
          return prev
        }
        return [...prev, propertyId]
      }
    })
  }, [onToast])

  const handleConfirm = useCallback(() => {
    const selectedProps = properties.filter(p => selected.includes(p.id))
    onConfirm(selectedProps)
  }, [selected, properties, onConfirm])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    }
  }, [onCancel])

  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const getBhkRange = (property: ProjectCardType): string => {
    if (!property.unit_types || property.unit_types.length === 0) return ''
    const bhks = property.unit_types.map(u => u.bhk).filter(Boolean)
    return bhks.length > 0 ? bhks.map(b => `${b}BHK`).join(', ') : ''
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-md flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Select Properties to Compare</h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Card Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map((prop) => {
              const isSelected = selected.includes(prop.id)
              return (
                <button
                  key={prop.id}
                  onClick={() => handleToggleSelect(prop.id)}
                  className="relative text-left rounded-lg border-2 overflow-hidden transition"
                  style={{
                    borderColor: isSelected ? '#4f46e5' : '#e5e7eb'
                  }}
                >
                  {/* Dark mode background overlay */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundColor: isSelected ? 'rgba(79, 70, 229, 0.05)' : 'rgba(0, 0, 0, 0)',
                      borderColor: isSelected ? '#4f46e5' : '#374151'
                    }}
                  />

                  {/* Thumbnail */}
                  {prop.images && prop.images[0]?.url && (
                    <div className="w-full h-32 overflow-hidden bg-gray-100 dark:bg-gray-700 relative z-0">
                      <img
                        src={prop.images[0].url}
                        alt={prop.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Selection Bubble */}
                  <div className="absolute top-3 right-3 z-10">
                    {isSelected ? (
                      <CheckCircle2 className="w-6 h-6 text-indigo-600 dark:text-indigo-500 fill-indigo-600 dark:fill-indigo-500" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 relative z-10 bg-white dark:bg-gray-900">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{prop.name}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{prop.sector}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{prop.price_range_label}</p>
                    {getBhkRange(prop) && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {getBhkRange(prop)}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer Toolbar */}
        <div className="sticky bottom-0 flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Select 2–4 properties to compare · <span className="font-semibold text-gray-900 dark:text-white">{selected.length} selected</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selected.length < 2}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-600 rounded hover:bg-indigo-700 dark:hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Compare ({selected.length})
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
