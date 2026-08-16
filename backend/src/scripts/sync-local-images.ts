import { PrismaClient, ImageType } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Path to properties image directory in frontend public
const IMAGES_DIR = path.resolve(__dirname, '../../../frontend/public/images/properties')

// Known folder -> slug overrides where slug formatting differs slightly
const FOLDER_TO_SLUG_OVERRIDES: Record<string, string> = {
  '3c-lotus-300-sector-107-noida': '3c-lotus-300-sector-107',
  'ace-hanei-sector-12-greater-noida-west': 'ace-hanei-sector-12-gn-west',
  'aims-golf-avenue-sector-75-noida': 'aims-golf-avenue-sector-75',
  'ajnara-the-belvedere-sector-79-noida': 'ajnara-the-belvedere-sector-79',
  'amrapali-crystal-homes-sector-76-noida': 'amrapali-crystal-homes-sector-76',
  'amrapali-heartbeat-city-sector-107-noida': 'amrapali-heartbeat-city-sector-107',
  'amrapali-princely-estate-sector-76-noida': 'amrapali-princely-estate-sector-76',
  'amrapali-silicon-city-sector-76-noida': 'amrapali-silicon-city-sector-76',
  'antriksh-forest-sector-77-noida': 'antriksh-forest-sector-77',
  'antriksh-golf-view-sector-78-noida': 'antriksh-golf-view-sector-78',
  'apex-athena-sector-75-noida': 'apex-athena-sector-75',
  'arihant-abode-sector-10-greater-noida-west': 'arihant-abode-sector-10-gn-west',
  'assotech-windsor-court': 'assotech-windsor-court-sector-78',
  'assotech-windsor-court-sector-78-noida': 'assotech-windsor-court-sector-78',
  'ats-homekraft-happy-trails-sector-10-greater-noida-west': 'ats-happy-trails-sector-10-gn-west',
  'ats-kingston-heath': 'ats-kingston-heath-sector-150',
  'ats-kingston-heath-sector-150-noida': 'ats-kingston-heath-sector-150',
  'ats-pious-hideaways': 'ats-pious-hideaways-sector-150',
  'ats-pious-hideaways-sector-150-noida': 'ats-pious-hideaways-sector-150',
  'ats-pristine': 'ats-pristine-sector-150',
  'ats-pristine-sector-150-noida': 'ats-pristine-sector-150',
  'avs-orchard-sector-77-noida': 'avs-orchard-sector-77',
  'civitech-stadia-sector-79-noida': 'civitech-stadia-sector-79',
  'civitech-strings-sector-12-greater-noida-west': 'civitech-strings-sector-12-gn-west',
  'county-107-sector-107-noida': 'county-107-sector-107',
  'crc-maesta-sector-1-greater-noida-west': 'crc-maesta-sector-1-gn-west',
  'dasnac-burj-noida-sector-75-noida': 'dasnac-the-burj-sector-75',
  'eldeco-ballads-of-bliss-sector-22d-yamuna-expressway': 'eldeco-ballads-of-bliss-sector-22d',
  'eldeco-la-vida-bella-sector-12-greater-noida-west': 'eldeco-la-vida-bella-sector-12-gn-west',
  'eldeco-live-by-the-greens': 'eldeco-live-by-the-greens-sector-150',
  'eldeco-live-by-the-greens-sector-150-noida': 'eldeco-live-by-the-greens-sector-150',
  'elite-golf-greens-sector-79-noida': 'elite-golf-greens-sector-79',
  'elite-x-sector-10-greater-noida-west': 'elite-x-sector-10-gn-west',
  'exotica-fresco': 'exotica-fresco-sector-137',
  'express-zenith-sector-77-noida': 'express-zenith-sector-77',
  'fusion-the-brook-sector-12-greater-noida-west': 'fusion-the-brook-sector-12-gn-west',
  'gardenia-gateway-sector-75-noida': 'gardenia-gateway-sector-75',
  'gardenia-golf-city-sector-75-noida': 'gardenia-golf-city-sector-75-noida',
  'gaur-sportswood-sector-79-noida': 'gaur-sportswood-sector-79',
  'godrej-majesty-sector-12-greater-noida-west': 'godrej-majesty-sector-12-gn-west',
  'godrej-palm-retreat': 'godrej-palm-retreat-sector-150',
  'gulshan-ikebana-sector-143-noida': 'gulshan-ikebana-sector-143',
  'iitl-nimbus-the-hyde-park-sector-78-noida': 'iitl-nimbus-the-hyde-park-sector-78',
  'the-hyde-park': 'iitl-nimbus-the-hyde-park-sector-78',
  'irish-platinum-sector-10-greater-noida-west': 'irish-platinum-sector-10-gn-west',
  'ivy-county-sector-75-noida': 'ivy-county-sector-75',
  'jm-aroma-sector-75-noida': 'jm-aroma-sector-75',
  'logix-blossom-county': 'logix-blossom-county-sector-137',
  'lotus-arena-sector-79-noida': 'lotus-arena-sector-79',
  'mahagun-mezzaria': 'mahagun-mezzaria-sector-78',
  'mahagun-mirabella-sector-79-noida': 'mahagun-mirabella-sector-79',
  'mahagun-moderne': 'mahagun-moderne-sector-78',
  'mahagun-moderne-sector-78-noida': 'mahagun-moderne-sector-78',
  'max-estate-128-sector-128-noida': 'max-estates-128-sector-128',
  'maxblis-white-house-sector-75-noida': 'maxblis-white-house-sector-75',
  'nbcc-aspire-silicon-city-sector-76-noida': 'amrapali-silicon-city-sector-76',
  'panchsheel-pratishtha-sector-75-noida': 'panchsheel-pratishtha-sector-75',
  'paramount-floraville': 'paramount-floraville-sector-137',
  'paras-tierea': 'paras-tierea-sector-137',
  'prateek-canary': 'prateek-canary-sector-150',
  'prateek-wisteria-sector-77-noida': 'prateek-wisteria-sector-77',
  'sethi-max-royal-sector-76-noida': 'sethi-max-royal-sector-76',
  'sikka-karmic-greens': 'sikka-karmic-greens-sector-78',
  'sikka-karmic-greens-sector-78-noida': 'sikka-karmic-greens-sector-78',
  'sikka-kimaantra-greens-sector-79-noida': 'sikka-kimaantra-greens-sector-79',
  'supertech-ecociti': 'supertech-ecociti-sector-137',
  'urbtech-hilston-sector-79-noida': 'urbtech-hilston-sector-79-noida',
  'vvip-addresses-sector-12-greater-noida-west': 'vvip-addresses-sector-12-gn-west'
}

