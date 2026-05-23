/*
  Warnings:

  - The `old_status` column on the `damage_report_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `new_status` column on the `damage_report_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `priority` on the `damage_reports` table. All the data in the column will be lost.
  - The `status` column on the `damage_reports` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `block_id` on the `floors` table. All the data in the column will be lost.
  - The `status` column on the `handovers` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `asset_condition` on the `liquidation_records` table. All the data in the column will be lost.
  - You are about to drop the column `asset_id` on the `liquidation_records` table. All the data in the column will be lost.
  - You are about to drop the column `estimated_remaining_value` on the `liquidation_records` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `liquidation_records` table. All the data in the column will be lost.
  - The `status` column on the `liquidation_records` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `dorm_blocks` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[building_id,floor_number]` on the table `floors` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[room_code]` on the table `rooms` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `building_id` to the `floors` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('draft', 'pending', 'approved', 'rejected', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "DamageReportStatus" AS ENUM ('submitted', 'reviewing', 'approved', 'rejected', 'in_progress', 'completed');

-- DropForeignKey
ALTER TABLE "floors" DROP CONSTRAINT "floors_block_id_fkey";

-- DropForeignKey
ALTER TABLE "liquidation_records" DROP CONSTRAINT "liquidation_records_asset_id_fkey";

-- DropIndex
DROP INDEX "floors_block_id_floor_number_key";

-- DropIndex
DROP INDEX "liquidation_records_asset_id_idx";

-- AlterTable
ALTER TABLE "damage_report_logs" DROP COLUMN "old_status",
ADD COLUMN     "old_status" "DamageReportStatus",
DROP COLUMN "new_status",
ADD COLUMN     "new_status" "DamageReportStatus";

-- AlterTable
ALTER TABLE "damage_reports" DROP COLUMN "priority",
DROP COLUMN "status",
ADD COLUMN     "status" "DamageReportStatus" NOT NULL DEFAULT 'submitted';

-- AlterTable
ALTER TABLE "floors" DROP COLUMN "block_id",
ADD COLUMN     "building_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "handovers" DROP COLUMN "status",
ADD COLUMN     "status" "ApprovalStatus" NOT NULL DEFAULT 'draft';

-- AlterTable
ALTER TABLE "inventory_checks" ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "status" "ApprovalStatus" NOT NULL DEFAULT 'draft';

-- AlterTable
ALTER TABLE "liquidation_records" DROP COLUMN "asset_condition",
DROP COLUMN "asset_id",
DROP COLUMN "estimated_remaining_value",
DROP COLUMN "reason",
DROP COLUMN "status",
ADD COLUMN     "status" "ApprovalStatus" NOT NULL DEFAULT 'draft';

-- DropTable
DROP TABLE "dorm_blocks";

-- DropEnum
DROP TYPE "DamagePriority";

-- DropEnum
DROP TYPE "DamageStatus";

-- DropEnum
DROP TYPE "HandoverStatus";

-- DropEnum
DROP TYPE "LiquidationStatus";

-- CreateTable
CREATE TABLE "dorm_buildings" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "dorm_buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_histories" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "old_status" "AssetStatus",
    "new_status" "AssetStatus",
    "old_room_id" INTEGER,
    "new_room_id" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_council_members" (
    "id" SERIAL NOT NULL,
    "inventory_check_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role_in_council" VARCHAR(100) NOT NULL,

    CONSTRAINT "inventory_council_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidation_items" (
    "id" SERIAL NOT NULL,
    "liquidation_record_id" INTEGER NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "asset_condition" VARCHAR(255) NOT NULL,
    "reason" TEXT NOT NULL,
    "estimated_remaining_value" DECIMAL(12,2),

    CONSTRAINT "liquidation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidation_council_members" (
    "id" SERIAL NOT NULL,
    "liquidation_record_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role_in_council" VARCHAR(100) NOT NULL,

    CONSTRAINT "liquidation_council_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dorm_buildings_code_key" ON "dorm_buildings"("code");

-- CreateIndex
CREATE INDEX "asset_histories_asset_id_idx" ON "asset_histories"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_council_members_inventory_check_id_user_id_key" ON "inventory_council_members"("inventory_check_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "liquidation_items_liquidation_record_id_asset_id_key" ON "liquidation_items"("liquidation_record_id", "asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "liquidation_council_members_liquidation_record_id_user_id_key" ON "liquidation_council_members"("liquidation_record_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "floors_building_id_floor_number_key" ON "floors"("building_id", "floor_number");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_room_code_key" ON "rooms"("room_code");

-- AddForeignKey
ALTER TABLE "floors" ADD CONSTRAINT "floors_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "dorm_buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_histories" ADD CONSTRAINT "asset_histories_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_council_members" ADD CONSTRAINT "inventory_council_members_inventory_check_id_fkey" FOREIGN KEY ("inventory_check_id") REFERENCES "inventory_checks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_council_members" ADD CONSTRAINT "inventory_council_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidation_items" ADD CONSTRAINT "liquidation_items_liquidation_record_id_fkey" FOREIGN KEY ("liquidation_record_id") REFERENCES "liquidation_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidation_items" ADD CONSTRAINT "liquidation_items_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidation_council_members" ADD CONSTRAINT "liquidation_council_members_liquidation_record_id_fkey" FOREIGN KEY ("liquidation_record_id") REFERENCES "liquidation_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidation_council_members" ADD CONSTRAINT "liquidation_council_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
