-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'locked');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('available', 'in_use', 'under_maintenance', 'damaged', 'pending_liquidation', 'liquidated');

-- CreateEnum
CREATE TYPE "HandoverStatus" AS ENUM ('active', 'returned', 'cancelled');

-- CreateEnum
CREATE TYPE "DamagePriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "DamageStatus" AS ENUM ('pending', 'received', 'processing', 'completed', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('scheduled', 'ad_hoc', 'after_inventory');

-- CreateEnum
CREATE TYPE "MaintenanceResultStatus" AS ENUM ('good', 'need_monitoring', 'need_repair', 'recommend_liquidation');

-- CreateEnum
CREATE TYPE "LiquidationStatus" AS ENUM ('recorded', 'cancelled');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('unread', 'read');

-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('success', 'failed');

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "user_code" VARCHAR(50) NOT NULL,
    "email" VARCHAR(150),
    "phone" VARCHAR(20),
    "password_hash" VARCHAR(255) NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dorm_blocks" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "dorm_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floors" (
    "id" SERIAL NOT NULL,
    "block_id" INTEGER NOT NULL,
    "floor_number" INTEGER NOT NULL,
    "name" VARCHAR(100),

    CONSTRAINT "floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" SERIAL NOT NULL,
    "floor_id" INTEGER NOT NULL,
    "room_code" VARCHAR(50) NOT NULL,
    "capacity" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_students" (
    "id" SERIAL NOT NULL,
    "room_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "room_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_categories" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "maintenance_cycle_months" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "room_id" INTEGER,
    "asset_code" VARCHAR(50) NOT NULL,
    "asset_name" VARCHAR(150) NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'available',
    "year_in_use" INTEGER,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handovers" (
    "id" SERIAL NOT NULL,
    "handover_code" VARCHAR(50) NOT NULL,
    "room_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "handover_date" DATE NOT NULL,
    "status" "HandoverStatus" NOT NULL DEFAULT 'active',
    "returned_at" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "handovers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handover_items" (
    "id" SERIAL NOT NULL,
    "handover_id" INTEGER NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "condition_at_handover" VARCHAR(255) NOT NULL,
    "condition_at_return" VARCHAR(255),
    "note" TEXT,

    CONSTRAINT "handover_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_checks" (
    "id" SERIAL NOT NULL,
    "inventory_code" VARCHAR(50) NOT NULL,
    "room_id" INTEGER,
    "checked_by" INTEGER NOT NULL,
    "check_date" DATE NOT NULL,
    "general_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "inventory_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_check_items" (
    "id" SERIAL NOT NULL,
    "inventory_check_id" INTEGER NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "system_quantity" INTEGER NOT NULL DEFAULT 1,
    "actual_quantity" INTEGER NOT NULL DEFAULT 1,
    "difference" INTEGER NOT NULL DEFAULT 0,
    "actual_condition" VARCHAR(255),
    "note" TEXT,

    CONSTRAINT "inventory_check_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "damage_reports" (
    "id" SERIAL NOT NULL,
    "report_code" VARCHAR(50) NOT NULL,
    "reporter_id" INTEGER NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "room_id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "DamagePriority" NOT NULL DEFAULT 'medium',
    "status" "DamageStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "damage_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "damage_report_logs" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "old_status" "DamageStatus",
    "new_status" "DamageStatus",
    "note" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "damage_report_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidation_records" (
    "id" SERIAL NOT NULL,
    "liquidation_code" VARCHAR(50) NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "liquidation_date" DATE NOT NULL,
    "asset_condition" VARCHAR(255) NOT NULL,
    "reason" TEXT NOT NULL,
    "estimated_remaining_value" DECIMAL(12,2),
    "status" "LiquidationStatus" NOT NULL DEFAULT 'recorded',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "liquidation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_plans" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "cycle_months" INTEGER NOT NULL,
    "next_due_date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "maintenance_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_records" (
    "id" SERIAL NOT NULL,
    "maintenance_code" VARCHAR(50) NOT NULL,
    "plan_id" INTEGER,
    "asset_id" INTEGER NOT NULL,
    "performed_by" INTEGER NOT NULL,
    "maintenance_date" DATE NOT NULL,
    "maintenance_type" "MaintenanceType" NOT NULL,
    "content" TEXT NOT NULL,
    "result_status" "MaintenanceResultStatus" NOT NULL,
    "next_maintenance_date" DATE,
    "cost" DECIMAL(12,2),
    "material_note" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'unread',
    "related_table" VARCHAR(100),
    "related_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "action" VARCHAR(100) NOT NULL,
    "table_name" VARCHAR(100) NOT NULL,
    "record_id" INTEGER,
    "old_value" TEXT,
    "new_value" TEXT,
    "ip_address" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_records" (
    "id" SERIAL NOT NULL,
    "backup_code" VARCHAR(50) NOT NULL,
    "created_by" INTEGER,
    "backup_file_path" VARCHAR(255) NOT NULL,
    "status" "BackupStatus" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backup_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_user_code_key" ON "users"("user_code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "dorm_blocks_code_key" ON "dorm_blocks"("code");

-- CreateIndex
CREATE UNIQUE INDEX "floors_block_id_floor_number_key" ON "floors"("block_id", "floor_number");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_floor_id_room_code_key" ON "rooms"("floor_id", "room_code");

-- CreateIndex
CREATE UNIQUE INDEX "room_students_room_id_student_id_start_date_key" ON "room_students"("room_id", "student_id", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "asset_categories_code_key" ON "asset_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "assets_asset_code_key" ON "assets"("asset_code");

-- CreateIndex
CREATE INDEX "assets_category_id_idx" ON "assets"("category_id");

-- CreateIndex
CREATE INDEX "assets_room_id_idx" ON "assets"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "handovers_handover_code_key" ON "handovers"("handover_code");

-- CreateIndex
CREATE INDEX "handovers_room_id_idx" ON "handovers"("room_id");

-- CreateIndex
CREATE INDEX "handovers_student_id_idx" ON "handovers"("student_id");

-- CreateIndex
CREATE INDEX "handovers_created_by_idx" ON "handovers"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "handover_items_handover_id_asset_id_key" ON "handover_items"("handover_id", "asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_checks_inventory_code_key" ON "inventory_checks"("inventory_code");

-- CreateIndex
CREATE INDEX "inventory_checks_room_id_idx" ON "inventory_checks"("room_id");

-- CreateIndex
CREATE INDEX "inventory_checks_checked_by_idx" ON "inventory_checks"("checked_by");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_check_items_inventory_check_id_asset_id_key" ON "inventory_check_items"("inventory_check_id", "asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "damage_reports_report_code_key" ON "damage_reports"("report_code");

-- CreateIndex
CREATE INDEX "damage_reports_reporter_id_idx" ON "damage_reports"("reporter_id");

-- CreateIndex
CREATE INDEX "damage_reports_asset_id_idx" ON "damage_reports"("asset_id");

-- CreateIndex
CREATE INDEX "damage_reports_room_id_idx" ON "damage_reports"("room_id");

-- CreateIndex
CREATE INDEX "damage_report_logs_report_id_idx" ON "damage_report_logs"("report_id");

-- CreateIndex
CREATE INDEX "damage_report_logs_created_by_idx" ON "damage_report_logs"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "liquidation_records_liquidation_code_key" ON "liquidation_records"("liquidation_code");

-- CreateIndex
CREATE INDEX "liquidation_records_asset_id_idx" ON "liquidation_records"("asset_id");

-- CreateIndex
CREATE INDEX "liquidation_records_created_by_idx" ON "liquidation_records"("created_by");

-- CreateIndex
CREATE INDEX "maintenance_plans_asset_id_is_active_idx" ON "maintenance_plans"("asset_id", "is_active");

-- CreateIndex
CREATE INDEX "maintenance_plans_created_by_idx" ON "maintenance_plans"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_records_maintenance_code_key" ON "maintenance_records"("maintenance_code");

-- CreateIndex
CREATE INDEX "maintenance_records_plan_id_idx" ON "maintenance_records"("plan_id");

-- CreateIndex
CREATE INDEX "maintenance_records_asset_id_idx" ON "maintenance_records"("asset_id");

-- CreateIndex
CREATE INDEX "maintenance_records_performed_by_idx" ON "maintenance_records"("performed_by");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "backup_records_backup_code_key" ON "backup_records"("backup_code");

-- CreateIndex
CREATE INDEX "backup_records_created_by_idx" ON "backup_records"("created_by");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floors" ADD CONSTRAINT "floors_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "dorm_blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "floors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_students" ADD CONSTRAINT "room_students_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_students" ADD CONSTRAINT "room_students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "asset_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_items" ADD CONSTRAINT "handover_items_handover_id_fkey" FOREIGN KEY ("handover_id") REFERENCES "handovers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_items" ADD CONSTRAINT "handover_items_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_checks" ADD CONSTRAINT "inventory_checks_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_checks" ADD CONSTRAINT "inventory_checks_checked_by_fkey" FOREIGN KEY ("checked_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_check_items" ADD CONSTRAINT "inventory_check_items_inventory_check_id_fkey" FOREIGN KEY ("inventory_check_id") REFERENCES "inventory_checks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_check_items" ADD CONSTRAINT "inventory_check_items_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_reports" ADD CONSTRAINT "damage_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_reports" ADD CONSTRAINT "damage_reports_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_reports" ADD CONSTRAINT "damage_reports_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_report_logs" ADD CONSTRAINT "damage_report_logs_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "damage_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_report_logs" ADD CONSTRAINT "damage_report_logs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidation_records" ADD CONSTRAINT "liquidation_records_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidation_records" ADD CONSTRAINT "liquidation_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "maintenance_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_records" ADD CONSTRAINT "backup_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
