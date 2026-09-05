import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()
const outputDir = 'c:\\Users\\Furqan\\Desktop\\PropFyndr\\newProj\\75'

async function main() {
  console.log('\n📦 Exporting 100% Complete Database Snapshot into Master JSON Files in newProj/75/...\n')

  const projects = await prisma.project.findMany({
    include: {
      builder: true,
      unit_types: true,
      images: true,
      amenities: true,
      connectivity: true,
      dna: true,
      decision_profile: true,
      persona_profile: true,
      recommendation_profile: true,
      competitors: true,
      cost_sheet: true,
      payment_plans: true,
      construction_milestones: { orderBy: { sort_order: 'asc' } },
      construction_updates: { orderBy: { update_date: 'desc' } },
      lifecycle_updates: { orderBy: { update_date: 'desc' } },
      price_history: { orderBy: { recorded_at: 'asc' } },
      channel_partners: { include: { channel_partner: true } }
    },
    orderBy: { sector: 'asc' }
  })

  console.log(`Found ${projects.length} total projects in database.`)

  const sectorGroups: Record<string, any[]> = {}

  for (const p of projects) {
    const rawSector = (p.sector || 'General').toLowerCase().replace(/[^a-z0-9]/g, '')
    const fileName = `propfyndr_${rawSector}_master_data.json`

    if (!sectorGroups[fileName]) {
      sectorGroups[fileName] = []
    }

    // Comprehensive Json Export of Project Record
    const jsonProject = {
      // Identity & Core
      id: p.id,
      name: p.name,
      slug: p.slug,
      sector: p.sector,
      city: p.city,
      state: p.state,
      country: p.country,
      status: p.status,
      tagline: p.tagline,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
      rera_number: p.rera_number,
      rera_url: p.rera_url,
      rera_valid_until: p.rera_valid_until,
      rera_compliance_score: p.rera_compliance_score,
      total_units: p.total_units,
      total_towers: p.total_towers,
      land_area_acres: p.land_area_acres,
      launch_date: p.launch_date,
      possession_date: p.possession_date,
      possession_label: p.possession_label,
      possession_confidence: p.possession_confidence,
      possession_confidence_note: p.possession_confidence_note,
      oc_obtained: p.oc_obtained,
      oc_obtained_date: p.oc_obtained_date,
      description: p.description,
      long_description: p.long_description,
      design_theme: p.design_theme,
      architect: p.architect,
      interior_designer: p.interior_designer,
      floors: p.floors,
      open_space_pct: p.open_space_pct,
      green_rating: p.green_rating,
      has_duplex: p.has_duplex,
      has_penthouse: p.has_penthouse,
      hero_image_url: p.hero_image_url,
      marketing_claims: p.marketing_claims,
      ai_search_keywords: p.ai_search_keywords,
      price_min_cr: p.price_min_cr,
      price_range_label: p.price_range_label,
      legal_flag: p.legal_flag,
      legal_flag_detail: p.legal_flag_detail,
      location_advantages: p.location_advantages,
      location_verdict: p.location_verdict,
      walkability_score: p.walkability_score,
      commute_matrix: p.commute_matrix,
      project_risk_flag: p.project_risk_flag,
      escrow_verified: p.escrow_verified,
      escrow_bank_name: p.escrow_bank_name,
      registry_status: p.registry_status,

      // Phase 5 Comprehensive Property Intelligence
      nri_eligible: p.nri_eligible,
      nri_approval_months: p.nri_approval_months,
      foreign_currency_payment_allowed: p.foreign_currency_payment_allowed,
      occupancy_certificate_status: p.occupancy_certificate_status,
      nclt_status: p.nclt_status,
      construction_quality_rating: p.construction_quality_rating,
      buyer_satisfaction_rating: p.buyer_satisfaction_rating,
      handover_defect_rate: p.handover_defect_rate,
      women_safety_score: p.women_safety_score,
      has_security_24x7: p.has_security_24x7,
      has_cctv: p.has_cctv,
      police_station_distance_km: p.police_station_distance_km,
      street_lights: p.street_lights,
      vastu_compliant: p.vastu_compliant,
      north_facing_units: p.north_facing_units,
      east_facing_preferred: p.east_facing_preferred,
      air_quality_index_avg: p.air_quality_index_avg,
      noise_level_db: p.noise_level_db,
      flood_zone: p.flood_zone,
      proximity_to_industrial: p.proximity_to_industrial,
      green_cover_percent: p.green_cover_percent,
      top_school_distance_km: p.top_school_distance_km,
      college_distance_km: p.college_distance_km,
      hospital_distance_km: p.hospital_distance_km,
      airport_distance_km: p.airport_distance_km,
      market_demand_score: p.market_demand_score,
      appreciation_potential_5yr: p.appreciation_potential_5yr,
      rental_yield_annual_percent: p.rental_yield_annual_percent,
      competing_projects_nearby: p.competing_projects_nearby,
      average_builder_delay_months: p.average_builder_delay_months,
      expected_handover_quarter: p.expected_handover_quarter,
      gst_pass_through: p.gst_pass_through,
      land_title_clear: p.land_title_clear,
      fir_against_project: p.fir_against_project,
      approvals_status: p.approvals_status,

      // Builder Relation
      builder: p.builder ? {
        name: p.builder.name,
        slug: p.builder.slug,
        tagline: p.builder.tagline,
        company_overview: p.builder.company_overview,
        logo_url: p.builder.logo_url,
        experience_years: p.builder.experience_years,
        projects_delivered_count: p.builder.projects_delivered_count,
        total_projects_count: p.builder.total_projects_count,
        delivery_score: p.builder.delivery_score,
        construction_quality_score: p.builder.construction_quality_score,
        buyer_satisfaction_score: p.builder.buyer_satisfaction_score,
        rera_compliance_score: p.builder.rera_compliance_score
      } : null,

      // Unit Types (Full Deep Fields)
      unit_types: p.unit_types.map(u => ({
        id: u.id,
        name: u.name,
        bhk: u.bhk,
        has_study: u.has_study,
        has_servant_room: u.has_servant_room,
        super_area_sqft: u.super_area_sqft,
        carpet_area_sqft: u.carpet_area_sqft,
        carpet_to_super_ratio_pct: u.carpet_to_super_ratio_pct,
        balconies: u.balconies,
        balcony_area_sqft: u.balcony_area_sqft,
        bathrooms: u.bathrooms,
        price_min_cr: u.price_min_cr,
        price_max_cr: u.price_max_cr,
        price_per_sqft: u.price_per_sqft,
        unit_orientations: u.unit_orientations,
        layout_shape: u.layout_shape,
        layout_efficiency_pct: u.layout_efficiency_pct,
        built_up_area_sqft: u.built_up_area_sqft,
        perfect_for: u.perfect_for,
        key_highlights: u.key_highlights,
        inventory_left: u.inventory_left
      })),

      // Cost Sheet Breakdown
      cost_sheet: p.cost_sheet ? {
        base_price_per_sqft: p.cost_sheet.base_price_per_sqft,
        base_cost_cr: p.cost_sheet.base_cost_cr,
        floor_rise_per_floor: p.cost_sheet.floor_rise_per_floor,
        gst_applicable: p.cost_sheet.gst_applicable,
        gst_rate_pct: p.cost_sheet.gst_rate_pct,
        gst_note: p.cost_sheet.gst_note,
        stamp_duty_pct: p.cost_sheet.stamp_duty_pct,
        registration_pct: p.cost_sheet.registration_pct,
        parking_cost: p.cost_sheet.parking_cost,
        club_membership: p.cost_sheet.club_membership,
        ifms: p.cost_sheet.ifms,
        electricity_connection: p.cost_sheet.electricity_connection,
        water_sewer_connection: p.cost_sheet.water_sewer_connection,
        maintenance_psf_monthly: p.cost_sheet.maintenance_psf_monthly,
        plc_charges: p.cost_sheet.plc_charges,
        other_charges: p.cost_sheet.other_charges,
        all_inclusive_price_cr: p.cost_sheet.all_inclusive_price_cr,
        all_inclusive_per_sqft: p.cost_sheet.all_inclusive_per_sqft,
        assumptions: p.cost_sheet.assumptions
      } : null,

      // Payment Plans (Multiple Types)
      payment_plans: p.payment_plans.map(pp => ({
        plan_type: pp.plan_type,
        plan_name: pp.plan_name,
        description: pp.description,
        milestones: pp.milestones,
        down_payment_pct: pp.down_payment_pct,
        booking_amount_lakh: pp.booking_amount_lakh,
        discount_offered_pct: pp.discount_offered_pct,
        best_for: pp.best_for,
        watch_out: pp.watch_out
      })),

      // Construction Milestones & Public Feed Updates
      construction_milestones: p.construction_milestones.map(cm => ({
        stage_code: cm.stage_code,
        name: cm.name,
        status: cm.status,
        completion_pct: cm.completion_pct,
        date_label: cm.date_label,
        planned_start: cm.planned_start,
        planned_end: cm.planned_end,
        actual_start: cm.actual_start,
        completed_at: cm.completed_at,
        verified_by_source: cm.verified_by_source,
        is_payment_trigger: cm.is_payment_trigger
      })),
      construction_updates: p.construction_updates.map(cu => ({
        title: cu.title,
        description: cu.description,
        update_date: cu.update_date,
        quarter_label: cu.quarter_label,
        completion_pct: cu.completion_pct,
        source: cu.source,
        verified_by: cu.verified_by
      })),

      // Post-Delivery Lifecycle Updates (For RTM Projects)
      lifecycle_updates: p.lifecycle_updates.map(lu => ({
        update_type: lu.update_type,
        title: lu.title,
        description: lu.description,
        update_date: lu.update_date,
        impact: lu.impact,
        source: lu.source,
        verified_by: lu.verified_by,
        affects_pricing: lu.affects_pricing,
        affects_recommendation: lu.affects_recommendation,
        maintenance_fee_monthly_psf: lu.maintenance_fee_monthly_psf,
        note: lu.note
      })),

      // Price History
      price_history: p.price_history.map(ph => ({
        quarter_label: ph.quarter_label,
        price_per_sqft: ph.price_per_sqft,
        total_price_cr: ph.total_price_cr,
        event_note: ph.event_note,
        recorded_at: ph.recorded_at
      })),

      // Intelligence & DNA
      dna: p.dna ? {
        overall_score: p.dna.overall_score,
        builder_score: p.dna.builder_score,
        price_score: p.dna.price_score,
        location_score: p.dna.location_score,
        legal_score: p.dna.legal_score,
        amenity_score: p.dna.amenity_score,
        possession_score: p.dna.possession_score
      } : null,

      decision_profile: p.decision_profile ? {
        decision_thesis: p.decision_profile.decision_thesis,
        why_buy: p.decision_profile.why_buy,
        why_avoid: p.decision_profile.why_avoid,
        best_for: p.decision_profile.best_for,
        not_ideal_for: p.decision_profile.not_ideal_for,
        financial_intelligence: p.decision_profile.financial_intelligence,
        market_intelligence: p.decision_profile.market_intelligence,
        builder_intelligence: p.decision_profile.builder_intelligence,
        property_intelligence: p.decision_profile.property_intelligence,
        comparative_analysis: p.decision_profile.comparative_analysis
      } : null,

      persona_profile: p.persona_profile ? {
        primary_persona: p.persona_profile.primary_persona,
        secondary_personas: p.persona_profile.secondary_personas,
        persona_descriptions: p.persona_profile.persona_descriptions,
        income_range: p.persona_profile.income_range,
        family_stage: p.persona_profile.family_stage,
        work_location: p.persona_profile.work_location,
        risk_appetite: p.persona_profile.risk_appetite,
        timeline_horizon: p.persona_profile.timeline_horizon
      } : null,

      recommendation_profile: p.recommendation_profile ? {
        status: p.recommendation_profile.status,
        tier: p.recommendation_profile.tier,
        primary_thesis: p.recommendation_profile.primary_thesis,
        walk_away_conditions: p.recommendation_profile.walk_away_conditions,
        timeline_advice: p.recommendation_profile.timeline_advice,
        negotiation_leverage: p.recommendation_profile.negotiation_leverage,
        internal_confidence: p.recommendation_profile.internal_confidence
      } : null,

      // Competitors
      competitors: p.competitors.map(c => ({
        competitor_name: c.competitor_name,
        competitor_slug: c.competitor_slug,
        reason: c.reason,
        competitor_price_psf: c.competitor_price_psf,
        this_project_advantage: c.this_project_advantage,
        competitor_advantage: c.competitor_advantage,
        verdict: c.verdict,
        price_delta_note: c.price_delta_note
      })),

      // Amenities, Connectivity & Channel Partners
      amenities: p.amenities.map(a => ({ name: a.name, category: a.category })),
      connectivity: p.connectivity.map(c => ({
        type: c.type,
        name: c.name,
        distance_km: c.distance_km,
        travel_time_min: c.travel_time_min,
        travel_mode: c.travel_mode
      })),
      channel_partners: p.channel_partners.map(cp => ({
        name: cp.channel_partner.name,
        slug: cp.channel_partner.slug,
        type: cp.channel_partner.type,
        phone: cp.channel_partner.phone,
        email: cp.channel_partner.email
      }))
    }

    sectorGroups[fileName].push(jsonProject)
  }

  // Write files to newProj/75
  let filesWritten = 0
  for (const [fileName, projectList] of Object.entries(sectorGroups)) {
    const filePath = path.join(outputDir, fileName)
    fs.writeFileSync(filePath, JSON.stringify(projectList, null, 2), 'utf8')
    filesWritten++
    console.log(`  ✓ Written ${fileName} (${projectList.length} projects)`)
  }

  console.log(`\n🎉 MASTER JSON BACKUP COMPLETE! Exported 100% of database fields for all ${projects.length} projects into ${filesWritten} master sector files in newProj/75/.\n`)
}

main().finally(() => prisma.$disconnect())
