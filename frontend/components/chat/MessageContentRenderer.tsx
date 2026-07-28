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

export function MessageContentRenderer({ content, isStreaming, onAction }: MessageContentRendererProps) {
  const blocks = isStreaming ? null : parseResponseBlocks(content)

  const proseClass = "prose prose-sm md:prose-base dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-blue-700 dark:prose-headings:text-blue-400 prose-a:text-blue-500 prose-strong:bg-blue-50 dark:prose-strong:bg-blue-900/30 prose-strong:px-1.5 prose-strong:py-0.5 prose-strong:rounded-md prose-strong:text-blue-700 dark:prose-strong:text-blue-300 prose-strong:font-semibold prose-strong:border prose-strong:border-blue-100 dark:prose-strong:border-blue-800/50 prose-table:w-full prose-table:text-sm prose-table:my-4 prose-table:border-collapse prose-table:rounded-xl prose-table:overflow-hidden prose-table:border prose-table:border-gray-200 dark:prose-table:border-gray-700 prose-th:bg-gray-100 dark:prose-th:bg-blue-900/40 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-gray-800 dark:prose-th:text-blue-200 prose-th:border prose-th:border-gray-200 dark:prose-th:border-gray-700 prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-gray-200 dark:prose-td:border-gray-700"

  if (blocks) {
    return <ResponseBlockRenderer blocks={blocks} />
  }

  return (
    <>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, REALTY_SCHEMA]]}
        components={{
          'realty-chart': ({ node, ...props }: any) => <RealtyChart type={props.type} data={props.data} title={props.title} />,
          'realty-box': ({ node, ...props }: any) => <RealtyBox type={props.type} title={props.title}>{props.children}</RealtyBox>,
          table: ({ node, ...props }: any) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#151b27] shadow-sm">
              <table className="w-full border-collapse text-left text-sm text-gray-500 dark:text-gray-400" {...props} />
            </div>
          ),
          thead: ({ node, ...props }: any) => (
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800" {...props} />
          ),
          th: ({ node, ...props }: any) => (
            <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white" {...props} />
          ),
          td: ({ node, ...props }: any) => (
            <td className="px-4 py-3 border-b border-gray-100 dark:border-gray-800/50 last:border-0 text-gray-700 dark:text-gray-300" {...props} />
          ),
          tr: ({ node, ...props }: any) => (
            <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors" {...props} />
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
                  className="text-[#c47860] hover:underline cursor-pointer font-medium"
                >
                  {projectName}
                </button>
              )
            }
            return <a {...props} className="text-[#c47860] hover:underline" />
          }
        } as any}
        className={blocks ? undefined : proseClass}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-0.5 h-[1em] bg-current animate-pulse ml-0.5 align-middle opacity-70" />
      )}
    </>
  )
}
