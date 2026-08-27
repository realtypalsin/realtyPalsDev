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

export default function Markdown({ children, components, raw = false }: MarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={REMARK_PLUGINS}
      rehypePlugins={raw ? REHYPE_PLUGINS : undefined}
      components={components}
    >
      {children}
    </ReactMarkdown>
  )
}
