'use client'

import type { BuilderDetail } from '@/types/project'
import { computeBuilderIntelligence } from '@/lib/builderIntelligence'
import VerdictBadge from './VerdictBadge'
import BuilderDNA from './BuilderDNA'
import DeliveryRecord from './DeliveryRecord'
import DataConfidence from './DataConfidence'

interface Props {
  builderDetail: BuilderDetail | null
  reraNumber?: string | null
}

export default function BuilderIntelligence({ builderDetail, reraNumber }: Props) {
  const intel = computeBuilderIntelligence(builderDetail)
  const b = builderDetail

  return (
    <div className="p-5 space-y-4">
      <VerdictBadge
        verdict={intel.verdict}
        builderName={b?.name ?? 'Unknown Builder'}
        yearsInBusiness={intel.yearsInBusiness}
        credaiMember={b?.credai_member ?? false}
      />
      <BuilderDNA
        builder={b}
        reraNumber={reraNumber}
      />
      <DeliveryRecord
        deliveredProjects={b?.delivered_projects ?? []}
        ongoingProjects={b?.ongoing_projects ?? []}
        deliveredUnits={b?.delivered_units ?? null}
        pipelineRatio={intel.pipelineRatio}
      />
      <DataConfidence
        confidence={intel.confidence}
        builderName={b?.name}
        intelligenceCompleteness={b?.intelligence_completeness ?? null}
        verificationLevel={b?.verification_level ?? null}
        lastVerifiedAt={b?.last_verified_at ?? null}
      />
    </div>
  )
}
