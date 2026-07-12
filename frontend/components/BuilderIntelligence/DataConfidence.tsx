'use client'

import type { Confidence } from '@/lib/builderIntelligence'

interface Props {
  confidence: Confidence
  builderName?: string | null
  intelligenceCompleteness?: number | null
  verificationLevel?: string | null
  lastVerifiedAt?: string | null
}

const CONFIDENCE_CONFIG: Record<Confidence, {
  dotClass: string
  label: string
  description: string
  cardClass: string
}> = {
  HIGH: {
    dotClass: 'bg-green-400',
    label: 'Verified profile data',
    description: 'Delivery history and founding year confirmed.',
    cardClass: 'bg-white border-gray-100',
  },
  MEDIUM: {
    dotClass: 'bg-blue-400',
    label: 'Partial profile data',
    description: 'Some fields confirmed; check UP-RERA for full history.',
    cardClass: 'bg-white border-gray-100',
  },
  LOW: {
    dotClass: 'bg-amber-400',
    label: 'Limited profile data',
    description: 'Builder record exists but delivery history is unverified.',
    cardClass: 'bg-amber-50 border-amber-100',
  },
  NONE: {
    dotClass: 'bg-gray-300',
    label: 'No profile data',
    description: 'No builder record found. Verify independently before deciding.',
    cardClass: 'bg-gray-50 border-gray-200',
  },
}

export default function DataConfidence({ confidence, intelligenceCompleteness, verificationLevel, lastVerifiedAt }: Props) {
  const cfg = CONFIDENCE_CONFIG[confidence]

  return (
    <div className={`rounded-[20px] border p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] ${cfg.cardClass}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dotClass} shadow-[0_0_8px_rgba(0,0,0,0.1)]`} />
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          Data Confidence
        </span>
        <span className={`ml-auto text-[10px] font-bold uppercase tracking-wider ${
          confidence === 'HIGH' ? 'text-green-600' :
          confidence === 'MEDIUM' ? 'text-blue-600' :
          confidence === 'LOW' ? 'text-amber-600' : 'text-gray-400'
        }`}>
          {confidence}
        </span>
      </div>
      <p className="text-[11.5px] text-gray-500 leading-relaxed">{cfg.description}</p>

      {/* DB-backed completeness */}
      {intelligenceCompleteness !== null && intelligenceCompleteness !== undefined && (
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium">
            <span>Profile completeness</span>
            <span className="font-bold">{intelligenceCompleteness}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${intelligenceCompleteness >= 70 ? 'bg-emerald-400' : intelligenceCompleteness >= 40 ? 'bg-amber-400' : 'bg-gray-300'}`}
              style={{ width: `${intelligenceCompleteness}%` }}
            />
          </div>
        </div>
      )}

      {verificationLevel && verificationLevel !== 'unverified' && (
        <p className="mt-3 text-[10.5px] text-gray-400 font-medium">
          Verification: <span className="font-semibold capitalize text-gray-600">{verificationLevel}</span>
          {lastVerifiedAt && ` · ${new Date(lastVerifiedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`}
        </p>
      )}

      <a
        href="https://www.up-rera.in/Promoters"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 mt-3 text-[11.5px] font-semibold text-blue-600 hover:text-blue-700 underline decoration-blue-200 underline-offset-2 transition-colors"
      >
        Verify on UP-RERA &rarr;
      </a>
    </div>
  )
}

