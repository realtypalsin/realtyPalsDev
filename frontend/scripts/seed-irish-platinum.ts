import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seed() {
  console.log('🌱 Seeding Irish Platinum project data...')

  try {
    // 1. Find or create builder
    let builder = await prisma.builder.findFirst({
      where: { name: 'Irish Infrastructure Pvt. Ltd.' }
    })

    const builderData = {
      name: 'Irish Infrastructure Pvt. Ltd.',
      slug: 'irish-infrastructure-pvt-ltd',
      company_overview: 'Established in 2013, Irish Infrastructure Pvt. Ltd. (Irish Group) has carved a niche in NCR for low-density master plans and excellent Mivan structural quality, following delivered icons like Ratan Pearls and Irish Pearls.',
      founded_year: 2013,
      delivered_units: 1200,
      rera_compliance_score: 95,
      tagline: 'Delivering Quality and Trust'
    }

    if (!builder) {
      builder = await prisma.builder.create({
        data: builderData
      })
      console.log('✓ Created Irish Infrastructure builder')
    } else {
      builder = await prisma.builder.update({
        where: { id: builder.id },
        data: builderData
      })
      console.log('✓ Updated Irish Infrastructure builder')
    }

    // 2. Find or create Irish Platinum project
    let project = await prisma.project.findUnique({
      where: { slug: 'irish-platinum-sector-10' }
    })

    const projectData = {
      name: 'Irish Platinum',
      slug: 'irish-platinum-sector-10',
      builder: { connect: { id: builder.id } },
      sector: 'Sector 10',
      city: 'Greater Noida',
      status: 'under_construction' as const,
      tagline: 'The Treasure Chest of Luxury Living',
      hero_image_url: 'https://storage.realtypals.com/projects/irish-platinum/hero.jpg',
      rera_number: 'UPRERAPRJ503189/03/2024',
      total_towers: 4,
      floors: 'G+30',
      total_units: 566,
      land_area_acres: 4.65,
      price_min_cr: 1.45,
      price_range_label: '₹1.45 Cr - ₹3.12 Cr+',
      possession_label: 'January 2029',
      possession_date: new Date('2029-01-18T00:00:00Z'),
      launch_date: new Date('2024-01-01T00:00:00Z'),
      architect: 'Kailash Aggarwal',
      interior_designer: 'Kailash Aggarwal',
      open_space_pct: 80,
      green_rating: 'IGBC Green Rated',
      project_type: 'Residential',
      lat: 28.572833,
      lng: 77.482602,
      marketing_claims: [
        'Ultra-luxury residences with lowest-density planning in Sector 10',
        'Premium 11-foot clear ceiling heights and spacious layouts',
        'Built with high-end, cutting-edge Mivan construction tech',
        'Grand entrance lobby and multi-tier sports facilities',
        'Direct access to 100m wide road in Sector 10'
      ],
      ai_search_keywords: ['irish platinum', 'sector 10 greater noida', 'low density sector 10', 'luxury 3bhk greater noida']
    }

    if (!project) {
      project = await prisma.project.create({
        data: projectData
      })
      console.log('✓ Created Irish Platinum project')
    } else {
      project = await prisma.project.update({
        where: { id: project.id },
        data: projectData
      })
      console.log('✓ Updated Irish Platinum project')
    }

    // 3. Clear and seed amenities
    await prisma.amenity.deleteMany({ where: { project_id: project.id } })
    const topAmenities = [
      { name: "Swimming Pool", category: "sports" as const },
      { name: "Gymnasium", category: "sports" as const },
      { name: "Club House", category: "lifestyle" as const },
      { name: "Steam and Sauna", category: "wellness" as const },
      { name: "Billiards Room", category: "lifestyle" as const },
      { name: "Kid's Gaming Zone", category: "kids" as const }
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
        name: "3 BHK Comfort",
        bhk: 3,
        super_area_sqft: 1390.0,
        carpet_area_sqft: 804.0,
        price_min_cr: 1.45,
        category_badge: "Comfort Entry",
        perfect_for: ["Growing Families"],
        views: []
      },
      {
        name: "3 BHK Premium",
        bhk: 3,
        super_area_sqft: 1690.0,
        carpet_area_sqft: 1050.0,
        price_min_cr: 1.77,
        category_badge: "Luxury Standard",
        perfect_for: ["Growing Families"],
        views: []
      },
      {
        name: "3 BHK + Study",
        bhk: 3,
        super_area_sqft: 1925.0,
        carpet_area_sqft: 1251.0,
        price_min_cr: 2.02,
        category_badge: "Elite Executive",
        perfect_for: ["Remote Workers", "NCR Professionals"],
        views: []
      },
      {
        name: "4 BHK Platinum Mansion",
        bhk: 4,
        super_area_sqft: 2550.0,
        carpet_area_sqft: 1935.0,
        price_min_cr: 2.63,
        category_badge: "Platinum Flagship",
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
      { name: "GD Goenka International School", distance_km: 0.8, type: "school" as const },
      { name: "Numed Super Speciality Hospital", distance_km: 1.8, type: "hospital" as const },
      { name: "Yatharth Super Speciality Hospital", distance_km: 3.6, type: "hospital" as const },
      { name: "Ace City Square", distance_km: 3.2, type: "mall" as const },
      { name: "Golden I Mall", distance_km: 4.5, type: "mall" as const },
      { name: "Gaur City Mall", distance_km: 6.0, type: "mall" as const }
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
        name: "Official Irish Platinum Brochure",
        storage_url: "https://storage.realtypals.com/documents/irish-platinum-brochure.pdf",
        doc_type: "brochure",
        file_size_bytes: 4850000
      }
    })
    await prisma.projectDocument.create({
      data: {
        project_id: project.id,
        project_slug: project.slug,
        name: "Irish Platinum Floorplots Portfolio",
        storage_url: "https://storage.realtypals.com/documents/irish-platinum-floorplots.pdf",
        doc_type: "floor_plan",
        file_size_bytes: 3520000
      }
    })
    console.log('✓ Seeded documents')

    // 7. Clear and seed images
    await prisma.projectImage.deleteMany({ where: { project_id: project.id } })
    await prisma.projectImage.create({
      data: {
        project_id: project.id,
        url: "https://storage.realtypals.com/projects/irish-platinum-exterior.jpg",
        type: "exterior"
      }
    })
    await prisma.projectImage.create({
      data: {
        project_id: project.id,
        url: "https://storage.realtypals.com/projects/irish-platinum-pool.jpg",
        type: "amenity"
      }
    })
    console.log('✓ Seeded images')

    // 8. Seed DecisionProfile & Intelligence Data
    const intelligenceJson = {
      topLevelMetrics: {
        overallScore: 88,
        tier: 'STRONG_BUY',
        investmentGrade: 'A',
        priceAdvantage: '-16.4%',
        priceAdvantageSubtext: 'Premium',
        confidenceLevel: 'High',
        confidenceLabel: 'Highly Reliable'
      },
      dimensionScores: {
        builderTrust: { score: 95, status: 'Verified' },
        locationQuality: { score: 88, status: 'Verified' },
        lifestyleAmenities: { score: 87, status: 'Verified' },
        valueForMoney: { score: 80, status: 'Verified' },
        appreciationPotential: { score: 90, status: 'Verified' },
        legalSafety: { score: 95, status: 'Verified' }
      },
      buyerPersonas: [
        {
          type: 'C-Suite Executives',
          stars: 5,
          headline: '11-foot Room Heights & Density Insulation',
          reasons: [
            'Unmatched 11-foot clear ceiling heights maximizing spatial luxury.',
            'Spacious 4 BHK layouts with helper suites and low density.'
          ]
        },
        {
          type: 'Young Growing Families',
          stars: 5,
          headline: 'Education & Gated Safety',
          reasons: [
            'Walking distance to GD Goenka and Sarvottam International Schools.',
            'High-security gated layout with interactive recreational spaces.'
          ]
        }
      ],
      riskRadar: [
        {
          type: 'Timeline Risk',
          level: 'High Risk',
          description: 'Possession slated for January 2029 requires standard waiting times.'
        },
        {
          type: 'Transit Dependency',
          level: 'Medium Risk',
          description: 'Appreciation catalyzed by proposed Aqua Line Metro extension route approvals.'
        }
      ],
      transparency_checks: [
        {
          label: 'RERA Registered',
          ok: true,
          details: 'Approved under registration ID UPRERAPRJ503189/03/2024.'
        },
        {
          label: 'GNIDA Land Allotment',
          ok: true,
          details: 'Clear leasehold land directly allotted by Greater Noida Industrial Development Authority.'
        }
      ],
      investment_insights: {
        appreciation_annual: '12-15%',
        appreciation_desc: 'Robust annual appreciation expected inside high-growth Sector 10 enclave.',
        rental_yield: '3.5%',
        rental_desc: 'Steady rental yield potential from incoming C-suite professional demographic.',
        market_trend: 'Bullish',
        market_desc: 'Noida Extension Sector 10 is emerging as a high-growth hub.',
        liquidity_score: 'High',
        liquidity_desc: 'High exit demand driven by exclusive 4-tower structure.'
      },
      quick_commutes: [
        { destination: "Sarvottam School", time: "1 Min", icon: "school" },
        { destination: "GD Goenka School", time: "2 Mins", icon: "school" },
        { destination: "Sector 52 Metro", time: "15 Mins", icon: "train" }
      ],
      location_highlights: [
        {
          title: "Proposed Sector 10 Metro",
          time: "5 Mins Walk",
          description: "Proposed metro extension line station located nearby.",
          icon: "train"
        }
      ],
      nearby_essentials: {
        "Schools": [
          { name: "Sarvottam International School", dist: "0.3 km" },
          { name: "GD Goenka International School", dist: "0.8 km" }
        ],
        "Hospitals": [
          { name: "Numed Super Speciality Hospital", dist: "1.8 km" }
        ],
        "Shopping": [
          { name: "Gaur City Mall", dist: "6.0 km" }
        ]
      },
      neighborhood_advantages: [
        {
          title: "New Growth Corridor",
          description: "Sectors 10 and 12 feature superior master planning.",
          icon: "trending-up"
        }
      ]
    }

    await prisma.decisionProfile.upsert({
      where: { project_id: project.id },
      update: {
        status: 'PUBLISHED',
        decision_thesis: 'Irish Platinum offers Sector 10\'s premier premium residential enclave, combining low-density architectural layouts with high-durability Mivan construction, making it an excellent long-term option for luxury end-users.',
        why_buy: [
          'Extremely low project density with only 566 units on 4.65 acres.',
          'Structural superiority with 11-foot clear ceiling heights and Mivan shuttering.',
          'High-quality interior finishes including PGVT floor tiles and Kohler/Grohe bath fittings.'
        ],
        why_avoid: [
          'Local rate carries a 16.4% premium compared to local under-construction averages.',
          'Long-term possession window stretching to January 2029.',
          'Seamless public transport depends on the upcoming Aqua Line metro extension.'
        ],
        intelligence_data: intelligenceJson,
        last_verified_at: new Date(),
        verified_by: 'seed'
      },
      create: {
        project_id: project.id,
        status: 'PUBLISHED',
        decision_thesis: 'Irish Platinum offers Sector 10\'s premier premium residential enclave, combining low-density architectural layouts with high-durability Mivan construction, making it an excellent long-term option for luxury end-users.',
        why_buy: [
          'Extremely low project density with only 566 units on 4.65 acres.',
          'Structural superiority with 11-foot clear ceiling heights and Mivan shuttering.',
          'High-quality interior finishes including PGVT floor tiles and Kohler/Grohe bath fittings.'
        ],
        why_avoid: [
          'Local rate carries a 16.4% premium compared to local under-construction averages.',
          'Long-term possession window stretching to January 2029.',
          'Seamless public transport depends on the upcoming Aqua Line metro extension.'
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
      base_price_per_sqft: 11225.00,
      gst_rate_pct: 5.00,
      stamp_duty_pct: 6.00,
      registration_pct: 1.00,
      parking_cost: 400000.00,
      club_membership: 200000.00,
      ifms: 50.00,
      plc_charges: [
        { "label": "Park Facing PLC", "amount_per_sqft": 150.00 },
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
      plan_name: 'CLP — Under Construction',
      milestones: [
        { "milestone": "At the Time of Booking", "pct": 10.0, "amt": 1450000.0, "due": "Immediate", "done": true },
        { "milestone": "Within 45 Days of Booking", "pct": 40.0, "amt": 5800000.0, "due": "45 Days from booking", "done": false },
        { "milestone": "On Completion of Superstructure", "pct": 20.0, "amt": 2900000.0, "due": "Structure completion", "done": false },
        { "milestone": "On External Paint of Tower", "pct": 20.0, "amt": 2900000.0, "due": "External facade completion", "done": false },
        { "milestone": "At the Time of Offer of Possession", "pct": 10.0, "amt": 1450000.0, "due": "Handoff", "done": false }
      ]
    }
    await prisma.paymentPlan.upsert({
      where: { project_id: project.id },
      create: paymentPlanData,
      update: paymentPlanData
    })
    console.log('✓ Seeded Payment Plan')

    console.log('✅ Irish Platinum project seeding complete!')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seed()
