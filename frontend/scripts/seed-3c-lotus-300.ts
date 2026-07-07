import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seed() {
  console.log('🌱 Seeding 3C Lotus 300 project data...')

  try {
    // 1. Find or create builder
    let builder = await prisma.builder.findFirst({
      where: { name: 'The 3C Company' }
    })

    const builderData = {
      name: 'The 3C Company',
      slug: 'the-3c-company',
      company_overview: 'Founded in 2007, The 3C Company (Three C) was a renowned pioneer of sustainable, eco-friendly green residential developments in Delhi NCR, best recognized for its iconic \'Lotus\' series. While the group delivered over 14 million sq. ft. of space, it has faced severe financial distress and corporate insolvency (NCLT) proceedings in recent years.',
      founded_year: 2007,
      delivered_units: 15000,
      rera_compliance_score: 45,
      tagline: 'Green Architecture Pioneer'
    }

    if (!builder) {
      builder = await prisma.builder.create({
        data: builderData
      })
      console.log('✓ Created The 3C Company builder')
    } else {
      builder = await prisma.builder.update({
        where: { id: builder.id },
        data: builderData
      })
      console.log('✓ Updated The 3C Company builder')
    }

    // 2. Find or create 3C Lotus 300 project
    let project = await prisma.project.findUnique({
      where: { slug: '3c-lotus-300-sector-107' }
    })

    const projectData = {
      name: '3C Lotus 300',
      slug: '3c-lotus-300-sector-107',
      builder: { connect: { id: builder.id } },
      sector: 'Sector 107',
      city: 'Noida',
      status: 'ready_to_move' as const,
      tagline: 'Ultra Luxury Living in the Heart of Noida',
      hero_image_url: 'https://storage.realtypals.com/projects/3c-lotus-300/hero.jpg',
      rera_number: 'UPRERAPRJ6828',
      total_towers: 6,
      floors: 'G+30',
      total_units: 300,
      land_area_acres: 10.0,
      price_min_cr: 5.84,
      price_range_label: '₹5.84 Cr - ₹9.64 Cr+',
      possession_label: 'Ready to Move',
      possession_date: new Date('2021-06-30T00:00:00Z'),
      launch_date: new Date('2010-12-01T00:00:00Z'),
      architect: 'The 3C Company Design Cell / Vidur Bharadwaj',
      interior_designer: 'The 3C Company Design Cell',
      open_space_pct: 85,
      green_rating: 'LEED Certified Gold',
      project_type: 'Residential',
      lat: 28.541742,
      lng: 77.372565,
      marketing_claims: [
        'Super-sized premium apartments with three-side open design',
        'Extremely low-density planning with only 300 families in 10 acres',
        'Constructed using certified eco-friendly green building practices',
        'Only 2 residences per floor with 3-side open layout for maximum privacy',
        'Overlooking grand landscaped central lawns and private sports fields'
      ],
      ai_search_keywords: ['3c lotus 300', 'lotus 300 sector 107', 'ready to move sector 107 noida', 'luxury 4bhk noida']
    }

    if (!project) {
      project = await prisma.project.create({
        data: projectData
      })
      console.log('✓ Created 3C Lotus 300 project')
    } else {
      project = await prisma.project.update({
        where: { id: project.id },
        data: projectData
      })
      console.log('✓ Updated 3C Lotus 300 project')
    }

    // 3. Clear and seed amenities
    await prisma.amenity.deleteMany({ where: { project_id: project.id } })
    const topAmenities = [
      { name: "Swimming Pool", category: "sports" as const },
      { name: "Gymnasium", category: "sports" as const },
      { name: "Heated Pool", category: "wellness" as const },
      { name: "Kids Pool", category: "sports" as const },
      { name: "Lawn Tennis Court", category: "sports" as const },
      { name: "Billiards / Pool Room", category: "lifestyle" as const },
      { name: "Golf Course", category: "sports" as const },
      { name: "Clubhouse", category: "lifestyle" as const },
      { name: "Aerobics & Dance Room", category: "wellness" as const },
      { name: "Cafe / Coffee Bar", category: "lifestyle" as const }
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
        name: "3.5 BHK Comfort Suite",
        bhk: 3,
        super_area_sqft: 3650.0,
        carpet_area_sqft: 2150.0,
        price_min_cr: 5.84,
        category_badge: "Comfort Luxury Suite",
        perfect_for: ["Premium Executives", "Large Families"],
        views: []
      },
      {
        name: "4.5 BHK Elite Mansion",
        bhk: 4,
        super_area_sqft: 4300.0,
        carpet_area_sqft: 2680.0,
        price_min_cr: 6.88,
        category_badge: "Elite Mansion",
        perfect_for: ["HNIs", "Executive Families"],
        views: []
      },
      {
        name: "4.5 BHK Imperial Villa Layout",
        bhk: 4,
        super_area_sqft: 5300.0,
        carpet_area_sqft: 3350.0,
        price_min_cr: 8.48,
        category_badge: "Imperial Mansion",
        perfect_for: ["HNIs", "Multigenerational Families"],
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
      { name: "Pathways School Noida", distance_km: 0.5, type: "school" as const },
      { name: "Noida Sector 101 Metro Station (Aqua Line)", distance_km: 2.29, type: "metro" as const },
      { name: "Noida-Greater Noida Expressway", distance_km: 3.0, type: "landmark" as const },
      { name: "DLF Mall of India (Sector 18)", distance_km: 9.5, type: "mall" as const },
      { name: "PrimaCare ClearMedi Multispecialty Hospital", distance_km: 1.2, type: "hospital" as const },
      { name: "Jaypee Hospital Sector 128", distance_km: 4.8, type: "hospital" as const },
      { name: "Starling Edge Mall", distance_km: 0.2, type: "mall" as const }
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
        name: "Official 3C Lotus 300 Brochure",
        storage_url: "https://storage.realtypals.com/documents/lotus-300-brochure.pdf",
        doc_type: "brochure",
        file_size_bytes: 6540000
      }
    })
    await prisma.projectDocument.create({
      data: {
        project_id: project.id,
        project_slug: project.slug,
        name: "3C Lotus 300 Floorplots Blueprint",
        storage_url: "https://storage.realtypals.com/documents/lotus-300-floorplots.pdf",
        doc_type: "floor_plan",
        file_size_bytes: 4920000
      }
    })
    console.log('✓ Seeded documents')

    // 7. Clear and seed images
    await prisma.projectImage.deleteMany({ where: { project_id: project.id } })
    await prisma.projectImage.create({
      data: {
        project_id: project.id,
        url: "https://storage.realtypals.com/projects/3c-lotus-300/hero.jpg",
        type: "hero"
      }
    })
    console.log('✓ Seeded images')

    // 8. Seed DecisionProfile & Intelligence Data
    const intelligenceJson = {
      topLevelMetrics: {
        overallScore: 70,
        tier: 'BUY_WITH_CAUTION',
        investmentGrade: 'C',
        investmentGradeLabel: 'NCLT / registry delays',
        priceAdvantage: '+15%',
        priceAdvantageSubtext: 'Premium',
        confidenceLevel: 'Medium',
        confidenceLabel: 'Verify Registry Status'
      },
      dimensionScores: {
        builderTrust: { score: 45, status: 'High Risk' },
        locationQuality: { score: 85, status: 'Verified' },
        lifestyleAmenities: { score: 92, status: 'Verified' },
        valueForMoney: { score: 70, status: 'Verified' },
        appreciationPotential: { score: 75, status: 'Verified' },
        legalSafety: { score: 50, status: 'In Dispute' }
      },
      buyerPersonas: [
        {
          type: 'Ultra-Luxury Families',
          stars: 4,
          headline: 'Massive Space & Resort Amenities',
          reasons: [
            'Grand layouts from 3,650 to 5,300 sq.ft. providing villa-sized indoor spaces.',
            'Rich recreational amenities including indoor heated pool and mini golf.'
          ]
        },
        {
          type: 'Risk-Averse Buyers',
          stars: 2,
          headline: 'Insolvency and Registry Delays',
          reasons: [
            'The developer is in active NCLT insolvency proceedings.',
            'Registry execution is highly complex and subject to authority clearings.'
          ]
        }
      ],
      riskRadar: [
        {
          type: 'Developer Legal Risk',
          level: 'High Risk',
          description: 'Corporate insolvency proceedings (NCLT) against builder complicate title registries.'
        },
        {
          type: 'Maintenance Transition',
          level: 'Medium Risk',
          description: 'Interim disputes over compound maintenance and facility operations.'
        }
      ],
      transparency_checks: [
        {
          label: 'RERA Registered',
          ok: true,
          details: 'Approved under RERA registration ID UPRERAPRJ6828.'
        },
        {
          label: 'NCLT Active',
          ok: false,
          details: 'Active corporate insolvency proceedings against The 3C Company.'
        }
      ],
      investment_insights: {
        appreciation_annual: '6-8%',
        appreciation_desc: 'Muted appreciation due to developer legal issues and secondary-market reliance.',
        rental_yield: '3.0%',
        rental_desc: 'Strong rental appeal due to massive size and prime Sector 107 connectivity.',
        market_trend: 'Neutral',
        market_desc: 'Registries must be verified individually with the Noida Authority.',
        liquidity_score: 'Medium',
        liquidity_desc: 'Resales require active coordination due to pending registry clearances.'
      },
      quick_commutes: [
        { destination: "Pathways School Noida", time: "1 Min", icon: "school" },
        { destination: "Sector 101 Metro", time: "8 Mins", icon: "train" },
        { destination: "Noida-Greater Noida Expressway", time: "5 Mins", icon: "map-pin" },
        { destination: "DLF Mall of India", time: "12 Mins", icon: "shopping" }
      ],
      location_highlights: [
        {
          title: "Pathways School Access",
          time: "At Doorstep",
          description: "Located just next to the premier Pathways School Noida campus.",
          icon: "school"
        }
      ],
      nearby_essentials: {
        "Schools": [
          { name: "Pathways School Noida", dist: "0.5 km" },
          { name: "Amity University Sector 125", dist: "6.5 km" }
        ],
        "Hospitals": [
          { name: "PrimaCare Multispecialty", dist: "1.2 km" },
          { name: "Jaypee Hospital", dist: "4.8 km" }
        ],
        "Shopping": [
          { name: "Starling Edge Mall", dist: "0.2 km" },
          { name: "DLF Mall of India", dist: "9.5 km" }
        ]
      },
      neighborhood_advantages: [
        {
          title: "Established Luxury Enclave",
          description: "Sector 107 is one of Noida's cleanest, lowest density sectors with high-end communities.",
          icon: "shield"
        }
      ]
    }

    await prisma.decisionProfile.upsert({
      where: { project_id: project.id },
      update: {
        status: 'PUBLISHED',
        decision_thesis: '3C Lotus 300 offers ultra-spacious, high-end ready-to-move-in living in Sector 107 Noida with exceptional privacy and light, but buyers must navigate a complex history of stalled registries and developer insolvency.',
        why_buy: [
          'Exceptional low-density luxury design with only 300 residences spread across 10 acres.',
          'Massive residential configurations starting at 3,650 sq.ft. up to 5,300 sq.ft., offering true mansion-sized rooms.',
          'Ultimate privacy and ventilation with only 2 apartments per floor and 3-side open layout.',
          'Completed ready-to-move status avoids construction delay risks and offers immediate utilization.',
          'Premium resort-style amenities including an indoor heated pool, a lawn tennis court, and a mini golf course.'
        ],
        why_avoid: [
          'Significant developer legal distress: The 3C Company went into NCLT/insolvency, leading to severe registry delays.',
          'Sub-optimal maintenance and facility management due to ongoing builder-transition disputes.',
          'Aggressive luxury ticket size (₹5.84 Cr - ₹9.64 Cr+) with steep monthly maintenance charges.'
        ],
        intelligence_data: intelligenceJson,
        last_verified_at: new Date(),
        verified_by: 'seed'
      },
      create: {
        project_id: project.id,
        status: 'PUBLISHED',
        decision_thesis: '3C Lotus 300 offers ultra-spacious, high-end ready-to-move-in living in Sector 107 Noida with exceptional privacy and light, but buyers must navigate a complex history of stalled registries and developer insolvency.',
        why_buy: [
          'Exceptional low-density luxury design with only 300 residences spread across 10 acres.',
          'Massive residential configurations starting at 3,650 sq.ft. up to 5,300 sq.ft., offering true mansion-sized rooms.',
          'Ultimate privacy and ventilation with only 2 apartments per floor and 3-side open layout.',
          'Completed ready-to-move status avoids construction delay risks and offers immediate utilization.',
          'Premium resort-style amenities including an indoor heated pool, a lawn tennis court, and a mini golf course.'
        ],
        why_avoid: [
          'Significant developer legal distress: The 3C Company went into NCLT/insolvency, leading to severe registry delays.',
          'Sub-optimal maintenance and facility management due to ongoing builder-transition disputes.',
          'Aggressive luxury ticket size (₹5.84 Cr - ₹9.64 Cr+) with steep monthly maintenance charges.'
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
      base_price_per_sqft: 16000.00,
      gst_rate_pct: 0.00,
      stamp_duty_pct: 6.00,
      registration_pct: 1.00,
      parking_cost: 500000.00,
      club_membership: 300000.00,
      ifms: 100.00,
      plc_charges: [
        { "label": "Park Facing PLC", "amount_per_sqft": 300.00 },
        { "label": "Corner Unit PLC", "amount_per_sqft": 150.00 }
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
        { "milestone": "At the Time of Booking", "pct": 10.0, "amt": 5840000.0, "due": "Immediate", "done": true },
        { "milestone": "Within 30 Days of Booking", "pct": 40.0, "amt": 23360000.0, "due": "30 days from booking", "done": true },
        { "milestone": "At the Time of Registry & Offer of Possession", "pct": 50.0, "amt": 29200000.0, "due": "Handoff & registry execution", "done": false }
      ]
    }
    await prisma.paymentPlan.upsert({
      where: { project_id: project.id },
      create: paymentPlanData,
      update: paymentPlanData
    })
    console.log('✓ Seeded Payment Plan')

    console.log('✅ 3C Lotus 300 project seeding complete!')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seed()
