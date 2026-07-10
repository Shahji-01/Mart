const fs = require('fs');
const path = require('path');

const replacements = [
  { search: /Shankeshwar Traders/g, replace: 'Shankeshwar Traders' },
  { search: /Shankeshwar Traders/g, replace: 'Shankeshwar Traders' },
  { search: /ST Coins/g, replace: 'ST Coins' },
  { search: /ST Coin/g, replace: 'ST Coin' },
  { search: /ST Wallet/g, replace: 'ST Wallet' },
  { search: /Shankeshwar Traders/g, replace: 'Shankeshwar Traders' },
  { search: /ntcmart-logo\.png/g, replace: 'shankeshwar-logo.png' },
  { search: /ntcmart\.in/g, replace: 'shankeshwartraders.in' },
  { search: /ntcmarket\.in/g, replace: 'shankeshwartraders.in' }
];

const ignoreDirs = ['node_modules', '.git', '.next', 'dist', 'build', '.turbo', '.agents', '.config', '.kiro', 'attached_assets'];
const ignoreExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.ico', '.pdf', '.zip'];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (!ignoreDirs.includes(file)) {
        results = results.concat(walk(filePath));
      }
    } else {
      if (!ignoreExtensions.some(ext => file.endsWith(ext)) && !file.endsWith('.lock') && file !== 'pnpm-lock.yaml') {
        results.push(filePath);
      }
    }
  });
  return results;
}

const allFiles = walk(path.join(__dirname, '..'));

let filesChanged = 0;

for (const file of allFiles) {
  if (file.endsWith('.log') || file.endsWith('.jsonl')) continue; // Skip logs
  
  try {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    for (const { search, replace } of replacements) {
      content = content.replace(search, replace);
    }
    
    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      console.log('Updated:', file);
      filesChanged++;
    }
  } catch (err) {
    // Ignore read errors for binaries or unreadable files
  }
}

console.log(`\nFinished! Updated ${filesChanged} files.`);
