'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Plus, Trash2, Pencil, Save, Loader2, CheckCircle2, GripVertical } from 'lucide-react'
import { API_BASE } from '@/lib/env'
import { adminAuthHeaders } from '@/lib/authedFetch'

type ImageType = 'hero' | 'exterior' | 'interior' | 'floor_plan' | 'amenity' | 'master_plan' | 'clubhouse' | 'pool' | 'location_map' | 'view'

interface ProjectImage {
  id:         string
  url:        string
  type:       ImageType
  caption:    string | null
  bhk:        number | null
  size_sqft:  number | null
  sort_order: number
}

interface Props {
  images:    ProjectImage[]
  projectId: string
  slug:      string
  onSaved:   () => Promise<void>
}

const IMAGE_TYPES: ImageType[] = ['hero', 'exterior', 'interior', 'floor_plan', 'amenity', 'master_plan', 'clubhouse', 'pool', 'location_map', 'view']

const TYPE_LABELS: Record<ImageType, string> = {
  hero:         'Hero',
  exterior:     'Exterior',
  interior:     'Interior',
  floor_plan:   'Floor Plan',
  amenity:      'Amenity',
  master_plan:  'Master Plan',
  clubhouse:    'Clubhouse',
  pool:         'Pool',
  location_map: 'Location Map',
  view:         'View From Home',
}

interface EditState {
  id:       string
  type:     ImageType
  caption:  string
  bhk:      string
  size_sqft: string
  saving:   boolean
}

