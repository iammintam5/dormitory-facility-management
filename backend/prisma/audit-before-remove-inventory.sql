-- Audit trước khi xóa nghiệp vụ Kiểm kê (Inventory)

-- 1. Kiểm tra Lệnh bảo trì có nguồn từ kiểm kê
SELECT id, maintenance_code, status, maintenance_type, inventory_item_id, created_at 
FROM maintenance_records 
WHERE maintenance_type = 'AFTER_INVENTORY' OR inventory_item_id IS NOT NULL;

-- 2. Kiểm tra Hồ sơ thanh lý có nguồn từ kiểm kê
SELECT id, liquidation_code, status, source_type, source_inventory_item_id, created_at 
FROM liquidation_records 
WHERE source_type = 'INVENTORY' OR source_inventory_item_id IS NOT NULL;

-- 3. Kiểm tra Thành viên hội đồng chỉ thuộc về phiếu kiểm kê
SELECT id, council_role, user_id, inventory_check_id, liquidation_record_id 
FROM council_members 
WHERE inventory_check_id IS NOT NULL AND liquidation_record_id IS NULL;

-- 4. Đếm số lượng phiếu kiểm kê và chi tiết sai lệch
SELECT 
    (SELECT COUNT(*) FROM inventory_checks) as total_inventory_checks,
    (SELECT COUNT(*) FROM inventory_check_items) as total_inventory_check_items;
