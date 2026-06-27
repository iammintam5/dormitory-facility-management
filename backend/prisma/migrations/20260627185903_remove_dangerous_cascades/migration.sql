-- DropForeignKey
ALTER TABLE "asset_histories" DROP CONSTRAINT "asset_histories_assetId_fkey";

-- DropForeignKey
ALTER TABLE "asset_receipt_items" DROP CONSTRAINT "asset_receipt_items_receiptId_fkey";

-- DropForeignKey
ALTER TABLE "damage_report_logs" DROP CONSTRAINT "damage_report_logs_damageReportId_fkey";

-- DropForeignKey
ALTER TABLE "floors" DROP CONSTRAINT "floors_buildingId_fkey";

-- DropForeignKey
ALTER TABLE "inventory_check_items" DROP CONSTRAINT "inventory_check_items_inventoryCheckId_fkey";

-- DropForeignKey
ALTER TABLE "liquidation_items" DROP CONSTRAINT "liquidation_items_liquidationRecordId_fkey";

-- DropForeignKey
ALTER TABLE "room_student_assignments" DROP CONSTRAINT "room_student_assignments_roomId_fkey";

-- DropForeignKey
ALTER TABLE "room_student_assignments" DROP CONSTRAINT "room_student_assignments_studentId_fkey";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_floorId_fkey";

-- AddForeignKey
ALTER TABLE "floors" ADD CONSTRAINT "floors_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "dorm_buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "floors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_student_assignments" ADD CONSTRAINT "room_student_assignments_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_student_assignments" ADD CONSTRAINT "room_student_assignments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_histories" ADD CONSTRAINT "asset_histories_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_report_logs" ADD CONSTRAINT "damage_report_logs_damageReportId_fkey" FOREIGN KEY ("damageReportId") REFERENCES "damage_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_check_items" ADD CONSTRAINT "inventory_check_items_inventoryCheckId_fkey" FOREIGN KEY ("inventoryCheckId") REFERENCES "inventory_checks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidation_items" ADD CONSTRAINT "liquidation_items_liquidationRecordId_fkey" FOREIGN KEY ("liquidationRecordId") REFERENCES "liquidation_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_receipt_items" ADD CONSTRAINT "asset_receipt_items_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "asset_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
