'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'
<<<<<<< HEAD
=======
import { motion } from 'framer-motion'
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172

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
<<<<<<< HEAD
    <div className="fixed inset-0 z-[70] bg-black/90 flex flex-col">
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
=======
    <motion.div
      className="fixed inset-0 z-[70] bg-black/90 flex flex-col"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 flex-shrink-0 bg-gradient-to-b from-black/80 to-transparent absolute top-0 inset-x-0 z-10 pointer-events-none">
        <div>
          <p className="text-white text-lg font-semibold drop-shadow-md">{title ?? 'Gallery'}</p>
          {plan.caption && <p className="text-gray-300 text-sm mt-0.5 drop-shadow-md">{plan.caption}</p>}
        </div>
        <button onClick={onClose} className="w-10 h-10 bg-black/40 hover:bg-black/60 border border-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md pointer-events-auto transition-colors">
          <X size={18} />
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
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

<<<<<<< HEAD
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
    </div>
=======
      {/* Controls & Thumbnails */}
      <div className="flex flex-col bg-black/60 backdrop-blur-xl border-t border-white/10 flex-shrink-0 pb-safe">
        
        {/* Thumbnails Track */}
        {floorPlans.length > 1 && (
          <div className="flex gap-2 overflow-x-auto px-4 pt-4 pb-2 hide-scrollbar items-center sm:justify-center">
            {floorPlans.map((p, i) => (
              <button
                key={p.id || i}
                onClick={() => { setIdx(i); resetView() }}
                className={`relative w-16 h-12 sm:w-20 sm:h-14 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                  i === idx ? 'border-white opacity-100 scale-105 shadow-[0_0_15px_rgba(255,255,255,0.2)] z-10' : 'border-transparent opacity-40 hover:opacity-100'
                }`}
              >
                <Image src={p.url} alt="" fill unoptimized className="object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between px-4 py-3">
          {/* Prev/Next */}
          <div className="flex gap-2">
            <button
              onClick={prev}
              disabled={!canPrev}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white disabled:opacity-20 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-white text-xs flex items-center justify-center w-12 font-semibold">
              {idx + 1} / {floorPlans.length}
            </span>
            <button
              onClick={next}
              disabled={!canNext}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white disabled:opacity-20 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button onClick={zoomOut} disabled={zoom <= 1} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white disabled:opacity-20 transition-colors">
              <ZoomOut size={18} />
            </button>
            <span className="text-white text-xs w-12 text-center font-mono font-medium">{Math.round(zoom * 100)}%</span>
            <button onClick={zoomIn} disabled={zoom >= 4} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white disabled:opacity-20 transition-colors">
              <ZoomIn size={18} />
            </button>
            <div className="w-px h-6 bg-white/20 mx-1 sm:mx-2" />
            <button onClick={resetView} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
  )
}
