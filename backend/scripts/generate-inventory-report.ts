import * as fs from 'fs';
import * as path from 'path';

const masterDir = 'c:\\Users\\Furqan\\Desktop\\RealtyPals\\newProj\\75';

const filesToInspect = [
  'realtypals_sector75_noida_master_data.json',
  'realtypals_sector76_noida_master_data.json',
  'realtypals_sector77_noida_master_data.json',
  'realtypals_sector78_noida_master_data.json',
  'realtypals_sector79_noida_master_data.json',
  'realtypals_sector100_noida_master_data.json',
  'realtypals_sector107_noida_master_data.json',
  'realtypals_sector128_noida_master_data.json',
  'realtypals_sector137_noida_master_data.json',
  'realtypals_sector143_noida_master_data.json',
  'realtypals_sector150_noida_master_data.json',
  'realtypals_sector10_greaternoidawest_master_data.json',
  'realtypals_sector12_greaternoidawest_master_data.json',
  'realtypals_sector16c_greaternoidawest_master_data.json',
  'realtypals_sector1_greaternoidawest_master_data.json',
  'realtypals_techzone4_greaternoidawest_master_data.json',
  'realtypals_sector22d_yamunaexpressway_master_data.json',
];

function generateReport() {
  console.log('# REALTYPALS MASTER INVENTORY & UNIT CONFIGURATIONS REPORT\n');

  for (const fileName of filesToInspect) {
    const filePath = path.join(masterDir, fileName);
    if (!fs.existsSync(filePath)) continue;

    const projects = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (projects.length === 0) continue;

    const sectorName = projects[0].sector || projects[0].project?.sector || fileName;
    const city = projects[0].city || projects[0].project?.city || '';

    console.log(`\n## 📍 ${sectorName} (${city}) — [${fileName}]`);
    console.log(`*Total Projects: ${projects.length}*\n`);

    for (let i = 0; i < projects.length; i++) {
      const p = projects[i].project || projects[i];
      const name = p.name;
      const builder = (projects[i].builder || p.builder)?.name || 'Unknown Builder';
      const units = projects[i].unit_types || p.unit_types || [];

      console.log(`### ${i + 1}. ${name} (by ${builder})`);
      if (units.length === 0) {
        console.log(`   - *Configurations:* Data Pending / General Units`);
      } else {
        const configStrings = units.map((u: any) => {
          const bhkStr = u.bhk ? `${u.bhk} BHK` : (u.name || 'Unit');
          const superArea = u.super_area_sqft ? `${u.super_area_sqft} sq ft (Super)` : '';
          const carpetArea = u.carpet_area_sqft ? `${u.carpet_area_sqft} sq ft (Carpet)` : '';
          const price = u.price_min_cr ? `[₹${(u.price_min_cr * 100).toFixed(0)} L - ₹${(u.price_max_cr || u.price_min_cr) * 100} L]` : '';
          
          const areaDetails = [superArea, carpetArea].filter(Boolean).join(' / ');
          return `   - **${bhkStr}**: ${u.name ? `"${u.name}" — ` : ''}${areaDetails || 'Standard Size'} ${price}`;
        });
        console.log(configStrings.join('\n'));
      }
      console.log('');
    }
  }
}

generateReport();
