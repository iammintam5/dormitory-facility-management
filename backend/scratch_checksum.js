const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const res = await prisma.$queryRaw`SELECT migration_name, checksum FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5`;
  console.log(res);
  await prisma.$disconnect();
}
main();
