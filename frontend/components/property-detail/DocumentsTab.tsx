'use client'
import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Download, Search, LayoutTemplate, Scale, Receipt, ClipboardList,
  File, ChevronRight, CheckCircle2, FolderOpen,
} from 'lucide-react'
import { track } from '@/lib/analytics'
import type { ProjectDocumentPublic } from '@/components/ProjectDetailPanel'
import { Card } from './Card'

// ── Category model — one card per real doc_type actually present. The admin
// upload form and the old label map used two slightly different sets of
// doc_type strings over time; this covers every value either has ever used,
// so nothing renders as a raw unlabeled string.
const CATEGORY_LABELS: Record<string, string> = {
  brochure: 'Brochure',
  floor_plan: 'Floor Plans',
  floor_plan_doc: 'Floor Plans',
  payment_plan: 'Payment Plan',
  price_list: 'Price List',
  legal: 'Legal Documents',
  legal_document: 'Legal Documents',
  specification: 'Specifications',
  other: 'Other Documents',
}
const CATEGORY_ICONS: Record<string, any> = {
  brochure: FileText,
  floor_plan: LayoutTemplate,
  floor_plan_doc: LayoutTemplate,
  payment_plan: Receipt,
  price_list: Receipt,
  legal: Scale,
  legal_document: Scale,
  specification: ClipboardList,
  other: File,
}
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  brochure: 'Official project brochure and marketing material',
  floor_plan: 'Unit layouts and floor-wise plans',
  floor_plan_doc: 'Unit layouts and floor-wise plans',
  payment_plan: 'Payment milestones and schedule',
  price_list: 'Unit-wise pricing',
  legal: 'Title, approvals and compliance paperwork',
  legal_document: 'Title, approvals and compliance paperwork',
  specification: 'Construction and material specifications',
  other: 'Additional project documents',
}

function categoryLabel(docType: string): string {
  return CATEGORY_LABELS[docType] ?? docType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
function categoryIcon(docType: string) {
  return CATEGORY_ICONS[docType] ?? File
}
function formatFileSize(bytes: number | null): string | null {
  if (!bytes) return null
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Group { docType: string; label: string; docs: ProjectDocumentPublic[] }

function groupByType(documents: ProjectDocumentPublic[]): Group[] {
  const map = new Map<string, ProjectDocumentPublic[]>()
  for (const doc of documents) {
    const list = map.get(doc.doc_type) ?? []
    list.push(doc)
    map.set(doc.doc_type, list)
  }
  return [...map.entries()].map(([docType, docs]) => ({ docType, label: categoryLabel(docType), docs }))
}

export interface DocumentsTabProps {
  documents: ProjectDocumentPublic[]
  loading: boolean
  projectSlug?: string
}

// ── Section 1: Document Overview ────────────────────────────────────────────
function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 text-center">
      <p className="text-[26px] font-black text-gray-900 leading-none">{value}</p>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1.5">{label}</p>
    </div>
  )
}

function DocumentsHeader({ total, categories, mostRecent }: { total: number; categories: number; mostRecent: string | null }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[20px] font-bold text-gray-900 tracking-tight">Document Center</h2>
        <p className="text-[13px] text-gray-400 mt-1">Everything uploaded and verified for this project, in one place.</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <SummaryStat label="Total Documents" value={String(total)} />
        <SummaryStat label="Categories" value={String(categories)} />
        <SummaryStat label="Last Updated" value={mostRecent ?? '—'} />
      </div>
    </div>
  )
}

// ── Search + filter toolbar ──────────────────────────────────────────────────
function SearchToolbar({ query, onQuery, activeType, onType, types }: {
  query: string; onQuery: (v: string) => void
  activeType: string | 'all'; onType: (v: string | 'all') => void
  types: string[]
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search documents..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full text-[13px] font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-300 bg-white transition-all"
        />
      </div>
      {types.length > 1 && (
        <select
          value={activeType}
          onChange={(e) => onType(e.target.value)}
          className="text-[13px] font-bold text-gray-700 bg-white border border-gray-200 rounded-full px-4 py-2.5 outline-none cursor-pointer"
        >
          <option value="all">All Categories</option>
          {types.map((t) => <option key={t} value={t}>{categoryLabel(t)}</option>)}
        </select>
      )}
    </div>
  )
}

