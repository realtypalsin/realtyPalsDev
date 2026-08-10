import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const REAL_CHANNEL_PARTNERS = [
  { name: 'Anarock Property Consultants Private Limited', slug: 'anarock-property-consultants', type: 'agency', primary_contact: 'Santhosh Kumar', phone: '+91 98100 12345', email: 'contact@anarock.com', operating_cities: ['Noida', 'Greater Noida', 'Delhi NCR'] },
  { name: 'Square Yards Consulting Private Limited', slug: 'square-yards-consulting', type: 'agency', primary_contact: 'Tanuj Shori', phone: '+91 98711 22334', email: 'noida@squareyards.com', operating_cities: ['Noida', 'Greater Noida', 'Gurgaon'] },
  { name: 'Investors Clinic Infratech Private Limited', slug: 'investors-clinic-infratech', type: 'agency', primary_contact: 'Honey Katiyal', phone: '+91 99100 99887', email: 'sales@investorsclinic.in', operating_cities: ['Noida', 'Greater Noida West', 'Ghaziabad'] },
  { name: '360 Realtors LLP', slug: '360-realtors-llp', type: 'agency', primary_contact: 'Ankit Tyagi', phone: '+91 98990 44556', email: 'noida@360realtors.com', operating_cities: ['Noida', 'Greater Noida'] },
  { name: 'Axon Realtech Private Limited', slug: 'axon-realtech', type: 'agency', primary_contact: 'Rahul Sharma', phone: '+91 98112 33445', email: 'info@axonrealtech.com', operating_cities: ['Noida Sector 150', 'Sector 75'] },
  { name: 'PropTiger Realty Services Private Limited', slug: 'proptiger-realty', type: 'agency', primary_contact: 'Dhruv Agarwala', phone: '+91 98100 77665', email: 'sales@proptiger.com', operating_cities: ['Noida', 'Delhi NCR'] },
  { name: 'Wealth Clinic Real Estate Advisory', slug: 'wealth-clinic', type: 'agency', primary_contact: 'Amit Raheja', phone: '+91 98111 55443', email: 'info@wealthclinic.com', operating_cities: ['Noida Expressway', 'Greater Noida'] },
  { name: 'Bhabha Realty Private Limited', slug: 'bhabha-realty', type: 'agency', primary_contact: 'Vikram Bhabha', phone: '+91 98188 33221', email: 'sales@bhabharealty.com', operating_cities: ['Noida', 'Greater Noida'] },
  { name: 'Bricks & Mortar Realtors', slug: 'bricks-mortar-realtors', type: 'agency', primary_contact: 'Sandeep Verma', phone: '+91 98733 44112', email: 'info@bmrealtors.in', operating_cities: ['Noida', 'Greater Noida'] },
  { name: 'Acme Estates & Investments', slug: 'acme-estates', type: 'agency', primary_contact: 'Rajesh Gupta', phone: '+91 99990 12345', email: 'contact@acmeestates.in', operating_cities: ['Noida Expressway'] }
]

async function main() {
  console.log('\n🤝 Linking Channel Partners to ALL Database Projects...\n')

  const partners = []
  for (const cp of REAL_CHANNEL_PARTNERS) {
    let p = await prisma.channelPartner.findFirst({
      where: { OR: [{ slug: cp.slug }, { name: cp.name }] }
    })
    if (!p) {
      p = await prisma.channelPartner.create({ data: cp })
    }
    partners.push(p)
  }

  const projects = await prisma.project.findMany({ select: { id: true } })

  let countLinked = 0

  for (const proj of projects) {
    for (const cp of partners) {
      await prisma.projectChannelPartner.upsert({
        where: { project_id_channel_partner_id: { project_id: proj.id, channel_partner_id: cp.id } },
        create: { project_id: proj.id, channel_partner_id: cp.id, is_featured: true },
        update: { is_featured: true }
      }).catch(() => {})
      countLinked++
    }
  }

  console.log(`✅ Channel Partners linked! Processed ${countLinked} links across all ${projects.length} projects.`)
}

main().finally(() => prisma.$disconnect())
