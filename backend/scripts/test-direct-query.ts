import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function main() {
  const project = await prisma.project.findUnique({
    where: { slug: 'ivy-county-sector-75-noida' },
    include: {
      builder: true,
      unit_types: true,
      images: { orderBy: { sort_order: 'asc' } },
      amenities: true,
      connectivity: { orderBy: { distance_km: 'asc' } },
      dna: {
        select: {
          builder_track_record_label: true,
          price_position_label:       true,
          locality_label:             true,
          rera_compliance_label:      true,
          amenity_depth_label:        true,
          possession_certainty_label: true,
          last_verified_at:           true,
          builder_track_record_score: true,
          price_position_score:       true,
          locality_score:             true,
          rera_compliance_score:      true,
          amenity_depth_score:        true,
          possession_certainty_score: true,
        },
      },
      decision_profile: {
        select: {
          status:             true,
          decision_thesis:    true,
          why_buy:            true,
          why_avoid:          true,
          best_for:           true,
          not_ideal_for:      true,
          confidence_sources: true,
          intelligence_data:   true,
          last_verified_at:   true,
        },
      },
      persona_profile: true,
      recommendation_profile: {
        select: {
          status:               true,
          tier:                 true,
          primary_thesis:       true,
          end_use_thesis:       true,
          investment_thesis:    true,
          family_thesis:        true,
          investor_thesis:      true,
          luxury_thesis:        true,
          risk_thesis:          true,
          walk_away_conditions: true,
          timeline_advice:      true,
          negotiation_leverage: true,
          last_verified_at:     true,
        },
      },
      competitors: {
        select: {
          id:                     true,
          competitor_name:        true,
          competitor_slug:        true,
          this_project_advantage: true,
          competitor_advantage:   true,
          verdict:                true,
          price_delta_note:       true,
          sort_order:             true,
        },
        orderBy: { sort_order: 'asc' },
      },
    },
  });

  console.log('Direct query builder:', project?.builder);
}

main().finally(() => prisma.$disconnect());
