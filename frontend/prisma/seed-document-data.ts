import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedDocumentData() {
  const slug = 'elite-x-sector-10-greater-noida-west'

  const inputData = {
    "project_id": "elite-x-sector-10-greater-noida-west",
    "project_name": "Elite X",
    "documents": [
      {
        "id": "doc-elite-x-brochure",
        "file_name": "elite-x-brochure.pdf",
        "file_format": "PDF",
        "is_quick_access": true,
        "verified_by": "Developer Official",
        "thumbnail_url": "/assets/projects/elite-x/docs/thumbnails/brochure-thumb.jpg",
        "description": "Official marketing brochure containing the architectural vision, lifestyle amenities, and biophilic landscaping master plan [1-3].",
        "category": {
          "id": "cat-brochure",
          "name": "Brochure",
          "category_icon_name": "brochure",
          "category_description": "Official marketing, brand overview, and vision portfolios for Elite X [1, 3]."
        }
      },
      {
        "id": "doc-elite-x-floor-plans",
        "file_name": "floor-plan.pdf",
        "file_format": "PDF",
        "is_quick_access": true,
        "verified_by": "RealtyPals Legal",
        "thumbnail_url": "/assets/projects/elite-x/docs/thumbnails/floor-plan-thumb.jpg",
        "description": "Intelligently drafted 3D layouts, carpet areas, and dimensional details for 3 BHK, 3.5 BHK, and 4 BHK units [2, 4, 5].",
        "category": {
          "id": "cat-floor-plan",
          "name": "Floor Plans",
          "category_icon_name": "floor_plan",
          "category_description": "Unit-level dimension maps, floor spacing schedules, and configuration structural diagrams [4, 5]."
        }
      },
      {
        "id": "doc-elite-x-price-list",
        "file_name": "price-list.pdf",
        "file_format": "PDF",
        "is_quick_access": true,
        "verified_by": "RealtyPals Legal",
        "thumbnail_url": "/assets/projects/elite-x/docs/thumbnails/price-list-thumb.jpg",
        "description": "Official 2026 pricing schedule detailing base rates, allied parking, club membership fees, and PLC schedules [4, 6, 7].",
        "category": {
          "id": "cat-price-list",
          "name": "Price List",
          "category_icon_name": "price_list",
          "category_description": "Unit-specific payment pricing sheets, utility costs, and statutory tax calculations [4, 6, 7]."
        }
      },
      {
        "id": "doc-elite-x-specifications",
        "file_name": "specs.pdf",
        "file_format": "PDF",
        "is_quick_access": false,
        "verified_by": "Developer Official",
        "thumbnail_url": "/assets/projects/elite-x/docs/thumbnails/specs-thumb.jpg",
        "description": "Full technical list of interior fittings, high-quality sanitary fixtures, wiring standards, and Mivan-shuttering wall parameters [8-10].",
        "category": {
          "id": "cat-specifications",
          "name": "Specifications",
          "category_icon_name": "legal",
          "category_description": "Detailed technical construction metrics, material standards, and structural guidelines [8-10]."
        }
      }
    ],
    "transparency_checks": [
      {
        "label": "RERA Approved & Active",
        "ok": true,
        "details": "Registered under UPRERAPRJ916631/02/2024 with complete developer escrow accounts verified [10, 11]."
      },
      {
        "label": "Title Clear & Verified",
        "ok": true,
        "details": "Tata Capital panel advocates have audited and certified a clear, marketable, and unencumbered land title [12, 13]."
      },
      {
        "label": "Pricing Documents Verified",
        "ok": true,
        "details": "Official base pricing schedules (₹1.84 Cr to ₹2.96 Cr+) are validated against builder directories [4]."
      },
      {
        "label": "Zero Authority Land Debt",
        "ok": true,
        "details": "The legal SPV (Golfgreen Mansions) holds an immaculate clearance registry with ₹0.00 outstanding dues [12]."
      }
    ]
  }

  try {
    const project = await prisma.project.findUnique({
      where: { slug }
    })

    if (!project) {
      console.error('Project not found!')
      return
    }

    const actualProjectId = project.id

    // 1. Clear existing ProjectDocuments for this project
    await prisma.projectDocument.deleteMany({
      where: { project_id: actualProjectId }
    })

    // 2. Insert new ProjectDocuments based on input JSON
    for (const doc of inputData.documents) {
      await prisma.projectDocument.create({
        data: {
          id: doc.id,
          project_id: actualProjectId,
          project_slug: slug,
          name: doc.category.name,
          doc_type: doc.category.category_icon_name,
          storage_url: `/documents/${doc.file_name}`,
          file_size_bytes: 2500000,
        }
      })
      console.log(`Added ProjectDocument database entry: ${doc.category.name}`)
    }

    // 3. Upsert DecisionProfile and save advanced intelligence metadata (documents + checks)
    const decisionProfile = await prisma.decisionProfile.findUnique({
      where: { project_id: actualProjectId }
    })

    if (!decisionProfile) {
      await prisma.decisionProfile.create({
        data: {
          project_id: actualProjectId,
          intelligence_data: {
            documents: inputData.documents,
            transparency_checks: inputData.transparency_checks
          },
          status: 'PUBLISHED'
        }
      })
      console.log('Created DecisionProfile and stored documents JSON metadata')
    } else {
      const existingData = (decisionProfile.intelligence_data as any) || {}
      const mergedData = {
        ...existingData,
        documents: inputData.documents,
        transparency_checks: inputData.transparency_checks
      }

      await prisma.decisionProfile.update({
        where: { project_id: actualProjectId },
        data: {
          intelligence_data: mergedData
        }
      })
      console.log('Updated DecisionProfile and merged documents JSON metadata')
    }

    console.log('✓ Seeding Completed successfully!')
  } catch (error) {
    console.error('Error during seeding:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedDocumentData()
