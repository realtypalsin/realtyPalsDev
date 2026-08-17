import { prisma } from '../lib/db'

async function inspectDuplicates() {
  const dupPairs = [
    ['e98b34a4-33d5-4f2c-9f05-a45d77cd01a4', '3b783d97-d1b5-43b1-9246-8931c4266064'],
    ['f25e325a-5036-48c5-bc62-a288e40cf481', '7533e111-ec22-4378-9af7-04c1280d7af7'],
    ['288d57e6-d51d-46be-a7da-77f993796ad0', '33857ae6-1ab5-4dda-9842-50893cb7cad3']
  ]

  for (const pair of dupPairs) {
    console.log(`\n=== Comparing Pair: ${pair[0]} vs ${pair[1]} ===`)
    const projects = await prisma.project.findMany({
      where: { id: { in: pair } },
      include: {
        images: true,
        unit_types: true,
        cost_sheet: true,
        payment_plans: true,
        channel_partners: true,
        chat_sessions: true,
      }
    })

    for (const p of projects) {
      console.log(`- ID: ${p.id} | Name: "${p.name}" | Slug: "${p.slug}" | Status: ${p.status} | Price: ₹${p.price_min_cr} Cr | Images: ${p.images.length} | Units: ${p.unit_types.length} | Chats: ${p.chat_sessions.length}`)
    }
  }

  await prisma.$disconnect()
}

inspectDuplicates().catch(console.error)
