import fs from 'fs';
import path from 'path';

const claudeProjectsDir = 'C:\\Users\\Furqan\\.claude\\projects';

function searchDir(dir: string, keywords: string[], maxHits = 20) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      searchDir(fullPath, keywords, maxHits);
    } else if (entry.isFile() && (entry.name.endsWith('.jsonl') || entry.name.endsWith('.ts') || entry.name.endsWith('.py') || entry.name.endsWith('.js') || entry.name.endsWith('.md'))) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        for (const kw of keywords) {
          const idx = content.toLowerCase().indexOf(kw.toLowerCase());
          if (idx !== -1) {
            console.log(`\n>>> MATCH in ${fullPath} for keyword "${kw}":`);
            const start = Math.max(0, idx - 200);
            const end = Math.min(content.length, idx + 600);
            console.log(content.slice(start, end));
            console.log('---');
            break;
          }
        }
      } catch (err) {
        // ignore
      }
    }
  }
}

console.log('Searching in Claude projects for trademark / domain availability / brand names...');
searchDir(claudeProjectsDir, ['trademark', 'domain availability', 'whois', 'brand name', 'brand names']);
