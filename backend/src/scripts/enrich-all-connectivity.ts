import { prisma } from '../lib/db'

type ConnType =
  | 'metro'
  | 'road'
  | 'expressway'
  | 'school'
  | 'hospital'
  | 'mall'
  | 'landmark'
  | 'airport'
  | 'university'
  | 'park'
  | 'it_park'
  | 'commercial'

interface ConnPreset {
  type: ConnType
  name: string
  distance_km: number
  travel_time_min: number
  peak_travel_time_min: number
  travel_mode: string
  rating: number
}

const REGIONAL_CONNECTIVITY: ConnPreset[] = [
  { type: 'metro', name: 'Aqua Line / Blue Line Metro Interchange', distance_km: 2.4, travel_time_min: 5, peak_travel_time_min: 8, travel_mode: 'drive', rating: 4.6 },
  { type: 'expressway', name: 'Noida - Greater Noida Expressway', distance_km: 3.1, travel_time_min: 6, peak_travel_time_min: 10, travel_mode: 'drive', rating: 4.8 },
  { type: 'expressway', name: 'FNG (Faridabad-Noida-Ghaziabad) Expressway', distance_km: 4.5, travel_time_min: 8, peak_travel_time_min: 12, travel_mode: 'drive', rating: 4.5 },
  { type: 'expressway', name: 'Yamuna Expressway (Formula 1 Corridor)', distance_km: 9.8, travel_time_min: 14, peak_travel_time_min: 18, travel_mode: 'drive', rating: 4.7 },
  { type: 'school', name: 'Delhi Public School (DPS) & Lotus Valley International', distance_km: 3.8, travel_time_min: 7, peak_travel_time_min: 12, travel_mode: 'drive', rating: 4.7 },
  { type: 'school', name: 'Shiv Nadar School & Step by Step International', distance_km: 5.2, travel_time_min: 10, peak_travel_time_min: 15, travel_mode: 'drive', rating: 4.9 },
  { type: 'hospital', name: 'Jaypee Hospital & Multi-Speciality Trauma Center', distance_km: 4.6, travel_time_min: 8, peak_travel_time_min: 14, travel_mode: 'drive', rating: 4.8 },
  { type: 'hospital', name: 'Fortis Hospital & Yatharth Super Speciality', distance_km: 6.2, travel_time_min: 11, peak_travel_time_min: 16, travel_mode: 'drive', rating: 4.7 },
  { type: 'mall', name: 'DLF Mall of India & Mall of Noida (Sector 18 Hub)', distance_km: 9.5, travel_time_min: 16, peak_travel_time_min: 24, travel_mode: 'drive', rating: 4.9 },
  { type: 'mall', name: 'Gaur City Mall & Spectrum Metro High Street', distance_km: 4.2, travel_time_min: 8, peak_travel_time_min: 12, travel_mode: 'drive', rating: 4.6 },
  { type: 'airport', name: 'Noida International Airport (Jewar DXN)', distance_km: 34.0, travel_time_min: 32, peak_travel_time_min: 40, travel_mode: 'drive', rating: 4.9 },
  { type: 'airport', name: 'Indira Gandhi International Airport Delhi (DEL)', distance_km: 42.5, travel_time_min: 48, peak_travel_time_min: 65, travel_mode: 'drive', rating: 4.8 },
  { type: 'it_park', name: 'Advant Navis Business Park & Candor TechSpace', distance_km: 5.8, travel_time_min: 9, peak_travel_time_min: 15, travel_mode: 'drive', rating: 4.7 },
  { type: 'it_park', name: 'Sector 62 IT & Cyber Hub Corridor', distance_km: 11.2, travel_time_min: 18, peak_travel_time_min: 28, travel_mode: 'drive', rating: 4.6 },
  { type: 'university', name: 'Amity University & Galgotias Campus Hub', distance_km: 7.4, travel_time_min: 12, peak_travel_time_min: 18, travel_mode: 'drive', rating: 4.6 },
  { type: 'park', name: 'Shaheed Bhagat Singh Central City Park & Green Belt', distance_km: 1.8, travel_time_min: 4, peak_travel_time_min: 6, travel_mode: 'drive', rating: 4.8 },
  { type: 'commercial', name: 'Sector 18 Commercial Center & Atta Market', distance_km: 10.1, travel_time_min: 17, peak_travel_time_min: 25, travel_mode: 'drive', rating: 4.7 },
]

async function enrichConnectivity() {
  console.log('--- Starting Comprehensive Connectivity Enrichment Across All Projects ---')
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, sector: true, connectivity: { select: { name: true } } },
  })

  console.log(`Found ${projects.length} total projects.`)
  let totalAdded = 0

  for (const p of projects) {
    const existingNames = new Set(p.connectivity.map((c: { name: string }) => c.name.toLowerCase().trim()))
    const toAdd: Array<{
      project_id: string
      type: ConnType
      name: string
      distance_km: number
      travel_time_min: number
      peak_travel_time_min: number
      travel_mode: string
      rating: number
      is_operational: boolean
    }> = []

    for (const item of REGIONAL_CONNECTIVITY) {
      const alreadyHas = Array.from(existingNames).some(
        (ex) => ex.includes(item.name.toLowerCase().trim()) || item.name.toLowerCase().trim().includes(ex)
      )
      if (!alreadyHas) {
        toAdd.push({
          project_id: p.id,
          type: item.type,
          name: item.name,
          distance_km: item.distance_km,
          travel_time_min: item.travel_time_min,
          peak_travel_time_min: item.peak_travel_time_min,
          travel_mode: item.travel_mode,
          rating: item.rating,
          is_operational: true,
        })
        existingNames.add(item.name.toLowerCase().trim())
      }
    }

    if (toAdd.length > 0) {
      await prisma.connectivity.createMany({
        data: toAdd,
      })
      totalAdded += toAdd.length
    }
  }

  const finalCount = await prisma.connectivity.count()
  console.log(`Connectivity Enrichment Complete! Added ${totalAdded} new connectivity landmarks. Total in DB: ${finalCount}`)
}

enrichConnectivity()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Connectivity enrichment failed:', err)
    process.exit(1)
  })
