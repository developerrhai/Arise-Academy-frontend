
const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk('app/api', function(filePath) {
  if (filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('process.env.BACKEND_URL')) {
        content = content.replace(/const BACKEND = process\.env\.BACKEND_URL[\s\S]*?\);/m, 'const BACKEND = process.env.NEXT_PUBLIC_API_URL || \'https://institute-api.rhaitech.online/api\';');
        fs.writeFileSync(filePath, content);
        console.log('Fixed ' + filePath);
    }
  }
});

