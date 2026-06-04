'use client'

import { useState, useRef } from 'react'
import { FileText, Upload, Send, Loader2, X, MessageCircle } from 'lucide-react'
import { API_BASE } from '@/lib/env'

interface Doc {
  id: string
  name: string
  storage_url: string
  doc_type: string
}

interface QA {
  question: string
  answer: string
}

interface Props {
  projectId: string
  projectSlug: string
}

const DOC_TYPES = [
  { value: 'brochure', label: 'Brochure' },
  { value: 'allotment_letter', label: 'Allotment Letter' },
  { value: 'sale_deed', label: 'Sale Deed' },
  { value: 'rera_cert', label: 'RERA Certificate' },
  { value: 'floor_plan', label: 'Floor Plan' },
  { value: 'other', label: 'Other' },
]

export default function DocumentQA({ projectId, projectSlug }: Props) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null)
  const [qa, setQa] = useState<QA[]>([])
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState('brochure')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(file: File) {
    setUploading(true)
    setUploadError(null)
    const form = new FormData()
    form.append('file', file)
    form.append('project_id', projectId)
    form.append('project_slug', projectSlug)
    form.append('doc_type', docType)

    try {
      const res = await fetch(`${API_BASE}/documents`, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')

      const newDoc: Doc = {
        id: data.id,
        name: file.name,
        storage_url: data.url,
        doc_type: docType,
      }
      setDocs((d) => [newDoc, ...d])
      setSelectedDoc(newDoc)
      setQa([])
    } catch (e) {
      setUploadError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  async function handleAsk() {
    if (!selectedDoc || !question.trim()) return
    const q = question.trim()
    setAsking(true)
    setQuestion('')

    try {
      const res = await fetch(`${API_BASE}/documents/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: selectedDoc.id, question: q }),
      })
      const data = await res.json()
      setQa((prev) => [...prev, { question: q, answer: data.answer ?? 'No answer.' }])
    } catch {
      setQa((prev) => [...prev, { question: q, answer: 'Error — please try again.' }])
    } finally {
      setAsking(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all"
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-blue-500" />
            <span className="text-sm text-gray-500">Uploading and extracting text...</span>
          </div>
        ) : (
          <>
            <Upload size={24} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-medium text-gray-600">Upload a document</p>
            <p className="text-xs text-gray-400 mt-0.5">PDF, JPEG, PNG — max 20MB</p>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="mt-3 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
            >
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleUpload(f)
          e.target.value = ''
        }}
      />
      {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}

      {/* Document list */}
      {docs.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-gray-400 font-semibold uppercase">Documents</p>
          {docs.map((d) => (
            <button
              key={d.id}
              onClick={() => { setSelectedDoc(d); setQa([]) }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left border transition-all ${
                selectedDoc?.id === d.id ? 'border-blue-300 bg-blue-50' : 'border-gray-100 hover:border-gray-300'
              }`}
            >
              <FileText size={14} className={selectedDoc?.id === d.id ? 'text-blue-500' : 'text-gray-400'} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">{d.name}</p>
                <p className="text-[10px] text-gray-400">{DOC_TYPES.find((t) => t.value === d.doc_type)?.label}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Q&A */}
      {selectedDoc && (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-3 py-2.5 flex items-center gap-2">
            <MessageCircle size={13} className="text-blue-500" />
            <span className="text-xs font-semibold text-gray-700">Ask about: {selectedDoc.name}</span>
          </div>

          {qa.length > 0 && (
            <div className="p-3 space-y-3 max-h-64 overflow-y-auto">
              {qa.map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex gap-2">
                    <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[9px] text-blue-600 font-bold">Q</span>
                    </div>
                    <p className="text-xs text-gray-700 font-medium">{item.question}</p>
                  </div>
                  <div className="flex gap-2 ml-1">
                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[9px] text-green-600 font-bold">A</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{item.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 p-3 border-t border-gray-100">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk() } }}
              placeholder="Ask anything about this document..."
              className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-300"
            />
            <button
              onClick={handleAsk}
              disabled={!question.trim() || asking}
              className="w-9 h-9 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center disabled:opacity-40 flex-shrink-0"
            >
              {asking ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
