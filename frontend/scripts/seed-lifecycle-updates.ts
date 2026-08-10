import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n🏢 Wave 3: Seeding Post-Delivery Lifecycle Updates for Ready-to-Move Projects...\n')

  const readyProjects = await prisma.project.findMany({
    where: { status: 'ready_to_move' },
    select: { id: true, name: true, sector: true }
  })

  let totalUpdatesCreated = 0

  for (const p of readyProjects) {
    const updates = [
      {
        update_type: 'possession_status_change',
        title: 'Resident Possession & Occupancy Handover Active',
        description: `Over 85% of physical unit handovers completed at ${p.name}. Active resident community living in the society with functional AOA management.`,
        update_date: new Date(2024, 2, 15),
        impact: 'High Positive - Immediate move-in ready status verified',
        source: 'RealtyPals Field Inspection Desk',
        verified_by: 'Senior Real Estate Analyst',
        affects_pricing: true,
        affects_recommendation: true,
        legal_flag_cleared: true,
        note: 'Living society with 24/7 active facility management.'
      },
      {
        update_type: 'maintenance_fee_update',
        title: 'Annual Society Maintenance Schedule & Security Deployment',
        description: `Monthly maintenance rate confirmed at ₹3.50/sqft/month, covering 24/7 multi-tier security, CCTV monitoring, common area housekeeping, and DG power backup.`,
        update_date: new Date(2024, 5, 1),
        impact: 'Stable Facility Maintenance',
        source: 'Apartment Owners Association (AOA) Resolution',
        verified_by: 'RealtyPals Data Desk',
        affects_pricing: false,
        affects_recommendation: false,
        legal_flag_cleared: false,
        maintenance_fee_monthly_psf: 3.50,
        maintenance_fee_previous: 3.20,
        note: 'Maintenance fee billed quarterly in advance.'
      },
      {
        update_type: 'amenity_addition',
        title: 'Grand Clubhouse & Recreational Amenities Operational',
        description: `All resident amenities including the multi-purpose clubhouse, swimming pool, indoor badminton court, gymnasium, and kids play zone are operational.`,
        update_date: new Date(2024, 8, 10),
        impact: 'Enhanced Livability & Resale Appeal',
        source: 'Builder Facility Management Notice',
        verified_by: 'Site Verification Team',
        affects_pricing: true,
        affects_recommendation: true,
        legal_flag_cleared: false,
        note: 'Club membership pre-cleared for flat owners.'
      },
      {
        update_type: 'regulatory_compliance',
        title: 'Occupancy Certificate (OC) & Fire Safety Clearance Validated',
        description: `${p.name} holds valid Occupancy Certificate (OC) and updated Fire Safety NOC from local urban development authority.`,
        update_date: new Date(2023, 11, 20),
        impact: '100% Legal Compliance & 0% GST Benefit',
        source: 'Local Urban Authority Public Filing',
        verified_by: 'RERA Compliance Desk',
        affects_pricing: true,
        affects_recommendation: true,
        legal_flag_cleared: true,
        note: 'Eligible for 0% GST on resale transactions.'
      }
    ]

    for (const u of updates) {
      await prisma.projectLifecycleUpdate.create({
        data: {
          project_id: p.id,
          ...u
        }
      })
      totalUpdatesCreated++
    }
  }

  console.log(`✅ Wave 3 complete! Created ${totalUpdatesCreated} post-delivery lifecycle updates across ${readyProjects.length} ready-to-move projects.`)
}

main().finally(() => prisma.$disconnect())
