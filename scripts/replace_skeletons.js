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
  'frontend/src/pages/student/StudentRoomAssetsPage.tsx',
  'frontend/src/pages/student/StudentRoomPage.tsx'
];

let updatedCount = 0;

for (const relPath of files) {
  const f = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(f)) continue;
  let content = fs.readFileSync(f, 'utf8');

  // Extract PageHeader
  const headerMatch = content.match(/<PageHeader[\s\S]*?\/>/);
  if (!headerMatch) {
    console.log('No PageHeader found in', relPath);
    continue;
  }
  
  // Clean up actions from header for the skeleton view (we don't want buttons in the skeleton usually, or we can keep it)
  // Let's just use the original header but without actions to avoid errors if actions depend on state.
  let headerText = headerMatch[0];
  headerText = headerText.replace(/actions=\{[\s\S]*?\}/, '');

  // Extract grid cols for StatCard
  let gridMatch = content.match(/<div className="grid[^"]*grid-cols[^"]*">/);
  let gridCols = 4;
  if (gridMatch) {
    const cls = gridMatch[0];
    if (cls.includes('cols-5')) gridCols = 5;
    else if (cls.includes('cols-3')) gridCols = 3;
    else if (cls.includes('cols-2')) gridCols = 2;
  }

  // Find if (isLoading) block
  const loadingRegex = /if \((isLoading|isFetching)\) \{[\s\S]*?return \([\s\S]*?<div[\s\S]*?<Spinner[\s\S]*?<\/div>[\s\S]*?\);[\s\S]*?\}/;
  
  if (loadingRegex.test(content)) {
    const skeletonBlock = `if ($1) {
    return (
      <div className="space-y-6 mx-auto max-w-7xl pb-10">
        ${headerText}
        <div className="grid grid-cols-1 md:grid-cols-${gridCols} gap-4">
          {Array.from({ length: ${gridCols} }).map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
        <Card className="border-border/50">
          <div className="p-5">
            <SkeletonTable rows={10} cols={8} />
          </div>
        </Card>
      </div>
    );
  }`;
    
    content = content.replace(loadingRegex, skeletonBlock);
    
    // Add imports if missing
    if (!content.includes('SkeletonTable')) {
      const parts = content.split('\n');
      const importIdx = parts.findIndex(l => l.includes('import ') && (l.includes('components/ui/PageHeader') || l.includes('components/ui/Pagination') || l.includes('components/ui/Table')));
      if (importIdx !== -1) {
        parts.splice(importIdx, 0, "import { SkeletonTable, SkeletonStatCard } from '../../components/ui/Skeleton';");
      } else {
        parts.splice(5, 0, "import { SkeletonTable, SkeletonStatCard } from '../../components/ui/Skeleton';");
      }
      content = parts.join('\n');
    }

    fs.writeFileSync(f, content);
    console.log('Updated', relPath);
    updatedCount++;
  } else {
    // maybe it has `isFetching` inside return?
    console.log('No isLoading block found in', relPath);
  }
}

console.log('Total files updated:', updatedCount);
