import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedLocationData() {
  const projectId = 'elite-x-sector-10-greater-noida-west'
  
  const locationData = {
    location_hero_image: "/assets/projects/elite-x/location-hero-banner.jpg",
    quick_commutes: [
      { icon: "car", time: "15 mins", destination: "Noida Sector 62/63 IT Hub" },
      { icon: "car", time: "8 mins", destination: "Gaur Chowk (Noida Entry Point)" },
      { icon: "car", time: "15 mins", destination: "National Highway 24 (NH-24)" },
      { icon: "car", time: "10 mins", destination: "Noida-Greater Noida Expressway Link" }
    ],
    location_highlights: [
      { title: "Proposed Metro Station", time: "5 mins", description: "Just 3 km away from the upcoming Knowledge Park V Aqua Line extension station", icon: "train" },
      { title: "Super Speciality Healthcare", time: "8 mins", description: "Located 4 km away from Yatharth Super Speciality Hospital for instant clinical access", icon: "heartpulse" },
      { title: "Premium Retail Shopping", time: "8 mins", description: "Positioned 3.5 km away from Gaur City Mall and local commercial high streets", icon: "shopping" },
      { title: "Primary Education Hub", time: "6 mins", description: "DPS Noida Extension and Sarvottam International are within a 5-km radius", icon: "school" }
    ],
    nearby_essentials: {
      "Education": {
        image: "/assets/projects/elite-x/essentials/education.jpg",
        places: [
          { name: "DPS Noida Extension", distance: "3.5 km" },
          { name: "Ryan International School", distance: "4.5 km" },
          { name: "Pacific World School", distance: "5.5 km" },
          { name: "Sarvottam International School", distance: "6.5 km" }
        ],
        total_count: 8
      },
      "Hospitals": {
        image: "/assets/projects/elite-x/essentials/hospitals.jpg",
        places: [
          { name: "Yatharth Super Speciality Hospital", distance: "4.2 km" },
          { name: "Fortis Hospital Noida", distance: "16.0 km" },
          { name: "Max Hospital Vaishali", distance: "19.0 km" }
        ],
        total_count: 5
      },
      "Shopping & Entertainment": {
        image: "/assets/projects/elite-x/essentials/shopping.jpg",
        places: [
          { name: "Gaur City Mall", distance: "3.5 km" },
          { name: "Galaxy Blue Sapphire Plaza", distance: "3.8 km" },
          { name: "Logix City Center Mall", distance: "13.0 km" },
          { name: "DLF Mall of India", distance: "19.0 km" }
        ],
        total_count: 4
      },
      "IT Parks & Commercial Hubs": {
        image: "/assets/projects/elite-x/essentials/it-parks.jpg",
        places: [
          { name: "Knowledge Park V Office Corridor", distance: "0.1 km (Directly Opposite)" },
          { name: "Noida Sector 62/63 IT Sector", distance: "13.5 km" },
          { name: "Ecotech III Industrial Sector", distance: "16.5 km" },
          { name: "Noida Sector 132/135 Tech Corridor", distance: "22.5 km" }
        ],
        total_count: 10
      }
    },
    neighborhood_advantages: [
      { title: "Platinum Wing Corridor", description: "Sector 10 is designed with wider, congestion-free roads and structured, low-density layout compared to older, crowded sectors.", icon: "trending-up" },
      { title: "Direct Knowledge Park V Interface", description: "The project is positioned directly opposite Knowledge Park V, offering seamless walking access to massive commercial, IT, and institutional hubs.", icon: "briefcase" },
      { title: "Aqua Line Transit Catalyst", description: "The upcoming extension of the Aqua Line metro with a proposed station just 3 km away will act as a major capital appreciation driver.", icon: "map-pin" },
      { title: "Jewar International Airport Corridor", description: "Direct, unobstructed accessibility link to the upcoming Noida International Airport at Jewar is set to drive the regional growth cycle.", icon: "plane" }
    ]
  }

  try {
    // Find project by slug
    const project = await prisma.project.findUnique({
      where: { slug: projectId }
    })
    
    if (!project) {
      console.error('Project not found!')
      return
    }

    const actualProjectId = project.id;

    // Check if decision profile exists
    let decisionProfile = await (prisma as any).decisionProfile.findUnique({
      where: { project_id: actualProjectId }
    })

    if (!decisionProfile) {
      decisionProfile = await (prisma as any).decisionProfile.create({
        data: {
          project_id: actualProjectId,
          intelligence_data: locationData,
          status: 'PUBLISHED'
        }
      })
      console.log('Created decision profile with location data')
    } else {
      // Merge with existing intelligence_data
      const existingData = (decisionProfile.intelligence_data as any) || {}
      decisionProfile = await (prisma as any).decisionProfile.update({
        where: { project_id: actualProjectId },
        data: {
          intelligence_data: {
            ...existingData,
            ...locationData
          }
        }
      })
      console.log('Updated existing decision profile with location data')
    }
  } catch (error) {
    console.error('Error seeding location data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedLocationData()
