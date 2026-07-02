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
    <div className={`rounded-xl border p-3 ${cfg.cardClass}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dotClass}`} />
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
          Data Confidence
        </span>
        <span className={`ml-auto text-[11px] font-semibold ${
          confidence === 'HIGH' ? 'text-green-600' :
          confidence === 'MEDIUM' ? 'text-blue-600' :
          confidence === 'LOW' ? 'text-amber-600' : 'text-gray-400'
        }`}>
          {confidence}
        </span>
      </div>
      <p className="text-[11px] text-gray-500 leading-relaxed">{cfg.description}</p>

      {/* DB-backed completeness */}
      {intelligenceCompleteness !== null && intelligenceCompleteness !== undefined && (
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <span>Profile completeness</span>
            <span className="font-semibold">{intelligenceCompleteness}%</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${intelligenceCompleteness >= 70 ? 'bg-green-400' : intelligenceCompleteness >= 40 ? 'bg-amber-400' : 'bg-gray-300'}`}
              style={{ width: `${intelligenceCompleteness}%` }}
            />
          </div>
        </div>
      )}

      {verificationLevel && verificationLevel !== 'unverified' && (
        <p className="mt-1.5 text-[10px] text-gray-400">
          Verification: <span className="font-medium capitalize">{verificationLevel}</span>
          {lastVerifiedAt && ` · ${new Date(lastVerifiedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`}
        </p>
      )}

      <a
        href="https://www.up-rera.in/Promoters"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-blue-500 hover:text-blue-700 transition-colors"
      >
        Verify on UP-RERA →
      </a>
    </div>
  )
}