function classifyImageType(filename: string): ImageType {
  const lower = filename.toLowerCase()
  if (lower.includes('hero') || lower.includes('elevation') || lower.includes('main')) return ImageType.hero
  if (lower.includes('floor') || lower.includes('plan')) return ImageType.floor_plan
  if (lower.includes('amenity') || lower.includes('gym')) return ImageType.amenity
  if (lower.includes('pool')) return ImageType.pool
  if (lower.includes('club')) return ImageType.clubhouse
  if (lower.includes('interior') || lower.includes('living') || lower.includes('bedroom')) return ImageType.interior
  return ImageType.exterior
}


function generateCaption(filename: string, projectName: string): string {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')
  // Humanize camelCase or kebab-case
  const humanized = nameWithoutExt
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .trim()
  
  if (humanized.toLowerCase() === 'hero') {
    return `${projectName} - Architectural Elevation`
  }
  return `${projectName} - ${humanized.charAt(0).toUpperCase() + humanized.slice(1)}`
}

async function syncLocalImages(isDryRun = false) {
  console.log(`\n======================================================`)
  console.log(`  PROPERTY MEDIA SYNCHRONIZER (${isDryRun ? 'DRY RUN' : 'APPLY MODE'})`)
  console.log(`======================================================\n`)

  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`Images directory does not exist: ${IMAGES_DIR}`)
    process.exit(1)
  }

  const localFolderNames = fs.readdirSync(IMAGES_DIR).filter(f => {
    const fullPath = path.join(IMAGES_DIR, f)
    return fs.statSync(fullPath).isDirectory()
  })

  console.log(`Found ${localFolderNames.length} local image folders in public/images/properties\n`)

  const allProjects = await prisma.project.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      sector: true,
      city: true,
      hero_image_url: true,
      builder: { select: { name: true } }
    },
    orderBy: [{ city: 'asc' }, { sector: 'asc' }, { name: 'asc' }]
  })

  console.log(`Total projects in database: ${allProjects.length}\n`)

  const matchedProjects: Array<{
    project: typeof allProjects[0]
    folders: string[]
    files: Array<{ folder: string; file: string }>
  }> = []

  const missingImageProjects: Array<typeof allProjects[0]> = []
  const usedFolders = new Set<string>()

  for (const project of allProjects) {
    const matchedFolders: string[] = []

    // 1. Check explicit override
    for (const [folder, overrideSlug] of Object.entries(FOLDER_TO_SLUG_OVERRIDES)) {
      if (overrideSlug.toLowerCase() === project.slug.toLowerCase() && localFolderNames.includes(folder)) {
        if (!matchedFolders.includes(folder)) matchedFolders.push(folder)
      }
    }

    // 2. Check exact slug match
    for (const folder of localFolderNames) {
      if (folder.toLowerCase() === project.slug.toLowerCase() && !matchedFolders.includes(folder)) {
        matchedFolders.push(folder)
      }
    }

    // 3. Normalized match
    const normSlug = project.slug.toLowerCase().replace(/[^a-z0-9]/g, '')
    for (const folder of localFolderNames) {
      const normF = folder.toLowerCase().replace(/[^a-z0-9]/g, '')
      if ((normF === normSlug || (normSlug.length > 8 && normF.includes(normSlug)) || (normF.length > 8 && normSlug.includes(normF))) && !matchedFolders.includes(folder)) {
        matchedFolders.push(folder)
      }
    }

    if (matchedFolders.length > 0) {
      const projectFiles: Array<{ folder: string; file: string }> = []
      for (const folder of matchedFolders) {
        usedFolders.add(folder)
        const folderPath = path.join(IMAGES_DIR, folder)
        const files = fs.readdirSync(folderPath).filter(f => !f.startsWith('.') && /\.(jpg|jpeg|png|webp|avif)$/i.test(f))
        for (const file of files) {
          projectFiles.push({ folder, file })
        }
      }
      matchedProjects.push({ project, folders: matchedFolders, files: projectFiles })
    } else {
      missingImageProjects.push(project)
    }
  }

  const unusedFolders = localFolderNames.filter(f => !usedFolders.has(f))

  console.log(`✓ Matched projects with authentic local images: ${matchedProjects.length}`)
  console.log(`! Projects requiring authentic images: ${missingImageProjects.length}`)
  console.log(`! Local folders not mapped to any project: ${unusedFolders.length} (${unusedFolders.join(', ') || 'None'})\n`)

  if (!isDryRun) {
    console.log(`Applying updates to database...`)

    let linkedCount = 0
    let clearedCount = 0

    // 1. Process matched projects
    for (const { project, files } of matchedProjects) {
      if (files.length === 0) continue

      // Find hero image
      const heroItem = files.find(f => f.file.toLowerCase().startsWith('hero')) || files[0]
      const heroUrl = `/images/properties/${heroItem.folder}/${heroItem.file}`

      // Delete old placeholder images
      await prisma.projectImage.deleteMany({
        where: { project_id: project.id }
      })

      // Insert fresh local image records
      let sortOrder = 1
      for (const { folder, file } of files) {
        const imgUrl = `/images/properties/${folder}/${file}`
        const imgType = classifyImageType(file)
        const caption = generateCaption(file, project.name)

        await prisma.projectImage.create({
          data: {
            project_id: project.id,
            url: imgUrl,
            type: imgType,
            caption: caption,
            source: 'verified_builder',
            sort_order: sortOrder++
          }
        })
      }

      // Update project hero_image_url
      await prisma.project.update({
        where: { id: project.id },
        data: { hero_image_url: heroUrl }
      })

      linkedCount++
    }

    // 2. Process unmatched projects (clean external Unsplash placeholders)
    for (const project of missingImageProjects) {
      await prisma.projectImage.deleteMany({
        where: {
          project_id: project.id,
          url: { startsWith: 'https://images.unsplash.com' }
        }
      })

      if (project.hero_image_url?.startsWith('https://images.unsplash.com')) {
        await prisma.project.update({
          where: { id: project.id },
          data: { hero_image_url: null }
        })
      }

      clearedCount++
    }

    console.log(`✓ Successfully linked local media for ${linkedCount} projects.`)
    console.log(`✓ Cleaned placeholder media for ${clearedCount} projects.\n`)
  }


  // 3. Generate missing_images_properties.md
  console.log(`Generating missing_images_properties.md checklist...`)

  let mdContent = `# Missing Property Images Checklist

> Total Projects: **${allProjects.length}**  
> Projects with Verified Local Images: **${matchedProjects.length}**  
> Projects Requiring Local Images: **${missingImageProjects.length}**  
> Target Folder: \`frontend/public/images/properties/<folder-slug>/\`

---

## Instructions for Adding Images

1. Create a folder inside \`frontend/public/images/properties/\` named with the suggested folder slug below.
2. Place authentic project photos in the folder (format: \`.jpg\`, \`.jpeg\`, \`.png\`, \`.webp\`, or \`.avif\`).
3. Name the main cover photo \`hero.jpg\` (or \`hero.webp\`).
4. Other photos can be named \`exterior.jpg\`, \`interior.jpg\`, \`clubhouse.jpg\`, \`floor-plan.jpg\`, etc.
5. Re-run the image synchronizer script (\`npx ts-node backend/src/scripts/sync-local-images.ts\`) or add via the Admin Media tab.

---

## Properties Awaiting Real Images (${missingImageProjects.length} Total)

| # | Project Name | Builder | Sector | City | Expected Image Folder Slug |
|---|--------------|---------|--------|------|-----------------------------|
`

  missingImageProjects.forEach((p, idx) => {
    const builderName = p.builder?.name || 'Unknown Builder'
    mdContent += `| ${idx + 1} | **${p.name}** | ${builderName} | ${p.sector} | ${p.city} | \`${p.slug}\` |\n`
  })

  mdContent += `\n---\n\n## Verified Active Properties (${matchedProjects.length} with images linked)\n\n`
  mdContent += `| # | Project Name | Folder Name | Images Linked | Hero Photo |\n`
  mdContent += `|---|--------------|-------------|---------------|------------|\n`

  matchedProjects.forEach((m, idx) => {
    const hero = m.files.find(f => f.file.toLowerCase().startsWith('hero')) || m.files[0]
    mdContent += `| ${idx + 1} | **${m.project.name}** | \`${m.folders.join(', ')}\` | ${m.files.length} images | \`${hero.folder}/${hero.file}\` |\n`
  })

  const outputPath = path.resolve(__dirname, '../../../missing_images_properties.md')
  fs.writeFileSync(outputPath, mdContent, 'utf-8')
  console.log(`✓ Checklist saved to ${outputPath}\n`)
}

const isDryRun = process.argv.includes('--dry-run')
syncLocalImages(isDryRun)
  .catch(err => {
    console.error('Error running sync-local-images:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
