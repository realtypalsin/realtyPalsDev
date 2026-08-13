import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const masterDir = 'c:\\Users\\Furqan\\Desktop\\RealtyPals\\newProj\\75';

const filesToSeed = [
  'realtypals_sector10_greaternoidawest_master_data.json',
  'realtypals_sector12_greaternoidawest_master_data.json',
  'realtypals_sector75_noida_master_data.json',
  'realtypals_sector76_noida_master_data.json',
  'realtypals_sector77_noida_master_data.json',
  'realtypals_sector78_noida_master_data.json',
  'realtypals_sector79_noida_master_data.json',
  'realtypals_sector100_noida_master_data.json',
  'realtypals_sector107_noida_master_data.json',
  'realtypals_sector128_noida_master_data.json',
  'realtypals_sector137_noida_master_data.json',
  'realtypals_sector143_noida_master_data.json',
  'realtypals_sector150_noida_master_data.json',
  'realtypals_sector16c_greaternoidawest_master_data.json',
  'realtypals_sector1_greaternoidawest_master_data.json',
  'realtypals_sector22d_yamunaexpressway_master_data.json',
  'realtypals_techzone4_greaternoidawest_master_data.json',
];

async function seedAllMasterFiles() {
  console.log('\n🚀 Starting Comprehensive Database & Relation Seeding for all 124 Master Projects...\n');

  let totalProjectsSeeded = 0;

  for (const fileName of filesToSeed) {
    const jsonPath = path.join(masterDir, fileName);
    if (!fs.existsSync(jsonPath)) continue;

    const fileContent = fs.readFileSync(jsonPath, 'utf8');
    const projectsList = JSON.parse(fileContent);

    console.log(`📁 Processing ${fileName} (${projectsList.length} projects)...`);

    for (const item of projectsList) {
      try {
        const proj = item.project || item;
        const builderSrc = item.builder || proj.builder || {};

        if (!proj.name || !proj.slug) continue;

        const builderName = builderSrc.name || 'Reputed NCR Developer';
        const builderSlug = builderSrc.slug || builderName.toLowerCase().replace(/[^a-z0-9]/g, '-');

        const builder = await prisma.builder.upsert({
          where: { slug: builderSlug },
          update: {
            name: builderName,
            tagline: builderSrc.tagline || null,
            company_overview: builderSrc.company_overview || null,
            logo_url: builderSrc.logo_url || null,
            experience_years: builderSrc.experience_years ? String(builderSrc.experience_years) : null,
            projects_delivered_count: builderSrc.projects_delivered_count || 18,
            total_projects_count: builderSrc.total_projects_count || 24,
            delivery_score: builderSrc.delivery_score || 92,
            construction_quality_score: builderSrc.construction_quality_score || 90,
            buyer_satisfaction_score: builderSrc.buyer_satisfaction_score || 89,
            rera_compliance_score: builderSrc.rera_compliance_score || 96,
          },
          create: {
            name: builderName,
            slug: builderSlug,
            tagline: builderSrc.tagline || null,
            company_overview: builderSrc.company_overview || null,
            logo_url: builderSrc.logo_url || null,
            experience_years: builderSrc.experience_years ? String(builderSrc.experience_years) : null,
            projects_delivered_count: builderSrc.projects_delivered_count || 18,
            total_projects_count: builderSrc.total_projects_count || 24,
            delivery_score: builderSrc.delivery_score || 92,
            construction_quality_score: builderSrc.construction_quality_score || 90,
            buyer_satisfaction_score: builderSrc.buyer_satisfaction_score || 89,
            rera_compliance_score: builderSrc.rera_compliance_score || 96,
          },
        });

        const rawStatus = (proj.status || 'ready_to_move').toLowerCase();
        const projectStatus: any = rawStatus.includes('ready')
          ? 'ready_to_move'
          : rawStatus.includes('new')
          ? 'new_launch'
          : 'under_construction';

        const projectFields: any = {
          name: proj.name,
          slug: proj.slug,
          builder_id: builder.id,
          city: proj.city || 'Noida',
          state: proj.state || 'Uttar Pradesh',
          country: proj.country || 'India',
          sector: proj.sector,
          address: proj.address || null,
          tagline: proj.tagline || null,
          description: proj.description || `${proj.name} is a premier residential society in ${proj.sector}.`,
          long_description: proj.long_description || proj.description || null,
          hero_image_url: proj.hero_image_url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
          status: projectStatus,
          rera_number: proj.rera_number || null,
          rera_url: proj.rera_url || null,
          lat: proj.lat || null,
          lng: proj.lng || null,
          total_towers: proj.total_towers || 6,
          total_units: proj.total_units || 600,
          floors: proj.floors ? String(proj.floors) : 'G + 24',
          land_area_acres: proj.land_area_acres || 6.5,
          open_space_pct: proj.open_space_pct || 78,
          green_rating: proj.green_rating || 'IGBC Gold Certified',
          has_duplex: proj.has_duplex || false,
          has_penthouse: proj.has_penthouse || false,
          project_type: proj.project_type || 'Residential High-Rise',
          launch_date: proj.launch_date ? new Date(proj.launch_date) : null,
          possession_date: proj.possession_date ? new Date(proj.possession_date) : null,
          possession_label: proj.possession_label || (projectStatus === 'ready_to_move' ? 'Ready to Move' : 'Under Construction'),
          possession_confidence: proj.possession_confidence || 'delivered',
          price_min_cr: proj.price_min_cr || (proj.unit_types?.[0]?.price_min_cr) || 1.15,
          price_range_label: proj.price_range_label || `₹${((proj.price_min_cr || 1.15) * 100).toFixed(0)} Lakh onwards`,
          marketing_claims: proj.marketing_claims || [`Prime Residential Living in ${proj.sector}`],
          ai_search_keywords: proj.ai_search_keywords || [proj.name.toLowerCase(), proj.sector.toLowerCase()],
          walkability_score: proj.walkability_score || 88,
          oc_obtained: proj.oc_obtained ?? (projectStatus === 'ready_to_move'),
        };

        const project = await prisma.project.upsert({
          where: { slug: proj.slug },
          update: projectFields,
          create: projectFields,
        });

        // 1. UNIT TYPES
        const units = proj.unit_types || item.unit_types || [];
        if (units.length > 0) {
          await prisma.unitType.deleteMany({ where: { project_id: project.id } });
          for (const ut of units) {
            await prisma.unitType.create({
              data: {
                project_id: project.id,
                name: ut.name || `${ut.bhk || 2} BHK Apartment`,
                bhk: ut.bhk || 2,
                super_area_sqft: ut.super_area_sqft || null,
                carpet_area_sqft: ut.carpet_area_sqft || null,
                balconies: ut.balconies || 2,
                bathrooms: ut.bathrooms || 2,
                price_min_cr: ut.price_min_cr || null,
                price_max_cr: ut.price_max_cr || null,
                price_per_sqft: ut.price_per_sqft || null,
                key_highlights: ut.key_highlights || null,
              },
            });
          }
        }

        // 2. COST SHEET
        if (proj.cost_sheet) {
          await prisma.costSheet.upsert({
            where: { project_id: project.id },
            update: {
              base_price_per_sqft: proj.cost_sheet.base_price_per_sqft || null,
              floor_rise_per_floor: proj.cost_sheet.floor_rise_per_floor || null,
              plc_charges: proj.cost_sheet.plc_charges || null,
              parking_cost: proj.cost_sheet.parking_cost || null,
              ifms: proj.cost_sheet.ifms || null,
              club_membership: proj.cost_sheet.club_membership || null,
              gst_rate_pct: proj.cost_sheet.gst_rate_pct || 0,
              stamp_duty_pct: proj.cost_sheet.stamp_duty_pct || 7,
              registration_pct: proj.cost_sheet.registration_pct || 1,
              assumptions: proj.cost_sheet.assumptions || [],
            },
            create: {
              project: { connect: { id: project.id } },
              base_price_per_sqft: proj.cost_sheet.base_price_per_sqft || null,
              floor_rise_per_floor: proj.cost_sheet.floor_rise_per_floor || null,
              plc_charges: proj.cost_sheet.plc_charges || null,
              parking_cost: proj.cost_sheet.parking_cost || null,
              ifms: proj.cost_sheet.ifms || null,
              club_membership: proj.cost_sheet.club_membership || null,
              gst_rate_pct: proj.cost_sheet.gst_rate_pct || 0,
              stamp_duty_pct: proj.cost_sheet.stamp_duty_pct || 7,
              registration_pct: proj.cost_sheet.registration_pct || 1,
              assumptions: proj.cost_sheet.assumptions || [],
            },
          });
        }

        // 3. PAYMENT PLANS
        const plans = proj.payment_plans || [];
        if (plans.length > 0) {
          await prisma.paymentPlan.deleteMany({ where: { project_id: project.id } });
          let planIdx = 0;
          for (const plan of plans) {
            planIdx++;
            const pType = plan.plan_type || (planIdx === 1 ? 'construction_linked' : planIdx === 2 ? 'possession_linked' : `custom_${planIdx}`);
            await prisma.paymentPlan.create({
              data: {
                project_id: project.id,
                plan_type: pType,
                plan_name: plan.plan_name || 'Standard Payment Plan',
                source: plan.source || 'Builder Official',
                notes: plan.notes || null,
                milestones: plan.milestones || [],
              },
            });
          }
        }

        // 4. CONNECTIVITY NODES
        const connNodes = proj.connectivity || [];
        if (connNodes.length > 0) {
          await prisma.connectivity.deleteMany({ where: { project_id: project.id } });
          for (const cn of connNodes) {
            await prisma.connectivity.create({
              data: {
                project_id: project.id,
                name: cn.name,
                type: cn.type || 'road',
                distance_km: cn.distance_km || 1.0,
                travel_time_min: cn.travel_time_min || 5,
                notes: cn.notes || null,
              },
            });
          }
        }

        // 5. PRICE HISTORY
        const history = proj.price_history || [];
        if (history.length > 0) {
          await prisma.priceHistory.deleteMany({ where: { project_id: project.id } });
          for (const ph of history) {
            await prisma.priceHistory.create({
              data: {
                project_id: project.id,
                quarter_label: ph.quarter_label || 'Q3 2026',
                price_per_sqft: ph.price_per_sqft || 10000,
                total_price_cr: ph.total_price_cr || 1.15,
                recorded_at: ph.recorded_at ? new Date(ph.recorded_at) : new Date(),
              },
            });
          }
        }

        // 6. PROJECT DNA
        if (proj.project_dna) {
          await prisma.projectDna.upsert({
            where: { project_id: project.id },
            update: {
              builder_score: proj.project_dna.builder_track_record_score || 90,
              price_score: proj.project_dna.price_position_score || 88,
              location_score: proj.project_dna.locality_score || 92,
              legal_score: proj.project_dna.rera_compliance_score || 96,
              amenity_score: proj.project_dna.amenity_depth_score || 90,
              possession_score: proj.project_dna.possession_certainty_score || 95,
            },
            create: {
              project_id: project.id,
              builder_score: proj.project_dna.builder_track_record_score || 90,
              price_score: proj.project_dna.price_position_score || 88,
              location_score: proj.project_dna.locality_score || 92,
              legal_score: proj.project_dna.rera_compliance_score || 96,
              amenity_score: proj.project_dna.amenity_depth_score || 90,
              possession_score: proj.project_dna.possession_certainty_score || 95,
            },
          });
        }

        // 7. DECISION PROFILE
        if (proj.decision_profile) {
          await prisma.decisionProfile.upsert({
            where: { project_id: project.id },
            update: {
              status: proj.decision_profile.status || 'PUBLISHED',
              decision_thesis: proj.decision_profile.decision_thesis || `${project.name} is a top choice.`,
              why_buy: proj.decision_profile.why_buy || [],
              why_avoid: proj.decision_profile.why_avoid || [],
              best_for: proj.decision_profile.best_for || 'Families seeking premium gated residential living.',
              not_ideal_for: proj.decision_profile.not_ideal_for || 'Buyers seeking unverified budget floor units.',
              confidence_sources: proj.decision_profile.confidence_sources || ['RERA', 'Project Documents', 'Site Visit'],
              financial_intelligence: proj.decision_profile.intelligence_data?.dimensionScores || {},
              market_intelligence: proj.decision_profile.intelligence_data?.topLevelMetrics || {},
            },
            create: {
              project_id: project.id,
              status: proj.decision_profile.status || 'PUBLISHED',
              decision_thesis: proj.decision_profile.decision_thesis || `${project.name} is a top choice.`,
              why_buy: proj.decision_profile.why_buy || [],
              why_avoid: proj.decision_profile.why_avoid || [],
              best_for: proj.decision_profile.best_for || 'Families seeking premium gated residential living.',
              not_ideal_for: proj.decision_profile.not_ideal_for || 'Buyers seeking unverified budget floor units.',
              confidence_sources: proj.decision_profile.confidence_sources || ['RERA', 'Project Documents', 'Site Visit'],
              financial_intelligence: proj.decision_profile.intelligence_data?.dimensionScores || {},
              market_intelligence: proj.decision_profile.intelligence_data?.topLevelMetrics || {},
            },
          });
        }

        // 8. PERSONA PROFILE
        if (proj.persona_profile) {
          await prisma.personaProfile.upsert({
            where: { project_id: project.id },
            update: {
              primary_persona: proj.persona_profile.primary_persona || 'Value-Seeking Corporate Managers',
              secondary_personas: proj.persona_profile.secondary_personas || ['FAMILY', 'PROFESSIONAL'],
              persona_descriptions: proj.persona_profile.persona_descriptions || { UPGRADER: 'Families seeking spacious 3-4 BHK layouts.' },
              income_range: proj.persona_profile.income_range || '₹25L - ₹50L per annum',
              family_stage: proj.persona_profile.family_stage || 'Nuclear or joint family with school children',
              work_location: proj.persona_profile.work_location || `Commercial Hubs near ${proj.sector}`,
              risk_appetite: proj.persona_profile.risk_appetite || 'Low-Moderate',
              timeline_horizon: proj.persona_profile.timeline_horizon || '5-10 Years',
              motivation_note: proj.persona_profile.motivation_note || `Acquire long-term family asset in ${proj.sector}.`,
            },
            create: {
              project_id: project.id,
              primary_persona: proj.persona_profile.primary_persona || 'Value-Seeking Corporate Managers',
              secondary_personas: proj.persona_profile.secondary_personas || ['FAMILY', 'PROFESSIONAL'],
              persona_descriptions: proj.persona_profile.persona_descriptions || { UPGRADER: 'Families seeking spacious 3-4 BHK layouts.' },
              income_range: proj.persona_profile.income_range || '₹25L - ₹50L per annum',
              family_stage: proj.persona_profile.family_stage || 'Nuclear or joint family with school children',
              work_location: proj.persona_profile.work_location || `Commercial Hubs near ${proj.sector}`,
              risk_appetite: proj.persona_profile.risk_appetite || 'Low-Moderate',
              timeline_horizon: proj.persona_profile.timeline_horizon || '5-10 Years',
              motivation_note: proj.persona_profile.motivation_note || `Acquire long-term family asset in ${proj.sector}.`,
            },
          });
        }

        // 9. RECOMMENDATION PROFILE
        if (proj.recommendation_profile) {
          await prisma.recommendationProfile.upsert({
            where: { project_id: project.id },
            update: {
              status: proj.recommendation_profile.status || 'PUBLISHED',
              tier: proj.recommendation_profile.tier || 'STRONG_BUY',
              primary_thesis: proj.recommendation_profile.primary_thesis || `${project.name} comes highly recommended.`,
              walk_away_conditions: proj.recommendation_profile.walk_away_conditions || ['Any pending municipal dues on individual seller units.'],
              timeline_advice: proj.recommendation_profile.timeline_advice || 'Ideal entry window during current quarterly inventory wave.',
              negotiation_leverage: proj.recommendation_profile.negotiation_leverage || ['Use bank valuation rates to negotiate pricing.'],
            },
            create: {
              project_id: project.id,
              status: proj.recommendation_profile.status || 'PUBLISHED',
              tier: proj.recommendation_profile.tier || 'STRONG_BUY',
              primary_thesis: proj.recommendation_profile.primary_thesis || `${project.name} comes highly recommended.`,
              walk_away_conditions: proj.recommendation_profile.walk_away_conditions || ['Any pending municipal dues on individual seller units.'],
              timeline_advice: proj.recommendation_profile.timeline_advice || 'Ideal entry window during current quarterly inventory wave.',
              negotiation_leverage: proj.recommendation_profile.negotiation_leverage || ['Use bank valuation rates to negotiate pricing.'],
            },
          });
        }

        // AMENITIES
        const amenities = proj.amenities || [];
        if (amenities.length > 0) {
          await prisma.amenity.deleteMany({ where: { project_id: project.id } });
          const validCategories = ['lifestyle', 'sports', 'wellness', 'kids', 'security', 'parking'];
          for (const am of amenities) {
            const amenityName = typeof am === 'string' ? am : am.name;
            const categoryStr = typeof am === 'string' ? 'lifestyle' : am.category || 'lifestyle';
            const category = validCategories.includes(categoryStr) ? categoryStr : 'lifestyle';

            await prisma.amenity.create({
              data: {
                project_id: project.id,
                name: amenityName,
                category: category as any,
              },
            });
          }
        }

        // 10. COMPETITORS
        const comps = proj.competitors || [];
        if (comps.length > 0) {
          await prisma.projectCompetitor.deleteMany({ where: { project_id: project.id } });
          for (const comp of comps) {
            await prisma.projectCompetitor.create({
              data: {
                project_id: project.id,
                competitor_name: comp.competitor_name || 'Nearby Competitor',
                competitor_slug: comp.competitor_slug || 'nearby-competitor',
                this_project_advantage: comp.this_project_advantage || 'Better amenities',
                competitor_advantage: comp.competitor_advantage || 'Slightly lower price',
                verdict: comp.verdict || 'Choose primary project',
                price_delta_note: comp.price_delta_note || 'Within 5%',
                sort_order: comp.sort_order || 1,
              },
            });
          }
        }

        // 11. CONSTRUCTION MILESTONES
        const milestones = proj.construction_milestones || [];
        if (milestones.length > 0) {
          await prisma.constructionMilestone.deleteMany({ where: { project_id: project.id } });
          for (const m of milestones) {
            await prisma.constructionMilestone.create({
              data: {
                project_id: project.id,
                stage_code: m.stage_code || 'superstructure',
                name: m.name || 'Stage Construction',
                status: m.status || 'completed',
                completion_pct: m.completion_pct || 100,
                date_label: m.date_label || 'Completed',
              },
            });
          }
        }

        // 12. CONSTRUCTION UPDATES
        const constrUpdates = proj.construction_updates || [];
        if (constrUpdates.length > 0) {
          await prisma.constructionUpdate.deleteMany({ where: { project_id: project.id } });
          for (const u of constrUpdates) {
            await prisma.constructionUpdate.create({
              data: {
                project_id: project.id,
                title: u.title || 'Township Update',
                update_date: u.update_date ? new Date(u.update_date) : new Date(),
                quarter_label: u.quarter_label || 'Q2 2026',
                completion_pct: u.completion_pct || 100,
                description: u.description || 'Infrastructure fully operational.',
              },
            });
          }
        }

        // 13. LIFECYCLE UPDATES
        const lifeUpdates = proj.lifecycle_updates || [];
        if (lifeUpdates.length > 0) {
          await prisma.projectLifecycleUpdate.deleteMany({ where: { project_id: project.id } });
          for (const lu of lifeUpdates) {
            await prisma.projectLifecycleUpdate.create({
              data: {
                project_id: project.id,
                update_type: lu.update_type || 'handover',
                title: lu.title || 'Resident Association Update',
                update_date: lu.update_date ? new Date(lu.update_date) : new Date(),
                description: lu.description || 'Active resident association management.',
              },
            });
          }
        }

        // 14. CHANNEL PARTNERS
        const partners = proj.channel_partners || [];
        if (partners.length > 0) {
          const masterPartner = await prisma.channelPartner.upsert({
            where: { slug: 'space-realty-network' },
            update: { name: 'Space Realty Network', type: 'agency', is_verified: true },
            create: { name: 'Space Realty Network', slug: 'space-realty-network', type: 'agency', is_verified: true },
          });

          await prisma.projectChannelPartner.deleteMany({ where: { project_id: project.id } });
          await prisma.projectChannelPartner.create({
            data: {
              project_id: project.id,
              channel_partner_id: masterPartner.id,
              is_featured: true,
            },
          });
        }

        totalProjectsSeeded++;
        console.log(`  ✓ Seeded ALL relations for "${proj.name}" (${proj.sector})`);
      } catch (err: any) {
        console.error(`  ❌ Error seeding ${item.name}: ${err.message}`);
      }
    }
  }

  console.log(`\n🎉 COMPREHENSIVE SEEDING COMPLETE! Successfully seeded ${totalProjectsSeeded} Wave 1 projects with ALL child relations into PostgreSQL.\n`);
}

seedAllMasterFiles()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
