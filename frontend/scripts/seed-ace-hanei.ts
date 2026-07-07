import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seed() {
  console.log('🌱 Seeding ACE Han\'ei project data...')

  try {
    // 1. Find or create builder
    let builder = await prisma.builder.findFirst({
      where: { name: 'ACE Group' }
    })

    const builderData = {
      name: 'ACE Group',
      slug: 'ace-group',
      company_overview: 'Established in 2010, ACE Group is one of NCR\'s most prestigious and trusted luxury real estate developers, renowned for on-time delivery, premium structural quality, and architectural innovations. With landmark deliveries like Ace Golfshire, Ace Parkway, Ace Divino, and Ace City, the builder continues to set quality benchmarks across Noida and Greater Noida West.',
      founded_year: 2010,
      delivered_units: 10000,
      rera_compliance_score: 98,
      tagline: 'Fulfill Your Luxury Dreams'
    }

    if (!builder) {
      builder = await prisma.builder.create({
        data: builderData
      })
      console.log('✓ Created ACE Group builder')
    } else {
      builder = await prisma.builder.update({
        where: { id: builder.id },
        data: builderData
      })
      console.log('✓ Updated ACE Group builder')
    }

    // 2. Find or create ACE Han'ei project
    let project = await prisma.project.findUnique({
      where: { slug: 'ace-hanei-sector-12' }
    })

    const projectData = {
      name: 'ACE Han\'ei',
      slug: 'ace-hanei-sector-12',
      builder: { connect: { id: builder.id } },
      sector: 'Sector 12',
      city: 'Greater Noida',
      status: 'under_construction' as const,
      tagline: 'A New Paradigm of Premium Luxury Residencies',
      hero_image_url: 'https://storage.realtypals.com/projects/ace-hanei/hero.jpg',
      rera_number: 'UPRERAPRJ677887/10/2024',
      total_towers: 7,
      floors: 'G+25',
      total_units: 518,
      land_area_acres: 6.42,
      price_min_cr: 2.49,
      price_range_label: '₹2.49 Cr - ₹5.48 Cr+',
      possession_label: 'December 2028',
      possession_date: new Date('2028-12-31T00:00:00Z'),
      launch_date: new Date('2024-10-15T00:00:00Z'),
      architect: 'Confluence Consultancy Services',
      interior_designer: 'Confluence Consultancy Services',
      open_space_pct: 80,
      green_rating: 'IGBC Platinum Certified',
      project_type: 'Residential',
      lat: 28.560586,
      lng: 77.486667,
      marketing_claims: [
        'Ultra-luxury 3.5 & 4.5 BHK palatial residences with helper quarters',
        'Extremely low-density planning with only 518 units in 6.42 acres',
        'Unique four-side open layout ensuring maximum ventilation and sunlight',
        'Only 2 residences per floor with 4 high-speed elevators per tower',
        'Mivan shuttering construction with exceptional ceiling heights (11-11.5 ft)'
      ],
      ai_search_keywords: ['ace hanei', 'sector 12 greater noida west', 'low density greater noida west', 'luxury 4bhk greater noida']
    }

    if (!project) {
      project = await prisma.project.create({
        data: projectData
      })
      console.log('✓ Created ACE Han\'ei project')
    } else {
      project = await prisma.project.update({
        where: { id: project.id },
        data: projectData
      })
      console.log('✓ Updated ACE Han\'ei project')
    }

    // 3. Clear and seed amenities
    await prisma.amenity.deleteMany({ where: { project_id: project.id } })
    const topAmenities = [
      { name: "50,000 sq.ft. Luxury Clubhouse", category: "lifestyle" as const },
      { name: "Designer Lagoon Swimming Pool", category: "sports" as const },
      { name: "Fully-Equipped Gym & Wellness Centre", category: "wellness" as const },
      { name: "Indoor Badminton Court & Squash Court", category: "sports" as const }
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
        name: "3 BHK + 3T + Servant",
        bhk: 3,
        super_area_sqft: 2290.0,
        carpet_area_sqft: 1397.0,
        price_min_cr: 2.49,
        category_badge: "Luxury Suite",
        perfect_for: ["Premium Families"],
        views: []
      },
      {
        name: "4 BHK + 4T + Servant",
        bhk: 4,
        super_area_sqft: 3200.0,
        carpet_area_sqft: 1950.0,
        price_min_cr: 3.52,
        category_badge: "Executive Mansion",
        perfect_for: ["HNIs"],
        views: []
      },
      {
        name: "4.5 BHK + 5T + Servant (XL)",
        bhk: 4,
        super_area_sqft: 4190.0,
        carpet_area_sqft: 2560.0,
        price_min_cr: 4.62,
        category_badge: "Flagship Luxury",
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
      { name: "Sarvottam International School", distance_km: 0.3, type: "school" as const },
      { name: "GD Goenka International School", distance_km: 0.7, type: "school" as const },
      { name: "The Infinity School", distance_km: 1.8, type: "school" as const },
      { name: "Numed Super Speciality Hospital", distance_km: 1.5, type: "hospital" as const },
      { name: "Yatharth Super Speciality Hospital", distance_km: 3.8, type: "hospital" as const },
      { name: "Gaur City Mall", distance_km: 5.5, type: "mall" as const },
      { name: "Golden I Commercial Hub", distance_km: 4.2, type: "mall" as const }
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
        name: "Official ACE Han'ei Brochure",
        storage_url: "https://storage.realtypals.com/documents/ace-hanei-brochure.pdf",
        doc_type: "brochure",
        file_size_bytes: 5840000
      }
    })
    await prisma.projectDocument.create({
      data: {
        project_id: project.id,
        project_slug: project.slug,
        name: "ACE Han'ei Unit Blueprints Portfolio",
        storage_url: "https://storage.realtypals.com/documents/ace-hanei-layouts.pdf",
        doc_type: "floor_plan",
        file_size_bytes: 4210000
      }
    })
    console.log('✓ Seeded documents')

    // 7. Clear and seed images
    await prisma.projectImage.deleteMany({ where: { project_id: project.id } })
    await prisma.projectImage.create({
      data: {
        project_id: project.id,
        url: "https://storage.realtypals.com/projects/ace-hanei/hero.jpg",
        type: "hero"
      }
    })
    console.log('✓ Seeded images')

    // 8. Seed DecisionProfile & Intelligence Data
    const intelligenceJson = {
      topLevelMetrics: {
        overallScore: 90,
        tier: 'STRONG_BUY',
        investmentGrade: 'A',
        priceAdvantage: '+12%',
        priceAdvantageSubtext: 'Premium',
        confidenceLevel: 'High',
        confidenceLabel: 'Highly Reliable'
      },
      dimensionScores: {
        builderTrust: { score: 98, status: 'Verified' },
        locationQuality: { score: 88, status: 'Verified' },
        lifestyleAmenities: { score: 90, status: 'Verified' },
        valueForMoney: { score: 82, status: 'Verified' },
        appreciationPotential: { score: 89, status: 'Verified' },
        legalSafety: { score: 98, status: 'Verified' }
      },
      buyerPersonas: [
        {
          type: 'C-Suite Executives',
          stars: 5,
          headline: 'Ultra-Luxury & Exclusive Density',
          reasons: [
            'Only 2 apartments per floor and low density configuration.',
            'Spacious layouts with 11.5-foot clear ceiling heights and helper quarters.'
          ]
        },
        {
          type: 'Young Growing Families',
          stars: 5,
          headline: 'Education Proximity & Safety',
          reasons: [
            'Directly walkable to GD Goenka and Sarvottam International Schools.',
            'Massive clubhouse and gated sports play zones.'
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
        }
      ],
      transparency_checks: [
        {
          label: 'RERA Registered',
          ok: true,
          details: 'Approved under registration ID UPRERAPRJ677887/10/2024.'
        },
        {
          label: 'Leasehold Sanctions',
          ok: true,
          details: 'Land title and layout plans fully cleared by local development authority.'
        }
      ],
      investment_insights: {
        appreciation_annual: '12-16%',
        appreciation_desc: 'Robust capital appreciation driven by premium positioning in high-growth Sector 12.',
        rental_yield: '4.0%',
        rental_desc: 'Strong rental yields expected from high-income NCR executive professionals.',
        market_trend: 'Bullish',
        market_desc: 'Sector 12 Greater Noida West is emerging as Noida Extension\'s premium luxury enclave.',
        liquidity_score: 'High',
        liquidity_desc: 'Very high resale exit interest due to trusted developer brand equity.'
      },
      quick_commutes: [
        { destination: "Sarvottam School", time: "1 Min", icon: "school" },
        { destination: "GD Goenka School", time: "2 Mins", icon: "school" },
        { destination: "Gaur City Mall", time: "10 Mins", icon: "shopping" }
      ],
      location_highlights: [
        {
          title: "Proposed Sector 12 Metro",
          time: "12 Mins",
          description: "Proposed metro line connection nearby.",
          icon: "train"
        }
      ],
      nearby_essentials: {
        "Schools": [
          { name: "Sarvottam International School", dist: "0.3 km" },
          { name: "GD Goenka International School", dist: "0.7 km" }
        ],
        "Hospitals": [
          { name: "Numed Super Speciality Hospital", dist: "1.5 km" }
        ],
        "Shopping": [
          { name: "Gaur City Mall", dist: "5.5 km" }
        ]
      },
      neighborhood_advantages: [
        {
          title: "Premium Luxury Enclave",
          description: "Sector 12 represents low-density master planning and elite communities.",
          icon: "shield"
        }
      ]
    }

    await prisma.decisionProfile.upsert({
      where: { project_id: project.id },
      update: {
        status: 'PUBLISHED',
        decision_thesis: 'ACE Han\'ei stands as Sector 12\'s premier low-density luxury address, delivering massive mansion-sized configurations, exclusive 2-units-per-floor privacy, and superior structural specifications under NCR\'s most trusted premium developer brand.',
        why_buy: [
          'Highly exclusive low density with only 518 total apartments across 6.42 acres (approx. 80 units/acre).',
          'Exceptional privacy featuring only 2 apartments per floor served by 4 high-speed elevators.',
          'Superior clear ceiling heights: 11-foot clear height for 3 BHK layouts and 11.5-foot height for 4 BHK layouts.',
          'Grand multi-level 50,000 sq.ft. luxury clubhouse with premium resort amenities.',
          'Outstanding developer delivery track record with verified on-time project completions.'
        ],
        why_avoid: [
          'Highly premium ticket sizes starting from ₹2.49 Cr, which is above Sector 12\'s standard residential entry barrier.',
          'The standard waiting period associated with an under-construction project, with possession set for Dec 2028.',
          'Local transit ease is highly dependent on the execution of Noida Extension\'s proposed metro routes.'
        ],
        intelligence_data: intelligenceJson,
        last_verified_at: new Date(),
        verified_by: 'seed'
      },
      create: {
        project_id: project.id,
        status: 'PUBLISHED',
        decision_thesis: 'ACE Han\'ei stands as Sector 12\'s premier low-density luxury address, delivering massive mansion-sized configurations, exclusive 2-units-per-floor privacy, and superior structural specifications under NCR\'s most trusted premium developer brand.',
        why_buy: [
          'Highly exclusive low density with only 518 total apartments across 6.42 acres (approx. 80 units/acre).',
          'Exceptional privacy featuring only 2 apartments per floor served by 4 high-speed elevators.',
          'Superior clear ceiling heights: 11-foot clear height for 3 BHK layouts and 11.5-foot height for 4 BHK layouts.',
          'Grand multi-level 50,000 sq.ft. luxury clubhouse with premium resort amenities.',
          'Outstanding developer delivery track record with verified on-time project completions.'
        ],
        why_avoid: [
          'Highly premium ticket sizes starting from ₹2.49 Cr, which is above Sector 12\'s standard residential entry barrier.',
          'The standard waiting period associated with an under-construction project, with possession set for Dec 2028.',
          'Local transit ease is highly dependent on the execution of Noida Extension\'s proposed metro routes.'
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
      base_price_per_sqft: 11500.00,
      gst_rate_pct: 5.00,
      stamp_duty_pct: 6.00,
      registration_pct: 1.00,
      parking_cost: 400000.00,
      club_membership: 250000.00,
      ifms: 50.00,
      plc_charges: [
        { "label": "Park/Pool Facing PLC", "amount_per_sqft": 150.00 },
        { "label": "Corner Unit PLC", "amount_per_sqft": 100.00 },
        { "label": "High Floor PLC (15th Floor & Above)", "amount_per_sqft": 120.00 }
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
      plan_name: 'CLP — Under Construction',
      milestones: [
        { "milestone": "At the Time of Booking", "pct": 10.0, "amt": 2490000.0, "due": "Immediate", "done": true },
        { "milestone": "Within 45 Days of Booking", "pct": 40.0, "amt": 9960000.0, "due": "45 days from booking", "done": false },
        { "milestone": "On Completion of Superstructure", "pct": 20.0, "amt": 4980000.0, "due": "Structural completion", "done": false },
        { "milestone": "On External Painting of Tower", "pct": 20.0, "amt": 4980000.0, "due": "Facade painting completion", "done": false },
        { "milestone": "At the Time of Offer of Possession", "pct": 10.0, "amt": 2490000.0, "due": "Handoff and registration", "done": false }
      ]
    }
    await prisma.paymentPlan.upsert({
      where: { project_id: project.id },
      create: paymentPlanData,
      update: paymentPlanData
    })
    console.log('✓ Seeded Payment Plan')

    console.log('✅ ACE Han\'ei project seeding complete!')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seed()
