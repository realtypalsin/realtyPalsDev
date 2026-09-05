import fs from 'fs';

const transcriptPath = 'C:\\Users\\Furqan\\.gemini\\antigravity-ide\\brain\\8c207566-b244-44f4-812b-e1efecf093e3\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf-8').split('\n').filter(l => l.trim());

for (let i = 200; i < lines.length; i++) {
  const step = JSON.parse(lines[i]);
  if (step.type === 'PLANNER_RESPONSE' && step.content && step.content.includes('50') || (step.content && step.content.includes('YardLyst'))) {
    console.log(`\n=== PLANNER RESPONSE AT STEP ${step.step_index} ===`);
    console.log(step.content.slice(0, 4000));
    fs.writeFileSync(`c:\\Users\\Furqan\\Desktop\\PropFyndr\\scratch_step_${step.step_index}.md`, step.content, 'utf-8');
  }
}
