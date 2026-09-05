import fs from 'fs';

const transcriptPath = 'C:\\Users\\Furqan\\.gemini\\antigravity-ide\\brain\\8c207566-b244-44f4-812b-e1efecf093e3\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf-8').split('\n').filter(l => l.trim());

for (let i = 205; i < lines.length; i++) {
  const step = JSON.parse(lines[i]);
  if (step.type === 'PLANNER_RESPONSE' && step.content) {
    console.log(`Step ${step.step_index}: length = ${step.content.length}`);
    if (step.content.includes('YardLyst') || step.content.includes('50') || step.content.includes('Acres') || step.content.includes('Table')) {
      fs.writeFileSync(`c:\\Users\\Furqan\\Desktop\\PropFyndr\\scratch_step_${step.step_index}.md`, step.content, 'utf-8');
      console.log(`Saved step ${step.step_index}`);
    }
  }
}
