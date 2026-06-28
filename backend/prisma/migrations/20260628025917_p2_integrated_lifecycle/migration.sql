-- CreateEnum
CREATE TYPE "MaintenanceOrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DiscrepancyType" AS ENUM ('NONE', 'MISSING', 'WRONG_ROOM', 'DAMAGED', 'EXCESS', 'STATUS_MISMATCH', 'INFORMATION_MISMATCH');

-- CreateEnum
CREATE TYPE "DiscrepancyResolutionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DiscrepancyResolutionType" AS ENUM ('MAINTENANCE', 'LIQUIDATION', 'TRANSFER', 'INVESTIGATION');

-- CreateEnum
CREATE TYPE "LiquidationSourceType" AS ENUM ('MANUAL', 'MAINTENANCE', 'INVENTORY');

-- AlterTable
ALTER TABLE "asset_histories" ADD COLUMN     "sourceId" INTEGER,
ADD COLUMN     "sourceTable" TEXT;

-- AlterTable
ALTER TABLE "inventory_check_items" ADD COLUMN     "discrepancyType" "DiscrepancyType" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "resolutionReferenceId" INTEGER,
ADD COLUMN     "resolutionStatus" "DiscrepancyResolutionStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "resolutionType" "DiscrepancyResolutionType",
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedById" INTEGER;

-- AlterTable
ALTER TABLE "liquidation_records" ADD COLUMN     "sourceInventoryItemId" INTEGER,
ADD COLUMN     "sourceMaintenanceRecordId" INTEGER,
ADD COLUMN     "sourceType" "LiquidationSourceType" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "maintenance_records" ADD COLUMN     "damageReportId" INTEGER,
ADD COLUMN     "inventoryItemId" INTEGER,
ADD COLUMN     "previousAssetStatus" "AssetStatus",
ADD COLUMN     "previousRoomId" INTEGER,
ADD COLUMN     "status" "MaintenanceOrderStatus" NOT NULL DEFAULT 'IN_PROGRESS',
ALTER COLUMN "resultStatus" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_damageReportId_fkey" FOREIGN KEY ("damageReportId") REFERENCES "damage_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_check_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_check_items" ADD CONSTRAINT "inventory_check_items_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
