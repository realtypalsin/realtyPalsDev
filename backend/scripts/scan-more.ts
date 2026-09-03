import fs from 'fs';
import path from 'path';

const roots = [
  'C:\\Users\\Furqan\\.claude-mem',
  'C:\\Users\\Furqan\\Downloads',
  'C:\\Users\\Furqan\\Documents',
  'C:\\Users\\Furqan\\.cursor',
  'C:\\Users\\Furqan\\.codex',
  'C:\\Users\\Furqan\\.gemini',
];

function scanDir(dir: string, depth = 0) {
  if (depth > 4 || !fs.existsSync(dir)) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'cache') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        scanDir(full, depth + 1);
      } else if (e.isFile()) {
        const lower = e.name.toLowerCase();
        if (lower.includes('trademark') || lower.includes('whois') || lower.includes('domain') || lower.includes('brand') || lower.includes('seo')) {
          console.log(`[FILE FOUND] ${full}`);
        }
        if (e.size < 1000000 && (lower.endsWith('.py') || lower.endsWith('.ts') || lower.endsWith('.js') || lower.endsWith('.json') || lower.endsWith('.md') || lower.endsWith('.txt'))) {
          try {
            const txt = fs.readFileSync(full, 'utf-8');
            if (txt.toLowerCase().includes('trademark') && (txt.toLowerCase().includes('domain') || txt.toLowerCase().includes('seo'))) {
              console.log(`[CONTENT MATCH] ${full}`);
              const idx = txt.toLowerCase().indexOf('trademark');
              console.log(txt.slice(Math.max(0, idx - 100), Math.min(txt.length, idx + 400)));
              console.log('---------------------------------------------------------');
            }
          } catch {}
        }
      }
    }
  } catch {}
}

for (const r of roots) {
  console.log(`Scanning: ${r}`);
  scanDir(r);
}
