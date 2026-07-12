'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2, Plus, X } from 'lucide-react'
import ImageUpload from './ImageUpload'

interface Builder { id: string; name: string }

export interface ProjectData {
  id?: string
  name: string
  slug: string
  builder_id: string
  sector: string
  city: string
  status: 'ready_to_move' | 'under_construction' | 'new_launch'
  tagline: string
  address: string
  lat: string
  lng: string
  rera_number: string
  rera_url: string
  total_units: string
  total_towers: string
  land_area_acres: string
  possession_label: string
  possession_date: string
  description: string
  long_description: string
  design_theme: string
  architect: string
  hero_image_url: string
  marketing_claims: string[]
  ai_search_keywords: string[]
}

const EMPTY: ProjectData = {
  name: '', slug: '', builder_id: '', sector: '', city: 'Noida',
  status: 'ready_to_move', tagline: '', address: '', lat: '', lng: '',
  rera_number: '', rera_url: '', total_units: '', total_towers: '',
  land_area_acres: '', possession_label: '', possession_date: '',
  description: '', long_description: '', design_theme: '', architect: '',
  hero_image_url: '', marketing_claims: [], ai_search_keywords: [],
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="col-span-2 pt-4 mt-2 first:pt-0 first:mt-0">
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{title}</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>
    </div>
  )
}

function Field({ label, children, hint, required }: {
  label: string
  children: React.ReactNode
  hint?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function Input({ value, onChange, ...rest }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white transition-colors"
    />
  )
}

function Select({ value, onChange, children }: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white transition-colors"
    >
      {children}
    </select>
  )
}

function Textarea({ value, onChange, rows = 3, placeholder }: {
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white resize-none transition-colors"
    />
  )
}

