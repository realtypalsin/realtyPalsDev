import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seed() {
  console.log('🌱 Seeding Aims Max Gardenia Golf City project data...')

  try {
    // 1. Find or create builder
    let builder = await prisma.builder.findFirst({
      where: { name: 'Aims Max Gardenia Developers Private Limited' }
    })

    const builderData = {
      name: 'Aims Max Gardenia Developers Private Limited',
      slug: 'aims-max-gardenia-developers',
      company_overview: 'Established as a joint venture in 2011, Aims Max Gardenia Developers Private Limited was formed by NCR-based real estate groups to construct massive thematic golf townships in Noida. While they executed large-scale landmarks including Golf City and Gardenia Glory, the builder has faced major structural financial distress, severe regulatory penalties, and significant outstanding dues (~₹1,717 Cr) with the Noida Authority, leading to delayed registrations and multiple litigation cycles.',
      founded_year: 2011,
      delivered_units: 3500,
      rera_compliance_score: 35,
      tagline: 'Thematic Townships Creators'
    }

    if (!builder) {
      builder = await prisma.builder.create({
        data: builderData
      })
      console.log('✓ Created Aims Max Gardenia builder')
    } else {
      builder = await prisma.builder.update({
        where: { id: builder.id },
        data: builderData
      })
      console.log('✓ Updated Aims Max Gardenia builder')
    }

    // 2. Find or create Aims Max Gardenia Golf City project
    let project = await prisma.project.findUnique({
      where: { slug: 'aims-max-gardenia-golf-city-sector-75' }
    })

    const projectData = {
      name: 'Aims Max Gardenia Golf City',
      slug: 'aims-max-gardenia-golf-city-sector-75',
      builder: { connect: { id: builder.id } },
      sector: 'Sector 75',
      city: 'Noida',
      status: 'ready_to_move' as const,
      tagline: 'Golf-Centric Lifestyle and Modern Thematic Township',
      hero_image_url: 'https://storage.realtypals.com/projects/aims-max-gardenia-golf-city/hero.jpg',
      rera_number: 'UPRERAPRJ11563',
      total_towers: 25,
      floors: 'G+20',
      total_units: 900,
      land_area_acres: 80.0,
      price_min_cr: 1.58,
      price_range_label: '₹1.58 Cr - ₹3.09 Cr+',
      possession_label: 'Ready to Move',
      possession_date: new Date('2016-12-07T00:00:00Z'),
      launch_date: new Date('2011-02-01T00:00:00Z'),
      architect: 'AIMS Design Cell',
      interior_designer: 'AIMS Design Cell',
      open_space_pct: 80,
      green_rating: 'Thematic Green Layout',
      project_type: 'Residential',
      lat: 28.5760,
      lng: 77.3823,
      marketing_claims: [
        'Spacious themed residential township spread across a massive 80 acres',
        'Golf-centric lifestyle with 80% area dedicated to lush greenery and water bodies',
        'Strategic location opposite Noida Sector 50, right next to key metro connectivity',
        'Grand central clubhouse with dedicated lounge, coffee shop, and banquet hall',
        'Premium configurations of 2, 3, and 4 BHK apartments with great cross-ventilation'
      ],
      ai_search_keywords: ['aims max gardenia golf city', 'golf city sector 75 noida', 'ready to move sector 75 noida', 'golf view 3bhk noida']
    }

    if (!project) {
      project = await prisma.project.create({
        data: projectData
      })
      console.log('✓ Created Aims Max Gardenia Golf City project')
    } else {
      project = await prisma.project.update({
        where: { id: project.id },
        data: projectData
      })
      console.log('✓ Updated Aims Max Gardenia Golf City project')
    }

    // 3. Clear and seed amenities
    await prisma.amenity.deleteMany({ where: { project_id: project.id } })
    const topAmenities = [
      { name: "Golf Course View", category: "lifestyle" as const },
      { name: "Grand Central Clubhouse", category: "lifestyle" as const },
      { name: "Two Distinct Swimming Pools", category: "sports" as const },
      { name: "Olympic-length Adult Pool", category: "sports" as const },
      { name: "Fitness & Yoga Center", category: "wellness" as const },
      { name: "Professional Outdoor Tennis Courts", category: "sports" as const },
      { name: "Full-sized Basketball Court", category: "sports" as const }
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
        name: "2 BHK Comfort Suite",
        bhk: 2,
        super_area_sqft: 1150.0,
        carpet_area_sqft: 747.0,
        price_min_cr: 1.58,
        category_badge: "Executive Value",
        perfect_for: ["Growing Families"],
        views: []
      },
      {
        name: "3 BHK Premium Suite",
        bhk: 3,
        super_area_sqft: 1750.0,
        carpet_area_sqft: 1137.0,
        price_min_cr: 2.40,
        category_badge: "Premium Family",
        perfect_for: ["Growing Families"],
        views: []
      },
      {
        name: "4 BHK Luxury Mansion",
        bhk: 4,
        super_area_sqft: 2250.0,
        carpet_area_sqft: 1462.0,
        price_min_cr: 3.09,
        category_badge: "Golf Flagship",
        perfect_for: ["HNIs", "Large Families"],
        views: []
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
          price_min_cr: ut.price_min_cr,
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
      { name: "Noida Sector 50 Metro Station", distance_km: 1.5, type: "metro" as const },
      { name: "Kothari International School", distance_km: 1.8, type: "school" as const },
      { name: "Neo Hospital Sector 50", distance_km: 3.0, type: "hospital" as const },
      { name: "Logix City Center Sector 32", distance_km: 5.8, type: "mall" as const },
      { name: "Kailash Hospital & Heart Institute", distance_km: 7.5, type: "hospital" as const },
      { name: "Spectrum Metro Mall", distance_km: 0.5, type: "mall" as const },
      { name: "Starling Edge Mall Sector 107", distance_km: 4.2, type: "mall" as const }
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
        name: "Official Aims Max Gardenia Golf City Brochure",
        storage_url: "https://storage.realtypals.com/documents/aims-max-gardenia-golf-city-brochure.pdf",
        doc_type: "brochure",
        file_size_bytes: 5410000
      }
    })
    await prisma.projectDocument.create({
      data: {
        project_id: project.id,
        project_slug: project.slug,
        name: "Aims Max Gardenia Golf City Floor Layouts",
        storage_url: "https://storage.realtypals.com/documents/aims-max-gardenia-golf-city-floorplots.pdf",
        doc_type: "floor_plan",
        file_size_bytes: 4120000
      }
    })
    console.log('✓ Seeded documents')

    // 7. Clear and seed images
    await prisma.projectImage.deleteMany({ where: { project_id: project.id } })
    await prisma.projectImage.create({
      data: {
        project_id: project.id,
        url: "https://storage.realtypals.com/projects/aims-max-gardenia-golf-city/hero.jpg",
        type: "hero"
      }
    })
    console.log('✓ Seeded images')

    // 8. Seed DecisionProfile & Intelligence Data
    const intelligenceJson = {
      topLevelMetrics: {
        overallScore: 62,
        tier: 'BUY_WITH_CAUTION',
        investmentGrade: 'D',
        priceAdvantage: '-16.4%',
        priceAdvantageSubtext: 'Premium Risk',
        confidenceLevel: 'Low',
        confidenceLabel: 'Registry Ban Active'
      },
      dimensionScores: {
        builderTrust: { score: 35, status: 'High Default Risk' },
        locationQuality: { score: 85, status: 'Verified' },
        lifestyleAmenities: { score: 80, status: 'Verified' },
        valueForMoney: { score: 65, status: 'Verified' },
        appreciationPotential: { score: 55, status: 'Stagnant' },
        legalSafety: { score: 30, status: 'Registry Blocked' }
      },
      buyerPersonas: [
        {
          type: 'Golf Enthusiast Families',
          stars: 4,
          headline: 'Serene Microclimate & Massive 80 Acres Layout',
          reasons: [
            'Golf course views and spacious 3-side open layout configurations.',
            'Massive Central Clubhouse and established physical compound.'
          ]
        },
        {
          type: 'Risk-Averse Gated Buyers',
          stars: 1,
          headline: 'Severe Default & Frozen Registries',
          reasons: [
            'Flat registries frozen due to builder defaulting on ₹1,717 Cr dues.',
            'Developer under active litigation and insolvency cycles.'
          ]
        }
      ],
      riskRadar: [
        {
          type: 'Registry Freeze Legal Risk',
          level: 'High Risk',
          description: 'Noida Authority flat registry ban active on 365+ units due to developer land liabilities.'
        },
        {
          type: 'Asset Seizure Risk',
          level: 'High Risk',
          description: 'Noida Authority cancellation warnings issued on builder\'s commercial blocks.'
        }
      ],
      transparency_checks: [
        {
          label: 'RERA Registered',
          ok: true,
          details: 'Registered under RERA ID UPRERAPRJ11563 (Phase 4).'
        },
        {
          label: 'Authority Dues Clear',
          ok: false,
          details: 'Severe default. Builder owes ₹1,717 Cr in outstanding dues to Noida Authority.'
        }
      ],
      investment_insights: {
        appreciation_annual: '4-6%',
        appreciation_desc: 'Muted capital appreciation due to registry freeze and developer defaults.',
        rental_yield: '3.2%',
        rental_desc: 'Decent rental demand due to key central location right opposite Sector 50 Noida.',
        market_trend: 'Bearish',
        market_desc: 'Transaction volumes are low as buyers coordinate resales under outstanding liabilities.',
        liquidity_score: 'Low',
        liquidity_desc: 'Liquidity is severely impacted by active title registry blocks.'
      },
      quick_commutes: [
        { destination: "Sector 50 Metro", time: "4 Mins", icon: "train" },
        { destination: "Kothari School", time: "5 Mins", icon: "school" },
        { destination: "Neo Hospital Sector 50", time: "8 Mins", icon: "hospital" }
      ],
      location_highlights: [
        {
          title: "Opposite Sector 50 Central",
          time: "Immediate Access",
          description: "Located right next to Noida's primary commercial and residential core.",
          icon: "map-pin"
        }
      ],
      nearby_essentials: {
        "Schools": [
          { name: "Kothari International School", dist: "1.8 km" },
          { name: "Ramagya School Noida", dist: "2.1 km" }
        ],
        "Hospitals": [
          { name: "Neo Hospital Sector 50", dist: "3.0 km" }
        ],
        "Shopping": [
          { name: "Spectrum Metro Mall", dist: "0.5 km" }
        ]
      },
      neighborhood_advantages: [
        {
          title: "Established Golf Community",
          description: "Massive township with vast landscaped environments.",
          icon: "shield"
        }
      ]
    }

    await prisma.decisionProfile.upsert({
      where: { project_id: project.id },
      update: {
        status: 'PUBLISHED',
        decision_thesis: 'Aims Max Gardenia Golf City offers a serene, golf-centric lifestyle with unmatched open green spaces and massive 80-acre microclimate living in Sector 75 Noida, but severe builder financial defaults and frozen apartment registries make it a high-risk purchase that must be approached with extreme legal caution.',
        why_buy: [
          'Spacious, thematic golf-centric living with 80% dedicated to open green areas and water bodies.',
          'Established, fully constructed ready-to-move-in property with no ongoing construction delays.',
          'Excellent regional connectivity opposite Noida Sector 50, with easy access to schools and hospitals.',
          'Impressive sports and leisure infrastructure, including multiple swimming pools and tennis/basketball courts.',
          'Spacious and well-ventilated apartment layouts with three-side open design.'
        ],
        why_avoid: [
          'Severe financial distress: The developer owes over ₹1,717 Cr in outstanding dues to the Noida Authority.',
          'Frozen Registries: Around 365+ units in the development face flat registration bans due to unpaid developer liabilities.',
          'Sub-par maintenance and upkeep issues stemming from active builder insolvency disputes and local litigation.',
          'Risk of asset attachment: Noida Authority has previously issued orders to cancel commercial land allotments and seize unsold inventory.'
        ],
        intelligence_data: intelligenceJson,
        last_verified_at: new Date(),
        verified_by: 'seed'
      },
      create: {
        project_id: project.id,
        status: 'PUBLISHED',
        decision_thesis: 'Aims Max Gardenia Golf City offers a serene, golf-centric lifestyle with unmatched open green spaces and massive 80-acre microclimate living in Sector 75 Noida, but severe builder financial defaults and frozen apartment registries make it a high-risk purchase that must be approached with extreme legal caution.',
        why_buy: [
          'Spacious, thematic golf-centric living with 80% dedicated to open green areas and water bodies.',
          'Established, fully constructed ready-to-move-in property with no ongoing construction delays.',
          'Excellent regional connectivity opposite Noida Sector 50, with easy access to schools and hospitals.',
          'Impressive sports and leisure infrastructure, including multiple swimming pools and tennis/basketball courts.',
          'Spacious and well-ventilated apartment layouts with three-side open design.'
        ],
        why_avoid: [
          'Severe financial distress: The developer owes over ₹1,717 Cr in outstanding dues to the Noida Authority.',
          'Frozen Registries: Around 365+ units in the development face flat registration bans due to unpaid developer liabilities.',
          'Sub-par maintenance and upkeep issues stemming from active builder insolvency disputes and local litigation.',
          'Risk of asset attachment: Noida Authority has previously issued orders to cancel commercial land allotments and seize unsold inventory.'
        ],
        intelligence_data: intelligenceJson,
        last_verified_at: new Date(),
        verified_by: 'seed'
      }
    })
    console.log('✓ Seeded DecisionProfile')

    // 9. Seed Cost Sheet
    const costSheetData = {
      project_id: project.id,
      base_price_per_sqft: 13500.00,
      gst_rate_pct: 0.00,
      stamp_duty_pct: 6.00,
      registration_pct: 1.00,
      parking_cost: 350000.00,
      club_membership: 150000.00,
      ifms: 50.00,
      plc_charges: [
        { "label": "Golf Course Facing PLC", "amount_per_sqft": 250.00 },
        { "label": "Corner Unit PLC", "amount_per_sqft": 100.00 }
      ],
      other_charges: []
    }
    await prisma.costSheet.upsert({
      where: { project_id: project.id },
      create: costSheetData,
      update: costSheetData
    })
    console.log('✓ Seeded Cost Sheet')

    // 10. Seed Payment Plan
    const paymentPlanData = {
      project_id: project.id,
      plan_name: 'Resale Possesion Plan',
      milestones: [
        { "milestone": "At the Time of Booking", "pct": 10.0, "amt": 1580000.0, "due": "Immediate", "done": true },
        { "milestone": "Within 30 Days of Booking", "pct": 40.0, "amt": 6320000.0, "due": "30 days from booking", "done": true },
        { "milestone": "On Registry and Possession", "pct": 50.0, "amt": 7900000.0, "due": "Registry execution and final keys handoff", "done": false }
      ]
    }
    await prisma.paymentPlan.upsert({
      where: { project_id: project.id },
      create: paymentPlanData,
      update: paymentPlanData
    })
    console.log('✓ Seeded Payment Plan')

    console.log('✅ Aims Max Gardenia Golf City project seeding complete!')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seed()
