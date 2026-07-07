const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  const rawData = fs.readFileSync('extracted_payload_clean.json', 'utf8');
  const data = JSON.parse(rawData);
  const omissions = data.unit_type_omissions || [];

  for (const item of omissions) {
    const { id, project_id, name, super_area_sqft, carpet_area_sqft, starting_price_inr, bathrooms, subtitle, description, category_badge, inventory_left, perfect_for, key_highlights, whats_included, views } = item;
    
    // Convert starting_price_inr to price_min_cr
    const price_min_cr = starting_price_inr / 10000000;
    
    // The ID might not match exactly, so let's try to update by ID first.
    // If it doesn't exist, try to find by name and project_id.
    let unit = await prisma.unitType.findUnique({ where: { id } });
    if (!unit) {
      const units = await prisma.unitType.findMany({ where: { project_id, name } });
      if (units.length > 0) {
         unit = units[0];
      }
    }
    
    if (unit) {
      await prisma.unitType.update({
        where: { id: unit.id },
        data: {
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
      console.log(`Updated UnitType: ${name}`);
    } else {
      console.log(`UnitType not found: ${name} (${id})`);
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
