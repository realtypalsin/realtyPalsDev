'use client'

import React from 'react'
import { Trophy, BarChart2, CheckCircle, Building2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import remarkGfm from 'remark-gfm'
import type { ResponseBlock, BlockType } from '@/lib/responseParser'
import {
  extractNameReason,
  extractTable,
  extractQuickPickRows,
  extractBestForPairs,
  extractSectorList,
  extractCoverageIntro,
  parseSingleProjectHeader,
  extractSingleProjectBullets,
} from '@/lib/responseParser'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'


const RealtyChart = dynamic(() => import('@/components/RealtyChart'), {
  ssr: false,
  loading: () => <Skeleton className="h-48 w-full rounded-xl" />
})
import RealtyBox from '@/components/RealtyBox'
import ContactButton from '@/components/ContactButton'

const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false })

// Sanitization schema: allow realty-chart and realty-box custom elements + their attributes
const sanitizeSchema = {
  ...defaultSchema,
  tagNameFilter: (tagName: string) => {
    if (tagName === 'realty-chart' || tagName === 'realty-box' || tagName === 'realty-action') return true
    return (defaultSchema as any).tagNameFilter?.(tagName) ?? false
  },
  attributes: {
    ...defaultSchema.attributes,
    'realty-chart': ['type', 'data', 'title'],
    'realty-box': ['type', 'title'],
    'realty-action': ['type', 'label'],
  },
}

// ── Card shell ────────────────────────────────────────────────────────────────

function Card({ accentCls, children }: { accentCls: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800/80 shadow-sm">
      <div className={`h-0.5 w-full ${accentCls}`} />
      <div className="p-4">{children}</div>
    </div>
  )
}

function Label({ icon: Icon, text, cls }: { icon?: React.ElementType; text: string; cls: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2.5">
      {Icon && <Icon size={10} className={cls} />}
      <span className={`text-[9px] font-black uppercase tracking-[0.12em] ${cls}`}>{text}</span>
    </div>
  )
}

// ── Individual cards ─────────────────────────────────────────────────────────

