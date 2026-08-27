'use client'

// Single owner of the markdown pipeline.
//
// Why this file exists: `rehype-raw` depends on `parse5` (~565 KB of raw JS).
// MessageBubble and ResponseBlockRenderer each imported react-markdown and the
// three plugins at module scope, so parse5 landed in the /discover entry chunk —
// which also defeated ResponseBlockRenderer's `dynamic(() => import('react-markdown'))`,
// since the plugins it needs were eager anyway.
//
// Consumers must pull this in via `next/dynamic` so the whole pipeline is one
// lazy chunk, fetched while the model is still streaming rather than before the
// chat can paint.

import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'

const base = defaultSchema ?? { tagNames: [], attributes: {} }

/**
 * Sanitizer allow-list for our custom elements.
 *
 * `tagNames` must be extended directly — hast-util-sanitize has no
 * `tagNameFilter` option, so a filter function is silently ignored and every
 * realty-* tag gets stripped.
 */
export const REALTY_SCHEMA = {
  ...base,
  tagNames: [...(base.tagNames ?? []), 'realty-chart', 'realty-box', 'realty-action'],
  attributes: {
    ...(base.attributes ?? {}),
    'realty-chart': ['type', 'data', 'title'],
    'realty-box': ['type', 'title'],
    'realty-action': ['type', 'label'],
  },
}

// Hoisted so the plugin arrays keep a stable identity across renders — a fresh
// array each render makes react-markdown rebuild its processor on every keystroke
// of a streaming response.
const REMARK_PLUGINS = [remarkGfm]
const REHYPE_PLUGINS = [rehypeRaw, [rehypeSanitize, REALTY_SCHEMA]] as never[]

export interface MarkdownProps {
  children: string
  components?: Components
  /**
   * Parse embedded HTML so the realty-* elements reach `components`.
   * Leave off for plain prose: it skips parse5 entirely at render time.
   */
  raw?: boolean
}

const DEFAULT_COMPONENTS: Components = {
  table: ({ ...props }) => (
    <div className="my-3 w-full overflow-x-auto touch-pan-x rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 shadow-2xs">
      <table className="w-full text-left text-xs border-collapse min-w-[320px]" {...props} />
    </div>
  ),
  thead: ({ ...props }) => (
    <thead className="bg-slate-50/90 dark:bg-zinc-800/90 border-b border-slate-200/80 dark:border-zinc-750" {...props} />
  ),
  th: ({ ...props }) => (
    <th className="px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300" {...props} />
  ),
  td: ({ ...props }) => (
    <td className="px-3.5 py-2.5 text-xs text-slate-700 dark:text-zinc-300 border-t border-slate-100 dark:border-zinc-800/60 leading-relaxed" {...props} />
  ),
}

export default function Markdown({ children, components, raw = false }: MarkdownProps) {
  const mergedComponents = components ? { ...DEFAULT_COMPONENTS, ...components } : DEFAULT_COMPONENTS

  return (
    <ReactMarkdown
      remarkPlugins={REMARK_PLUGINS}
      rehypePlugins={raw ? REHYPE_PLUGINS : undefined}
      components={mergedComponents}
    >
      {children}
    </ReactMarkdown>
  )
}
