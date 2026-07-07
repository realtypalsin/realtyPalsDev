const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  const rawData = fs.readFileSync('extracted_payload_clean.json', 'utf8');
  const data = JSON.parse(rawData);
  const omissions = data.unit_type_omissions || [];

  for (const item of omissions) {
    const { id, project_id, name, super_area_sqft, carpet_area_sqft, starting_price_inr, bathrooms, subtitle, description, category_badge, inventory_left, perfect_for, key_highlights, whats_included, views } = item;
    
    const price_min_cr = starting_price_inr / 10000000;
    
    // Find project by slug
    const project = await prisma.project.findUnique({ where: { slug: project_id } });
    if (!project) {
        console.log(`Project not found for slug ${project_id}`);
        continue;
    }

    // Find unit types by project_id
    const units = await prisma.unitType.findMany({ where: { project_id: project.id } });
    
    // Attempt to match by name or area
    // The names in JSON are: "3 BHK + 3T", "3 BHK + 3T + Study Room", "4 BHK + 4T + Servant Room"
    // We can try a simple fuzzy match or just update manually. Let's see what unit types exist for this project
    console.log(`Unit types for project ${project.name}:`, units.map(u => u.name));

    let matchedUnit = units.find(u => u.name.toLowerCase() === name.toLowerCase());
    
    if (!matchedUnit) {
       // if not matched by exact name, maybe we just create them?
       // The user said "missing in our db... add those details to the db".
       console.log(`Unit type '${name}' not found. Let's create it.`);
       matchedUnit = await prisma.unitType.create({
           data: {
               project_id: project.id,
               name,
               bhk: name.includes('4') ? 4 : 3,
               super_area_sqft,
               carpet_area_sqft,
               price_min_cr,
               bathrooms,
               subtitle,
               description,
               category_badge,
               inventory_left,
               perfect_for,
               key_highlights: key_highlights || [],
               whats_included: whats_included || [],
               views: views || []
           }
       });
       console.log(`Created new UnitType: ${name}`);
    } else {
       await prisma.unitType.update({
        where: { id: matchedUnit.id },
        data: {
          bathrooms,
          super_area_sqft,
          carpet_area_sqft,
          price_min_cr,
          subtitle,
          description,
          category_badge,
          inventory_left,
          perfect_for,
          key_highlights: key_highlights || [],
          whats_included: whats_included || [],
          views: views || []
        }
      });
      console.log(`Updated existing UnitType: ${name}`);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
