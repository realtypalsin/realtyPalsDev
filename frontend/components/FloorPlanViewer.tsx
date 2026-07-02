'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'

interface FloorPlan {
  id: string
  url: string
  caption?: string | null
}

interface Props {
  floorPlans: FloorPlan[]
  onClose: () => void
  title?: string
}

export default function FloorPlanViewer({ floorPlans, onClose, title }: Props) {
  const [idx, setIdx] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  const plan = floorPlans[idx]
  const canPrev = idx > 0
  const canNext = idx < floorPlans.length - 1

  function resetView() { setZoom(1); setPan({ x: 0, y: 0 }) }
  function zoomIn()  { setZoom((z) => Math.min(z + 0.3, 4)) }
  function zoomOut() { setZoom((z) => { const n = Math.max(z - 0.3, 1); if (n === 1) setPan({ x: 0, y: 0 }); return n }) }

  function onMouseDown(e: React.MouseEvent) {
    if (zoom <= 1) return
    isDragging.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }))
  }
  function onMouseUp() { isDragging.current = false }

  function prev() { if (canPrev) { setIdx(idx - 1); resetView() } }
  function next() { if (canNext) { setIdx(idx + 1); resetView() } }

  if (!plan) return null

  return (
    <motion.div
      className="fixed inset-0 z-[70] bg-black/90 flex flex-col"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <div>
          <p className="text-white text-sm font-semibold">{title ?? 'Floor Plans'}</p>
          {plan.caption && <p className="text-gray-400 text-xs mt-0.5">{plan.caption}</p>}
          {floorPlans.length > 1 && (
            <p className="text-gray-500 text-[10px] mt-0.5">{idx + 1} / {floorPlans.length}</p>
          )}
        </div>
        <button onClick={onClose} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white">
          <X size={16} />
        </button>
      </div>

      {/* Image area */}
      <div
        className="flex-1 overflow-hidden relative select-none"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: zoom > 1 ? (isDragging.current ? 'grabbing' : 'grab') : 'default' }}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: isDragging.current ? 'none' : 'transform 0.2s ease',
            width: '100%',
            height: '100%',
            position: 'relative',
          }}
        >
          <Image
            src={plan.url}
            alt={plan.caption ?? 'Floor plan'}
            fill
            unoptimized
            className="object-contain pointer-events-none"
            sizes="100vw"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        {/* Prev/Next */}
        <div className="flex gap-2">
          <button
            onClick={prev}
            disabled={!canPrev}
            className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={next}
            disabled={!canNext}
            className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-2">
          <button onClick={zoomOut} disabled={zoom <= 1} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white disabled:opacity-30">
            <ZoomOut size={16} />
          </button>
          <span className="text-white text-xs w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn} disabled={zoom >= 4} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white disabled:opacity-30">
            <ZoomIn size={16} />
          </button>
          <button onClick={resetView} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
