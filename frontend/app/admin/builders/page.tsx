'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { 
  Plus, 
  Building2, 
  Globe, 
  CheckCircle2, 
  Pencil, 
  X, 
  Save, 
  Loader2, 
  Search, 
  Calendar,
  MapPin,
  FileText,
  Award,
  Link as LinkIcon,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Layers
} from 'lucide-react'
import { AnimatePresence, m } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'
import UniversalLoader from '@/components/ui/universal-loader'
import { toast } from 'sonner'
import { adminFetch } from '@/lib/adminFetch'

interface LinkedProject {
  id: string
  name: string
  slug: string
  sector: string | null
  city: string | null
  status: string | null
}

interface Builder {
  id: string
  name: string
  slug: string
  founded_year: number | null
  headquarters: string | null
  website: string | null
  credai_member: boolean
  delivered_units: number | null
  rera_compliance_score: number | null
  iso_certified: boolean
  logo_url: string | null
  description: string | null
  _count: { projects: number }
  projects?: LinkedProject[]
}

type FormState = {
  name: string
  slug: string
  founded_year: string
  headquarters: string
  website: string
  credai_member: boolean
  company_overview: string
  delivered_units: string
  rera_compliance_score: string
  iso_certified: boolean
  logo_url: string
}

const EMPTY_FORM: FormState = {
  name: '', slug: '', founded_year: '', headquarters: '', website: '', credai_member: false,
  company_overview: '', delivered_units: '', rera_compliance_score: '', iso_certified: false, logo_url: ''
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function BuilderFormFields({
  form,
  onChange,
}: {
  form: FormState
  onChange: (f: FormState) => void
}) {
  function set(key: keyof FormState) {
    return (v: string | boolean) => onChange({ ...form, [key]: v })
  }

  return (
    <div className="space-y-4 font-sans">
      {/* 2-Column Input Grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Name */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Company Name *</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => {
              const v = e.target.value
              onChange({ ...form, name: v, slug: toSlug(v) })
            }}
            placeholder="ATS Infrastructure"
            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
            <span>URL Slug</span>
          </label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => set('slug')(e.target.value)}
            placeholder="ats-infrastructure"
            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Founded Year */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Founded Year</span>
          </label>
          <input
            type="number"
            value={form.founded_year}
            onChange={(e) => set('founded_year')(e.target.value)}
            placeholder="1998"
            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Headquarters */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>Headquarters</span>
          </label>
          <input
            type="text"
            value={form.headquarters}
            onChange={(e) => set('headquarters')(e.target.value)}
            placeholder="Noida, UP"
            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Website */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>Website URL</span>
          </label>
          <input
            type="url"
            value={form.website}
            onChange={(e) => set('website')(e.target.value)}
            placeholder="https://ats.co.in"
            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Delivered Units */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Delivered Units</span>
          </label>
          <input
            type="number"
            value={form.delivered_units}
            onChange={(e) => set('delivered_units')(e.target.value)}
            placeholder="6500"
            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* RERA Score */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>RERA Compliance Score (0-100)</span>
          </label>
          <input
            type="number"
            value={form.rera_compliance_score}
            onChange={(e) => set('rera_compliance_score')(e.target.value)}
            placeholder="95"
            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Logo URL */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            <span>Logo URL</span>
          </label>
          <input
            type="url"
            value={form.logo_url}
            onChange={(e) => set('logo_url')(e.target.value)}
            placeholder="https://..."
            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Overview */}
      <div>
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          <span>Company Overview</span>
        </label>
        <textarea
          rows={3}
          value={form.company_overview}
          onChange={(e) => set('company_overview')(e.target.value)}
          placeholder="Leading multi-award winning real estate developer established in..."
          className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
        />
      </div>

      {/* Certifications & Badges */}
      <div className="flex items-center gap-4 pt-1">
        <label className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex-1">
          <input
            type="checkbox"
            checked={form.credai_member}
            onChange={(e) => set('credai_member')(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600"
          />
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white block">CREDAI Member</span>
            <span className="text-[10px] text-slate-400 block">Verified Real Estate Industry Association</span>
          </div>
        </label>

        <label className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex-1">
          <input
            type="checkbox"
            checked={form.iso_certified}
            onChange={(e) => set('iso_certified')(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600"
          />
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white block">ISO Certified</span>
            <span className="text-[10px] text-slate-400 block">Quality Management Compliant</span>
          </div>
        </label>
      </div>
    </div>
  )
}

export default function AdminBuilders() {
  const [builders, setBuilders]     = useState<Builder[]>([])
  const [loading, setLoading]       = useState(true)
  const [query, setQuery]           = useState('')
  
  const [showAdd, setShowAdd]       = useState(false)
  const [addForm, setAddForm]       = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  
  const [selectedBuilder, setSelectedBuilder] = useState<Builder | null>(null)
  const [editForm, setEditForm]     = useState<FormState>(EMPTY_FORM)
  const [editSaving, setEditSaving] = useState(false)

  // Keyboard nav
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    adminFetch('/admin/builders')
      .then((r) => r.json())
      .then((d) => { setBuilders(d.builders ?? []) })
      .catch(() => toast.error('Failed to load builders'))
      .finally(() => setLoading(false))
  }, [])

  // Global Escape Listener to close dialog modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key === 'Escape') {
        if (selectedBuilder) setSelectedBuilder(null)
        else if (showAdd) setShowAdd(false)
        else {
          searchInputRef.current?.blur()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedBuilder, showAdd])

  const smartFilter = useCallback((b: Builder) => {
    if (!query) return true
    const q = query.toLowerCase()
    
    // Check for specific tags
    if (q.includes('is:credai') && !b.credai_member) return false
    
    // Clean string search
    const cleanQ = q.replace(/is:\w+/g, '').trim()
    if (!cleanQ) return true
    
    return b.name.toLowerCase().includes(cleanQ) || 
           b.slug.toLowerCase().includes(cleanQ) || 
           (b.headquarters && b.headquarters.toLowerCase().includes(cleanQ))
  }, [query])

  const filtered = builders.filter(smartFilter)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await adminFetch('/admin/builders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name,
          slug: addForm.slug,
          founded_year: addForm.founded_year ? parseInt(addForm.founded_year) : null,
          headquarters: addForm.headquarters || null,
          website: addForm.website || null,
          credai_member: addForm.credai_member,
          company_overview: addForm.company_overview || null,
          delivered_units: addForm.delivered_units ? parseInt(addForm.delivered_units) : null,
          rera_compliance_score: addForm.rera_compliance_score ? parseInt(addForm.rera_compliance_score) : null,
          iso_certified: addForm.iso_certified,
          logo_url: addForm.logo_url || null,
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || `HTTP ${res.status}`)
      }
      const created = await res.json()
      setBuilders((prev) => [created.builder, ...prev])
      setShowAdd(false)
      setAddForm(EMPTY_FORM)
      toast.success('Builder created successfully')
    } catch (err: any) {
      console.error('[builders] create error:', err)
      toast.error(err.message || 'Error creating builder')
    } finally {
      setSaving(false)
    }
  }

  function openBuilderModal(b: Builder) {
    setSelectedBuilder(b)
    setEditForm({
      name: b.name,
      slug: b.slug,
      founded_year: b.founded_year ? String(b.founded_year) : '',
      headquarters: b.headquarters || '',
      website: b.website || '',
      credai_member: b.credai_member,
      company_overview: b.description || '',
      delivered_units: b.delivered_units ? String(b.delivered_units) : '',
      rera_compliance_score: b.rera_compliance_score ? String(b.rera_compliance_score) : '',
      iso_certified: b.iso_certified || false,
      logo_url: b.logo_url || '',
    })
  }

  const saveEdit = useCallback(async (id: string) => {
    setEditSaving(true)
    try {
      const res = await adminFetch(`/admin/builders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          slug: editForm.slug,
          founded_year: editForm.founded_year ? parseInt(editForm.founded_year) : null,
          headquarters: editForm.headquarters || null,
          website: editForm.website || null,
          credai_member: editForm.credai_member,
          company_overview: editForm.company_overview || null,
          delivered_units: editForm.delivered_units ? parseInt(editForm.delivered_units) : null,
          rera_compliance_score: editForm.rera_compliance_score ? parseInt(editForm.rera_compliance_score) : null,
          iso_certified: editForm.iso_certified,
          logo_url: editForm.logo_url || null,
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || `HTTP ${res.status}`)
      }
      const updated = await res.json()
      setBuilders((prev) => prev.map((x) => x.id === id ? { ...x, ...updated } : x))
      setSelectedBuilder(null)
      toast.success('Changes saved')
    } catch (err: any) {
      console.error('[builders] update error:', err)
      toast.error(err.message || 'Error updating builder')
    } finally {
      setEditSaving(false)
    }
  }, [editForm])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'B'
  }

  return (
    <div className="max-w-6xl mx-auto py-8 font-sans select-none">
      
      {/* Header Banner */}
      <div className="flex items-center justify-between mb-8 pt-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Builders
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            {builders.length} registered partner developers
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(!showAdd); setSelectedBuilder(null) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-[0.98]"
        >
          {showAdd ? <X size={15} strokeWidth={2.5} /> : <Plus size={15} strokeWidth={2.5} />}
          {showAdd ? 'Cancel' : 'New Builder'}
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <m.form
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleAdd}
            className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 mb-6 shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3.5 mb-5">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-500" />
                <span>New Builder Profile</span>
              </h3>
            </div>
            <BuilderFormFields form={addForm} onChange={setAddForm} />
            <div className="flex justify-end gap-3 pt-5 mt-4 border-t border-slate-200/80 dark:border-slate-800">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold disabled:opacity-40 transition-all shadow-sm active:scale-[0.98]"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </m.form>
        )}
      </AnimatePresence>

      {/* Command Search Bar */}
      <div className="group flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs mb-6 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
        <Search size={16} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter builders or use tags like is:credai..."
          className="flex-1 bg-transparent border-none outline-none text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
        />
        <div className="hidden sm:flex items-center gap-1.5 opacity-50">
          <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10px] font-medium font-sans">⌘F</kbd>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center px-6 py-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <div className="w-10 mr-4" />
          <div className="flex-1">Builder Name</div>
          <div className="w-[100px] hidden sm:block text-right pr-4">Founded</div>
          <div className="w-[180px] hidden md:block pr-4">Headquarters</div>
          <div className="w-[100px] hidden sm:block text-right pr-4">Projects</div>
          <div className="w-[40px] text-right" />
        </div>

        {/* Table Body */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {loading ? (
            <div className="p-4"><UniversalLoader variant="skeleton-list" rows={8} /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <Building2 size={32} className="text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-sm font-bold text-slate-900 dark:text-white">No builders found</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try adjusting your filter parameters.</p>
            </div>
          ) : (
            filtered.map((b) => (
              <div 
                key={b.id} 
                onClick={() => openBuilderModal(b)}
                className="group flex items-center px-6 py-4 transition-all cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
              >
                {/* Icon / Logo */}
                <div className="w-10 h-10 mr-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-xs rounded-2xl shadow-xs flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {b.logo_url && (b.logo_url.startsWith('data:') || b.logo_url.startsWith('http')) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.logo_url} alt={b.name} className="w-full h-full object-contain bg-white p-1" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  ) : (
                    getInitials(b.name)
                  )}
                </div>
                
                {/* Title & Badge */}
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {b.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-slate-400 font-mono tracking-tight">{b.slug}</span>
                    {b.credai_member && (
                      <span className="flex items-center gap-1 text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold tracking-wider uppercase bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={10} /> CREDAI
                      </span>
                    )}
                  </div>
                </div>

                {/* Founded */}
                <div className="w-[100px] hidden sm:block text-right pr-4">
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                    {b.founded_year ?? '—'}
                  </span>
                </div>

                {/* HQ */}
                <div className="w-[180px] hidden md:flex items-center pr-4">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                    {b.headquarters ?? '—'}
                  </span>
                </div>

                {/* Projects count */}
                <div className="w-[100px] hidden sm:flex justify-end pr-4">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {b._count?.projects ?? b.projects?.length ?? 0} <span className="font-normal text-slate-400 text-[11px]">proj</span>
                  </span>
                </div>

                {/* Chevron Indicator */}
                <div className="w-[40px] flex items-center justify-end">
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CENTERED DIALOG MODAL FOR BUILDER DETAILS & LINKED PROJECTS */}
      <AnimatePresence>
        {selectedBuilder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop: click outside closes dialog */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              onClick={() => setSelectedBuilder(null)}
            />

            {/* Modal Dialog Card */}
            <m.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden font-sans z-10 my-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-4 min-w-0">
                  {/* Logo / Avatar container */}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-lg flex items-center justify-center shadow-md shrink-0 overflow-hidden p-1">
                    {selectedBuilder.logo_url && (selectedBuilder.logo_url.startsWith('data:') || selectedBuilder.logo_url.startsWith('http')) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedBuilder.logo_url} alt={selectedBuilder.name} className="w-full h-full object-contain bg-white rounded-xl p-1" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    ) : (
                      getInitials(selectedBuilder.name)
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white truncate tracking-tight">
                        {selectedBuilder.name}
                      </h3>
                      {selectedBuilder.credai_member && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> CREDAI Member
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <span className="font-mono text-slate-600 dark:text-slate-300">
                        slug: {selectedBuilder.slug}
                      </span>
                      {selectedBuilder.headquarters && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{selectedBuilder.headquarters}</span>
                        </span>
                      )}
                      {selectedBuilder.website && (
                        <a
                          href={selectedBuilder.website.startsWith('http') ? selectedBuilder.website : `https://${selectedBuilder.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold"
                        >
                          <span>Website</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedBuilder(null)}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body: Profile Form + Linked Projects Section */}
              <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                
                {/* Section 1: Partner Information Form */}
                <div className="space-y-3">
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">
                    Partner Specifications & Metadata
                  </span>
                  <BuilderFormFields form={editForm} onChange={setEditForm} />
                </div>

                {/* Section 2: Linked Projects */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-500" />
                      <span>Linked Real Estate Projects ({selectedBuilder.projects?.length ?? selectedBuilder._count?.projects ?? 0})</span>
                    </span>
                  </div>

                  {selectedBuilder.projects && selectedBuilder.projects.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedBuilder.projects.map((proj) => (
                        <div
                          key={proj.id}
                          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 group hover:border-blue-500/40 transition-all"
                        >
                          <div className="min-w-0">
                            <h5 className="font-bold text-slate-900 dark:text-white text-xs truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {proj.name}
                            </h5>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{proj.sector ? `${proj.sector}, ${proj.city || 'Noida'}` : proj.city || 'Noida'}</span>
                            </p>
                          </div>

                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 capitalize shrink-0">
                            {proj.status || 'Active'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        No projects currently linked to this builder profile.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between gap-4">
                <span className="text-xs font-semibold text-slate-400 font-mono">
                  ID: {selectedBuilder.id}
                </span>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedBuilder(null)}
                    className="py-2.5 px-4 rounded-xl border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-all active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => saveEdit(selectedBuilder.id)}
                    disabled={editSaving}
                    className="py-2.5 px-5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-black dark:hover:bg-slate-100 font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-[0.98]"
                  >
                    {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>{editSaving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
