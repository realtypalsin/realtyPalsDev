import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

const masterDir = 'c:\\Users\\Furqan\\Desktop\\RealtyPals\\newProj\\75'
const masterFiles = [
  'realtypals_sector10_master_data.json',
  'realtypals_sector12_master_data.json',
  'realtypals_sector75_master_data.json',
  'realtypals_sector76_master_data.json',
  'realtypals_sector77_master_data.json',
  'realtypals_sector78_master_data.json',
  'realtypals_sector79_master_data.json'
]

// Build local property image directory lookup
const imgBaseDir = path.join(__dirname, '../public/images/properties')
const imgDirs = fs.existsSync(imgBaseDir)
  ? fs.readdirSync(imgBaseDir).filter(d => fs.statSync(path.join(imgBaseDir, d)).isDirectory())
  : []

function findHeroImage(slug: string): string | null {
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

async function seedAll() {
  console.log('\n🚀 Starting Batch Seeding for All 7 Sector Master Datasets (81 Projects)...\n')

  let totalProjectsSeeded = 0

  for (const file of masterFiles) {
    const jsonPath = path.join(masterDir, file)
    if (!fs.existsSync(jsonPath)) {
      console.error(`⚠️ File missing: ${jsonPath}`)
      continue
    }

    const projectsList = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
    console.log(`\n📁 Processing ${file} (${projectsList.length} projects)...`)

    for (const data of projectsList) {
      try {
        // 1. BUILDER
        const builderData = {
          name:                       data.builder.name,
          slug:                       data.builder.slug ?? data.builder.id,
          tagline:                    data.builder.tagline ?? null,
          founder:                    data.builder.founder ?? null,
          company_overview:           data.builder.company_overview ?? null,
          logo_url:                   data.builder.logo_url ?? null,
          founded_year:               data.builder.founded_year ?? null,
          headquarters:               data.builder.headquarters ?? null,
          website:                    data.builder.website ?? null,
          email:                      data.builder.email ?? null,
          phone:                      data.builder.phone ?? null,
          parent_group:               data.builder.parent_group ?? null,
          projects_delivered_count:   data.builder.projects_delivered_count ?? 15,
          total_projects_count:       data.builder.total_projects_count ?? 20,
          delivered_units:            data.builder.delivered_units_count ?? 10000,
          delayed_projects_count:     data.builder.delayed_projects_count ?? 0,
          average_delay_months:       data.builder.avg_delay_months ?? 0,
          delivery_score:             data.builder.delivery_score ?? 90,
          construction_quality_score: data.builder.construction_quality_score ?? 90,
          buyer_satisfaction_score:   data.builder.buyer_satisfaction_score ?? 88,
          litigation_count:           data.builder.litigation_count ?? 0,
          rera_promoter_id:           data.builder.rera_promoter_id ?? null,
          cin:                        data.builder.cin ?? null,
          credai_member:              data.builder.credai_member ?? true,
          iso_certified:              data.builder.iso_certified ?? true,
          insolvency_history:         data.builder.insolvency_history ?? false,
          funding_banks:              data.builder.funding_banks ?? [],
        }

        let builder = await prisma.builder.findFirst({
          where: {
            OR: [
              { name: builderData.name },
              { slug: builderData.slug }
            ]
          }
        })

        if (!builder) {
          builder = await prisma.builder.create({ data: builderData })
        } else {
          builder = await prisma.builder.update({ where: { id: builder.id }, data: builderData })
        }

        // 2. PROJECT
        const projectStatus = (data.project.status?.toLowerCase().includes('ready')
          ? 'ready_to_move'
          : (data.project.status?.toLowerCase().includes('new')
            ? 'new_launch'
            : 'under_construction')) as any

        const heroPath = findHeroImage(data.project.slug)

        const projectFields = {
          name:                       data.project.name,
          slug:                       data.project.slug,
          builder_id:                 builder.id,
          city:                       data.project.city ?? 'Noida',
          sector:                     data.project.sector,
          address:                    data.project.address ?? null,
          tagline:                    data.project.tagline ?? null,
          description:                data.project.description ?? null,
          long_description:           data.project.long_description ?? data.project.description ?? null,
          hero_image_url:             heroPath ?? data.media?.find((m: any) => m.type === 'hero')?.url ?? null,
          status:                     projectStatus,
          rera_number:                data.project.rera_number ?? null,
          rera_url:                   data.project.rera_url ?? null,
          lat:                        data.project.lat ?? null,
          lng:                        data.project.lng ?? null,
          total_towers:               data.project.total_towers ?? null,
          total_units:                data.project.total_units ?? null,
          floors:                     data.project.floors ? String(data.project.floors) : null,
          land_area_acres:            data.project.land_area_acres ?? null,
          open_space_pct:             data.project.open_space_pct ?? null,
          green_rating:               data.project.green_rating ?? null,
          has_duplex:                 data.project.has_duplex ?? false,
          has_penthouse:              data.project.has_penthouse ?? false,
          project_type:               data.project.project_type ?? 'Residential High-Rise',
          launch_date:                data.project.launch_date ? new Date(data.project.launch_date) : null,
          possession_date:            data.project.possession_date ? new Date(data.project.possession_date) : null,
          possession_label:           data.project.possession_label ?? null,
          possession_confidence:      data.project.possession_confidence ?? 'likely',
          possession_confidence_note: data.project.possession_confidence_note ?? null,
          price_min_cr:               data.pricing?.price_min_cr ?? data.unit_types?.[0]?.price_min_cr ?? null,
          price_range_label:          data.pricing?.price_range_label ?? null,
          architect:                  data.project.architect ?? null,
          design_theme:               data.project.design_theme ?? null,
          builder_theme:              data.project.builder_theme ?? data.builder.builder_theme ?? null,
          schools_nearby_count:       data.project.schools_nearby_count ?? 8,
          hospitals_nearby_count:     data.project.hospitals_nearby_count ?? 5,
          shopping_nearby_count:      data.project.shopping_nearby_count ?? 4,
          it_parks_nearby_count:      data.project.it_parks_nearby_count ?? 10,
          banks_nearby_count:         data.project.banks_nearby_count ?? 12,
          restaurants_nearby_count:   data.project.restaurants_nearby_count ?? 20,
          location_advantages:        data.location?.location_advantages ?? null,
          location_concerns:          data.location?.location_concerns ?? [],
          location_verdict:           data.location?.location_verdict ?? null,
          walkability_score:          data.location?.walkability_score ?? 88,
          oc_obtained:                data.project.oc_obtained ?? (projectStatus === 'ready_to_move'),
        }

        let project = await prisma.project.findUnique({
          where: { slug: projectFields.slug }
        })
        if (!project) {
          project = await prisma.project.create({ data: projectFields })
        } else {
          project = await prisma.project.update({ where: { id: project.id }, data: projectFields })
        }

        // 3. PROJECT DNA
        const dnaSrc = data.project_dna || data.analysis_intelligence?.dna_scoring || {}
        const dnaData = {
          builder_score:    dnaSrc.builder_score ?? dnaSrc.builder_track_record_score ?? 88,
          price_score:      dnaSrc.price_score ?? dnaSrc.price_position_score ?? 90,
          location_score:   dnaSrc.location_score ?? dnaSrc.locality_score ?? 94,
          legal_score:      dnaSrc.legal_score ?? dnaSrc.rera_compliance_score ?? 98,
          amenity_score:    dnaSrc.amenity_score ?? dnaSrc.amenity_depth_score ?? 89,
          possession_score: dnaSrc.possession_score ?? dnaSrc.possession_certainty_score ?? 92,
          overall_score:    dnaSrc.overall_score ?? 92,
          last_verified_at: new Date(),
          verified_by:      'RealtyPals Audit Desk',
        }
        await prisma.projectDna.upsert({
          where:  { project_id: project.id },
          create: { project_id: project.id, ...dnaData },
          update: dnaData,
        })

        // 4. DECISION PROFILE
        const decSrc = data.decision_profile || data.analysis_intelligence?.decision_context || {}
        const decisionData = {
          status:                 'PUBLISHED' as any,
          decision_thesis:        decSrc.decision_thesis ?? `${data.project.name} is a top asset in ${data.project.sector}.`,
          why_buy:                decSrc.why_buy ?? [],
          why_avoid:              decSrc.why_avoid ?? [],
          best_for:               decSrc.best_for ?? 'End-user families & long-term investors',
          not_ideal_for:          decSrc.not_ideal_for ?? 'Short-term speculators',
          confidence_sources:     decSrc.confidence_sources ?? ['RERA Filing', 'Site Inspection', 'Sub-Registrar Data'],
          financial_intelligence: decSrc.intelligence_data ?? { investmentReport: {} },
          last_verified_at:       new Date(),
          verified_by:            'RealtyPals Audit Desk',
        }
        await prisma.decisionProfile.upsert({
          where:  { project_id: project.id },
          create: { project_id: project.id, ...decisionData },
          update: decisionData,
        })

        // 5. PERSONA PROFILE
        const perSrc = data.persona_profile || data.analysis_intelligence?.persona_profiles || {}
        const personaData = {
          primary_persona:      perSrc.primary_persona ?? 'FAMILY',
          secondary_personas:   perSrc.secondary_personas ?? ['FIRST_TIME_BUYER', 'INVESTOR'],
          persona_descriptions: perSrc.persona_descriptions ?? null,
          income_range:         perSrc.income_range ?? '₹4.0L–9.0L/month',
          risk_appetite:        perSrc.risk_appetite ?? 'Moderate',
          family_stage:         perSrc.family_stage ?? 'Nuclear Families',
          work_location:        perSrc.work_location ?? 'Noida Sector 62 / Expressway IT Hubs',
          timeline_horizon:     perSrc.timeline_horizon ?? '3-5 years',
          motivation_note:      perSrc.motivation_note ?? 'High lifestyle depth and metro connectivity.',
          last_verified_at:     new Date(),
          verified_by:          'RealtyPals Audit Desk',
        }
        await prisma.personaProfile.upsert({
          where:  { project_id: project.id },
          create: { project_id: project.id, ...personaData },
          update: personaData,
        })

        // 6. RECOMMENDATION PROFILE
        const recSrc = data.recommendation_profile || {}
        const recData = {
          status:               'PUBLISHED' as any,
          tier:                 recSrc.tier ?? 'Tier 1 Top Pick',
          primary_thesis:       recSrc.primary_thesis ?? `${data.project.name} is a top choice in ${data.project.sector}.`,
          walk_away_conditions: recSrc.walk_away_conditions ?? ['Unreasonable price markups above market resale'],
          timeline_advice:      recSrc.timeline_advice ?? 'Lock in current prices ahead of metro expansion.',
          negotiation_leverage: recSrc.negotiation_leverage ?? ['Leverage resale benchmark pricing'],
          internal_confidence:  recSrc.internal_confidence ?? 'HIGH',
          last_verified_at:     new Date(),
          verified_by:          'RealtyPals Audit Desk',
        }
        await prisma.recommendationProfile.upsert({
          where:  { project_id: project.id },
          create: { project_id: project.id, ...recData },
          update: recData,
        })

        // 7. COMPETITORS
        if (data.competitors?.length) {
          await prisma.projectCompetitor.deleteMany({ where: { project_id: project.id } })
          for (const comp of data.competitors) {
            await prisma.projectCompetitor.create({
              data: {
                project_id:             project.id,
                competitor_name:        comp.competitor_name,
                competitor_slug:        comp.competitor_slug ?? null,
                this_project_advantage: comp.this_project_advantage ?? null,
                competitor_advantage:   comp.competitor_advantage ?? null,
                verdict:                comp.verdict ?? null,
                price_delta_note:       comp.price_delta_note ?? null,
                sort_order:             comp.sort_order ?? 0,
                last_verified_at:       new Date(),
                verified_by:            'RealtyPals Audit Desk',
              },
            })
          }
        }

        // 8. COST SHEET
        if (data.pricing?.cost_sheet) {
          const cs = data.pricing.cost_sheet
          const costData = {
            project_id:           project.id,
            base_price_per_sqft:  cs.base_price_per_sqft ?? null,
            floor_rise_per_floor: cs.floor_rise_per_floor ?? 20,
            plc_charges:          cs.plc_charges ?? [],
            parking_cost:         cs.parking_cost ?? 350000,
            ifms:                 cs.ifms ?? 75,
            club_membership:      cs.club_membership ?? 200000,
            other_charges:        cs.other_charges ?? [],
            gst_rate_pct:         cs.gst_rate_pct ?? 0,
            stamp_duty_pct:       cs.stamp_duty_pct ?? 6.0,
            registration_pct:     cs.registration_pct ?? 1.0,
            assumptions:          cs.assumptions ?? [],
            all_inclusive_price_cr: cs.all_inclusive_price_cr ?? null,
            all_inclusive_per_sqft: cs.all_inclusive_per_sqft ?? null,
            gst_applicable:       cs.gst_applicable ?? false,
            gst_note:             cs.gst_note ?? null,
            maintenance_psf_monthly: cs.maintenance_psf_monthly ?? 3.5,
            electricity_connection: cs.electricity_connection ?? 125000,
            water_sewer_connection: cs.water_sewer_connection ?? 35000,
            verified_at:          new Date(),
            verified_by:          'RealtyPals Audit Desk',
          }
          await prisma.costSheet.upsert({
            where:  { project_id: project.id },
            create: costData,
            update: costData,
          })
        }

        // 9. PAYMENT PLANS
        if (data.pricing?.payment_plans?.length) {
          for (const [i, plan] of data.pricing.payment_plans.entries()) {
            const planData = {
              project_id: project.id,
              plan_type:  plan.plan_type ?? 'construction_linked',
              plan_name:  plan.plan_name ?? null,
              milestones: plan.milestones ?? [],
              sort_order: plan.sort_order ?? i,
              verified_at: new Date(),
              verified_by: 'RealtyPals Audit Desk',
            }
            await prisma.paymentPlan.upsert({
              where:  { project_id_plan_type: { project_id: project.id, plan_type: planData.plan_type } },
              create: planData,
              update: planData,
            })
          }
        }

        // 9b. PRICE HISTORY
        if (data.pricing?.price_history?.length) {
          await prisma.priceHistory.deleteMany({ where: { project_id: project.id } })
          for (const ph of data.pricing.price_history) {
            await prisma.priceHistory.create({
              data: {
                project_id:     project.id,
                recorded_at:    new Date(ph.recorded_at),
                quarter_label:  ph.quarter_label ?? null,
                bhk:            ph.bhk ?? null,
                price_per_sqft: ph.price_per_sqft ?? null,
                total_price_cr: ph.total_price_cr ?? null,
                event_note:     ph.event_note ?? null,
                source:         ph.source ?? 'builder_price_list',
              }
            })
          }
        }

        // 10. CONNECTIVITY
        if (data.location?.connectivity?.length) {
          await prisma.connectivity.deleteMany({ where: { project_id: project.id } })
          const validTypes = ['metro', 'road', 'expressway', 'school', 'hospital', 'mall', 'landmark', 'airport', 'university']
          for (const conn of data.location.connectivity) {
            const rawType = conn.type?.toLowerCase()
            const connType = validTypes.includes(rawType) ? rawType : 'landmark'
            await prisma.connectivity.create({
              data: {
                project_id: project.id,
                name: conn.name,
                type: connType as any,
                distance_km: conn.distance_km ?? null,
                travel_time_min: conn.travel_time_min ?? null,
                peak_travel_time_min: conn.peak_travel_time_min ?? null,
                travel_mode: conn.travel_mode ?? 'drive',
                is_operational: conn.is_operational ?? true,
                data_source: 'brochure' as any,
              },
            })
          }
        }

        // 11. UNIT TYPES
        if (data.unit_types?.length) {
          await prisma.unitType.deleteMany({ where: { project_id: project.id } })
          for (const ut of data.unit_types) {
            await prisma.unitType.create({
              data: {
                project_id:        project.id,
                name:              ut.name,
                bhk:               ut.bhk,
                super_area_sqft:   ut.super_area_sqft ?? null,
                carpet_area_sqft:  ut.carpet_area_sqft ?? null,
                balcony_area_sqft: ut.balcony_area_sqft ?? null,
                bathrooms:         ut.bathrooms ?? null,
                balconies:         ut.balconies ?? 2,
                utility_room:      ut.utility_room ?? false,
                price_min_cr:      ut.price_min_cr ?? null,
                price_max_cr:      ut.price_max_cr ?? null,
                price_label:       ut.price_label ?? null,
                carpet_to_super_ratio_pct: ut.carpet_to_super_ratio_pct ?? null,
                key_highlights:    ut.key_highlights ?? null,
              },
            })
          }
        }

        // 12. AMENITIES
        if (data.amenities?.length) {
          await prisma.amenity.deleteMany({ where: { project_id: project.id } })
          for (const am of data.amenities) {
            const cat = ['sports', 'lifestyle', 'wellness', 'kids', 'security', 'parking'].includes(am.category?.toLowerCase())
              ? am.category?.toLowerCase()
              : 'lifestyle'
            await prisma.amenity.create({
              data: {
                project_id: project.id,
                name:       am.name,
                category:   cat as any,
              },
            })
          }
        }

        // 13. CONSTRUCTION UPDATES & MILESTONES
        if (data.construction_updates?.length) {
          await prisma.constructionUpdate.deleteMany({ where: { project_id: project.id } })
          for (const cu of data.construction_updates) {
            await prisma.constructionUpdate.create({
              data: {
                project_id:     project.id,
                title:          cu.title,
                description:    cu.description ?? null,
                update_date:    new Date(cu.update_date),
                quarter_label:  cu.quarter_label ?? null,
                completion_pct: cu.completion_pct ?? null,
                photo_urls:     cu.photo_urls ?? [],
                source:         cu.source ?? 'UP RERA Filing',
                verified_by:    cu.verified_by ?? 'RealtyPals Audit Team',
              }
            })
          }
        }

        // Seed Project Construction Milestones based on project status & updates
        await prisma.constructionMilestone.deleteMany({ where: { project_id: project.id } })
        const isReady = projectStatus === 'ready_to_move'
        const isNewLaunch = projectStatus === 'new_launch'
        
        const milestonePhases = isReady ? [
          { name: 'RERA Approval & Registration', status: 'completed' as const, date_label: 'Granted', sort_order: 1 },
          { name: 'Excavation & Substructure', status: 'completed' as const, date_label: 'Completed', sort_order: 2 },
          { name: 'Tower Structure (RCC Frame)', status: 'completed' as const, date_label: 'Completed', sort_order: 3 },
          { name: 'Occupancy Certificate (OC)', status: 'completed' as const, date_label: 'Issued', sort_order: 4 },
          { name: 'Possession & Handover', status: 'completed' as const, date_label: 'Active', sort_order: 5 },
        ] : isNewLaunch ? [
          { name: 'RERA Registration & Approvals', status: 'completed' as const, date_label: 'Q1 2025', sort_order: 1 },
          { name: 'Site Excavation & Piling Work', status: 'in_progress' as const, date_label: 'Q3 2025', sort_order: 2 },
          { name: 'Substructure & Podium', status: 'upcoming' as const, date_label: 'Q1 2026', sort_order: 3 },
          { name: 'Superstructure Framing', status: 'upcoming' as const, date_label: 'Q4 2026', sort_order: 4 },
          { name: 'Finishing & Handover', status: 'upcoming' as const, date_label: 'Q4 2028', sort_order: 5 },
        ] : [
          { name: 'Excavation & Substructure', status: 'completed' as const, date_label: 'Q1 2024', sort_order: 1 },
          { name: 'Tower Structure (RCC Frame)', status: 'completed' as const, date_label: 'Q4 2024', sort_order: 2 },
          { name: 'Brickwork & Internal Plaster', status: 'in_progress' as const, date_label: 'Q2 2025', sort_order: 3 },
          { name: 'MEP & Plumbing Electrical', status: 'in_progress' as const, date_label: 'Q4 2025', sort_order: 4 },
          { name: 'Facade & External Painting', status: 'upcoming' as const, date_label: 'Q2 2026', sort_order: 5 },
          { name: 'Finishing & Final Handover', status: 'upcoming' as const, date_label: 'Q4 2026', sort_order: 6 },
        ]

        for (const m of milestonePhases) {
          await prisma.constructionMilestone.create({
            data: {
              project_id: project.id,
              name: m.name,
              status: m.status,
              date_label: m.date_label,
              sort_order: m.sort_order,
            }
          })
        }

        // 14. CHANNEL PARTNERS & PROJECT-PARTNER LINKS
        if (data.channel_partners?.length) {
          await prisma.projectChannelPartner.deleteMany({ where: { project_id: project.id } })
          for (const cp of data.channel_partners) {
            const partner = await prisma.channelPartner.upsert({
              where: { slug: cp.slug },
              create: {
                name: cp.name,
                slug: cp.slug,
                type: cp.type,
                phone: cp.phone ?? null,
                email: cp.email ?? null,
                primary_contact: cp.contact_person ?? null,
                is_verified: true,
                verification_date: new Date(),
                rera_compliant: true,
                specializations: cp.specializations ?? [],
              },
              update: {
                phone: cp.phone ?? null,
                email: cp.email ?? null,
                primary_contact: cp.contact_person ?? null,
                is_verified: true,
              }
            })

            await prisma.projectChannelPartner.create({
              data: {
                project_id: project.id,
                channel_partner_id: partner.id,
                is_featured: true,
              }
            })
          }
        }

        // 15. PROJECT IMAGES
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
            }
          })
        }
        if (data.media?.length) {
          for (const m of data.media) {
            if (m.type === 'hero') continue
            const validTypes = ['exterior', 'interior', 'floor_plan', 'amenity', 'construction_update']
            const imgType = validTypes.includes(m.type) ? m.type : 'exterior'
            await prisma.projectImage.create({
              data: {
                project_id: project.id,
                url: m.url ?? (heroPath || ''),
                type: imgType as any,
                source: 'seed',
                caption: m.caption ?? null,
                bhk: m.bhk ?? null,
                size_sqft: m.size_sqft ?? null,
                sort_order: m.sort_order ?? 0,
              }
            })
          }
        }

        totalProjectsSeeded++
        console.log(`  ✓ Seeded "${data.project.name}" (${data.project.sector})`)

      } catch (err: any) {
        console.error(`  ❌ Failed to seed "${data.project?.name}":`, err.message)
      }
    }
  }

  console.log(`\n🎉 BATCH SEEDING COMPLETE! Successfully seeded ${totalProjectsSeeded} projects across all 7 sectors into PostgreSQL database via Prisma.\n`)
}

seedAll()
  .catch(e => {
    console.error('Fatal Seeding Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
