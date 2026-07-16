import fs from 'fs';
import path from 'path';

const inputPath = path.join(__dirname, '../missing_fields_report_noida.json');
const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

console.log('--- PROJECTS WITH NO COMPETITORS ---');
data.filter(p => !p.has_competitors).forEach(p => {
  console.log(`\nProject: ${p.project_name} (${p.slug})`);
  console.log(`Missing Builder Fields: ${p.missing_builder_fields.join(', ') || 'None'}`);
  console.log(`Missing Project Fields: ${p.missing_project_fields.join(', ') || 'None'}`);
  console.log(`Missing Decision Fields: ${p.missing_decision_fields.join(', ') || 'None'}`);
});

console.log('\n--- POTENTIAL DUPLICATES / EMPTY PROJECTS ---');
// Let's find projects that are completely empty or share a very similar name
const nameMap = new Map();
data.forEach(p => {
  // Normalize name for matching
  const normalized = p.project_name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!nameMap.has(normalized)) {
    nameMap.set(normalized, []);
  }
  nameMap.get(normalized).push(p);
});

nameMap.forEach((projects, normalizedName) => {
  if (projects.length > 1) {
    console.log(`\nPotential Duplicate Group:`);
    projects.forEach(p => {
      console.log(`  - ${p.project_name} (Slug: ${p.slug})`);
    });
  }
});

// Also find completely empty ones (missing tons of fields)
console.log('\nProjects missing all major fields (likely empty/unseeded):');
data.filter(p => 
  p.missing_builder_fields.includes('logo_url') && 
  p.missing_builder_fields.includes('company_overview') && 
  p.missing_builder_fields.includes('delivered_units') && 
  p.missing_builder_fields.includes('founded_year') &&
  p.missing_project_fields.includes('hero_image_url') &&
  p.missing_decision_fields.includes('decision_thesis')
).forEach(p => {
  console.log(`  - ${p.project_name} (Slug: ${p.slug})`);
});
