import * as fs from 'fs';
import * as path from 'path';

const dir = 'c:\\Users\\Furqan\\Desktop\\PropFyndr\\newProj\\75';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

const summary = files.map(f => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    return { file: f, count: Array.isArray(data) ? data.length : 0 };
  } catch (e) {
    return { file: f, count: 0 };
  }
}).sort((a, b) => b.count - a.count);

console.log('===============================================================');
console.log('📁 PROJECT COUNT PER MASTER JSON FILE IN newProj/75');
console.log('===============================================================');
summary.forEach(s => {
  console.log(`  ${s.file.padEnd(55)} -> ${s.count} projects`);
});
console.log('===============================================================');
