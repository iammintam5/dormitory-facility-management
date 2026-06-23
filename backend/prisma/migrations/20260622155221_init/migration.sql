-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'LOCKED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'UNDER_MAINTENANCE', 'DAMAGED', 'PENDING_LIQUIDATION', 'LIQUIDATED');

-- CreateEnum
CREATE TYPE "DamageReportStatus" AS ENUM ('SUBMITTED', 'REVIEWING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DamageReportPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "InventoryCheckStatus" AS ENUM ('DRAFT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "LiquidationStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('SCHEDULED', 'AD_HOC', 'AFTER_INVENTORY');

-- CreateEnum
CREATE TYPE "MaintenanceResultStatus" AS ENUM ('GOOD', 'NEED_MONITORING', 'NEED_REPAIR', 'RECOMMEND_LIQUIDATION');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ');

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "userCode" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "studentCode" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roleId" INTEGER NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" SERIAL NOT NULL,
    "avatarUrl" TEXT,
    "gender" TEXT,
    "dateOfBirth" TEXT,
    "address" TEXT,
    "faculty" TEXT,
    "className" TEXT,
    "emergencyName" TEXT,
    "emergencyPhone" TEXT,
    "notes" TEXT,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dorm_buildings" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dorm_buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floors" (
    "id" SERIAL NOT NULL,
    "floorNumber" INTEGER NOT NULL,
    "name" TEXT,
    "buildingId" INTEGER NOT NULL,

    CONSTRAINT "floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" SERIAL NOT NULL,
    "roomCode" TEXT NOT NULL,
    "capacity" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "floorId" INTEGER NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_student_assignments" (
    "id" SERIAL NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "roomId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,

    CONSTRAINT "room_student_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_categories" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maintenanceCycleMonths" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" SERIAL NOT NULL,
    "assetCode" TEXT NOT NULL,
    "assetName" TEXT NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "yearInUse" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "roomId" INTEGER,
    "checkedByUserId" INTEGER,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_histories" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "oldStatus" "AssetStatus",
    "newStatus" "AssetStatus",
    "oldRoomId" INTEGER,
    "newRoomId" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assetId" INTEGER NOT NULL,

    CONSTRAINT "asset_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "damage_reports" (
    "id" SERIAL NOT NULL,
    "reportCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "priority" "DamageReportPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "DamageReportStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reporterId" INTEGER NOT NULL,
    "assetId" INTEGER NOT NULL,
    "roomId" INTEGER NOT NULL,

    CONSTRAINT "damage_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "damage_report_logs" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "oldStatus" "DamageReportStatus",
    "newStatus" "DamageReportStatus",
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "damageReportId" INTEGER NOT NULL,
    "createdByUserId" INTEGER NOT NULL,

    CONSTRAINT "damage_report_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_plans" (
    "id" SERIAL NOT NULL,
    "cycleMonths" INTEGER NOT NULL,
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assetId" INTEGER NOT NULL,
    "createdBy" INTEGER NOT NULL,

    CONSTRAINT "maintenance_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_records" (
    "id" SERIAL NOT NULL,
    "maintenanceCode" TEXT NOT NULL,
    "maintenanceDate" TIMESTAMP(3) NOT NULL,
    "maintenanceType" "MaintenanceType" NOT NULL,
    "content" TEXT NOT NULL,
    "resultStatus" "MaintenanceResultStatus" NOT NULL,
    "nextMaintenanceDate" TIMESTAMP(3),
    "cost" DECIMAL(12,2),
    "materialNote" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planId" INTEGER,
    "assetId" INTEGER NOT NULL,
    "performedBy" INTEGER NOT NULL,

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_checks" (
    "id" SERIAL NOT NULL,
    "inventoryCode" TEXT NOT NULL,
    "checkDate" TIMESTAMP(3) NOT NULL,
    "status" "InventoryCheckStatus" NOT NULL DEFAULT 'DRAFT',
    "generalNote" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roomId" INTEGER,
    "checkedBy" INTEGER NOT NULL,

    CONSTRAINT "inventory_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_check_items" (
    "id" SERIAL NOT NULL,
    "systemQuantity" INTEGER NOT NULL DEFAULT 1,
    "actualQuantity" INTEGER NOT NULL DEFAULT 1,
    "difference" INTEGER NOT NULL DEFAULT 0,
    "actualCondition" TEXT,
    "note" TEXT,
    "inventoryCheckId" INTEGER NOT NULL,
    "assetId" INTEGER NOT NULL,

    CONSTRAINT "inventory_check_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidation_records" (
    "id" SERIAL NOT NULL,
    "liquidationCode" TEXT NOT NULL,
    "liquidationDate" TIMESTAMP(3) NOT NULL,
    "status" "LiquidationStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" INTEGER NOT NULL,

    CONSTRAINT "liquidation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidation_items" (
    "id" SERIAL NOT NULL,
    "assetCondition" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "estimatedRemainingValue" DECIMAL(12,2),
    "liquidationRecordId" INTEGER NOT NULL,
    "assetId" INTEGER NOT NULL,

    CONSTRAINT "liquidation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "council_members" (
    "id" SERIAL NOT NULL,
    "roleInCouncil" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "inventoryCheckId" INTEGER,
    "liquidationRecordId" INTEGER,

    CONSTRAINT "council_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "relatedTable" TEXT,
    "relatedId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "userId" INTEGER NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" INTEGER,
    "oldValue" TEXT,
    "newValue" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "normalized_searches" (
    "id" SERIAL NOT NULL,
    "search" TEXT,
    "assetId" INTEGER NOT NULL,

    CONSTRAINT "normalized_searches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_userCode_key" ON "users"("userCode");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "dorm_buildings_code_key" ON "dorm_buildings"("code");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_roomCode_key" ON "rooms"("roomCode");

-- CreateIndex
CREATE UNIQUE INDEX "asset_categories_code_key" ON "asset_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "assets_assetCode_key" ON "assets"("assetCode");

-- CreateIndex
CREATE UNIQUE INDEX "damage_reports_reportCode_key" ON "damage_reports"("reportCode");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_records_maintenanceCode_key" ON "maintenance_records"("maintenanceCode");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_checks_inventoryCode_key" ON "inventory_checks"("inventoryCode");

-- CreateIndex
CREATE UNIQUE INDEX "liquidation_records_liquidationCode_key" ON "liquidation_records"("liquidationCode");

-- CreateIndex
CREATE UNIQUE INDEX "normalized_searches_assetId_key" ON "normalized_searches"("assetId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floors" ADD CONSTRAINT "floors_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "dorm_buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "floors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_student_assignments" ADD CONSTRAINT "room_student_assignments_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_student_assignments" ADD CONSTRAINT "room_student_assignments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "asset_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_checkedByUserId_fkey" FOREIGN KEY ("checkedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_histories" ADD CONSTRAINT "asset_histories_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_reports" ADD CONSTRAINT "damage_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_reports" ADD CONSTRAINT "damage_reports_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_reports" ADD CONSTRAINT "damage_reports_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_report_logs" ADD CONSTRAINT "damage_report_logs_damageReportId_fkey" FOREIGN KEY ("damageReportId") REFERENCES "damage_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_report_logs" ADD CONSTRAINT "damage_report_logs_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_planId_fkey" FOREIGN KEY ("planId") REFERENCES "maintenance_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_checks" ADD CONSTRAINT "inventory_checks_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_checks" ADD CONSTRAINT "inventory_checks_checkedBy_fkey" FOREIGN KEY ("checkedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_check_items" ADD CONSTRAINT "inventory_check_items_inventoryCheckId_fkey" FOREIGN KEY ("inventoryCheckId") REFERENCES "inventory_checks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_check_items" ADD CONSTRAINT "inventory_check_items_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidation_records" ADD CONSTRAINT "liquidation_records_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidation_items" ADD CONSTRAINT "liquidation_items_liquidationRecordId_fkey" FOREIGN KEY ("liquidationRecordId") REFERENCES "liquidation_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidation_items" ADD CONSTRAINT "liquidation_items_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "council_members" ADD CONSTRAINT "council_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "council_members" ADD CONSTRAINT "council_members_inventoryCheckId_fkey" FOREIGN KEY ("inventoryCheckId") REFERENCES "inventory_checks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "council_members" ADD CONSTRAINT "council_members_liquidationRecordId_fkey" FOREIGN KEY ("liquidationRecordId") REFERENCES "liquidation_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "normalized_searches" ADD CONSTRAINT "normalized_searches_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
