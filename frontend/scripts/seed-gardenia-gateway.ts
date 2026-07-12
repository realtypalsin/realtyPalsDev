import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seed() {
  console.log('🌱 Seeding Gardenia Gateway project data...')

  try {
    // 1. Find or create builder
    let builder = await prisma.builder.findFirst({
      where: { name: 'Gardenia Group (Futec Shelters JV)' }
    })

    const builderData = {
      name: 'Gardenia Group (Futec Shelters JV)',
      slug: 'gardenia-group',
      company_overview: 'Established in 1997, Gardenia Group is a prominent real estate builder in Noida and Greater Noida, famous for developing large-scale high-rise estates such as Gardenia Glory, Gardenia Grace, and Gardenia Gateway. Over recent years, the developer has faced substantial financial distress and local authority dues defaults, resulting in legal and administrative disputes that have delayed flat registrations for hundreds of buyers.',
      founded_year: 1997,
      delivered_units: 8000,
      rera_compliance_score: 55,
      tagline: 'Building High-Rise Gated Estates'
    }

    if (!builder) {
      builder = await prisma.builder.create({
        data: builderData
      })
      console.log('✓ Created Gardenia builder')
    } else {
      builder = await prisma.builder.update({
        where: { id: builder.id },
        data: builderData
      })
      console.log('✓ Updated Gardenia builder')
    }

    // 2. Find or create Gardenia Gateway project
    let project = await prisma.project.findUnique({
      where: { slug: 'gardenia-gateway-sector-75' }
    })

    const projectData = {
      name: 'Gardenia Gateway',
      slug: 'gardenia-gateway-sector-75',
      builder: { connect: { id: builder.id } },
      sector: 'Sector 75',
      city: 'Noida',
      status: 'ready_to_move' as const,
      tagline: 'A Strategic Gateway to Premium Central Noida Living',
      hero_image_url: 'https://storage.realtypals.com/projects/gardenia-gateway/hero.jpg',
      rera_number: 'UPRERAPRJ7346',
      total_towers: 7,
      floors: 'G+19',
      total_units: 1258,
      land_area_acres: 9.88,
      price_min_cr: 1.41,
      price_range_label: '₹1.41 Cr - ₹3.10 Cr+',
      possession_label: 'Ready to Move',
      possession_date: new Date('2021-01-30T00:00:00Z'),
      launch_date: new Date('2011-02-15T00:00:00Z'),
      architect: 'Gardenia Group Design Studio',
      interior_designer: 'Gardenia Group Design Studio',
      open_space_pct: 70,
      green_rating: 'Standard Green Plan',
      project_type: 'Residential',
      lat: 28.575500,
      lng: 77.381500,
      marketing_claims: [
        'Superb high-rise residences spread across a sprawling 9.88-acre campus',
        'Highly strategic location just 400m from Noida Sector 50 Metro Station',
        'Modern architectural planning featuring spacious 2, 3, and 4 BHK layouts',
        'Extensive recreational amenities including a fully equipped gymnasium and multiple sports courts',
        'Excellent cross-ventilation and natural lighting in every apartment'
      ],
      ai_search_keywords: ['gardenia gateway', 'gateway sector 75 noida', 'ready to move sector 75 noida', 'metro walking flats noida']
    }

    if (!project) {
      project = await prisma.project.create({
        data: projectData
      })
      console.log('✓ Created Gardenia Gateway project')
    } else {
      project = await prisma.project.update({
        where: { id: project.id },
        data: projectData
      })
      console.log('✓ Updated Gardenia Gateway project')
    }

    // 3. Clear and seed amenities
    await prisma.amenity.deleteMany({ where: { project_id: project.id } })
    const topAmenities = [
      { name: "Swimming Pool", category: "sports" as const },
      { name: "Gymnasium", category: "wellness" as const },
      { name: "Badminton Court", category: "sports" as const },
      { name: "Lawn Tennis Court", category: "sports" as const },
      { name: "Squash Court", category: "sports" as const },
      { name: "Kids Play Area", category: "kids" as const },
      { name: "Clubhouse", category: "lifestyle" as const }
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
        name: "2 BHK Compact",
        bhk: 2,
        super_area_sqft: 1045.0,
        carpet_area_sqft: 680.0,
        price_min_cr: 1.41,
        category_badge: "Compact Entry",
        perfect_for: ["Growing Families"],
        views: []
      },
      {
        name: "2 BHK Executive",
        bhk: 2,
        super_area_sqft: 1265.0,
        carpet_area_sqft: 820.0,
        price_min_cr: 1.70,
        category_badge: "Comfort Luxury",
        perfect_for: ["Growing Families"],
        views: []
      },
      {
        name: "3 BHK Standard",
        bhk: 3,
        super_area_sqft: 1485.0,
        carpet_area_sqft: 960.0,
        price_min_cr: 2.00,
        category_badge: "Luxury Standard",
        perfect_for: ["Growing Families"],
        views: []
      },
      {
        name: "3 BHK Premium",
        bhk: 3,
        super_area_sqft: 1595.0,
        carpet_area_sqft: 1030.0,
        price_min_cr: 2.15,
        category_badge: "Luxury Premium",
        perfect_for: ["Growing Families"],
        views: []
      },
      {
        name: "3 BHK Luxury",
        bhk: 3,
        super_area_sqft: 1925.0,
        carpet_area_sqft: 1250.0,
        price_min_cr: 2.60,
        category_badge: "Elite Residence",
        perfect_for: ["Remote Workers", "NCR Professionals"],
        views: []
      },
      {
        name: "4 BHK Flagship",
        bhk: 4,
        super_area_sqft: 2300.0,
        carpet_area_sqft: 1500.0,
        price_min_cr: 3.10,
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
      { name: "Noida Sector 50 Metro Station (Aqua Line)", distance_km: 0.4, type: "metro" as const },
      { name: "Spectrum Metro Mall", distance_km: 0.2, type: "mall" as const },
      { name: "Noida Expressway Hub", distance_km: 5.0, type: "landmark" as const },
      { name: "Kailash Hospital Sector 71", distance_km: 4.2, type: "hospital" as const },
      { name: "Kothari International School", distance_km: 1.8, type: "school" as const },
      { name: "Ramagya School Noida", distance_km: 2.1, type: "school" as const },
      { name: "Manav Rachna International School", distance_km: 2.0, type: "school" as const },
      { name: "Neo Hospital Sector 50", distance_km: 3.0, type: "hospital" as const },
      { name: "Cloudnine Hospital Noida", distance_km: 3.2, type: "hospital" as const },
      { name: "Kailash Hospital & Heart Institute", distance_km: 7.5, type: "hospital" as const },
      { name: "Logix City Center Mall", distance_km: 5.8, type: "mall" as const }
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
        name: "Official Gardenia Gateway Brochure",
        storage_url: "https://storage.realtypals.com/documents/gardenia-gateway-brochure.pdf",
        doc_type: "brochure",
        file_size_bytes: 5120000
      }
    })
    await prisma.projectDocument.create({
      data: {
        project_id: project.id,
        project_slug: project.slug,
        name: "Gardenia Gateway Floor Layout Blueprint",
        storage_url: "https://storage.realtypals.com/documents/gardenia-gateway-layouts.pdf",
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
        url: "https://storage.realtypals.com/projects/gardenia-gateway/hero.jpg",
        type: "hero"
      }
    })
    console.log('✓ Seeded images')

    // 8. Seed DecisionProfile & Intelligence Data
    const intelligenceJson = {
      topLevelMetrics: {
        overallScore: 68,
        tier: 'BUY_WITH_CAUTION',
        investmentGrade: 'D',
        priceAdvantage: '-30%',
        priceAdvantageSubtext: 'Premium Risk',
        confidenceLevel: 'Medium',
        confidenceLabel: 'Verify Dues Clearance'
      },
      dimensionScores: {
        builderTrust: { score: 55, status: 'Financial Default' },
        locationQuality: { score: 90, status: 'Verified' },
        lifestyleAmenities: { score: 85, status: 'Verified' },
        valueForMoney: { score: 70, status: 'Verified' },
        appreciationPotential: { score: 65, status: 'Verified' },
        legalSafety: { score: 45, status: 'In Dispute' }
      },
      buyerPersonas: [
        {
          type: 'Transit-oriented Families',
          stars: 4,
          headline: '400m Metro Access & Spacing Layouts',
          reasons: [
            'Only 400m from Sector 50 Aqua Line Metro Station.',
            'Spacious configurations ranging from 1,045 sq.ft. up to 2,300 sq.ft.'
          ]
        },
        {
          type: 'Risk-Averse Gated Buyers',
          stars: 1,
          headline: 'Developer Defaults & Registry Freeze',
          reasons: [
            'Flat registry delays due to developer unpaid land dues to Noida Authority.',
            'Sub-par maintenance disputes and resident complaints.'
          ]
        }
      ],
      riskRadar: [
        {
          type: 'Developer Legal Dues Risk',
          level: 'High Risk',
          description: 'Ongoing litigation with Noida Authority over unpaid dues deferring registries.'
        },
        {
          type: 'Compound Upkeep Issues',
          level: 'Medium Risk',
          description: 'Resident complaints on STP maintenance, water quality, and compound upkeep.'
        }
      ],
      transparency_checks: [
        {
          label: 'RERA Registered',
          ok: true,
          details: 'Approved under RERA registration ID UPRERAPRJ7346.'
        },
        {
          label: 'Noida Authority Dues Clear',
          ok: false,
          details: 'Critical default. Builder default on dues has frozen registrations across blocks.'
        }
      ],
      investment_insights: {
        appreciation_annual: '6-8%',
        appreciation_desc: 'Muted capital value growth driven by registry freeze and developer defaults.',
        rental_yield: '3.2%',
        rental_desc: 'Steady rental interest due to walkability to Noida Sector 50 Metro Station.',
        market_trend: 'Neutral-Bearish',
        market_desc: 'Secondary resale volumes are constrained by the outstanding developer liabilities.',
        liquidity_score: 'Medium-Low',
        liquidity_desc: 'Resales are slower due to pending title clearances.'
      },
      quick_commutes: [
        { destination: "Sector 50 Metro", time: "5 Mins Walk", icon: "train" },
        { destination: "Spectrum Mall", time: "2 Mins Walk", icon: "shopping" },
        { destination: "Noida Expressway", time: "5 Mins", icon: "map-pin" }
      ],
      location_highlights: [
        {
          title: "Walking Sector 50 Metro",
          time: "400m Away",
          description: "Immediate direct access to Noida's primary Aqua Metro Line.",
          icon: "train"
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
          { name: "Spectrum Metro Mall", dist: "0.3 km" }
        ]
      },
      neighborhood_advantages: [
        {
          title: "Prime Central Noida Corridor",
          description: "Gated luxury footprint inside Noida's most established retail and residential sector.",
          icon: "shield"
        }
      ]
    }

    await prisma.decisionProfile.upsert({
      where: { project_id: project.id },
      update: {
        status: 'PUBLISHED',
        decision_thesis: 'Gardenia Gateway offers exceptionally well-located, ready-to-move apartments in Sector 75 Noida within walking distance of the metro, but severe developer legal liabilities and frozen registries necessitate a highly cautious purchase approach.',
        why_buy: [
          'Exceptional connectivity, situated just 400 meters from the Noida Sector 50 Metro Station (Aqua Line).',
          'Fully completed, ready-to-move-in apartments providing immediate occupation and rental savings.',
          'Spacious apartment options ranging from 1,045 sq.ft. up to 2,300 sq.ft., catering to all family sizes.',
          'Abundant sports facilities including a squash court, lawn tennis court, and multiple swimming pools.'
        ],
        why_avoid: [
          'Severe legal and financial defaults: The developer faces ongoing litigation with the Noida Authority regarding unpaid dues.',
          'Registry delays: Many buyers are unable to execute flat lease deeds because of the builder’s financial default.',
          'Local resident complaints regarding sub-par maintenance and occasional STP/water quality issues.'
        ],
        intelligence_data: intelligenceJson,
        last_verified_at: new Date(),
        verified_by: 'seed'
      },
      create: {
        project_id: project.id,
        status: 'PUBLISHED',
        decision_thesis: 'Gardenia Gateway offers exceptionally well-located, ready-to-move apartments in Sector 75 Noida within walking distance of the metro, but severe developer legal liabilities and frozen registries necessitate a highly cautious purchase approach.',
        why_buy: [
          'Exceptional connectivity, situated just 400 meters from the Noida Sector 50 Metro Station (Aqua Line).',
          'Fully completed, ready-to-move-in apartments providing immediate occupation and rental savings.',
          'Spacious apartment options ranging from 1,045 sq.ft. up to 2,300 sq.ft., catering to all family sizes.',
          'Abundant sports facilities including a squash court, lawn tennis court, and multiple swimming pools.'
        ],
        why_avoid: [
          'Severe legal and financial defaults: The developer faces ongoing litigation with the Noida Authority regarding unpaid dues.',
          'Registry delays: Many buyers are unable to execute flat lease deeds because of the builder’s financial default.',
          'Local resident complaints regarding sub-par maintenance and occasional STP/water quality issues.'
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
      plan_name: 'Ready Possession Plan',
      milestones: [
        { "milestone": "At the Time of Booking", "pct": 10.0, "amt": 1410000.0, "due": "Immediate", "done": true },
        { "milestone": "Within 30 Days of Booking", "pct": 40.0, "amt": 5640000.0, "due": "30 days from booking", "done": true },
        { "milestone": "On Execution of Registry & Handoff", "pct": 50.0, "amt": 7050000.0, "due": "Possession handoff", "done": false }
      ]
    }
    await prisma.paymentPlan.upsert({
      where: { project_id: project.id },
      create: paymentPlanData,
      update: paymentPlanData
    })
    console.log('✓ Seeded Payment Plan')

    console.log('✅ Gardenia Gateway project seeding complete!')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seed()
