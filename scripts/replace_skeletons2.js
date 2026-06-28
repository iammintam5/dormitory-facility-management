const fs = require('fs');
const path = require('path');

const files = [
  'frontend/src/pages/admin/AssetCategoriesManagementPage.tsx',
  'frontend/src/pages/admin/AssetsManagementPage.tsx',
  'frontend/src/pages/admin/AuditLogsPage.tsx',
  'frontend/src/pages/admin/LocationsManagementPage.tsx',
  'frontend/src/pages/admin/RoomStudentsManagementPage.tsx',
  'frontend/src/pages/admin/UsersManagementPage.tsx',
  'frontend/src/pages/manager/MaintenanceRecordCreatePage.tsx'
];

let updatedCount = 0;

for (const relPath of files) {
  const f = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(f)) continue;
  let content = fs.readFileSync(f, 'utf8');

  // Match: {isFetching ? ( <div ...><Spinner... /></div> ) : (
  // OR {isLoading ? ...
  const regex = /\{(isFetching|isLoading)\s*\?\s*\([\s\S]*?<div[\s\S]*?<Spinner[\s\S]*?<\/div>\s*\)\s*:\s*\(/g;
  
  if (regex.test(content)) {
    content = content.replace(regex, `{$1 ? (
          <div className="px-5 py-4">
            <SkeletonTable rows={10} cols={6} />
          </div>
        ) : (`);
    
    // Add import if missing
    if (!content.includes('SkeletonTable')) {
      const parts = content.split('\n');
      const importIdx = parts.findIndex(l => l.includes('import ') && (l.includes('components/ui/PageHeader') || l.includes('components/ui/Pagination') || l.includes('components/ui/Table')));
      if (importIdx !== -1) {
        parts.splice(importIdx, 0, "import { SkeletonTable } from '../../components/ui/Skeleton';");
      } else {
        parts.splice(5, 0, "import { SkeletonTable } from '../../components/ui/Skeleton';");
      }
      content = parts.join('\n');
    }

    fs.writeFileSync(f, content);
    console.log('Updated', relPath);
    updatedCount++;
  } else {
    console.log('No match found in', relPath);
  }
}

console.log('Total files updated:', updatedCount);
