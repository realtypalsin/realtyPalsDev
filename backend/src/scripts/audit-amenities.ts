import { prisma } from '../lib/db'

async function main() {
  const totalProjects = await prisma.project.count()
  const totalAmenities = await prisma.amenity.count()
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, amenities: { select: { name: true, category: true } } }
  })
  const counts = projects.map((p: any) => p.amenities.length)
  const min = Math.min(...counts)
  const max = Math.max(...counts)
  const avg = (counts.reduce((a: number, b: number) => a + b, 0) / (counts.length || 1)).toFixed(1)
  const under5 = projects.filter((p: any) => p.amenities.length < 5)
  console.log(JSON.stringify({ totalProjects, totalAmenities, min, max, avg, under5Count: under5.length }, null, 2))
  
  const allNames = projects.flatMap((p: any) => p.amenities.map((a: any) => a.name))
  const freq: Record<string, number> = {}
  allNames.forEach((n: string) => freq[n] = (freq[n] || 0) + 1)
  const top30 = Object.entries(freq).sort((a: [string, number], b: [string, number]) => b[1] - a[1]).slice(0, 30)
  console.log('Top 30 Amenities in DB:', top30)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
