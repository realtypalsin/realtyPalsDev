import fs from 'fs';
import path from 'path';

const scratchDir = 'C:\\Users\\Furqan\\.gemini\\antigravity-ide\\brain\\8c207566-b244-44f4-812b-e1efecf093e3\\scratch';
console.log('Files in scratch:');
const files = fs.readdirSync(scratchDir);
for (const f of files) {
  if (f.endsWith('.mjs')) {
    console.log(`- ${f} (${fs.statSync(path.join(scratchDir, f)).size} bytes)`);
  }
}

// Read the last user message and the assistant's final response in transcript.jsonl
const transcriptPath = 'C:\\Users\\Furqan\\.gemini\\antigravity-ide\\brain\\8c207566-b244-44f4-812b-e1efecf093e3\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf-8').split('\n').filter(l => l.trim());

console.log(`\nTotal steps in transcript: ${lines.length}`);

// Find the last few steps
for (let i = lines.length - 1; i >= 0; i--) {
  const step = JSON.parse(lines[i]);
  if (step.type === 'PLANNER_RESPONSE' && step.content) {
    console.log(`\n=== LAST PLANNER RESPONSE (Step ${step.step_index}) ===`);
    console.log(step.content.slice(0, 3000));
    fs.writeFileSync('c:\\Users\\Furqan\\Desktop\\RealtyPals\\scratch_recovered_response.md', step.content, 'utf-8');
    console.log('\nSaved full response to scratch_recovered_response.md');
    break;
  }
}
