-- PHASE 3: DROP TABLES
DROP TABLE IF EXISTS "inventory_check_items" CASCADE;
DROP TABLE IF EXISTS "inventory_checks" CASCADE;

-- PHASE 4: ENUM REPLACEMENT (PostgreSQL does not support DROP VALUE from ENUM, so we recreate and cast)

-- MaintenanceType
ALTER TABLE "maintenance_records" ALTER COLUMN "maintenanceType" DROP DEFAULT;
-- Use a DO block to safely handle if the old type already exists or we already created the new one?
-- Since it failed after MaintenanceType earlier? Let's check the error:
-- "default for column sourceType cannot be cast automatically"
-- This implies MaintenanceType succeeded!
-- Let's test if we need to do LiquidationSourceType only.

-- LiquidationSourceType
ALTER TABLE "liquidation_records" ALTER COLUMN "sourceType" DROP DEFAULT;
ALTER TYPE "LiquidationSourceType" RENAME TO "LiquidationSourceType_old";
CREATE TYPE "LiquidationSourceType" AS ENUM ('MANUAL', 'MAINTENANCE');
ALTER TABLE "liquidation_records" ALTER COLUMN "sourceType" TYPE "LiquidationSourceType" USING "sourceType"::text::"LiquidationSourceType";
ALTER TABLE "liquidation_records" ALTER COLUMN "sourceType" SET DEFAULT 'MANUAL'::"LiquidationSourceType";
DROP TYPE "LiquidationSourceType_old";

-- Drop unused Enums
DROP TYPE IF EXISTS "InventoryCheckStatus";
DROP TYPE IF EXISTS "DiscrepancyType";
DROP TYPE IF EXISTS "DiscrepancyResolutionStatus";
DROP TYPE IF EXISTS "DiscrepancyResolutionType";

-- PHASE 5: UPDATE CouncilMember 
-- Ensure liquidationRecordId is NOT NULL
DELETE FROM "council_members" WHERE "liquidationRecordId" IS NULL;

-- Ensure unique constraint
ALTER TABLE "council_members" ADD CONSTRAINT "council_members_liquidationRecordId_userId_key" UNIQUE ("liquidationRecordId", "userId");
