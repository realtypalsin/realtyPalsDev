import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedEliteX() {
  console.log('🌱 Seeding Elite X project data...')

  try {
    // 1. Find or create builder
    let builder = await prisma.builder.findUnique({
      where: { name: 'Elite Group' }
    })

    const builderData = {
      name: 'Elite Group',
      slug: 'elite-group',
      company_overview: 'Elite Group was established in July 2010 with HR Oracle Developers Pvt Ltd as its flagship company, combining the 35+ years of real estate experience of HR Buildcon and Oracle Real Tech. Renowned for delivering high-quality residential landmarks such as Elite Homz and Elite Golfgreens on time, Elite Group represents trust and excellence in the Delhi NCR real estate landscape.',
      founded_year: 2010,
      delivered_units: 1500,
      rera_compliance_score: 98,
      tagline: 'Trust and Excellence'
    }

    if (!builder) {
      builder = await prisma.builder.create({
        data: builderData
      })
      console.log('✓ Created Elite Group builder')
    } else {
      builder = await prisma.builder.update({
        where: { id: builder.id },
        data: builderData
      })
      console.log('✓ Updated Elite Group builder')
    }

    // 2. Find or create Elite X project
    let project = await prisma.project.findUnique({
      where: { slug: 'elite-x-sector-10-greater-noida-west' }
    })

    const projectData = {
      name: 'Elite X',
      slug: 'elite-x-sector-10-greater-noida-west',
      builder: { connect: { id: builder.id } },
      sector: '10',
      city: 'Greater Noida West',
      status: 'under_construction' as const,
      tagline: 'Crafted for Elite Living in Noida Extension',
      rera_number: 'UPRERAPRJ916631/02/2024',
      total_towers: 6,
      floors: 'G+28',
      total_units: 630,
      land_area_acres: 5.44,
      price_min_cr: 1.85,
      price_range_label: '₹1.85 Cr - ₹3.14 Cr+',
      possession_label: 'December 2028',
      possession_date: new Date('2028-12-12T00:00:00Z'),
      launch_date: new Date('2024-02-01'),
      architect: 'Confluence Consultancy Services',
      interior_designer: 'Confluence Consultancy Services',
      open_space_pct: 80,
      green_rating: 'IGBC Green Rated',
      project_type: 'Residential',
      schools_nearby_count: 3,
      hospitals_nearby_count: 2,
      shopping_nearby_count: 3,
      banks_nearby_count: 1,
      restaurants_nearby_count: 0,
      lat: 28.341839,
      lng: 77.285467,
      marketing_claims: [
        'Premium residencies with 80% ground open area',
        'Surrounded by pristine manicured landscapes',
        'Low density luxury living with only 6 towers over 5.44 acres',
        'Mivan shuttering construction for high durability',
        'Strategic placement directly on 100m wide arterial road'
      ],
      ai_search_keywords: ['elite x', 'sector 10 noida extension', 'mivan Noida Extension', 'luxury 3bhk greater noida west']
    }

    if (!project) {
      project = await prisma.project.create({
        data: projectData
      })
      console.log('✓ Created Elite X project')
    } else {
      project = await prisma.project.update({
        where: { id: project.id },
        data: projectData
      })
      console.log('✓ Updated Elite X project')
    }

    // 3. Clear and seed amenities
    await prisma.amenity.deleteMany({ where: { project_id: project.id } })
    const topAmenities = [
      { name: "World-class Gym", category: "sports" as const },
      { name: "Tranquil Swimming Pool", category: "sports" as const },
      { name: "Serene Spa", category: "wellness" as const },
      { name: "Hobby Studio", category: "lifestyle" as const },
      { name: "Integrated Business Centre", category: "lifestyle" as const },
      { name: "24/7 Multi-tier CCTV Security", category: "security" as const }
    ]
    for (const am of topAmenities) {
      await prisma.amenity.create({
        data: {
          project_id: project.id,
          name: am.name,
          category: am.category
        }
      })
    }
    console.log('✓ Seeded amenities')

    // 4. Clear and seed UnitTypes
    await prisma.unitType.deleteMany({ where: { project_id: project.id } })
    const unitTypes = [
      {
        name: "3 BHK Type A",
        bhk: 3,
        super_area_sqft: 1800.0,
        carpet_area_sqft: 968.0,
        balcony_area_sqft: 160,
        price_min_cr: 1.85,
        price_max_cr: 2.10,
        price_label: "₹1.85 Cr",
        category_badge: "Luxury Executive",
        perfect_for: ["Premium Executives", "Growing Families"],
        views: [
          {
            image_url: "/assets/projects/elite-x/views/central_park_view.jpg",
            title: "Overlooking the lush Central Green and Jogging Track",
            subtitle: "Central Green"
          }
        ]
      },
      {
        name: "3 BHK Type B",
        bhk: 3,
        super_area_sqft: 2110.0,
        carpet_area_sqft: 1138.0,
        balcony_area_sqft: 210,
        price_min_cr: 2.19,
        price_max_cr: 2.42,
        price_label: "₹2.19 Cr",
        category_badge: "Elite Premium",
        perfect_for: ["Remote Workers", "Premium Families"],
        views: [
          {
            image_url: "/assets/projects/elite-x/views/clubhouse_view.jpg",
            title: "Facing the majestic multi-level clubhouse and leisure pool",
            subtitle: "Clubhouse"
          }
        ]
      },
      {
        name: "4 BHK Premium Mansion",
        bhk: 4,
        super_area_sqft: 2632.0,
        carpet_area_sqft: 1426.0,
        balcony_area_sqft: 280,
        price_min_cr: 2.99,
        price_max_cr: 3.14,
        price_label: "₹2.99 Cr",
        category_badge: "Elite Flagship",
        perfect_for: ["HNIs", "Large Families"],
        views: [
          {
            image_url: "/assets/projects/elite-x/views/skyline_wrap.jpg",
            title: "Stunning 270-degree views of the Greater Noida skyline",
            subtitle: "Skyline"
          }
        ]
      }
    ]

    for (const ut of unitTypes) {
      await prisma.unitType.create({
        data: {
          project_id: project.id,
          name: ut.name,
          bhk: ut.bhk,
          super_area_sqft: ut.super_area_sqft,
          carpet_area_sqft: ut.carpet_area_sqft,
          balcony_area_sqft: ut.balcony_area_sqft,
          price_min_cr: ut.price_min_cr,
          price_max_cr: ut.price_max_cr,
          price_label: ut.price_label,
          category_badge: ut.category_badge,
          perfect_for: ut.perfect_for,
          views: ut.views as any
        }
      })
    }
    console.log('✓ Seeded unit types')

    // 5. Clear and seed connectivity
    await prisma.connectivity.deleteMany({ where: { project_id: project.id } })
    const connectivity = [
      { name: "Sarvottam International School", distance_km: 0.4, type: "school" as const },
      { name: "GD Goenka International School", distance_km: 0.9, type: "school" as const },
      { name: "The Infinity School", distance_km: 1.5, type: "school" as const },
      { name: "Numed Super Speciality Hospital", distance_km: 1.5, type: "hospital" as const },
      { name: "Yatharth Super Speciality Hospital", distance_km: 3.8, type: "hospital" as const },
      { name: "Canara Bank Sector 10 Branch", distance_km: 0.1, type: "landmark" as const },
      { name: "Golden I Mall", distance_km: 4.5, type: "mall" as const },
      { name: "Gaur City Mall", distance_km: 6.2, type: "mall" as const },
      { name: "Sector 52 Metro Station", distance_km: 15.0, type: "metro" as const }
    ]
    for (const conn of connectivity) {
      await prisma.connectivity.create({
        data: {
          project_id: project.id,
          name: conn.name,
          distance_km: conn.distance_km,
          type: conn.type
        }
      })
    }
    console.log('✓ Seeded connectivity')

    // 6. Clear and seed documents
    await prisma.projectDocument.deleteMany({ where: { project_id: project.id } })
    await prisma.projectDocument.create({
      data: {
        project_id: project.id,
        project_slug: project.slug,
        name: "Official Elite X Brochure",
        storage_url: "https://storage.realtypals.com/documents/elite-x-brochure.pdf",
        doc_type: "brochure",
        file_size_bytes: 5120000
      }
    })
    await prisma.projectDocument.create({
      data: {
        project_id: project.id,
        project_slug: project.slug,
        name: "Elite X Unit Layout Plans",
        storage_url: "https://storage.realtypals.com/documents/elite-x-layouts.pdf",
        doc_type: "floor_plan",
        file_size_bytes: 4190000
      }
    })
    console.log('✓ Seeded documents')

    // 7. Seed DecisionProfile & Intelligence Data
    const intelligenceJson = {
      topLevelMetrics: {
        overallScore: 88,
        tier: 'STRONG_BUY',
        investmentGrade: 'A',
        priceAdvantage: '+12%',
        priceAdvantageSubtext: 'Premium',
        confidenceLevel: 'High',
        confidenceLabel: 'Highly Reliable'
      },
      dimensionScores: {
        builderTrust: { score: 98, status: 'Verified' },
        locationQuality: { score: 89, status: 'Verified' },
        lifestyleAmenities: { score: 90, status: 'Verified' },
        valueForMoney: { score: 82, status: 'Verified' },
        appreciationPotential: { score: 89, status: 'Verified' },
        legalSafety: { score: 98, status: 'Verified' }
      },
      buyerPersonas: [
        {
          type: 'C-Suite Executives & Business Owners',
          stars: 5,
          headline: 'Luxury & Space Optimization',
          reasons: [
            'Proximity to commercial powerhouses opposite Knowledge Park V.',
            'Spacious 4 BHK layouts with dedicated helper suites and separate entrances.'
          ]
        },
        {
          type: 'Growing Premium Families',
          stars: 5,
          headline: 'Child Infrastructure & Education Accent',
          reasons: [
            'Walking distance to Sarvottam and GD Goenka International Schools.',
            'Excellent gated security with multi-level checks and secure play zones.'
          ]
        },
        {
          type: 'HNI Capital Investors',
          stars: 5,
          headline: 'High-Density Insulation & Land Share',
          reasons: [
            'Only 630 units on 5.44 acres securing extremely high undivided land share.',
            'High-end Mivan shuttering construction ensuring stellar capital appreciation.'
          ]
        }
      ],
      riskRadar: [
        {
          type: 'Execution Timeline',
          level: 'High Risk',
          description: 'Official possession Dec 2028 requires active monitoring of construction pace.'
        },
        {
          type: 'Metro Transit Dependence',
          level: 'Medium Risk',
          description: 'Appreciation catalyzed by proposed Aqua Line Metro extension route approvals.'
        },
        {
          type: 'Localized Development',
          level: 'Low Risk',
          description: 'Temporary construction noise/dust as Sector 10 continues fully maturing.'
        }
      ],
      transparency_checks: [
        {
          label: 'RERA Registered',
          ok: true,
          details: 'Approved under registration ID UPRERAPRJ916631/02/2024.'
        },
        {
          label: 'GNIDA Lease Approval',
          ok: true,
          details: 'Approved under a registered 90-year lease deed on 09/06/2023 for Plot GH-03A.'
        },
        {
          label: 'Municipal Plan Approved',
          ok: true,
          details: 'Building plans approved by GNIDA under Plan No. PLG/BP SM-16-Jun-2023:18293 dated 13/12/2023.'
        }
      ],
      investment_insights: {
        appreciation_annual: '12-16%',
        appreciation_desc: 'Expected annual appreciation driven by high-growth corridor opposite KP-V.',
        rental_yield: '4-5%',
        rental_desc: 'Robust rental demand due to C-suite executive hub expansion.',
        market_trend: 'Bullish',
        market_desc: 'Sector 10 Noida Extension is one of Noida\'s highest growth enclaves.',
        liquidity_score: 'High',
        liquidity_desc: 'Extremely high exits due to low unit density (only 630 premium residences).'
      },
      quick_commutes: [
        { destination: "Noida Sector 52 Metro", time: "15 Mins", icon: "train" },
        { destination: "Knowledge Park V", time: "5 Mins", icon: "briefcase" }
      ],
      location_highlights: [
        {
          title: "Aqua Line Metro Extension",
          time: "At Doorstep",
          description: "Proposed metro station located just outside the society gates.",
          icon: "train"
        }
      ],
      nearby_essentials: {
        "Schools": [
          { name: "DPS Noida Extension", dist: "2.5 km" },
          { name: "Sarvottam International", dist: "3.2 km" }
        ],
        "Hospitals": [
          { name: "Yatharth Super Speciality", dist: "4.5 km" }
        ],
        "Shopping": [
          { name: "Gaur City Mall", dist: "6.0 km" }
        ]
      },
      neighborhood_advantages: [
        {
          title: "Rapid Metro Expansion",
          description: "Immediate access to the proposed metro line.",
          icon: "train"
        }
      ]
    }

    await prisma.decisionProfile.upsert({
      where: { project_id: project.id },
      update: {
        status: 'PUBLISHED',
        decision_thesis: 'Elite X stands as one of Sector 10\'s premier premium residential offerings, featuring ultra-low-density planning with just 6 towers across 5.44 acres. While it carries a premium price point, its extensive 80% ground open green area, high-end Mivan shuttering construction, and large-format 3 BHK and 4 BHK layouts make it a highly attractive destination for luxury end-users and long-term investors.',
        why_buy: [
          'Extremely low-density planning with only 630 apartments across 5.44 acres (approx. 116 units/acre).',
          'Generous starting sizes of 1,800 sq.ft. for 3 BHK configurations, avoiding compact layouts.',
          'Robust Mivan shuttering construction technology with a structural plan designed by Confluence.',
          '80% ground open area designed with lush landscapes, leisure pools, and dedicated play zones.',
          'Unmatched location advantages on a major 100-meter wide arterial road near premium schools.'
        ],
        why_avoid: [
          'Premium pricing (~₹11,500/sq.ft.) compared to Sector 10\'s average under-construction baseline (~₹10,500/sq.ft.).',
          'The standard wait for an under-construction project, with possession slated for December 2028.',
          'Dependence on public infrastructure completion (e.g., the proposed Aqua Line Metro extension in Sector 10).'
        ],
        intelligence_data: intelligenceJson,
        last_verified_at: new Date(),
        verified_by: 'seed'
      },
      create: {
        project_id: project.id,
        status: 'PUBLISHED',
        decision_thesis: 'Elite X stands as one of Sector 10\'s premier premium residential offerings, featuring ultra-low-density planning with just 6 towers across 5.44 acres. While it carries a premium price point, its extensive 80% ground open green area, high-end Mivan shuttering construction, and large-format 3 BHK and 4 BHK layouts make it a highly attractive destination for luxury end-users and long-term investors.',
        why_buy: [
          'Extremely low-density planning with only 630 apartments across 5.44 acres (approx. 116 units/acre).',
          'Generous starting sizes of 1,800 sq.ft. for 3 BHK configurations, avoiding compact layouts.',
          'Robust Mivan shuttering construction technology with a structural plan designed by Confluence.',
          '80% ground open area designed with leisure pools, and dedicated play zones.',
          'Unmatched location advantages on a major 100-meter wide arterial road near premium schools.'
        ],
        why_avoid: [
          'Premium pricing (~₹11,500/sq.ft.) compared to Sector 10\'s average under-construction baseline (~₹10,500/sq.ft.).',
          'The standard wait for an under-construction project, with possession slated for December 2028.',
          'Dependence on public infrastructure completion (e.g., the proposed Aqua Line Metro extension in Sector 10).'
        ],
        intelligence_data: intelligenceJson,
        last_verified_at: new Date(),
        verified_by: 'seed'
      }
    })
    console.log('✓ Seeded DecisionProfile')

    // 8. Seed Cost Sheet
    const costSheetData = {
      project_id: project.id,
      base_price_per_sqft: 11500.00,
      gst_rate_pct: 5.00,
      stamp_duty_pct: 6.00,
      registration_pct: 1.00,
      parking_cost: 400000.00,
      club_membership: 200000.00,
      ifms: 50.00, // Per sq.ft
      plc_charges: [
        { "label": "Park Facing PLC", "amount_per_sqft": 150.00 },
        { "label": "Corner Unit PLC", "amount_per_sqft": 100.00 },
        { "label": "Floor-wise PLC (1st-5th floors)", "amount_per_sqft": 120.00 }
      ],
      other_charges: []
    }
    await prisma.costSheet.upsert({
      where: { project_id: project.id },
      create: costSheetData,
      update: costSheetData
    })
    console.log('✓ Seeded Cost Sheet')

    // 9. Seed Payment Plan
    const paymentPlanData = {
      project_id: project.id,
      plan_name: 'CLP — Under Construction',
      milestones: [
        { "milestone": "At the Time of Booking", "pct": 10.0, "amt": 1850000.0, "due": "Within 15 days of booking", "done": true },
        { "milestone": "Within 45 Days of Booking", "pct": 40.0, "amt": 7400000.0, "due": "45 Days from booking", "done": false },
        { "milestone": "On Completion of Superstructure", "pct": 20.0, "amt": 3700000.0, "due": "As per physical construction schedule", "done": false },
        { "milestone": "On External Painting of Tower", "pct": 20.0, "amt": 3700000.0, "due": "As per completion of facade", "done": false },
        { "milestone": "At the Time of Offer of Possession", "pct": 10.0, "amt": 1850000.0, "due": "Upon registry & final keys handoff", "done": false }
      ]
    }
    await prisma.paymentPlan.upsert({
      where: { project_id: project.id },
      create: paymentPlanData,
      update: paymentPlanData
    })
    console.log('✓ Seeded Payment Plan')

    console.log('✅ Elite X project seeding complete!')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seedEliteX()