export default function ImagesEditor({ images: initial, projectId, slug, onSaved }: Props) {
  const [rows, setRows]           = useState<ProjectImage[]>(initial)

  useEffect(() => { setRows(initial) }, [initial])
  const [uploading, setUploading] = useState(false)
  const [uploadType, setUploadType] = useState<ImageType>('exterior')
  const [uploadBhk, setUploadBhk] = useState('')
  const [uploadSize, setUploadSize] = useState('')
  const [editState, setEditState] = useState<EditState | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState<string | null>(null)
  const [dragSrc, setDragSrc]     = useState<string | null>(null)
  const [dragOver, setDragOver]   = useState<string | null>(null)

  const flash = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 2500)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('slug', slug)
      const upRes = await fetch(`${API_BASE}/admin/upload-image`, {
        method:      'POST',
        headers:     adminAuthHeaders(),
        body:        form,
      })
      if (!upRes.ok) { const j = await upRes.json(); throw new Error(j.error ?? 'Upload failed') }
      const { url } = await upRes.json()

      const attachRes = await fetch(`${API_BASE}/admin/projects/${projectId}/images`, {
        method:      'POST',
        headers:     { ...adminAuthHeaders(), 'Content-Type': 'application/json' },
        body:        JSON.stringify({
          url, type: uploadType, sort_order: rows.length,
          ...(uploadType === 'floor_plan' && uploadBhk ? { bhk: parseInt(uploadBhk) } : {}),
          ...(uploadType === 'floor_plan' && uploadSize ? { size_sqft: parseInt(uploadSize) } : {}),
        }),
      })
      if (!attachRes.ok) { const j = await attachRes.json(); throw new Error(j.error ?? 'Attach failed') }
      const { image } = await attachRes.json()
      setRows(r => [...r, image])
      setUploadBhk('')
      setUploadSize('')
      flash('Image uploaded')
      await onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (id: string) => {
    setRows(r => r.filter(x => x.id !== id))
    try {
      const res = await fetch(`${API_BASE}/admin/images/${id}`, { method: 'DELETE', headers: adminAuthHeaders() })
      if (!res.ok) throw new Error('Delete failed')
      flash('Deleted')
      await onSaved()
    } catch {
      setError('Delete failed')
      setRows(initial)
    }
  }

  const startEdit = (img: ProjectImage) =>
    setEditState({
      id: img.id, type: img.type, caption: img.caption ?? '',
      bhk: img.bhk?.toString() ?? '', size_sqft: img.size_sqft?.toString() ?? '',
      saving: false,
    })

  const saveEdit = async () => {
    if (!editState) return
    setEditState(s => s ? { ...s, saving: true } : s)
    try {
      const res = await fetch(`${API_BASE}/admin/images/${editState.id}`, {
        method:      'PATCH',
        headers:     { ...adminAuthHeaders(), 'Content-Type': 'application/json' },
        body:        JSON.stringify({
          type: editState.type,
          caption: editState.caption || null,
          bhk: editState.bhk ? parseInt(editState.bhk) : null,
          size_sqft: editState.size_sqft ? parseInt(editState.size_sqft) : null,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      const { image } = await res.json()
      setRows(r => r.map(x => x.id === image.id ? image : x))
      setEditState(null)
      flash('Saved')
      await onSaved()
    } catch {
      setError('Save failed')
      setEditState(s => s ? { ...s, saving: false } : s)
    }
  }

  // ── Drag-to-reorder ────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragSrc(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== dragOver) setDragOver(id)
  }

  const handleDragLeave = () => setDragOver(null)

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    setDragOver(null)
    const src = dragSrc
    setDragSrc(null)
    if (!src || src === targetId) return

    const srcIdx = rows.findIndex(r => r.id === src)
    const tgtIdx = rows.findIndex(r => r.id === targetId)
    if (srcIdx < 0 || tgtIdx < 0) return

    const next = [...rows]
    const [moved] = next.splice(srcIdx, 1)
    next.splice(tgtIdx, 0, moved)
    const reordered = next.map((r, i) => ({ ...r, sort_order: i }))
    setRows(reordered)

    try {
      await Promise.all(
        reordered.map((r, i) =>
          fetch(`${API_BASE}/admin/images/${r.id}`, {
            method:      'PATCH',
            headers:     { ...adminAuthHeaders(), 'Content-Type': 'application/json' },
            body:        JSON.stringify({ sort_order: i }),
          })
        )
      )
      flash('Order saved')
      await onSaved()
    } catch {
      setError('Reorder failed')
      setRows(initial)
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-6 md:p-8">
      <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-[20px] font-serif font-black text-slate-900 tracking-tight">Image Gallery</h2>
          <p className="text-[13px] text-slate-400 font-medium mt-1">{rows.length} total · drag to reorder</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={uploadType}
            onChange={e => setUploadType(e.target.value as ImageType)}
            className="text-[13px] font-bold text-slate-700 bg-slate-50 border border-transparent rounded-xl px-4 py-2 outline-none hover:bg-slate-100 focus:bg-white focus:border-slate-200 transition-all cursor-pointer"
          >
            {IMAGE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
          {uploadType === 'floor_plan' && (
            <>
              <input
                value={uploadBhk}
                onChange={e => setUploadBhk(e.target.value)}
                placeholder="BHK"
                type="number"
                className="w-20 text-[13px] font-bold text-slate-700 bg-slate-50 border border-transparent rounded-xl px-3 py-2 outline-none hover:bg-slate-100 focus:bg-white focus:border-slate-200 transition-all"
              />
              <input
                value={uploadSize}
                onChange={e => setUploadSize(e.target.value)}
                placeholder="Sqft"
                type="number"
                className="w-24 text-[13px] font-bold text-slate-700 bg-slate-50 border border-transparent rounded-xl px-3 py-2 outline-none hover:bg-slate-100 focus:bg-white focus:border-slate-200 transition-all"
              />
            </>
          )}
          <label className="flex items-center gap-2 text-[13px] font-bold text-white bg-slate-900 hover:bg-black px-5 py-2.5 rounded-full transition-all cursor-pointer shadow-sm">
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Upload Image
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {error   && <p className="text-[12px] text-red-500 mb-3">{error}</p>}
      {success && (
        <p className="flex items-center gap-1 text-[12px] text-emerald-600 mb-3">
          <CheckCircle2 size={13} className="fill-current" /> {success}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="text-[12px] text-zinc-400 text-center py-6">No images uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {rows.map(img => (
            <div
              key={img.id}
              draggable
              onDragStart={(e) => handleDragStart(e, img.id)}
              onDragOver={(e) => handleDragOver(e, img.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, img.id)}
              onDragEnd={() => { setDragSrc(null); setDragOver(null) }}
              className={`group relative bg-white rounded-2xl overflow-hidden border shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-all duration-300 ${
                dragSrc === img.id
                  ? 'opacity-40 scale-95'
                  : dragOver === img.id
                  ? 'border-slate-900 ring-2 ring-slate-200 scale-[1.02]'
                  : 'border-gray-100 hover:border-gray-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]'
              }`}
            >
              {/* Drag handle */}
              <div className="absolute top-2 left-2 z-10 w-6 h-6 bg-black/40 backdrop-blur-sm rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                <GripVertical size={12} className="text-white" />
              </div>

              <div className="relative h-32 bg-slate-50">
                <Image src={img.url} alt={img.caption ?? img.type} fill className="object-cover" unoptimized />
              </div>
              {editState?.id === img.id ? (
                <div className="p-2 space-y-1.5">
                  <select
                    value={editState.type}
                    onChange={e => setEditState(s => s ? { ...s, type: e.target.value as ImageType } : s)}
                    className="w-full text-[11px] border border-zinc-200 rounded-lg px-2 py-1 outline-none"
                  >
                    {IMAGE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                  <input
                    value={editState.caption}
                    onChange={e => setEditState(s => s ? { ...s, caption: e.target.value } : s)}
                    placeholder="Caption (optional)"
                    className="w-full text-[11px] border border-zinc-200 rounded-lg px-2 py-1 outline-none"
                  />
                  {editState.type === 'floor_plan' && (
                    <div className="flex gap-1.5">
                      <input
                        value={editState.bhk}
                        onChange={e => setEditState(s => s ? { ...s, bhk: e.target.value } : s)}
                        placeholder="BHK"
                        type="number"
                        className="w-1/2 text-[11px] border border-zinc-200 rounded-lg px-2 py-1 outline-none"
                      />
                      <input
                        value={editState.size_sqft}
                        onChange={e => setEditState(s => s ? { ...s, size_sqft: e.target.value } : s)}
                        placeholder="Sqft"
                        type="number"
                        className="w-1/2 text-[11px] border border-zinc-200 rounded-lg px-2 py-1 outline-none"
                      />
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    <button
                      onClick={saveEdit}
                      disabled={editState.saving}
                      className="flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-1 rounded-lg"
                    >
                      {editState.saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                      Save
                    </button>
                    <button
                      onClick={() => setEditState(null)}
                      className="text-[11px] text-zinc-400 hover:text-zinc-600 px-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <p className="text-[10px] font-black tracking-widest uppercase text-slate-400">
                    {TYPE_LABELS[img.type as ImageType] ?? img.type}
                    {img.type === 'floor_plan' && (img.bhk || img.size_sqft) && (
                      <span className="text-slate-300"> · {[img.bhk ? `${img.bhk}BHK` : null, img.size_sqft ? `${img.size_sqft} sqft` : null].filter(Boolean).join(' · ')}</span>
                    )}
                  </p>
                  {img.caption && <p className="text-[13px] font-bold text-slate-800 line-clamp-1 mt-1">{img.caption}</p>}
                  <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(img)}
                      className="flex items-center justify-center gap-1.5 flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[11px] font-bold py-1.5 rounded-lg transition-colors"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(img.id)}
                      className="flex items-center justify-center gap-1.5 flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-bold py-1.5 rounded-lg transition-colors"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

