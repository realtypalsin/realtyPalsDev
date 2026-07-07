/**
 * Seed Elite Group builder with theme data
 * Run: npx tsx prisma/seed-elite-group.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ELITE_GROUP_THEME = {
  id: 'elite-group',
  name: 'Elite-X Prestige',
  colors: {
    primary: '#c47860',
    secondary: '#f2e8d8',
    tertiary: '#171412',
    neutral: '#ffffff',
    'on-surface': '#000000',
    error: '#b33a3a',
    overlay: '#000000cc',
    border: '#c4786033'
  },
  typography: {
    headline: 'Cinzel',
    body: 'Cormorant Garamond',
    label: 'Josefin Sans'
  }
}

async function seedEliteGroup() {
  try {
    console.log('Seeding Elite Group builder...')

    // First, create or update the builder
    const builder = await prisma.builder.upsert({
      where: { slug: 'elite-group' },
      update: {
        parent_group: 'Golfgreen Mansions Private Limited',
        website: 'https://elitehomz.com',
        email: 'accounts@elitehomz.com',
        experience_years: '14+ Years',
        projects_delivered_count: 18,
        iso_certified: true
      },
      create: {
        id: 'elite-group',
        slug: 'elite-group',
        name: 'Elite Group',
        parent_group: 'Golfgreen Mansions Private Limited',
        tagline: 'Premium luxury residential developments',
        founded_year: 2012,
        headquarters: 'New Delhi, India',
        website: 'https://elitehomz.com',
        email: 'accounts@elitehomz.com',
        phone: '+91-11-XXXX-XXXX',
        credai_member: true,
        delivered_units: 5000,
        experience_years: '14+ Years',
        projects_delivered_count: 18,
        iso_certified: true,
        delivered_projects: ['Elite Max', 'Elite Town', 'Affordable Housing Projects'],
        ongoing_projects: ['Elite X Sector 10 Greater Noida West'],
        awards: [
          'Best Luxury Developer - Construction Week',
          'Excellence in Real Estate - CREDAI',
          'Sustainable Development Award'
        ],
        awards_count: 3,
        description: `Elite Group (legally registered as Golfgreen Mansions Private Limited, CIN: U70200DL2012PTC237482) is a premium residential developer with a track record of delivering high-quality, luxury properties across India. Founded in 2012, the group is known for low-density developments featuring premium biophilic landscaping, architectural excellence, and lifestyle amenities.

Elite Group's flagship project, Elite X in Sector 10, Greater Noida West, exemplifies their commitment to premium living with 630 units across 6 towers on 5.44 acres, featuring 70% open green space and a private mini-golf course. The development is registered under RERA number UPRERAPRJ916631/02/2024 with a possession date of December 31, 2028.

The builder's approach emphasizes quality over quantity, with structural integrity ensured through 100% Mivan aluminum formwork technology, seismic resilience, and premium finishes. Elite Group partners with authorized marketing channels like Nandee Realtors for transparent sales and customer relations.`,
        luxury_specialization: true
      }
    })

    console.log(`✓ Elite Group builder seeded/updated: ${builder.id}`)

    // Now create or update the theme
    const now = new Date()
    const threeYearsFromNow = new Date(now.getTime() + 3 * 365 * 24 * 60 * 60 * 1000)

    const theme = await prisma.builderTheme.upsert({
      where: { builder_id: builder.id },
      update: {
        primary_color: ELITE_GROUP_THEME.colors.primary,
        secondary_color: ELITE_GROUP_THEME.colors.secondary,
        active_until: threeYearsFromNow,
        is_active: true
      },
      create: {
        builder_id: builder.id,
        primary_color: ELITE_GROUP_THEME.colors.primary,
        secondary_color: ELITE_GROUP_THEME.colors.secondary,
        active_from: now,
        active_until: threeYearsFromNow,
        is_active: true
      }
    })

    console.log(`✓ Theme seeded: ${ELITE_GROUP_THEME.name}`)
    console.log(`  Primary: ${ELITE_GROUP_THEME.colors.primary}`)
    console.log(`  Secondary: ${ELITE_GROUP_THEME.colors.secondary}`)
    console.log(`  Active until: ${threeYearsFromNow.toLocaleDateString()}`)

    // Verify
    const verify = await prisma.builder.findUnique({
      where: { id: builder.id },
      include: { theme: true }
    })

    if (verify?.theme) {
      console.log('✓ Theme relation verified')
    }
  } catch (err) {
    console.error('Seeding failed:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seedEliteGroup()
