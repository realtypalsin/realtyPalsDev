import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

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
  console.log(`Executing seed for: ${jsonFile}`);
  try {
    execSync(`npx tsx scripts/seed-from-json.ts "${jsonFile}"`, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
  } catch (err) {
    console.error(`Failed to seed ${jsonFile}`, err);
  }
}
