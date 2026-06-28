-- Data Audit Script - Read-only, Run before and after migration
-- Dùng để kiểm tra vi phạm dữ liệu

-- 1. Asset AVAILABLE but roomId is NOT null
SELECT 'CHECK 1: AVAILABLE assets with non-null roomId' AS check_name;
SELECT id, "assetCode", status, "roomId" FROM assets 
WHERE status = 'AVAILABLE' AND "roomId" IS NOT NULL;

-- 2. Asset IN_USE but roomId is null
SELECT 'CHECK 2: IN_USE assets with null roomId' AS check_name;
SELECT id, "assetCode", status, "roomId" FROM assets 
WHERE status = 'IN_USE' AND "roomId" IS NULL;

-- 3. Asset LIQUIDATED but roomId is NOT null
SELECT 'CHECK 3: LIQUIDATED assets with non-null roomId' AS check_name;
SELECT id, "assetCode", status, "roomId" FROM assets 
WHERE status = 'LIQUIDATED' AND "roomId" IS NOT NULL;

-- 4. Asset PENDING_LIQUIDATION but roomId is NOT null (should still be in room)
SELECT 'CHECK 4: PENDING_LIQUIDATION assets with null roomId' AS check_name;
SELECT id, "assetCode", status, "roomId" FROM assets 
WHERE status = 'PENDING_LIQUIDATION' AND "roomId" IS NULL;

-- 5. Asset in multiple active liquidation records
SELECT 'CHECK 5: Assets in multiple active liquidation records' AS check_name;
SELECT li."assetId", a."assetCode", COUNT(DISTINCT li."liquidationRecordId") as active_liquidations
FROM liquidation_items li
JOIN liquidation_records lr ON li."liquidationRecordId" = lr.id
JOIN assets a ON li."assetId" = a.id
WHERE lr.status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED')
GROUP BY li."assetId", a."assetCode"
HAVING COUNT(DISTINCT li."liquidationRecordId") > 1;

-- 6. Same asset appears multiple times in the same receipt
SELECT 'CHECK 6: Duplicate assets in same receipt' AS check_name;
SELECT "receiptId", "assetId", COUNT(*) as cnt
FROM asset_receipt_items
GROUP BY "receiptId", "assetId"
HAVING COUNT(*) > 1;

-- 7. Same asset appears multiple times in the same inventory check
SELECT 'CHECK 7: Duplicate assets in same inventory check' AS check_name;
SELECT "inventoryCheckId", "assetId", COUNT(*) as cnt
FROM inventory_check_items
GROUP BY "inventoryCheckId", "assetId"
HAVING COUNT(*) > 1;

-- 8. Same asset appears multiple times in the same liquidation
SELECT 'CHECK 8: Duplicate assets in same liquidation' AS check_name;
SELECT "liquidationRecordId", "assetId", COUNT(*) as cnt
FROM liquidation_items
GROUP BY "liquidationRecordId", "assetId"
HAVING COUNT(*) > 1;

-- 9. Rooms with capacity <= 0
SELECT 'CHECK 9: Rooms with invalid capacity' AS check_name;
SELECT id, "roomCode", capacity FROM rooms 
WHERE capacity IS NOT NULL AND capacity <= 0;

-- 10. Rooms where occupancy exceeds capacity
SELECT 'CHECK 10: Occupancy exceeds capacity' AS check_name;
SELECT r.id, r."roomCode", r.capacity, COUNT(rsa.id) as actual_occupancy
FROM rooms r
LEFT JOIN room_student_assignments rsa ON r.id = rsa."roomId" AND rsa."isActive" = true
WHERE r.capacity IS NOT NULL
GROUP BY r.id, r."roomCode", r.capacity
HAVING COUNT(rsa.id) > r.capacity;

-- 11. Duplicate floor numbers in same building
SELECT 'CHECK 11: Duplicate floors in building' AS check_name;
SELECT "buildingId", "floorNumber", COUNT(*) as cnt
FROM floors
GROUP BY "buildingId", "floorNumber"
HAVING COUNT(*) > 1;

-- 12. Inventory items with negative quantities
SELECT 'CHECK 12: Negative inventory quantities' AS check_name;
SELECT id, "inventoryCheckId", "assetId", "actualQuantity" 
FROM inventory_check_items WHERE "actualQuantity" < 0;

-- 13. Inventory items with negative system quantities
SELECT 'CHECK 13: Negative system quantities' AS check_name;
SELECT id, "inventoryCheckId", "assetId", "systemQuantity" 
FROM inventory_check_items WHERE "systemQuantity" < 0;

-- 14. Students with multiple active room assignments
SELECT 'CHECK 14: Students with multiple active assignments' AS check_name;
SELECT "studentId", COUNT(*) as active_assignments
FROM room_student_assignments
WHERE "isActive" = true
GROUP BY "studentId"
HAVING COUNT(*) > 1;

-- Summary
SELECT 'AUDIT COMPLETE' AS status;
