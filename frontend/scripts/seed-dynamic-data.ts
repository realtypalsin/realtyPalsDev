import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seed() {
  console.log('Seeding Elite X Dynamic Data...')
  
  const project = await prisma.project.findUnique({
    where: { slug: 'elite-x-sector-10-greater-noida-west' }
  })
  if (!project) throw new Error('Elite X not found. Run base seed first.')
  
  const builder = await prisma.builder.findFirst({
    where: { name: 'Elite Group' }
  })

  // 1. Overview Tab updates
  await prisma.project.update({
    where: { id: project.id },
    data: {
      name: "Elite X",
      tagline: "Premium Biophilic Living with the X-Factor",
      status: "under_construction",
      rera_number: "UPRERAPRJ916631/02/2024",
      sector: "Sector 10",
      city: "Greater Noida West",
      total_towers: 7,
      floors: "G+28",
      total_units: 630,
      land_area_acres: 5.44,
      hero_image_url: "/assets/projects/elite-x/hero.jpg",
      price_min_cr: 1.84,
      possession_label: "Dec 2028",
      price_range_label: "₹1.84 Cr - ₹2.96 Cr+",
      lat: 28.599140,
      lng: 77.452310,
      address: "Plot No. GH-03A, Sector 10, Greater Noida West, UP 203207"
    }
  })

  if (builder) {
    await prisma.builder.update({
      where: { id: builder.id },
      data: {
        name: "Elite Group",
        description: "Legal Entity SPV: Golfgreen Mansions Private Limited"
      }
    })
  }

  // 2. Images
  await prisma.projectImage.deleteMany({ where: { project_id: project.id }})
  await prisma.projectImage.createMany({
    data: [
      { project_id: project.id, url: "/assets/projects/elite-x/hero.jpg", type: "hero", sort_order: 1 },
      { project_id: project.id, url: "/assets/projects/elite-x/exterior-view.jpg", type: "exterior", sort_order: 2 }
    ]
  })

  // 3. Unit Types
  const unitTypesData = [
    {
      name: "3 BHK + 3T",
      bhk: 3,
      bathrooms: 3,
      super_area_sqft: 1800,
      carpet_area_sqft: 968.43,
      balcony_area_sqft: 180.00,
      price_min_cr: 1.84,
      price_max_cr: 2.02,
      price_label: "₹1.84 Cr - ₹2.02 Cr",
      subtitle: "Spacious Premium Living with Zero Space Wastage",
      description: "Intelligently planned 3 BHK residence maximizing natural light, air circulation, and family living spaces with three fully equipped premium bathrooms.",
      category_badge: "Premium Family Choice",
      inventory_left: 14,
      perfect_for: ["First-time Homebuyers", "Nuclear Families", "IT Professionals"],
      whats_included: [
        { icon: "shield", title: "Video Door Phone", description: "Secure link to visitor desk" },
        { icon: "parking", title: "Covered Parking Slot", description: "Single allotted garage space" }
      ],
      key_highlights: [
        { icon: "wind", title: "3-Side Open Unit", description: "Maximum ventilation on all sides" },
        { icon: "height", title: "11-Ft High Ceilings", description: "Generous room volumes" }
      ],
      views: [
        { image_url: "/assets/projects/elite-x/views/garden-3bhk.jpg", title: "Central Courtyard View", subtitle: "Overlooks central biophilic gardens" }
      ]
    },
    {
      name: "3 BHK + 3T + Study",
      bhk: 3,
      bathrooms: 3,
      super_area_sqft: 2075,
      carpet_area_sqft: 977.75,
      balcony_area_sqft: 210.00,
      price_min_cr: 2.12,
      price_max_cr: 2.31,
      price_label: "₹2.12 Cr - ₹2.31 Cr",
      subtitle: "Modern Executive Home with Dedicated Workspace",
      description: "The perfect choice for work-from-home professionals, integrating a private, insulated study/home-office space directly into a large 3 BHK layout.",
      category_badge: "Executive Professional Choice",
      inventory_left: 8,
      perfect_for: ["Remote Work Professionals", "Upgraders", "Growing Families"],
      whats_included: [
        { icon: "lock", title: "Smart Digital Lock", description: "Fingerprint & passcode door access" },
        { icon: "parking", title: "Covered Parking Slot", description: "Allotted basement parking slot" }
      ],
      key_highlights: [
        { icon: "briefcase", title: "Insulated Home Office", description: "Dedicated quiet work room" },
        { icon: "sun", title: "Dual Deep Balconies", description: "Spacious balconies on double sides" }
      ],
      views: [
        { image_url: "/assets/projects/elite-x/views/golf-3.5bhk.jpg", title: "Mini-Golf Course View", subtitle: "Directly overlooks the exclusive putting greens" }
      ]
    },
    {
      name: "4 BHK + 4T + Servant Room",
      bhk: 4,
      bathrooms: 4,
      super_area_sqft: 2632,
      carpet_area_sqft: 1460.00,
      balcony_area_sqft: 280.00,
      price_min_cr: 2.96,
      price_max_cr: 3.10,
      price_label: "₹2.96 Cr - ₹3.10 Cr",
      subtitle: "The Ultimate Luxury Wing in Noida Extension",
      description: "The crown jewel configuration of Elite X. Features expansive grand room layouts, triple balconies, and a private servant/helper room with its own bathroom and separate entrance.",
      category_badge: "Ultra-Luxury / HNW Elite",
      inventory_left: 5,
      perfect_for: ["High-Net-Worth Individuals", "Joint Families", "NRI Buyers"],
      whats_included: [
        { icon: "lock", title: "Smart Digital Keyless Lock", description: "Multi-tier secure digital entry" },
        { icon: "parking", title: "Double Parking Slots", description: "Two allocated side-by-side parking spaces" },
        { icon: "kitchen", title: "Premium Modular Kitchen", description: "Equipped modular kitchen fixtures" }
      ],
      key_highlights: [
        { icon: "user-check", title: "Helper Quarter", description: "Helper room with separate service entry" },
        { icon: "height", title: "11-Ft High Ceilings", description: "Exceptional spatial height throughout" }
      ],
      views: [
        { image_url: "/assets/projects/elite-x/views/golf-4bhk.jpg", title: "Golf & Poolside Vistas", subtitle: "Panoramic double views of pool and golf greens" }
      ]
    }
  ]
  await prisma.unitType.deleteMany({ where: { project_id: project.id } })
  for (const u of unitTypesData) {
    await prisma.unitType.create({ data: { project_id: project.id, ...u } as any })
  }

  // 4. Documents
  await prisma.projectDocument.deleteMany({ where: { project_id: project.id } })
  await prisma.projectDocument.createMany({
    data: [
      { project_id: project.id, project_slug: project.slug, doc_type: "brochure", name: "Elite-X E-Brochure.pdf", storage_url: "/downloads/elite-x/elite-x-brochure.pdf", file_size_bytes: 12582912 },
      { project_id: project.id, project_slug: project.slug, doc_type: "floor_plan", name: "Elite-X Floor Plans.pdf", storage_url: "/downloads/elite-x/floor-plan.pdf", file_size_bytes: 8388608 },
      { project_id: project.id, project_slug: project.slug, doc_type: "price_list", name: "Elite-X Price List.pdf", storage_url: "/downloads/elite-x/price-list.pdf", file_size_bytes: 2097152 }
    ]
  })

  // 5. Decision Profile and Intelligence JSON Data
  const decisionProfileData = {
    status: "PUBLISHED" as any,
    decision_thesis: "Elite X represents an exceptional off-plan opportunity in Sector 10, combining a pristine legal and financial foundation backed by Tata Capital with high-end, low-density Mivan-tech execution.",
    why_buy: [
      "100% fast-track Mivan aluminum shuttering technology ensuring zero seepage and structural longevity.",
      "Highly exclusive low-density layout offering 70% open green biophilic spaces with only 630 total units.",
      "Premium, high-end amenities featuring a resident-only private mini-golf course.",
      "Prime growth corridor directly opposite Knowledge Park V with an upcoming Aqua Line metro extension."
    ],
    why_avoid: [
      "Under-construction project with an official possession timeline scheduled for late December 2028, locking up capital with zero immediate rental yield.",
      "Vast biophilic grounds and luxury club amenities result in a standard high super-area loading factor of approximately 45%."
    ],
    confidence_sources: ["RERA", "Project Documents", "Builder Claim"],
    intelligence_data: {
      dimensionScores: {
        builderTrust: { score: 92, status: "Verified" },
        locationQuality: { score: 88, status: "Verified" },
        lifestyleAmenities: { score: 90, status: "Verified" },
        valueForMoney: { score: 85, status: "Verified" },
        appreciationPotential: { score: 95, status: "Verified" },
        legalSafety: { score: 95, status: "Verified" }
      },
      topLevelMetrics: {
        overallScore: 88,
        tier: 'STRONG_BUY',
        investmentGrade: 'A',
        investmentGradeLabel: 'Low Risk / High Growth',
        priceAdvantage: '+12%',
        priceAdvantageSubtext: 'Premium',
        confidenceLevel: 'High',
        confidenceLabel: 'Highly Reliable'
      },
      buyerPersonas: [
        { type: 'Families', iconName: 'Users', stars: 5, reasons: ['Excellent Multi-Tiered Security: Features 24/7 gated security with CCTV, video door phones, intercoms, patrolling guards, and RFID access.'], fit: 'Great Fit', fitColor: 'text-emerald-600 bg-emerald-50' }
      ],
      investmentSnapshot: [
        { label: 'Expected Appreciation (5Y)', value: '12% - 16% Annual', iconName: 'TrendingUp', trend: 'up' },
        { label: 'Average Rent (3BHK)', value: '₹28,000 - ₹34,000 / month', iconName: 'Home', trend: 'neutral' },
        { label: 'Price Trend', value: 'Rising', iconName: 'Activity', trend: 'up', showArrow: true },
        { label: 'ROI Potential', value: '6.5% - 7.5% Rental Yield', iconName: 'BarChart3', trend: 'up' }
      ],
      pricingIntelligence: {
        projectAvg: "11000.00",
        marketAvg: "9800.00",
        premium: "+12%",
        justification: "Premium justified by monolithic Mivan-tech construction, low-density zoning, and luxury amenities like private golf greens."
      },
      riskRadar: [
        { type: 'Construction Risk', level: "Low", description: "Constructed using fast-track Mivan aluminum formwork and insulated from funding gaps by Tata Capital's institutional backing.", iconName: 'Building2', colorClass: 'text-emerald-500', bgClass: 'bg-emerald-50', badgeClass: 'bg-emerald-100 text-emerald-700' },
        { type: 'Market Risk', level: "Medium", description: "Noida Extension hosts high-density residential supply, but Elite X's low-density configuration limits its micro-market competition.", iconName: 'BarChart3', colorClass: 'text-amber-500', bgClass: 'bg-amber-50', badgeClass: 'bg-amber-100 text-amber-700' },
        { type: 'Legal Risk', level: "Low", description: "Fully RERA registered with clear title deeds certified by legal teams and ₹0.00 in outstanding authority land debt.", iconName: 'Scale', colorClass: 'text-emerald-500', bgClass: 'bg-emerald-50', badgeClass: 'bg-emerald-100 text-emerald-700' }
      ],
      location_hero_image: "/assets/projects/elite-x/location-hero-banner.jpg",
      quick_commutes: [
        { icon: "car", time: "15 mins", destination: "Noida Sector 62/63 IT Hub" },
        { icon: "car", time: "8 mins", destination: "Gaur Chowk (Noida Entry Point)" },
        { icon: "car", time: "15 mins", destination: "National Highway 24 (NH-24)" },
        { icon: "car", time: "10 mins", destination: "Noida-Greater Noida Expressway Link" }
      ],
      location_highlights: [
        { title: "Proposed Metro Station", time: "5 mins", description: "Located just 3 km from the upcoming Aqua Line Extension station", icon: "train" },
        { title: "Yatharth Hospital", time: "8 mins", description: "Quick, hassle-free access to major super-speciality medical care", icon: "heartpulse" },
        { title: "Retail Shopping Centers", time: "8 mins", description: "Sits 3.5 km away from Gaur City Mall and multiple local high-streets", icon: "shopping" }
      ],
      nearby_essentials: {
        Education: {
          image: "/assets/projects/elite-x/essentials/education.jpg",
          total_count: 8,
          places: [
            { name: "DPS Noida Extension", distance: "3.5 km" },
            { name: "Ryan International School", distance: "4.5 km" },
            { name: "Pacific World School", distance: "5.5 km" },
            { name: "Sarvottam International School", distance: "6.5 km" }
          ]
        },
        Hospitals: {
          image: "/assets/projects/elite-x/essentials/hospitals.jpg",
          total_count: 5,
          places: [
            { name: "Yatharth Super Speciality Hospital", distance: "4.2 km" },
            { name: "Fortis Hospital Noida", distance: "16.0 km" }
          ]
        },
        IT_Parks: {
          image: "/assets/projects/elite-x/essentials/it-parks.jpg",
          total_count: 10,
          places: [
            { name: "Knowledge Park V Office Corridor", distance: "0.1 km (Directly Opposite)" },
            { name: "Noida Sector 62/63 IT Corridor", distance: "13.5 km" }
          ]
        }
      },
      neighborhood_advantages: [
        { title: "Platinum Wing Corridor", description: "Sector 10 is planned with wider, congestion-free roads and structured, low-density layouts.", icon: "trending-up" },
        { title: "Direct Knowledge Park V Interface", description: "Positioned directly opposite KP-V, offering walking proximity to major IT and commercial sectors.", icon: "briefcase" }
      ],
      documents: [
        {
          id: "doc-elite-x-brochure",
          description: "Official marketing brochure outlining the master vision, biophilic landscaping details, and high-end community amenities.",
          thumbnail_url: "/assets/projects/elite-x/docs/thumbnails/brochure-thumb.jpg",
          file_format: "PDF",
          verified_by: "Developer Official",
          is_quick_access: true,
          category: { category_description: "Official project brochure and marketing material", category_icon_name: "brochure" }
        },
        {
          id: "doc-elite-x-floor-plan",
          description: "Comprehensive 3D layout maps, super areas, and detailed carpet dimensions for 3 BHK, 3.5 BHK, and 4 BHK units.",
          thumbnail_url: "/assets/projects/elite-x/docs/thumbnails/floor-plan-thumb.jpg",
          file_format: "PDF",
          verified_by: "RealtyPals Legal",
          is_quick_access: true,
          category: { category_description: "Unit layouts and dimension blueprints", category_icon_name: "floor_plan" }
        },
        {
          id: "doc-elite-x-price-list",
          description: "Official unit-by-unit cost breakdown, Preferential Location Charges (PLC), utility fees, and construction-linked payment milestones.",
          thumbnail_url: "/assets/projects/elite-x/docs/thumbnails/price-list-thumb.jpg",
          file_format: "PDF",
          verified_by: "RealtyPals Legal",
          is_quick_access: true,
          category: { category_description: "Pricing sheets and payment plans", category_icon_name: "price_list" }
        }
      ],
      transparency_checks: [
        { label: "RERA Approved & Active", ok: true, details: "Registered under UPRERAPRJ916631/02/2024 with complete developer escrow accounts verified." },
        { label: "Title Clear & Verified", ok: true, details: "Tata Capital legal advisors have audited and certified a clear, marketable, and unencumbered land title." },
        { label: "Pricing Documents Verified", ok: true, details: "Official base pricing schedules (₹1.84 Cr to ₹2.96 Cr+) are validated against builder directories." },
        { label: "Zero Authority Land Debt", ok: true, details: "The legal SPV (Golfgreen Mansions) holds an immaculate clearance registry with ₹0.00 outstanding dues." }
      ],
      detailedAnalysis: []
    }
  }

  let dp = await prisma.decisionProfile.findFirst({ where: { project_id: project.id } })
  if (dp) {
    await prisma.decisionProfile.update({
      where: { id: dp.id },
      data: decisionProfileData
    })
  } else {
    await prisma.decisionProfile.create({
      data: { project_id: project.id, ...decisionProfileData }
    })
  }

  let rec = await prisma.recommendationProfile.findFirst({ where: { project_id: project.id } })
  const recData = {
    status: "PUBLISHED" as any,
    tier: "STRONG_BUY" as any,
    primary_thesis: "Elite X represents an exceptional off-plan opportunity in Sector 10...",
  }
  if (rec) {
    await prisma.recommendationProfile.update({ where: { id: rec.id }, data: recData })
  } else {
    await prisma.recommendationProfile.create({ data: { project_id: project.id, ...recData } })
  }
  
  console.log('✅ Success: Elite X dynamic data seeded!')
}

seed().catch(console.error).finally(() => prisma.$disconnect())
