import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seed() {
  console.log('🌱 Seeding Amrapali Heartbeat City project data...')

  try {
    // 1. Find or create builder
    let builder = await prisma.builder.findFirst({
      where: { name: 'Amrapali Group (Now NBCC)' }
    })

    const builderData = {
      name: 'Amrapali Group (Now NBCC)',
      slug: 'amrapali-group-now-nbcc',
      company_overview: 'Amrapali Group was originally established in 2003 and grew into one of NCR\'s largest builders, launching massive projects like Heartbeat City, Silicon City, and Centurian Park. Following severe financial default, mismanagement, and regulatory failures, the Supreme Court of India in 2019 cancelled Amrapali\'s RERA registrations and appointed NBCC (National Buildings Construction Corporation), a state-owned Navratna enterprise, to complete and deliver all stalled projects. Today, \'NBCC Aspire\' manages construction and delivery, representing a historic court-supervised rescue model.',
      founded_year: 2003,
      delivered_units: 45000,
      rera_compliance_score: 50,
      tagline: 'Completed by NBCC'
    }

    if (!builder) {
      builder = await prisma.builder.create({
        data: builderData
      })
      console.log('✓ Created Amrapali builder')
    } else {
      builder = await prisma.builder.update({
        where: { id: builder.id },
        data: builderData
      })
      console.log('✓ Updated Amrapali builder')
    }

    // 2. Find or create Amrapali Heartbeat City project
    let project = await prisma.project.findUnique({
      where: { slug: 'amrapali-heartbeat-city-sector-107' }
    })

    const projectData = {
      name: 'Amrapali Heartbeat City',
      slug: 'amrapali-heartbeat-city-sector-107',
      builder: { connect: { id: builder.id } },
      sector: 'Sector 107',
      city: 'Noida',
      status: 'ready_to_move' as const,
      tagline: 'A Vibrant Community Completed by NBCC',
      hero_image_url: 'https://storage.realtypals.com/projects/amrapali-heartbeat-city/hero.jpg',
      rera_number: 'UPRERAPRJ13913',
      total_towers: 21,
      floors: 'G+27',
      total_units: 1800,
      land_area_acres: 18.0,
      price_min_cr: 1.31,
      price_range_label: '₹1.31 Cr - ₹3.56 Cr+',
      possession_label: 'Ready to Move / Completed in Phases',
      possession_date: new Date('2024-10-14T00:00:00Z'),
      launch_date: new Date('2011-03-23T00:00:00Z'),
      architect: 'Andy Fisher (Singapore)',
      interior_designer: 'Andy Fisher Workshop',
      open_space_pct: 75,
      green_rating: 'Completed Greens',
      project_type: 'Residential',
      lat: 28.541700,
      lng: 77.372500,
      marketing_claims: [
        'Re-developed and completed by NBCC under Supreme Court supervision',
        'Spacious 18-acre green campus featuring 21 premium high-rise towers',
        'Many units are 3- or 4-side open with no common walls for ultimate privacy',
        'Located opposite Sector 50 Noida, right next to the Dadri Main Road and expressway',
        'Equipped with a grand clubhouse, Olympic-sized swimming pool, and sports arena'
      ],
      ai_search_keywords: ['amrapali heartbeat city', 'nbcc aspire heartbeat city', 'sector 107 noida', 'ready to move sector 107 noida']
    }

    if (!project) {
      project = await prisma.project.create({
        data: projectData
      })
      console.log('✓ Created Amrapali Heartbeat City project')
    } else {
      project = await prisma.project.update({
        where: { id: project.id },
        data: projectData
      })
      console.log('✓ Updated Amrapali Heartbeat City project')
    }

    // 3. Clear and seed amenities
    await prisma.amenity.deleteMany({ where: { project_id: project.id } })
    const topAmenities = [
      { name: "Clubhouse", category: "lifestyle" as const },
      { name: "Swimming Pool", category: "sports" as const },
      { name: "Gymnasium", category: "sports" as const },
      { name: "Running Track", category: "sports" as const },
      { name: "Yoga & Meditation Lawn", category: "wellness" as const },
      { name: "Kids' Play Zone", category: "kids" as const },
      { name: "Multipurpose Court", category: "sports" as const }
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
        name: "2 BHK Premium",
        bhk: 2,
        super_area_sqft: 1195.0,
        carpet_area_sqft: 780.0,
        price_min_cr: 1.31,
        category_badge: "Executive Cozy",
        perfect_for: ["Growing Families"],
        views: []
      },
      {
        name: "3 BHK Value Suite",
        bhk: 3,
        super_area_sqft: 1350.0,
        carpet_area_sqft: 920.0,
        price_min_cr: 1.49,
        category_badge: "Compact Family",
        perfect_for: ["Growing Families"],
        views: []
      },
      {
        name: "3 BHK Premium Suite",
        bhk: 3,
        super_area_sqft: 1575.0,
        carpet_area_sqft: 1080.0,
        price_min_cr: 1.73,
        category_badge: "Luxury Standard",
        perfect_for: ["Growing Families"],
        views: []
      },
      {
        name: "3 BHK Elite with Servant",
        bhk: 3,
        super_area_sqft: 2125.0,
        carpet_area_sqft: 1450.0,
        price_min_cr: 2.34,
        category_badge: "Executive Mansion",
        perfect_for: ["Remote Workers", "NCR Professionals"],
        views: []
      },
      {
        name: "4 BHK Elite with Servant",
        bhk: 4,
        super_area_sqft: 2825.0,
        carpet_area_sqft: 1950.0,
        price_min_cr: 3.11,
        category_badge: "Grand Imperial",
        perfect_for: ["HNIs", "Large Families"],
        views: []
      },
      {
        name: "4 BHK Platinum Mansion",
        bhk: 4,
        super_area_sqft: 3235.0,
        carpet_area_sqft: 2210.0,
        price_min_cr: 3.56,
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
      { name: "Pathways School Noida", distance_km: 1.2, type: "school" as const },
      { name: "Noida Sector 101 Metro Station (Aqua Line)", distance_km: 3.5, type: "metro" as const },
      { name: "Noida-Greater Noida Expressway", distance_km: 5.7, type: "landmark" as const },
      { name: "Tech Boulevard Business Park", distance_km: 6.1, type: "landmark" as const },
      { name: "PrimaCare ClearMedi Hospital", distance_km: 1.8, type: "hospital" as const },
      { name: "Jaypee Hospital Sector 128", distance_km: 5.0, type: "hospital" as const },
      { name: "Starling Edge Mall Sector 107", distance_km: 0.5, type: "mall" as const },
      { name: "DLF Mall of India Sector 18", distance_km: 9.5, type: "mall" as const }
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
        name: "Official Amrapali Heartbeat City Brochure",
        storage_url: "https://storage.realtypals.com/documents/amrapali-heartbeat-city-brochure.pdf",
        doc_type: "brochure",
        file_size_bytes: 5120000
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
        url: "https://storage.realtypals.com/projects/amrapali-heartbeat-city/hero.jpg",
        type: "hero"
      }
    })
    console.log('✓ Seeded images')

    // 8. Seed DecisionProfile & Intelligence Data
    const intelligenceJson = {
      topLevelMetrics: {
        overallScore: 75,
        tier: 'BUY_WITH_CAUTION',
        investmentGrade: 'C',
        priceAdvantage: '-42%',
        priceAdvantageSubtext: 'Substantial Discount',
        confidenceLevel: 'Medium',
        confidenceLabel: 'SC Monitored Delivery'
      },
      dimensionScores: {
        builderTrust: { score: 50, status: 'NBCC Takeover' },
        locationQuality: { score: 88, status: 'Verified' },
        lifestyleAmenities: { score: 80, status: 'Verified' },
        valueForMoney: { score: 90, status: 'Verified' },
        appreciationPotential: { score: 75, status: 'Verified' },
        legalSafety: { score: 70, status: 'SC Escrow Monitored' }
      },
      buyerPersonas: [
        {
          type: 'Value-Seeking Families',
          stars: 4,
          headline: 'Highly Competitive Entry & Layout Privacy',
          reasons: [
            'Priced at ~₹11,000/sq.ft. vs. Sector 107 average of ₹19,000/sq.ft.',
            'Spacious 3-side open layout configurations with zero common sharing walls.'
          ]
        },
        {
          type: 'Premium Luxury Buyers',
          stars: 2,
          headline: 'Legacy Construction Finish Issues',
          reasons: [
            'Older structural aesthetics and sub-optimal lift/external finishes.',
            'Slow administrative handovers and delayed court receiver channels.'
          ]
        }
      ],
      riskRadar: [
        {
          type: 'Finish Quality & Maintenance',
          level: 'Medium Risk',
          description: 'Resident complaints on lift maintenance, external plasters, and finishing details.'
        },
        {
          type: 'Administrative Registry Handovers',
          level: 'Medium Risk',
          description: 'Handovers governed by SC receiver committees, causing slower registry approvals.'
        }
      ],
      transparency_checks: [
        {
          label: 'RERA Registered',
          ok: true,
          details: 'Approved under RERA registration ID UPRERAPRJ13913.'
        },
        {
          label: 'NBCC Taken Over',
          ok: true,
          details: 'Supreme Court-monitored transition. NBCC executing construction and registry handoffs.'
        }
      ],
      investment_insights: {
        appreciation_annual: '8-10%',
        appreciation_desc: 'Gradual appreciation as NBCC hands over successive towers and stabilizes local compound.',
        rental_yield: '3.3%',
        rental_desc: 'Healthy rental interest opposite Sector 50 Noida, driven by affordable luxury entry point.',
        market_trend: 'Neutral-Positive',
        market_desc: 'Buying is secure under the SC escrow channels, though processing times are long.',
        liquidity_score: 'Medium',
        liquidity_desc: 'Secondary resales are active but require clearance from the court-appointed receiver.'
      },
      quick_commutes: [
        { destination: "Pathways School", time: "2 Mins", icon: "school" },
        { destination: "Sector 101 Metro", time: "8 Mins", icon: "train" },
        { destination: "Noida-Greater Noida Exp", time: "5 Mins", icon: "map-pin" }
      ],
      location_highlights: [
        {
          title: "Dadri Main Road Axis",
          time: "Direct Access",
          description: "Connecting directly to central Noida and major commercial layouts.",
          icon: "map-pin"
        }
      ],
      nearby_essentials: {
        "Schools": [
          { name: "Pathways School Noida", dist: "1.2 km" },
          { name: "GD Goenka International School", dist: "3.5 km" }
        ],
        "Hospitals": [
          { name: "PrimaCare ClearMedi Hospital", dist: "1.8 km" }
        ],
        "Shopping": [
          { name: "Starling Edge Mall Sector 107", dist: "0.5 km" }
        ]
      },
      neighborhood_advantages: [
        {
          title: "Premium Sector Access",
          description: "Affordable luxury footprint inside Noida's elite residential sector.",
          icon: "shield"
        }
      ]
    }

    await prisma.decisionProfile.upsert({
      where: { project_id: project.id },
      update: {
        status: 'PUBLISHED',
        decision_thesis: 'Amrapali Heartbeat City (NBCC Aspire) offers an exceptionally affordable entry point into the highly premium and otherwise expensive Sector 107 Noida micro-market. Backed by Supreme Court-monitored NBCC delivery, the project features large-format layouts with excellent 3-side open privacy, but buyers must tolerate legacy sub-par construction finishing and slow administrative handovers.',
        why_buy: [
          'Highly competitive pricing baseline (approx. ₹11,000/sq.ft.) compared to Sector 107\'s ready-to-move premium averages (₹19,000-20,000/sq.ft.).',
          'Unrivaled layout privacy with 3-side open or 4-side open configurations featuring no common sharing walls.',
          'Complete peace of mind regarding project completion, protected by Supreme Court monitoring and state-owned NBCC execution.',
          'Excellent location directly on the Dadri Main Road corridor opposite posh Sector 50 Noida.',
          'Ready-to-move phases allow for immediate possession and escape from rent cycles.'
        ],
        why_avoid: [
          'Legacy construction finish quality (e.g. lift maintenance, external plasters) has faced resident complaints regarding finishing touches.',
          'Extremely slow administrative handovers and delayed registry finalization due to court-monitored receiver channels.',
          'Historical legacy delays since 2011 have aged the overall structural aesthetics compared to modern ultra-luxury developments.'
        ],
        intelligence_data: intelligenceJson,
        last_verified_at: new Date(),
        verified_by: 'seed'
      },
      create: {
        project_id: project.id,
        status: 'PUBLISHED',
        decision_thesis: 'Amrapali Heartbeat City (NBCC Aspire) offers an exceptionally affordable entry point into the highly premium and otherwise expensive Sector 107 Noida micro-market. Backed by Supreme Court-monitored NBCC delivery, the project features large-format layouts with excellent 3-side open privacy, but buyers must tolerate legacy sub-par construction finishing and slow administrative handovers.',
        why_buy: [
          'Highly competitive pricing baseline (approx. ₹11,000/sq.ft.) compared to Sector 107\'s ready-to-move premium averages (₹19,000-20,000/sq.ft.).',
          'Unrivaled layout privacy with 3-side open or 4-side open configurations featuring no common sharing walls.',
          'Complete peace of mind regarding project completion, protected by Supreme Court monitoring and state-owned NBCC execution.',
          'Excellent location directly on the Dadri Main Road corridor opposite posh Sector 50 Noida.',
          'Ready-to-move phases allow for immediate possession and escape from rent cycles.'
        ],
        why_avoid: [
          'Legacy construction finish quality (e.g. lift maintenance, external plasters) has faced resident complaints regarding finishing touches.',
          'Extremely slow administrative handovers and delayed registry finalization due to court-monitored receiver channels.',
          'Historical legacy delays since 2011 have aged the overall structural aesthetics compared to modern ultra-luxury developments.'
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
      base_price_per_sqft: 11000.00,
      gst_rate_pct: 0.00,
      stamp_duty_pct: 6.00,
      registration_pct: 1.00,
      parking_cost: 300000.00,
      club_membership: 150000.00,
      ifms: 50.00,
      plc_charges: [
        { "label": "Park/Pool Facing PLC", "amount_per_sqft": 150.00 },
        { "label": "High Floor PLC", "amount_per_sqft": 100.00 }
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
        { "milestone": "Booking Token Amount", "pct": 10.0, "amt": 1310000.0, "due": "Immediate", "done": true },
        { "milestone": "Upon Court Receiver Handoff Consent", "pct": 40.0, "amt": 5240000.0, "due": "Within 30 Days of Booking", "done": true },
        { "milestone": "On Execution of Registry & Key Handover", "pct": 50.0, "amt": 6550000.0, "due": "Handoff", "done": false }
      ]
    }
    await prisma.paymentPlan.upsert({
      where: { project_id: project.id },
      create: paymentPlanData,
      update: paymentPlanData
    })
    console.log('✓ Seeded Payment Plan')

    console.log('✅ Amrapali Heartbeat City project seeding complete!')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seed()
