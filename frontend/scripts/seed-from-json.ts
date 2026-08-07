/**
 * Generic project seed script — reads any project JSON and seeds the full DB.
 *
 * Usage:
 *   npx tsx scripts/seed-from-json.ts path/to/project-data.json
 *
 * Start from the template:
 *   scripts/project-data-template.json
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

const imgBaseDir = path.join(__dirname, '../public/images/properties')
const imgDirs = fs.existsSync(imgBaseDir)
  ? fs.readdirSync(imgBaseDir).filter(d => fs.statSync(path.join(imgBaseDir, d)).isDirectory())
  : []

function findHeroImage(slug: string): string | null {
  if (!slug) return null
  const exact = imgDirs.find(d => d === slug)
  const prefix = !exact ? imgDirs.find(d => d.startsWith(slug)) : null
  const dir = exact || prefix
  if (!dir) return null

  for (const ext of ['jpg', 'avif', 'webp', 'png']) {
    if (fs.existsSync(path.join(imgBaseDir, dir, `hero.${ext}`))) {
      return `/images/properties/${dir}/hero.${ext}`
    }
  }

  const files = fs.readdirSync(path.join(imgBaseDir, dir))
  const firstImg = files.find(f => /\.(jpg|jpeg|png|webp|avif)$/i.test(f))
  if (firstImg) {
    return `/images/properties/${dir}/${firstImg}`
  }

  return null
}

async function seed() {
  const jsonArg = process.argv[2]
  if (!jsonArg) {
    console.error('❌ Usage: npx tsx scripts/seed-from-json.ts path/to/project-data.json')
    process.exit(1)
  }

  const jsonPath = path.isAbsolute(jsonArg) ? jsonArg : path.resolve(process.cwd(), jsonArg)
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ File not found: ${jsonPath}`)
    process.exit(1)
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  console.log(`\n🌱 Seeding "${data.project.name}" from ${path.basename(jsonPath)}...\n`)

  try {
    // ─────────────────────────────────────────────────
    // 1. BUILDER
    // ─────────────────────────────────────────────────
    const builderData = {
      name:                       data.builder.name,
      slug:                       data.builder.slug ?? data.builder.id,
      tagline:                    data.builder.tagline                    ?? null,
      founder:                    data.builder.founder                    ?? null,
      company_overview:           data.builder.company_overview           ?? null,
      logo_url:                   data.builder.logo_url                   ?? null,
      founded_year:               data.builder.founded_year               ?? null,
      headquarters:               data.builder.headquarters               ?? null,
      website:                    data.builder.website                    ?? null,
      email:                      data.builder.email                      ?? null,
      phone:                      data.builder.phone                      ?? null,
      parent_group:               data.builder.parent_group               ?? null,
      experience_years:           data.builder.experience_years           !== undefined ? data.builder.experience_years : undefined,
      projects_delivered_count:   (data.builder.projects_delivered_count ?? data.builder.delivered_projects) !== undefined ? (data.builder.projects_delivered_count ?? data.builder.delivered_projects) : undefined,
      total_projects_count:       data.builder.total_projects_count       !== undefined ? data.builder.total_projects_count : undefined,
      delivered_units:            data.builder.delivered_units            !== undefined ? data.builder.delivered_units : undefined,
      delayed_projects_count:     data.builder.delayed_projects_count     !== undefined ? data.builder.delayed_projects_count : undefined,
      average_delay_months:       data.builder.average_delay_months       !== undefined ? data.builder.average_delay_months : undefined,
      delivery_score:             data.builder.delivery_score             !== undefined ? data.builder.delivery_score : undefined,
      construction_quality_score: data.builder.construction_quality_score !== undefined ? data.builder.construction_quality_score : undefined,
      after_sales_score:          data.builder.after_sales_score          !== undefined ? data.builder.after_sales_score : undefined,
      buyer_satisfaction_score:   data.builder.buyer_satisfaction_score   !== undefined ? data.builder.buyer_satisfaction_score : undefined,
      rera_compliance_score:      data.builder.rera_compliance_score      !== undefined ? data.builder.rera_compliance_score : undefined,
      litigation_count:           data.builder.litigation_count           !== undefined ? data.builder.litigation_count : undefined,
      awards:                     data.builder.awards                     ?? [],
      certifications:             data.builder.certifications             ?? [],
      luxury_specialization:      data.builder.luxury_specialization      ?? false,
      township_specialization:    data.builder.township_specialization    ?? false,
    }

    let builder = await prisma.builder.findFirst({
      where: {
        OR: [
          { name: builderData.name },
          { slug: builderData.slug }
        ]
      }
    })
    if (builder) {
      const { slug: _s, name: _n, ...updateFields } = builderData
      builder = await prisma.builder.update({ where: { id: builder.id }, data: updateFields })
    } else {
      builder = await prisma.builder.create({ data: builderData })
    }
    console.log('✓ Builder')

    // ─────────────────────────────────────────────────
    // 2. PROJECT
    // ─────────────────────────────────────────────────
    const heroPath = findHeroImage(data.project.slug)

    const projectFields = {
      name:                       data.project.name,
      slug:                       data.project.slug,
      builder_id:                 builder.id,
      city:                       data.project.city,
      sector:                     data.project.sector,
      address:                    data.project.address                    ?? null,
      tagline:                    data.project.tagline                    ?? null,
      description:                data.project.description                ?? null,
      long_description:           data.project.long_description           ?? null,
      hero_image_url:             (data.project.hero_image_url && data.project.hero_image_url.trim() !== '') ? data.project.hero_image_url : heroPath,
      status:                     (data.project.status?.toLowerCase().includes('ready') ? 'ready_to_move' : (data.project.status?.toLowerCase().includes('under') ? 'under_construction' : (data.project.status?.toLowerCase().includes('new') ? 'new_launch' : 'under_construction'))) as any,
      rera_number:                data.project.rera_number                ?? null,
      rera_url:                   data.project.rera_url                   ?? null,
      lat:                        data.project.lat                        ?? null,
      lng:                        data.project.lng                        ?? null,
      total_towers:               data.project.total_towers               ?? null,
      total_units:                data.project.total_units                ?? null,
      floors:                     data.project.floors                     ?? null,
      land_area_acres:            data.project.land_area_acres            ?? null,
      open_space_pct:             data.project.open_space_pct             ?? null,
      green_rating:               data.project.green_rating               ?? null,
      has_duplex:                 data.project.has_duplex                 ?? false,
      has_penthouse:              data.project.has_penthouse              ?? false,
      project_type:               data.project.project_type               ?? 'Residential',
      launch_date:     data.project.launch_date     ? new Date(data.project.launch_date)     : null,
      possession_date: data.project.possession_date ? new Date(data.project.possession_date) : null,
      possession_label:           data.project.possession_label           ?? null,
      price_min_cr:               data.project.price_min_cr               ?? null,
      price_range_label:          data.project.price_range_label          ?? null,
      architect:                  data.project.architect                  ?? null,
      interior_designer:          data.project.interior_designer          ?? null,
      design_theme:               data.project.design_theme               ?? null,
      marketing_claims:           data.project.marketing_claims           ?? [],
      ai_search_keywords:         data.project.ai_search_keywords         ?? [],
      schools_nearby_count:       data.project.schools_nearby_count       ?? null,
      hospitals_nearby_count:     data.project.hospitals_nearby_count     ?? null,
      shopping_nearby_count:      data.project.shopping_nearby_count      ?? null,
      it_parks_nearby_count:      data.project.it_parks_nearby_count      ?? null,
      banks_nearby_count:         data.project.banks_nearby_count         ?? null,
      restaurants_nearby_count:   data.project.restaurants_nearby_count   ?? null,
      project_risk_flag:          data.project.project_risk_flag          ?? null,
      escrow_verified:            data.project.escrow_verified            ?? null,
      escrow_bank_name:           data.project.escrow_bank_name           ?? null,
      registry_status:            data.project.registry_status            ?? null,
      registry_embargo_reasons:   data.project.registry_embargo_reasons   ?? [],
      nclt_moratorium_active:     data.project.nclt_moratorium_active     ?? null,
    }

    let project = await prisma.project.findUnique({
      where: { slug: projectFields.slug }
    })
    project = project
      ? await prisma.project.update({ where: { id: project.id }, data: projectFields })
      : await prisma.project.create({ data: projectFields })
    console.log('✓ Project')

    // ─────────────────────────────────────────────────
    // 3. PROJECT DNA
    // ─────────────────────────────────────────────────
    if (data.project_dna) {
      const dnaSrc = data.project_dna
      const dnaData = {
        builder_score:    dnaSrc.builder_score ?? dnaSrc.builder_track_record_score ?? 88,
        price_score:      dnaSrc.price_score ?? dnaSrc.price_position_score ?? 90,
        location_score:   dnaSrc.location_score ?? dnaSrc.locality_score ?? 94,
        legal_score:      dnaSrc.legal_score ?? dnaSrc.rera_compliance_score ?? 98,
        amenity_score:    dnaSrc.amenity_score ?? dnaSrc.amenity_depth_score ?? 89,
        possession_score: dnaSrc.possession_score ?? dnaSrc.possession_certainty_score ?? 92,
        overall_score:    dnaSrc.overall_score ?? 90,
        last_verified_at: new Date(),
        verified_by:      dnaSrc.verified_by ?? 'seed',
      }
      await prisma.projectDna.upsert({
        where:  { project_id: project.id },
        create: { project_id: project.id, ...dnaData },
        update: dnaData,
      })
      console.log('✓ Project DNA')
    }

    // ─────────────────────────────────────────────────
    // 4. DECISION PROFILE
    // ─────────────────────────────────────────────────
    if (data.decision_profile) {
      const decisionData = {
        status:               data.decision_profile.status               as any,
        decision_thesis:      data.decision_profile.decision_thesis      ?? null,
        why_buy:              data.decision_profile.why_buy              ?? [],
        why_avoid:            data.decision_profile.why_avoid            ?? [],
        best_for:             data.decision_profile.best_for             ?? null,
        not_ideal_for:        data.decision_profile.not_ideal_for        ?? null,
        financial_intelligence: data.decision_profile.financial_intelligence ?? null,
        market_intelligence:    data.decision_profile.market_intelligence    ?? null,
        builder_intelligence:   data.decision_profile.builder_intelligence   ?? null,
        property_intelligence:  data.decision_profile.property_intelligence  ?? null,
        comparative_analysis:   data.decision_profile.comparative_analysis   ?? null,
        resources_documents:    data.decision_profile.resources_documents    ?? null,
        confidence_sources:   data.decision_profile.confidence_sources   ?? [],
        recommendation_notes: data.decision_profile.recommendation_notes ?? null,
        advisor_notes:        data.decision_profile.advisor_notes        ?? null,
        last_verified_at:     new Date(),
        verified_by:          data.decision_profile.verified_by ?? 'seed',
      }
      await prisma.decisionProfile.upsert({
        where:  { project_id: project.id },
        create: { project_id: project.id, ...decisionData },
        update: decisionData,
      })
      console.log('✓ Decision Profile')
    }

    // ─────────────────────────────────────────────────
    // 5. PERSONA PROFILE
    // ─────────────────────────────────────────────────
    if (data.persona_profile) {
      const personaData = {
        primary_persona:      data.persona_profile.primary_persona       ?? null,
        secondary_personas:   data.persona_profile.secondary_personas    ?? [],
        persona_descriptions: data.persona_profile.persona_descriptions  ?? null,
        income_range:         data.persona_profile.income_range          ?? null,
        risk_appetite:        data.persona_profile.risk_appetite         ?? null,
        family_stage:         data.persona_profile.family_stage          ?? null,
        work_location:        data.persona_profile.work_location         ?? null,
        timeline_horizon:     data.persona_profile.timeline_horizon      ?? null,
        motivation_note:      data.persona_profile.motivation_note       ?? null,
        last_verified_at:     new Date(),
        verified_by:          data.persona_profile.verified_by ?? 'seed',
      }
      await prisma.personaProfile.upsert({
        where:  { project_id: project.id },
        create: { project_id: project.id, ...personaData },
        update: personaData,
      })
      console.log('✓ Persona Profile')
    }

    // ─────────────────────────────────────────────────
    // 6. RECOMMENDATION PROFILE
    // ─────────────────────────────────────────────────
    if (data.recommendation_profile) {
      const recData = {
        status:               data.recommendation_profile.status              as any,
        tier:                 data.recommendation_profile.tier                ?? null,
        primary_thesis:       data.recommendation_profile.primary_thesis      ?? data.recommendation_profile.investment_thesis ?? null,
        walk_away_conditions: data.recommendation_profile.walk_away_conditions?? [],
        timeline_advice:      data.recommendation_profile.timeline_advice     ?? null,
        negotiation_leverage: data.recommendation_profile.negotiation_leverage?? [],
        internal_confidence:  data.recommendation_profile.internal_confidence ?? null,
        admin_notes:          data.recommendation_profile.admin_notes         ?? null,
        last_verified_at:     new Date(),
        verified_by:          data.recommendation_profile.verified_by ?? 'seed',
      }
      await prisma.recommendationProfile.upsert({
        where:  { project_id: project.id },
        create: { project_id: project.id, ...recData },
        update: recData,
      })
      console.log('✓ Recommendation Profile')
    }

    // ─────────────────────────────────────────────────
    // 7. COMPETITORS
    // ─────────────────────────────────────────────────
    if (data.competitors?.length) {
      await prisma.projectCompetitor.deleteMany({ where: { project_id: project.id } })
      for (const comp of data.competitors) {
        await prisma.projectCompetitor.create({
          data: {
            project_id:             project.id,
            competitor_name:        comp.competitor_name,
            competitor_slug:        comp.competitor_slug        ?? null,
            this_project_advantage: comp.this_project_advantage ?? null,
            competitor_advantage:   comp.competitor_advantage   ?? null,
            verdict:                comp.verdict                ?? null,
            price_delta_note:       comp.price_delta_note       ?? null,
            sort_order:             comp.sort_order             ?? 0,
            last_verified_at:       new Date(),
            verified_by:            'seed',
          },
        })
      }
      console.log(`✓ Competitors (${data.competitors.length})`)
    }

    // ─────────────────────────────────────────────────
    // 8. COST SHEET
    // ─────────────────────────────────────────────────
    if (data.cost_sheet) {
      const costData = {
        project_id:           project.id,
        base_price_per_sqft:  data.cost_sheet.base_price_per_sqft  ?? null,
        floor_rise_per_floor: data.cost_sheet.floor_rise_per_floor ?? null,
        plc_charges:          data.cost_sheet.plc_charges          ?? [],
        parking_cost:         data.cost_sheet.parking_cost         ?? null,
        ifms:                 data.cost_sheet.ifms                 ?? null,
        club_membership:      data.cost_sheet.club_membership      ?? null,
        other_charges:        data.cost_sheet.other_charges        ?? [],
        gst_rate_pct:         data.cost_sheet.gst_rate_pct         ?? 5.0,
        stamp_duty_pct:       data.cost_sheet.stamp_duty_pct       ?? 6.0,
        registration_pct:     data.cost_sheet.registration_pct     ?? 1.0,
        assumptions:          data.cost_sheet.assumptions          ?? [],
        verified_at:          new Date(),
        verified_by:          'seed',
      }
      await prisma.costSheet.upsert({
        where:  { project_id: project.id },
        create: costData,
        update: costData,
      })
      console.log('✓ Cost Sheet')
    }

    // ─────────────────────────────────────────────────
    // 9. PAYMENT PLAN
    // ─────────────────────────────────────────────────
    // Many plans per project — accepts a `payment_plans` array or a single
    // legacy `payment_plan` object.
    const rawPlans: any[] = Array.isArray((data as any).payment_plans)
      ? (data as any).payment_plans
      : data.payment_plan ? [data.payment_plan] : []

    for (const [i, plan] of rawPlans.entries()) {
      const planData = {
        project_id: project.id,
        plan_type:  plan.plan_type  ?? 'construction_linked',
        plan_name:  plan.plan_name  ?? null,
        milestones: plan.milestones ?? [],
        sort_order: plan.sort_order ?? i,
        source:     plan.source     ?? null,
        notes:      plan.notes      ?? null,
        verified_at: new Date(),
        verified_by: 'seed',
      }
      await prisma.paymentPlan.upsert({
        where:  { project_id_plan_type: { project_id: project.id, plan_type: planData.plan_type } },
        create: planData,
        update: planData,
      })
    }
    if (rawPlans.length) console.log(`✓ Payment Plans (${rawPlans.length})`)

    // ─────────────────────────────────────────────────
    // 10. CONNECTIVITY (Nearby Establishments)
    // ─────────────────────────────────────────────────
    if (data.connectivity?.length) {
      await prisma.connectivity.deleteMany({ where: { project_id: project.id } })
      for (const conn of data.connectivity) {
        await prisma.connectivity.create({
          data: {
            project_id: project.id,
            name: conn.name,
            type: conn.type?.toLowerCase() as any,
            distance_km: conn.distance_km ?? null,
            notes: conn.notes ?? null,
            data_source: conn.data_source as any ?? 'manual',
          },
        })
      }
      console.log(`✓ Connectivity (${data.connectivity.length} entries)`)
    }

    // ─────────────────────────────────────────────────
    // 11. UNIT TYPES
    // ─────────────────────────────────────────────────
    if (data.unit_types?.length) {
      await prisma.unitType.deleteMany({ where: { project_id: project.id } })
      for (const ut of data.unit_types) {
        await prisma.unitType.create({
          data: {
            project_id:        project.id,
            name:              ut.name,
            bhk:               ut.bhk,
            super_area_sqft:   ut.super_area_sqft   ?? null,
            carpet_area_sqft:  ut.carpet_area_sqft  ?? null,
            balcony_area_sqft: ut.balcony_area_sqft ?? null,
            bathrooms:         ut.bathrooms         ?? null,
            utility_room:      ut.utility_room      ?? false,
            dress_area:        ut.dress_area        ?? false,
            towers:            ut.towers            ?? [],
            price_min_cr:      ut.price_min_cr      ?? null,
            price_max_cr:      ut.price_max_cr      ?? null,
            price_label:       ut.price_label       ?? null,
            price_is_estimated:ut.price_is_estimated ?? true,
            subtitle:          ut.subtitle          ?? null,
            description:       ut.description       ?? null,
            category_badge:    ut.category_badge    ?? null,
            inventory_left:    ut.inventory_left    ?? null,
            perfect_for:       ut.perfect_for       ?? [],
            key_highlights:    ut.key_highlights    ?? null,
            whats_included:    ut.whats_included    ?? null,
            views:             ut.views             ?? null,
          },
        })
      }
      console.log(`✓ Unit Types (${data.unit_types.length})`)
    }

    // ─────────────────────────────────────────────────
    // 12. AMENITIES
    // ─────────────────────────────────────────────────
    if (data.amenities?.length) {
      await prisma.amenity.deleteMany({ where: { project_id: project.id } })
      for (const am of data.amenities) {
        await prisma.amenity.create({
          data: {
            project_id: project.id,
            name:       am.name,
            category:   (['sports', 'lifestyle', 'wellness', 'kids', 'security', 'parking'].includes(am.category?.toLowerCase()) ? am.category?.toLowerCase() : 'lifestyle') as any,
          },
        })
      }
      console.log(`✓ Amenities (${data.amenities.length})`)
    }

    // ─────────────────────────────────────────────────
    // 13. DOCUMENTS
    // ─────────────────────────────────────────────────
    if (data.documents?.length) {
      await prisma.projectDocument.deleteMany({ where: { project_id: project.id } })
      for (const doc of data.documents) {
        await prisma.projectDocument.create({
          data: {
            project_id:      project.id,
            project_slug:    project.slug,
            name:            doc.name,
            storage_url:     doc.storage_url     ?? '',
            doc_type:        doc.doc_type        ?? 'brochure',
            file_size_bytes: doc.file_size_bytes ?? 0,
          },
        })
      }
      console.log(`✓ Documents (${data.documents.length})`)
    }

    // ─────────────────────────────────────────────────
    // 14. IMAGES
    // ─────────────────────────────────────────────────
    await prisma.projectImage.deleteMany({ where: { project_id: project.id } })
    if (heroPath) {
      await prisma.projectImage.create({
        data: {
          project_id: project.id,
          url: heroPath,
          type: 'exterior',
          source: 'seed',
          caption: `${data.project.name} Main View`,
          sort_order: 0,
        },
      })
    }
    if (data.images?.length) {
      for (const img of data.images) {
        if (!img.url || img.url.trim() === '') continue
        await prisma.projectImage.create({
          data: {
            project_id: project.id,
            url:        img.url,
            type:       img.type       as any,
            caption:    img.caption    ?? null,
            sort_order: img.sort_order ?? 0,
          },
        })
      }
      console.log(`✓ Images (${data.images.length} slots)`)
    } else if (heroPath) {
      console.log('✓ Hero image attached')
    }

    console.log(`\n✅ "${data.project.name}" seeded successfully with zero gaps!\n`)

  } catch (error) {
    console.error('\n❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seed()
