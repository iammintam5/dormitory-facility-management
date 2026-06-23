import { Injectable, NotFoundException } from '@nestjs/common';
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
          include: { student: true },
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
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('Room not found');

    await this.prisma.room.delete({ where: { id } });
    return { deleted: true };
  }

  async getStudents(roomId: number) {
    const assignments = await this.prisma.roomStudentAssignment.findMany({
      where: { roomId, isActive: true },
      include: { student: { include: { role: true } } },
    });
    return assignments.map((a) => a.student);
  }

  async getAssets(roomId: number) {
    return this.prisma.asset.findMany({
      where: { roomId },
      include: { category: true },
    });
  }
}
