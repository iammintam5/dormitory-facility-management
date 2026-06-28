const fs = require('fs');
const path = require('path');

const files = [
  'frontend/src/pages/admin/AssetCategoriesManagementPage.tsx',
  'frontend/src/pages/admin/AssetsManagementPage.tsx',
  'frontend/src/pages/admin/AuditLogsPage.tsx',
  'frontend/src/pages/admin/LocationsManagementPage.tsx',
  'frontend/src/pages/admin/RoomsManagementPage.tsx',
  'frontend/src/pages/admin/RoomStudentsManagementPage.tsx',
  'frontend/src/pages/admin/UsersManagementPage.tsx',
  'frontend/src/pages/manager/MaintenanceRecordCreatePage.tsx',
  'frontend/src/pages/student/StudentDamageReportsHistoryPage.tsx',
  'frontend/src/pages/student/StudentRoomAssetsPage.tsx',
  'frontend/src/pages/student/StudentRoomPage.tsx'
];

const newDiv = `<div className="px-5 py-4">\n              <SkeletonTable rows={10} cols={6} />\n            </div>`;

let updated = 0;
for (const relPath of files) {
  const f = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(f)) continue;
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;

  // Regex to match the loading block for tables
  const regex = /<div[^>]*className="flex flex-col items-center justify-center[^>]*>[\s\S]*?<ArrowsClockwise[^>]*animate-spin[^>]*>[\s\S]*?(Đang tải|Đang tải dữ liệu\.\.\.)[^<]*<\/[spanp]+>[\s\S]*?<\/div>/g;
  
  if (regex.test(content)) {
    content = content.replace(regex, newDiv);
    changed = true;
  }

  if (changed) {
    if (!content.includes('SkeletonTable')) {
      const parts = content.split('\n');
      const importIdx = parts.findIndex(l => l.includes('import ') && (l.includes('components/ui/Pagination') || l.includes('components/ui/Table') || l.includes('components/ui/PageHeader')));
      if (importIdx !== -1) {
        parts.splice(importIdx, 0, "import { SkeletonTable } from '../../components/ui/Skeleton';");
      } else {
        parts.splice(5, 0, "import { SkeletonTable } from '../../components/ui/Skeleton';");
      }
      content = parts.join('\n');
    }
    fs.writeFileSync(f, content);
    console.log('Updated', relPath);
    updated++;
  }
}
console.log('Total files updated:', updated);
