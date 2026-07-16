'use client'
import { useMemo, useState } from 'react'
import Image from 'next/image'
import {  m, AnimatePresence  } from 'framer-motion'
import {
  FileText, Download, Search, File, ChevronRight, CheckCircle2, FolderOpen,
  Eye, FileArchive, LayoutTemplate, Scale, Receipt, ClipboardList, Clock
} from 'lucide-react'
import { track, trackPropertyEvent } from '@/lib/analytics'
import type { ProjectDocumentPublic } from '@/components/ProjectDetailPanel'
import { Card } from './Card'

// ── Types ────────────────────────────────────────────────────────────────────
// We extend the document type here to reflect what should ideally come from the DB.
// Any properties missing from the actual API will simply be undefined.
export interface EnhancedDocument extends ProjectDocumentPublic {
  description?: string;
  is_quick_access?: boolean;
  thumbnail_url?: string;
  file_format?: string; 
  verified_by?: string;
  category_description?: string;
  category_icon_name?: string;
}

export interface DocumentsTabProps {
  documents: EnhancedDocument[]
  loading: boolean
  projectSlug?: string
  projectId?: string
  userId?: string | null
  transparency_checks?: { label: string; ok: boolean }[] // Should come from DB
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatFileSize(bytes: number | null): string | null {
  if (!bytes) return null
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getIcon(docType: string, customIconName?: string) {
  // If the DB provides an icon name, map it (fallback to static ones to avoid breaking)
  const map: Record<string, any> = {
    brochure: FileText, floor_plan: LayoutTemplate, floor_plan_doc: LayoutTemplate,
    payment_plan: Receipt, price_list: Receipt, legal: Scale, legal_document: Scale,
    specification: ClipboardList, other: File, archive: FileArchive,
  }
  if (customIconName && map[customIconName]) return map[customIconName]
  return map[docType] ?? File
}

interface Group { docType: string; label: string; description: string; docs: EnhancedDocument[] }

function groupByType(documents: EnhancedDocument[]): Group[] {
  const map = new Map<string, EnhancedDocument[]>()
  for (const doc of documents) {
    const list = map.get(doc.doc_type) ?? []
    list.push(doc)
    map.set(doc.doc_type, list)
  }
  return [...map.entries()].map(([docType, docs]) => {
    // Attempt to pull label & description from the first document in the group if DB provided it, else fallback
    const label = docType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    const description = docs[0]?.category_description ?? 'Project documents and files.'
    return { docType, label, description, docs }
  })
}

// ── Components ───────────────────────────────────────────────────────────────

function DocumentRow({ doc, onDownload, isPriority = false }: { doc: EnhancedDocument; onDownload: () => void; isPriority?: boolean }) {
  const Icon = getIcon(doc.doc_type, doc.category_icon_name)
  const size = formatFileSize(doc.file_size_bytes)
  
  return (
    <m.a
      whileHover={{ scale: 1.01, backgroundColor: 'rgba(250, 250, 250, 1)' }}
      whileTap={{ scale: 0.99 }}
      href={doc.storage_url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onDownload}
      className={`group flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-300 ${isPriority ? 'ring-1 ring-black/5' : ''}`}
    >
      <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100/50 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
        {doc.thumbnail_url ? (
          <Image src={doc.thumbnail_url} alt="" fill sizes="48px" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
        ) : (
          <Icon size={20} className="text-gray-400 group-hover:text-gray-900 transition-colors" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-semibold text-gray-900 truncate">
            {doc.name ?? doc.doc_type}
          </p>
          {doc.file_format && (
            <span className="px-1.5 py-0.5 rounded-md bg-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              {doc.file_format}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-[12px] text-gray-500">
          <span className="flex items-center gap-1"><Clock size={12} className="text-gray-400"/> {formatDate(doc.created_at)}</span>
          {size && <span className="flex items-center gap-1">· {size}</span>}
          {doc.verified_by && (
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              · <CheckCircle2 size={12} /> {doc.verified_by}
            </span>
          )}
        </div>
        {doc.description && (
          <p className="text-[12px] text-gray-400 mt-1.5 truncate">{doc.description}</p>
        )}
      </div>
      
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
        <Download size={14} className="text-gray-900" />
      </div>
    </m.a>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function DocumentsTab({ documents, loading, projectSlug, projectId, userId, transparency_checks }: DocumentsTabProps) {
  const [query, setQuery] = useState('')
  const [activeType, setActiveType] = useState<string | 'all'>('all')

  const groups = useMemo(() => groupByType(documents), [documents])
  const types = useMemo(() => groups.map((g) => g.docType), [groups])

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      if (activeType !== 'all' && doc.doc_type !== activeType) return false
      if (query.trim() && !(doc.name ?? '').toLowerCase().includes(query.trim().toLowerCase())) return false
      return true
    })
  }, [documents, activeType, query])

  const filteredGroups = useMemo(() => groupByType(filtered), [filtered])

  const quickAccessDocs = useMemo(() => documents.filter(d => d.is_quick_access).slice(0, 4), [documents])
  // Fallback to old behavior if no DB flags are set for quick access
  const displayQuickAccess = quickAccessDocs.length > 0 ? quickAccessDocs : documents.slice(0, 2)

  const handleDownload = (doc: EnhancedDocument) => {
    track('document_download', { project_slug: projectSlug, doc_type: doc.doc_type })
    if (projectId) trackPropertyEvent(projectId, 'document_download', undefined, userId, undefined, { doc_type: doc.doc_type }).catch(() => {})
  }

  if (loading) {
    return (
      <div className="p-6 md:p-10 space-y-8 animate-pulse max-w-5xl mx-auto">
        <div className="h-12 bg-gray-100 rounded-2xl w-1/3 mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-gray-50 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="p-6 md:p-10 max-w-5xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-[32px] border border-gray-100 bg-gray-50/50">
          <FolderOpen size={48} className="text-gray-300 mb-4" strokeWidth={1} />
          <h3 className="text-[18px] font-semibold text-gray-900">No documents found</h3>
          <p className="text-[14px] text-gray-500 mt-2 max-w-sm">
            Documents and resources for this project will appear here once they are published by the developer.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-12">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-[32px] font-bold text-gray-900 tracking-tight leading-tight">Document Center</h2>
          <p className="text-[15px] text-gray-500 mt-2 max-w-xl">
            Access official brochures, pricing, legal paperwork, and layouts. All documents are sourced directly from the builder.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[24px] font-black text-gray-900 leading-none">{documents.length}</span>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mt-1">Total Files</span>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div className="flex flex-col items-start">
            <span className="text-[24px] font-black text-gray-900 leading-none">{groups.length}</span>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mt-1">Categories</span>
          </div>
        </div>
      </div>

      {/* ── Search Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 transition-colors" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for 'Floor Plan' or 'Brochure'..."
            className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-transparent rounded-2xl text-[15px] font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-gray-900/5 focus:border-gray-200 transition-all"
          />
        </div>
        {types.length > 1 && (
          <select
            value={activeType}
            onChange={(e) => setActiveType(e.target.value)}
            className="px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-[14px] font-semibold text-gray-700 outline-none cursor-pointer focus:bg-white focus:ring-4 focus:ring-gray-900/5 focus:border-gray-200 transition-all appearance-none"
          >
            <option value="all">All Categories</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      {/* ── Quick Access ── */}
      {query === '' && activeType === 'all' && displayQuickAccess.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[16px] font-bold text-gray-900">Essential Documents</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayQuickAccess.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} onDownload={() => handleDownload(doc)} isPriority={true} />
            ))}
          </div>
        </section>
      )}

      {/* ── All Categories ── */}
      <section className="space-y-8">
        {filteredGroups.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-[15px] text-gray-400">No results match your search criteria.</p>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <m.div 
              key={group.docType} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-[18px] font-bold text-gray-900">{group.label}</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-[12px] font-bold text-gray-500">{group.docs.length}</span>
              </div>
              <p className="text-[14px] text-gray-500 mb-4">{group.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.docs.map(doc => (
                  <DocumentRow key={doc.id} doc={doc} onDownload={() => handleDownload(doc)} />
                ))}
              </div>
            </m.div>
          ))
        )}
      </section>

      {/* ── Transparency Section (Optional from DB) ── */}
      {transparency_checks && transparency_checks.length > 0 && (
        <section className="pt-8 border-t border-gray-100">
          <h3 className="text-[16px] font-bold text-gray-900 mb-4">Verification Checklist</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {transparency_checks.map((check) => (
              <div key={check.label} className={`flex items-center gap-3 p-4 rounded-xl border ${check.ok ? 'border-emerald-100 bg-emerald-50/30' : 'border-gray-100 bg-gray-50'}`}>
                {check.ok ? <CheckCircle2 size={18} className="text-emerald-500" /> : <div className="w-4.5 h-4.5 rounded-full border-2 border-gray-300" />}
                <span className={`text-[14px] font-medium ${check.ok ? 'text-emerald-900' : 'text-gray-500'}`}>{check.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
