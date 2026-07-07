'use client'

import { useState } from 'react'
import { ExternalLink, BadgeCheck, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react'
import type { BuilderDetail } from '@/types/project'

interface Props {
  builder: BuilderDetail | null
  reraNumber?: string | null
  defaultExpanded?: boolean
}

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-[11px] text-gray-400 italic">Not yet verified</span>
  const color = score >= 70 ? 'bg-green-400' : score >= 40 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[11px] font-semibold text-gray-600 w-8 text-right">{score}</span>
    </div>
  )
}

export default function BuilderDNA({ builder: b, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  if (!b) return null

  const stats = [
    b.founded_year ? { label: 'Founded', value: String(b.founded_year) } : null,
    b.headquarters ? { label: 'Headquarters', value: b.headquarters } : null,
    b.delivered_units ? { label: 'Units Delivered', value: `${b.delivered_units.toLocaleString()}+` } : null,
    b.awards_count ? { label: 'Awards Won', value: String(b.awards_count) } : null,
  ].filter(Boolean) as { label: string; value: string }[]

  const specializations = [
    b.luxury_specialization && 'Luxury',
    b.township_specialization && 'Township',
    b.affordable_specialization && 'Affordable',
  ].filter(Boolean) as string[]

  return (
    <div className="space-y-4">
      {/* Identity extras */}
      {(b.founder || b.parent_group) && (
        <div className="space-y-1">
          {b.founder && (
            <p className="text-[12px] text-gray-600"><span className="font-semibold">Founder:</span> {b.founder}</p>
          )}
          {b.parent_group && (
            <p className="text-[12px] text-gray-600"><span className="font-semibold">Group:</span> {b.parent_group}</p>
          )}
        </div>
      )}

      {/* Stat grid */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-3">
              <p className="text-[15px] font-black text-gray-900 truncate">{s.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {!expanded && (
        <button 
          onClick={() => setExpanded(true)} 
          className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-xl text-[12px] font-semibold text-gray-600 transition-colors"
        >
          View Full Builder Profile
          <ChevronDown size={14} className="text-gray-400" />
        </button>
      )}

      {expanded && (
        <div className="space-y-4 pt-2 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Quality scores */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quality Scores</p>
            {[
              { label: 'Construction Quality', score: b.construction_quality_score },
              { label: 'After-Sales Service', score: b.after_sales_score },
              { label: 'Buyer Satisfaction', score: b.buyer_satisfaction_score },
            ].map(({ label, score }) => (
              <div key={label} className="space-y-0.5">
                <p className="text-[11px] text-gray-500">{label}</p>
                <ScoreBar score={score} />
              </div>
            ))}
          </div>

          {/* Compliance */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Compliance</p>
            <div className="space-y-0.5">
              <p className="text-[11px] text-gray-500">RERA Compliance</p>
              <ScoreBar score={b.rera_compliance_score} />
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-500">Active Litigations</span>
              {b.litigation_count === null
                ? <span className="text-gray-400 italic">Not yet verified</span>
                : <span className="font-semibold text-gray-700">{b.litigation_count}</span>
              }
            </div>
            {b.insolvency_history && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
                <ShieldAlert size={12} />
                Insolvency history on record
              </div>
            )}
            {b.legal_flag && (
              <div className="flex items-start gap-1.5 text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5">
                <ShieldAlert size={12} className="flex-shrink-0 mt-0.5" />
                {b.legal_flag}
              </div>
            )}
          </div>

          {/* Financial & legal */}
          {(b.financial_hygiene_score !== null || b.outstanding_dues_cr !== null || b.cin || b.rera_promoter_id || b.funding_banks?.length > 0 || b.audit_flags_log) && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Financial &amp; Legal</p>
              {b.financial_hygiene_score !== null && (
                <div className="space-y-0.5">
                  <p className="text-[11px] text-gray-500">Financial Hygiene</p>
                  <ScoreBar score={b.financial_hygiene_score} />
                </div>
              )}
              {b.outstanding_dues_cr !== null && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500">Outstanding Dues</span>
                  <span className="font-semibold text-gray-700">₹{b.outstanding_dues_cr} Cr</span>
                </div>
              )}
              {b.cin && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500">CIN</span>
                  <span className="font-mono text-gray-700">{b.cin}</span>
                </div>
              )}
              {b.rera_promoter_id && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500">RERA Promoter ID</span>
                  <span className="font-mono text-gray-700">{b.rera_promoter_id}</span>
                </div>
              )}
              {b.funding_banks?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {b.funding_banks.map((bank) => (
                    <span key={bank} className="text-[11px] text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full font-medium">{bank}</span>
                  ))}
                </div>
              )}
              {b.audit_flags_log && (
                <div className="flex items-start gap-1.5 text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5">
                  <ShieldAlert size={12} className="flex-shrink-0 mt-0.5" />
                  {b.audit_flags_log}
                </div>
              )}
            </div>
          )}

          {/* Specialization chips */}
          {specializations.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {specializations.map((s) => (
                <span key={s} className="text-[11px] text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full font-medium">
                  {s} Specialist
                </span>
              ))}
            </div>
          )}

          {/* Certifications */}
          {(b.certifications?.length > 0 || b.iso_certified) && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Certifications</p>
              <div className="flex flex-wrap gap-1.5">
                {b.iso_certified && (
                  <span className="text-[11px] text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full font-medium">ISO Certified</span>
                )}
                {b.certifications?.map((c) => (
                  <span key={c} className="text-[11px] text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full font-medium">{c}</span>
                ))}
              </div>
            </div>
          )}

          {/* CREDAI chip */}
          {b.credai_member && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
              <BadgeCheck size={14} className="text-green-600 flex-shrink-0" />
              <div>
                <p className="text-[12px] font-bold text-green-700">CREDAI Member</p>
                <p className="text-[10px] text-green-600">Confederation of Real Estate Developers&apos; Associations of India</p>
              </div>
            </div>
          )}

          {/* Description / overview */}
          {(b.company_overview || b.description) && (
            <p className="text-[12px] text-gray-600 leading-relaxed">{b.company_overview ?? b.description}</p>
          )}

          {/* Awards list */}
          {b.awards?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Awards</p>
              <div className="space-y-1">
                {b.awards.map((a) => (
                  <div key={a} className="flex items-start gap-2 text-[11px] text-gray-600">
                    <span className="text-amber-500 flex-shrink-0 mt-0.5">★</span>
                    {a}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Website */}
          {b.website && (
            <a
              href={b.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl px-4 py-3 transition-colors group"
            >
              <span className="text-[12px] font-semibold text-blue-700">Visit Builder Website</span>
              <ExternalLink size={13} className="text-blue-400 group-hover:text-blue-600 transition-colors" />
            </a>
          )}

          <button 
            onClick={() => setExpanded(false)} 
            className="w-full flex items-center justify-center gap-1.5 py-2 hover:bg-gray-50 rounded-xl text-[11px] font-semibold text-gray-400 transition-colors mt-2"
          >
            Show Less
            <ChevronUp size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

