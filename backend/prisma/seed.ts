import {
  AssetStatus,
  BackupStatus,
  DamageReportStatus,
  ApprovalStatus,
  MaintenanceResultStatus,
  MaintenanceType,
  NotificationStatus,
  PrismaClient,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function syncSequence(tableName: string, columnName = 'id') {
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"${tableName}"', '${columnName}'), COALESCE((SELECT MAX("${columnName}") FROM "${tableName}"), 0) + 1, false);`,
  );
}

async function main() {
  // Hash truoc de tat ca tai khoan seed deu tuong thich voi module auth.
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const managerPasswordHash = await bcrypt.hash('qlcsvc123', 10);
  const studentPasswordHash = await bcrypt.hash('student123', 10);

  const adminRole = await prisma.role.upsert({
    where: { code: 'ADMIN' },
    update: {
      name: 'Quan tri he thong',
      description: 'Toan quyen quan tri he thong',
    },
    create: {
      id: 1,
      code: 'ADMIN',
      name: 'Quan tri he thong',
      description: 'Toan quyen quan tri he thong',
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { code: 'QL_CSVC' },
    update: {
      name: 'Quan ly co so vat chat',
      description: 'Quan ly tai san va van hanh CSVC',
    },
    create: {
      id: 2,
      code: 'QL_CSVC',
      name: 'Quan ly co so vat chat',
      description: 'Quan ly tai san va van hanh CSVC',
    },
  });

  const studentRole = await prisma.role.upsert({
    where: { code: 'STUDENT' },
    update: {
      name: 'Sinh vien',
      description: 'Sinh vien noi tru',
    },
    create: {
      id: 3,
      code: 'STUDENT',
      name: 'Sinh vien',
      description: 'Sinh vien noi tru',
    },
  });

  const admin = await prisma.user.upsert({
    where: { userCode: 'ADMIN001' },
    update: {
      roleId: adminRole.id,
      fullName: 'Nguyen Quan Tri',
      email: 'admin@ktx.local',
      phone: '0900000001',
      passwordHash: adminPasswordHash,
      status: UserStatus.ACTIVE,
    },
    create: {
      id: 1,
      roleId: adminRole.id,
      fullName: 'Nguyen Quan Tri',
      userCode: 'ADMIN001',
      email: 'admin@ktx.local',
      phone: '0900000001',
      passwordHash: adminPasswordHash,
      status: UserStatus.ACTIVE,
    },
  });

  const facilityManager = await prisma.user.upsert({
    where: { userCode: 'QLCSVC001' },
    update: {
      roleId: managerRole.id,
      fullName: 'Tran Co So Vat Chat',
      email: 'qlcsvc@ktx.local',
      phone: '0900000002',
      passwordHash: managerPasswordHash,
      status: UserStatus.ACTIVE,
    },
    create: {
      id: 2,
      roleId: managerRole.id,
      fullName: 'Tran Co So Vat Chat',
      userCode: 'QLCSVC001',
      email: 'qlcsvc@ktx.local',
      phone: '0900000002',
      passwordHash: managerPasswordHash,
      status: UserStatus.ACTIVE,
    },
  });

  const studentA = await prisma.user.upsert({
    where: { userCode: 'SV001' },
    update: {
      roleId: studentRole.id,
      fullName: 'Le Minh An',
      email: 'sv001@ktx.local',
      phone: '0900000011',
      passwordHash: studentPasswordHash,
      status: UserStatus.ACTIVE,
    },
    create: {
      id: 3,
      roleId: studentRole.id,
      fullName: 'Le Minh An',
      userCode: 'SV001',
      email: 'sv001@ktx.local',
      phone: '0900000011',
      passwordHash: studentPasswordHash,
      status: UserStatus.ACTIVE,
    },
  });

  const studentB = await prisma.user.upsert({
    where: { userCode: 'SV002' },
    update: {
      roleId: studentRole.id,
      fullName: 'Pham Thu Binh',
      email: 'sv002@ktx.local',
      phone: '0900000012',
      passwordHash: studentPasswordHash,
      status: UserStatus.ACTIVE,
    },
    create: {
      id: 4,
      roleId: studentRole.id,
      fullName: 'Pham Thu Binh',
      userCode: 'SV002',
      email: 'sv002@ktx.local',
      phone: '0900000012',
      passwordHash: studentPasswordHash,
      status: UserStatus.ACTIVE,
    },
  });

  const studentC = await prisma.user.upsert({
    where: { userCode: 'SV003' },
    update: {
      roleId: studentRole.id,
      fullName: 'Do Gia Cuong',
      email: 'sv003@ktx.local',
      phone: '0900000013',
      passwordHash: studentPasswordHash,
      status: UserStatus.ACTIVE,
    },
    create: {
      id: 5,
      roleId: studentRole.id,
      fullName: 'Do Gia Cuong',
      userCode: 'SV003',
      email: 'sv003@ktx.local',
      phone: '0900000013',
      passwordHash: studentPasswordHash,
      status: UserStatus.ACTIVE,
    },
  });

  const buildingA = await prisma.dormBuilding.upsert({
    where: { code: 'A' },
    update: {
      name: 'Khu A',
    },
    create: {
      id: 1,
      code: 'A',
      name: 'Khu A',
    },
  });

  const floor1 = await prisma.floor.upsert({
    where: {
      buildingId_floorNumber: {
        buildingId: buildingA.id,
        floorNumber: 1,
      },
    },
    update: {
      name: 'Tang 1',
    },
    create: {
      id: 1,
      buildingId: buildingA.id,
      floorNumber: 1,
      name: 'Tang 1',
    },
  });

  const floor2 = await prisma.floor.upsert({
    where: {
      buildingId_floorNumber: {
        buildingId: buildingA.id,
        floorNumber: 2,
      },
    },
    update: {
      name: 'Tang 2',
    },
    create: {
      id: 2,
      buildingId: buildingA.id,
      floorNumber: 2,
      name: 'Tang 2',
    },
  });

  const roomA101 = await prisma.room.upsert({
    where: {
      unique_floor_room: {
        floorId: floor1.id,
        roomCode: 'A101',
      },
    },
    update: {
      capacity: 4,
      note: 'Phong 4 nguoi tang 1',
    },
    create: {
      id: 1,
      floorId: floor1.id,
      roomCode: 'A101',
      capacity: 4,
      note: 'Phong 4 nguoi tang 1',
    },
  });

  const roomA102 = await prisma.room.upsert({
    where: {
      unique_floor_room: {
        floorId: floor1.id,
        roomCode: 'A102',
      },
    },
    update: {
      capacity: 4,
      note: 'Phong 4 nguoi tang 1',
    },
    create: {
      id: 2,
      floorId: floor1.id,
      roomCode: 'A102',
      capacity: 4,
      note: 'Phong 4 nguoi tang 1',
    },
  });

  const roomA201 = await prisma.room.upsert({
    where: {
      unique_floor_room: {
        floorId: floor2.id,
        roomCode: 'A201',
      },
    },
    update: {
      capacity: 6,
      note: 'Phong 6 nguoi tang 2',
    },
    create: {
      id: 3,
      floorId: floor2.id,
      roomCode: 'A201',
      capacity: 6,
      note: 'Phong 6 nguoi tang 2',
    },
  });

  const roomA202 = await prisma.room.upsert({
    where: {
      unique_floor_room: {
        floorId: floor2.id,
        roomCode: 'A202',
      },
    },
    update: {
      capacity: 6,
      note: 'Phong 6 nguoi tang 2',
    },
    create: {
      id: 4,
      floorId: floor2.id,
      roomCode: 'A202',
      capacity: 6,
      note: 'Phong 6 nguoi tang 2',
    },
  });

  await prisma.roomStudent.upsert({
    where: {
      roomId_studentId_startDate: {
        roomId: roomA101.id,
        studentId: studentA.id,
        startDate: new Date('2026-01-10'),
      },
    },
    update: {
      endDate: null,
      isActive: true,
    },
    create: {
      id: 1,
      roomId: roomA101.id,
      studentId: studentA.id,
      startDate: new Date('2026-01-10'),
      isActive: true,
    },
  });

  await prisma.roomStudent.upsert({
    where: {
      roomId_studentId_startDate: {
        roomId: roomA101.id,
        studentId: studentB.id,
        startDate: new Date('2026-01-10'),
      },
    },
    update: {
      endDate: null,
      isActive: true,
    },
    create: {
      id: 2,
      roomId: roomA101.id,
      studentId: studentB.id,
      startDate: new Date('2026-01-10'),
      isActive: true,
    },
  });

  await prisma.roomStudent.upsert({
    where: {
      roomId_studentId_startDate: {
        roomId: roomA102.id,
        studentId: studentC.id,
        startDate: new Date('2026-01-12'),
      },
    },
    update: {
      endDate: null,
      isActive: true,
    },
    create: {
      id: 3,
      roomId: roomA102.id,
      studentId: studentC.id,
      startDate: new Date('2026-01-12'),
      isActive: true,
    },
  });

  const categoryBed = await prisma.assetCategory.upsert({
    where: { code: 'BED' },
    update: {
      name: 'Giuong',
      description: 'Giuong ky tuc xa',
      maintenanceCycleMonths: 24,
    },
    create: {
      id: 1,
      code: 'BED',
      name: 'Giuong',
      description: 'Giuong ky tuc xa',
      maintenanceCycleMonths: 24,
    },
  });

  const categoryDesk = await prisma.assetCategory.upsert({
    where: { code: 'DESK' },
    update: {
      name: 'Ban hoc',
      description: 'Ban hoc sinh vien',
      maintenanceCycleMonths: null,
    },
    create: {
      id: 2,
      code: 'DESK',
      name: 'Ban hoc',
      description: 'Ban hoc sinh vien',
      maintenanceCycleMonths: null,
    },
  });

  const categoryFan = await prisma.assetCategory.upsert({
    where: { code: 'FAN' },
    update: {
      name: 'Quat tran',
      description: 'Quat su dung trong phong',
      maintenanceCycleMonths: 6,
    },
    create: {
      id: 3,
      code: 'FAN',
      name: 'Quat tran',
      description: 'Quat su dung trong phong',
      maintenanceCycleMonths: 6,
    },
  });

  const assetBedA101 = await prisma.asset.upsert({
    where: { assetCode: 'AST-A101-BED-01' },
    update: {
      categoryId: categoryBed.id,
      roomId: roomA101.id,
      assetName: 'Giuong tang A101-01',
      status: AssetStatus.IN_USE,
      yearInUse: 2025,
      description: 'Bo giuong phong A101',
    },
    create: {
      id: 1,
      categoryId: categoryBed.id,
      roomId: roomA101.id,
      assetCode: 'AST-A101-BED-01',
      assetName: 'Giuong tang A101-01',
      status: AssetStatus.IN_USE,
      yearInUse: 2025,
      description: 'Bo giuong phong A101',
    },
  });

  const assetDeskA101 = await prisma.asset.upsert({
    where: { assetCode: 'AST-A101-DESK-01' },
    update: {
      categoryId: categoryDesk.id,
      roomId: roomA101.id,
      assetName: 'Ban hoc A101-01',
      status: AssetStatus.IN_USE,
      yearInUse: 2025,
      description: 'Ban hoc phong A101',
    },
    create: {
      id: 2,
      categoryId: categoryDesk.id,
      roomId: roomA101.id,
      assetCode: 'AST-A101-DESK-01',
      assetName: 'Ban hoc A101-01',
      status: AssetStatus.IN_USE,
      yearInUse: 2025,
      description: 'Ban hoc phong A101',
    },
  });

  const assetFanA102 = await prisma.asset.upsert({
    where: { assetCode: 'AST-A102-FAN-01' },
    update: {
      categoryId: categoryFan.id,
      roomId: roomA102.id,
      assetName: 'Quat tran A102',
      status: AssetStatus.UNDER_MAINTENANCE,
      yearInUse: 2025,
      description: 'Quat tran phong A102',
    },
    create: {
      id: 3,
      categoryId: categoryFan.id,
      roomId: roomA102.id,
      assetCode: 'AST-A102-FAN-01',
      assetName: 'Quat tran A102',
      status: AssetStatus.UNDER_MAINTENANCE,
      yearInUse: 2025,
      description: 'Quat tran phong A102',
    },
  });

  const assetBedA201 = await prisma.asset.upsert({
    where: { assetCode: 'AST-A201-BED-01' },
    update: {
      categoryId: categoryBed.id,
      roomId: roomA201.id,
      assetName: 'Giuong tang A201-01',
      status: AssetStatus.PENDING_LIQUIDATION,
      yearInUse: 2025,
      description: 'Bo giuong phong A201',
    },
    create: {
      id: 4,
      categoryId: categoryBed.id,
      roomId: roomA201.id,
      assetCode: 'AST-A201-BED-01',
      assetName: 'Giuong tang A201-01',
      status: AssetStatus.PENDING_LIQUIDATION,
      yearInUse: 2025,
      description: 'Bo giuong phong A201',
    },
  });

  const handoverA101 = await prisma.handover.upsert({
    where: { handoverCode: 'QL_BM1_0001' },
    update: {
      roomId: roomA101.id,
      studentId: studentA.id,
      createdBy: facilityManager.id,
      handoverDate: new Date('2026-01-10'),
      status: ApprovalStatus.APPROVED,
      returnedAt: null,
      note: 'Ban giao tai san ban dau',
    },
    create: {
      id: 1,
      handoverCode: 'QL_BM1_0001',
      roomId: roomA101.id,
      studentId: studentA.id,
      createdBy: facilityManager.id,
      handoverDate: new Date('2026-01-10'),
      status: ApprovalStatus.APPROVED,
      note: 'Ban giao tai san ban dau',
    },
  });

  await prisma.handoverItem.upsert({
    where: {
      handoverId_assetId: {
        handoverId: handoverA101.id,
        assetId: assetBedA101.id,
      },
    },
    update: {
      quantity: 1,
      conditionAtHandover: 'Tot',
      conditionAtReturn: null,
      note: 'Khong co bat thuong',
    },
    create: {
      id: 1,
      handoverId: handoverA101.id,
      assetId: assetBedA101.id,
      quantity: 1,
      conditionAtHandover: 'Tot',
      note: 'Khong co bat thuong',
    },
  });

  await prisma.handoverItem.upsert({
    where: {
      handoverId_assetId: {
        handoverId: handoverA101.id,
        assetId: assetDeskA101.id,
      },
    },
    update: {
      quantity: 1,
      conditionAtHandover: 'Tot',
      conditionAtReturn: null,
      note: 'Ban hoc su dung on dinh',
    },
    create: {
      id: 2,
      handoverId: handoverA101.id,
      assetId: assetDeskA101.id,
      quantity: 1,
      conditionAtHandover: 'Tot',
      note: 'Ban hoc su dung on dinh',
    },
  });

  const inventoryCheckA101 = await prisma.inventoryCheck.upsert({
    where: { inventoryCode: 'QL_BM3_0001' },
    update: {
      roomId: roomA101.id,
      checkedBy: facilityManager.id,
      checkDate: new Date('2026-05-01'),
      status: ApprovalStatus.COMPLETED,
      generalNote: 'Kiem ke dinh ky phong A101',
      completedAt: new Date('2026-05-01T10:00:00'),
    },
    create: {
      id: 1,
      inventoryCode: 'QL_BM3_0001',
      roomId: roomA101.id,
      checkedBy: facilityManager.id,
      checkDate: new Date('2026-05-01'),
      status: ApprovalStatus.COMPLETED,
      generalNote: 'Kiem ke dinh ky phong A101',
      completedAt: new Date('2026-05-01T10:00:00'),
    },
  });

  await prisma.inventoryCheckItem.upsert({
    where: {
      inventoryCheckId_assetId: {
        inventoryCheckId: inventoryCheckA101.id,
        assetId: assetBedA101.id,
      },
    },
    update: {
      systemQuantity: 1,
      actualQuantity: 1,
      difference: 0,
      actualCondition: 'Tot',
      note: 'Trung khop he thong',
    },
    create: {
      id: 1,
      inventoryCheckId: inventoryCheckA101.id,
      assetId: assetBedA101.id,
      systemQuantity: 1,
      actualQuantity: 1,
      difference: 0,
      actualCondition: 'Tot',
      note: 'Trung khop he thong',
    },
  });

  const damageReportA102 = await prisma.damageReport.upsert({
    where: { reportCode: 'QL_BM4_0001' },
    update: {
      reporterId: studentC.id,
      assetId: assetFanA102.id,
      roomId: roomA102.id,
      description: 'Quat tran rung manh va phat ra tieng on lon',
      status: DamageReportStatus.IN_PROGRESS,
    },
    create: {
      id: 1,
      reportCode: 'QL_BM4_0001',
      reporterId: studentC.id,
      assetId: assetFanA102.id,
      roomId: roomA102.id,
      description: 'Quat tran rung manh va phat ra tieng on lon',
      status: DamageReportStatus.IN_PROGRESS,
    },
  });

  await prisma.damageReportLog.upsert({
    where: { id: 1 },
    update: {
      reportId: damageReportA102.id,
      action: 'create',
      oldStatus: null,
      newStatus: DamageReportStatus.SUBMITTED,
      note: 'Sinh vien tao bao cao',
      createdBy: studentC.id,
    },
    create: {
      id: 1,
      reportId: damageReportA102.id,
      action: 'create',
      newStatus: DamageReportStatus.SUBMITTED,
      note: 'Sinh vien tao bao cao',
      createdBy: studentC.id,
    },
  });

  await prisma.damageReportLog.upsert({
    where: { id: 2 },
    update: {
      reportId: damageReportA102.id,
      action: 'processing',
      oldStatus: DamageReportStatus.SUBMITTED,
      newStatus: DamageReportStatus.IN_PROGRESS,
      note: 'Da tiep nhan va chuyen xu ly',
      createdBy: facilityManager.id,
    },
    create: {
      id: 2,
      reportId: damageReportA102.id,
      action: 'processing',
      oldStatus: DamageReportStatus.SUBMITTED,
      newStatus: DamageReportStatus.IN_PROGRESS,
      note: 'Da tiep nhan va chuyen xu ly',
      createdBy: facilityManager.id,
    },
  });

  const liquidationRecord = await prisma.liquidationRecord.upsert({
    where: { liquidationCode: 'QL_BM5_0001' },
    update: {
      createdBy: facilityManager.id,
      liquidationDate: new Date('2026-04-20'),
      status: ApprovalStatus.PENDING,
      note: 'Cho phe duyet thanh ly',
    },
    create: {
      id: 1,
      liquidationCode: 'QL_BM5_0001',
      createdBy: facilityManager.id,
      liquidationDate: new Date('2026-04-20'),
      status: ApprovalStatus.PENDING,
      note: 'Cho phe duyet thanh ly',
      liquidationItems: {
        create: [
          {
            assetId: assetBedA201.id,
            assetCondition: 'Xuong cap, khong con phu hop',
            reason: 'Thanh ly tai san cu',
            estimatedRemainingValue: 250000,
          }
        ]
      }
    },
  });

  const maintenancePlan = await prisma.maintenancePlan.upsert({
    where: { id: 1 },
    update: {
      assetId: assetFanA102.id,
      createdBy: facilityManager.id,
      cycleMonths: 6,
      nextDueDate: new Date('2026-11-20'),
      isActive: true,
      note: 'Bao tri dinh ky quat tran A102',
    },
    create: {
      id: 1,
      assetId: assetFanA102.id,
      createdBy: facilityManager.id,
      cycleMonths: 6,
      nextDueDate: new Date('2026-11-20'),
      isActive: true,
      note: 'Bao tri dinh ky quat tran A102',
    },
  });

  await prisma.maintenanceRecord.upsert({
    where: { maintenanceCode: 'QL_BM7_0001' },
    update: {
      planId: maintenancePlan.id,
      assetId: assetFanA102.id,
      performedBy: facilityManager.id,
      maintenanceDate: new Date('2026-05-12'),
      maintenanceType: MaintenanceType.AD_HOC,
      content: 'Kiem tra va can chinh quat tran',
      resultStatus: MaintenanceResultStatus.NEED_REPAIR,
      nextMaintenanceDate: new Date('2026-06-12'),
      cost: 150000,
      materialNote: 'Can thay bac dan',
      note: 'Theo doi sau sua chua',
    },
    create: {
      id: 1,
      maintenanceCode: 'QL_BM7_0001',
      planId: maintenancePlan.id,
      assetId: assetFanA102.id,
      performedBy: facilityManager.id,
      maintenanceDate: new Date('2026-05-12'),
      maintenanceType: MaintenanceType.AD_HOC,
      content: 'Kiem tra va can chinh quat tran',
      resultStatus: MaintenanceResultStatus.NEED_REPAIR,
      nextMaintenanceDate: new Date('2026-06-12'),
      cost: 150000,
      materialNote: 'Can thay bac dan',
      note: 'Theo doi sau sua chua',
    },
  });

  await prisma.notification.upsert({
    where: { id: 1 },
    update: {
      userId: admin.id,
      title: 'Bao cao hu hong moi',
      content: 'Phong A102 vua phat sinh bao cao hu hong quat tran.',
      status: NotificationStatus.UNREAD,
      relatedTable: 'damage_reports',
      relatedId: damageReportA102.id,
      readAt: null,
    },
    create: {
      id: 1,
      userId: admin.id,
      title: 'Bao cao hu hong moi',
      content: 'Phong A102 vua phat sinh bao cao hu hong quat tran.',
      status: NotificationStatus.UNREAD,
      relatedTable: 'damage_reports',
      relatedId: damageReportA102.id,
    },
  });

  await prisma.notification.upsert({
    where: { id: 2 },
    update: {
      userId: studentC.id,
      title: 'Da tiep nhan yeu cau',
      content: 'Yeu cau sua quat phong A102 da duoc tiep nhan.',
      status: NotificationStatus.READ,
      relatedTable: 'maintenance_records',
      relatedId: 1,
      readAt: new Date('2026-05-10T10:00:00Z'),
    },
    create: {
      id: 2,
      userId: studentC.id,
      title: 'Da tiep nhan yeu cau',
      content: 'Yeu cau sua quat phong A102 da duoc tiep nhan.',
      status: NotificationStatus.READ,
      relatedTable: 'maintenance_records',
      relatedId: 1,
      readAt: new Date('2026-05-10T10:00:00Z'),
    },
  });

  await prisma.auditLog.upsert({
    where: { id: 1 },
    update: {
      userId: admin.id,
      action: 'create',
      tableName: 'users',
      recordId: studentA.id,
      oldValue: null,
      newValue: JSON.stringify({ user_code: 'SV001', full_name: 'Le Minh An' }),
      ipAddress: '127.0.0.1',
    },
    create: {
      id: 1,
      userId: admin.id,
      action: 'create',
      tableName: 'users',
      recordId: studentA.id,
      newValue: JSON.stringify({ user_code: 'SV001', full_name: 'Le Minh An' }),
      ipAddress: '127.0.0.1',
    },
  });

  await prisma.auditLog.upsert({
    where: { id: 2 },
    update: {
      userId: facilityManager.id,
      action: 'update',
      tableName: 'damage_reports',
      recordId: damageReportA102.id,
      oldValue: JSON.stringify({ status: 'pending' }),
      newValue: JSON.stringify({ status: 'processing' }),
      ipAddress: '127.0.0.1',
    },
    create: {
      id: 2,
      userId: facilityManager.id,
      action: 'update',
      tableName: 'damage_reports',
      recordId: damageReportA102.id,
      oldValue: JSON.stringify({ status: 'pending' }),
      newValue: JSON.stringify({ status: 'processing' }),
      ipAddress: '127.0.0.1',
    },
  });

  await prisma.backupRecord.upsert({
    where: { backupCode: 'BACKUP_20260515_01' },
    update: {
      createdBy: admin.id,
      backupFilePath: '/backups/backup-2026-05-15.sql',
      status: BackupStatus.SUCCESS,
      note: 'Sao luu dinh ky hang tuan',
    },
    create: {
      id: 1,
      backupCode: 'BACKUP_20260515_01',
      createdBy: admin.id,
      backupFilePath: '/backups/backup-2026-05-15.sql',
      status: BackupStatus.SUCCESS,
      note: 'Sao luu dinh ky hang tuan',
    },
  });

  await Promise.all([
    syncSequence('roles'),
    syncSequence('users'),
    syncSequence('dorm_buildings'),
    syncSequence('floors'),
    syncSequence('rooms'),
    syncSequence('room_students'),
    syncSequence('asset_categories'),
    syncSequence('assets'),
    syncSequence('handovers'),
    syncSequence('handover_items'),
    syncSequence('inventory_checks'),
    syncSequence('inventory_check_items'),
    syncSequence('damage_reports'),
    syncSequence('damage_report_logs'),
    syncSequence('liquidation_records'),
    syncSequence('maintenance_plans'),
    syncSequence('maintenance_records'),
    syncSequence('notifications'),
    syncSequence('audit_logs'),
    syncSequence('backup_records'),
  ]);

  console.log('Seed completed successfully.');
  console.log({
    roles: [adminRole.code, managerRole.code, studentRole.code],
    users: [admin.userCode, facilityManager.userCode, studentA.userCode, studentB.userCode, studentC.userCode],
    rooms: [roomA101.roomCode, roomA102.roomCode, roomA201.roomCode, roomA202.roomCode],
    liquidationCode: liquidationRecord.liquidationCode,
  });
}

main()
  .catch(async (error) => {
    console.error('Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
