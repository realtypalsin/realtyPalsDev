import { prisma } from '../lib/db'

interface DefaultSpec {
  category: string
  label: string
  value: string
  brand: string
  tier: 'standard' | 'premium' | 'luxury'
  is_highlight: boolean
}

const COMPREHENSIVE_SPECS: DefaultSpec[] = [
  // 1. Structure & Safety
  { category: 'structure', label: 'Frame & Seismic Standard', value: 'Earthquake Resistant RCC Framed Structure / Mivan Aluminium Formwork compliant with IS 1893 (Zone IV)', brand: 'Mivan Tech / Tata Steel', tier: 'premium', is_highlight: true },
  
  // 2. Flooring & Finishes
  { category: 'flooring', label: 'Living, Dining & Foyer', value: 'Large Format 800x1600mm Glazed Vitrified Tiles / Italian Marble Finish', brand: 'Kajaria / Somany', tier: 'premium', is_highlight: true },
  { category: 'flooring', label: 'Master Bedroom', value: 'Laminated AC4 Grade Wooden Flooring with Anti-Termite Treatment', brand: 'Pergo / QuickStep', tier: 'premium', is_highlight: false },
  
  // 3. Kitchen & Countertops
  { category: 'kitchen', label: 'Countertop & Utility Sink', value: 'Polished Quartz / Premium Granite Counter with Stainless Steel Sink & Dedicated RO Provision', brand: 'Franke / Carysil', tier: 'premium', is_highlight: false },

  // 4. Sanitary & CP Fittings
  { category: 'bathrooms', label: 'CP & Sanitary Fixtures', value: 'Wall-Hung EWCs with Concealed Dual-Flush Water-Saving Cisterns and Single-Lever Diverters', brand: 'Kohler / Grohe / Jaquar', tier: 'luxury', is_highlight: true },

  // 5. Doors & Windows
  { category: 'doors_windows', label: 'Main Entrance & Balcony Openings', value: '8ft High Engineered Hardwood Main Door with Digital Smart Lock + High-Grade UPVC Sound-Insulated Balcony Glazing', brand: 'Yale / Fenesta', tier: 'luxury', is_highlight: true },

  // 6. Electrical & Switches
  { category: 'electrical', label: 'Wiring & Modular Switchgear', value: 'Concealed FRLS Copper Wiring with Flame-Retardant Modular Touch Switches and 100% DG Auto-Backup', brand: 'Schneider / Legrand / Havells', tier: 'premium', is_highlight: false },

  // 7. Plumbing & Water Supply
  { category: 'plumbing', label: 'Piping & Water Treatment', value: 'Multi-layer CPVC / UPVC Internal Plumbing with Centralized Water Softening Plant and Ganga Jal Line Access', brand: 'Astral / Supreme', tier: 'premium', is_highlight: false },

  // 8. Elevators & Lifts
  { category: 'lifts', label: 'Passenger & Stretcher Lifts', value: 'High-Speed 2.5 m/s Automatic Elevators with Automatic Rescue Device (ARD) & Dedicated Service Stretcher Lift', brand: 'Schindler / Otis / Kone', tier: 'premium', is_highlight: false },

  // 9. Security & Automation
  { category: 'security', label: 'Smart Home & Perimeter Security', value: '3-Tier Integrated Security: 24x7 HD CCTV Surveillance, RFID Boom Barrier, and Smart Video Door Phone Connected to Guardhouse', brand: 'Hikvision / Honeywell', tier: 'premium', is_highlight: true },

  // 10. Green & Sustainability
  { category: 'sustainability', label: 'Eco-Certifications & Energy Efficiency', value: 'IGBC Green Certified Building, Solar Powered Common Area Lighting, Rainwater Harvesting, and Zero-Discharge STP', brand: 'IGBC / Bureau of Energy Efficiency', tier: 'premium', is_highlight: false },

  // 11. Parking & EV Infrastructure
  { category: 'parking', label: 'Basement & Electric Vehicle Charging', value: 'Multi-Level Reserved Covered Basement Parking with Fast EV Charging Stations and Dedicated Car Wash Bays', brand: 'ABB / Tata Power EV', tier: 'premium', is_highlight: false },
]

async function enrichAllSpecs() {
  console.log('--- Starting Comprehensive Specs Enrichment Across All Projects ---')
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, spec_items: { select: { category: true } } },
  })

  console.log(`Found ${projects.length} total projects.`)
  let totalAdded = 0

  for (const p of projects) {
    const existingCats = new Set(p.spec_items.map((s: { category: string }) => s.category))
    const toAdd: Array<{
      project_id: string
      category: string
      label: string
      value: string
      brand: string
      tier: string
      is_highlight: boolean
      sort_order: number
    }> = []

    let sort = p.spec_items.length

    for (const spec of COMPREHENSIVE_SPECS) {
      if (!existingCats.has(spec.category)) {
        sort++
        toAdd.push({
          project_id: p.id,
          category: spec.category,
          label: spec.label,
          value: spec.value,
          brand: spec.brand,
          tier: spec.tier,
          is_highlight: spec.is_highlight,
          sort_order: sort,
        })
        existingCats.add(spec.category)
      }
    }

    if (toAdd.length > 0) {
      await prisma.projectSpecItem.createMany({
        data: toAdd,
      })
      totalAdded += toAdd.length
    }
  }

  const finalCount = await prisma.projectSpecItem.count()
  console.log(`Specs Enrichment Complete! Added ${totalAdded} new specification items. Total in DB: ${finalCount}`)
}

enrichAllSpecs()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Specs enrichment failed:', err)
    process.exit(1)
  })
