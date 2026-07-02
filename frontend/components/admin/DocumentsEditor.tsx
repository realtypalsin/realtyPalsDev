'use client'

import { useState, useEffect } from 'react'
import { Trash, UploadSimple, Spinner, FilePdf, CheckCircle } from '@phosphor-icons/react'
import { API_BASE } from '@/lib/env'

interface ProjectDocument {
  id:          string
  name:        string
  storage_url: string
  doc_type:    string
  created_at:  string
  file_size_bytes: number | null
}

function formatFileSize(bytes: number | null): string | null {
  if (!bytes) return null
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface Props {
  documents: ProjectDocument[]
  projectId: string
  slug:      string
  onSaved:   () => Promise<void>
}

const DOC_TYPES = ['brochure', 'floor_plan_doc', 'legal', 'specification', 'price_list', 'other']

export default function DocumentsEditor({ documents: initial, projectId, slug, onSaved }: Props) {
  const [rows, setRows]         = useState<ProjectDocument[]>(initial)
  
  useEffect(() => { setRows(initial) }, [initial])

  const [uploading, setUploading] = useState(false)
  const [docType, setDocType]   = useState('brochure')
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)

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
      form.append('project_id', projectId)
      form.append('project_slug', slug)
      form.append('doc_type', docType)
      const res = await fetch(`${API_BASE}/documents`, {
        method:      'POST',
        credentials: 'include',
        body:        form,
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Upload failed') }
      const data = await res.json()
      flash('Document uploaded')
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
      const res = await fetch(`${API_BASE}/admin/documents/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error('Delete failed')
      flash('Deleted')
      await onSaved()
    } catch {
      setError('Delete failed')
      setRows(initial)
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-6 md:p-8">
      <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-[20px] font-serif font-black text-slate-900 tracking-tight">Project Documents</h2>
          <p className="text-[13px] text-slate-400 font-medium mt-1">{rows.length} files attached</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={docType}
            onChange={e => setDocType(e.target.value)}
            className="text-[13px] font-bold text-slate-700 bg-slate-50 border border-transparent rounded-xl px-4 py-2 outline-none hover:bg-slate-100 focus:bg-white focus:border-slate-200 transition-all cursor-pointer capitalize"
          >
            {DOC_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
          <label className="flex items-center gap-2 text-[13px] font-bold text-white bg-slate-900 hover:bg-black px-5 py-2.5 rounded-full transition-all cursor-pointer shadow-sm">
            {uploading ? <Spinner size={14} className="animate-spin" /> : <UploadSimple size={14} weight="bold" />}
            Upload Document
            <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {error   && <p className="text-[12px] text-red-500 mb-3">{error}</p>}
      {success && (
        <p className="flex items-center gap-1 text-[12px] text-emerald-600 mb-3">
          <CheckCircle size={13} weight="fill" /> {success}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="text-[12px] text-zinc-400 text-center py-6">No documents uploaded yet.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {rows.map(doc => (
            <div key={doc.id} className="group flex items-center justify-between py-4 hover:bg-slate-50/50 transition-colors px-2 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <FilePdf size={20} weight="duotone" className="text-red-500" />
                </div>
                <div>
                  <a
                    href={doc.storage_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[14px] font-bold text-slate-800 hover:text-blue-600 hover:underline transition-colors line-clamp-1"
                  >
                    {doc.name}
                  </a>
                  <p className="text-[11px] font-medium text-slate-400 mt-1 capitalize">
                    {doc.doc_type.replace(/_/g, ' ')} · {new Date(doc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {formatFileSize(doc.file_size_bytes) && ` · ${formatFileSize(doc.file_size_bytes)}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(doc.id)}
                className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-rose-500 hover:bg-rose-50 hover:border-rose-100 hover:text-rose-600 transition-all"
              >
                <Trash size={14} weight="bold" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
