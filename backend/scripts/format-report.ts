import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('missing_fields_report_noida.json', 'utf8'));

let md = '# Missing Fields Report (Noida & Greater Noida)\n\n';
md += 'This report covers projects in Noida (sectors 75, 76, 77, 78, 79) and Greater Noida (sectors 10, 12).\n\n';

for (const p of data) {
  md += `## ${p.project_name} (${p.city}, ${p.sector})\n`;
  
  if (p.missing_project_fields.length > 0) {
    md += `- **Missing Project Info:** ${p.missing_project_fields.join(', ')}\n`;
  }
  
  if (p.missing_builder_fields.length > 0) {
    md += `- **Missing Builder Info:** ${p.missing_builder_fields.join(', ')}\n`;
  }
  
  if (p.missing_decision_fields.length > 0) {
    md += `- **Missing Decision/AI Data:** ${p.missing_decision_fields.join(', ')}\n`;
  }
  
  if (p.unit_types_missing_fields.length > 0) {
    md += `- **Missing Unit Types Data:**\n`;
    for (const u of p.unit_types_missing_fields) {
      md += `  - ${u.name}: ${u.missing.join(', ')}\n`;
    }
  }

  if (!p.has_competitors) {
    md += `- **Missing Competitors:** No competitors linked.\n`;
  }

  md += '\n';
}

writeFileSync('C:/Users/Furqan/.gemini/antigravity-ide/brain/b56324a0-36f5-427d-9066-d8e4a56511f6/missing_fields_noida.md', md);
console.log('Done writing markdown artifact.');
