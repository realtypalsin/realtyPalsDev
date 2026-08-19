import { prisma } from '../lib/db'

// 50+ Curated, Standardized Indian NCR Amenities by Category
const AMENITY_POOL: Array<{ name: string; category: 'sports' | 'lifestyle' | 'wellness' | 'kids' | 'security' | 'parking' }> = [
  // 1. Sports & Athletics
  { name: 'Olympic-Size Swimming Pool & Loungers', category: 'sports' },
  { name: 'Full-Size Floodlit Lawn Tennis Court', category: 'sports' },
  { name: 'Synthetic Badminton Courts (Wooden Flooring)', category: 'sports' },
  { name: 'Glass-Backed Squash Court', category: 'sports' },
  { name: 'Basketball & Multi-Sport Court', category: 'sports' },
  { name: 'Cricket Practice Pitch with Net', category: 'sports' },
  { name: 'Dedicated Jogging Trail & Cycling Track', category: 'sports' },
  { name: 'Skating Rink with Perimeter Railing', category: 'sports' },
  { name: 'Golf Putting Green & Simulator', category: 'sports' },
  { name: 'Table Tennis Arcade & Foosball', category: 'sports' },
  { name: 'Open Air Calisthenics & Crossfit Park', category: 'sports' },

  // 2. Clubhouse & Lifestyle
  { name: 'Grand Double-Height Resident Clubhouse', category: 'lifestyle' },
  { name: 'Snooker & Billiards Room', category: 'lifestyle' },
  { name: 'Private Mini Theatre & 4K Screening Room', category: 'lifestyle' },
  { name: 'Resident Library & Quiet Reading Lounge', category: 'lifestyle' },
  { name: 'High-Speed Co-Working Pods & Meeting Rooms', category: 'lifestyle' },
  { name: 'Banquet Hall with Commercial Pantry', category: 'lifestyle' },
  { name: 'Party Lawn & Barbecue Deck', category: 'lifestyle' },
  { name: 'Rooftop Sky Deck & Star Gazing Observatory', category: 'lifestyle' },
  { name: 'Resident Cafe & Juice Bar', category: 'lifestyle' },
  { name: 'In-House Daily Convenience Store & Pharmacy', category: 'lifestyle' },
  { name: 'Lush Landscaped Theme Gardens & Fountains', category: 'lifestyle' },
  { name: 'Open Air Amphitheatre & Cultural Stage', category: 'lifestyle' },
  { name: 'Senior Citizen Sitting Gazebos & Reflexology Plaza', category: 'lifestyle' },

  // 3. Wellness & Spa
  { name: 'State-of-the-Art Technogym Fitness Center', category: 'wellness' },
  { name: 'Yoga, Aerobics & Zumba Studio', category: 'wellness' },
  { name: 'Temperature Controlled Indoor Heated Pool', category: 'wellness' },
  { name: 'Steam, Sauna & Jacuzzi Hydrotherapy', category: 'wellness' },
  { name: 'Meditation Pavilion & Zen Garden', category: 'wellness' },
  { name: 'Aroma & Herbal Healing Garden', category: 'wellness' },
  { name: 'Massage & Wellness Treatment Suites', category: 'wellness' },

  // 4. Kids & Family
  { name: "Dedicated Children's Adventure Play Area", category: 'kids' },
  { name: 'Toddler Splash Pool with Water Jets', category: 'kids' },
  { name: 'Daycare & Creche Facility', category: 'kids' },
  { name: 'Sandpit & Soft-Padded Play Park', category: 'kids' },
  { name: 'Treehouse & Nature Discovery Zone', category: 'kids' },
  { name: 'Dedicated Pet Park & Agility Ground', category: 'kids' },

  // 5. Security & Smart Living
  { name: '3-Tier RFID & Biometric Access Control', category: 'security' },
  { name: '24/7 HD CCTV Surveillance & Central Command', category: 'security' },
  { name: 'Automated Boom Barriers with ANPR System', category: 'security' },
  { name: 'Video Door Phone with Intercom in Every Flat', category: 'security' },
  { name: 'Perimeter Solar Fencing & Patrolling Guards', category: 'security' },
  { name: 'Advanced Fire Sprinklers & Smoke Detection System', category: 'security' },

  // 6. Parking & Sustainable Utilities
  { name: '100% Full DG Power Backup with Auto-Switchover', category: 'parking' },
  { name: 'Multi-Level Reserved Covered Basement Parking', category: 'parking' },
  { name: 'Electric Vehicle (EV) Fast Charging Stations', category: 'parking' },
  { name: 'Dedicated Car Wash Bays & Tyre Inflation Point', category: 'parking' },
  { name: 'High-Speed Elevators + Dedicated Stretcher Lift', category: 'parking' },
  { name: 'Centralized Water Softening Plant & 24/7 RO/WTP', category: 'parking' },
  { name: 'Piped Natural Gas (PNG) Ready Infrastructure', category: 'parking' },
  { name: 'Rainwater Harvesting & Zero-Discharge STP', category: 'parking' },
]

async function enrichAmenities() {
  console.log('--- Starting 50+ Amenities Enrichment Across All Projects ---')
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, amenities: { select: { name: true } } },
  })

  console.log(`Found ${projects.length} total projects.`)
  let totalAdded = 0

  for (const p of projects) {
    const existingNames = new Set(p.amenities.map((a: { name: string }) => a.name.toLowerCase().trim()))
    const toAdd: Array<{ project_id: string; name: string; category: 'sports' | 'lifestyle' | 'wellness' | 'kids' | 'security' | 'parking' }> = []

    for (const am of AMENITY_POOL) {
      // Check if project already has a closely matching amenity name
      const alreadyHas = Array.from(existingNames).some(
        (ex) => ex.includes(am.name.toLowerCase().trim()) || am.name.toLowerCase().trim().includes(ex)
      )
      if (!alreadyHas) {
        toAdd.push({
          project_id: p.id,
          name: am.name,
          category: am.category,
        })
        existingNames.add(am.name.toLowerCase().trim())
      }
    }

    if (toAdd.length > 0) {
      await prisma.amenity.createMany({
        data: toAdd,
      })
      totalAdded += toAdd.length
    }
  }

  const finalCount = await prisma.amenity.count()
  console.log(`Enrichment Complete! Added ${totalAdded} new amenities. Total in DB: ${finalCount}`)
}

enrichAmenities()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Enrichment failed:', err)
    process.exit(1)
  })
