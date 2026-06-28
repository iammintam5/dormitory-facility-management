const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '../frontend/src');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const colorMap = {
  'text-slate-400': 'text-muted-foreground',
  'text-slate-500': 'text-muted-foreground',
  'text-slate-600': 'text-muted-foreground',
  'text-slate-700': 'text-foreground',
  'text-slate-800': 'text-foreground',
  'text-slate-900': 'text-foreground',
  'text-slate-950': 'text-foreground',
  'bg-slate-50': 'bg-muted/30',
  'bg-slate-100': 'bg-muted/50',
  'bg-slate-200': 'bg-muted',
  'bg-slate-800': 'bg-card',
  'bg-slate-900': 'bg-card',
  'bg-slate-950': 'bg-card',
  'border-slate-200': 'border-border',
  'border-slate-300': 'border-border',
  'border-slate-400': 'border-border',
  'border-slate-500': 'border-border',
  'border-slate-800': 'border-border',
  'border-slate-900': 'border-border',
  'ring-slate-200': 'ring-border',
  'ring-slate-300': 'ring-border',
  'ring-slate-500': 'ring-primary',
  'ring-slate-900': 'ring-primary',
  'focus:border-slate-500': 'focus:border-primary',
  'focus:ring-slate-500': 'focus:ring-primary',
};

let filesModified = 0;

walkDir(directoryPath, function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    Object.keys(colorMap).forEach(key => {
      const regex = new RegExp(`\\b${key}(?:/\\d+)?\\b`, 'g'); // match e.g. bg-slate-50 or bg-slate-200/50
      content = content.replace(regex, colorMap[key]);
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      filesModified++;
      console.log('Updated:', filePath);
    }
  }
});

console.log(`Finished. Modified ${filesModified} files.`);
