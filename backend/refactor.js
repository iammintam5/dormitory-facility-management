const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir(path.join(__dirname, 'src'), function(filePath) {
  if (filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = content.replace(/DormBlock/g, 'DormBuilding');
    content = content.replace(/dormBlock/g, 'dormBuilding');
    content = content.replace(/DamageStatus/g, 'DamageReportStatus');
    content = content.replace(/blockId/g, 'buildingId');
    content = content.replace(/\bblock\b/g, 'building');
    content = content.replace(/HandoverStatus/g, 'ApprovalStatus');
    content = content.replace(/InventoryCheckStatus/g, 'ApprovalStatus');
    content = content.replace(/LiquidationStatus/g, 'ApprovalStatus');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
