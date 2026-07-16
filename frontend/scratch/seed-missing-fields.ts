import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function seedMissingFields() {
  try {
    const patchPath = path.resolve('C:/Users/Furqan/Desktop/UiRealtyPals/realtypals-missing-fields-patch.json')
    if (!fs.existsSync(patchPath)) {
      console.error(`Patch file not found at: ${patchPath}`)
      return
    }

    const rawData = fs.readFileSync(patchPath, 'utf8')
    const patchData = JSON.parse(rawData)

    console.log(`Starting to seed ${Object.keys(patchData).length} projects...`)

    for (const [slug, data] of Object.entries(patchData)) {
      const projectData = data as any
      // Find the project ID first
      const project = await prisma.project.findFirst({
        where: {
          OR: [
            { slug: slug },
            { id: projectData.id }
          ]
        }
      })

      if (!project) {
        console.warn(`Project not found for slug: ${slug} / ID: ${projectData.id}`)
        continue
      }

      // Check if decision profile exists
      let decisionProfile = await (prisma as any).decisionProfile.findUnique({
        where: { project_id: project.id }
      })

      // We want to store everything except metadata fields (like id, slug, name, sector) directly in intelligence_data
      const { id, slug: tempSlug, name, sector, ...intelligenceFields } = projectData

      if (!decisionProfile) {
        decisionProfile = await (prisma as any).decisionProfile.create({
          data: {
            project_id: project.id,
            intelligence_data: intelligenceFields,
            status: 'PUBLISHED'
          }
        })
        console.log(`[CREATED] Decision profile for ${project.name}`)
      } else {
        const existingData = (decisionProfile.intelligence_data as any) || {}
        await (prisma as any).decisionProfile.update({
          where: { project_id: project.id },
          data: {
            intelligence_data: {
              ...existingData,
              ...intelligenceFields
            }
          }
        })
        console.log(`[UPDATED] Decision profile for ${project.name}`)
      }
    }

    console.log('Seeding completed successfully!')

  } catch (error) {
    console.error('Error during seeding:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedMissingFields()
