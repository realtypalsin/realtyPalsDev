'use client'

<<<<<<< HEAD
import { useRef, useState } from 'react'
import { Upload, Loader2, X, ExternalLink } from 'lucide-react'
import Image from 'next/image'

interface Props {
  value: string
  onChange: (url: string) => void
  projectSlug: string
}

export default function ImageUpload({ value, onChange, projectSlug }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    setUploading(true)
    setError('')

    const form = new FormData()
    form.append('file', file)
    form.append('slug', projectSlug || 'unnamed')

    const res  = await fetch('/api/v1/admin/upload-image', { method: 'POST', body: form })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Upload failed')
    } else {
      onChange(data.url)
    }
    setUploading(false)
  }

  return (
    <div className="space-y-3">
      {/* Preview */}
      {value && (
        <div className="relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50" style={{ height: 160 }}>
          <Image src={value} alt="Hero image" fill unoptimized className="object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <X size={13} />
          </button>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] text-white bg-black/50 px-2 py-1 rounded-full hover:bg-black/70 transition-colors"
          >
            <ExternalLink size={10} /> View full
          </a>
        </div>
      )}

      {/* URL input + upload button */}
      <div className="flex gap-2">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… or upload a file →"
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-xl text-sm font-medium text-gray-700 transition-colors whitespace-nowrap"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
=======
import { useState, useRef } from 'react'
import Image from 'next/image'
import { Upload, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { API_BASE } from '@/lib/env'

interface UploadedImage {
  url: string
  type: 'hero' | 'exterior' | 'interior' | 'amenity' | 'other'
}

export default function ImageUpload({ projectId, onImagesChange, existing = [] }: {
  projectId: string
  onImagesChange: (images: UploadedImage[]) => void
  existing?: UploadedImage[]
}) {
  const [images, setImages] = useState<UploadedImage[]>(existing)
  const [uploading, setUploading] = useState(false)
  const [previewIdx, setPreviewIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploading(true)
    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('projectId', projectId)

        const res = await fetch(`${API_BASE}/admin/upload-image`, {
          method: 'POST',
          credentials: 'include',
          body: fd,
        })

        if (!res.ok) throw new Error('Upload failed')
        const data = await res.json()

        const newImg: UploadedImage = {
          url: data.url,
          type: 'hero',
        }
        const updated = [...images, newImg]
        setImages(updated)
        onImagesChange(updated)
        toast.success('Image uploaded')
      }
    } catch (err) {
      toast.error('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const removeImage = (idx: number) => {
    const updated = images.filter((_, i) => i !== idx)
    setImages(updated)
    onImagesChange(updated)
    setPreviewIdx(Math.max(0, Math.min(previewIdx, updated.length - 1)))
  }

  const changeType = (idx: number, type: UploadedImage['type']) => {
    const updated = [...images]
    updated[idx] = { ...updated[idx], type }
    setImages(updated)
    onImagesChange(updated)
  }

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-zinc-300 hover:border-zinc-400 rounded-lg text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors disabled:opacity-50"
      >
        <Plus size={16} />
        {uploading ? 'Uploading...' : 'Add Images'}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
        className="hidden"
      />

      {/* Preview + List */}
      {images.length > 0 && (
        <div className="space-y-3">
          {/* Main Preview */}
          <div className="relative w-full h-48 rounded-lg overflow-hidden bg-zinc-100">
            <Image
              src={images[previewIdx].url}
              alt="Preview"
              fill
              unoptimized
              className="object-cover"
            />
          </div>

          {/* Thumbnails */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((img, idx) => (
              <div
                key={idx}
                onClick={() => setPreviewIdx(idx)}
                className={`relative w-16 h-16 rounded flex-shrink-0 cursor-pointer border-2 transition-colors ${
                  previewIdx === idx ? 'border-blue-500' : 'border-zinc-200'
                }`}
              >
                <Image src={img.url} alt={`Thumb ${idx}`} fill unoptimized className="object-cover" />
              </div>
            ))}
          </div>

          {/* Type Selector + Delete */}
          <div className="flex items-center justify-between gap-2">
            <select
              value={images[previewIdx].type}
              onChange={(e) => changeType(previewIdx, e.target.value as UploadedImage['type'])}
              className="text-sm border border-zinc-300 rounded px-2 py-1"
            >
              <option value="hero">Hero (Primary)</option>
              <option value="exterior">Exterior</option>
              <option value="interior">Interior</option>
              <option value="amenity">Amenity</option>
              <option value="other">Other</option>
            </select>

            <button
              onClick={() => removeImage(previewIdx)}
              className="flex items-center gap-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors text-sm"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>

          {/* Image Count */}
          <p className="text-xs text-zinc-500 text-right">
            {previewIdx + 1} of {images.length} images
          </p>
        </div>
      )}
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
    </div>
  )
}