function TagInput({ tags, onChange, placeholder }: {
  tags: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  function add() {
    const v = input.trim()
    if (v && !tags.includes(v)) onChange([...tags, v])
    setInput('')
  }

  return (
    <div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((t) => (
            <span key={t} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full border border-blue-100">
              {t}
              <button
                type="button"
                onClick={() => onChange(tags.filter((x) => x !== t))}
                className="hover:text-blue-900 transition-colors"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
          }}
          placeholder={placeholder ?? 'Type and press Enter'}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 transition-colors"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}

export default function ProjectForm({ initialData, projectId, onFormChange, onSaved }: {
  initialData?: Partial<ProjectData>
  projectId?: string
  onFormChange?: (values: Partial<ProjectData>) => void
  onSaved?: () => void
}) {
  const router = useRouter()
  const [builders, setBuilders] = useState<Builder[]>([])
  const [form, setForm] = useState<ProjectData>({ ...EMPTY, ...initialData })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const prevFormRef = useRef<string>('')

  useEffect(() => {
    fetch('/api/v1/admin/builders')
      .then((r) => r.json())
      .then((d) => setBuilders(d.builders ?? []))
  }, [])

  // Emit form changes to parent for live preview (debounced via the state update itself)
  useEffect(() => {
    const serialized = JSON.stringify(form)
    if (serialized !== prevFormRef.current) {
      prevFormRef.current = serialized
      onFormChange?.(form)
    }
  }, [form, onFormChange])

  function set(key: keyof ProjectData) {
    return (value: string) => setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      name:               form.name,
      slug:               form.slug,
      builder_id:         form.builder_id,
      sector:             form.sector,
      city:               form.city,
      status:             form.status,
      tagline:            form.tagline || undefined,
      address:            form.address || undefined,
      lat:                form.lat ? parseFloat(form.lat) : undefined,
      lng:                form.lng ? parseFloat(form.lng) : undefined,
      rera_number:        form.rera_number || undefined,
      rera_url:           form.rera_url || undefined,
      total_units:        form.total_units ? parseInt(form.total_units) : undefined,
      total_towers:       form.total_towers ? parseInt(form.total_towers) : undefined,
      land_area_acres:    form.land_area_acres ? parseFloat(form.land_area_acres) : undefined,
      possession_label:   form.possession_label || undefined,
      possession_date:    form.possession_date || undefined,
      description:        form.description || undefined,
      long_description:   form.long_description || undefined,
      design_theme:       form.design_theme || undefined,
      architect:          form.architect || undefined,
      hero_image_url:     form.hero_image_url || undefined,
      marketing_claims:   form.marketing_claims,
      ai_search_keywords: form.ai_search_keywords,
    }

    const url    = projectId ? `/api/v1/admin/projects/${projectId}` : '/api/v1/admin/projects'
    const method = projectId ? 'PATCH' : 'POST'

    const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(data.error ?? 'Save failed')
      setSaving(false)
      return
    }

    setSaving(false)
    if (onSaved) {
      onSaved()
    } else {
      router.push('/admin/projects')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">

        <SectionHeader title="Core Info" />

        <Field label="Project Name" required>
          <Input
            value={form.name}
            onChange={(v) => {
              set('name')(v)
              if (!projectId) set('slug')(toSlug(v))
            }}
            placeholder="e.g. ACE Parkway"
            required
          />
        </Field>

        <Field label="Slug" required hint="URL-safe ID — auto-filled from name">
          <Input value={form.slug} onChange={set('slug')} placeholder="ace-parkway" required />
        </Field>

        <Field label="Builder" required>
          <Select value={form.builder_id} onChange={set('builder_id')}>
            <option value="">Select builder…</option>
            {builders.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
        </Field>

        <Field label="Status" required>
          <Select value={form.status} onChange={set('status')}>
            <option value="ready_to_move">Ready to Move</option>
            <option value="under_construction">Under Construction</option>
            <option value="new_launch">New Launch</option>
          </Select>
        </Field>

        <Field label="Sector" required hint="e.g. Sector 150">
          <Input value={form.sector} onChange={set('sector')} placeholder="Sector 150" required />
        </Field>

        <Field label="City">
          <Input value={form.city} onChange={set('city')} placeholder="Noida" />
        </Field>

        <SectionHeader title="Location & RERA" />

        <Field label="Full Address">
          <Input value={form.address} onChange={set('address')} placeholder="Noida Expressway, Sector 150, Noida" />
        </Field>

        <Field label="Tagline">
          <Input value={form.tagline} onChange={set('tagline')} placeholder="Short marketing tagline" />
        </Field>

        <Field label="Latitude" hint="Right-click on Google Maps → copy coordinates">
          <Input value={form.lat} onChange={set('lat')} placeholder="28.5355" type="number" step="any" />
        </Field>

        <Field label="Longitude">
          <Input value={form.lng} onChange={set('lng')} placeholder="77.3910" type="number" step="any" />
        </Field>

        <Field label="RERA Number" hint="From up-rera.in">
          <Input value={form.rera_number} onChange={set('rera_number')} placeholder="UPRERAPRJXXXXXX" />
        </Field>

        <Field label="RERA URL">
          <Input value={form.rera_url} onChange={set('rera_url')} placeholder="https://up-rera.in/…" type="url" />
        </Field>

        <SectionHeader title="Project Details" />

        <Field label="Total Towers">
          <Input value={form.total_towers} onChange={set('total_towers')} placeholder="4" type="number" />
        </Field>

        <Field label="Total Units">
          <Input value={form.total_units} onChange={set('total_units')} placeholder="800" type="number" />
        </Field>

        <Field label="Land Area (Acres)">
          <Input value={form.land_area_acres} onChange={set('land_area_acres')} placeholder="12.5" type="number" step="any" />
        </Field>

        <Field label="Possession Label">
          <Input value={form.possession_label} onChange={set('possession_label')} placeholder="Expected Dec 2026" />
        </Field>

        <Field label="Possession Date" hint="Actual or expected handover date">
          <Input value={form.possession_date} onChange={set('possession_date')} type="date" />
        </Field>

        <Field label="Design Theme">
          <Input value={form.design_theme} onChange={set('design_theme')} placeholder="Contemporary / Art Deco" />
        </Field>

        <Field label="Architect">
          <Input value={form.architect} onChange={set('architect')} placeholder="Architect firm name" />
        </Field>

        <SectionHeader title="Hero Image" />

        <div className="col-span-2">
          <Field label="Hero Image" hint="Upload from your computer or paste a URL">
            <ImageUpload
              value={form.hero_image_url}
              onChange={set('hero_image_url')}
              projectSlug={form.slug}
            />
          </Field>
        </div>

        <SectionHeader title="Descriptions" />

        <div className="col-span-2">
          <Field label="Short Description" hint="1–2 sentences used by the AI in recommendations">
            <Textarea
              value={form.description}
              onChange={set('description')}
              rows={2}
              placeholder="Brief description of the project…"
            />
          </Field>
        </div>

        <div className="col-span-2">
          <Field label="Long Description" hint="Full description shown in the property detail panel">
            <Textarea
              value={form.long_description}
              onChange={set('long_description')}
              rows={5}
              placeholder="Full project description…"
            />
          </Field>
        </div>

        <SectionHeader title="AI & Marketing" />

        <div className="col-span-2">
          <Field label="Marketing Claims" hint="Key selling points — press Enter after each">
            <TagInput
              tags={form.marketing_claims}
              onChange={(v) => setForm((f) => ({ ...f, marketing_claims: v }))}
              placeholder="e.g. 70% green area"
            />
          </Field>
        </div>

        <div className="col-span-2">
          <Field label="AI Search Keywords" hint="Terms the AI uses to match this project to queries">
            <TagInput
              tags={form.ai_search_keywords}
              onChange={(v) => setForm((f) => ({ ...f, ai_search_keywords: v }))}
              placeholder="e.g. peaceful expressway metro"
            />
          </Field>
        </div>

      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving…' : projectId ? 'Save Changes' : 'Create Project'}
        </button>
      </div>
    </form>
  )
}
