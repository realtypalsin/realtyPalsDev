import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedTestSpecs() {
  console.log('🔧 Seeding test specifications...')

  // Find a project to seed specs for
  const project = await prisma.project.findFirst({
    orderBy: { created_at: 'desc' },
  })

  if (!project) {
    console.log('❌ No projects found in database')
    return
  }

  console.log(`✓ Found project: ${project.name}`)

  // Sample specs across categories
  const specs = [
    {
      category: 'structure',
      label: 'Structure Type',
      value: 'Mivan RCC Shuttering, Seismic Zone 4',
      brand: null,
      tier: 'premium',
      is_highlight: true,
    },
    {
      category: 'flooring',
      label: 'Living Room Flooring',
      value: 'Imported Italian Marble',
      brand: null,
      tier: 'luxury',
      is_highlight: true,
    },
    {
      category: 'kitchen',
      label: 'Modular Kitchen',
      value: 'Modular Kitchen with Granite Countertop',
      brand: 'Polaris / Sleek',
      tier: 'premium',
      is_highlight: true,
    },
    {
      category: 'bathrooms',
      label: 'Sanitaryware Brand',
      value: 'Wall-Hung EWC with Soft-Close Seat',
      brand: 'Kohler',
      tier: 'luxury',
      is_highlight: true,
    },
    {
      category: 'doors_windows',
      label: 'Window Glazing',
      value: 'Double-Glazed Noise-Insulated UPVC Windows',
      brand: null,
      tier: 'premium',
      is_highlight: true,
    },
    {
      category: 'electrical',
      label: 'Power Backup (DG Capacity)',
      value: '500+ KVA Diesel Generator Backup',
      brand: null,
      tier: null,
      is_highlight: true,
    },
    {
      category: 'plumbing',
      label: 'Plumbing Pipe Material',
      value: 'CPVC Corrosion-Free Underground Piping',
      brand: null,
      tier: 'premium',
      is_highlight: true,
    },
    {
      category: 'security',
      label: 'CCTV Coverage',
      value: '24/7 HD CCTV with Video Storage',
      brand: null,
      tier: null,
      is_highlight: true,
    },
  ]

  // Delete existing specs for this project
  await prisma.projectSpecItem.deleteMany({
    where: { project_id: project.id },
  })

  // Create specs
  for (const spec of specs) {
    await prisma.projectSpecItem.create({
      data: {
        project_id: project.id,
        unit_type_id: null,
        ...spec,
      },
    })
    console.log(`  ✓ ${spec.category}: ${spec.label}`)
  }

  console.log(`\n✅ Seeded ${specs.length} test specs for ${project.name}`)
}

seedTestSpecs()
  .catch(err => {
    console.error('Error seeding specs:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