// ── Document row (reused by Quick Access + inline lists) ───────────────────
function DocumentRow({ doc, onDownload }: { doc: ProjectDocumentPublic; onDownload: () => void }) {
  const Icon = categoryIcon(doc.doc_type)
  const size = formatFileSize(doc.file_size_bytes)
  return (
    <a
      href={doc.storage_url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onDownload}
      className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.05)] transition-all group"
    >
      <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
        <Icon size={18} className="text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-bold text-gray-900 truncate">{doc.name ?? categoryLabel(doc.doc_type)}</p>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
          <span>{categoryLabel(doc.doc_type)}</span>
          {size && <><span>·</span><span>{size}</span></>}
          <span>·</span>
          <span>{formatDate(doc.created_at)}</span>
        </div>
      </div>
      <Download size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
    </a>
  )
}

// ── Section 2: Quick Access ──────────────────────────────────────────────────
function QuickAccessSection({ groups, onDownload }: { groups: Group[]; onDownload: (doc: ProjectDocumentPublic) => void }) {
  // Priority order for the "most important documents a buyer looks for first" —
  // only ever shows a slot if a matching document actually exists.
  const priorityTypes = ['brochure', 'floor_plan', 'floor_plan_doc', 'price_list', 'legal', 'legal_document']
  const seen = new Set<string>()
  const picks: ProjectDocumentPublic[] = []
  for (const t of priorityTypes) {
    const group = groups.find((g) => g.docType === t)
    if (group && !seen.has(group.label)) {
      seen.add(group.label)
      picks.push(group.docs[0])
    }
  }
  if (picks.length === 0) return null

  return (
    <div>
      <h3 className="text-[15px] font-bold text-gray-900 mb-3">Quick Access</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {picks.map((doc) => <DocumentRow key={doc.id} doc={doc} onDownload={() => onDownload(doc)} />)}
      </div>
    </div>
  )
}

