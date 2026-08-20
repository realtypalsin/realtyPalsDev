'use client'

import ReactMarkdown from 'react-markdown'
import { ReactNode } from 'react'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import { defaultSchema } from 'rehype-sanitize'
import dynamic from 'next/dynamic'
import RealtyBox from '@/components/RealtyBox'
import { ResponseBlockRenderer } from '@/components/response/ResponseBlockRenderer'
import { parseResponseBlocks } from '@/lib/responseParser'
import {
  Building2,
  MapPin,
  Compass,
  ShieldCheck,
  CreditCard,
  BarChart3,
  Calendar,
  Layers,
  Home,
  CheckCircle2,
  FileText,
  Info
} from 'lucide-react'

const RealtyChart = dynamic(() => import('@/components/RealtyChart'), {
  ssr: false,
  loading: () => <div className="h-48 bg-slate-100 animate-pulse rounded-xl flex items-center justify-center"><span className="text-sm text-blue-600 font-medium">Loading chart...</span></div>
})

const safeDefaultSchema = defaultSchema || { tagNames: [], attributes: {} }
const REALTY_SCHEMA = {
  ...safeDefaultSchema,
  tagNames: [...(safeDefaultSchema.tagNames || []), 'realty-chart', 'realty-box'],
  attributes: {
    ...(safeDefaultSchema.attributes || {}),
    'realty-chart': ['type', 'data', 'title'],
    'realty-box': ['type', 'title'],
  },
}

interface MessageContentRendererProps {
  content: string
  isStreaming: boolean
  onAction?: (action: any) => void
}

function getHeaderIcon(text: string) {
  const t = text.toLowerCase()
  if (t.includes('payment') || t.includes('plan') || t.includes('cost') || t.includes('price')) return CreditCard
  if (t.includes('building') || t.includes('tower') || t.includes('floor') || t.includes('height')) return Building2
  if (t.includes('address') || t.includes('location') || t.includes('where')) return MapPin
  if (t.includes('vastu') || t.includes('orient') || t.includes('facing')) return Compass
  if (t.includes('safety') || t.includes('security') || t.includes('cctv') || t.includes('aqi')) return ShieldCheck
  if (t.includes('status') || t.includes('timeline') || t.includes('possession') || t.includes('date')) return Calendar
  if (t.includes('layout') || t.includes('unit') || t.includes('bhk') || t.includes('config')) return Home
  if (t.includes('amenit') || t.includes('facility') || t.includes('feature')) return Layers
  if (t.includes('connectiv') || t.includes('nearby') || t.includes('infra')) return Layers
  if (t.includes('decision') || t.includes('verdict') || t.includes('intelligence') || t.includes('thesis')) return BarChart3
  return Info
}

export function MessageContentRenderer({ content, isStreaming, onAction }: MessageContentRendererProps) {
  const blocks = isStreaming ? null : parseResponseBlocks(content)

  const proseClass = "prose prose-sm md:prose-base dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:my-2.5 prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900 dark:prose-headings:text-slate-100 prose-a:text-[#0064E5] dark:prose-a:text-[#4793FF] prose-a:no-underline hover:prose-a:underline prose-strong:font-semibold prose-strong:text-slate-900 dark:prose-strong:text-slate-100 prose-ul:my-2 prose-li:my-1"

  if (blocks) {
    return <ResponseBlockRenderer blocks={blocks} />
  }

  return (
    <>
      <div className={proseClass}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, REALTY_SCHEMA]]}
        components={{
          'realty-chart': ({ node, ...props }: any) => <RealtyChart type={props.type} data={props.data} title={props.title} />,
          'realty-box': ({ node, ...props }: any) => <RealtyBox type={props.type} title={props.title}>{props.children}</RealtyBox>,
          h3: ({ node, children, ...props }: any) => {
            const titleText = String(children || '')
            const IconComponent = getHeaderIcon(titleText)
            return (
              <h3 className="flex items-center gap-2.5 text-base md:text-lg font-bold text-slate-900 dark:text-slate-100 mt-5 mb-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 first:border-0 first:pt-0 first:mt-0" {...props}>
                <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#0064E5] dark:text-[#4793FF] flex-shrink-0">
                  <IconComponent className="w-4 h-4" />
                </span>
                <span>{children}</span>
              </h3>
            )
          },
          h4: ({ node, children, ...props }: any) => {
            const titleText = String(children || '')
            const IconComponent = getHeaderIcon(titleText)
            return (
              <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200 mt-4 mb-2" {...props}>
                <IconComponent className="w-3.5 h-3.5 text-[#0064E5] dark:text-[#4793FF] flex-shrink-0" />
                <span>{children}</span>
              </h4>
            )
          },
          blockquote: ({ node, ...props }: any) => (
            <blockquote className="my-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-4 text-slate-700 dark:text-slate-300 not-italic shadow-xs" {...props} />
          ),
          table: ({ node, ...props }: any) => (
            <div className="my-4 overflow-x-auto rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-[#111622] shadow-xs custom-scrollbar touch-pan-x -mx-1 sm:mx-0">
              <table className="min-w-[540px] w-full border-collapse text-left text-xs sm:text-sm text-slate-700 dark:text-zinc-300" {...props} />
            </div>
          ),
          thead: ({ node, ...props }: any) => (
            <thead className="bg-slate-100/80 dark:bg-zinc-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 border-b border-slate-200 dark:border-zinc-700/80" {...props} />
          ),
          th: ({ node, ...props }: any) => (
            <th className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap" {...props} />
          ),
          td: ({ node, ...props }: any) => (
            <td className="px-4 py-3.5 border-b border-slate-100 dark:border-zinc-800/60 last:border-0 leading-relaxed align-top" {...props} />
          ),
          tr: ({ node, ...props }: any) => (
            <tr className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors odd:bg-transparent even:bg-slate-50/50 dark:even:bg-zinc-800/20" {...props} />
          ),
          a: ({ node, ...props }: any) => {
            const href = props.href || ''
            if (href.startsWith('#entity:')) {
              const projectId = href.slice(8)
              const projectName = String(props.children)
              return (
                <button
                  onClick={() => onAction?.({
                    id: `entity:${projectId}`,
                    actionType: 'TEXT_MESSAGE',
                    label: `Tell me more about ${projectName}`,
                    icon: 'ℹ️',
                    analyticsId: `entity_mention:${projectId}`,
                    priority: 2,
                    payload: { text: `Tell me more about ${projectName}` },
                  })}
                  className="text-[#0064E5] hover:underline cursor-pointer font-medium"
                >
                  {projectName}
                </button>
              )
            }
            return <a {...props} className="text-[#0064E5] hover:underline" />
          }
        } as any}
      >
        {content}
      </ReactMarkdown>
      </div>
      {isStreaming && (
        <span className="inline-block w-1.5 h-4 bg-[#0064E5] animate-pulse ml-1 align-middle rounded-full" />
      )}
    </>
  )
}
