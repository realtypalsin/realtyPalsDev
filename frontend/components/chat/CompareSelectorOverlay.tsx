'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { m, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Check, X } from 'lucide-react'
import type { ProjectCard as ProjectCardType } from '@/types/project'

const MIN_SELECT = 2
const MAX_SELECT = 4

interface CompareSelectorOverlayProps {
  properties: ProjectCardType[]
  onConfirm: (selected: ProjectCardType[]) => void
  onCancel: () => void
  onToast?: (message: string) => void
}

function bhkRangeLabel(project: ProjectCardType): string | null {
  const bhks = Array.from(new Set((project.unit_types ?? []).map(u => u.bhk).filter(Boolean))).sort((a, b) => a - b)
  if (bhks.length === 0) return null
  return bhks.length === 1 ? `${bhks[0]} BHK` : `${bhks[0]}–${bhks[bhks.length - 1]} BHK`
}

export function CompareSelectorOverlay({ properties, onConfirm, onCancel, onToast }: CompareSelectorOverlayProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  if (!mounted) return null

  const toggle = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(s => s !== id)
      if (prev.length >= MAX_SELECT) {
        onToast?.(`You can compare up to ${MAX_SELECT} properties at a time`)
        return prev
      }
      return [...prev, id]
    })
  }

  const canConfirm = selected.length >= MIN_SELECT

  return createPortal(
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6"
        onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
      >
        <m.div
          initial={{ y: 40, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="w-full sm:max-w-3xl max-h-[92dvh] flex flex-col bg-white dark:bg-[#111] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">Select properties to compare</h2>
            <button
              onClick={onCancel}
              aria-label="Close"
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {properties.map((project) => {
                const isSelected = selected.includes(project.id)
                const bhk = bhkRangeLabel(project)
                return (
                  <button
                    key={project.id}
                    onClick={() => toggle(project.id)}
                    className={`relative text-left rounded-2xl overflow-hidden border transition-all ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/40'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    <div
                      className={`absolute top-2 right-2 z-10 w-[22px] h-[22px] rounded-full flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-transparent'
                          : 'bg-white/90 dark:bg-black/60 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {isSelected && <Check size={13} className="text-white" strokeWidth={3} />}
                    </div>

                    <div className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-gray-800">
                      {project.images?.[0]?.url && (
                        <Image
                          src={project.images[0].url}
                          alt={project.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, 33vw"
                        />
                      )}
                    </div>

                    <div className="p-2.5">
                      <div className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate">{project.name}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                        {[project.sector, bhk, project.price_range_label].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#111]">
            <span className="text-[12px] font-medium text-gray-500 dark:text-gray-400">
              Select {MIN_SELECT}–{MAX_SELECT} properties to compare · {selected.length} selected
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-xl text-[13px] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => canConfirm && onConfirm(properties.filter(p => selected.includes(p.id)))}
                disabled={!canConfirm}
                className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Compare {selected.length > 0 ? `(${selected.length})` : ''}
              </button>
            </div>
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>,
    document.body
  )
}
