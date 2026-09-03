import fs from 'fs';
import path from 'path';

function searchDesktop(dir: string, depth = 0) {
  if (depth > 5) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === '.next' || e.name === 'dist' || e.name === 'build') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        searchDesktop(full, depth + 1);
      } else if (e.isFile()) {
        const lower = e.name.toLowerCase();
        if (lower.includes('trademark') || lower.includes('domain') || lower.includes('brand') || lower.includes('naming')) {
          console.log(`[File Match] ${full}`);
        }
        if (e.size < 2000000 && (lower.endsWith('.py') || lower.endsWith('.ts') || lower.endsWith('.js') || lower.endsWith('.json') || lower.endsWith('.md') || lower.endsWith('.txt') || lower.endsWith('.sh') || lower.endsWith('.ps1'))) {
          try {
            const content = fs.readFileSync(full, 'utf-8');
            if (content.toLowerCase().includes('trademark')) {
              console.log(`\n[TRADEMARK IN CONTENT] ${full}`);
              const idx = content.toLowerCase().indexOf('trademark');
              console.log(content.slice(Math.max(0, idx - 100), Math.min(content.length, idx + 300)));
              console.log('----------------------------------------------------');
            }
          } catch {}
        }
      }
    }
  } catch {}
}

console.log('Searching Desktop for trademark...');
searchDesktop('C:\\Users\\Furqan\\Desktop');
