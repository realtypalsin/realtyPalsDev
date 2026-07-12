import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

async function run() {
  if (!GOOGLE_PLACES_API_KEY) {
    console.error("Missing GOOGLE_PLACES_API_KEY");
    process.exit(1);
  }

  // Find projects missing hero_image_url
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { hero_image_url: null },
        { hero_image_url: '' }
      ]
    },
    include: { builder: true }
  });

  console.log(`Found ${projects.length} projects missing images.`);

  for (const project of projects) {
    const query = encodeURIComponent(`${project.name} ${project.builder.name} ${project.sector} ${project.city}`);
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${GOOGLE_PLACES_API_KEY}`;
    
    try {
      console.log(`Searching for: ${project.name}`);
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json() as any;
      
      if (searchData.results && searchData.results.length > 0) {
        const place = searchData.results[0];
        if (place.photos && place.photos.length > 0) {
          const photoReference = place.photos[0].photo_reference;
          const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
          
          await prisma.project.update({
            where: { id: project.id },
            data: { hero_image_url: photoUrl }
          });
          console.log(`✅ Updated ${project.name} with new image`);
        } else {
          console.log(`⚠️ No photos found in Places API for ${project.name}`);
        }
      } else {
        console.log(`❌ No places found for ${project.name}`);
      }
    } catch (e) {
      console.error(`Error processing ${project.name}:`, e);
    }
    
    // Sleep to avoid rate limits
    await new Promise(r => setTimeout(r, 1000));
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
