-- AlterTable
ALTER TABLE "asset_histories" ADD COLUMN     "performedById" INTEGER;

-- AlterTable
ALTER TABLE "inventory_check_items" ADD COLUMN     "isChecked" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "asset_histories" ADD CONSTRAINT "asset_histories_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- P1 FINAL HARDENING
-- Recreate constraints with FAIL-FAST (RAISE EXCEPTION)

-- 1. Check constraint: rooms.capacity > 0
DO $$
BEGIN
  ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_capacity_check;
  IF EXISTS (SELECT 1 FROM rooms WHERE capacity IS NOT NULL AND capacity <= 0) THEN
    RAISE EXCEPTION 'Constraint failed: Found rooms with invalid capacity (<= 0)';
  ELSE
    ALTER TABLE rooms ADD CONSTRAINT rooms_capacity_check CHECK (capacity IS NULL OR capacity > 0);
  END IF;
END $$;

-- 2. Unique constraint: (buildingId, floorNumber)
DO $$
BEGIN
  ALTER TABLE floors DROP CONSTRAINT IF EXISTS floors_building_floor_unique;
  IF EXISTS (
    SELECT 1 FROM floors 
    GROUP BY "buildingId", "floorNumber" 
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Constraint failed: Found duplicate floors (buildingId, floorNumber)';
  ELSE
    ALTER TABLE floors ADD CONSTRAINT floors_building_floor_unique UNIQUE ("buildingId", "floorNumber");
  END IF;
END $$;

-- 3. Unique constraint: (inventoryCheckId, assetId)
DO $$
BEGIN
  ALTER TABLE inventory_check_items DROP CONSTRAINT IF EXISTS inventory_check_items_unique;
  IF EXISTS (
    SELECT 1 FROM inventory_check_items 
    GROUP BY "inventoryCheckId", "assetId" 
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Constraint failed: Found duplicate inventory check items (inventoryCheckId, assetId)';
  ELSE
    ALTER TABLE inventory_check_items ADD CONSTRAINT inventory_check_items_unique UNIQUE ("inventoryCheckId", "assetId");
  END IF;
END $$;

-- 4. Unique constraint: (liquidationRecordId, assetId)
DO $$
BEGIN
  ALTER TABLE liquidation_items DROP CONSTRAINT IF EXISTS liquidation_items_unique;
  IF EXISTS (
    SELECT 1 FROM liquidation_items 
    GROUP BY "liquidationRecordId", "assetId" 
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Constraint failed: Found duplicate liquidation items (liquidationRecordId, assetId)';
  ELSE
    ALTER TABLE liquidation_items ADD CONSTRAINT liquidation_items_unique UNIQUE ("liquidationRecordId", "assetId");
  END IF;
END $$;

-- 5. Unique constraint: (receiptId, assetId)
DO $$
BEGIN
  ALTER TABLE asset_receipt_items DROP CONSTRAINT IF EXISTS asset_receipt_items_unique;
  IF EXISTS (
    SELECT 1 FROM asset_receipt_items 
    GROUP BY "receiptId", "assetId" 
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Constraint failed: Found duplicate receipt items (receiptId, assetId)';
  ELSE
    ALTER TABLE asset_receipt_items ADD CONSTRAINT asset_receipt_items_unique UNIQUE ("receiptId", "assetId");
  END IF;
END $$;

-- 6. Check constraint: actualQuantity >= 0
DO $$
BEGIN
  ALTER TABLE inventory_check_items DROP CONSTRAINT IF EXISTS inventory_items_quantity_check;
  IF EXISTS (SELECT 1 FROM inventory_check_items WHERE "actualQuantity" < 0) THEN
    RAISE EXCEPTION 'Constraint failed: Found negative actualQuantity';
  ELSE
    ALTER TABLE inventory_check_items ADD CONSTRAINT inventory_items_quantity_check CHECK ("actualQuantity" >= 0);
  END IF;
END $$;

-- 7. Check constraint: systemQuantity >= 0
DO $$
BEGIN
  ALTER TABLE inventory_check_items DROP CONSTRAINT IF EXISTS inventory_items_system_qty_check;
  IF EXISTS (SELECT 1 FROM inventory_check_items WHERE "systemQuantity" < 0) THEN
    RAISE EXCEPTION 'Constraint failed: Found negative systemQuantity';
  ELSE
    ALTER TABLE inventory_check_items ADD CONSTRAINT inventory_items_system_qty_check CHECK ("systemQuantity" >= 0);
  END IF;
END $$;

-- 8. Check constraint: asset status ↔ roomId integrity
DO $$
BEGIN
  ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_status_room_check;
  IF EXISTS (
    SELECT 1 FROM assets 
    WHERE (status IN ('AVAILABLE', 'LIQUIDATED') AND "roomId" IS NOT NULL)
       OR (status = 'IN_USE' AND "roomId" IS NULL)
  ) THEN
    RAISE EXCEPTION 'Constraint failed: Found assets violating status-room integrity';
  ELSE
    ALTER TABLE assets ADD CONSTRAINT assets_status_room_check 
    CHECK (
      (status IN ('AVAILABLE', 'LIQUIDATED') AND "roomId" IS NULL) OR 
      (status NOT IN ('AVAILABLE', 'LIQUIDATED') AND "roomId" IS NOT NULL) OR
      (status IN ('PENDING_LIQUIDATION', 'DAMAGED', 'UNDER_MAINTENANCE'))
    );
  END IF;
END $$;
