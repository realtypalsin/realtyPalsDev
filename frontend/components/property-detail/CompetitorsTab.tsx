import { m } from 'framer-motion'
import { AlertTriangle, Building2, CheckCircle2 } from 'lucide-react'
import type { ProjectCard as ProjectCardType, ProjectDetail } from '@/types/project'

export default function CompetitorsTab({ project, d }: { project: ProjectCardType | null, d: (ProjectCardType | ProjectDetail) | null }) {
  const competitors = (d as any)?.competitors || []

  if (!competitors || competitors.length === 0) {
    return (
      <div className="p-8 bg-white dark:bg-[#0f0e0d] text-center">
        <p className="text-gray-500 dark:text-gray-400">No competitor analysis available for this project yet.</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-8 bg-[#F7F9FB] dark:bg-[#0f0e0d] text-gray-900 dark:text-gray-100 font-sans">
      <div className="space-y-2 mb-8">
        <h2 className="text-[22px] font-bold text-gray-900 dark:text-white tracking-tight">Compare Properties</h2>
        <p className="text-[13px] text-gray-500 max-w-xl">
          See how {d?.name || 'this project'} stacks up against its closest competitors in the market.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {competitors.map((comp: any, idx: number) => {
          // Verdict colors
          let vBg = 'bg-gray-100 text-gray-600'
          const v = comp.verdict?.toUpperCase() || ''
          if (v === 'STRONG_BUY' || v === 'BUY') vBg = 'bg-emerald-100 text-emerald-700'
          if (v === 'AVOID') vBg = 'bg-rose-100 text-rose-700'
          if (v === 'HOLD' || v === 'WATCH') vBg = 'bg-amber-100 text-amber-700'

          return (
            <m.div 
              key={comp.id || idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white dark:bg-[#111] rounded-[24px] p-6 shadow-sm border border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-[18px] font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    <Building2 size={18} className="text-blue-500" />
                    {comp.competitor_name}
                  </h3>
                  {comp.price_delta_note && (
                    <p className="text-[12px] font-medium text-gray-500 bg-gray-50 dark:bg-gray-800 inline-block px-2 py-0.5 rounded">
                      {comp.price_delta_note}
                    </p>
                  )}
                </div>
                <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${vBg}`}>
                  {comp.verdict?.replace('_', ' ') || 'UNKNOWN'}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                  <h4 className="text-[12px] font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400 mb-2 flex items-center gap-2">
                    <CheckCircle2 size={14} /> Why {d?.name || 'This Project'} Wins
                  </h4>
                  <p className="text-[13px] text-gray-700 dark:text-gray-300">
                    {comp.this_project_advantage || 'No distinct advantage listed.'}
                  </p>
                </div>

                <div className="bg-rose-50/50 dark:bg-rose-900/10 p-4 rounded-xl border border-rose-100 dark:border-rose-800/30">
                  <h4 className="text-[12px] font-black uppercase tracking-widest text-rose-800 dark:text-rose-400 mb-2 flex items-center gap-2">
                    <AlertTriangle size={14} /> Where {comp.competitor_name} is Better
                  </h4>
                  <p className="text-[13px] text-gray-700 dark:text-gray-300">
                    {comp.competitor_advantage || 'No distinct advantage listed.'}
                  </p>
                </div>
              </div>
            </m.div>
          )
        })}
      </div>
    </div>
  )
}
