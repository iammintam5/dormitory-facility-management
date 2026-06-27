import { PrismaClient, ReceiptType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌴 Seeding database for PTIT HCM (Man Thiện)...');

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  console.log('   Clearing existing data...');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "users", "roles", "profiles", "dorm_buildings", "floors", "rooms", "room_student_assignments", "asset_categories", "assets", "asset_histories", "damage_reports", "maintenance_plans", "maintenance_records", "inventory_checks", "inventory_check_items", "liquidation_records", "liquidation_items", "council_members", "notifications", "audit_logs", "normalized_searches", "asset_receipts", "asset_receipt_items" CASCADE;`);

  console.log('   [1/8] Creating Roles...');
  const roleAdmin = await prisma.role.create({ data: { code: 'ADMIN', name: 'Quản trị viên', description: 'Quản trị hệ thống' } });
  const roleManager = await prisma.role.create({ data: { code: 'MANAGER', name: 'Quản lý CSVC', description: 'Quản lý cơ sở vật chất' } });
  const roleStudent = await prisma.role.create({ data: { code: 'STUDENT', name: 'Sinh viên', description: 'Sinh viên ký túc xá' } });

  console.log('   [2/8] Creating Users and Profiles...');
  const admin = await prisma.user.create({
    data: {
      fullName: 'Admin PTIT HCM', userCode: 'ADMIN_HCM', password: hash('123456'),
      email: 'admin.hcm@ptit.edu.vn', phone: '0900000001', status: 'ACTIVE', roleId: roleAdmin.id,
    }
  });

  const manager = await prisma.user.create({
    data: {
      fullName: 'Cô Quản Lý Man Thiện', userCode: 'QL_MANTHIEN', password: hash('123456'),
      email: 'qlmt@ptit.edu.vn', phone: '0900000002', status: 'ACTIVE', roleId: roleManager.id,
    }
  });

  const student1 = await prisma.user.create({
    data: {
      fullName: 'Nguyễn Văn An', userCode: 'N21DCCN001', studentCode: 'N21DCCN001', password: hash('123456'),
      email: 'n21dccn001@student.ptithcm.edu.vn', phone: '0912757931', 
      status: 'ACTIVE', roleId: roleStudent.id,
      profile: {
        create: {
          faculty: 'CNTT', course: 'D21', gender: 'Nam', address: 'TP.HCM',
          dateOfBirth: '2000-04-15',
          emergencyName: 'Phụ huynh Nguyễn Văn An', emergencyPhone: '0963667024'
        }
      }
    }
  });
  const student2 = await prisma.user.create({
    data: {
      fullName: 'Lê Thị Bé', userCode: 'N21DCVT012', studentCode: 'N21DCVT012', password: hash('123456'),
      email: 'n21dcvt012@student.ptithcm.edu.vn', phone: '0920674834', 
      status: 'ACTIVE', roleId: roleStudent.id,
      profile: {
        create: {
          faculty: 'Viễn thông', course: 'D21', gender: 'Nữ', address: 'Đồng Nai',
          dateOfBirth: '2005-06-15',
          emergencyName: 'Phụ huynh Lê Thị Bé', emergencyPhone: '0935464056'
        }
      }
    }
  });
  const student3 = await prisma.user.create({
    data: {
      fullName: 'Trần Minh Quân', userCode: 'N22DCAT033', studentCode: 'N22DCAT033', password: hash('123456'),
      email: 'n22dcat033@student.ptithcm.edu.vn', phone: '0997736018', 
      status: 'ACTIVE', roleId: roleStudent.id,
      profile: {
        create: {
          faculty: 'An toàn thông tin', course: 'D22', gender: 'Nam', address: 'Bình Dương',
          dateOfBirth: '2003-09-15',
          emergencyName: 'Phụ huynh Trần Minh Quân', emergencyPhone: '0994709262'
        }
      }
    }
  });
  const student4 = await prisma.user.create({
    data: {
      fullName: 'Phạm Thu Thảo', userCode: 'N22DCQT045', studentCode: 'N22DCQT045', password: hash('123456'),
      email: 'n22dcqt045@student.ptithcm.edu.vn', phone: '0942656872', 
      status: 'ACTIVE', roleId: roleStudent.id,
      profile: {
        create: {
          faculty: 'Quản trị kinh doanh', course: 'D22', gender: 'Nữ', address: 'Cần Thơ',
          dateOfBirth: '2000-07-15',
          emergencyName: 'Phụ huynh Phạm Thu Thảo', emergencyPhone: '0971242636'
        }
      }
    }
  });
  const student5 = await prisma.user.create({
    data: {
      fullName: 'Hoàng Trọng Nghĩa', userCode: 'N23DCDT011', studentCode: 'N23DCDT011', password: hash('123456'),
      email: 'n23dcdt011@student.ptithcm.edu.vn', phone: '0912781140', 
      status: 'ACTIVE', roleId: roleStudent.id,
      profile: {
        create: {
          faculty: 'Điện tử', course: 'D23', gender: 'Nam', address: 'Long An',
          dateOfBirth: '2005-05-15',
          emergencyName: 'Phụ huynh Hoàng Trọng Nghĩa', emergencyPhone: '0996032258'
        }
      }
    }
  });
  const student6 = await prisma.user.create({
    data: {
      fullName: 'Đinh Bảo Ngọc', userCode: 'N23DCCN089', studentCode: 'N23DCCN089', password: hash('123456'),
      email: 'n23dccn089@student.ptithcm.edu.vn', phone: '0922487393', 
      status: 'ACTIVE', roleId: roleStudent.id,
      profile: {
        create: {
          faculty: 'CNTT', course: 'D23', gender: 'Nữ', address: 'Tiền Giang',
          dateOfBirth: '2002-04-15',
          emergencyName: 'Phụ huynh Đinh Bảo Ngọc', emergencyPhone: '0989444129'
        }
      }
    }
  });
  const student7 = await prisma.user.create({
    data: {
      fullName: 'Vũ Đức Hải', userCode: 'N22DCPT022', studentCode: 'N22DCPT022', password: hash('123456'),
      email: 'n22dcpt022@student.ptithcm.edu.vn', phone: '0945323270', 
      status: 'ACTIVE', roleId: roleStudent.id,
      profile: {
        create: {
          faculty: 'Đa phương tiện', course: 'D22', gender: 'Nam', address: 'Vũng Tàu',
          dateOfBirth: '2005-04-15',
          emergencyName: 'Phụ huynh Vũ Đức Hải', emergencyPhone: '0933780497'
        }
      }
    }
  });
  const student8 = await prisma.user.create({
    data: {
      fullName: 'Bùi Mai Lan', userCode: 'N21DCKT056', studentCode: 'N21DCKT056', password: hash('123456'),
      email: 'n21dckt056@student.ptithcm.edu.vn', phone: '0915527652', 
      status: 'ACTIVE', roleId: roleStudent.id,
      profile: {
        create: {
          faculty: 'Kế toán', course: 'D21', gender: 'Nữ', address: 'Tây Ninh',
          dateOfBirth: '2003-08-15',
          emergencyName: 'Phụ huynh Bùi Mai Lan', emergencyPhone: '0973336783'
        }
      }
    }
  });

  console.log('   [3/8] Creating Locations (Buildings, Floors, Rooms)...');
  const bDichVu = await prisma.dormBuilding.create({ data: { code: 'DV', name: 'Khu Dịch Vụ' } });
  const bThuong = await prisma.dormBuilding.create({ data: { code: 'TH', name: 'Khu Thường' } });

  const floorDV1 = await prisma.floor.create({ data: { buildingId: bDichVu.id, floorNumber: 1, name: 'Tầng 1 - Dịch Vụ' } });
  const floorTH1 = await prisma.floor.create({ data: { buildingId: bThuong.id, floorNumber: 1, name: 'Tầng 1 - Thường' } });

  const roomDV101 = await prisma.room.create({ data: { floorId: floorDV1.id, roomCode: 'DV101', capacity: 8, note: 'Phòng 8 người khép kín' } });
  const roomDV102 = await prisma.room.create({ data: { floorId: floorDV1.id, roomCode: 'DV102', capacity: 8, note: 'Phòng 8 người khép kín' } });
  const roomTH101 = await prisma.room.create({ data: { floorId: floorTH1.id, roomCode: 'TH101', capacity: 12, note: 'Phòng 12 người vệ sinh chung' } });
  const roomTH102 = await prisma.room.create({ data: { floorId: floorTH1.id, roomCode: 'TH102', capacity: 12, note: 'Phòng 12 người vệ sinh chung' } });

  console.log('   [4/8] Assigning Students to Rooms...');
  await prisma.roomStudentAssignment.create({ data: { roomId: roomDV101.id, studentId: student1.id, startDate: new Date('2024-09-01'), isActive: true } });
  await prisma.roomStudentAssignment.create({ data: { roomId: roomDV101.id, studentId: student2.id, startDate: new Date('2024-09-01'), isActive: true } });
  await prisma.roomStudentAssignment.create({ data: { roomId: roomDV102.id, studentId: student3.id, startDate: new Date('2024-09-01'), isActive: true } });
  await prisma.roomStudentAssignment.create({ data: { roomId: roomDV102.id, studentId: student4.id, startDate: new Date('2024-09-01'), isActive: true } });
  await prisma.roomStudentAssignment.create({ data: { roomId: roomTH101.id, studentId: student5.id, startDate: new Date('2024-09-01'), isActive: true } });
  await prisma.roomStudentAssignment.create({ data: { roomId: roomTH101.id, studentId: student6.id, startDate: new Date('2024-09-01'), isActive: true } });
  await prisma.roomStudentAssignment.create({ data: { roomId: roomTH102.id, studentId: student7.id, startDate: new Date('2024-09-01'), isActive: true } });
  await prisma.roomStudentAssignment.create({ data: { roomId: roomTH102.id, studentId: student8.id, startDate: new Date('2024-09-01'), isActive: true } });

  console.log('   [5/8] Creating Asset Categories...');
  const catGT = await prisma.assetCategory.create({ data: { code: 'GT', name: 'Giường tầng', maintenanceCycleMonths: 12 } });
  const catGD = await prisma.assetCategory.create({ data: { code: 'GD', name: 'Giường đơn VIP', maintenanceCycleMonths: 24 } });
  const catQT = await prisma.assetCategory.create({ data: { code: 'QT', name: 'Quạt trần', maintenanceCycleMonths: 6 } });
  const catAC = await prisma.assetCategory.create({ data: { code: 'AC', name: 'Điều hòa', maintenanceCycleMonths: 4 } });
  const catTS = await prisma.assetCategory.create({ data: { code: 'TS', name: 'Tủ sắt cá nhân', maintenanceCycleMonths: 36 } });

  console.log('   [6/8] Simulating Asset Imports & Generating Assets...');
  
  // Create an Import Receipt for new academic year
  const importReceipt = await prisma.assetReceipt.create({
    data: {
      receiptCode: 'IMP20250001',
      type: ReceiptType.IMPORT,
      receiptDate: new Date('2025-08-01'),
      supplierName: 'Công ty TNHH Nội Thất Hòa Phát',
      note: 'Nhập lô hàng chuẩn bị đón sinh viên khóa mới',
      createdBy: manager.id,
      totalAmount: 150000000,
    }
  });

  const createAssetBatch = async (prefix: string, name: string, catId: number, qty: number, unitPrice: number) => {
    for (let i = 1; i <= qty; i++) {
      const code = `${prefix}${String(i).padStart(3, '0')}`;
      await prisma.asset.create({
        data: {
          assetCode: code,
          assetName: `${name} ${code}`,
          categoryId: catId,
          status: 'AVAILABLE',
          yearInUse: 2025,
          receiptItems: {
            create: [
              {
                receiptId: importReceipt.id,
                quantity: 1,
                unitPrice: unitPrice,
                warrantyMonths: 12,
              }
            ]
          },
          assetHistories: {
            create: [
              {
                action: 'NHẬP_KHO',
                newStatus: 'AVAILABLE',
                note: `Nhập mới từ phiếu IMP20250001`
              }
            ]
          },
          normalizedSearch: {
            create: {
              search: `${code} ${name} ${code}`.toLowerCase()
            }
          }
        }
      });
    }
  };

  await createAssetBatch('GT', 'Giường tầng', catGT.id, 20, 2500000);
  await createAssetBatch('GD', 'Giường đơn VIP', catGD.id, 10, 3000000);
  await createAssetBatch('QT', 'Quạt trần Panasonic', catQT.id, 30, 1200000);
  await createAssetBatch('AC', 'Điều hòa Daikin 1.5HP', catAC.id, 5, 12000000);
  await createAssetBatch('TS', 'Tủ sắt Hòa Phát', catTS.id, 30, 1500000);

  console.log('   [7/8] Simulating Handovers (Cấp phát thiết bị lên phòng)...');

  // Lấy danh sách thiết bị vừa nhập để cấp phát
  const allAssets = await prisma.asset.findMany();
  const getAssets = (prefix: string, count: number) => allAssets.filter(a => a.assetCode.startsWith(prefix)).slice(0, count);

  const assignAssetsToRoom = async (roomObj: any, assets: any[], note: string) => {
    const handoverReceipt = await prisma.assetReceipt.create({
      data: {
        receiptCode: `HO-${roomObj.roomCode}-${Date.now().toString().slice(-4)}`,
        type: ReceiptType.HANDOVER,
        receiptDate: new Date('2025-08-15'),
        note: note,
        createdBy: manager.id,
      }
    });

    for (const asset of assets) {
      await prisma.asset.update({
        where: { id: asset.id },
        data: { roomId: roomObj.id, status: 'IN_USE' }
      });

      await prisma.assetReceiptItem.create({
        data: { receiptId: handoverReceipt.id, assetId: asset.id, quantity: 1 }
      });

      await prisma.assetHistory.create({
        data: { assetId: asset.id, action: 'CẤP_PHÁT', newStatus: 'IN_USE', newRoomId: roomObj.id, note: `Cấp phát lên phòng ${roomObj.roomCode}` }
      });
    }
  };

  // Cấp phát cho DV101 (8 người)
  await assignAssetsToRoom(roomDV101, [
    ...getAssets('GD', 4), // 4 giường VIP (có thể là giường đơn)
    ...getAssets('TS', 8), // 8 tủ sắt
    ...getAssets('AC', 1), // 1 điều hòa
    ...getAssets('QT', 2), // 2 quạt trần
  ], 'Trang bị phòng Dịch vụ đầu năm');

  // Cấp phát cho TH101 (12 người)
  await assignAssetsToRoom(roomTH101, [
    ...getAssets('GT', 6), // 6 giường tầng (12 chỗ)
    ...getAssets('TS', 12).slice(8, 20), // tủ sắt tiếp theo
    ...getAssets('QT', 4).slice(2, 6), // 4 quạt trần
  ], 'Trang bị phòng Thường đầu năm');

  console.log('   [8/8] Simulating Damage Reports & Liquidation...');

  // Báo hỏng Điều hòa ở DV101
  const brokenAC = await prisma.asset.findFirst({ where: { assetCode: 'AC001' }});
  if (brokenAC) {
    const dr = await prisma.damageReport.create({
      data: {
        reportCode: 'BH-2026-001', reporterId: student1.id, assetId: brokenAC.id, roomId: roomDV101.id,
        description: 'Điều hòa không làm lạnh, Sài Gòn nóng quá chịu không nổi cô ơi!',
        priority: 'URGENT', status: 'IN_PROGRESS'
      }
    });
    await prisma.damageReportLog.create({
      data: { damageReportId: dr.id, createdByUserId: student1.id, action: 'Tạo phiếu', newStatus: 'SUBMITTED', note: 'SV gửi yêu cầu' }
    });
    await prisma.damageReportLog.create({
      data: { damageReportId: dr.id, createdByUserId: manager.id, action: 'Tiếp nhận', oldStatus: 'SUBMITTED', newStatus: 'IN_PROGRESS', note: 'Đã gọi thợ sửa' }
    });
  }

  // Thanh lý 1 quạt trần cũ (thực tế quạt này chưa cấp phát nhưng ta cứ lấy ra 1 cái để test thanh lý)
  const oldFan = await prisma.asset.findFirst({ where: { assetCode: 'QT030' }});
  if (oldFan) {
    // Chuyển thành PENDING_LIQUIDATION
    await prisma.asset.update({ where: { id: oldFan.id }, data: { status: 'PENDING_LIQUIDATION' }});
    
    // Tạo Phiếu Xuất Thanh Lý
    const exportReceipt = await prisma.assetReceipt.create({
      data: {
        receiptCode: 'EXP2026001',
        type: ReceiptType.EXPORT,
        receiptDate: new Date(),
        note: 'Xuất thanh lý quạt cũ rỉ sét',
        createdBy: manager.id,
      }
    });
    await prisma.assetReceiptItem.create({
      data: { receiptId: exportReceipt.id, assetId: oldFan.id, quantity: 1 }
    });
    await prisma.asset.update({
      where: { id: oldFan.id },
      data: { status: 'LIQUIDATED' }
    });
    await prisma.assetHistory.create({
      data: { assetId: oldFan.id, action: 'XUẤT_KHO', newStatus: 'LIQUIDATED', note: `Xuất thiết bị theo phiếu EXP2026001. Lý do: Xuất thanh lý quạt cũ rỉ sét` }
    });
  }

  console.log('✅ Seeding completed! The data is now authentic for PTIT HCM.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
