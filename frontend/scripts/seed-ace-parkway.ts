import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seed() {
  console.log('🌱 Seeding ACE Parkway project data...')

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

    // 2. Find or create ACE Parkway project
    let project = await prisma.project.findUnique({
      where: { slug: 'ace-parkway-sector-150' }
    })

    const projectData = {
      name: 'ACE Parkway',
      slug: 'ace-parkway-sector-150',
      builder: { connect: { id: builder.id } },
      sector: 'Sector 150',
      city: 'Noida',
      status: 'ready_to_move' as const,
      tagline: 'Art Deco Inspired Green Living',
      hero_image_url: 'https://storage.realtypals.com/projects/ace-parkway/hero.jpg',
      rera_number: 'UPRERAPRJ4514',
      total_towers: 11,
      floors: 'G+26',
      total_units: 970,
      land_area_acres: 11.26,
      price_min_cr: 1.51,
      price_range_label: '₹1.51 Cr - ₹4.82 Cr+',
      possession_label: 'Ready to Move',
      possession_date: new Date('2023-06-30T00:00:00Z'),
      launch_date: new Date('2017-09-15T00:00:00Z'),
      architect: 'Hafeez Contractor',
      interior_designer: 'Gauri Khan',
      open_space_pct: 79,
      green_rating: 'LEED Certified Green',
      project_type: 'Residential',
      lat: 28.432134,
      lng: 77.482226,
      marketing_claims: [
        'Art Deco themed elevations designed by award-winning Hafeez Contractor',
        'Sample interiors and concepts exclusively curated by Gauri Khan',
        'Breathtaking views overlooking the massive 42-acre Shaheed Bhagat Singh Park',
        'Ultra-low-density planning with just 86 apartments per acre and 79% open green area',
        'Massive central sports arena loaded with 51 physical fitness & recreation facilities'
      ],
      ai_search_keywords: ['ace parkway', 'sector 150 noida expressway', 'ready to move sector 150 noida', 'luxury 3bhk noida expressway']
    }

    if (!project) {
      project = await prisma.project.create({
        data: projectData
      })
      console.log('✓ Created ACE Parkway project')
    } else {
      project = await prisma.project.update({
        where: { id: project.id },
        data: projectData
      })
      console.log('✓ Updated ACE Parkway project')
    }

    // 3. Clear and seed amenities
    await prisma.amenity.deleteMany({ where: { project_id: project.id } })
    const topAmenities = [
      { name: "Temperature-Controlled Indoor Pool", category: "wellness" as const },
      { name: "51 Sports & Fitness Amenities", category: "sports" as const },
      { name: "Art Deco Elevations", category: "lifestyle" as const },
      { name: "Reflexology Park", category: "wellness" as const },
      { name: "Skating Rink", category: "sports" as const },
      { name: "Lawn Tennis Court", category: "sports" as const }
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
        super_area_sqft: 1085.0,
        carpet_area_sqft: 716.0,
        price_min_cr: 1.51,
        category_badge: "Executive Entry",
        perfect_for: ["Growing Families"],
        views: []
      },
      {
        name: "3 BHK Premium Suite",
        bhk: 3,
        super_area_sqft: 1395.0,
        carpet_area_sqft: 1024.0,
        price_min_cr: 1.95,
        category_badge: "Luxury Standard",
        perfect_for: ["Growing Families"],
        views: []
      },
      {
        name: "3 BHK Grande Mansion",
        bhk: 3,
        super_area_sqft: 2190.0,
        carpet_area_sqft: 1324.0,
        price_min_cr: 3.07,
        category_badge: "Elite Premium",
        perfect_for: ["Remote Workers", "NCR Professionals"],
        views: []
      },
      {
        name: "4 BHK Imperial Mansion",
        bhk: 4,
        super_area_sqft: 3220.0,
        carpet_area_sqft: 2360.0,
        price_min_cr: 4.80,
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
      { name: "The Learner's Valley School", distance_km: 1.2, type: "school" as const },
      { name: "KR Mangalam World School", distance_km: 2.1, type: "school" as const },
      { name: "DPS Sector 150", distance_km: 2.8, type: "school" as const },
      { name: "Sector 148 Metro Station (Aqua Line)", distance_km: 2.5, type: "metro" as const },
      { name: "Noida-Greater Noida Expressway", distance_km: 3.0, type: "landmark" as const },
      { name: "Jaypee Hospital Sector 128", distance_km: 12.5, type: "hospital" as const },
      { name: "Felix Hospital", distance_km: 10.2, type: "hospital" as const },
      { name: "Sector 150 Commercial Hub", distance_km: 1.5, type: "mall" as const }
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
        name: "Official ACE Parkway Brochure",
        storage_url: "https://storage.realtypals.com/documents/ace-parkway-brochure.pdf",
        doc_type: "brochure",
        file_size_bytes: 6120000
      }
    })
    await prisma.projectDocument.create({
      data: {
        project_id: project.id,
        project_slug: project.slug,
        name: "ACE Parkway Unit Blueprints Portfolio",
        storage_url: "https://storage.realtypals.com/documents/ace-parkway-layouts.pdf",
        doc_type: "floor_plan",
        file_size_bytes: 4890000
      }
    })
    console.log('✓ Seeded documents')

    // 7. Clear and seed images
    await prisma.projectImage.deleteMany({ where: { project_id: project.id } })
    await prisma.projectImage.create({
      data: {
        project_id: project.id,
        url: "https://storage.realtypals.com/projects/ace-parkway/hero.jpg",
        type: "hero"
      }
    })
    console.log('✓ Seeded images')

    // 8. Seed DecisionProfile & Intelligence Data
    const intelligenceJson = {
      topLevelMetrics: {
        overallScore: 91,
        tier: 'STRONG_BUY',
        investmentGrade: 'A',
        priceAdvantage: '0%',
        priceAdvantageSubtext: 'Premium Refined',
        confidenceLevel: 'High',
        confidenceLabel: 'Highly Reliable'
      },
      dimensionScores: {
        builderTrust: { score: 98, status: 'Verified' },
        locationQuality: { score: 92, status: 'Verified' },
        lifestyleAmenities: { score: 90, status: 'Verified' },
        valueForMoney: { score: 85, status: 'Verified' },
        appreciationPotential: { score: 89, status: 'Verified' },
        legalSafety: { score: 92, status: 'Verified' }
      },
      buyerPersonas: [
        {
          type: 'C-Suite Executives & HNIs',
          stars: 5,
          headline: 'Hafeez Contractor Architecture & Luxury',
          reasons: [
            'Iconic Art Deco design by Hafeez Contractor with Gauri Khan styled concepts.',
            'Direct scenic overlooks on Sector 150\'s massive Shaheed Bhagat Singh park.'
          ]
        },
        {
          type: 'Active Outdoor Families',
          stars: 5,
          headline: '51 Sports Zones & Central Greens',
          reasons: [
            'Loaded with 51 physical fitness, courts, and kids skating arenas.',
            'Large 79% open green landscape layout.'
          ]
        }
      ],
      riskRadar: [
        {
          type: 'Registry Delay Nuisance',
          level: 'Medium Risk',
          description: 'Noida Sports City local regulatory clearings have historically deferred registry finalizations.'
        }
      ],
      transparency_checks: [
        {
          label: 'RERA Registered',
          ok: true,
          details: 'Approved under RERA registration ID UPRERAPRJ4514.'
        },
        {
          label: 'Completed & Certified',
          ok: true,
          details: 'Physical structural construction completed, with Occupancy Certificate (OC) received.'
        }
      ],
      investment_insights: {
        appreciation_annual: '10-14%',
        appreciation_desc: 'Consistent resale value appreciation in Sector 150, Noida\'s greenest residential corridor.',
        rental_yield: '3.5%',
        rental_desc: 'Strong rental cashflows from corporate professionals favoring low density living.',
        market_trend: 'Bullish',
        market_desc: 'Sector 150 Noida Sports City remains Noida\'s primary premium low density benchmark.',
        liquidity_score: 'High',
        liquidity_desc: 'Extremely high exits on secondary-market due to ready to move luxury status.'
      },
      quick_commutes: [
        { destination: "Learner's Valley School", time: "3 Mins", icon: "school" },
        { destination: "Sector 148 Metro", time: "5 Mins", icon: "train" },
        { destination: "Noida-Greater Noida Exp", time: "5 Mins", icon: "map-pin" }
      ],
      location_highlights: [
        {
          title: "Overlooking Shaheed Bhagat Singh Park",
          time: "Immediate View",
          description: "Panoramic vistas of Sector 150's premier 42-acre public park space.",
          icon: "map-pin"
        }
      ],
      nearby_essentials: {
        "Schools": [
          { name: "The Learner's Valley School", dist: "1.2 km" },
          { name: "KR Mangalam World School", dist: "2.1 km" }
        ],
        "Hospitals": [
          { name: "Felix Hospital", dist: "10.2 km" }
        ],
        "Shopping": [
          { name: "Sector 150 Commercial Hub", dist: "1.5 km" }
        ]
      },
      neighborhood_advantages: [
        {
          title: "Sports City Ecosystem",
          description: "Low-density zoning limits high-rise congestion and secures open spaces.",
          icon: "shield"
        }
      ]
    }

    await prisma.decisionProfile.upsert({
      where: { project_id: project.id },
      update: {
        status: 'PUBLISHED',
        decision_thesis: 'ACE Parkway represents Sector 150 Noida\'s premier ready-to-move-in luxury address, featuring spectacular Art Deco architecture by Hafeez Contractor, exquisite Gauri Khan interiors, and unmatched low-density layouts overlooking the massive 42-acre central park.',
        why_buy: [
          'Fully ready-to-move-in luxury units with no execution or construction delays.',
          'Celebrity-designed credentials with architecture by Hafeez Contractor, layouts by Gauri Khan, and landscapes by Sanju Bose.',
          'Low-density planning with 79% open green space and only 86 units per acre over an 11-acre plot.',
          'Direct panoramic views overlooking Sector 150’s massive 42-acre Shaheed Bhagat Singh Park.',
          'Extremely robust sports infrastructure containing 51 distinct fitness, leisure, and recreation zones.'
        ],
        why_avoid: [
          'High pricing levels ranging up to ₹15,000-16,000/sq.ft. on resale configurations compared to older sector rates.',
          'High upfront capital requirement since the project is completed and ready to move.',
          'Noida Sports City local regulatory approvals have faced historical sector-level delays on registry finalizations, though physical delivery is complete.'
        ],
        intelligence_data: intelligenceJson,
        last_verified_at: new Date(),
        verified_by: 'seed'
      },
      create: {
        project_id: project.id,
        status: 'PUBLISHED',
        decision_thesis: 'ACE Parkway represents Sector 150 Noida\'s premier ready-to-move-in luxury address, featuring spectacular Art Deco architecture by Hafeez Contractor, exquisite Gauri Khan interiors, and unmatched low-density layouts overlooking the massive 42-acre central park.',
        why_buy: [
          'Fully ready-to-move-in luxury units with no execution or construction delays.',
          'Celebrity-designed credentials with architecture by Hafeez Contractor, layouts by Gauri Khan, and landscapes by Sanju Bose.',
          'Low-density planning with 79% open green space and only 86 units per acre over an 11-acre plot.',
          'Direct panoramic views overlooking Sector 150’s massive 42-acre Shaheed Bhagat Singh Park.',
          'Extremely robust sports infrastructure containing 51 distinct fitness, leisure, and recreation zones.'
        ],
        why_avoid: [
          'High pricing levels ranging up to ₹15,000-16,000/sq.ft. on resale configurations compared to older sector rates.',
          'High upfront capital requirement since the project is completed and ready to move.',
          'Noida Sports City local regulatory approvals have faced historical sector-level delays on registry finalizations, though physical delivery is complete.'
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
      base_price_per_sqft: 14000.00,
      gst_rate_pct: 0.00,
      stamp_duty_pct: 6.00,
      registration_pct: 1.00,
      parking_cost: 400000.00,
      club_membership: 250000.00,
      ifms: 50.00,
      plc_charges: [
        { "label": "Park Facing PLC", "amount_per_sqft": 200.00 },
        { "label": "Corner Unit PLC", "amount_per_sqft": 100.00 },
        { "label": "Floor PLC (1st to 4th floors)", "amount_per_sqft": 150.00 }
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
      plan_name: 'Ready Possesion Plan',
      milestones: [
        { "milestone": "At the Time of Booking", "pct": 10.0, "amt": 1510000.0, "due": "Immediate", "done": true },
        { "milestone": "Within 30 Days of Booking", "pct": 40.0, "amt": 6040000.0, "due": "30 days from booking", "done": true },
        { "milestone": "On Registry and Possession", "pct": 50.0, "amt": 7550000.0, "due": "Final keys & registry execution", "done": false }
      ]
    }
    await prisma.paymentPlan.upsert({
      where: { project_id: project.id },
      create: paymentPlanData,
      update: paymentPlanData
    })
    console.log('✓ Seeded Payment Plan')

    console.log('✅ ACE Parkway project seeding complete!')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seed()
