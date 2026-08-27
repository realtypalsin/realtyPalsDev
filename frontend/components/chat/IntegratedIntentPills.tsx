'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  MapPin,
  House,
  Clock,
  CurrencyInr,
  Buildings,
  CaretDown,
  X,
  MagnifyingGlass,
  ArrowRight
} from '@phosphor-icons/react'

type Patch = Record<string, unknown>

interface Option {
  label: string
  value: unknown
}

const POSSESSION_MAP: Record<string, string> = {
  immediate: 'Ready to Move',
  '1year': 'Within 1 Year',
  '2year': 'Within 2 Years',
  '3year+': '3+ Years',
}

const FIELD_CONFIGS: Record<
  string,
  {
    title: string
    icon: typeof MapPin
    format: (v: unknown) => string
    options?: Option[]
    freeText?: boolean
  }
> = {
  sector: {
    title: 'Sector / Location',
    icon: MapPin,
    format: v => String(v),
    freeText: true,
  },
  bhk: {
    title: 'Configuration',
    icon: House,
    format: v => (Array.isArray(v) ? v.join(', ') + ' BHK' : v + ' BHK'),
    options: [
      { label: '1 BHK', value: [1] },
      { label: '2 BHK', value: [2] },
      { label: '3 BHK', value: [3] },
      { label: '4 BHK', value: [4] },
      { label: '5+ BHK', value: [5] },
    ],
  },
  possession: {
    title: 'Possession Status',
    icon: Clock,
    format: v => POSSESSION_MAP[String(v)] ?? String(v),
    options: [
      { label: 'Ready to Move', value: 'immediate' },
      { label: 'Within 1 Year', value: '1year' },
      { label: 'Within 2 Years', value: '2year' },
      { label: '3+ Years', value: '3year+' },
    ],
  },
  budgetMax: {
    title: 'Max Budget',
    icon: CurrencyInr,
    format: v => '≤ ₹' + v + ' Cr',
    options: [
      { label: 'Up to ₹1.0 Cr', value: 1.0 },
      { label: 'Up to ₹1.5 Cr', value: 1.5 },
      { label: 'Up to ₹2.0 Cr', value: 2.0 },
      { label: 'Up to ₹2.5 Cr', value: 2.5 },
      { label: 'Up to ₹3.0 Cr', value: 3.0 },
      { label: 'Up to ₹4.0 Cr', value: 4.0 },
      { label: 'Up to ₹5.0+ Cr', value: 5.0 },
    ],
  },
  budgetMin: {
    title: 'Min Budget',
    icon: CurrencyInr,
    format: v => '≥ ₹' + v + ' Cr',
    options: [
      { label: 'From ₹0.5 Cr', value: 0.5 },
      { label: 'From ₹1.0 Cr', value: 1.0 },
      { label: 'From ₹1.5 Cr', value: 1.5 },
      { label: 'From ₹2.0 Cr', value: 2.0 },
      { label: 'From ₹3.0 Cr', value: 3.0 },
    ],
  },
  projectNames: {
    title: 'Project',
    icon: Buildings,
    format: v => (Array.isArray(v) ? v.join(', ') : String(v)),
  },
  builderName: {
    title: 'Builder',
    icon: Buildings,
    format: v => String(v),
  },
}

const ORDER = ['projectNames', 'sector', 'bhk', 'possession', 'budgetMin', 'budgetMax', 'builderName']

function isSet(v: unknown): boolean {
  if (v === null || v === undefined || v === '') return false
  return Array.isArray(v) ? v.length > 0 : true
}

export interface IntegratedIntentPillsProps {
  intent: Record<string, unknown> | null
  onPatch: (patch: Patch) => void
  onRemove: (field: string) => void
  disabled?: boolean
}

