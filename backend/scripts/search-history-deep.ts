import fs from 'fs';
import readline from 'readline';

async function searchHistory() {
  const fileStream = fs.createReadStream('C:\\Users\\Furqan\\.claude\\history.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const terms = ['trademark', 'domain', 'brand', 'seo', 'availability', 'naming', 'propfyndr'];

  let count = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      const text = (obj.display || obj.text || JSON.stringify(obj)).toLowerCase();
      
      const matched = terms.filter(t => text.includes(t));
      if (matched.length >= 2) {
        console.log(`\n=== MATCH (Found: ${matched.join(', ')}) [Time: ${new Date(obj.timestamp || 0).toISOString()}] [Project: ${obj.project}] ===`);
        console.log((obj.display || obj.text || '').slice(0, 500));
        count++;
        if (count > 30) break;
      }
    } catch {}
  }
}

searchHistory();
