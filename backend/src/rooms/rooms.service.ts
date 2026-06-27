import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(buildingId?: number) {
    const where: any = {};
    if (buildingId) {
      where.floor = { buildingId };
    }
    return this.prisma.room.findMany({
      where,
      include: {
        floor: { include: { building: true } },
        roomStudentAssignments: {
          where: { isActive: true },
          include: { student: { include: { profile: true } } },
        },
      },
      orderBy: { roomCode: 'asc' },
    });
  }

  async create(body: { roomCode: string; floorId: number; capacity?: number; note?: string }) {
    return this.prisma.room.create({
      data: {
        roomCode: body.roomCode,
        floorId: body.floorId,
        capacity: body.capacity ?? null,
        note: body.note ?? null,
      },
      include: {
        floor: { include: { building: true } },
      },
    });
  }

  async update(id: number, body: { roomCode?: string; capacity?: number; note?: string }) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('Room not found');

    return this.prisma.room.update({
      where: { id },
      data: {
        ...(body.roomCode !== undefined && { roomCode: body.roomCode }),
        ...(body.capacity !== undefined && { capacity: body.capacity }),
        ...(body.note !== undefined && { note: body.note }),
      },
      include: {
        floor: { include: { building: true } },
      },
    });
  }

  async delete(id: number) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        assets: { take: 1 },
        damageReports: { take: 1 },
        inventoryChecks: { take: 1 },
        roomStudentAssignments: { take: 1 },
      },
    });
    if (!room) throw new NotFoundException('Room not found');

    const hasHistory =
      room.assets.length > 0 ||
      room.damageReports.length > 0 ||
      room.inventoryChecks.length > 0 ||
      room.roomStudentAssignments.length > 0;

    if (hasHistory) {
      throw new ConflictException('Không thể xóa phòng đã phát sinh dữ liệu nghiệp vụ. Vui lòng vô hiệu hóa thay vì xóa.');
    }

    await this.prisma.room.delete({ where: { id } });
    return { deleted: true };
  }

  async getStudents(roomId: number) {
    const assignments = await this.prisma.roomStudentAssignment.findMany({
      where: { roomId, isActive: true },
      include: { student: { include: { role: true } } },
    });
    return assignments.map((a) => ({
      id: a.student.id,
      fullName: a.student.fullName,
      userCode: a.student.userCode,
      studentCode: a.student.studentCode,
      email: a.student.email,
      phone: a.student.phone,
      status: a.student.status,
      assignmentId: a.id,
      startDate: a.startDate,
    }));
  }

  async assignStudent(roomId: number, studentId: number) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    const student = await this.prisma.user.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    // Check if student already has an active assignment in this room
    const existing = await this.prisma.roomStudentAssignment.findFirst({
      where: { studentId, isActive: true },
    });
    if (existing) {
      throw new ConflictException('Sinh viên này đã được xếp vào một phòng khác.');
    }

    const assignment = await this.prisma.roomStudentAssignment.create({
      data: {
        roomId,
        studentId,
        startDate: new Date(),
        isActive: true,
      },
      include: {
        student: true,
        room: true,
      },
    });

    return assignment;
  }

  async removeStudent(roomId: number, studentId: number) {
    const assignment = await this.prisma.roomStudentAssignment.findFirst({
      where: { roomId, studentId, isActive: true },
    });
    if (!assignment) {
      throw new NotFoundException('Sinh viên không tồn tại trong phòng này.');
    }

    await this.prisma.roomStudentAssignment.update({
      where: { id: assignment.id },
      data: {
        isActive: false,
        endDate: new Date(),
      },
    });

    return { removed: true };
  }

  async transferStudent(studentId: number, newRoomId: number) {
    // Find current active assignment
    const currentAssignment = await this.prisma.roomStudentAssignment.findFirst({
      where: { studentId, isActive: true },
    });
    if (!currentAssignment) {
      throw new NotFoundException('Sinh viên này hiện không ở phòng nào.');
    }

    if (currentAssignment.roomId === newRoomId) {
      throw new ConflictException('Sinh viên đã ở phòng này rồi.');
    }

    // Validate new room exists
    const newRoom = await this.prisma.room.findUnique({
      where: { id: newRoomId },
      include: {
        floor: { include: { building: true } },
        roomStudentAssignments: {
          where: { isActive: true },
        },
      },
    });
    if (!newRoom) throw new NotFoundException('Phòng đích không tồn tại.');

    // Check capacity
    if (newRoom.capacity && newRoom.roomStudentAssignments.length >= newRoom.capacity) {
      throw new ConflictException('Phòng đích đã đầy.');
    }

    // Use transaction: deactivate old + create new
    const result = await this.prisma.$transaction(async (tx) => {
      // Deactivate current assignment
      await tx.roomStudentAssignment.update({
        where: { id: currentAssignment.id },
        data: {
          isActive: false,
          endDate: new Date(),
        },
      });

      // Create new assignment
      const newAssignment = await tx.roomStudentAssignment.create({
        data: {
          roomId: newRoomId,
          studentId,
          startDate: new Date(),
          isActive: true,
        },
        include: {
          student: true,
          room: {
            include: {
              floor: { include: { building: true } },
            },
          },
        },
      });

      return newAssignment;
    });

    return {
      message: 'Chuyển phòng thành công.',
      previousRoomId: currentAssignment.roomId,
      newRoom: {
        id: result.room.id,
        roomCode: result.room.roomCode,
        buildingName: result.room.floor.building.name,
        floorNumber: result.room.floor.floorNumber,
      },
      student: {
        id: result.student.id,
        fullName: result.student.fullName,
      },
    };
  }

  async getAssets(roomId: number) {
    return this.prisma.asset.findMany({
      where: { roomId },
      include: { category: true },
    });
  }
}
