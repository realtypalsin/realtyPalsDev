import fs from 'fs';

const transcriptPath = 'C:\\Users\\Furqan\\.gemini\\antigravity-ide\\brain\\8c207566-b244-44f4-812b-e1efecf093e3\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf-8').split('\n').filter(l => l.trim());

for (let i = 200; i < lines.length; i++) {
  const step = JSON.parse(lines[i]);
  if (step.type === 'PLANNER_RESPONSE' && step.content) {
    if (step.content.includes('|') && step.content.includes('.com') && step.content.length > 3000) {
      console.log(`\nFound Table in step ${step.step_index} (Length: ${step.content.length})`);
      fs.writeFileSync(`c:\\Users\\Furqan\\Desktop\\PropFyndr\\master_50_names_table.md`, step.content, 'utf-8');
      console.log(`Saved to master_50_names_table.md`);
      break;
    }
  }
}
