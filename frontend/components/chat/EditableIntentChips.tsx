'use client'

import { useEffect, useRef, useState } from 'react'
import { CaretDown, X } from '@phosphor-icons/react'

/**
 * The intent, as controls rather than a readout.
 *
 * ContextRibbon shows the same fields above the conversation, but it is a
 * summary: the only thing you can do is delete a field, and its remove button
 * is opacity-0 until hover, which on a touch device means invisible and
 * unhittable. Changing "Sector 75" to "Sector 150" meant typing a fresh
 * sentence and hoping the extractor read it the same way.
 *
 * These sit with the input because that is where the buyer is already looking
 * when they want to revise something. Tapping a value opens a picker; changing
 * it re-runs the search through the existing INTENT_PATCH path, which the chat
 * already turns back into a natural-language turn. The conversation is never
 * restarted — CLAUDE.md calls this "correction without restart".
 *
 * Fields we cannot offer a sensible menu for (a project or builder name) stay
 * removable but not editable: a picker over every builder is a worse control
 * than retyping.
 */

type Patch = Record<string, unknown>

interface Option {
  label: string
  value: unknown
}

const POSSESSION: Record<string, string> = {
  immediate: 'Ready to Move',
  '1year': 'Within 1 Year',
  '2year': 'Within 2 Years',
  '3year+': '3+ Years',
}

const FIELDS: Record<
  string,
  { title: string; format: (v: unknown) => string; options?: Option[]; freeText?: boolean }
> = {
  sector: {
    title: 'Sector',
    format: v => String(v),
    freeText: true,
  },
  bhk: {
    title: 'Configuration',
    format: v => (Array.isArray(v) ? v.join(', ') + ' BHK' : v + ' BHK'),
    options: [1, 2, 3, 4, 5].map(n => ({ label: n + ' BHK', value: [n] })),
  },
  budgetMax: {
    title: 'Max budget',
    format: v => '≤ ₹' + v + ' Cr',
    options: [1, 1.5, 2, 2.5, 3, 4, 5].map(n => ({ label: '₹' + n + ' Cr', value: n })),
  },
  budgetMin: {
    title: 'Min budget',
    format: v => '≥ ₹' + v + ' Cr',
    options: [0.5, 1, 1.5, 2, 3].map(n => ({ label: '₹' + n + ' Cr', value: n })),
  },
  possession: {
    title: 'Possession',
    format: v => POSSESSION[String(v)] ?? String(v),
    options: [
      { label: 'Ready to Move', value: 'immediate' },
      { label: 'Within 1 Year', value: '1year' },
      { label: 'Within 2 Years', value: '2year' },
      { label: '3+ Years', value: '3year+' },
    ],
  },
  projectNames: {
    title: 'Project',
    format: v => (Array.isArray(v) ? v.join(', ') : String(v)),
  },
  builderName: {
    title: 'Builder',
    format: v => String(v),
  },
}

const ORDER = ['projectNames', 'sector', 'bhk', 'budgetMin', 'budgetMax', 'possession', 'builderName']

function isSet(v: unknown): boolean {
  if (v === null || v === undefined || v === '') return false
  return Array.isArray(v) ? v.length > 0 : true
}

export function EditableIntentChips({
  intent,
  onPatch,
  onRemove,
  disabled = false,
}: {
  intent: Record<string, unknown> | null
  onPatch: (patch: Patch) => void
  onRemove: (field: string) => void
  disabled?: boolean
}) {
  const [openField, setOpenField] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!openField) return
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpenField(null)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenField(null)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [openField])

  if (!intent) return null

  const active = ORDER.filter(f => FIELDS[f] && isSet(intent[f])).map(f => ({
    field: f,
    spec: FIELDS[f],
    label: FIELDS[f].format(intent[f]),
  }))

  if (active.length === 0) return null

  const commit = (field: string, value: unknown) => {
    setOpenField(null)
    setDraft('')
    onPatch({ [field]: value })
  }

  return (
    <div
      ref={wrapRef}
      className="flex flex-nowrap sm:flex-wrap items-center gap-1.5 overflow-x-auto sm:overflow-visible overscroll-x-contain px-1 pb-1.5"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      aria-label="Current search filters"
    >
      {active.map(({ field, spec, label }) => {
        const editable = Boolean(spec.options || spec.freeText)
        const isOpen = openField === field

        return (
          <div key={field} className="relative shrink-0">
            <div
              className={
                'flex items-center rounded-full border text-[11.5px] font-medium transition-colors ' +
                (isOpen
                  ? 'bg-white dark:bg-zinc-800 border-blue-400 dark:border-blue-500'
                  : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600')
              }
            >
              <button
                type="button"
                disabled={disabled || !editable}
                onClick={() => {
                  setDraft(String(intent[field] ?? ''))
                  setOpenField(isOpen ? null : field)
                }}
                title={editable ? 'Change ' + spec.title.toLowerCase() : spec.title}
                className={
                  'flex items-center gap-1 pl-3 pr-1.5 py-2 min-h-[36px] text-zinc-700 dark:text-zinc-200 ' +
                  (editable ? 'cursor-pointer' : 'cursor-default')
                }
              >
                <span className="whitespace-nowrap">{label}</span>
                {editable && (
                  <CaretDown
                    size={11}
                    weight="bold"
                    className={'text-zinc-400 transition-transform ' + (isOpen ? 'rotate-180' : '')}
                  />
                )}
              </button>

              {/* Always visible, never hover-gated: on a touch device an
                  opacity-0 control is an invisible one. */}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemove(field)}
                aria-label={'Remove ' + spec.title.toLowerCase() + ' filter'}
                className="pr-2.5 pl-1 py-2 min-h-[36px] min-w-[28px] flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X size={11} weight="bold" />
              </button>
            </div>

            {isOpen && (
              <div className="absolute bottom-full left-0 mb-1.5 z-50 min-w-[170px] rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-lg p-1.5">
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                  {spec.title}
                </div>

                {spec.options?.map(opt => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => commit(field, opt.value)}
                    className="w-full text-left px-2.5 py-2 min-h-[38px] rounded-lg text-[12.5px] text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    {opt.label}
                  </button>
                ))}

                {spec.freeText && (
                  <form
                    onSubmit={e => {
                      e.preventDefault()
                      const v = draft.trim()
                      if (v) commit(field, v)
                    }}
                    className="p-1"
                  >
                    <input
                      autoFocus
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      placeholder="e.g. Sector 150"
                      aria-label={spec.title}
                      className="w-full px-2.5 py-2 min-h-[38px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[12.5px] text-zinc-800 dark:text-zinc-100 outline-none focus:border-blue-400"
                    />
                  </form>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default EditableIntentChips