function OurPickCard({ block }: { block: ResponseBlock }) {
  const { name, reason } = extractNameReason(block.body)
  const isVerdict = /Verdict/i.test(block.headerLine)
  return (
    <Card accentCls="bg-[#0064E5]">
      <Label icon={Trophy} text={isVerdict ? 'Verdict' : 'Our Pick'} cls="text-[#0064E5]" />
      {name && <p className="text-[15px] font-black text-gray-900 dark:text-white leading-tight">{name}</p>}
      {reason && <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">{reason}</p>}
    </Card>
  )
}

function QuickPicksCard({ block }: { block: ResponseBlock }) {
  const rows = extractQuickPickRows(block.body)
  if (rows.length === 0) return null
  return (
    <Card accentCls="bg-gray-200 dark:bg-gray-600">
      <Label icon={BarChart2} text="Quick Picks" cls="text-gray-400 dark:text-gray-500" />
      <div className="space-y-2">
        {rows.map((r, i) => {
          const dash = r.text.indexOf(' — ')
          const name = dash !== -1 ? r.text.slice(0, dash).trim() : r.text
          const why = dash !== -1 ? r.text.slice(dash + 3).trim() : ''
          return (
            <div key={i} className="flex items-start gap-3">
              <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wide w-24 flex-shrink-0 pt-0.5">{r.category}</span>
              <div>
                <span className="text-[12px] font-semibold text-gray-800 dark:text-gray-100">{name}</span>
                {why && <span className="text-[11px] text-gray-400 dark:text-gray-500 ml-1">— {why}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

const BADGE: Record<string, { label: string; chip: string; accent: string }> = {
  '🔵': { label: 'STRONG BUY', chip: 'bg-[#0064E5] text-white',    accent: 'bg-[#0064E5]' },
  '🟢': { label: 'BUY',        chip: 'bg-emerald-600 text-white',   accent: 'bg-emerald-400' },
  '🟡': { label: 'CONSIDER',   chip: 'bg-amber-500 text-white',     accent: 'bg-amber-400' },
  '🟠': { label: 'WATCH',      chip: 'bg-orange-500 text-white',    accent: 'bg-orange-400' },
  '🔴': { label: 'AVOID',      chip: 'bg-red-600 text-white',       accent: 'bg-red-400' },
}

function SingleProjectCard({ block }: { block: ResponseBlock }) {
  const { badge, label, name } = parseSingleProjectHeader(block.headerLine)
  const bullets = extractSingleProjectBullets(block.body)
  const cfg = BADGE[badge] ?? BADGE['🟡']
  return (
    <Card accentCls={cfg.accent}>
      <div className="flex items-center gap-2 mb-2.5">
        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${cfg.chip}`}>{label}</span>
      </div>
      {name && <p className="text-[14px] font-black text-gray-900 dark:text-white mb-2 leading-tight">{name}</p>}
      {bullets.length > 0 && (
        <div className="space-y-1">
          {bullets.map((b, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[#0064E5] text-[10px] mt-0.5 flex-shrink-0">•</span>
              <span className="text-[12px] text-gray-600 dark:text-gray-400 leading-snug">{b}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function WhyWinsCard({ block }: { block: ResponseBlock }) {
  const parsed = extractTable(block.body)
  const winnerMatch = block.headerLine.match(/\*\*Why (.+) wins\*\*/)
  const winner = winnerMatch?.[1] ?? ''
  if (!parsed || parsed.rows.length === 0) return null
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800/80 shadow-sm">
      <div className="h-0.5 w-full bg-gray-200 dark:bg-gray-600" />
      {winner && (
        <div className="px-4 pt-3 pb-0">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.12em]">Why {winner} wins</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/60">
              {parsed.headers.map((h, i) => (
                <th key={i} className="px-4 py-2 text-left text-[9px] font-black text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700/60">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parsed.rows.map((row, i) => (
              <tr key={i} className="border-t border-gray-100 dark:border-gray-700/40">
                {row.map((cell, j) => (
                  <td key={j} className={`px-4 py-2.5 ${j === 0 ? 'font-bold text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BestForCard({ block }: { block: ResponseBlock }) {
  const items = extractBestForPairs(block.body)
  if (items.length === 0) return null
  return (
    <Card accentCls="bg-emerald-300 dark:bg-emerald-700">
      <Label text="Best For" cls="text-emerald-600 dark:text-emerald-400" />
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-[12px] font-black text-gray-800 dark:text-gray-100 flex-shrink-0">{item.project}</span>
            <span className="text-gray-300 dark:text-gray-600 text-[12px]">→</span>
            <span className="text-[12px] text-gray-500 dark:text-gray-400 leading-snug">{item.type}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function BottomLineCard({ block }: { block: ResponseBlock }) {
  return (
    <Card accentCls="bg-emerald-400">
      <Label icon={CheckCircle} text="Bottom Line" cls="text-emerald-600 dark:text-emerald-400" />
      <p className="text-[13px] font-semibold text-emerald-900 dark:text-emerald-200 leading-snug">{block.body}</p>
    </Card>
  )
}

function CoverageStatusCard({ block }: { block: ResponseBlock }) {
  const intro = extractCoverageIntro(block.body)
  const sectors = extractSectorList(block.body)
  const question = block.body.split('\n').find(l => l.trim().startsWith('Want'))?.trim()
  return (
    <Card accentCls="bg-gray-300 dark:bg-gray-600">
      <Label icon={Building2} text="Coverage Status" cls="text-gray-500 dark:text-gray-400" />
      {intro && <p className="text-[12px] text-gray-600 dark:text-gray-400 mb-3">{intro}</p>}
      {sectors.length > 0 && (
        <div className="space-y-2 mb-3">
          {sectors.map((s, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 w-28 flex-shrink-0">{s.name}</span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">{s.reason}</span>
            </div>
          ))}
        </div>
      )}
      {question && <p className="text-[12px] text-gray-500 dark:text-gray-400 italic">{question}</p>}
    </Card>
  )
}

function TextBlock({ block }: { block: ResponseBlock }) {
  if (!block.body) return null
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-table:text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeRaw], [rehypeSanitize, sanitizeSchema]]}
        components={{
          'realty-chart': ({ node, ...props }: any) => <RealtyChart type={props.type} data={props.data} title={props.title} />,
          'realty-box': ({ node, ...props }: any) => <RealtyBox type={props.type} title={props.title}>{props.children}</RealtyBox>,
          'realty-action': ({ node, ...props }: any) => <ContactButton label={props.label || 'Request Callback'} className="my-2" />,
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
          )
        } as any}
      >
        {block.body}
      </ReactMarkdown>
    </div>
  )
}

// ── Renderer ──────────────────────────────────────────────────────────────────

const CARD_MAP: Record<BlockType, React.FC<{ block: ResponseBlock }>> = {
  our_pick:        OurPickCard,
  quick_picks:     QuickPicksCard,
  single_project:  SingleProjectCard,
  why_wins:        WhyWinsCard,
  best_for:        BestForCard,
  bottom_line:     BottomLineCard,
  coverage_status: CoverageStatusCard,
  text:            TextBlock,
}

export function ResponseBlockRenderer({ blocks }: { blocks: ResponseBlock[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        const CardCmp = CARD_MAP[block.type]
        return CardCmp ? <CardCmp key={i} block={block} /> : null
      })}
    </div>
  )
}
