import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as os from 'os';

const projectsDir = path.resolve(__dirname, '../../Projects');

function findJsonFiles(dir: string, fileList: string[] = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findJsonFiles(filePath, fileList);
    } else if (filePath.endsWith('.json')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const jsonFiles = findJsonFiles(projectsDir);

for (const jsonFile of jsonFiles) {
  console.log(`Processing: ${jsonFile}`);
  try {
    const content = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
    if (Array.isArray(content)) {
      for (let i = 0; i < content.length; i++) {
        const tempFile = path.join(os.tmpdir(), `temp-seed-${Date.now()}-${i}.json`);
        fs.writeFileSync(tempFile, JSON.stringify(content[i]));
        console.log(`Executing seed for element ${i} of ${jsonFile}`);
        execSync(`npx tsx scripts/seed-from-json.ts "${tempFile}"`, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
        fs.unlinkSync(tempFile);
      }
    } else {
      console.log(`Executing seed for: ${jsonFile}`);
      execSync(`npx tsx scripts/seed-from-json.ts "${jsonFile}"`, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
    }
  } catch (err) {
    console.error(`Failed to process ${jsonFile}`, err);
  }
}
