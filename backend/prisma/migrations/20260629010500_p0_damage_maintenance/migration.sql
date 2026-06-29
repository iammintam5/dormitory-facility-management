-- CreateEnum
CREATE TYPE "MaintenanceReturnMode" AS ENUM ('PREVIOUS_ROOM', 'WAREHOUSE');

-- AlterEnum
BEGIN;
CREATE TYPE "LiquidationSourceType_new" AS ENUM ('MANUAL', 'MAINTENANCE');
ALTER TABLE "public"."liquidation_records" ALTER COLUMN "sourceType" DROP DEFAULT;
ALTER TABLE "liquidation_records" ALTER COLUMN "sourceType" TYPE "LiquidationSourceType_new" USING ("sourceType"::text::"LiquidationSourceType_new");
ALTER TYPE "LiquidationSourceType" RENAME TO "LiquidationSourceType_old";
ALTER TYPE "LiquidationSourceType_new" RENAME TO "LiquidationSourceType";
DROP TYPE "public"."LiquidationSourceType_old";
ALTER TABLE "liquidation_records" ALTER COLUMN "sourceType" SET DEFAULT 'MANUAL';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "MaintenanceResultStatus_new" AS ENUM ('GOOD', 'RECOMMEND_LIQUIDATION');
ALTER TABLE "maintenance_records" ALTER COLUMN "resultStatus" TYPE "MaintenanceResultStatus_new" USING ("resultStatus"::text::"MaintenanceResultStatus_new");
ALTER TYPE "MaintenanceResultStatus" RENAME TO "MaintenanceResultStatus_old";
ALTER TYPE "MaintenanceResultStatus_new" RENAME TO "MaintenanceResultStatus";
DROP TYPE "public"."MaintenanceResultStatus_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "MaintenanceType_new" AS ENUM ('SCHEDULED', 'AD_HOC');
ALTER TABLE "maintenance_records" ALTER COLUMN "maintenanceType" TYPE "MaintenanceType_new" USING ("maintenanceType"::text::"MaintenanceType_new");
ALTER TYPE "MaintenanceType" RENAME TO "MaintenanceType_old";
ALTER TYPE "MaintenanceType_new" RENAME TO "MaintenanceType";
DROP TYPE "public"."MaintenanceType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "council_members" DROP CONSTRAINT IF EXISTS "council_members_inventoryCheckId_fkey";

-- DropForeignKey
ALTER TABLE "inventory_check_items" DROP CONSTRAINT IF EXISTS "inventory_check_items_assetId_fkey";

-- DropForeignKey
ALTER TABLE "inventory_check_items" DROP CONSTRAINT IF EXISTS "inventory_check_items_inventoryCheckId_fkey";

-- DropForeignKey
ALTER TABLE "inventory_check_items" DROP CONSTRAINT IF EXISTS "inventory_check_items_resolvedById_fkey";

-- DropForeignKey
ALTER TABLE "inventory_checks" DROP CONSTRAINT IF EXISTS "inventory_checks_checkedBy_fkey";

-- DropForeignKey
ALTER TABLE "inventory_checks" DROP CONSTRAINT IF EXISTS "inventory_checks_roomId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_records" DROP CONSTRAINT IF EXISTS "maintenance_records_inventoryItemId_fkey";

-- AlterTable
ALTER TABLE "council_members" DROP COLUMN IF EXISTS "inventoryCheckId",
ALTER COLUMN "liquidationRecordId" SET NOT NULL;

-- AlterTable
ALTER TABLE "damage_reports" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" INTEGER,
ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledById" INTEGER,
ADD COLUMN     "rejectReason" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedById" INTEGER,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" INTEGER;

-- AlterTable
ALTER TABLE "liquidation_records" DROP COLUMN IF EXISTS "sourceInventoryItemId";

-- AlterTable
ALTER TABLE "maintenance_records" DROP COLUMN IF EXISTS "inventoryItemId",
ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledById" INTEGER,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "completedById" INTEGER,
ADD COLUMN     "returnMode" "MaintenanceReturnMode",
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "startedById" INTEGER,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- DropTable
DROP TABLE IF EXISTS "inventory_check_items";

-- DropTable
DROP TABLE IF EXISTS "inventory_checks";

-- CreateIndex
CREATE UNIQUE INDEX "council_members_liquidationRecordId_userId_key" ON "council_members"("liquidationRecordId", "userId");

-- Partial Unique Indexes for avoiding duplicates
CREATE UNIQUE INDEX idx_damage_reports_active_asset
ON damage_reports("assetId")
WHERE status IN ('SUBMITTED', 'REVIEWING', 'APPROVED', 'IN_PROGRESS');

CREATE UNIQUE INDEX idx_maintenance_records_active_asset
ON maintenance_records("assetId")
WHERE status IN ('PENDING', 'IN_PROGRESS');
