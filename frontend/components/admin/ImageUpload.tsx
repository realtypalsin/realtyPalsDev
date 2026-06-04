'use client'

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
    </div>
  )
}
