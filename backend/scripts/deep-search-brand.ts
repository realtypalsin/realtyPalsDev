import fs from 'fs';
import path from 'path';

const searchRoots = [
  'C:\\Users\\Furqan\\.claude',
  'C:\\Users\\Furqan\\Desktop',
];

const keywords = ['trademark', 'domain availability', 'whois', 'seo visibility', 'ipindia', 'tmdn', 'brand name check', 'domain check', 'seo audit'];

function searchFiles(dir: string, depth = 0) {
  if (depth > 6 || !fs.existsSync(dir)) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === '.next') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        searchFiles(full, depth + 1);
      } else if (e.isFile()) {
        const lowerName = e.name.toLowerCase();
        // check filename first
        for (const kw of keywords) {
          if (lowerName.includes(kw.replace(/\s+/g, '')) || lowerName.includes('domain') || lowerName.includes('trademark') || lowerName.includes('seo') || lowerName.includes('brand')) {
            console.log(`[Filename Match] ${full}`);
            break;
          }
        }
        // check content
        if (e.size < 5000000 && (lowerName.endsWith('.py') || lowerName.endsWith('.ts') || lowerName.endsWith('.js') || lowerName.endsWith('.jsonl') || lowerName.endsWith('.json') || lowerName.endsWith('.sh') || lowerName.endsWith('.md'))) {
          try {
            const txt = fs.readFileSync(full, 'utf-8');
            for (const kw of keywords) {
              const idx = txt.toLowerCase().indexOf(kw);
              if (idx !== -1) {
                console.log(`[Content Match] ${full} -> "${kw}" at index ${idx}`);
                console.log(txt.slice(Math.max(0, idx - 150), Math.min(txt.length, idx + 400)));
                console.log('----------------------------------------------------');
                break;
              }
            }
          } catch {}
        }
      }
    }
  } catch {}
}

for (const root of searchRoots) {
  console.log(`Searching root: ${root}`);
  searchFiles(root);
}