export function IntegratedIntentPills({
  intent,
  onPatch,
  onRemove,
  disabled = false,
}: IntegratedIntentPillsProps) {
  const [openField, setOpenField] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const handleClose = useCallback(() => {
    setOpenField(null)
    setDraft('')
  }, [])

  useEffect(() => {
    if (!openField) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openField, handleClose])

  if (!intent) {
    return (
      <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500 hidden sm:inline">
        AI Real Estate Advisor · Noida & Greater Noida
      </span>
    )
  }

  const active = ORDER.filter(f => FIELD_CONFIGS[f] && isSet(intent[f])).map(f => ({
    field: f,
    spec: FIELD_CONFIGS[f],
    label: FIELD_CONFIGS[f].format(intent[f]),
    Icon: FIELD_CONFIGS[f].icon,
  }))

  if (active.length === 0) {
    return (
      <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500 hidden sm:inline">
        AI Real Estate Advisor · Noida & Greater Noida
      </span>
    )
  }

  const commit = (field: string, value: unknown) => {
    handleClose()
    onPatch({ [field]: value })
  }

  return (
    <>
      {/* Full-screen invisible click-outside backdrop */}
      {openField && (
        <div
          className="fixed inset-0 z-40 cursor-default"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      <div
        className="flex items-center gap-1.5 overflow-visible py-0.5 max-w-full flex-wrap sm:flex-nowrap"
        aria-label="Active filters"
      >
        {active.map(({ field, spec, label, Icon }, index) => {
          const editable = Boolean(spec.options || spec.freeText)
          const isOpen = openField === field
          const currentVal = intent[field]
          // Align right if it's towards the end of the list to prevent overflowing screen
          const isRightAligned = index >= 2

          return (
            <div key={field} className="relative shrink-0">
              <div
                className={`inline-flex items-center rounded-full text-[11px] font-semibold transition-all border shadow-2xs ${
                  isOpen
                    ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20 scale-[1.02]'
                    : 'bg-blue-50/90 dark:bg-blue-950/70 border-blue-200/80 dark:border-blue-800/70 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/80'
                }`}
              >
                <button
                  type="button"
                  disabled={disabled || !editable}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (isOpen) {
                      handleClose()
                    } else {
                      setDraft(String(intent[field] ?? ''))
                      setOpenField(field)
                    }
                  }}
                  title={editable ? `Change ${spec.title}` : spec.title}
                  className={`flex items-center gap-1.5 pl-2.5 ${editable ? 'pr-1.5' : 'pr-2.5'} py-1 cursor-pointer select-none`}
                >
                  <Icon size={12} weight="fill" className={isOpen ? 'text-white' : 'text-blue-600 dark:text-blue-400'} />
                  <span className="truncate max-w-[120px] sm:max-w-[180px]">{label}</span>
                  {editable && (
                    <CaretDown
                      size={10}
                      weight="bold"
                      className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : 'text-blue-500/70 dark:text-blue-400/70'}`}
                    />
                  )}
                </button>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (openField === field) handleClose()
                    onRemove(field)
                  }}
                  aria-label={`Remove ${spec.title} filter`}
                  className={`pr-2 pl-0.5 py-1 flex items-center justify-center cursor-pointer transition-colors ${
                    isOpen
                      ? 'text-white/80 hover:text-white'
                      : 'text-blue-400 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-200'
                  }`}
                >
                  <X size={10} weight="bold" />
                </button>
              </div>

              {/* ATTACHED POPOVER: Opens directly attached on top of this exact pill */}
              {isOpen && (
                <div
                  className={`absolute bottom-full ${
                    isRightAligned ? 'right-0 sm:left-0' : 'left-0'
                  } mb-2 w-[260px] sm:w-[280px] max-w-[calc(100vw-32px)] rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 overflow-hidden ring-1 ring-black/5 dark:ring-white/10`}
                >
                  {/* Header */}
                  <div className="px-3.5 py-2.5 bg-zinc-50/90 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                        {spec.title}
                      </span>
                    </div>
                    {isSet(currentVal) ? (
                      <span className="text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800/60 truncate max-w-[110px]">
                        {spec.format(currentVal)}
                      </span>
                    ) : null}
                  </div>

                  {/* Sector: Clean Compact Input Box (No List) */}
                  {spec.freeText && (
                    <div className="p-3">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          const v = draft.trim()
                          if (v) commit(field, v)
                        }}
                        className="space-y-2.5"
                      >
                        <div className="relative">
                          <input
                            autoFocus
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="e.g. Sector 10, Greater Noida"
                            aria-label={spec.title}
                            className="w-full pl-8 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/70 text-xs font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-800 transition-colors"
                          />
                          <MagnifyingGlass size={14} className="absolute left-2.5 top-2.5 text-zinc-400" />
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-[10px] text-zinc-400">Press Enter or Apply</span>
                          <button
                            type="submit"
                            disabled={!draft.trim()}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                          >
                            <span>Apply</span>
                            <ArrowRight size={11} weight="bold" />
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Configuration / Possession / Budget: Admin-Style Radio Selector List */}
                  {spec.options && (
                    <div className="py-1 max-h-64 overflow-y-auto divide-y divide-zinc-100/60 dark:divide-zinc-800/40">
                      {spec.options.map((opt) => {
                        const isSelected = spec.format(opt.value) === spec.format(currentVal)
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => commit(field, opt.value)}
                            className={`w-full px-3.5 py-2.5 text-left text-xs transition-all flex items-center justify-between group cursor-pointer ${
                              isSelected
                                ? 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-950 dark:text-blue-100 font-bold border-l-4 border-blue-600 pl-3'
                                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white font-medium pl-3.5'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Radio Circle */}
                              <div
                                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected
                                    ? 'border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500'
                                    : 'border-zinc-300 dark:border-zinc-600 group-hover:border-zinc-400'
                                }`}
                              >
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-zinc-900" />}
                              </div>
                              <span className="truncate whitespace-nowrap">{opt.label}</span>
                            </div>

                            {isSelected && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-600 text-white font-bold shadow-xs">
                                Active
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

export default IntegratedIntentPills
