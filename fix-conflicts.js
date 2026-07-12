const fs = require('fs');
const path = require('path');

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const fullPath = path.join(directory, file);
    
    if (fs.statSync(fullPath).isDirectory()) {
      if (file === 'node_modules' || file === '.next' || file === '.git' || file === 'dist' || file === 'build') {
        continue;
      }
      processDirectory(fullPath);
    } else {
      if (!fullPath.endsWith('.ts') && !fullPath.endsWith('.tsx') && !fullPath.endsWith('.js') && !fullPath.endsWith('.jsx') && !fullPath.endsWith('.json') && !fullPath.endsWith('.md')) {
        continue;
      }
      
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('<<<<<<< HEAD')) {
        let changed = false;
        // Regex to match conflict markers and keep only the dfb0 side
        // Pattern: <<<<<<< HEAD\n(anything)\n=======\n(anything)\n>>>>>>> dfb0...
        const regex = /<<<<<<< HEAD[\s\S]*?=======[\r\n]+([\s\S]*?)>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172/g;
        
        const newContent = content.replace(regex, '$1');
        
        if (newContent !== content) {
          fs.writeFileSync(fullPath, newContent, 'utf8');
          console.log('Fixed conflict in ' + fullPath);
        }
      }
    }
  }
}

processDirectory(path.join(__dirname, 'frontend'));
console.log('Done fixing conflicts.');
