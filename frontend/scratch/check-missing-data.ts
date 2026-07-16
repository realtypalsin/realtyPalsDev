import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()

async function checkMissingData() {
  try {
    const targetSectors = [
      'Sector 75', 'Sector 76', 'Sector 77', 'Sector 78', 'Sector 79',
      'Sector 10', 'Sector 12'
    ]

    const projects = await prisma.project.findMany({
      where: {
        sector: {
          in: targetSectors
        }
      },
      include: {
        decision_profile: true,
      }
    })

    const fullySeededKeys = [
      'location_hero_image',
      'quick_commutes',
      'location_highlights',
      'nearby_essentials',
      'neighborhood_advantages',
      'topLevelMetrics',
      'dimensionScores',
      'keyTakeaway',
      'pricingIntelligence',
      'investmentSnapshot',
      'investmentReport'
    ]

    const missingDataReport = projects.map(p => {
      const intelData = (p.decision_profile?.intelligence_data as any) || {}
      
      const missingFields = fullySeededKeys.filter(key => {
        // If it doesn't exist, it's missing
        if (!(key in intelData)) return true
        
        // If it's an array and it's empty, it's missing
        if (Array.isArray(intelData[key]) && intelData[key].length === 0) return true
        
        // If it's an object and it has no keys, it's missing
        if (typeof intelData[key] === 'object' && intelData[key] !== null && !Array.isArray(intelData[key])) {
          if (Object.keys(intelData[key]).length === 0) return true
        }

        return false
      })

      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        sector: p.sector,
        missing_fields: missingFields,
        has_decision_profile: !!p.decision_profile
      }
    })

    fs.writeFileSync('missing-data-report.json', JSON.stringify(missingDataReport, null, 2))
    console.log(`Generated report for ${projects.length} projects.`)

  } catch (err) {
    console.error(err)
  } finally {
    await prisma.$disconnect()
  }
}

checkMissingData()
