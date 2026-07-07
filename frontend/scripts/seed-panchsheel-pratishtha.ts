import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function seed() {
  console.log('🌱 Seeding database from panchsheel-pratishtha.json...')

  try {
    const jsonPath = 'c:/Users/Furqan/Downloads/panchsheel-pratishtha.json'
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`JSON file not found at ${jsonPath}`)
    }

    const rawData = fs.readFileSync(jsonPath, 'utf8')
    const data = JSON.parse(rawData)

    // 1. Builder
    const builderData = {
      name: data.builder.name,
      slug: data.builder.slug,
      tagline: data.builder.tagline,
      founder: data.builder.founder,
      company_overview: data.builder.company_overview,
      logo_url: data.builder.logo_url,
      founded_year: data.builder.founded_year,
      headquarters: data.builder.headquarters,
      website: data.builder.website,
      email: data.builder.email,
      phone: data.builder.phone,
      parent_group: data.builder.parent_group,
      experience_years: data.builder.experience_years,
      projects_delivered_count: data.builder.projects_delivered_count,
      total_projects_count: data.builder.total_projects_count,
      delivered_units: data.builder.delivered_units,
      delayed_projects_count: data.builder.delayed_projects_count,
      average_delay_months: data.builder.average_delay_months,
      delivery_score: data.builder.delivery_score,
      construction_quality_score: data.builder.construction_quality_score,
      after_sales_score: data.builder.after_sales_score,
      buyer_satisfaction_score: data.builder.buyer_satisfaction_score,
      rera_compliance_score: data.builder.rera_compliance_score,
      litigation_count: data.builder.litigation_count,
      awards: data.builder.awards,
      certifications: data.builder.certifications,
      luxury_specialization: data.builder.luxury_specialization,
      township_specialization: data.builder.township_specialization,
    }

    let builder = await prisma.builder.findFirst({
      where: { name: builderData.name }
    })

    if (!builder) {
      builder = await prisma.builder.create({
        data: builderData
      })
      console.log('✓ Created Builder profile')
    } else {
      builder = await prisma.builder.update({
        where: { id: builder.id },
        data: builderData
      })
      console.log('✓ Updated Builder profile')
    }

    // 2. Project
    const projectFields = {
      name: data.project.name,
      slug: data.project.slug,
      builder_id: builder.id,
      city: data.project.city,
      sector: data.project.sector,
      address: data.project.address,
      tagline: data.project.tagline,
      description: data.project.description,
      long_description: data.project.long_description,
      hero_image_url: data.project.hero_image_url,
      status: data.project.status as any,
      rera_number: data.project.rera_number,
      rera_url: data.project.rera_url,
      lat: data.project.lat,
      lng: data.project.lng,
      total_towers: data.project.total_towers,
      total_units: data.project.total_units,
      floors: data.project.floors,
      land_area_acres: data.project.land_area_acres,
      open_space_pct: data.project.open_space_pct,
      green_rating: data.project.green_rating,
      has_duplex: data.project.has_duplex,
      has_penthouse: data.project.has_penthouse,
      project_type: data.project.project_type,
      launch_date: data.project.launch_date ? new Date(data.project.launch_date) : null,
      possession_date: data.project.possession_date ? new Date(data.project.possession_date) : null,
      possession_label: data.project.possession_label,
      price_min_cr: data.project.price_min_cr,
      price_range_label: data.project.price_range_label,
      architect: data.project.architect,
      interior_designer: data.project.interior_designer,
      design_theme: data.project.design_theme,
      marketing_claims: data.project.marketing_claims,
      ai_search_keywords: data.project.ai_search_keywords,
      schools_nearby_count: data.project.schools_nearby_count,
      hospitals_nearby_count: data.project.hospitals_nearby_count,
      shopping_nearby_count: data.project.shopping_nearby_count,
      it_parks_nearby_count: data.project.it_parks_nearby_count,
      banks_nearby_count: data.project.banks_nearby_count,
      restaurants_nearby_count: data.project.restaurants_nearby_count,
      project_risk_flag: data.project.project_risk_flag,
      escrow_verified: data.project.escrow_verified,
      escrow_bank_name: data.project.escrow_bank_name,
      registry_status: data.project.registry_status,
      registry_embargo_reasons: data.project.registry_embargo_reasons,
      nclt_moratorium_active: data.project.nclt_moratorium_active
    }

    let project = await prisma.project.findUnique({
      where: { slug: projectFields.slug }
    })

    if (!project) {
      project = await prisma.project.create({
        data: projectFields
      })
      console.log('✓ Created Project profile')
    } else {
      project = await prisma.project.update({
        where: { id: project.id },
        data: projectFields
      })
      console.log('✓ Updated Project profile')
    }

    // 3. Project DNA
    const dnaData = {
      builder_track_record_score: data.project_dna.builder_track_record_score,
      builder_track_record_label: data.project_dna.builder_track_record_label,
      price_position_score: data.project_dna.price_position_score,
      price_position_label: data.project_dna.price_position_label,
      locality_score: data.project_dna.locality_score,
      locality_label: data.project_dna.locality_label,
      rera_compliance_score: data.project_dna.rera_compliance_score,
      rera_compliance_label: data.project_dna.rera_compliance_label,
      amenity_depth_score: data.project_dna.amenity_depth_score,
      amenity_depth_label: data.project_dna.amenity_depth_label,
      possession_certainty_score: data.project_dna.possession_certainty_score,
      possession_certainty_label: data.project_dna.possession_certainty_label,
      last_verified_at: new Date(),
      verified_by: 'seed'
    }

    await prisma.projectDna.upsert({
      where: { project_id: project.id },
      create: { project_id: project.id, ...dnaData },
      update: dnaData
    })
    console.log('✓ Seeded Project DNA')

    // 4. Decision Profile
    const decisionProfileData = {
      status: data.decision_profile.status as any,
      decision_thesis: data.decision_profile.decision_thesis,
      why_buy: data.decision_profile.why_buy,
      why_avoid: data.decision_profile.why_avoid,
      best_for: data.decision_profile.best_for,
      not_ideal_for: data.decision_profile.not_ideal_for,
      confidence_sources: data.decision_profile.confidence_sources,
      intelligence_data: data.decision_profile.intelligence_data,
      last_verified_at: new Date(),
      verified_by: 'seed'
    }

    await prisma.decisionProfile.upsert({
      where: { project_id: project.id },
      create: { project_id: project.id, ...decisionProfileData },
      update: decisionProfileData
    })
    console.log('✓ Seeded Decision Profile')

    // 5. Persona Profile
    const personaProfileData = {
      primary_persona: data.persona_profile.primary_persona,
      secondary_personas: data.persona_profile.secondary_personas,
      income_range: data.persona_profile.income_range,
      risk_appetite: data.persona_profile.risk_appetite,
      family_stage: data.persona_profile.family_stage,
      work_location: data.persona_profile.work_location,
      timeline_horizon: data.persona_profile.timeline_horizon,
      motivation_note: data.persona_profile.motivation_note,
      last_verified_at: new Date(),
      verified_by: 'seed'
    }

    await prisma.personaProfile.upsert({
      where: { project_id: project.id },
      create: { project_id: project.id, ...personaProfileData },
      update: personaProfileData
    })
    console.log('✓ Seeded Persona Profile')

    // 6. Recommendation Profile
    const recommendationProfileData = {
      status: data.recommendation_profile.status as any,
      tier: data.recommendation_profile.tier,
      primary_thesis: data.recommendation_profile.primary_thesis,
      end_use_thesis: data.recommendation_profile.end_use_thesis,
      investment_thesis: data.recommendation_profile.investment_thesis,
      family_thesis: data.recommendation_profile.family_thesis,
      investor_thesis: data.recommendation_profile.investor_thesis,
      luxury_thesis: data.recommendation_profile.luxury_thesis,
      risk_thesis: data.recommendation_profile.risk_thesis,
      walk_away_conditions: data.recommendation_profile.walk_away_conditions,
      timeline_advice: data.recommendation_profile.timeline_advice,
      negotiation_leverage: data.recommendation_profile.negotiation_leverage,
      last_verified_at: new Date(),
      verified_by: 'seed'
    }

    await prisma.recommendationProfile.upsert({
      where: { project_id: project.id },
      create: { project_id: project.id, ...recommendationProfileData },
      update: recommendationProfileData
    })
    console.log('✓ Seeded Recommendation Profile')

    // 7. Competitor Intelligence
    await prisma.projectCompetitor.deleteMany({
      where: { project_id: project.id }
    })

    if (data.competitors && Array.isArray(data.competitors)) {
      for (const comp of data.competitors) {
        await prisma.projectCompetitor.create({
          data: {
            project_id: project.id,
            competitor_name: comp.competitor_name,
            competitor_slug: comp.competitor_slug,
            this_project_advantage: comp.this_project_advantage,
            competitor_advantage: comp.competitor_advantage,
            verdict: comp.verdict,
            price_delta_note: comp.price_delta_note,
            sort_order: comp.sort_order || 0,
            last_verified_at: new Date(),
            verified_by: 'seed'
          }
        })
      }
      console.log('✓ Seeded Competitor Intelligence')
    }

    // 8. Cost Sheet
    const costSheetData = {
      project_id: project.id,
      base_price_per_sqft: data.cost_sheet.base_price_per_sqft,
      floor_rise_per_floor: data.cost_sheet.floor_rise_per_floor,
      plc_charges: data.cost_sheet.plc_charges,
      parking_cost: data.cost_sheet.parking_cost,
      ifms: data.cost_sheet.ifms,
      club_membership: data.cost_sheet.club_membership,
      other_charges: data.cost_sheet.other_charges,
      gst_rate_pct: data.cost_sheet.gst_rate_pct,
      stamp_duty_pct: data.cost_sheet.stamp_duty_pct,
      registration_pct: data.cost_sheet.registration_pct,
      assumptions: data.cost_sheet.assumptions,
      verified_at: new Date(),
      verified_by: 'seed'
    }

    await prisma.costSheet.upsert({
      where: { project_id: project.id },
      create: costSheetData,
      update: costSheetData
    })
    console.log('✓ Seeded Cost Sheet')

    // 9. Payment Plan
    const paymentPlanData = {
      project_id: project.id,
      plan_name: data.payment_plan.plan_name,
      milestones: data.payment_plan.milestones,
      source: data.payment_plan.source,
      notes: data.payment_plan.notes,
      verified_at: new Date(),
      verified_by: 'seed'
    }

    await prisma.paymentPlan.upsert({
      where: { project_id: project.id },
      create: paymentPlanData,
      update: paymentPlanData
    })
    console.log('✓ Seeded Payment Plan')

    // 10. Connectivity (Nearby Establishments)
    await prisma.connectivity.deleteMany({
      where: { project_id: project.id }
    })

    if (data.connectivity && Array.isArray(data.connectivity)) {
      for (const conn of data.connectivity) {
        await prisma.connectivity.create({
          data: {
            project_id: project.id,
            type: conn.type as any,
            name: conn.name,
            distance_km: conn.distance_km,
            notes: conn.notes,
            data_source: conn.data_source as any
          }
        })
      }
      console.log('✓ Seeded Connectivity')
    }

    // 11. Unit Types
    await prisma.unitType.deleteMany({
      where: { project_id: project.id }
    })

    if (data.unit_types && Array.isArray(data.unit_types)) {
      for (const ut of data.unit_types) {
        await prisma.unitType.create({
          data: {
            project_id: project.id,
            name: ut.name,
            bhk: ut.bhk,
            super_area_sqft: ut.super_area_sqft,
            carpet_area_sqft: ut.carpet_area_sqft,
            balcony_area_sqft: ut.balcony_area_sqft,
            bathrooms: ut.bathrooms,
            utility_room: ut.utility_room || false,
            dress_area: ut.dress_area || false,
            towers: ut.towers || [],
            price_min_cr: ut.price_min_cr,
            price_max_cr: ut.price_max_cr,
            price_label: ut.price_label,
            price_is_estimated: ut.price_is_estimated ?? true,
            subtitle: ut.subtitle,
            description: ut.description,
            category_badge: ut.category_badge,
            inventory_left: ut.inventory_left,
            perfect_for: ut.perfect_for || [],
            key_highlights: ut.key_highlights,
            whats_included: ut.whats_included,
            views: ut.views
          }
        })
      }
      console.log('✓ Seeded Unit Types')
    }

    // 12. Amenities
    await prisma.amenity.deleteMany({
      where: { project_id: project.id }
    })

    if (data.amenities && Array.isArray(data.amenities)) {
      for (const am of data.amenities) {
        await prisma.amenity.create({
          data: {
            project_id: project.id,
            name: am.name,
            category: am.category as any
          }
        })
      }
      console.log('✓ Seeded Amenities')
    }

    // 13. Documents
    await prisma.projectDocument.deleteMany({
      where: { project_id: project.id }
    })

    if (data.documents && Array.isArray(data.documents)) {
      for (const doc of data.documents) {
        await prisma.projectDocument.create({
          data: {
            project_id: project.id,
            project_slug: project.slug,
            name: doc.name,
            storage_url: doc.storage_url,
            doc_type: doc.doc_type,
            file_size_bytes: doc.file_size_bytes
          }
        })
      }
      console.log('✓ Seeded Project Documents')
    }

    // 14. Images
    await prisma.projectImage.deleteMany({
      where: { project_id: project.id }
    })

    if (data.images && Array.isArray(data.images)) {
      for (const img of data.images) {
        await prisma.projectImage.create({
          data: {
            project_id: project.id,
            url: img.url,
            type: img.type as any,
            caption: img.caption,
            sort_order: img.sort_order || 0
          }
        })
      }
      console.log('✓ Seeded Project Images')
    }

    console.log('✅ Seeding of Panchsheel Pratishtha finished successfully with zero gaps!')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seed()
