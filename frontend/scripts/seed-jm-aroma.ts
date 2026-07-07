import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seed() {
  console.log('🌱 Seeding JM Aroma project data...')

  try {
    // 1. Find or create builder
    let builder = await prisma.builder.findFirst({
      where: { name: 'JM Housing' }
    })

    const builderData = {
      name: 'JM Housing',
      slug: 'jm-housing',
      company_overview: 'JM Housing (part of the JM Group) is a reputed real estate developer with over 13 years of experience in Delhi NCR. The group is known for delivering major quality residential structures including JM Florence, JM Park Sapphire, and JM Royal Park on time with functional layouts.',
      founded_year: 2009,
      delivered_units: 4500,
      rera_compliance_score: 92,
      tagline: 'Reliability and Delivery Excellence'
    }

    if (!builder) {
      builder = await prisma.builder.create({
        data: builderData
      })
      console.log('✓ Created JM Housing builder')
    } else {
      builder = await prisma.builder.update({
        where: { id: builder.id },
        data: builderData
      })
      console.log('✓ Updated JM Housing builder')
    }

    // 2. Find or create JM Aroma project
    let project = await prisma.project.findUnique({
      where: { slug: 'jm-aroma-sector-75' }
    })

    const projectData = {
      name: 'JM Aroma',
      slug: 'jm-aroma-sector-75',
      builder: { connect: { id: builder.id } },
      sector: 'Sector 75',
      city: 'Noida',
      status: 'ready_to_move' as const,
      tagline: 'A Captivating Residential Enclave Mapped with Perfection',
      hero_image_url: 'https://storage.realtypals.com/projects/jm-aroma/hero.jpg',
      rera_number: 'Rera Not Applicable / Completed Pre-RERA',
      total_towers: 7,
      floors: 'G+17',
      total_units: 612,
      land_area_acres: 5.0,
      price_min_cr: 1.62,
      price_range_label: '₹1.62 Cr - ₹3.12 Cr+',
      possession_label: 'Ready to Move',
      possession_date: new Date('2015-12-31T00:00:00Z'),
      launch_date: new Date('2012-03-01T00:00:00Z'),
      architect: 'JM Design Studio',
      interior_designer: 'JM Design Studio',
      open_space_pct: 75,
      green_rating: 'Standard Gated Compound',
      project_type: 'Residential',
      lat: 28.576000,
      lng: 77.382300,
      marketing_claims: [
        'Ready-to-move-in luxury apartments with spacious 3 & 4 BHK layouts',
        'Meticulously designed with three open sides for spectacular cross-ventilation',
        'Walking distance to Sector 50 and 51 Metro Stations',
        'Beautifully landscaped central parks and multi-tier club facilities',
        'High-end specifications including wooden flooring and modular kitchens'
      ],
      ai_search_keywords: ['jm aroma', 'aroma sector 75 noida', 'ready to move sector 75 noida', 'walk to metro flats noida']
    }

    if (!project) {
      project = await prisma.project.create({
        data: projectData
      })
      console.log('✓ Created JM Aroma project')
    } else {
      project = await prisma.project.update({
        where: { id: project.id },
        data: projectData
      })
      console.log('✓ Updated JM Aroma project')
    }

    // 3. Clear and seed amenities
    await prisma.amenity.deleteMany({ where: { project_id: project.id } })
    const topAmenities = [
      { name: "Club House", category: "lifestyle" as const },
      { name: "Swimming Pool", category: "sports" as const },
      { name: "Advanced Gym Facility", category: "wellness" as const },
      { name: "Yoga / Meditation Area", category: "wellness" as const },
      { name: "Terrace Garden", category: "lifestyle" as const },
      { name: "Shopping Centre", category: "lifestyle" as const }
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
        name: "3 BHK Standard",
        bhk: 3,
        super_area_sqft: 1325.0,
        carpet_area_sqft: 920.0,
        price_min_cr: 1.62,
        category_badge: "Luxury Standard",
        perfect_for: ["Growing Families"],
        views: []
      },
      {
        name: "3 BHK Premium",
        bhk: 3,
        super_area_sqft: 1550.0,
        carpet_area_sqft: 1065.0,
        price_min_cr: 1.90,
        category_badge: "Luxury Premium",
        perfect_for: ["Growing Families"],
        views: []
      },
      {
        name: "3.5 BHK Executive",
        bhk: 3,
        super_area_sqft: 1850.0,
        carpet_area_sqft: 1280.0,
        price_min_cr: 2.26,
        category_badge: "Executive Standard",
        perfect_for: ["Remote Workers", "NCR Professionals"],
        views: []
      },
      {
        name: "4 BHK Family Mansion",
        bhk: 4,
        super_area_sqft: 2550.0,
        carpet_area_sqft: 1820.0,
        price_min_cr: 3.12,
        category_badge: "Family Flagship",
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
      { name: "Spectrum Metro Mall", distance_km: 0.5, type: "mall" as const },
      { name: "Kothari International School", distance_km: 1.8, type: "school" as const },
      { name: "Neo Hospital Sector 50", distance_km: 3.0, type: "hospital" as const },
      { name: "Cloudnine Hospital Noida", distance_km: 3.2, type: "hospital" as const },
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
        name: "Official JM Aroma Brochure",
        storage_url: "https://storage.realtypals.com/documents/jm-aroma-brochure.pdf",
        doc_type: "brochure",
        file_size_bytes: 5120000
      }
    })
    await prisma.projectDocument.create({
      data: {
        project_id: project.id,
        project_slug: project.slug,
        name: "JM Aroma Layout Blueprint Portfolio",
        storage_url: "https://storage.realtypals.com/documents/jm-aroma-layouts.pdf",
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
        url: "https://storage.realtypals.com/projects/jm-aroma/hero.jpg",
        type: "hero"
      }
    })
    console.log('✓ Seeded images')

    // 8. Seed DecisionProfile & Intelligence Data
    const intelligenceJson = {
      topLevelMetrics: {
        overallScore: 82,
        tier: 'STRONG_BUY',
        investmentGrade: 'A-',
        priceAdvantage: '-30%',
        priceAdvantageSubtext: 'Substantial Discount',
        confidenceLevel: 'High',
        confidenceLabel: 'Highly Reliable'
      },
      dimensionScores: {
        builderTrust: { score: 92, status: 'Verified' },
        locationQuality: { score: 90, status: 'Verified' },
        lifestyleAmenities: { score: 85, status: 'Verified' },
        valueForMoney: { score: 90, status: 'Verified' },
        appreciationPotential: { score: 80, status: 'Verified' },
        legalSafety: { score: 92, status: 'Verified' }
      },
      buyerPersonas: [
        {
          type: 'Transit-Favoring Families',
          stars: 5,
          headline: 'Walkable Metro & Active Community',
          reasons: [
            'Walking distance to Sector 50 & 51 Metro Stations.',
            'Spacious 3-side open layout configurations with departmental store inside compound.'
          ]
        },
        {
          type: 'Luxury Spacing Buyers',
          stars: 3,
          headline: 'Facade Aging & Upkeep Issues',
          reasons: [
            'Older structural facade (completed in 2015) has cosmetic aging.',
            'Higher monthly maintenance charges reported by residents.'
          ]
        }
      ],
      riskRadar: [
        {
          type: 'Structural & Facade Aging',
          level: 'Low Risk',
          description: 'Cosmetic aging of external paint and lift upkeep, typical of mature societies.'
        }
      ],
      transparency_checks: [
        {
          label: 'Pre-RERA Compliance',
          ok: true,
          details: 'Completed pre-RERA with valid municipal clearances and occupancy certificates.'
        },
        {
          label: 'Authority Dues Clear',
          ok: true,
          details: 'Dues cleared with Noida Authority. Registries are active and hassle-free.'
        }
      ],
      investment_insights: {
        appreciation_annual: '8-10%',
        appreciation_desc: 'Steady capital value growth driven by central location and walking metro connectivity.',
        rental_yield: '3.4%',
        rental_desc: 'Excellent rental demand from working professionals due to easy metro commute access.',
        market_trend: 'Bullish',
        market_desc: 'Active secondary resale demand owing to established resident community.',
        liquidity_score: 'High',
        liquidity_desc: 'Short exit timeframes on resales due to strong end-user demand.'
      },
      quick_commutes: [
        { destination: "Sector 50 Metro", time: "3 Mins Walk", icon: "train" },
        { destination: "Spectrum Metro Mall", time: "1 Min Walk", icon: "shopping" },
        { destination: "Kothari School", time: "5 Mins", icon: "school" }
      ],
      location_highlights: [
        {
          title: "Walking Sector 50 Metro",
          time: "Immediate Access",
          description: "Located within easy walking distance of Noida's Aqua Metro Line.",
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
          { name: "Spectrum Metro Mall", dist: "0.5 km" }
        ]
      },
      neighborhood_advantages: [
        {
          title: "Prime Central Noida Corridor",
          description: "Gated residential footprint inside Noida's most established retail and residential sector.",
          icon: "shield"
        }
      ]
    }

    await prisma.decisionProfile.upsert({
      where: { project_id: project.id },
      update: {
        status: 'PUBLISHED',
        decision_thesis: 'JM Aroma is a highly reliable, ready-to-move family-centric society in central Noida, offering spacious layouts and walkable metro connectivity, making it a very strong end-user asset with a stable local community.',
        why_buy: [
          'Immediate possession with ready-to-move status, avoiding any project execution or construction delays.',
          'Ultra-spacious layout formats starting at 1,325 sq.ft., featuring rare 3-side open designs for unmatched light and ventilation.',
          'Highly premium interior elements such as modular kitchens, wooden master suite flooring, and video doorbells.',
          'Outstanding public transit connectivity, situated within easy walking distance of the Sector 50 & 51 Metro Stations.',
          'Active and vibrant gated community with mature lifestyle amenities and on-site departmental stores.'
        ],
        why_avoid: [
          'The property is mature (delivered in 2015), exhibiting some standard cosmetic aging on external towers and lifts.',
          'Higher monthly maintenance fees reported by active residents relative to standalone societies.',
          'Parks and children play zones are moderately unmaintained compared to newer premium projects.'
        ],
        intelligence_data: intelligenceJson,
        last_verified_at: new Date(),
        verified_by: 'seed'
      },
      create: {
        project_id: project.id,
        status: 'PUBLISHED',
        decision_thesis: 'JM Aroma is a highly reliable, ready-to-move family-centric society in central Noida, offering spacious layouts and walkable metro connectivity, making it a very strong end-user asset with a stable local community.',
        why_buy: [
          'Immediate possession with ready-to-move status, avoiding any project execution or construction delays.',
          'Ultra-spacious layout formats starting at 1,325 sq.ft., featuring rare 3-side open designs for unmatched light and ventilation.',
          'Highly premium interior elements such as modular kitchens, wooden master suite flooring, and video doorbells.',
          'Outstanding public transit connectivity, situated within easy walking distance of the Sector 50 & 51 Metro Stations.',
          'Active and vibrant gated community with mature lifestyle amenities and on-site departmental stores.'
        ],
        why_avoid: [
          'The property is mature (delivered in 2015), exhibiting some standard cosmetic aging on external towers and lifts.',
          'Higher monthly maintenance fees reported by active residents relative to standalone societies.',
          'Parks and children play zones are moderately unmaintained compared to newer premium projects.'
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
      base_price_per_sqft: 12075.00,
      gst_rate_pct: 0.00,
      stamp_duty_pct: 6.00,
      registration_pct: 1.00,
      parking_cost: 350000.00,
      club_membership: 150000.00,
      ifms: 50.00,
      plc_charges: [
        { "label": "Park / Green Facing PLC", "amount_per_sqft": 150.00 },
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
        { "milestone": "At the Time of Booking", "pct": 10.0, "amt": 1620000.0, "due": "Immediate", "done": true },
        { "milestone": "Within 30 Days of Booking", "pct": 40.0, "amt": 6480000.0, "due": "30 days from booking", "done": true },
        { "milestone": "At the Time of Handoff & Registration", "pct": 50.0, "amt": 8100000.0, "due": "Possession handoff", "done": false }
      ]
    }
    await prisma.paymentPlan.upsert({
      where: { project_id: project.id },
      create: paymentPlanData,
      update: paymentPlanData
    })
    console.log('✓ Seeded Payment Plan')

    console.log('✅ JM Aroma project seeding complete!')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seed()
