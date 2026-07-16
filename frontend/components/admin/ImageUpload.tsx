'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Upload, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { API_BASE } from '@/lib/env'
import { adminAuthHeaders } from '@/lib/authedFetch'

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
          headers: adminAuthHeaders(),
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

    </div>
  )
}
