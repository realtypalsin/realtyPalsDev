import fs from 'fs';
import path from 'path';

const inputPath = path.join(__dirname, '../missing_fields_report_noida.json');
const outputPath = path.join(__dirname, '../../docs/MissingFieldsNoidaReport.md');

const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

let md = '# Missing Fields Report for Noida & Greater Noida Projects\n\n';
md += 'This report lists all projects in the specified sectors (Noida: 75, 76, 77, 78, 79; Greater Noida/West: 10, 12) that have missing fields in the database. Use this to gather the missing data for seeding.\n\n';

for (const project of data) {
    const hasMissing = project.missing_project_fields.length > 0 || 
                       project.missing_builder_fields.length > 0 || 
                       project.missing_decision_fields.length > 0 || 
                       project.unit_types_missing_fields.length > 0 ||
                       !project.has_competitors;
    
    if (hasMissing) {
        md += `## ${project.project_name} (${project.sector}, ${project.city})\n`;
        md += `- **Slug:** \`${project.slug}\`\n`;
        if (project.missing_project_fields.length > 0) {
            md += `- **Missing Project Fields:** ${project.missing_project_fields.join(', ')}\n`;
        }
        if (project.missing_builder_fields.length > 0) {
            md += `- **Missing Builder Fields:** ${project.missing_builder_fields.join(', ')}\n`;
        }
        if (project.missing_decision_fields.length > 0) {
            md += `- **Missing Decision Fields:** ${project.missing_decision_fields.join(', ')}\n`;
        }
        if (project.unit_types_missing_fields.length > 0) {
            md += `- **Missing Unit Types Fields:** ${project.unit_types_missing_fields.join(', ')}\n`;
        }
        if (!project.has_competitors) {
            md += `- **Missing Competitors:** Yes (No competitors found for this project)\n`;
        }
        md += '\n';
    }
}

fs.writeFileSync(outputPath, md);
console.log('Report generated at docs/MissingFieldsNoidaReport.md');
