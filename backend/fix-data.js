const { PrismaClient } = require('@prisma/client');
async function main() {
  const prisma = new PrismaClient();
  
  // Find bad data
  const badAssets = await prisma.$queryRaw`
    SELECT id, status, "roomId" FROM assets 
    WHERE (status IN ('AVAILABLE', 'LIQUIDATED') AND "roomId" IS NOT NULL)
       OR (status = 'IN_USE' AND "roomId" IS NULL)
  `;
  console.log('Bad assets:', badAssets);

  // Fix them
  if (badAssets.length > 0) {
    console.log('Fixing bad assets...');
    // If AVAILABLE/LIQUIDATED but has room, set room to null
    await prisma.$executeRaw`
      UPDATE assets SET "roomId" = NULL 
      WHERE status IN ('AVAILABLE', 'LIQUIDATED') AND "roomId" IS NOT NULL
    `;
    
    // If IN_USE but no room, set status to AVAILABLE
    await prisma.$executeRaw`
      UPDATE assets SET status = 'AVAILABLE' 
      WHERE status = 'IN_USE' AND "roomId" IS NULL
    `;
    console.log('Fixed.');
  }

  await prisma.$disconnect();
}
main();