// ── Section 3: Browse by Category ───────────────────────────────────────────
function CategoryCard({ group, onDownload }: { group: Group; onDownload: (doc: ProjectDocumentPublic) => void }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = categoryIcon(group.docType)
  const preview = group.docs.slice(0, 3)
  const rest = group.docs.slice(3)

  return (
    <Card className="h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center">
          <Icon size={20} className="text-gray-500" />
        </div>
        <span className="text-[11px] font-black text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">{group.docs.length}</span>
      </div>
      <p className="text-[15px] font-bold text-gray-900">{group.label}</p>
      <p className="text-[12px] text-gray-400 mt-1 mb-4">{CATEGORY_DESCRIPTIONS[group.docType] ?? 'Project documents'}</p>

      <div className="space-y-2">
        {preview.map((doc) => (
          <a
            key={doc.id}
            href={doc.storage_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onDownload(doc)}
            className="flex items-center gap-2 text-[12.5px] text-gray-600 hover:text-blue-600 transition-colors truncate"
          >
            <FileText size={12} className="text-gray-300 flex-shrink-0" />
            <span className="truncate">{doc.name ?? group.label}</span>
          </a>
        ))}
      </div>

      {rest.length > 0 && (
        <button onClick={() => setExpanded((v) => !v)} className="flex items-center gap-1 text-[12px] font-bold text-blue-600 mt-3">
          {expanded ? 'Show less' : `View All (${group.docs.length})`} <ChevronRight size={12} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
      )}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-2 mt-2">
              {rest.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.storage_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onDownload(doc)}
                  className="flex items-center gap-2 text-[12.5px] text-gray-600 hover:text-blue-600 transition-colors truncate"
                >
                  <FileText size={12} className="text-gray-300 flex-shrink-0" />
                  <span className="truncate">{doc.name ?? group.label}</span>
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

// ── Section 4: Recent Updates ────────────────────────────────────────────────
function RecentUpdatesCard({ documents, onDownload }: { documents: ProjectDocumentPublic[]; onDownload: (doc: ProjectDocumentPublic) => void }) {
  const sorted = [...documents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8)
  if (sorted.length === 0) return null
  return (
    <Card title="Recent Updates" description="Newest documents first">
      <div className="space-y-1">
        {sorted.map((doc) => {
          const Icon = categoryIcon(doc.doc_type)
          const size = formatFileSize(doc.file_size_bytes)
          return (
            <a
              key={doc.id}
              href={doc.storage_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onDownload(doc)}
              className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/60 rounded-xl px-2 -mx-2 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                <Icon size={15} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-800 truncate">{doc.name ?? categoryLabel(doc.doc_type)}</p>
                <p className="text-[11px] text-gray-400">{categoryLabel(doc.doc_type)}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[11.5px] font-semibold text-gray-600">{formatDate(doc.created_at)}</p>
                {size && <p className="text-[10.5px] text-gray-400">{size}</p>}
              </div>
              <Download size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
            </a>
          )
        })}
      </div>
    </Card>
  )
}

// ── Section 5: Document Transparency ────────────────────────────────────────
function TransparencyCard({ groups }: { groups: Group[] }) {
  const has = (types: string[]) => groups.some((g) => types.includes(g.docType))
  const checks = [
    { label: 'Floor Plans Available', ok: has(['floor_plan', 'floor_plan_doc']) },
    { label: 'Pricing Documents Available', ok: has(['price_list', 'payment_plan']) },
    { label: 'Legal Documents Available', ok: has(['legal', 'legal_document']) },
    { label: 'Marketing Brochure Available', ok: has(['brochure']) },
  ].filter((c) => c.ok)

  if (checks.length === 0) return null

  return (
    <Card title="Document Transparency" description="What this project has made available for buyer due diligence">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-2 text-[13px] text-gray-700 font-medium">
            <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
            {c.label}
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Main orchestrator ────────────────────────────────────────────────────────
export default function DocumentsTab({ documents, loading, projectSlug }: DocumentsTabProps) {
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

  const mostRecent = documents.length > 0
    ? formatDate([...documents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at)
    : null

  const handleDownload = (doc: ProjectDocumentPublic) => track('document_download', { project_slug: projectSlug, doc_type: doc.doc_type })

  if (loading) {
    return (
      <div className="p-5 md:p-8 space-y-6 animate-pulse">
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl" />)}
        </div>
        <div className="h-40 bg-gray-100 rounded-[28px]" />
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="p-5 md:p-8">
        <Card>
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <FolderOpen size={32} className="text-gray-200 mb-3" />
            <p className="text-[14px] font-semibold text-gray-400">No documents available yet</p>
            <p className="text-[12px] text-gray-300 mt-1">Documents will appear here once the builder uploads them.</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-5 md:p-8 space-y-8">
      {/* Section 1 */}
      <DocumentsHeader total={documents.length} categories={groups.length} mostRecent={mostRecent} />

      <SearchToolbar query={query} onQuery={setQuery} activeType={activeType} onType={setActiveType} types={types} />

      {/* Section 2 */}
      <QuickAccessSection groups={groups} onDownload={handleDownload} />

      {/* Section 3 */}
      <div>
        <h3 className="text-[15px] font-bold text-gray-900 mb-3">Browse by Category</h3>
        {filteredGroups.length === 0 ? (
          <p className="text-[13px] text-gray-400 py-6 text-center">No documents match your search.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredGroups.map((g) => <CategoryCard key={g.docType} group={g} onDownload={handleDownload} />)}
          </div>
        )}
      </div>

      {/* Section 4 */}
      <RecentUpdatesCard documents={documents} onDownload={handleDownload} />

      {/* Section 5 */}
      <TransparencyCard groups={groups} />
    </div>
  )
}
