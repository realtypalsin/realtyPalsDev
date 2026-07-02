const fs = require('fs');
const path = require('path');

function getFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const name = dir + '/' + file;
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, filesList);
    } else {
      if (name.endsWith('.md') || name.endsWith('.json')) {
        filesList.push(name);
      }
    }
  }
  return filesList;
}

const allFiles = getFiles('C:/Users/Furqan/Desktop/UiRealtyPals/Projects/Noida');
const amenitiesSet = new Set();

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  // Try to parse JSON blocks
  const jsonMatches = content.match(/```json([\s\S]*?)```/g);
  if (jsonMatches) {
    for (const match of jsonMatches) {
      try {
        const jsonStr = match.replace(/```json|```/g, '');
        const obj = JSON.parse(jsonStr);
        
        // Extract from obj.amenities
        if (obj.amenities) {
            if (Array.isArray(obj.amenities)) {
                obj.amenities.forEach(a => typeof a === 'string' && amenitiesSet.add(a.trim().toLowerCase()));
            } else if (typeof obj.amenities === 'object') {
                for (const key in obj.amenities) {
                    if (Array.isArray(obj.amenities[key])) {
                        obj.amenities[key].forEach(a => typeof a === 'string' && amenitiesSet.add(a.trim().toLowerCase()));
                    }
                }
            }
        }
      } catch (e) {}
    }
  }
}

const sorted = Array.from(amenitiesSet).sort();
fs.writeFileSync('C:/Users/Furqan/Desktop/UiRealtyPals/extracted_amenities.json', JSON.stringify(sorted, null, 2));
console.log(`Extracted ${sorted.length} unique amenities.`);
