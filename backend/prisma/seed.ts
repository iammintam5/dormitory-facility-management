import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  // Clear existing data in reverse dependency order
  console.log('   Clearing existing data...');
  await prisma.normalizedSearch.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.councilMember.deleteMany();
  await prisma.liquidationItem.deleteMany();
  await prisma.liquidationRecord.deleteMany();
  await prisma.inventoryCheckItem.deleteMany();
  await prisma.inventoryCheck.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.maintenancePlan.deleteMany();
  await prisma.damageReportLog.deleteMany();
  await prisma.damageReport.deleteMany();
  await prisma.assetHistory.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.assetCategory.deleteMany();
  await prisma.roomStudentAssignment.deleteMany();
  await prisma.room.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.dormBuilding.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  // ========================
  // 1. ROLES
  // ========================
  const roleAdmin = await prisma.role.create({ data: { code: 'ADMIN', name: 'Quản trị viên', description: 'Quản trị hệ thống' } });
  const roleManager = await prisma.role.create({ data: { code: 'MANAGER', name: 'Quản lý CSVC', description: 'Quản lý cơ sở vật chất' } });
  const roleStudent = await prisma.role.create({ data: { code: 'STUDENT', name: 'Sinh viên', description: 'Sinh viên ký túc xá' } });

  // ========================
  // 2. USERS
  // ========================
  const user1 = await prisma.user.create({
    data: {
      fullName: 'Nguyễn Hữu Minh', userCode: 'ADMIN001', password: hash('123456'),
      email: 'admin@ktx.local', phone: '0901000001', status: 'ACTIVE',
      roleId: roleAdmin.id,
      createdAt: new Date('2026-01-01T08:00:00.000Z'),
    },
  });
  const user2 = await prisma.user.create({
    data: {
      fullName: 'Trần Thu Hà', userCode: 'QL001', password: hash('123456'),
      email: 'manager@ktx.local', phone: '0901000002', status: 'ACTIVE',
      roleId: roleManager.id,
      createdAt: new Date('2026-01-01T08:00:00.000Z'),
    },
  });
  const user3 = await prisma.user.create({
    data: {
      fullName: 'Nguyễn Văn An', userCode: 'SV20230001', password: hash('123456'),
      email: 'sv01@ktx.local', phone: '0901000003', status: 'ACTIVE',
      studentCode: 'SV20230001',
      roleId: roleStudent.id,
      createdAt: new Date('2026-01-01T08:00:00.000Z'),
    },
  });
  const user4 = await prisma.user.create({
    data: {
      fullName: 'Lê Thu Trang', userCode: 'SV20230002', password: hash('123456'),
      email: 'sv02@ktx.local', phone: '0901000004', status: 'ACTIVE',
      studentCode: 'SV20230002',
      roleId: roleStudent.id,
      createdAt: new Date('2026-01-01T08:00:00.000Z'),
    },
  });
  const user5 = await prisma.user.create({
    data: {
      fullName: 'Phạm Quốc Bảo', userCode: 'QL002', password: hash('123456'),
      email: 'staff02@ktx.local', phone: '0901000005', status: 'ACTIVE',
      roleId: roleManager.id,
      createdAt: new Date('2026-01-01T08:00:00.000Z'),
    },
  });
  const user6 = await prisma.user.create({
    data: {
      fullName: 'Đặng Hoàng Mai', userCode: 'GV001', password: hash('123456'),
      email: 'mai@ktx.local', phone: '0901000006', status: 'ACTIVE',
      roleId: roleAdmin.id,
      createdAt: new Date('2026-01-01T08:00:00.000Z'),
    },
  });

  const users = [user1, user2, user3, user4, user5, user6];

  // ========================
  // 3. LOCATIONS: BUILDINGS → FLOORS → ROOMS
  // ========================
  const buildingA = await prisma.dormBuilding.create({
    data: {
      code: 'A', name: 'Khu A',
      createdAt: new Date('2026-01-03T08:00:00.000Z'),
    },
  });
  const buildingB = await prisma.dormBuilding.create({
    data: {
      code: 'B', name: 'Khu B',
      createdAt: new Date('2026-01-03T08:00:00.000Z'),
    },
  });
  const buildingC = await prisma.dormBuilding.create({
    data: {
      code: 'C', name: 'Khu C',
      createdAt: new Date('2026-01-03T08:00:00.000Z'),
    },
  });

  const floorA1 = await prisma.floor.create({
    data: { buildingId: buildingA.id, floorNumber: 1, name: 'Tầng 1' },
  });
  const floorA2 = await prisma.floor.create({
    data: { buildingId: buildingA.id, floorNumber: 2, name: 'Tầng 2' },
  });
  const floorB1 = await prisma.floor.create({
    data: { buildingId: buildingB.id, floorNumber: 1, name: 'Tầng 1' },
  });

  const roomA101 = await prisma.room.create({
    data: {
      floorId: floorA1.id, roomCode: 'A101', capacity: 6,
      note: 'Phòng tiêu chuẩn 6 sinh viên.',
      createdAt: new Date('2026-01-05T08:00:00.000Z'),
    },
  });
  const roomA201 = await prisma.room.create({
    data: {
      floorId: floorA2.id, roomCode: 'A201', capacity: 6,
      note: 'Phòng có điều hòa.',
      createdAt: new Date('2026-01-05T08:00:00.000Z'),
    },
  });
  const roomB105 = await prisma.room.create({
    data: {
      floorId: floorB1.id, roomCode: 'B105', capacity: 4,
      note: 'Phòng gần khu tự học.',
      createdAt: new Date('2026-01-05T08:00:00.000Z'),
    },
  });

  // ========================
  // 4. ROOM-STUDENT ASSIGNMENTS
  // ========================
  await prisma.roomStudentAssignment.create({
    data: {
      roomId: roomA101.id, studentId: user3.id,
      startDate: new Date('2024-09-01'), isActive: true,
    },
  });
  await prisma.roomStudentAssignment.create({
    data: {
      roomId: roomA101.id, studentId: user4.id,
      startDate: new Date('2024-09-01'), isActive: true,
    },
  });

  // ========================
  // 5. ASSET CATEGORIES
  // ========================
  const catBed = await prisma.assetCategory.create({
    data: {
      code: 'BED', name: 'Giường', maintenanceCycleMonths: 12,
      createdAt: new Date('2026-01-01T08:00:00.000Z'),
    },
  });
  const catFan = await prisma.assetCategory.create({
    data: {
      code: 'FAN', name: 'Quạt trần', maintenanceCycleMonths: 6,
      createdAt: new Date('2026-01-01T08:00:00.000Z'),
    },
  });
  const catAC = await prisma.assetCategory.create({
    data: {
      code: 'AC', name: 'Điều hòa', maintenanceCycleMonths: 4,
      createdAt: new Date('2026-01-01T08:00:00.000Z'),
    },
  });
  const catLight = await prisma.assetCategory.create({
    data: {
      code: 'LIGHT', name: 'Đèn LED', maintenanceCycleMonths: 6,
      createdAt: new Date('2026-01-01T08:00:00.000Z'),
    },
  });

  // ========================
  // 6. ASSETS
  // ========================
  const asset1 = await prisma.asset.create({
    data: {
      categoryId: catFan.id, roomId: roomA101.id,
      assetCode: 'TS-A101-01', assetName: 'Quạt trần phòng A101',
      status: 'IN_USE', yearInUse: 2023,
      description: 'Quạt trần 5 cánh Panasonic',
      createdAt: new Date('2026-01-05T08:00:00.000Z'),
    },
  });
  const asset2 = await prisma.asset.create({
    data: {
      categoryId: catAC.id, roomId: roomA101.id,
      assetCode: 'TS-A101-02', assetName: 'Điều hòa phòng A101',
      status: 'UNDER_MAINTENANCE', yearInUse: 2022,
      description: 'Điều hòa 1.5HP',
      createdAt: new Date('2026-01-05T08:00:00.000Z'),
    },
  });
  const asset3 = await prisma.asset.create({
    data: {
      categoryId: catLight.id, roomId: roomA101.id,
      assetCode: 'TS-A101-03', assetName: 'Đèn LED hành lang A101',
      status: 'AVAILABLE', yearInUse: 2024,
      description: 'Đèn led 24W',
      createdAt: new Date('2026-01-05T08:00:00.000Z'),
    },
  });
  const asset4 = await prisma.asset.create({
    data: {
      categoryId: catBed.id, roomId: roomA201.id,
      assetCode: 'TS-A201-01', assetName: 'Giường tầng phòng A201',
      status: 'IN_USE', yearInUse: 2024,
      description: 'Giường thép sơn tĩnh điện',
      createdAt: new Date('2026-01-05T08:00:00.000Z'),
    },
  });
  const asset5 = await prisma.asset.create({
    data: {
      categoryId: catFan.id, roomId: roomB105.id,
      assetCode: 'TS-B105-01', assetName: 'Quạt trần phòng B105',
      status: 'PENDING_LIQUIDATION', yearInUse: 2019,
      description: 'Quạt xuống cấp, rung mạnh',
      createdAt: new Date('2026-01-05T08:00:00.000Z'),
    },
  });
  const asset6 = await prisma.asset.create({
    data: {
      categoryId: catBed.id, roomId: roomA101.id,
      assetCode: 'TS-A101-04', assetName: 'Giường tầng phòng A101 số 2',
      status: 'DAMAGED', yearInUse: 2018,
      description: 'Khung giường oxy hóa, cong vênh sau thời gian dài sử dụng',
      createdAt: new Date('2026-01-05T08:00:00.000Z'),
    },
  });
  const asset7 = await prisma.asset.create({
    data: {
      categoryId: catLight.id, roomId: roomA201.id,
      assetCode: 'TS-A201-02', assetName: 'Đèn LED phòng A201',
      status: 'DAMAGED', yearInUse: 2020,
      description: 'Hệ thống đèn xuống cấp, nhấp nháy liên tục',
      createdAt: new Date('2026-01-05T08:00:00.000Z'),
    },
  });
  const asset8 = await prisma.asset.create({
    data: {
      categoryId: catAC.id, roomId: roomA201.id,
      assetCode: 'TS-A201-03', assetName: 'Điều hòa phòng A201',
      status: 'PENDING_LIQUIDATION', yearInUse: 2017,
      description: 'Thiết bị hoạt động kém hiệu quả, tiêu hao điện cao',
      createdAt: new Date('2026-01-05T08:00:00.000Z'),
    },
  });
  const asset9 = await prisma.asset.create({
    data: {
      categoryId: catFan.id, roomId: roomA201.id,
      assetCode: 'TS-A201-04', assetName: 'Quạt trần phòng A201',
      status: 'DAMAGED', yearInUse: 2019,
      description: 'Quạt phát tiếng ồn lớn và rung mạnh khi hoạt động',
      createdAt: new Date('2026-01-05T08:00:00.000Z'),
    },
  });
  const asset10 = await prisma.asset.create({
    data: {
      categoryId: catBed.id, roomId: roomB105.id,
      assetCode: 'TS-B105-02', assetName: 'Giường tầng phòng B105',
      status: 'PENDING_LIQUIDATION', yearInUse: 2016,
      description: 'Mối mọt và lỏng khung giường, không còn an toàn sử dụng',
      createdAt: new Date('2026-01-05T08:00:00.000Z'),
    },
  });

  // Create NormalizedSearch for assets
  const assetSearchData = [
    { assetId: asset1.id, search: 'ts-a101-01 quat tran phong a101 panasonic' },
    { assetId: asset2.id, search: 'ts-a101-02 dieu hoa phong a101 1.5hp' },
    { assetId: asset3.id, search: 'ts-a101-03 den led hanh lang a101 24w' },
    { assetId: asset4.id, search: 'ts-a201-01 giuong tang phong a201 thep son tinh dien' },
    { assetId: asset5.id, search: 'ts-b105-01 quat tran phong b105 xung cap rung manh' },
    { assetId: asset6.id, search: 'ts-a101-04 giuong tang phong a101 so 2 oxy hoa cong venh' },
    { assetId: asset7.id, search: 'ts-a201-02 den led phong a201 xung cap nhap nhay' },
    { assetId: asset8.id, search: 'ts-a201-03 dieu hoa phong a201 kem hieu qua tieu hao dien cao' },
    { assetId: asset9.id, search: 'ts-a201-04 quat tran phong a201 tieng on lon rung manh' },
    { assetId: asset10.id, search: 'ts-b105-02 giuong tang phong b105 moi mot long khung' },
  ];
  for (const data of assetSearchData) {
    await prisma.normalizedSearch.create({ data });
  }

  // ========================
  // 7. DAMAGE REPORTS + LOGS
  // ========================
  const dr1 = await prisma.damageReport.create({
    data: {
      reportCode: 'BH-2026-001', reporterId: user3.id,
      assetId: asset1.id, roomId: roomA101.id,
      description: 'Quạt trần phát tiếng ồn lớn khi bật số cao và rung mạnh vào ban đêm.',
      priority: 'HIGH', status: 'REVIEWING',
      createdAt: new Date('2026-05-28T08:00:00.000Z'),
      updatedAt: new Date('2026-05-28T10:00:00.000Z'),
    },
  });

  await prisma.damageReportLog.create({
    data: {
      damageReportId: dr1.id, createdByUserId: user3.id,
      action: 'Tạo phiếu', oldStatus: null, newStatus: 'SUBMITTED',
      note: 'Sinh viên gửi phiếu báo hỏng ban đầu.',
      createdAt: new Date('2026-05-28T08:00:00.000Z'),
    },
  });
  await prisma.damageReportLog.create({
    data: {
      damageReportId: dr1.id, createdByUserId: user2.id,
      action: 'Tiếp nhận', oldStatus: 'SUBMITTED', newStatus: 'REVIEWING',
      note: 'QL CSVC đã tiếp nhận phiếu và kiểm tra hiện trạng.',
      createdAt: new Date('2026-05-28T10:00:00.000Z'),
    },
  });

  const dr2 = await prisma.damageReport.create({
    data: {
      reportCode: 'BH-2026-004', reporterId: user3.id,
      assetId: asset2.id, roomId: roomA101.id,
      description: 'Điều hòa không làm lạnh, có hiện tượng chảy nước sau khoảng 20 phút hoạt động.',
      priority: 'URGENT', status: 'IN_PROGRESS',
      createdAt: new Date('2026-05-31T07:00:00.000Z'),
      updatedAt: new Date('2026-05-31T10:30:00.000Z'),
    },
  });

  await prisma.damageReportLog.create({
    data: {
      damageReportId: dr2.id, createdByUserId: user3.id,
      action: 'Tạo phiếu', oldStatus: null, newStatus: 'SUBMITTED',
      note: 'Sinh viên gửi phiếu báo hỏng ban đầu.',
      createdAt: new Date('2026-05-31T07:00:00.000Z'),
    },
  });
  await prisma.damageReportLog.create({
    data: {
      damageReportId: dr2.id, createdByUserId: user2.id,
      action: 'Tiếp nhận', oldStatus: 'SUBMITTED', newStatus: 'REVIEWING',
      note: 'QL CSVC đã tiếp nhận phiếu và kiểm tra hiện trạng.',
      createdAt: new Date('2026-05-31T08:00:00.000Z'),
    },
  });
  await prisma.damageReportLog.create({
    data: {
      damageReportId: dr2.id, createdByUserId: user2.id,
      action: 'Chuyển sửa chữa', oldStatus: 'REVIEWING', newStatus: 'IN_PROGRESS',
      note: 'Đã tạo lịch cho đội kỹ thuật.',
      createdAt: new Date('2026-05-31T10:30:00.000Z'),
    },
  });

  // ========================
  // 8. MAINTENANCE PLANS + RECORDS
  // ========================
  const plan1 = await prisma.maintenancePlan.create({
    data: {
      assetId: asset1.id, createdBy: user2.id,
      cycleMonths: 6, nextDueDate: new Date('2026-06-20'), isActive: true,
      note: 'Bảo dưỡng quạt trước cao điểm hè.',
      createdAt: new Date('2026-01-10T08:00:00.000Z'),
    },
  });
  const plan2 = await prisma.maintenancePlan.create({
    data: {
      assetId: asset2.id, createdBy: user2.id,
      cycleMonths: 4, nextDueDate: new Date('2026-06-10'), isActive: true,
      note: 'Điều hòa cần vệ sinh định kỳ.',
      createdAt: new Date('2026-01-10T08:00:00.000Z'),
    },
  });

  await prisma.maintenanceRecord.create({
    data: {
      maintenanceCode: 'BT-2026-001', planId: plan2.id,
      assetId: asset2.id, performedBy: user5.id,
      maintenanceDate: new Date('2026-05-18'),
      maintenanceType: 'SCHEDULED',
      content: 'Vệ sinh dàn lạnh, kiểm tra gas và siết lại đầu nối thoát nước.',
      resultStatus: 'GOOD',
      nextMaintenanceDate: new Date('2026-09-18'),
      cost: 350000,
      materialNote: 'Bổ sung ống thoát nước 1m.',
      note: 'Thiết bị hoạt động ổn định sau bảo trì.',
      createdAt: new Date('2026-05-18T08:00:00.000Z'),
      updatedAt: new Date('2026-05-18T10:00:00.000Z'),
    },
  });

  // ========================
  // 9. INVENTORY CHECK + ITEMS + COUNCIL
  // ========================
  const ic1 = await prisma.inventoryCheck.create({
    data: {
      inventoryCode: 'KK-2026-001', roomId: roomA101.id,
      checkedBy: user2.id, checkDate: new Date('2026-05-25'),
      status: 'DRAFT',
      generalNote: 'Kiểm kê định kỳ khu A đợt 2.',
      createdAt: new Date('2026-05-25T08:00:00.000Z'),
      updatedAt: new Date('2026-05-25T08:00:00.000Z'),
    },
  });

  await prisma.inventoryCheckItem.create({
    data: {
      inventoryCheckId: ic1.id, assetId: asset1.id,
      systemQuantity: 1, actualQuantity: 1, difference: 0,
      actualCondition: 'Tốt',
    },
  });
  await prisma.inventoryCheckItem.create({
    data: {
      inventoryCheckId: ic1.id, assetId: asset2.id,
      systemQuantity: 1, actualQuantity: 1, difference: 0,
      actualCondition: 'Cần vệ sinh dàn lạnh',
      note: 'Đưa vào kế hoạch bảo trì tuần tới.',
    },
  });

  // Council members for inventory check
  await prisma.councilMember.create({
    data: {
      userId: user2.id, roleInCouncil: 'Trưởng ban',
      inventoryCheckId: ic1.id,
    },
  });
  await prisma.councilMember.create({
    data: {
      userId: user5.id, roleInCouncil: 'Ủy viên',
      inventoryCheckId: ic1.id,
    },
  });

  // Multiple inventory checks for richer data
  const ic2 = await prisma.inventoryCheck.create({
    data: {
      inventoryCode: 'KK-2023-002', roomId: roomA201.id,
      checkedBy: user2.id, checkDate: new Date('2023-12-20'),
      status: 'COMPLETED',
      generalNote: 'Kiểm kê cuối năm 2023 khu A.',
      completedAt: new Date('2023-12-20T16:00:00.000Z'),
      createdAt: new Date('2023-12-20T08:00:00.000Z'),
      updatedAt: new Date('2023-12-20T16:00:00.000Z'),
    },
  });
  await prisma.inventoryCheckItem.create({
    data: {
      inventoryCheckId: ic2.id, assetId: asset4.id,
      systemQuantity: 1, actualQuantity: 1, difference: 0,
      actualCondition: 'Tốt',
    },
  });
  await prisma.inventoryCheckItem.create({
    data: {
      inventoryCheckId: ic2.id, assetId: asset7.id,
      systemQuantity: 1, actualQuantity: 1, difference: 0,
      actualCondition: 'Tốt',
    },
  });
  await prisma.councilMember.create({
    data: {
      userId: user2.id, roleInCouncil: 'Trưởng ban',
      inventoryCheckId: ic2.id,
    },
  });

  const ic3 = await prisma.inventoryCheck.create({
    data: {
      inventoryCode: 'KK-2023-001', roomId: roomA101.id,
      checkedBy: user2.id, checkDate: new Date('2023-06-15'),
      status: 'COMPLETED',
      generalNote: 'Kiểm kê giữa năm 2023.',
      completedAt: new Date('2023-06-16T14:00:00.000Z'),
      createdAt: new Date('2023-06-15T08:00:00.000Z'),
      updatedAt: new Date('2023-06-16T14:00:00.000Z'),
    },
  });
  await prisma.inventoryCheckItem.create({
    data: {
      inventoryCheckId: ic3.id, assetId: asset1.id,
      systemQuantity: 1, actualQuantity: 1, difference: 0,
    },
  });
  await prisma.inventoryCheckItem.create({
    data: {
      inventoryCheckId: ic3.id, assetId: asset2.id,
      systemQuantity: 1, actualQuantity: 1, difference: 0,
    },
  });

  const ic4 = await prisma.inventoryCheck.create({
    data: {
      inventoryCode: 'KK-2024-001', roomId: roomB105.id,
      checkedBy: user5.id, checkDate: new Date('2024-07-10'),
      status: 'COMPLETED',
      completedAt: new Date('2024-07-10T16:00:00.000Z'),
      createdAt: new Date('2024-07-10T08:00:00.000Z'),
      updatedAt: new Date('2024-07-10T16:00:00.000Z'),
    },
  });
  await prisma.inventoryCheckItem.create({
    data: {
      inventoryCheckId: ic4.id, assetId: asset5.id,
      systemQuantity: 1, actualQuantity: 1, difference: 0,
      actualCondition: 'Quạt xuống cấp',
      note: 'Đề xuất thanh lý.',
    },
  });
  await prisma.inventoryCheckItem.create({
    data: {
      inventoryCheckId: ic4.id, assetId: asset10.id,
      systemQuantity: 1, actualQuantity: 0, difference: -1,
      actualCondition: 'Không tìm thấy',
      note: 'Mất tài sản.',
    },
  });

  const ic5 = await prisma.inventoryCheck.create({
    data: {
      inventoryCode: 'KK-2024-002', roomId: roomA201.id,
      checkedBy: user2.id, checkDate: new Date('2024-11-05'),
      status: 'COMPLETED',
      completedAt: new Date('2024-11-05T17:00:00.000Z'),
      createdAt: new Date('2024-11-05T08:00:00.000Z'),
      updatedAt: new Date('2024-11-05T17:00:00.000Z'),
    },
  });
  await prisma.inventoryCheckItem.create({
    data: {
      inventoryCheckId: ic5.id, assetId: asset4.id,
      systemQuantity: 1, actualQuantity: 1, difference: 0,
    },
  });
  await prisma.inventoryCheckItem.create({
    data: {
      inventoryCheckId: ic5.id, assetId: asset8.id,
      systemQuantity: 1, actualQuantity: 1, difference: 0,
      actualCondition: 'Hoạt động kém',
    },
  });
  await prisma.inventoryCheckItem.create({
    data: {
      inventoryCheckId: ic5.id, assetId: asset9.id,
      systemQuantity: 1, actualQuantity: 1, difference: 0,
      actualCondition: 'Rung mạnh',
    },
  });

  const ic6 = await prisma.inventoryCheck.create({
    data: {
      inventoryCode: 'KK-2023-003', roomId: roomB105.id,
      checkedBy: user5.id, checkDate: new Date('2023-01-15'),
      status: 'DRAFT',
      createdAt: new Date('2023-01-15T08:00:00.000Z'),
      updatedAt: new Date('2023-01-15T08:00:00.000Z'),
    },
  });
  await prisma.inventoryCheckItem.create({
    data: {
      inventoryCheckId: ic6.id, assetId: asset5.id,
      systemQuantity: 1, actualQuantity: 1, difference: 0,
    },
  });

  const ic7 = await prisma.inventoryCheck.create({
    data: {
      inventoryCode: 'KK-2024-003', roomId: roomA101.id,
      checkedBy: user2.id, checkDate: new Date('2024-08-20'),
      status: 'COMPLETED',
      completedAt: new Date('2024-08-20T15:00:00.000Z'),
      createdAt: new Date('2024-08-20T08:00:00.000Z'),
      updatedAt: new Date('2024-08-20T15:00:00.000Z'),
    },
  });
  await prisma.inventoryCheckItem.create({
    data: {
      inventoryCheckId: ic7.id, assetId: asset1.id,
      systemQuantity: 1, actualQuantity: 1, difference: 0,
      actualCondition: 'Tốt',
    },
  });
  await prisma.inventoryCheckItem.create({
    data: {
      inventoryCheckId: ic7.id, assetId: asset2.id,
      systemQuantity: 1, actualQuantity: 1, difference: 0,
      actualCondition: 'Tốt',
    },
  });
  await prisma.inventoryCheckItem.create({
    data: {
      inventoryCheckId: ic7.id, assetId: asset3.id,
      systemQuantity: 1, actualQuantity: 1, difference: 0,
    },
  });
  await prisma.inventoryCheckItem.create({
    data: {
      inventoryCheckId: ic7.id, assetId: asset6.id,
      systemQuantity: 1, actualQuantity: 0, difference: -1,
      actualCondition: 'Mất',
      note: 'Không tìm thấy giường tại phòng.',
    },
  });

  // ========================
  // 10. LIQUIDATION RECORDS + ITEMS + COUNCIL
  // ========================
  // Council members for liquidation
  const cmUser1 = await prisma.councilMember.create({
    data: { userId: user1.id, roleInCouncil: 'Chủ tịch hội đồng' },
  });
  const cmUser6 = await prisma.councilMember.create({
    data: { userId: user6.id, roleInCouncil: 'Ủy viên' },
  });

  // TL-2026-001: PENDING_APPROVAL
  const lr1 = await prisma.liquidationRecord.create({
    data: {
      liquidationCode: 'TL-2026-001', createdBy: user2.id,
      liquidationDate: new Date('2026-05-27'),
      status: 'PENDING_APPROVAL',
      note: 'Thiết bị rung mạnh, không còn hiệu quả sử dụng.',
      createdAt: new Date('2026-05-27T09:00:00.000Z'),
      updatedAt: new Date('2026-05-27T09:30:00.000Z'),
    },
  });
  await prisma.liquidationItem.create({
    data: {
      liquidationRecordId: lr1.id, assetId: asset5.id,
      assetCondition: 'Quạt xuống cấp nghiêm trọng, rung và phát tiếng ồn lớn.',
      reason: 'Chi phí sửa chữa cao hơn giá trị sử dụng còn lại.',
      estimatedRemainingValue: 50000,
    },
  });
  // Link council to this liquidation
  await prisma.councilMember.update({
    where: { id: cmUser1.id },
    data: { liquidationRecordId: lr1.id },
  });
  await prisma.councilMember.update({
    where: { id: cmUser6.id },
    data: { liquidationRecordId: lr1.id },
  });

  // TL-2026-002: APPROVED
  const lr2 = await prisma.liquidationRecord.create({
    data: {
      liquidationCode: 'TL-2026-002', createdBy: user5.id,
      liquidationDate: new Date('2026-05-24'),
      status: 'APPROVED',
      note: 'Ho so dang cho hoan tat ban thanh ly cho lo thiet bi khu A.',
      createdAt: new Date('2026-05-24T08:15:00.000Z'),
      updatedAt: new Date('2026-05-25T10:00:00.000Z'),
    },
  });
  await prisma.liquidationItem.create({
    data: {
      liquidationRecordId: lr2.id, assetId: asset8.id,
      assetCondition: 'Hieu suat lam lanh thap, tieu hao dien nang.',
      reason: 'Het nien han su dung.',
      estimatedRemainingValue: 750000,
    },
  });
  await prisma.liquidationItem.create({
    data: {
      liquidationRecordId: lr2.id, assetId: asset9.id,
      assetCondition: 'Quat rung manh, canh quat lech truc.',
      reason: 'Het nien han su dung.',
      estimatedRemainingValue: 180000,
    },
  });
  await prisma.liquidationItem.create({
    data: {
      liquidationRecordId: lr2.id, assetId: asset7.id,
      assetCondition: 'He den nhap nhay lien tuc, chap chon.',
      reason: 'Nang cap, thay the thiet bi moi.',
      estimatedRemainingValue: 120000,
    },
  });

  // TL-2026-003: COMPLETED
  const lr3 = await prisma.liquidationRecord.create({
    data: {
      liquidationCode: 'TL-2026-003', createdBy: user2.id,
      liquidationDate: new Date('2026-05-20'),
      status: 'COMPLETED',
      note: 'Da hoan tat thanh ly lo thiet bi cu khu A.',
      createdAt: new Date('2026-05-20T08:00:00.000Z'),
      updatedAt: new Date('2026-05-22T16:20:00.000Z'),
    },
  });
  await prisma.liquidationItem.create({
    data: {
      liquidationRecordId: lr3.id, assetId: asset6.id,
      assetCondition: 'Khung giuong cong venh, lop son bong troc nghiem trong.',
      reason: 'Hu hong do chay no cuc bo.',
      estimatedRemainingValue: 0,
    },
  });
  await prisma.liquidationItem.create({
    data: {
      liquidationRecordId: lr3.id, assetId: asset7.id,
      assetCondition: 'Den hu hong toan bo mach nguon.',
      reason: 'Hu hong do chay no cuc bo.',
      estimatedRemainingValue: 0,
    },
  });

  // TL-2026-004: REJECTED
  const lr4 = await prisma.liquidationRecord.create({
    data: {
      liquidationCode: 'TL-2026-004', createdBy: user5.id,
      liquidationDate: new Date('2026-05-15'),
      status: 'REJECTED',
      note: 'Tam thoi chua du can cu thanh ly, yeu cau kiem tra lai hien trang.',
      createdAt: new Date('2026-05-15T09:00:00.000Z'),
      updatedAt: new Date('2026-05-16T14:20:00.000Z'),
    },
  });
  await prisma.liquidationItem.create({
    data: {
      liquidationRecordId: lr4.id, assetId: asset4.id,
      assetCondition: 'Khong tim thay tai thoi diem kiem tra.',
      reason: 'That lac, khong tim thay.',
      estimatedRemainingValue: 0,
    },
  });

  // TL-2026-005: COMPLETED
  const lr5 = await prisma.liquidationRecord.create({
    data: {
      liquidationCode: 'TL-2026-005', createdBy: user2.id,
      liquidationDate: new Date('2026-05-10'),
      status: 'COMPLETED',
      note: 'Hoan tat thanh ly do nang cap dong bo phong o.',
      createdAt: new Date('2026-05-10T08:20:00.000Z'),
      updatedAt: new Date('2026-05-13T17:00:00.000Z'),
    },
  });
  await prisma.liquidationItem.create({
    data: {
      liquidationRecordId: lr5.id, assetId: asset1.id,
      assetCondition: 'Quat da cu, hieu suat thap, khong dong bo voi he thong moi.',
      reason: 'Nang cap, thay the thiet bi moi.',
      estimatedRemainingValue: 350000,
    },
  });
  await prisma.liquidationItem.create({
    data: {
      liquidationRecordId: lr5.id, assetId: asset3.id,
      assetCondition: 'Den LED cu duoc thay dong bo sang mau tiet kiem dien.',
      reason: 'Nang cap, thay the thiet bi moi.',
      estimatedRemainingValue: 200000,
    },
  });
  await prisma.liquidationItem.create({
    data: {
      liquidationRecordId: lr5.id, assetId: asset10.id,
      assetCondition: 'Giuong cu khong con phu hop voi chuan bo tri moi.',
      reason: 'Khac.',
      estimatedRemainingValue: 550000,
    },
  });

  // ========================
  // 11. NOTIFICATIONS
  // ========================
  await prisma.notification.create({
    data: {
      userId: user3.id,
      title: 'Phiếu báo hỏng BH-2026-004 đã được tiếp nhận',
      content: 'Bộ phận CSVC đã tiếp nhận và đang điều phối xử lý.',
      status: 'UNREAD',
      relatedTable: 'damage_reports', relatedId: dr2.id,
      createdAt: new Date('2026-05-31T08:30:00.000Z'),
    },
  });
  await prisma.notification.create({
    data: {
      userId: user2.id,
      title: 'Lịch bảo trì tháng 6 đã sẵn sàng',
      content: '3 tài sản đến hạn bảo trì trong tuần này.',
      status: 'READ',
      createdAt: new Date('2026-05-29T07:45:00.000Z'),
      readAt: new Date('2026-05-29T08:00:00.000Z'),
    },
  });
  await prisma.notification.create({
    data: {
      userId: user1.id,
      title: 'Đề xuất thanh lý cần phê duyệt',
      content: 'Biên bản TL-2026-001 đang chờ phê duyệt cuối.',
      status: 'UNREAD',
      createdAt: new Date('2026-05-28T14:20:00.000Z'),
    },
  });

  // ========================
  // 12. AUDIT LOGS
  // ========================
  await prisma.auditLog.create({
    data: {
      userId: user2.id,
      action: 'LOGIN', tableName: 'auth', recordId: user2.id,
      content: 'Manager đăng nhập hệ thống',
      ipAddress: '192.168.1.100',
      createdAt: new Date('2026-05-31T08:00:00.000Z'),
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: user1.id,
      action: 'LOCK', tableName: 'user', recordId: user3.id,
      content: 'Khóa tài khoản sinh viên',
      ipAddress: '192.168.1.1',
      createdAt: new Date('2026-05-30T14:30:00.000Z'),
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: user2.id,
      action: 'CREATE', tableName: 'damage_report', recordId: dr1.id,
      content: 'Tạo phiếu báo hỏng BH-2026-001',
      ipAddress: '192.168.1.100',
      createdAt: new Date('2026-05-28T08:00:00.000Z'),
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: user2.id,
      action: 'UPDATE', tableName: 'asset', recordId: asset2.id,
      content: 'Cập nhật trạng thái tài sản thành UNDER_MAINTENANCE',
      ipAddress: '192.168.1.100',
      createdAt: new Date('2026-05-28T10:00:00.000Z'),
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: user1.id,
      action: 'CREATE', tableName: 'user', recordId: user5.id,
      content: 'Tạo tài khoản quản lý mới',
      ipAddress: '192.168.1.1',
      createdAt: new Date('2026-05-25T09:00:00.000Z'),
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: user3.id,
      action: 'CREATE', tableName: 'damage_report', recordId: dr2.id,
      content: 'Sinh viên gửi báo hỏng BH-2026-004',
      ipAddress: '192.168.1.50',
      createdAt: new Date('2026-05-31T07:00:00.000Z'),
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log(`   - ${3} roles`);
  console.log(`   - ${users.length} users`);
  console.log(`   - ${3} buildings, ${3} floors, ${3} rooms`);
  console.log(`   - ${4} asset categories, ${10} assets`);
  console.log(`   - ${2} damage reports`);
  console.log(`   - ${2} maintenance plans, ${1} maintenance record`);
  console.log(`   - ${7} inventory checks`);
  console.log(`   - ${5} liquidation records`);
  console.log(`   - ${3} notifications`);
  console.log(`   - ${6} audit logs`);
  console.log('');
  console.log('📋 Default password for all users: 123456');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
