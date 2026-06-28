import { PrismaClient, ReceiptType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌴 Seeding database for PTIT HCM (Man Thiện)...');

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  console.log('   Clearing existing data...');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "users", "roles", "profiles", "dorm_buildings", "floors", "rooms", "room_student_assignments", "asset_categories", "assets", "asset_histories", "damage_reports", "maintenance_plans", "maintenance_records", "liquidation_records", "liquidation_items", "council_members", "notifications", "audit_logs", "normalized_searches", "asset_receipts", "asset_receipt_items" CASCADE;`);

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

  console.log('   Skipping Location and Asset generation to start with fresh data...');

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
