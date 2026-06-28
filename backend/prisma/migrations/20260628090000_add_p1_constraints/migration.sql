-- P1 Database Constraints Migration
-- Add missing constraints for data integrity

-- 1. Check constraint: rooms.capacity > 0
-- First check for invalid data
DO $$
BEGIN
  -- Check for rooms with capacity <= 0 or null
  IF EXISTS (SELECT 1 FROM rooms WHERE capacity IS NOT NULL AND capacity <= 0) THEN
    RAISE NOTICE 'Found rooms with invalid capacity, skipping constraint';
  ELSE
    ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_capacity_check;
    ALTER TABLE rooms ADD CONSTRAINT rooms_capacity_check CHECK (capacity IS NULL OR capacity > 0);
  END IF;
END $$;

-- 2. Unique constraint: (buildingId, floorNumber)
-- First check for duplicates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM floors 
    GROUP BY "buildingId", "floorNumber" 
    HAVING COUNT(*) > 1
  ) THEN
    RAISE NOTICE 'Found duplicate floors, skipping unique constraint';
  ELSE
    ALTER TABLE floors DROP CONSTRAINT IF EXISTS floors_building_floor_unique;
    ALTER TABLE floors ADD CONSTRAINT floors_building_floor_unique UNIQUE ("buildingId", "floorNumber");
  END IF;
END $$;

-- 3. Unique constraint: (inventoryCheckId, assetId) for inventory_check_items
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM inventory_check_items 
    GROUP BY "inventoryCheckId", "assetId" 
    HAVING COUNT(*) > 1
  ) THEN
    RAISE NOTICE 'Found duplicate inventory items, skipping unique constraint';
  ELSE
    ALTER TABLE inventory_check_items DROP CONSTRAINT IF EXISTS inventory_check_items_unique;
    ALTER TABLE inventory_check_items ADD CONSTRAINT inventory_check_items_unique UNIQUE ("inventoryCheckId", "assetId");
  END IF;
END $$;

-- 4. Unique constraint: (liquidationRecordId, assetId) for liquidation_items
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM liquidation_items 
    GROUP BY "liquidationRecordId", "assetId" 
    HAVING COUNT(*) > 1
  ) THEN
    RAISE NOTICE 'Found duplicate liquidation items, skipping unique constraint';
  ELSE
    ALTER TABLE liquidation_items DROP CONSTRAINT IF EXISTS liquidation_items_unique;
    ALTER TABLE liquidation_items ADD CONSTRAINT liquidation_items_unique UNIQUE ("liquidationRecordId", "assetId");
  END IF;
END $$;

-- 5. Unique constraint: (receiptId, assetId) for asset_receipt_items
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM asset_receipt_items 
    GROUP BY "receiptId", "assetId" 
    HAVING COUNT(*) > 1
  ) THEN
    RAISE NOTICE 'Found duplicate receipt items, skipping unique constraint';
  ELSE
    ALTER TABLE asset_receipt_items DROP CONSTRAINT IF EXISTS asset_receipt_items_unique;
    ALTER TABLE asset_receipt_items ADD CONSTRAINT asset_receipt_items_unique UNIQUE ("receiptId", "assetId");
  END IF;
END $$;

-- 6. Check constraint: actualQuantity >= 0 for inventory_check_items
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM inventory_check_items WHERE "actualQuantity" < 0) THEN
    RAISE NOTICE 'Found negative actualQuantity, skipping constraint';
  ELSE
    ALTER TABLE inventory_check_items DROP CONSTRAINT IF EXISTS inventory_items_quantity_check;
    ALTER TABLE inventory_check_items ADD CONSTRAINT inventory_items_quantity_check CHECK ("actualQuantity" >= 0);
  END IF;
END $$;

-- 7. Check constraint: systemQuantity >= 0 for inventory_check_items
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM inventory_check_items WHERE "systemQuantity" < 0) THEN
    RAISE NOTICE 'Found negative systemQuantity, skipping constraint';
  ELSE
    ALTER TABLE inventory_check_items DROP CONSTRAINT IF EXISTS inventory_items_system_qty_check;
    ALTER TABLE inventory_check_items ADD CONSTRAINT inventory_items_system_qty_check CHECK ("systemQuantity" >= 0);
  END IF;
END $$;

-- 8. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_status_room_id ON assets (status, "roomId");
CREATE INDEX IF NOT EXISTS idx_asset_histories_asset_id ON asset_histories ("assetId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_liquidation_records_status ON liquidation_records (status);
CREATE INDEX IF NOT EXISTS idx_liquidation_items_asset_id ON liquidation_items ("assetId");
CREATE INDEX IF NOT EXISTS idx_inventory_check_items_asset ON inventory_check_items ("assetId");
CREATE INDEX IF NOT EXISTS idx_asset_receipt_items_asset ON asset_receipt_items ("assetId");
CREATE INDEX IF NOT EXISTS idx_damage_reports_asset_status ON damage_reports ("assetId", status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications ("userId", status);
