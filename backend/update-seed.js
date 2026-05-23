const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, 'prisma', 'seed.ts');
let content = fs.readFileSync(seedPath, 'utf8');

content = content.replace(/DormBlock/g, 'DormBuilding');
content = content.replace(/DamageStatus/g, 'DamageReportStatus');
content = content.replace(/blockId/g, 'buildingId');
content = content.replace(/blockA/g, 'buildingA');
content = content.replace(/HandoverStatus\./g, 'ApprovalStatus.');
content = content.replace(/InventoryCheckStatus\./g, 'ApprovalStatus.');
content = content.replace(/LiquidationStatus\./g, 'ApprovalStatus.');
content = content.replace(/HandoverStatus/g, 'ApprovalStatus');
content = content.replace(/InventoryCheckStatus/g, 'ApprovalStatus');
content = content.replace(/LiquidationStatus/g, 'ApprovalStatus');

// Fix unique constraint issue in upsert for floor
content = content.replace(/blockId_floorNumber/g, 'buildingId_floorNumber');

fs.writeFileSync(seedPath, content, 'utf8');
console.log('Seed updated.');
