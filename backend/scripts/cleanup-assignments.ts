import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Bắt đầu dọn dẹp dữ liệu phân phòng trùng lặp...');
  
  const assignments = await prisma.roomStudentAssignment.findMany({
    where: { isActive: true },
    orderBy: { startDate: 'desc' },
  });

  const studentMap = new Map<number, number>(); // studentId -> first assignment id seen
  const duplicateIds: number[] = [];

  for (const assignment of assignments) {
    if (studentMap.has(assignment.studentId)) {
      // Đã có assignment active rồi (do xếp theo startDate desc nên cái lưu trong map là mới nhất)
      duplicateIds.push(assignment.id);
    } else {
      studentMap.set(assignment.studentId, assignment.id);
    }
  }

  if (duplicateIds.length > 0) {
    console.log(`Tìm thấy ${duplicateIds.length} phân phòng trùng lặp. Đang tiến hành vô hiệu hóa (isActive = false)...`);
    const result = await prisma.roomStudentAssignment.updateMany({
      where: { id: { in: duplicateIds } },
      data: { isActive: false, endDate: new Date() },
    });
    console.log(`Đã cập nhật thành công ${result.count} bản ghi.`);
  } else {
    console.log('Dữ liệu phân phòng sạch sẽ, không có trùng lặp.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
